/**
 * T010 + T026 + T033: File load validation integration tests
 * Tests: missing data labeling, full activity-detail field rendering,
 *        valid file replacement, invalid-file rollback behavior
 */
import { describe, it, expect, beforeEach } from "vitest";
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

const invalidFixture = JSON.parse(
    fs.readFileSync(
        path.resolve(
            __dirname,
            "../fixtures/invalid-itinerary-missing-fields.json",
        ),
        "utf-8",
    ),
);

beforeEach(async () => {
    const html = fs.readFileSync(
        path.resolve(__dirname, "../../index.html"),
        "utf-8",
    );
    dom = new JSDOM(html, {
        runScripts: "dangerously",
        resources: "usable",
        url: "http://localhost/",
    });
    window = dom.window;
    document = dom.window.document;
    await new Promise((r) => setTimeout(r, 200));

    window.__loadItinerary(validFixture);
});

describe("File Load — Missing Data Labeling (T010)", () => {
    it('renders "Not provided" for null price', () => {
        // Expand act-1-3 (Seine River Walk) which has null price
        window.__toggleExpand("act-1-3");

        const details = document.getElementById("details-act-1-3");
        expect(details).not.toBeNull();

        const notProvided = details.querySelectorAll(".not-provided");
        const texts = Array.from(notProvided).map((el) => el.textContent);
        expect(texts.some((t) => t.includes("Not provided"))).toBe(true);
    });

    it('renders "Not provided" for null websiteUrl', () => {
        window.__toggleExpand("act-1-3");
        const details = document.getElementById("details-act-1-3");
        const notProvided = Array.from(
            details.querySelectorAll(".not-provided"),
        ).map((el) => el.textContent);
        expect(notProvided.some((t) => t.includes("Not provided"))).toBe(true);
    });

    it('renders "Map data unavailable" for missing location coordinates', () => {
        window.__toggleExpand("act-1-3");
        const details = document.getElementById("details-act-1-3");
        // But it should still show the Google Maps link if mapsUrl is available
        const locationLink = details.querySelector('a[href*="maps"]');
        expect(locationLink).not.toBeNull();
    });

    it('renders "No reviews available" for empty reviewLinks', () => {
        window.__toggleExpand("act-1-3");
        const details = document.getElementById("details-act-1-3");
        const text = details.textContent;
        expect(text).toContain("No reviews available");
    });
});

describe("File Load — Activity Detail Field Rendering (T026)", () => {
    it("renders all required detail categories for a fully populated activity", () => {
        // Expand act-1-1 (Eiffel Tower) — fully populated
        window.__toggleExpand("act-1-1");
        const details = document.getElementById("details-act-1-1");
        expect(details).not.toBeNull();

        const labels = Array.from(
            details.querySelectorAll(".detail-label"),
        ).map((l) => l.textContent);

        // FR-009 to FR-017 fields
        expect(labels).toContain("Description"); // FR-011
        expect(labels).toContain("Location"); // FR-012
        expect(labels).toContain("Price"); // FR-013
        expect(labels).toContain("Tips"); // FR-014
        expect(labels).toContain("Photo Spot Tips"); // FR-014a
        expect(labels).toContain("Rating"); // FR-015
        expect(labels).toContain("Reviews"); // FR-016
        expect(labels).toContain("Website"); // FR-017
    });

    it("renders activity image (FR-010)", () => {
        window.__toggleExpand("act-1-1");
        const img = document.querySelector("#details-act-1-1 .detail-image");
        expect(img).not.toBeNull();
        expect(img.getAttribute("src")).toContain("eiffel");
        expect(img.getAttribute("alt")).toBeTruthy();
    });

    it("renders Google Maps link (FR-012)", () => {
        window.__toggleExpand("act-1-1");
        const link = document.querySelector(
            '#details-act-1-1 a[href*="maps.google"]',
        );
        expect(link).not.toBeNull();
        expect(link.getAttribute("target")).toBe("_blank");
    });

    it("renders tip list items (FR-014)", () => {
        window.__toggleExpand("act-1-1");
        const tips = document.querySelectorAll(
            "#details-act-1-1 .detail-tips li",
        );
        expect(tips.length).toBeGreaterThanOrEqual(1);
    });

    it("renders review links (FR-016)", () => {
        window.__toggleExpand("act-1-1");
        const reviewLinks = document.querySelectorAll(
            '#details-act-1-1 a[aria-label*="review" i]',
        );
        expect(reviewLinks.length).toBeGreaterThanOrEqual(1);
    });

    it("renders website link (FR-017)", () => {
        window.__toggleExpand("act-1-1");
        const websiteLink = document.querySelector(
            '#details-act-1-1 a[aria-label*="website" i]',
        );
        expect(websiteLink).not.toBeNull();
    });
});

