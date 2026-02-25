/**
 * T011 + T012 + T025: Day navigation integration tests
 * Tests: active tab rendering, selected-day-only content, default day selection,
 *        empty-day state, stale-content prevention, auto-collapse on status change
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

    // Load test fixture
    window.__loadItinerary(validFixture);
});

describe("Day Navigation — Tab Rendering (T011)", () => {
    it("renders a tab for each day in the itinerary", () => {
        const tabs = document.querySelectorAll('[role="tab"]');
        expect(tabs.length).toBe(3); // 3 days in fixture
    });

    it('marks exactly one tab as aria-selected="true"', () => {
        const selectedTabs = document.querySelectorAll(
            '[role="tab"][aria-selected="true"]',
        );
        expect(selectedTabs.length).toBe(1);
    });

    it("selects the first day by default", () => {
        const selectedTab = document.querySelector(
            '[role="tab"][aria-selected="true"]',
        );
        expect(selectedTab.getAttribute("data-day-id")).toBe("day-1");
    });

    it("displays day labels on tabs", () => {
        const tabs = document.querySelectorAll('[role="tab"]');
        expect(tabs[0].textContent).toBe("Day 1");
        expect(tabs[1].textContent).toBe("Day 2");
        expect(tabs[2].textContent).toBe("Day 3");
    });
});

describe("Day Navigation — Selected Day Content (T011)", () => {
    it("shows only selected day activities", () => {
        // Day 1 is selected by default (3 activities)
        const cards = document.querySelectorAll(".activity-card");
        expect(cards.length).toBe(3);
    });

    it("updates content when switching tabs", () => {
        window.__selectDay("day-2");
        const cards = document.querySelectorAll(".activity-card");
        expect(cards.length).toBe(1); // Day 2 has 1 activity
        expect(cards[0].getAttribute("data-activity-id")).toBe("act-2-1");
    });

    it("does not show activities from non-selected days", () => {
        window.__selectDay("day-2");
        const allActivityIds = Array.from(
            document.querySelectorAll(".activity-card"),
        ).map((c) => c.getAttribute("data-activity-id"));

        // Should NOT contain day-1 activities
        expect(allActivityIds).not.toContain("act-1-1");
        expect(allActivityIds).not.toContain("act-1-2");
        expect(allActivityIds).not.toContain("act-1-3");
    });

    it("updates aria-selected when switching tabs", () => {
        window.__selectDay("day-2");
        const tabs = document.querySelectorAll('[role="tab"]');
        expect(tabs[0].getAttribute("aria-selected")).toBe("false");
        expect(tabs[1].getAttribute("aria-selected")).toBe("true");
        expect(tabs[2].getAttribute("aria-selected")).toBe("false");
    });
});

describe("Day Navigation — Empty Day State (T012)", () => {
    it("shows empty state message for day with no activities", () => {
        window.__selectDay("day-3");
        const emptyState = document.querySelector(".empty-state");
        expect(emptyState).not.toBeNull();
        expect(emptyState.textContent).toContain("No activities planned");
    });

    it("does not show stale activities from previous day", () => {
        // First view day 1 (3 activities)
        let cards = document.querySelectorAll(".activity-card");
        expect(cards.length).toBe(3);

        // Switch to empty day
        window.__selectDay("day-3");
        cards = document.querySelectorAll(".activity-card");
        expect(cards.length).toBe(0);
    });

    it("does not show map section on empty day", () => {
        window.__selectDay("day-3");
        const mapSection = document.querySelector(".map-section");
        expect(mapSection).toBeNull();
    });
});

describe("Day Navigation — Auto-collapse on Status Change (T025)", () => {
    it("collapses expanded activity details after status change", () => {
        // Expand activity
        window.__toggleExpand("act-1-1");

        // Re-query after render — use .activity-card to avoid matching SVG markers
        let card = document.querySelector(
            '.activity-card[data-activity-id="act-1-1"]',
        );
        expect(card).not.toBeNull();
        expect(card.getAttribute("data-expanded")).toBe("true");

        // Change status — should auto-collapse
        window.__setActivityStatus("act-1-1", "done");
        card = document.querySelector(
            '.activity-card[data-activity-id="act-1-1"]',
        );
        expect(card).not.toBeNull();
        expect(card.getAttribute("data-expanded")).toBe("false");
    });

    it("keeps other activities expanded when one status changes", () => {
        window.__toggleExpand("act-1-2");

        // Re-query after render — use .activity-card to avoid matching SVG markers
        let card2 = document.querySelector(
            '.activity-card[data-activity-id="act-1-2"]',
        );
        expect(card2).not.toBeNull();
        expect(card2.getAttribute("data-expanded")).toBe("true");

        window.__setActivityStatus("act-1-1", "done");

        card2 = document.querySelector(
            '.activity-card[data-activity-id="act-1-2"]',
        );
        expect(card2).not.toBeNull();
        expect(card2.getAttribute("data-expanded")).toBe("true");
    });
});
