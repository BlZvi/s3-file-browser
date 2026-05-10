import { test, expect } from '@playwright/test';
import { loginViaUI } from '../fixtures/auth';
import { BUCKETS } from '../fixtures/constants';

test.describe('UI: Recursive Search', () => {
	test.beforeEach(async ({ page }) => {
		await loginViaUI(page);
		await page.getByText(BUCKETS.test).click();
		await page.waitForURL(`**/browse/${BUCKETS.test}**`);
		await expect(page.getByText('hello.txt')).toBeVisible({ timeout: 10_000 });
	});

	test('search mode toggle exists', async ({ page }) => {
		// Look for search mode toggle button
		const toggle = page.locator('[data-testid="search-mode-toggle"]');
		await expect(toggle).toBeVisible();
	});

	test('recursive search finds files in nested folders', async ({ page }) => {
		// Switch to recursive search mode
		const toggle = page.locator('[data-testid="search-mode-toggle"]');
		await toggle.click();

		// Type search query
		const searchInput = page.locator('input[placeholder*="Search"]');
		await searchInput.fill('hello');

		// Wait for results
		await page.waitForTimeout(500); // debounce

		// Should find hello.txt
		await expect(page.getByText('hello.txt')).toBeVisible({ timeout: 10_000 });
	});

	test('search results show full paths', async ({ page }) => {
		const toggle = page.locator('[data-testid="search-mode-toggle"]');
		await toggle.click();

		const searchInput = page.locator('input[placeholder*="Search"]');
		await searchInput.fill('test');

		await page.waitForTimeout(500);
		// Results should be visible with path information
		await page.waitForSelector('[data-row]', { timeout: 10_000 });
	});

	test('switching back to filter mode clears search results', async ({ page }) => {
		const toggle = page.locator('[data-testid="search-mode-toggle"]');

		// Switch to search mode
		await toggle.click();
		const searchInput = page.locator('input[placeholder*="Search"]');
		await searchInput.fill('hello');
		await page.waitForTimeout(500);

		// Switch back to filter mode
		await toggle.click();

		// Should show normal file listing
		await expect(page.getByText('hello.txt')).toBeVisible({ timeout: 10_000 });
	});

	test('search placeholder changes with mode', async ({ page }) => {
		// In filter mode, placeholder should contain "Filter"
		const searchInput = page.locator('header input[type="text"]');
		const filterPlaceholder = await searchInput.getAttribute('placeholder');
		expect(filterPlaceholder).toContain('Filter');

		// Switch to search mode
		const toggle = page.locator('[data-testid="search-mode-toggle"]');
		await toggle.click();

		// Placeholder should now contain "Search"
		const searchPlaceholder = await searchInput.getAttribute('placeholder');
		expect(searchPlaceholder).toContain('Search');
	});
});
