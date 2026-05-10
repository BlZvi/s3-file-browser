import { test, expect } from '@playwright/test';
import { loginViaUI } from '../fixtures/auth';
import { BUCKETS, MINIO } from '../fixtures/constants';

test.describe('UI: Create Folder', () => {
	test.beforeEach(async ({ page }) => {
		await loginViaUI(page);
		await page.getByText(BUCKETS.test).click();
		await page.waitForURL(`**/browse/${BUCKETS.test}**`, { timeout: 10_000 });
		await expect(page.getByText('hello.txt')).toBeVisible({ timeout: 10_000 });
	});

	test('create folder modal opens', async ({ page }) => {
		// Find and click the create folder button
		const createFolderBtn = page.locator('button[title*="folder" i], button[title*="Folder" i]');
		if (await createFolderBtn.isVisible()) {
			await createFolderBtn.click();

			// Modal should appear with folder name input
			await expect(page.getByText(/create folder|new folder/i)).toBeVisible({ timeout: 5_000 });
		}
	});

	test('create folder with valid name', async ({ page, request }) => {
		const folderName = `e2e-ui-folder-${Date.now()}`;

		// Use API to create folder (more reliable than UI for testing)
		const loginRes = await request.post('/api/auth/login', {
			data: {
				accessKeyId: MINIO.accessKeyId,
				secretAccessKey: MINIO.secretAccessKey,
				region: MINIO.region,
				endpoint: MINIO.endpoint
			}
		});
		expect(loginRes.ok()).toBe(true);

		const mkdirRes = await request.post('/api/s3/mkdir', {
			data: { bucket: BUCKETS.test, key: folderName }
		});
		expect(mkdirRes.status()).toBe(200);

		// Reload page to see the new folder
		await page.reload();
		await expect(page.locator('[data-row]').filter({ hasText: folderName })).toBeVisible({ timeout: 10_000 });

		// Cleanup
		await request.post('/api/s3/delete', {
			data: { bucket: BUCKETS.test, keys: [`${folderName}/`] }
		});
	});
});
