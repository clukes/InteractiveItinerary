// @ts-check
/**
 * Extended E2E tests for Interactive Trip Itinerary
 *
 * Supplements mobile-trip-flow.spec.cjs with additional coverage:
 *   - Keyboard navigation between tabs
 *   - Map marker numbering and route lines
 *   - Activities missing map data ("No map" badge)
 *   - Toggling status back to pending
 *   - Activity ordering verification
 *   - ARIA accessibility checks
 *   - Visual screenshots for manual review
 *   - File reload clears previous state
 */
const { test, expect } = require("@playwright/test");
const path = require("path");

const VALID_FIXTURE = path.resolve(
    __dirname,
    "../fixtures/valid-itinerary.json",
);
const INVALID_FIXTURE = path.resolve(
    __dirname,
    "../fixtures/invalid-itinerary-missing-fields.json",
);

async function getSelectedDayActivities(page) {
    return page.evaluate(() => {
        const state = window.__itineraryState;
        const itinerary = state?.itinerary;
        if (!itinerary || !Array.isArray(itinerary.days)) return [];

        const day =
            itinerary.days.find((d) => d.dayId === state.selectedDayId) ||
            itinerary.days[0];

        return [...(day?.activities || [])]
            .sort((a, b) => a.order - b.order)
            .map((activity) => ({
                name: activity.name,
                order: activity.order,
            }));
    });
}

// ─── Keyboard Navigation ───────────────────────────────────────────────────────

test.describe("Keyboard Tab Navigation", () => {
    test.beforeEach(async ({ page }) => {
        await page.goto("/");
        await page.waitForSelector('[role="tab"]');
    });

    test("ArrowRight moves selection to next day tab", async ({ page }) => {
        const day1Tab = page.locator('[role="tab"]').first();
        await day1Tab.focus();
        await page.keyboard.press("ArrowRight");

        const day2Tab = page.locator('[role="tab"]').nth(1);
        await expect(day2Tab).toHaveAttribute("aria-selected", "true");
    });

    test("ArrowLeft moves selection to previous day tab", async ({ page }) => {
        // Start on Day 2
        const day2Tab = page.locator('[role="tab"]').nth(1);
        await day2Tab.click();
        await day2Tab.focus();
        await page.keyboard.press("ArrowLeft");

        await expect(page.locator('[role="tab"]').first()).toHaveAttribute(
            "aria-selected",
            "true",
        );
    });

    test("Home key jumps to first tab", async ({ page }) => {
        // Start on Day 3
        const day3Tab = page.locator('[role="tab"]').nth(2);
        await day3Tab.click();
        await day3Tab.focus();
        await page.keyboard.press("Home");

        await expect(page.locator('[role="tab"]').first()).toHaveAttribute(
            "aria-selected",
            "true",
        );
    });

    test("End key jumps to last tab", async ({ page }) => {
        const day1Tab = page.locator('[role="tab"]').first();
        await day1Tab.focus();
        await page.keyboard.press("End");

        await expect(page.locator('[role="tab"]').last()).toHaveAttribute(
            "aria-selected",
            "true",
        );
    });

    test("ArrowRight wraps from last to first tab", async ({ page }) => {
        const lastTab = page.locator('[role="tab"]').last();
        await lastTab.click();
        await lastTab.focus();
        await page.keyboard.press("ArrowRight");

        await expect(page.locator('[role="tab"]').first()).toHaveAttribute(
            "aria-selected",
            "true",
        );
    });
});

// ─── Map Details ────────────────────────────────────────────────────────────────

