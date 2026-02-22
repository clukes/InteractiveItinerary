/**
 * T019 + T034: Playwright mobile E2E tests
 * Tests: map link opening, file upload and UI refresh, mobile trip flow
 */
const { test, expect } = require('@playwright/test');
const path = require('path');

test.describe('Mobile Trip Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Wait for default itinerary to load
    await page.waitForSelector('[role="tab"]');
  });

  test('loads default itinerary with day tabs', async ({ page }) => {
    const tabs = await page.locator('[role="tab"]').all();
    expect(tabs.length).toBeGreaterThanOrEqual(2);

    // First tab should be selected
    const firstTab = page.locator('[role="tab"]').first();
    await expect(firstTab).toHaveAttribute('aria-selected', 'true');
  });

  test('switching day tabs updates content', async ({ page }) => {
    const secondTab = page.locator('[role="tab"]').nth(1);
    await secondTab.click();
    await expect(secondTab).toHaveAttribute('aria-selected', 'true');

    // First tab should no longer be selected
    const firstTab = page.locator('[role="tab"]').first();
    await expect(firstTab).toHaveAttribute('aria-selected', 'false');
  });

  test('empty day shows empty state message', async ({ page }) => {
    // Click the last tab (Day 3 - empty in default itinerary)
    const lastTab = page.locator('[role="tab"]').last();
    await lastTab.click();

    await expect(page.locator('.empty-state')).toBeVisible();
    await expect(page.locator('.empty-state')).toContainText('No activities planned');
  });

  test('activity card can be expanded and collapsed', async ({ page }) => {
    const firstHeader = page.locator('.activity-header').first();
    await firstHeader.click();

    // Details should be visible
    const firstCard = page.locator('.activity-card').first();
    await expect(firstCard).toHaveAttribute('data-expanded', 'true');

    // Click again to collapse
    await firstHeader.click();
    await expect(firstCard).toHaveAttribute('data-expanded', 'false');
  });

  test('marking activity as done updates status', async ({ page }) => {
    const doneBtn = page.locator('.btn-done').first();
    await doneBtn.click();

    const firstCard = page.locator('.activity-card').first();
    await expect(firstCard).toHaveAttribute('data-status', 'done');
  });

  test('marking activity as skipped updates status', async ({ page }) => {
    const skipBtn = page.locator('.btn-skipped').first();
    await skipBtn.click();

    const firstCard = page.locator('.activity-card').first();
    await expect(firstCard).toHaveAttribute('data-status', 'skipped');
  });

  test('status is mutually exclusive — done then skipped', async ({ page }) => {
    const doneBtn = page.locator('.btn-done').first();
    const skipBtn = page.locator('.btn-skipped').first();

    await doneBtn.click();
    const firstCard = page.locator('.activity-card').first();
    await expect(firstCard).toHaveAttribute('data-status', 'done');

    await skipBtn.click();
    await expect(firstCard).toHaveAttribute('data-status', 'skipped');
  });

  test('expanded activity auto-collapses on status change', async ({ page }) => {
    // Expand first activity
    await page.locator('.activity-header').first().click();
    const firstCard = page.locator('.activity-card').first();
    await expect(firstCard).toHaveAttribute('data-expanded', 'true');

    // Mark done — should auto-collapse
    await page.locator('.btn-done').first().click();
    await expect(firstCard).toHaveAttribute('data-expanded', 'false');
  });

  test('map marker opens Google Maps URL (T019)', async ({ page, context }) => {
    const pagePromise = context.waitForEvent('page');
    const marker = page.locator('.map-marker').first();
    await marker.click();

    const newPage = await pagePromise;
    expect(newPage.url()).toContain('maps.google.com');
    await newPage.close();
  });

  test('activity statuses persist across day switches', async ({ page }) => {
    // Mark first activity as done on day 1
    await page.locator('.btn-done').first().click();
    const firstCard = page.locator('.activity-card').first();
    await expect(firstCard).toHaveAttribute('data-status', 'done');

    // Switch to day 2
    await page.locator('[role="tab"]').nth(1).click();
    // Switch back to day 1
    await page.locator('[role="tab"]').first().click();

    // Status should persist
    await expect(page.locator('.activity-card').first()).toHaveAttribute('data-status', 'done');
  });

  test('file upload with valid file updates UI (T034)', async ({ page }) => {
    const fileInput = page.locator('#file-input');
    const fixturePath = path.resolve(__dirname, '../fixtures/valid-itinerary.json');
    await fileInput.setInputFiles(fixturePath);

    // Wait for title to update
    await expect(page.locator('#app-title')).toContainText('Test Trip to Paris');

    // Tabs should update
    const tabs = await page.locator('[role="tab"]').all();
    expect(tabs.length).toBe(3);
  });

  test('file upload with invalid file shows errors without replacing content (T034)', async ({ page }) => {
    // First note the current title
    const titleBefore = await page.locator('#app-title').textContent();

    const fileInput = page.locator('#file-input');
    const fixturePath = path.resolve(__dirname, '../fixtures/invalid-itinerary-missing-fields.json');
    await fileInput.setInputFiles(fixturePath);

    // Validation errors should appear
    await expect(page.locator('#validation-errors')).toBeVisible();
    const errorItems = await page.locator('#validation-error-list li').all();
    expect(errorItems.length).toBeGreaterThan(0);

    // Title should NOT have changed
    await expect(page.locator('#app-title')).toContainText(titleBefore);
  });

  test('page has no horizontal scroll at 360px width', async ({ page }) => {
    const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
    const viewportWidth = await page.evaluate(() => window.innerWidth);
    expect(bodyWidth).toBeLessThanOrEqual(viewportWidth + 1); // allow 1px rounding
  });

  test('expanded details show all required fields', async ({ page }) => {
    await page.locator('.activity-header').first().click();

    // Check all detail labels are present
    const labels = await page.locator('.detail-label').allTextContents();
    const lowerLabels = labels.map(l => l.toLowerCase());

    expect(lowerLabels).toContain('description');
    expect(lowerLabels).toContain('location');
    expect(lowerLabels).toContain('price');
    expect(lowerLabels).toContain('tips');
    expect(lowerLabels).toContain('photo spot tips');
    expect(lowerLabels).toContain('rating');
    expect(lowerLabels).toContain('reviews');
    expect(lowerLabels).toContain('website');
  });
});
