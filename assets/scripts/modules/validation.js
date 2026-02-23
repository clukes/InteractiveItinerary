(function (global) {
    "use strict";

    const modules = global.__itineraryModules || (global.__itineraryModules = {});

    const ITINERARY_SCHEMA = {
        required: ["schemaVersion", "tripId", "title", "days"],
        properties: {
            schemaVersion: { type: "string", const: "1.0" },
            tripId: { type: "string", minLength: 1 },
            title: { type: "string", minLength: 1 },
            dateRange: {
                type: "object",
                required: ["start", "end"],
                properties: {
                    start: { type: "string" },
                    end: { type: "string" },
                },
            },
            days: { type: "array", minItems: 1 },
        },
        dayRequired: ["dayId", "dayNumber", "label", "activities"],
        activityRequired: [
            "activityId",
            "order",
            "name",
            "description",
            "image",
            "location",
            "price",
            "tips",
            "photoSpotTips",
            "ratingSummary",
            "reviewLinks",
            "websiteUrl",
        ],
    };

    function validateItinerary(data) {
        const errors = [];

        if (!data || typeof data !== "object" || Array.isArray(data)) {
            errors.push("Itinerary must be a JSON object.");
            return errors;
        }

        for (const field of ITINERARY_SCHEMA.required) {
            if (!(field in data)) {
                errors.push(`Missing required field: "${field}".`);
            }
        }
        if (errors.length) return errors;

        if (data.schemaVersion !== "1.0") {
            errors.push(
                `Invalid schemaVersion: expected "1.0", got "${data.schemaVersion}".`,
            );
        }

        if (typeof data.tripId !== "string" || data.tripId.length === 0) {
            errors.push('"tripId" must be a non-empty string.');
        }
        if (typeof data.title !== "string" || data.title.length === 0) {
            errors.push('"title" must be a non-empty string.');
        }

        if ("dateRange" in data && data.dateRange !== undefined) {
            if (!data.dateRange || typeof data.dateRange !== "object") {
                errors.push('"dateRange" must be an object with "start" and "end".');
            } else {
                if (!data.dateRange.start)
                    errors.push('"dateRange.start" is required.');
                if (!data.dateRange.end)
                    errors.push('"dateRange.end" is required.');
                if (data.dateRange.start && data.dateRange.end) {
                    if (new Date(data.dateRange.end) < new Date(data.dateRange.start)) {
                        errors.push(
                            '"dateRange.end" must be on or after "dateRange.start".',
                        );
                    }
                }
            }
        }

        if (!Array.isArray(data.days)) {
            errors.push('"days" must be an array.');
            return errors;
        }
        if (data.days.length === 0) {
            errors.push('"days" must contain at least one day.');
            return errors;
        }

        const dayNumbers = new Set();
        for (let i = 0; i < data.days.length; i++) {
            const day = data.days[i];
            const prefix = `days[${i}]`;

            for (const f of ITINERARY_SCHEMA.dayRequired) {
                if (!(f in day)) {
                    errors.push(`${prefix}: Missing required field "${f}".`);
                }
            }

            if (typeof day.dayNumber === "number") {
                if (dayNumbers.has(day.dayNumber)) {
                    errors.push(`${prefix}: Duplicate dayNumber ${day.dayNumber}.`);
                }
                dayNumbers.add(day.dayNumber);
            }

            if ("hotel" in day && day.hotel !== undefined) {
                if (
                    !day.hotel ||
                    typeof day.hotel !== "object" ||
                    Array.isArray(day.hotel)
                ) {
                    errors.push(
                        `${prefix}.hotel: Must be an object with "name" and "location".`,
                    );
                } else {
                    if (
                        typeof day.hotel.name !== "string" ||
                        day.hotel.name.trim().length === 0
                    ) {
                        errors.push(
                            `${prefix}.hotel.name: Must be a non-empty string.`,
                        );
                    }

                    if (
                        !day.hotel.location ||
                        typeof day.hotel.location !== "object" ||
                        Array.isArray(day.hotel.location)
                    ) {
                        errors.push(
                            `${prefix}.hotel.location: Must be an object with "lat", "lng", and "mapsUrl".`,
                        );
                    } else {
                        if (typeof day.hotel.location.lat !== "number") {
                            errors.push(
                                `${prefix}.hotel.location.lat: Must be a number.`,
                            );
                        }
                        if (typeof day.hotel.location.lng !== "number") {
                            errors.push(
                                `${prefix}.hotel.location.lng: Must be a number.`,
                            );
                        }
                        if (
                            typeof day.hotel.location.mapsUrl !== "string" ||
                            day.hotel.location.mapsUrl.trim().length === 0
                        ) {
                            errors.push(
                                `${prefix}.hotel.location.mapsUrl: Must be a non-empty string.`,
                            );
                        }
                    }
                }
            }

            if (Array.isArray(day.activities)) {
                const activityOrders = new Set();
                for (let j = 0; j < day.activities.length; j++) {
                    const act = day.activities[j];
                    const actPrefix = `${prefix}.activities[${j}]`;

                    for (const f of ITINERARY_SCHEMA.activityRequired) {
                        if (!(f in act)) {
                            errors.push(
                                `${actPrefix}: Missing required field "${f}".`,
                            );
                        }
                    }

                    if (typeof act.order === "number") {
                        if (activityOrders.has(act.order)) {
                            errors.push(
                                `${actPrefix}: Duplicate order ${act.order} within day.`,
                            );
                        }
                        activityOrders.add(act.order);
                    }

                    if (act.image && typeof act.image === "object") {
                        if (!act.image.url)
                            errors.push(`${actPrefix}.image: Missing "url".`);
                        if (!act.image.alt)
                            errors.push(`${actPrefix}.image: Missing "alt".`);
                    } else if (
                        "image" in act &&
                        (typeof act.image !== "object" || act.image === null)
                    ) {
                        errors.push(
                            `${actPrefix}.image: Must be an object with "url" and "alt".`,
                        );
                    }

                    if (act.location && typeof act.location === "object") {
                        if (!act.location.mapsUrl)
                            errors.push(
                                `${actPrefix}.location: Missing "mapsUrl".`,
                            );
                    } else if (
                        "location" in act &&
                        (typeof act.location !== "object" || act.location === null)
                    ) {
                        errors.push(
                            `${actPrefix}.location: Must be an object with "mapsUrl".`,
                        );
                    }

                    if ("tips" in act) {
                        if (!Array.isArray(act.tips) || act.tips.length === 0) {
                            errors.push(
                                `${actPrefix}.tips: Must be a non-empty array.`,
                            );
                        }
                    }
                    if ("photoSpotTips" in act) {
                        if (
                            !Array.isArray(act.photoSpotTips) ||
                            act.photoSpotTips.length === 0
                        ) {
                            errors.push(
                                `${actPrefix}.photoSpotTips: Must be a non-empty array.`,
                            );
                        }
                    }

                    if ("reviewLinks" in act && act.reviewLinks !== null) {
                        if (!Array.isArray(act.reviewLinks)) {
                            errors.push(`${actPrefix}.reviewLinks: Must be an array.`);
                        } else {
                            const sourceNames = new Set();
                            for (let k = 0; k < act.reviewLinks.length; k++) {
                                const rl = act.reviewLinks[k];
                                if (!rl.sourceName || !rl.url) {
                                    errors.push(
                                        `${actPrefix}.reviewLinks[${k}]: Missing "sourceName" or "url".`,
                                    );
                                }
                                if (rl.sourceName) {
                                    if (sourceNames.has(rl.sourceName)) {
                                        errors.push(
                                            `${actPrefix}.reviewLinks[${k}]: Duplicate sourceName "${rl.sourceName}".`,
                                        );
                                    }
                                    sourceNames.add(rl.sourceName);
                                }
                            }
                        }
                    }
                }
            }
        }

        return errors;
    }

    modules.validation = {
        validateItinerary,
    };
})(window);
