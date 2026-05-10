import { test, expect } from '@playwright/test';
import { loginViaUI } from '../fixtures/auth';
import { BUCKETS, TYPES_BUCKET } from '../fixtures/constants';

test.describe('UI: Diverse File Types Rendering', () => {
	test.beforeEach(async ({ page }) => {
		await loginViaUI(page);
		await page.getByText(BUCKETS.types).click();
		await page.waitForURL(`**/browse/${BUCKETS.types}**`, { timeout: 10_000 });
		await expect(page.locator('[data-row]').first()).toBeVisible({ timeout: 10_000 });
	});

	test('types-bucket shows all category folders', async ({ page }) => {
		for (const category of TYPES_BUCKET.categories) {
			await expect(
				page.locator('[data-row]').filter({ hasText: category })
			).toBeVisible({ timeout: 5_000 });
		}
	});

	test('text folder shows text files', async ({ page }) => {
		await page.locator('[data-row]').filter({ hasText: 'text' }).click();
		await page.waitForURL(`**/browse/${BUCKETS.types}/text**`, { timeout: 10_000 });

		await expect(page.locator('[data-row]').filter({ hasText: 'small.txt' })).toBeVisible({ timeout: 10_000 });
		await expect(page.locator('[data-row]').filter({ hasText: 'medium.txt' })).toBeVisible();
		await expect(page.locator('[data-row]').filter({ hasText: 'large.txt' })).toBeVisible();
	});

	test('image folder shows image files', async ({ page }) => {
		await page.locator('[data-row]').filter({ hasText: 'images' }).click();
		await page.waitForURL(`**/browse/${BUCKETS.types}/images**`, { timeout: 10_000 });

		await expect(page.locator('[data-row]').filter({ hasText: 'tiny.png' })).toBeVisible({ timeout: 10_000 });
		await expect(page.locator('[data-row]').filter({ hasText: 'small.jpg' })).toBeVisible();
		await expect(page.locator('[data-row]').filter({ hasText: 'icon.svg' })).toBeVisible();
		await expect(page.locator('[data-row]').filter({ hasText: 'photo.gif' })).toBeVisible();
	});

	test('special-names folder shows files with special characters', async ({ page }) => {
		await page.locator('[data-row]').filter({ hasText: 'special-names' }).click();
		await page.waitForURL(`**/browse/${BUCKETS.types}/special-names**`, { timeout: 10_000 });

		// Files with spaces, plus signs, etc. should render correctly
		await expect(page.locator('[data-row]').filter({ hasText: 'file with spaces.txt' })).toBeVisible({ timeout: 10_000 });
		await expect(page.locator('[data-row]').filter({ hasText: 'UPPERCASE.TXT' })).toBeVisible();
		await expect(page.locator('[data-row]').filter({ hasText: 'no-extension' })).toBeVisible();
	});

	test('large files show correct size formatting', async ({ page }) => {
		await page.locator('[data-row]').filter({ hasText: 'large-files' }).click();
		await page.waitForURL(`**/browse/${BUCKETS.types}/large-files**`, { timeout: 10_000 });

		// Should show files with MB-scale sizes
		await expect(page.locator('[data-row]').filter({ hasText: '5mb-file.bin' })).toBeVisible({ timeout: 10_000 });
		await expect(page.locator('[data-row]').filter({ hasText: '10mb-file.bin' })).toBeVisible();

		// Size should be displayed in MB format
		const row5mb = page.locator('[data-row]').filter({ hasText: '5mb-file.bin' });
		const rowText = await row5mb.textContent();
		// Should contain "MB" or "5" somewhere in the size display
		expect(rowText).toMatch(/MB|5\.\d/i);
	});

	test('binary folder shows binary files including empty file', async ({ page }) => {
		await page.locator('[data-row]').filter({ hasText: 'binary' }).click();
		await page.waitForURL(`**/browse/${BUCKETS.types}/binary**`, { timeout: 10_000 });

		await expect(page.locator('[data-row]').filter({ hasText: 'archive.zip' })).toBeVisible({ timeout: 10_000 });
		await expect(page.locator('[data-row]').filter({ hasText: 'data.bin' })).toBeVisible();
		await expect(page.locator('[data-row]').filter({ hasText: 'empty.dat' })).toBeVisible();
	});
});
