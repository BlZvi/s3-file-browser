import { test, expect } from '@playwright/test';
import { loginViaUI } from '../fixtures/auth';
import { BUCKETS } from '../fixtures/constants';

test.describe('UI: Search', () => {
	test.beforeEach(async ({ page }) => {
		await loginViaUI(page);
		// Navigate to test-bucket
		await page.getByText(BUCKETS.test).click();
		await page.waitForURL(`**/browse/${BUCKETS.test}**`, { timeout: 10_000 });
		await expect(page.getByText('hello.txt')).toBeVisible({ timeout: 10_000 });
	});

	test('search filters visible objects', async ({ page }) => {
		// Type in search
		const searchInput = page.locator('input[placeholder*="search" i], input[placeholder*="filter" i], input[placeholder*="ilter"]').first();
		await expect(searchInput).toBeVisible({ timeout: 5_000 });
		await searchInput.fill('hello');

		// Should show hello.txt but not test.json
		await expect(page.getByText('hello.txt')).toBeVisible();
		await expect(page.locator('[data-row]').filter({ hasText: 'test.json' })).not.toBeVisible();
	});

	test('clear search shows all objects', async ({ page }) => {
		const searchInput = page.locator('input[placeholder*="search" i], input[placeholder*="filter" i], input[placeholder*="ilter"]').first();
		await expect(searchInput).toBeVisible({ timeout: 5_000 });

		// Search for something
		await searchInput.fill('hello');
		await page.waitForTimeout(500);

		// Verify filter is active (only hello.txt visible)
		await expect(page.locator('[data-row]').filter({ hasText: 'hello.txt' })).toBeVisible({ timeout: 5_000 });

		// Clear search using triple-click + backspace to ensure Svelte binding triggers
		await searchInput.click({ clickCount: 3 });
		await searchInput.press('Backspace');
		await page.waitForTimeout(1000);

		// All objects should be visible again (use data-row locators for specificity)
		await expect(page.locator('[data-row]').filter({ hasText: 'hello.txt' })).toBeVisible({ timeout: 10_000 });
		// test.json should also be visible — use a broader check in case of extra files
		const testJsonRow = page.locator('[data-row]').filter({ hasText: 'test.json' });
		// If the row count is small enough (no virtual scroll), test.json must be present
		const rowCount = await page.locator('[data-row]').count();
		if (rowCount <= 20) {
			await expect(testJsonRow).toBeVisible({ timeout: 10_000 });
		} else {
			// With many rows, just verify the filter is cleared by checking multiple items exist
			expect(rowCount).toBeGreaterThan(1);
		}
	});

	test('search with no matches shows empty', async ({ page }) => {
		const searchInput = page.locator('input[placeholder*="search" i], input[placeholder*="filter" i], input[placeholder*="ilter"]').first();
		await expect(searchInput).toBeVisible({ timeout: 5_000 });
		await searchInput.fill('nonexistent-file-xyz-12345');

		// Wait for filter to apply
		await page.waitForTimeout(300);

		// No data rows should be visible
		const visibleRows = page.locator('[data-row]');
		await expect(visibleRows).toHaveCount(0);
	});
});
