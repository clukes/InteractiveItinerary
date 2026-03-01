#!/usr/bin/env node

/**
 * Rewrite image URLs in itinerary JSON files to point to Cloudflare Pages.
 *
 * For each activity, the script looks up local image files in private/images/
 * using the naming convention: {dayAbbrev}-{order}-{type}-{hash}.jpg
 * and replaces the original URLs with the Pages CDN URL.
 *
 * Usage:
 *   node scripts/rewrite-image-urls.mjs [--dry-run] [--base-url <url>]
 *
 * Options:
 *   --dry-run     Show what would change without writing files
 *   --base-url    Override the default Pages base URL
 */

import { readFileSync, writeFileSync, readdirSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, "..");

const DEFAULT_BASE_URL = "https://itinerary-images.pages.dev";
const IMAGES_DIR = resolve(REPO_ROOT, "private/images");

// Files to process: [jsonPath, dayKeyFn]
// dayKeyFn: (dayObj) => prefix string used in filenames
const TARGETS = [
    {
        path: resolve(REPO_ROOT, "private/seville-itinerary.json"),
        dayKey: (day) => {
            const label = (day.label || "").toLowerCase();
            const MAP = {
                friday: "fri",
                saturday: "sat",
                sunday: "sun",
                monday: "mon",
                tuesday: "tue",
                wednesday: "wed",
                thursday: "thu",
            };
            for (const [name, abbrev] of Object.entries(MAP)) {
                if (label.startsWith(name)) return abbrev;
            }
            return label.slice(0, 3);
        },
    },
    {
        path: resolve(REPO_ROOT, "assets/data/sample-itinerary.json"),
        dayKey: (day) => `day${day.dayNumber}`,
    },
];

// --- Parse args ---
const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const baseUrlIdx = args.indexOf("--base-url");
const BASE_URL =
    baseUrlIdx !== -1 && args[baseUrlIdx + 1]
        ? args[baseUrlIdx + 1].replace(/\/$/, "")
        : DEFAULT_BASE_URL;

// --- Build a lookup of local image files ---
const localFiles = readdirSync(IMAGES_DIR);

/**
 * Find a local image file matching a prefix pattern.
 * e.g. findFile("fri-2", "main") → "fri-2-main-e4f762fc.jpg"
 * Handles zero-padded variants like "sat-09" for order 9.
 */
function findFile(dayPrefix, order, type) {
    const patterns = [
        `${dayPrefix}-${order}-${type}-`,
        `${dayPrefix}-${String(order).padStart(2, "0")}-${type}-`,
    ];
    for (const pat of patterns) {
        const match = localFiles.find((f) => f.startsWith(pat));
        if (match) return match;
    }
    return null;
}

// --- Process each target ---
let totalRewrites = 0;
let totalSkipped = 0;

for (const target of TARGETS) {
    let data;
    try {
        data = JSON.parse(readFileSync(target.path, "utf8"));
    } catch (e) {
        console.warn(`⚠ Skipping ${target.path}: ${e.message}`);
        continue;
    }

    console.log(`\n📄 Processing: ${target.path}`);
    let fileRewrites = 0;

    for (const day of data.days) {
        const prefix = target.dayKey(day);

        for (const act of day.activities) {
            const order = act.order;

            // --- Main image ---
            const mainFile = findFile(prefix, order, "main");
            if (mainFile) {
                const newUrl = `${BASE_URL}/${mainFile}`;
                if (act.image?.url && act.image.url !== newUrl) {
                    if (dryRun) {
                        console.log(
                            `  [DRY] ${act.name} image: ${act.image.url.slice(0, 60)}… → ${mainFile}`,
                        );
                    }
                    act.image.url = newUrl;
                    fileRewrites++;
                }
            } else {
                console.log(
                    `  ⏭ ${act.name} (order ${order}): no local main image — keeping existing URL`,
                );
                totalSkipped++;
            }

            // --- Photo examples ---
            if (act.photoExamples) {
                for (let j = 0; j < act.photoExamples.length; j++) {
                    const pe = act.photoExamples[j];
                    const peFile = findFile(prefix, order, `pe${j}`);
                    if (peFile) {
                        const newUrl = `${BASE_URL}/${peFile}`;
                        if (pe.url && pe.url !== newUrl) {
                            if (dryRun) {
                                console.log(
                                    `  [DRY] ${act.name} pe[${j}]: ${pe.url.slice(0, 60)}… → ${peFile}`,
                                );
                            }
                            pe.url = newUrl;
                            fileRewrites++;
                        }
                    } else {
                        console.log(
                            `  ⏭ ${act.name} pe[${j}]: no local file — keeping existing URL`,
                        );
                        totalSkipped++;
                    }
                }
            }
        }
    }

    totalRewrites += fileRewrites;

    if (!dryRun && fileRewrites > 0) {
        writeFileSync(
            target.path,
            JSON.stringify(data, null, 2) + "\n",
            "utf8",
        );
        console.log(
            `  ✅ Wrote ${fileRewrites} URL rewrites to ${target.path}`,
        );
    } else if (dryRun) {
        console.log(`  Would rewrite ${fileRewrites} URLs (dry run)`);
    } else {
        console.log(`  No changes needed.`);
    }
}

console.log(
    `\n🏁 Done. ${totalRewrites} URLs rewritten, ${totalSkipped} kept as-is.`,
);
if (dryRun) {
    console.log(
        "   (Dry run — no files were modified. Remove --dry-run to apply.)",
    );
}