test.describe("Map Markers and Route", () => {
    test.beforeEach(async ({ page }) => {
        await page.goto("/");
        await page.waitForSelector(".map-container svg");
    });

    async function getExpectedMapDayData(page) {
        return page.evaluate(() => {
            const state = window.__itineraryState;
            const itinerary = state?.itinerary;
            if (!itinerary || !Array.isArray(itinerary.days)) {
                return {
                    mappedCount: 0,
                    routeCount: 0,
                    markerNumbers: [],
                    mappedNames: [],
                };
            }

            const day =
                itinerary.days.find((d) => d.dayId === state.selectedDayId) ||
                itinerary.days[0];

            const sortedActivities = [...(day?.activities || [])].sort(
                (a, b) => a.order - b.order,
            );
            const mapValidActivities = sortedActivities.filter(
                (a) =>
                    a.location &&
                    typeof a.location.lat === "number" &&
                    typeof a.location.lng === "number",
            );

            return {
                mappedCount: mapValidActivities.length,
                routeCount: Math.max(0, mapValidActivities.length - 1),
                markerNumbers: mapValidActivities.map((_, i) => String(i + 1)),
                mappedNames: mapValidActivities.map((a) => a.name),
            };
        });
    }

    test("map has correct number of markers and route lines for Day 1", async ({
        page,
    }) => {
        const expected = await getExpectedMapDayData(page);

        const markers = page.locator(".map-marker");
        await expect(markers).toHaveCount(expected.mappedCount);

        const routeLines = page.locator(".route-line");
        await expect(routeLines).toHaveCount(expected.routeCount);
    });

    test("markers display sequential numbers", async ({ page }) => {
        const expected = await getExpectedMapDayData(page);
        const texts = page.locator(".map-marker text");
        await expect(texts).toHaveText(expected.markerNumbers);
    });

    test("map legend shows activity names", async ({ page }) => {
        const expected = await getExpectedMapDayData(page);
        const legend = page.locator(".map-legend");
        for (const activityName of expected.mappedNames) {
            await expect(legend).toContainText(activityName);
        }
    });

    test("map markers have keyboard access (tabindex and aria-label)", async ({
        page,
    }) => {
        const markers = page.locator(".map-marker");
        const count = await markers.count();
        for (let i = 0; i < count; i++) {
            await expect(markers.nth(i)).toHaveAttribute("tabindex", "0");
            await expect(markers.nth(i)).toHaveAttribute("aria-label", /.+/);
        }
    });
});

// ─── Activities Missing Map Data ────────────────────────────────────────────────

test.describe("Activities without map coordinates", () => {
    test('"No map" badge shown for activity lacking lat/lng', async ({
        page,
    }) => {
        await page.goto("/");
        // Load the Paris fixture which has Seine River Walk without lat/lng
        const fileInput = page.locator("#file-input");
        await fileInput.setInputFiles(VALID_FIXTURE);

        const seineCard = page.locator(".activity-card", {
            hasText: "Seine River Walk",
        });
        await expect(seineCard).toBeVisible();
        await expect(seineCard.locator(".map-badge")).toContainText("No map");
    });

    test("map legend marks activities without map data", async ({ page }) => {
        await page.goto("/");
        const fileInput = page.locator("#file-input");
        await fileInput.setInputFiles(VALID_FIXTURE);

        const legend = page.locator(".map-legend");
        await expect(legend).toContainText("Map unavailable");
        await expect(legend).toContainText("Seine River Walk");
    });
});

// ─── Status Toggle to Pending ───────────────────────────────────────────────────

test.describe("Status Toggle Reset", () => {
    test.beforeEach(async ({ page }) => {
        await page.goto("/");
        await page.waitForSelector(".activity-card");
    });

    test("clicking done twice reverts status to pending", async ({ page }) => {
        const doneBtn = page.locator(".btn-done").first();
        await doneBtn.click();
        await expect(page.locator(".activity-card").first()).toHaveAttribute(
            "data-status",
            "done",
        );

        await doneBtn.click();
        await expect(page.locator(".activity-card").first()).toHaveAttribute(
            "data-status",
            "pending",
        );
    });

    test("clicking skipped twice reverts status to pending", async ({
        page,
    }) => {
        const skipBtn = page.locator(".btn-skipped").first();
        await skipBtn.click();
        await expect(page.locator(".activity-card").first()).toHaveAttribute(
            "data-status",
            "skipped",
        );

        await skipBtn.click();
        await expect(page.locator(".activity-card").first()).toHaveAttribute(
            "data-status",
            "pending",
        );
    });
});

// ─── Activity Ordering ─────────────────────────────────────────────────────────