describe("File Load — Valid Replacement and Invalid Rollback (T033)", () => {
    it("replaces UI completely with new valid itinerary", () => {
        const secondItinerary = {
            schemaVersion: "1.0",
            tripId: "trip-2",
            title: "London Day Trip",
            days: [
                {
                    dayId: "ldn-1",
                    dayNumber: 1,
                    label: "London Day",
                    activities: [
                        {
                            activityId: "ldn-act-1",
                            order: 1,
                            name: "Big Ben",
                            description:
                                "Iconic clock tower at the Houses of Parliament.",
                            image: {
                                url: "https://example.com/bigben.jpg",
                                alt: "Big Ben",
                            },
                            location: {
                                lat: 51.5007,
                                lng: -0.1246,
                                mapsUrl: "https://maps.google.com/?q=Big+Ben",
                            },
                            price: "Free (exterior)",
                            tips: ["Best viewed from Westminster Bridge"],
                            photoSpotTips: [
                                "Shoot from across the Thames for full tower framing",
                            ],
                            ratingSummary: "4.5/5",
                            reviewLinks: [],
                            websiteUrl: null,
                        },
                    ],
                },
            ],
        };

        const result = window.__loadItinerary(secondItinerary);
        expect(result).toBe(true);

        // Title should update
        const title = document.getElementById("app-title");
        expect(title.textContent).toBe("London Day Trip");

        // Tabs should show new day
        const tabs = document.querySelectorAll('[role="tab"]');
        expect(tabs.length).toBe(1);
        expect(tabs[0].textContent).toBe("London Day");

        // Activity should be Big Ben
        const cards = document.querySelectorAll(".activity-card");
        expect(cards.length).toBe(1);
        expect(cards[0].getAttribute("data-activity-id")).toBe("ldn-act-1");
    });

    it("preserves previous valid content after invalid file load", () => {
        // Load valid first
        window.__loadItinerary(validFixture);
        const titleBefore = document.getElementById("app-title").textContent;
        expect(titleBefore).toBe("Test Trip to Paris");

        // Attempt to load invalid
        const result = window.__loadItinerary(invalidFixture);
        expect(result).toBe(false);

        // Previous valid content should still be there
        const titleAfter = document.getElementById("app-title").textContent;
        expect(titleAfter).toBe("Test Trip to Paris");

        // Activities from valid itinerary should still be visible
        const cards = document.querySelectorAll(".activity-card");
        expect(cards.length).toBeGreaterThan(0);
    });

    it("shows validation errors for invalid file", () => {
        window.__loadItinerary(invalidFixture);

        const errorContainer = document.getElementById("validation-errors");
        expect(errorContainer.classList.contains("visible")).toBe(true);

        const errorItems = document.querySelectorAll(
            "#validation-error-list li",
        );
        expect(errorItems.length).toBeGreaterThan(0);
    });

    it("clears validation errors when a valid file is loaded", () => {
        // Load invalid first
        window.__loadItinerary(invalidFixture);
        expect(
            document
                .getElementById("validation-errors")
                .classList.contains("visible"),
        ).toBe(true);

        // Load valid
        window.__loadItinerary(validFixture);
        expect(
            document
                .getElementById("validation-errors")
                .classList.contains("visible"),
        ).toBe(false);
    });

    it("resets activity statuses on new valid file load", () => {
        // Mark activity as done
        window.__setActivityStatus("act-1-1", "done");
        expect(window.__getActivityStatus("act-1-1")).toBe("done");

        // Reload same fixture
        window.__loadItinerary(validFixture);
        expect(window.__getActivityStatus("act-1-1")).toBe("pending");
    });

    it("tracks file load lifecycle states", () => {
        expect(window.__itineraryState.fileLoadState).toBe("loaded");

        window.__loadItinerary(invalidFixture);
        expect(window.__itineraryState.fileLoadState).toBe("validation_error");

        window.__loadItinerary(validFixture);
        expect(window.__itineraryState.fileLoadState).toBe("loaded");
    });
});
