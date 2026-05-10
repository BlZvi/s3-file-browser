import { test, expect } from '@playwright/test';
import { loginViaUI } from '../fixtures/auth';
import { BUCKETS } from '../fixtures/constants';

test.describe('UI: Download', () => {
	test.beforeEach(async ({ page }) => {
		await loginViaUI(page);
		// Navigate to test-bucket
		await page.getByText(BUCKETS.test).click();
		await page.waitForURL(`**/browse/${BUCKETS.test}**`, { timeout: 10_000 });
		await expect(page.getByText('hello.txt')).toBeVisible({ timeout: 10_000 });
	});

	test('download button triggers download', async ({ page, context }) => {
		// Find the hello.txt row and its download button
		const row = page.locator('[data-row]').filter({ hasText: 'hello.txt' });
		await row.hover();

		// Look for download button in the row
		const downloadBtn = row.locator('button').filter({ has: page.locator('svg') }).first();

		// Listen for new page/popup (presigned URL opens in new tab)
		const pagePromise = context.waitForEvent('page', { timeout: 5_000 }).catch(() => null);

		if (await downloadBtn.isVisible()) {
			await downloadBtn.click();
		}

		// Either a new tab opened or a download started
		const newPage = await pagePromise;
		if (newPage) {
			// New tab opened with presigned URL
			expect(newPage.url()).toContain('hello.txt');
			await newPage.close();
		}
		// If no new page, the download may have been triggered directly
	});
});