test.describe("Activity Ordering", () => {
    test("activities are displayed in correct order on Day 1", async ({
        page,
    }) => {
        await page.goto("/");
        const expectedActivities = await getSelectedDayActivities(page);
        const names = page.locator(".activity-name");
        await expect(names).toHaveCount(expectedActivities.length);
        await expect(names).toHaveText(
            expectedActivities.map((activity) => activity.name),
        );
    });

    test("activity order badges show correct numbers", async ({ page }) => {
        await page.goto("/");
        const expectedActivities = await getSelectedDayActivities(page);
        const orderBadges = page.locator(".activity-order");
        await expect(orderBadges).toHaveCount(expectedActivities.length);
        await expect(orderBadges).toHaveText(
            expectedActivities.map((activity) => String(activity.order)),
        );
    });
});

// ─── Null/Missing Fields in Details ─────────────────────────────────────────────

test.describe("Activity Details — Optional Fields", () => {
    test('null price shows "Not provided"', async ({ page }) => {
        await page.goto("/");
        await page.locator("#file-input").setInputFiles(VALID_FIXTURE);
        const card = page.locator(".activity-card", {
            hasText: "Seine River Walk",
        });
        await expect(card).toBeVisible();
        await card.locator(".activity-header").click();

        const priceSection = card.locator(".detail-section", {
            hasText: "Price",
        });
        await expect(priceSection.locator(".not-provided")).toBeVisible();
    });

    test('null website shows "Not provided"', async ({ page }) => {
        await page.goto("/");
        await page.locator("#file-input").setInputFiles(VALID_FIXTURE);
        const card = page.locator(".activity-card", {
            hasText: "Seine River Walk",
        });
        await expect(card).toBeVisible();
        await card.locator(".activity-header").click();

        const websiteSection = card.locator(".detail-section", {
            hasText: "Website",
        });
        await expect(websiteSection.locator(".not-provided")).toBeVisible();
    });

    test('empty reviewLinks shows "No reviews available"', async ({ page }) => {
        await page.goto("/");
        await page.locator("#file-input").setInputFiles(VALID_FIXTURE);
        const card = page.locator(".activity-card", {
            hasText: "Seine River Walk",
        });
        await expect(card).toBeVisible();
        await card.locator(".activity-header").click();

        await expect(card.locator(".activity-details")).toContainText(
            "No reviews available",
        );
    });
});

// ─── ARIA Accessibility ─────────────────────────────────────────────────────────

test.describe("ARIA Accessibility", () => {
    test.beforeEach(async ({ page }) => {
        await page.goto("/");
        await page.waitForSelector('[role="tab"]');
    });

    test("tablist has correct aria-label", async ({ page }) => {
        const nav = page.locator('nav[aria-label="Trip days"]');
        await expect(nav).toBeVisible();
    });

    test("day tabs have aria-controls pointing to content", async ({
        page,
    }) => {
        const tabs = page.locator('[role="tab"]');
        const count = await tabs.count();
        for (let i = 0; i < count; i++) {
            await expect(tabs.nth(i)).toHaveAttribute(
                "aria-controls",
                "day-content",
            );
        }
    });

    test("activity header buttons have aria-expanded", async ({ page }) => {
        const headers = page.locator(".activity-header");
        const count = await headers.count();
        for (let i = 0; i < count; i++) {
            await expect(headers.nth(i)).toHaveAttribute(
                "aria-expanded",
                "false",
            );
        }
    });

    test("done/skip buttons have aria-pressed", async ({ page }) => {
        const doneBtns = page.locator(".btn-done");
        const count = await doneBtns.count();
        for (let i = 0; i < count; i++) {
            await expect(doneBtns.nth(i)).toHaveAttribute(
                "aria-pressed",
                "false",
            );
        }

        const skipBtns = page.locator(".btn-skipped");
        const skipCount = await skipBtns.count();
        for (let i = 0; i < skipCount; i++) {
            await expect(skipBtns.nth(i)).toHaveAttribute(
                "aria-pressed",
                "false",
            );
        }
    });

    test("status button aria-label includes activity name", async ({
        page,
    }) => {
        const expectedActivities = await getSelectedDayActivities(page);
        const doneBtn = page.locator(".btn-done").first();
        const ariaLabel = await doneBtn.getAttribute("aria-label");
        expect(expectedActivities.length).toBeGreaterThan(0);
        expect(ariaLabel).toContain(expectedActivities[0].name);
    });

    test('map SVG has role="img" and descriptive aria-label', async ({
        page,
    }) => {
        const svg = page.locator(".map-container svg");
        await expect(svg).toHaveAttribute("role", "img");
        await expect(svg).toHaveAttribute("aria-label", /Route map/);
    });

    test('file status area has aria-live="polite"', async ({ page }) => {
        await expect(page.locator("#file-status")).toHaveAttribute(
            "aria-live",
            "polite",
        );
    });

    test('validation error area has role="alert"', async ({ page }) => {
        await expect(page.locator("#validation-errors")).toHaveAttribute(
            "role",
            "alert",
        );
    });
});

