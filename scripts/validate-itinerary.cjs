#!/usr/bin/env node

/**
 * Pre-deploy itinerary validation script.
 *
 * Validates a private itinerary JSON file against the canonical JSON Schema
 * (specs/001-interactive-itinerary/contracts/itinerary-file.schema.json)
 * using AJV with 2020-12 draft support and format validation.
 *
 * Usage:
 *   node scripts/validate-itinerary.js [path/to/itinerary.json]
 *
 * If no path is provided, it searches the default private itinerary locations.
 * Exits 0 on success, 1 on validation failure or missing file.
 */

const Ajv2020 = require("ajv/dist/2020");
const addFormats = require("ajv-formats");
const fs = require("fs");
const path = require("path");

const REPO_ROOT = path.resolve(__dirname, "..");
const SCHEMA_PATH = path.join(
    REPO_ROOT,
    "specs/001-interactive-itinerary/contracts/itinerary-file.schema.json",
);

const DEFAULT_ITINERARY_PATHS = [
    path.join(REPO_ROOT, "private/local-itineraries/seville-itinerary.private.json"),
    path.join(REPO_ROOT, "private/seville-itinerary.private.json"),
    path.join(REPO_ROOT, "private/seville-itinerary.json"),
];

function resolveItineraryPath(explicit) {
    if (explicit) {
        const resolved = path.resolve(explicit);
        if (!fs.existsSync(resolved)) {
            console.error(`Error: itinerary file not found at ${resolved}`);
            process.exit(1);
        }
        return resolved;
    }
    for (const candidate of DEFAULT_ITINERARY_PATHS) {
        if (fs.existsSync(candidate)) return candidate;
    }
    console.error("Error: no itinerary file found. Checked:");
    DEFAULT_ITINERARY_PATHS.forEach((p) => console.error(`  - ${p}`));
    process.exit(1);
}

function run() {
    const itineraryPath = resolveItineraryPath(process.argv[2]);

    if (!fs.existsSync(SCHEMA_PATH)) {
        console.error(`Error: schema not found at ${SCHEMA_PATH}`);
        process.exit(1);
    }

    const schema = JSON.parse(fs.readFileSync(SCHEMA_PATH, "utf8"));
    let data;
    try {
        data = JSON.parse(fs.readFileSync(itineraryPath, "utf8"));
    } catch (err) {
        console.error(`Error: failed to parse ${itineraryPath}: ${err.message}`);
        process.exit(1);
    }

    const ajv = new Ajv2020({ allErrors: true });
    addFormats(ajv);

    const valid = ajv.validate(schema, data);

    if (valid) {
        console.log(`✅ Validation passed: ${path.relative(REPO_ROOT, itineraryPath)}`);
        process.exit(0);
    }

    console.error(
        `❌ Validation failed for ${path.relative(REPO_ROOT, itineraryPath)}:\n`,
    );
    for (const err of ajv.errors) {
        const loc = err.instancePath || "(root)";
        const detail =
            err.keyword === "additionalProperties"
                ? `unexpected property "${err.params.additionalProperty}"`
                : err.message;
        console.error(`  ${loc}  →  ${detail}`);
    }
    console.error(`\n${ajv.errors.length} error(s) found.`);
    process.exit(1);
}

run();
