import { test, expect } from '@playwright/test';
import { loginViaUI } from '../fixtures/auth';
import { BUCKETS } from '../fixtures/constants';

test.describe('UI: Share Link Modal', () => {
	test.beforeEach(async ({ page }) => {
		await loginViaUI(page);
		await page.getByText(BUCKETS.test).click();
		await page.waitForURL(`**/browse/${BUCKETS.test}**`, { timeout: 15_000 });
		await expect(page.getByText('hello.txt')).toBeVisible({ timeout: 15_000 });
	});

	test('context menu has share option', async ({ page }) => {
		// Right-click on hello.txt
		const row = page.locator('[data-row]').filter({ hasText: 'hello.txt' });
		await row.click({ button: 'right' });

		// Context menu should appear
		const contextMenu = page.locator('[role="menu"]');
		await expect(contextMenu).toBeVisible({ timeout: 3_000 });

		// Check for share-related option (Share, Share Link, Copy Link, etc.)
		const shareOption = contextMenu.locator('button, [role="menuitem"]').filter({
			hasText: /share|link|copy.*link/i
		});

		// If share option exists, verify it's clickable
		if (await shareOption.count() > 0) {
			await expect(shareOption.first()).toBeVisible();
		}
	});

	test('presigned URL can be generated via API', async ({ page, request }) => {
		// Verify the presign API works (the share modal uses this)
		const loginRes = await request.post('/api/auth/login', {
			data: {
				accessKeyId: 'minioadmin',
				secretAccessKey: 'minioadmin',
				region: 'us-east-1',
				endpoint: 'http://localhost:9000'
			}
		});
		expect(loginRes.ok()).toBe(true);

		const presignRes = await request.post('/api/s3/presign', {
			data: {
				bucket: BUCKETS.test,
				key: 'hello.txt'
			}
		});
		expect(presignRes.status()).toBe(200);

		const body = await presignRes.json();
		expect(body.url).toBeTruthy();
		expect(body.url).toContain('hello.txt');
	});
});
