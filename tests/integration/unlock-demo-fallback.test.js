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

const unlockedItineraryStorageKey = "itinerary_unlocked_data_v1";
const unlockedPasswordStorageKey = "itinerary_unlocked_password_v1";

const appScripts = [
    fs.readFileSync(
        path.resolve(__dirname, "../../assets/scripts/modules/validation.js"),
        "utf-8",
    ),
    fs.readFileSync(
        path.resolve(
            __dirname,
            "../../assets/scripts/modules/map-rendering.js",
        ),
        "utf-8",
    ),
    fs.readFileSync(
        path.resolve(__dirname, "../../assets/scripts/app.js"),
        "utf-8",
    ),
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
        const title = document.getElementById("app-title");

        await waitForStatusText(status, "Showing demo itinerary");

        expect(unlockPanel.style.display).toBe("block");
        expect(tabs.length).toBeGreaterThan(0);
        expect(status.textContent).toContain("Showing demo itinerary");
        expect(title.textContent).toBe("DEMO ITINERARY");
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

    it("replaces DEMO ITINERARY title after correct password unlock", async () => {
        const unlockInput = document.getElementById("unlock-password");
        const unlockButton = document.getElementById("unlock-button");
        const status = document.getElementById("file-status");
        const title = document.getElementById("app-title");
        const unlockPanel = document.getElementById("unlock-panel");
        const refreshButton = document.getElementById(
            "refresh-itinerary-button",
        );

        await waitForStatusText(status, "Showing demo itinerary");

        const unlockedFixture = {
            ...demoFixture,
            title: "Private Itinerary",
        };
        fetchMock.mockResolvedValueOnce({
            ok: true,
            json: async () => unlockedFixture,
        });

        unlockInput.value = "correct-password";
        unlockButton.click();
        await flushBootstrap();

        expect(title.textContent).toBe("Private Itinerary");
        expect(unlockPanel.style.display).toBe("none");
        expect(refreshButton.hidden).toBe(true);
        expect(status.hidden).toBe(true);
        const persisted = window.localStorage.getItem(
            unlockedItineraryStorageKey,
        );
        expect(persisted).toContain("Private Itinerary");
    });

    it("refresh button clears cache and returns to unlock flow", async () => {
        const unlockInput = document.getElementById("unlock-password");
        const unlockButton = document.getElementById("unlock-button");
        const status = document.getElementById("file-status");
        const refreshButton = document.getElementById(
            "refresh-itinerary-button",
        );
        const devModeButton = document.getElementById("dev-mode-button");
        const unlockPanel = document.getElementById("unlock-panel");

        await waitForStatusText(status, "Showing demo itinerary");

        const unlockedFixture = {
            ...demoFixture,
            title: "Private Itinerary",
        };
        fetchMock.mockResolvedValueOnce({
            ok: true,
            json: async () => unlockedFixture,
        });

        devModeButton.click();
        unlockInput.value = "correct-password";
        unlockButton.click();
        await waitForStatusText(status, "Itinerary unlocked successfully.");

        refreshButton.click();
        await waitForStatusText(status, "Server refresh requested.");

        expect(unlockPanel.style.display).toBe("block");
        expect(refreshButton.hidden).toBe(true);
        expect(
            window.localStorage.getItem(unlockedItineraryStorageKey),
        ).toBeNull();
    });

    it("restores unlocked state and refreshes unlocked data from server after refresh", async () => {
        const persistedUnlocked = {
            ...demoFixture,
            title: "Persisted Private Itinerary",
        };

        dom.window.localStorage.setItem(
            unlockedItineraryStorageKey,
            JSON.stringify(persistedUnlocked),
        );

        const refreshDom = new JSDOM(html, {
            runScripts: "outside-only",
            url: "https://example.com/",
        });

        refreshDom.window.localStorage.setItem(
            unlockedItineraryStorageKey,
            JSON.stringify(persistedUnlocked),
        );
        refreshDom.window.localStorage.setItem(
            unlockedPasswordStorageKey,
            "correct-password",
        );

        const refreshedUnlocked = {
            ...demoFixture,
            title: "Fresh Server Itinerary",
        };

        const refreshFetchMock = vi.fn(async () => ({
            ok: true,
            json: async () => refreshedUnlocked,
        }));
        refreshDom.window.fetch = refreshFetchMock;

        appScripts.forEach((script) => refreshDom.window.eval(script));
        await flushBootstrap();

        const title = refreshDom.window.document.getElementById("app-title");
        const unlockPanel =
            refreshDom.window.document.getElementById("unlock-panel");
        const status = refreshDom.window.document.getElementById("file-status");
        expect(title.textContent).toBe("Fresh Server Itinerary");
        expect(unlockPanel.style.display).toBe("none");
        expect(status.hidden).toBe(true);
        expect(status.textContent).toBe("");
        expect(refreshFetchMock).toHaveBeenCalledTimes(1);
    });

    it("keeps unlocked fallback data when server refresh fails after reload", async () => {
        const persistedUnlocked = {
            ...demoFixture,
            title: "Persisted Private Itinerary",
        };

        const refreshDom = new JSDOM(html, {
            runScripts: "outside-only",
            url: "https://example.com/",
        });

        refreshDom.window.localStorage.setItem(
            unlockedItineraryStorageKey,
            JSON.stringify(persistedUnlocked),
        );
        refreshDom.window.localStorage.setItem(
            unlockedPasswordStorageKey,
            "correct-password",
        );

        const refreshFetchMock = vi.fn(async () => ({
            ok: false,
            status: 500,
            json: async () => ({ error: "server unavailable" }),
        }));
        refreshDom.window.fetch = refreshFetchMock;

        appScripts.forEach((script) => refreshDom.window.eval(script));
        await flushBootstrap();

        const title = refreshDom.window.document.getElementById("app-title");
        const unlockPanel =
            refreshDom.window.document.getElementById("unlock-panel");
        const status = refreshDom.window.document.getElementById("file-status");

        expect(title.textContent).toBe("Persisted Private Itinerary");
        expect(unlockPanel.style.display).toBe("none");
        expect(status.hidden).toBe(true);
        expect(refreshFetchMock).toHaveBeenCalledTimes(1);
    });

    it("shows refresh and unlock success status only when dev mode is enabled", async () => {
        const unlockInput = document.getElementById("unlock-password");
        const unlockButton = document.getElementById("unlock-button");
        const status = document.getElementById("file-status");
        const refreshButton = document.getElementById(
            "refresh-itinerary-button",
        );
        const devModeButton = document.getElementById("dev-mode-button");

        await waitForStatusText(status, "Showing demo itinerary");

        const unlockedFixture = {
            ...demoFixture,
            title: "Private Itinerary",
        };
        fetchMock.mockResolvedValueOnce({
            ok: true,
            json: async () => unlockedFixture,
        });

        unlockInput.value = "correct-password";
        unlockButton.click();
        await flushBootstrap();

        expect(refreshButton.hidden).toBe(true);
        expect(status.hidden).toBe(true);

        devModeButton.click();

        expect(refreshButton.hidden).toBe(false);
    });
});
