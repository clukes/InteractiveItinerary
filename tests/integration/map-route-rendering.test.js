/**
 * T017 + T018 + T040: Map route rendering integration tests
 * Tests: route point ordering, segment generation, missing map data degradation,
 *        performance assertions for day switching and route refresh
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import { JSDOM } from "jsdom";
import fs from "fs";
import path from "path";

let dom, document, window;

const validFixture = JSON.parse(
    fs.readFileSync(
        path.resolve(__dirname, "../fixtures/valid-itinerary.json"),
        "utf-8",
    ),
);

const html = fs.readFileSync(
    path.resolve(__dirname, "../../index.html"),
    "utf-8",
);
const appScripts = [
    fs.readFileSync(
        path.resolve(__dirname, "../../assets/scripts/modules/validation.js"),
        "utf-8",
    ),
    fs.readFileSync(
        path.resolve(__dirname, "../../assets/scripts/modules/map-rendering.js"),
        "utf-8",
    ),
    fs.readFileSync(
        path.resolve(__dirname, "../../assets/scripts/modules/map-interaction.js"),
        "utf-8",
    ),
    fs.readFileSync(path.resolve(__dirname, "../../assets/scripts/app.js"), "utf-8"),
];

beforeEach(async () => {
    dom = new JSDOM(html, {
        runScripts: "outside-only",
        url: "http://localhost/",
    });
    window = dom.window;
    document = dom.window.document;
    window.fetch = vi.fn(async () => ({
        ok: true,
        json: async () => validFixture,
    }));
    appScripts.forEach((script) => window.eval(script));

    window.__loadItinerary(validFixture);
});

describe("Map Route — Point Ordering (T017)", () => {
    it("renders map markers for activities with coordinates", () => {
        // Day 1 has 2 activities with coordinates (act-1-1, act-1-2) and 1 without (act-1-3)
        const markers = document.querySelectorAll(".map-marker");
        expect(markers.length).toBe(2); // Only 2 have lat/lng
    });

    it("orders markers by activity order", () => {
        const markers = document.querySelectorAll(".map-marker");
        const markerTexts = Array.from(markers).map(
            (m) => m.querySelector("text").textContent,
        );
        expect(markerTexts).toEqual(["1", "2"]);
    });

    it("generates route line segments between ordered markers", () => {
        const lines = document.querySelectorAll(".route-line");
        // 2 map-valid activities → 1 segment
        expect(lines.length).toBe(1);
    });

    it("renders SVG with proper viewBox", () => {
        const svg = document.querySelector(".map-container svg");
        expect(svg).not.toBeNull();
        expect(svg.getAttribute("viewBox")).toBeTruthy();
    });

    it("has correct accessibility label on SVG", () => {
        const svg = document.querySelector(".map-container svg");
        expect(svg.getAttribute("aria-label")).toContain("Route map");
    });
});

describe("Map Route — Missing Map Data Handling (T018)", () => {
    it("still renders valid map points even when some activities lack coordinates", () => {
        // Day 1: 2 activities with coords, 1 without
        const markers = document.querySelectorAll(".map-marker");
        expect(markers.length).toBe(2);
    });

    it("marks activities missing map data in legend", () => {
        const badges = document.querySelectorAll(".map-badge");
        // act-1-3 "Seine River Walk" has no lat/lng
        const badgeTexts = Array.from(badges).map((b) => b.textContent);
        expect(
            badgeTexts.some(
                (t) => t.includes("unavailable") || t.includes("No map"),
            ),
        ).toBe(true);
    });

    it("shows all-unavailable message for day with no mapped activities", () => {
        // Create an itinerary with a day where all activities lack coordinates
        const noMapItinerary = {
            ...validFixture,
            days: [
                {
                    dayId: "nomap-1",
                    dayNumber: 1,
                    label: "Day 1",
                    activities: [
                        {
                            ...validFixture.days[0].activities[2], // Seine River Walk (no coords)
                            activityId: "no-map-1",
                        },
                    ],
                },
            ],
        };
        window.__loadItinerary(noMapItinerary);

        const unavailable = document.querySelector(".map-unavailable");
        expect(unavailable).not.toBeNull();
        expect(unavailable.textContent.toLowerCase()).toContain("unavailable");
    });

    it("still renders checklist activities even when map data is missing", () => {
        // Day 1 should show all 3 activities in checklist
        const cards = document.querySelectorAll(".activity-card");
        expect(cards.length).toBe(3);
    });
});

describe("Map Route — Day 2 Route (single activity)", () => {
    it("renders single marker without route lines", () => {
        window.__selectDay("day-2");
        const markers = document.querySelectorAll(".map-marker");
        expect(markers.length).toBe(1);

        const lines = document.querySelectorAll(".route-line");
        expect(lines.length).toBe(0); // No segment for single point
    });
});

describe("Map Route — Performance (T040)", () => {
    it("completes day switch rendering within 100ms", () => {
        const start = performance.now();
        window.__selectDay("day-2");
        const elapsed = performance.now() - start;
        expect(elapsed).toBeLessThan(100);
    });

    it("completes route refresh on day switch within target threshold", () => {
        const start = performance.now();
        window.__selectDay("day-1");
        const elapsed = performance.now() - start;
        expect(elapsed).toBeLessThan(100);
    });
});
