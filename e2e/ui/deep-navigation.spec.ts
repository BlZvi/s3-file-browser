import { test, expect } from '@playwright/test';
import { loginViaUI } from '../fixtures/auth';
import { BUCKETS, BULK_BUCKET } from '../fixtures/constants';

test.describe('UI: 5-Level Deep Navigation', () => {
	test.setTimeout(60_000);

	test.beforeEach(async ({ page }) => {
		await loginViaUI(page);
	});

	test('navigate 5 levels deep via clicks', async ({ page }) => {
		// Start at bulk-bucket root
		await page.getByText(BUCKETS.bulk).click();
		await page.waitForURL(`**/browse/${BUCKETS.bulk}**`, { timeout: 10_000 });

		// Level 1
		await expect(page.locator('[data-row]').filter({ hasText: 'level1-01' })).toBeVisible({ timeout: 15_000 });
		await page.locator('[data-row]').filter({ hasText: 'level1-01' }).click();

		// Level 2
		await expect(page.locator('[data-row]').filter({ hasText: 'level2-1' })).toBeVisible({ timeout: 10_000 });
		await page.locator('[data-row]').filter({ hasText: 'level2-1' }).click();

		// Level 3
		await expect(page.locator('[data-row]').filter({ hasText: 'level3-1' })).toBeVisible({ timeout: 10_000 });
		await page.locator('[data-row]').filter({ hasText: 'level3-1' }).click();

		// Level 4
		await expect(page.locator('[data-row]').filter({ hasText: 'level4-1' })).toBeVisible({ timeout: 10_000 });
		await page.locator('[data-row]').filter({ hasText: 'level4-1' }).click();

		// Level 5 — leaf files
		await expect(page.locator('[data-row]').filter({ hasText: 'file-01.txt' })).toBeVisible({ timeout: 10_000 });

		// Verify URL reflects the full path
		expect(page.url()).toContain('level1-01/level2-1/level3-1/level4-1');
	});

	test('breadcrumb shows all levels when navigated deep', async ({ page }) => {
		// Navigate directly to a deep path
		await page.goto(`/browse/${BUCKETS.bulk}/level1-01/level2-1/level3-1/level4-1`);
		await expect(page.locator('[data-row]').first()).toBeVisible({ timeout: 15_000 });

		// Breadcrumb should contain path segments
		const breadcrumbs = page.locator('nav, [aria-label*="breadcrumb"], [class*="breadcrumb"]');
		await expect(breadcrumbs.getByText(BUCKETS.bulk).first()).toBeVisible();
		await expect(breadcrumbs.getByText('level1-01').first()).toBeVisible();
		await expect(breadcrumbs.getByText('level2-1').first()).toBeVisible();
		await expect(breadcrumbs.getByText('level3-1').first()).toBeVisible();
		await expect(breadcrumbs.getByText('level4-1').first()).toBeVisible();
	});

	test('click breadcrumb at level 2 navigates correctly', async ({ page }) => {
		// Navigate to deep path
		await page.goto(`/browse/${BUCKETS.bulk}/level1-01/level2-1/level3-1/level4-1`);
		await expect(page.locator('[data-row]').first()).toBeVisible({ timeout: 15_000 });

		// Click on level2-1 in breadcrumb
		const breadcrumbs = page.locator('nav, [aria-label*="breadcrumb"], [class*="breadcrumb"]');
		const level2Link = breadcrumbs.getByText('level2-1').first();
		if (await level2Link.isVisible()) {
			await level2Link.click();
			await page.waitForURL(`**/browse/${BUCKETS.bulk}/level1-01/level2-1**`, { timeout: 10_000 });

			// Should show level3 folders
			await expect(page.locator('[data-row]').filter({ hasText: 'level3-1' })).toBeVisible({ timeout: 10_000 });
		}
	});

	test('direct URL to deepest level works', async ({ page }) => {
		await page.goto(`/browse/${BUCKETS.bulk}/level1-05/level2-3/level3-2/level4-1`);

		// Should load the leaf files
		await expect(page.locator('[data-row]').filter({ hasText: 'file-01.txt' })).toBeVisible({ timeout: 15_000 });

		const fileRows = page.locator('[data-row]');
		const count = await fileRows.count();
		expect(count).toBe(BULK_BUCKET.filesPerLeaf);
	});
});
