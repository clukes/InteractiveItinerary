/**
 * Local dev server that serves the static frontend and a local
 * /auth-itinerary endpoint so the app loads the private itinerary
 * straight from disk — no Cloudflare Worker needed.
 *
 * Usage:  node scripts/dev-server.mjs [--port 3000] [--worker-port 8787]
 */

import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { existsSync, watch } from "node:fs";
import { join, extname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(fileURLToPath(import.meta.url), "..", "..");

const args = process.argv.slice(2);
function flag(name, fallback) {
    const idx = args.indexOf(name);
    return idx !== -1 && args[idx + 1] ? args[idx + 1] : fallback;
}

const PORT = Number(flag("--port", "3000"));
const WORKER_PORT = Number(flag("--worker-port", "8787"));

const MIME_TYPES = {
    ".html": "text/html; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".js": "text/javascript; charset=utf-8",
    ".mjs": "text/javascript; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".svg": "image/svg+xml",
    ".png": "image/png",
    ".ico": "image/x-icon",
    ".webmanifest": "application/manifest+json",
};

/* ── Live-reload (SSE) ─────────────────────────────────────────── */
const sseClients = new Set();

const LIVE_RELOAD_CLIENT = `
<script>
  // Live-reload — injected by dev-server
  (function() {
    let es;
    function connect() {
      es = new EventSource("/__dev/reload");
      es.onmessage = function() { location.reload(); };
      es.onerror = function() { es.close(); setTimeout(connect, 1000); };
    }
    connect();
  })();
</script>`;

// Debounced watcher — notify all SSE clients on file changes
let reloadTimer = null;
function scheduleReload() {
    if (reloadTimer) clearTimeout(reloadTimer);
    reloadTimer = setTimeout(() => {
        for (const client of sseClients) {
            client.write("data: reload\n\n");
        }
    }, 150);
}

// Watch project directories for changes
for (const dir of ["assets", "private", "."]) {
    const target = join(ROOT, dir);
    try {
        watch(target, { recursive: true }, (_event, filename) => {
            if (filename && /\.(html|css|js|json)$/.test(filename)) {
                scheduleReload();
            }
        });
    } catch {
        /* directory may not exist */
    }
}

/* ── Local itinerary & dev password ────────────────────────────── */
const ITINERARY_CANDIDATES = [
    "private/local-itineraries/seville-itinerary.private.json",
    "private/seville-itinerary.private.json",
    "private/seville-itinerary.json",
].map((p) => join(ROOT, p));

const localItineraryPath = ITINERARY_CANDIDATES.find((p) => existsSync(p));

const DEV_PASSWORD_PATH = join(ROOT, "private", ".dev-password");

async function loadDevPassword() {
    try {
        return (await readFile(DEV_PASSWORD_PATH, "utf-8")).trim();
    } catch {
        return ""; // no password required when file is absent
    }
}

/* ── Injected snippets ────────────────────────────────────────── */
const CONFIG_SNIPPET = `
<script>
  // Injected by dev-server — points auth at this dev server itself
  window.__itineraryConfig = {
    workerAuthEndpoint: "http://localhost:${PORT}/auth-itinerary",
  };
</script>`;

const server = createServer(async (req, res) => {
    let urlPath = new URL(req.url, `http://localhost:${PORT}`).pathname;

    // SSE live-reload endpoint
    if (urlPath === "/__dev/reload") {
        res.writeHead(200, {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache",
            Connection: "keep-alive",
        });
        res.write(":\n\n"); // comment heartbeat
        sseClients.add(res);
        req.on("close", () => sseClients.delete(res));
        return;
    }

    // Local /auth-itinerary — serves private JSON from disk
    if (urlPath === "/auth-itinerary") {
        const corsH = {
            "Content-Type": "application/json; charset=utf-8",
            "Access-Control-Allow-Origin": `http://localhost:${PORT}`,
            "Access-Control-Allow-Methods": "POST, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type",
        };

        if (req.method === "OPTIONS") {
            res.writeHead(204, corsH);
            res.end();
            return;
        }

        if (req.method !== "POST") {
            res.writeHead(405, corsH);
            res.end(JSON.stringify({ error: "Method not allowed." }));
            return;
        }

        if (!localItineraryPath) {
            res.writeHead(500, corsH);
            res.end(
                JSON.stringify({
                    error: "No local itinerary file found. Place one in private/.",
                }),
            );
            return;
        }

        // Check password (if .dev-password exists)
        try {
            const chunks = [];
            for await (const chunk of req) chunks.push(chunk);
            const body = JSON.parse(Buffer.concat(chunks).toString());
            const devPw = await loadDevPassword();
            if (devPw && body?.password !== devPw) {
                res.writeHead(401, corsH);
                res.end(JSON.stringify({ error: "Incorrect password." }));
                return;
            }
        } catch {
            res.writeHead(400, corsH);
            res.end(JSON.stringify({ error: "Invalid JSON payload." }));
            return;
        }

        try {
            const data = await readFile(localItineraryPath, "utf-8");
            res.writeHead(200, corsH);
            res.end(data);
        } catch (err) {
            res.writeHead(500, corsH);
            res.end(
                JSON.stringify({
                    error: `Failed to read itinerary: ${err.message}`,
                }),
            );
        }
        return;
    }

    if (urlPath === "/") urlPath = "/index.html";

    // Prevent directory traversal
    const filePath = join(ROOT, urlPath);
    if (!filePath.startsWith(ROOT)) {
        res.writeHead(403);
        res.end("Forbidden");
        return;
    }

    try {
        let body = await readFile(filePath);
        const ext = extname(filePath);
        const contentType = MIME_TYPES[ext] || "application/octet-stream";

        // Inject config override into index.html
        if (urlPath === "/index.html") {
            let html = body.toString("utf-8");
            html = html.replace(
                "</head>",
                `${CONFIG_SNIPPET}\n${LIVE_RELOAD_CLIENT}\n</head>`,
            );
            // Add a visual dev-mode indicator
            html = html.replace(
                "</body>",
                `<div style="position:fixed;bottom:4px;left:4px;background:#ff6b00;color:#fff;font:bold 11px/1 sans-serif;padding:2px 6px;border-radius:3px;z-index:99999;pointer-events:none;opacity:0.85">LOCAL DEV</div>\n</body>`,
            );
            body = Buffer.from(html, "utf-8");
        }

        res.writeHead(200, { "Content-Type": contentType });
        res.end(body);
    } catch (err) {
        if (err.code === "ENOENT") {
            res.writeHead(404);
            res.end("Not found");
        } else {
            res.writeHead(500);
            res.end("Internal error");
        }
    }
});

server.listen(PORT, async () => {
    const devPw = await loadDevPassword();
    console.log(`\n  🌐  Dev frontend:  http://localhost:${PORT}`);
    console.log(
        `  📂  Local itinerary: ${localItineraryPath || "(none found)"}`,
    );
    console.log(
        `  🔑  Dev password: ${devPw ? "(set via private/.dev-password)" : "(none — any password accepted)"}`,
    );
    console.log(`  🔄  Live-reload active — watching for file changes\n`);
});
