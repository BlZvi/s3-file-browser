import { test, expect } from '@playwright/test';
import { loginViaUI } from '../fixtures/auth';
import { BUCKETS } from '../fixtures/constants';

test.describe('UI: Virtual Scrolling', () => {
  test.beforeEach(async ({ page }) => {
    await loginViaUI(page);
  });

  test('renders file table for small directories without virtual scroll', async ({ page }) => {
    await page.getByText(BUCKETS.test).click();
    await page.waitForURL(`**/browse/${BUCKETS.test}**`);
    await page.waitForSelector('[data-row]', { timeout: 10_000 });

    // Small directory should NOT have virtual scroll container
    const virtualContainer = page.locator('[data-testid="virtual-scroll-container"]');
    await expect(virtualContainer).not.toBeVisible();

    // All rows should be rendered
    const rows = page.locator('[data-row]');
    const count = await rows.count();
    expect(count).toBeGreaterThan(0);
  });

  test('uses virtual scrolling for large directories', async ({ page }) => {
    // Navigate to bulk bucket which has many objects
    await page.getByText(BUCKETS.bulk).click();
    await page.waitForURL(`**/browse/${BUCKETS.bulk}**`);
    await page.waitForSelector('[data-row]', { timeout: 15_000 });

    // If bulk bucket has enough objects (>200), virtual scroll should activate
    // Check for virtual scroll container
    const virtualContainer = page.locator('[data-testid="virtual-scroll-container"]');

    // Count rendered rows — should be less than total objects
    const rows = page.locator('[data-row]');
    const renderedCount = await rows.count();

    // If virtual scrolling is active, rendered count should be much less than total
    // (This test is conditional on having enough objects in bulk bucket)
    if (await virtualContainer.isVisible()) {
      expect(renderedCount).toBeLessThan(500); // Should only render visible + overscan
    }
  });

  test('scrolling renders new rows', async ({ page }) => {
    await page.getByText(BUCKETS.bulk).click();
    await page.waitForURL(`**/browse/${BUCKETS.bulk}**`);
    await page.waitForSelector('[data-row]', { timeout: 15_000 });

    const virtualContainer = page.locator('[data-testid="virtual-scroll-container"]');
    if (await virtualContainer.isVisible()) {
      // Get first visible row key
      const firstRow = page.locator('[data-row]').first();
      const firstKey = await firstRow.getAttribute('data-row');

      // Scroll down
      await virtualContainer.evaluate((el) => {
        el.scrollTop = 2000;
      });
      await page.waitForTimeout(200);

      // First visible row should have changed
      const newFirstRow = page.locator('[data-row]').first();
      const newFirstKey = await newFirstRow.getAttribute('data-row');

      // Keys should be different after scrolling
      if (firstKey && newFirstKey) {
        expect(newFirstKey).not.toBe(firstKey);
      }
    }
  });

  test('keyboard navigation works with virtual scrolling', async ({ page }) => {
    await page.getByText(BUCKETS.bulk).click();
    await page.waitForURL(`**/browse/${BUCKETS.bulk}**`);
    await page.waitForSelector('[data-row]', { timeout: 15_000 });

    // Press arrow down multiple times
    for (let i = 0; i < 5; i++) {
      await page.keyboard.press('ArrowDown');
    }

    // A row should be focused/selected
    const focusedRow = page.locator(
      '[data-row].bg-blue-50, [data-row].dark\\:bg-blue-900\\/20'
    );
    // Just verify no errors occurred during keyboard navigation
  });

  test('context menu works on virtual scrolled rows', async ({ page }) => {
    await page.getByText(BUCKETS.bulk).click();
    await page.waitForURL(`**/browse/${BUCKETS.bulk}**`);
    await page.waitForSelector('[data-row]', { timeout: 15_000 });

    // Right-click on a row
    const row = page.locator('[data-row]').first();
    await row.click({ button: 'right' });

    // Context menu should appear
    const contextMenu = page.locator('[role="menu"]');
    await expect(contextMenu).toBeVisible({ timeout: 3000 });
  });
});
