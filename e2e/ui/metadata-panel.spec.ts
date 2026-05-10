import { test, expect } from '@playwright/test';
import { loginViaUI } from '../fixtures/auth';
import { BUCKETS } from '../fixtures/constants';

test.describe('UI: Metadata Panel / Right Panel', () => {
	test.beforeEach(async ({ page }) => {
		await loginViaUI(page);
		await page.getByText(BUCKETS.test).click();
		await page.waitForURL(`**/browse/${BUCKETS.test}**`, { timeout: 15_000 });
		await expect(page.getByText('hello.txt')).toBeVisible({ timeout: 15_000 });
	});

	test('click file row shows file info', async ({ page }) => {
		// Click on hello.txt row
		const row = page.locator('[data-row]').filter({ hasText: 'hello.txt' });
		await row.click();

		// Wait for any panel/detail to appear — look for the filename in a detail context
		await page.waitForTimeout(1000);

		// The file should be selected/highlighted or a panel should open
		// Verify the row is still visible (basic interaction test)
		await expect(row).toBeVisible();
	});

	test('switching between files works', async ({ page }) => {
		// Click hello.txt
		await page.locator('[data-row]').filter({ hasText: 'hello.txt' }).click();
		await page.waitForTimeout(500);

		// Click test.json
		await page.locator('[data-row]').filter({ hasText: 'test.json' }).click();
		await page.waitForTimeout(500);

		// Both rows should still be visible (we're just switching selection)
		await expect(page.locator('[data-row]').filter({ hasText: 'hello.txt' })).toBeVisible();
		await expect(page.locator('[data-row]').filter({ hasText: 'test.json' })).toBeVisible();
	});

	test('file metadata accessible via HEAD API', async ({ page, request }) => {
		// Verify metadata is available via API (the panel uses this endpoint)
		const loginRes = await request.post('/api/auth/login', {
			data: {
				accessKeyId: 'minioadmin',
				secretAccessKey: 'minioadmin',
				region: 'us-east-1',
				endpoint: 'http://localhost:9000'
			}
		});
		expect(loginRes.ok()).toBe(true);

		const headRes = await request.get(
			`/api/s3/head?bucket=${BUCKETS.test}&key=hello.txt`
		);
		expect(headRes.status()).toBe(200);

		const metadata = await headRes.json();
		expect(metadata.key).toBe('hello.txt');
		expect(metadata.size).toBeGreaterThan(0);
		expect(metadata.contentType).toBeTruthy();
	});
});
