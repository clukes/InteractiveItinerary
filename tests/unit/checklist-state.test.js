/**
 * T008 + T024 + T030: Checklist state model tests
 * Tests: state transitions (pending/done/skipped), mutual exclusivity,
 *        persistence across day switches, single selected day invariant
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import { JSDOM } from "jsdom";
import fs from "fs";
import path from "path";

let dom, window;

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
    fs.readFileSync(path.resolve(__dirname, "../../assets/scripts/app.js"), "utf-8"),
];

beforeEach(async () => {
    dom = new JSDOM(html, {
        runScripts: "outside-only",
        url: "http://localhost/",
    });
    window = dom.window;
    window.fetch = vi.fn(async () => ({
        ok: true,
        json: async () => validFixture,
    }));
    appScripts.forEach((script) => window.eval(script));

    // Load test fixture
    window.__loadItinerary(validFixture);
});

describe("Checklist State — Status Transitions (T008)", () => {
    it("initializes all activities as pending", () => {
        expect(window.__getActivityStatus("act-1-1")).toBe("pending");
        expect(window.__getActivityStatus("act-1-2")).toBe("pending");
        expect(window.__getActivityStatus("act-2-1")).toBe("pending");
    });

    it("transitions from pending to done", () => {
        window.__setActivityStatus("act-1-1", "done");
        expect(window.__getActivityStatus("act-1-1")).toBe("done");
    });

    it("transitions from pending to skipped", () => {
        window.__setActivityStatus("act-1-1", "skipped");
        expect(window.__getActivityStatus("act-1-1")).toBe("skipped");
    });

    it("transitions from done to skipped", () => {
        window.__setActivityStatus("act-1-1", "done");
        window.__setActivityStatus("act-1-1", "skipped");
        expect(window.__getActivityStatus("act-1-1")).toBe("skipped");
    });

    it("transitions from skipped to done", () => {
        window.__setActivityStatus("act-1-1", "skipped");
        window.__setActivityStatus("act-1-1", "done");
        expect(window.__getActivityStatus("act-1-1")).toBe("done");
    });

    it("enforces mutual exclusivity — cannot be both done and skipped", () => {
        window.__setActivityStatus("act-1-1", "done");
        expect(window.__getActivityStatus("act-1-1")).toBe("done");
        window.__setActivityStatus("act-1-1", "skipped");
        expect(window.__getActivityStatus("act-1-1")).toBe("skipped");
        // Should NOT be done anymore
        expect(window.__getActivityStatus("act-1-1")).not.toBe("done");
    });

    it("rejects invalid status values", () => {
        window.__setActivityStatus("act-1-1", "done");
        window.__setActivityStatus("act-1-1", "invalid-status");
        // Should remain done, not change to invalid
        expect(window.__getActivityStatus("act-1-1")).toBe("done");
    });

    it("returns pending for unknown activityId", () => {
        expect(window.__getActivityStatus("nonexistent")).toBe("pending");
    });
});

describe("Checklist State — Single Selected Day Invariant (T008)", () => {
    it("has exactly one selected day at a time", () => {
        const state = window.__itineraryState;
        expect(state.selectedDayId).toBe("day-1");

        window.__selectDay("day-2");
        expect(state.selectedDayId).toBe("day-2");
        // Not both selected
        expect(state.selectedDayId).not.toBe("day-1");
    });

    it("maintains selected day after status changes", () => {
        const state = window.__itineraryState;
        window.__selectDay("day-1");
        window.__setActivityStatus("act-1-1", "done");
        expect(state.selectedDayId).toBe("day-1");
    });
});

describe("Checklist State — Auto-collapse on Status Change (T024/T025)", () => {
    it("collapses expanded activity when status changes", () => {
        const state = window.__itineraryState;

        // Expand an activity
        window.__toggleExpand("act-1-1");
        expect(state.expandedActivityId).toBe("act-1-1");

        // Change its status
        window.__setActivityStatus("act-1-1", "done");
        expect(state.expandedActivityId).toBeNull();
    });

    it("does not collapse other expanded activities", () => {
        const state = window.__itineraryState;

        // Expand activity 1-2
        window.__toggleExpand("act-1-2");
        expect(state.expandedActivityId).toBe("act-1-2");

        // Change status of a DIFFERENT activity
        window.__setActivityStatus("act-1-1", "done");
        // act-1-2 should still be expanded
        expect(state.expandedActivityId).toBe("act-1-2");
    });
});

describe("Checklist State — Persistence Across Day Switches (T030)", () => {
    it("retains activity status when switching days and coming back", () => {
        // Mark activities on day 1
        window.__setActivityStatus("act-1-1", "done");
        window.__setActivityStatus("act-1-2", "skipped");

        // Switch to day 2
        window.__selectDay("day-2");
        expect(window.__itineraryState.selectedDayId).toBe("day-2");

        // Switch back to day 1
        window.__selectDay("day-1");

        // Statuses should be preserved
        expect(window.__getActivityStatus("act-1-1")).toBe("done");
        expect(window.__getActivityStatus("act-1-2")).toBe("skipped");
        expect(window.__getActivityStatus("act-1-3")).toBe("pending");
    });

    it("retains day-2 statuses when switching away and back", () => {
        window.__selectDay("day-2");
        window.__setActivityStatus("act-2-1", "skipped");

        window.__selectDay("day-1");
        window.__selectDay("day-2");

        expect(window.__getActivityStatus("act-2-1")).toBe("skipped");
    });
});
