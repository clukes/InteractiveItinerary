export default {
    /**
     * @param {Request} request
     * @param {{ ALLOWED_ORIGIN?: string; ITINERARY_PASSWORD?: string; ITINERARY_KV: { get: (key: string) => Promise<string | null> } }} env
     */
    async fetch(request, env) {
        const requestUrl = new URL(request.url);
        const origin = request.headers.get("Origin") || "";
        const allowedOrigin = (env.ALLOWED_ORIGIN || "").trim();
        const originAllowed =
            allowedOrigin.length > 0 && origin === allowedOrigin;

        if (request.method === "OPTIONS") {
            return new Response(null, {
                status: 204,
                headers: corsHeaders(
                    originAllowed ? origin : "",
                    originAllowed,
                ),
            });
        }

        if (requestUrl.pathname !== "/auth-itinerary") {
            return jsonResponse(
                { error: "Not found." },
                404,
                originAllowed ? origin : "",
                originAllowed,
            );
        }

        if (!originAllowed) {
            return jsonResponse({ error: "Forbidden origin." }, 403, "", false);
        }

        if (request.method !== "POST") {
            return jsonResponse(
                { error: "Method not allowed." },
                405,
                origin,
                true,
            );
        }

        let body;
        try {
            body = await request.json();
        } catch {
            return jsonResponse(
                { error: "Invalid JSON payload." },
                400,
                origin,
                true,
            );
        }

        const providedPassword =
            typeof body?.password === "string" ? body.password : "";
        const expectedPassword =
            typeof env.ITINERARY_PASSWORD === "string"
                ? env.ITINERARY_PASSWORD
                : "";

        if (!providedPassword || providedPassword !== expectedPassword) {
            return jsonResponse({ error: "Unauthorized." }, 401, origin, true);
        }

        let rawItinerary = "";
        try {
            rawItinerary = await getStoredItinerary(env);
        } catch (error) {
            return jsonResponse(
                {
                    error:
                        error instanceof Error && error.message
                            ? error.message
                            : "Itinerary unavailable.",
                },
                500,
                origin,
                true,
            );
        }

        if (!rawItinerary) {
            return jsonResponse(
                { error: "Itinerary unavailable." },
                500,
                origin,
                true,
            );
        }

        let itinerary;
        try {
            itinerary = JSON.parse(rawItinerary);
        } catch {
            return jsonResponse(
                { error: "Stored itinerary is invalid." },
                500,
                origin,
                true,
            );
        }

        return jsonResponse(itinerary, 200, origin, true);
    },
};

/**
 * @param {unknown} payload
 * @param {number} status
 * @param {string} origin
 * @param {boolean} allowOrigin
 */
function jsonResponse(payload, status, origin, allowOrigin) {
    return new Response(JSON.stringify(payload), {
        status,
        headers: {
            "Content-Type": "application/json; charset=utf-8",
            ...corsHeaders(origin, allowOrigin),
        },
    });
}

/**
 * @param {string} origin
 * @param {boolean} allowOrigin
 */
function corsHeaders(origin, allowOrigin) {
    return {
        "Access-Control-Allow-Origin": allowOrigin ? origin : "null",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
        Vary: "Origin",
    };
}

/**
 * @param {{ ITINERARY_KV?: { get: (key: string) => Promise<string | null> }; ITINERARY_JSON?: string }} env
 */
async function getStoredItinerary(env) {
    if (env.ITINERARY_KV && typeof env.ITINERARY_KV.get === "function") {
        const fromKv = await env.ITINERARY_KV.get("active-itinerary");
        if (typeof fromKv === "string" && fromKv.trim()) {
            return fromKv;
        }
    }

    if (typeof env.ITINERARY_JSON === "string" && env.ITINERARY_JSON.trim()) {
        return env.ITINERARY_JSON;
    }

    throw new Error(
        "Itinerary data is not configured. Set KV key 'active-itinerary' or ITINERARY_JSON.",
    );
}
