import { describe, it, expect, beforeEach, vi } from "vitest";
import { JSDOM } from "jsdom";
import fs from "fs";
import path from "path";

let dom;
let window;
let document;
let fetchMock;

const demoFixture = JSON.parse(
    fs.readFileSync(
        path.resolve(__dirname, "../../assets/data/default-itinerary.json"),
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

async function flushBootstrap() {
    await Promise.resolve();
    await Promise.resolve();
    await new Promise((resolve) => setTimeout(resolve, 0));
}

async function waitForStatusText(statusElement, expectedText) {
    for (let i = 0; i < 20; i++) {
        if ((statusElement.textContent || "").includes(expectedText)) {
            return;
        }
        await flushBootstrap();
    }
    throw new Error(`Status never included: ${expectedText}`);
}

beforeEach(async () => {
    dom = new JSDOM(html, {
        runScripts: "outside-only",
        url: "https://example.com/",
    });

    window = dom.window;
    document = dom.window.document;
    fetchMock = vi.fn(async () => ({
        ok: true,
        json: async () => demoFixture,
    }));
    window.fetch = fetchMock;

    appScripts.forEach((script) => window.eval(script));
    await flushBootstrap();
});

describe("Locked mode demo fallback", () => {
    it("shows default demo itinerary before any password entry", async () => {
        const unlockPanel = document.getElementById("unlock-panel");
        const tabs = document.querySelectorAll('[role="tab"]');
        const status = document.getElementById("file-status");

        await waitForStatusText(status, "Showing demo itinerary");

        expect(unlockPanel.style.display).toBe("block");
        expect(tabs.length).toBeGreaterThan(0);
        expect(status.textContent).toContain("Showing demo itinerary");
        expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it("keeps showing demo itinerary when unlock is clicked with empty password", async () => {
        const unlockInput = document.getElementById("unlock-password");
        const unlockButton = document.getElementById("unlock-button");
        const status = document.getElementById("file-status");

        unlockInput.value = "";
        unlockButton.click();
        await waitForStatusText(status, "Showing demo itinerary");

        expect(status.textContent).toContain("Showing demo itinerary");
        expect(status.className).toBe("file-status");
        expect(fetchMock).toHaveBeenCalledTimes(2);
    });
});
