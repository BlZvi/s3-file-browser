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
		const searchInput = page.locator('input[placeholder*="search" i], input[placeholder*="filter" i], input[type="search"]').first();
		await searchInput.fill('hello');

		// Should show hello.txt but not test.json
		await expect(page.getByText('hello.txt')).toBeVisible();
		await expect(page.locator('[data-row]').filter({ hasText: 'test.json' })).not.toBeVisible();
	});

	test('clear search shows all objects', async ({ page }) => {
		const searchInput = page.locator('input[placeholder*="search" i], input[placeholder*="filter" i], input[type="search"]').first();

		// Search for something
		await searchInput.fill('hello');
		await page.waitForTimeout(300);

		// Clear search
		await searchInput.fill('');
		await page.waitForTimeout(300);

		// All objects should be visible again
		await expect(page.getByText('hello.txt')).toBeVisible();
		await expect(page.getByText('test.json')).toBeVisible();
	});

	test('search with no matches shows empty', async ({ page }) => {
		const searchInput = page.locator('input[placeholder*="search" i], input[placeholder*="filter" i], input[type="search"]').first();
		await searchInput.fill('nonexistent-file-xyz-12345');

		// Wait for filter to apply
		await page.waitForTimeout(300);

		// No data rows should be visible
		const visibleRows = page.locator('[data-row]');
		await expect(visibleRows).toHaveCount(0);
	});
});