// ─── File Reload Clears State ───────────────────────────────────────────────────

test.describe("File Reload State Reset", () => {
    test("loading new file clears previous activity statuses", async ({
        page,
    }) => {
        await page.goto("/");

        // Mark an activity as done
        await page.locator(".btn-done").first().click();
        await expect(page.locator(".activity-card").first()).toHaveAttribute(
            "data-status",
            "done",
        );

        // Load new file
        const fileInput = page.locator("#file-input");
        await fileInput.setInputFiles(VALID_FIXTURE);

        await expect(page.locator("#app-title")).toContainText(
            "Test Trip to Paris",
        );
        const expectedActivities = await getSelectedDayActivities(page);

        // All new activities should be pending
        const cards = page.locator(".activity-card");
        await expect(cards).toHaveCount(expectedActivities.length);
        for (let i = 0; i < expectedActivities.length; i++) {
            await expect(cards.nth(i)).toHaveAttribute(
                "data-status",
                "pending",
            );
        }
    });

    test("valid file load hides previous validation errors", async ({
        page,
    }) => {
        await page.goto("/");

        // Load invalid file first
        const fileInput = page.locator("#file-input");
        await fileInput.setInputFiles(INVALID_FIXTURE);
        await expect(page.locator("#validation-errors")).toHaveClass(/visible/);

        // Now load valid file
        await fileInput.setInputFiles(VALID_FIXTURE);
        await expect(page.locator("#validation-errors")).not.toHaveClass(
            /visible/,
        );
    });
});

// ─── Visual Screenshots ────────────────────────────────────────────────────────

test.describe("Visual Verification Screenshots", () => {
    test("Day 1 default view", async ({ page }) => {
        await page.goto("/");
        await page.waitForLoadState("networkidle");
        await page.screenshot({
            path: "tests/e2e/screenshots/day1-default.png",
            fullPage: true,
        });
    });

    test("expanded activity details", async ({ page }) => {
        await page.goto("/");
        await page.locator(".activity-header").first().click();
        await page.screenshot({
            path: "tests/e2e/screenshots/activity-expanded.png",
            fullPage: true,
        });
    });

    test("Day 2 with done status applied", async ({ page }) => {
        await page.goto("/");
        await page.locator('[role="tab"]').nth(1).click();
        await page.locator(".btn-done").first().click();
        await page.screenshot({
            path: "tests/e2e/screenshots/day2-with-done.png",
            fullPage: true,
        });
    });

    test("Day 3 empty state", async ({ page }) => {
        await page.goto("/");
        await page.locator('[role="tab"]').last().click();
        await page.screenshot({
            path: "tests/e2e/screenshots/day3-empty.png",
            fullPage: true,
        });
    });

    test("Paris fixture loaded", async ({ page }) => {
        await page.goto("/");
        await page.locator("#file-input").setInputFiles(VALID_FIXTURE);
        await page.screenshot({
            path: "tests/e2e/screenshots/paris-loaded.png",
            fullPage: true,
        });
    });

    test("validation errors after invalid file", async ({ page }) => {
        await page.goto("/");
        await page.locator("#file-input").setInputFiles(INVALID_FIXTURE);
        await page.screenshot({
            path: "tests/e2e/screenshots/validation-errors.png",
            fullPage: true,
        });
    });
});
