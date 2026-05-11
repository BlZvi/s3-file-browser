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

		// Count initial rows (should include test.json, hello.txt, folders)
		const initialRowCount = await page.locator('[data-row]').count();
		expect(initialRowCount).toBeGreaterThanOrEqual(2);

		// Search for something
		await searchInput.fill('hello');
		await page.waitForTimeout(500);

		// Verify filter is active (fewer rows visible)
		await expect(page.locator('[data-row]').filter({ hasText: 'hello.txt' })).toBeVisible({ timeout: 5_000 });
		const filteredCount = await page.locator('[data-row]').count();
		expect(filteredCount).toBeLessThan(initialRowCount);

		// Clear search using the clear button (aria-label="Clear search")
		const clearBtn = page.locator('button[aria-label="Clear search"]');
		await expect(clearBtn).toBeVisible({ timeout: 3_000 });
		await clearBtn.click();
		await page.waitForTimeout(1000);

		// All objects should be visible again — row count should match initial
		await expect(async () => {
			const restoredCount = await page.locator('[data-row]').count();
			expect(restoredCount).toBe(initialRowCount);
		}).toPass({ timeout: 10_000 });
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
