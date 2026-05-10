import { test, expect } from '@playwright/test';
import { loginViaUI } from '../fixtures/auth';
import { BUCKETS, MINIO } from '../fixtures/constants';

test.describe('UI: Bucket Management', () => {
	test.beforeEach(async ({ page }) => {
		await loginViaUI(page);
	});

	test('bucket sidebar lists all seeded buckets', async ({ page }) => {
		await expect(page.getByText(BUCKETS.test)).toBeVisible({ timeout: 10_000 });
		await expect(page.getByText(BUCKETS.bulk)).toBeVisible();
		await expect(page.getByText(BUCKETS.types)).toBeVisible();
		await expect(page.getByText(BUCKETS.empty)).toBeVisible();
		await expect(page.getByText(BUCKETS.versioned)).toBeVisible();
	});

	test('create bucket via API and verify in sidebar', async ({ page, request }) => {
		const bucketName = `e2e-ui-bucket-${Date.now()}`;

		// Login via API
		await request.post('/api/auth/login', {
			data: {
				accessKeyId: MINIO.accessKeyId,
				secretAccessKey: MINIO.secretAccessKey,
				region: MINIO.region,
				endpoint: MINIO.endpoint
			}
		});

		// Create bucket via API
		const createRes = await request.post('/api/s3/buckets', {
			data: { name: bucketName }
		});
		expect(createRes.status()).toBe(200);

		// Reload page to see the new bucket
		await page.reload();
		await page.waitForTimeout(2000);

		// Verify bucket appears in sidebar
		await expect(page.getByText(bucketName)).toBeVisible({ timeout: 10_000 });

		// Cleanup
		await request.delete('/api/s3/buckets', {
			data: { name: bucketName }
		});
	});

	test('click bucket navigates to its contents', async ({ page }) => {
		await page.getByText(BUCKETS.test).click();
		await page.waitForURL(`**/browse/${BUCKETS.test}**`, { timeout: 10_000 });

		// Should show test-bucket contents
		await expect(page.getByText('hello.txt')).toBeVisible({ timeout: 10_000 });
	});

	test('empty bucket shows no files', async ({ page }) => {
		await page.getByText(BUCKETS.empty).click();
		await page.waitForURL(`**/browse/${BUCKETS.empty}**`, { timeout: 10_000 });

		await page.waitForTimeout(2000);
		const fileRows = page.locator('[data-row]');
		await expect(fileRows).toHaveCount(0);
	});

	test('versioned bucket shows its contents', async ({ page }) => {
		await page.getByText(BUCKETS.versioned).click();
		await page.waitForURL(`**/browse/${BUCKETS.versioned}**`, { timeout: 10_000 });

		// Should show the versioned file
		await expect(page.locator('[data-row]').filter({ hasText: 'versioned-file.txt' })).toBeVisible({ timeout: 10_000 });
	});
});
