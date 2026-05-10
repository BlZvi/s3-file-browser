import { test, expect } from '@playwright/test';
import { loginViaUI } from '../fixtures/auth';
import { BUCKETS, BULK_BUCKET } from '../fixtures/constants';

test.describe('UI: High Volume / Pagination (10,000+ objects)', () => {
	test.setTimeout(120_000); // 2 minutes for high-volume tests

	test.beforeEach(async ({ page }) => {
		await loginViaUI(page);
	});

	test('browse bulk-bucket shows top-level folder listing', async ({ page }) => {
		await page.getByText(BUCKETS.bulk).click();
		await page.waitForURL(`**/browse/${BUCKETS.bulk}**`, { timeout: 10_000 });

		// Should show level1 folder entries in the file table
		await expect(page.locator('[data-row]').filter({ hasText: 'level1-01' })).toBeVisible({ timeout: 15_000 });
		await expect(page.locator('[data-row]').filter({ hasText: 'level1-02' })).toBeVisible();

		// Should show all level1 folders
		const folderRows = page.locator('[data-row]');
		const count = await folderRows.count();
		expect(count).toBeGreaterThanOrEqual(BULK_BUCKET.level1Count);
	});

	test('navigate 5 levels deep into folder hierarchy', async ({ page }) => {
		await page.getByText(BUCKETS.bulk).click();
		await page.waitForURL(`**/browse/${BUCKETS.bulk}**`, { timeout: 10_000 });
		await expect(page.locator('[data-row]').filter({ hasText: 'level1-01' })).toBeVisible({ timeout: 15_000 });

		// Navigate level1 -> level2
		await page.locator('[data-row]').filter({ hasText: 'level1-01' }).click();
		await page.waitForURL(`**/browse/${BUCKETS.bulk}/level1-01**`, { timeout: 10_000 });
		await expect(page.locator('[data-row]').filter({ hasText: 'level2-1' })).toBeVisible({ timeout: 10_000 });

		// Navigate level2 -> level3
		await page.locator('[data-row]').filter({ hasText: 'level2-1' }).click();
		await page.waitForURL(`**/browse/${BUCKETS.bulk}/level1-01/level2-1**`, { timeout: 10_000 });
		await expect(page.locator('[data-row]').filter({ hasText: 'level3-1' })).toBeVisible({ timeout: 10_000 });

		// Navigate level3 -> level4
		await page.locator('[data-row]').filter({ hasText: 'level3-1' }).click();
		await page.waitForURL(`**/browse/${BUCKETS.bulk}/level1-01/level2-1/level3-1**`, { timeout: 10_000 });
		await expect(page.locator('[data-row]').filter({ hasText: 'level4-1' })).toBeVisible({ timeout: 10_000 });

		// Navigate level4 -> leaf files
		await page.locator('[data-row]').filter({ hasText: 'level4-1' }).click();
		await page.waitForURL(`**/browse/${BUCKETS.bulk}/level1-01/level2-1/level3-1/level4-1**`, { timeout: 10_000 });
		await expect(page.locator('[data-row]').filter({ hasText: 'file-01.txt' })).toBeVisible({ timeout: 10_000 });

		// Should have the expected number of leaf files
		const fileRows = page.locator('[data-row]');
		const count = await fileRows.count();
		expect(count).toBe(BULK_BUCKET.filesPerLeaf);
	});

	test('page loads within acceptable time', async ({ page }) => {
		const startTime = Date.now();

		await page.getByText(BUCKETS.bulk).click();
		await page.waitForURL(`**/browse/${BUCKETS.bulk}**`, { timeout: 10_000 });
		await expect(page.locator('[data-row]').filter({ hasText: 'level1-01' })).toBeVisible({ timeout: 15_000 });

		const loadTime = Date.now() - startTime;
		// Should load within 5 seconds
		expect(loadTime).toBeLessThan(5_000);
	});

	test('navigate across multiple level1 folders', async ({ page }) => {
		// Navigate to bulk-bucket root
		await page.goto(`/browse/${BUCKETS.bulk}`);
		await expect(page.locator('[data-row]').filter({ hasText: 'level1-01' })).toBeVisible({ timeout: 15_000 });

		// Navigate into level1-01 via direct URL
		await page.goto(`/browse/${BUCKETS.bulk}/level1-01`);
		await expect(page.locator('[data-row]').filter({ hasText: 'level2-1' })).toBeVisible({ timeout: 10_000 });

		// Navigate into level1-05 via direct URL
		await page.goto(`/browse/${BUCKETS.bulk}/level1-05`);
		await expect(page.locator('[data-row]').filter({ hasText: 'level2-1' })).toBeVisible({ timeout: 10_000 });

		// Navigate into level1-10 via direct URL
		await page.goto(`/browse/${BUCKETS.bulk}/level1-10`);
		await expect(page.locator('[data-row]').filter({ hasText: 'level2-1' })).toBeVisible({ timeout: 10_000 });

		// Go back to root and verify folders are still listed
		await page.goto(`/browse/${BUCKETS.bulk}`);
		await expect(page.locator('[data-row]').filter({ hasText: 'level1-01' })).toBeVisible({ timeout: 10_000 });
		await expect(page.locator('[data-row]').filter({ hasText: 'level1-10' })).toBeVisible({ timeout: 10_000 });
	});

	test('direct URL to 5-level deep path works', async ({ page }) => {
		// Navigate directly to the deepest level
		await page.goto(`/browse/${BUCKETS.bulk}/level1-01/level2-1/level3-1/level4-1`);
		await expect(page.locator('[data-row]').filter({ hasText: 'file-01.txt' })).toBeVisible({ timeout: 15_000 });

		const fileRows = page.locator('[data-row]');
		const count = await fileRows.count();
		expect(count).toBe(BULK_BUCKET.filesPerLeaf);
	});

	test('search within a deep folder works', async ({ page }) => {
		// Navigate directly to a leaf folder
		await page.goto(`/browse/${BUCKETS.bulk}/level1-01/level2-1/level3-1/level4-1`);
		await expect(page.locator('[data-row]').filter({ hasText: 'file-01.txt' })).toBeVisible({ timeout: 15_000 });

		// Search for a specific file
		const searchInput = page.locator('input[placeholder*="earch"]').first();
		await searchInput.fill('file-05');
		await page.waitForTimeout(500);

		// Should show only file-05.txt
		await expect(page.locator('[data-row]').filter({ hasText: 'file-05.txt' })).toBeVisible();

		const visibleRows = page.locator('[data-row]');
		const count = await visibleRows.count();
		expect(count).toBe(1);
	});

	test('scrolling through folder list is smooth', async ({ page }) => {
		await page.getByText(BUCKETS.bulk).click();
		await page.waitForURL(`**/browse/${BUCKETS.bulk}**`, { timeout: 10_000 });
		await expect(page.locator('[data-row]').filter({ hasText: 'level1-01' })).toBeVisible({ timeout: 15_000 });

		// Scroll to the last folder
		const lastFolder = page.locator('[data-row]').filter({ hasText: 'level1-10' });
		await lastFolder.scrollIntoViewIfNeeded();
		await expect(lastFolder).toBeVisible();

		// Scroll back to top
		const firstFolder = page.locator('[data-row]').filter({ hasText: 'level1-01' });
		await firstFolder.scrollIntoViewIfNeeded();
		await expect(firstFolder).toBeVisible();
	});

	test('breadcrumb shows all levels when navigated deep', async ({ page }) => {
		// Navigate to a deep path
		await page.goto(`/browse/${BUCKETS.bulk}/level1-01/level2-1/level3-1`);
		await expect(page.locator('[data-row]').first()).toBeVisible({ timeout: 15_000 });

		// Breadcrumb should contain the path segments
		const breadcrumbs = page.locator('nav, [aria-label*="breadcrumb"], [class*="breadcrumb"]');
		await expect(breadcrumbs.getByText('level1-01').first()).toBeVisible();
		await expect(breadcrumbs.getByText('level2-1').first()).toBeVisible();
		await expect(breadcrumbs.getByText('level3-1').first()).toBeVisible();
	});
});
