import { test as base, type APIRequestContext } from '@playwright/test';
import { MINIO } from './constants';

/**
 * Extended test fixture that provides an authenticated API request context.
 * Logs in once per worker and reuses the session cookie for all API tests.
 */
export const test = base.extend<{
	authedRequest: APIRequestContext;
}>({
	authedRequest: async ({ playwright }, use) => {
		// Create a new request context
		const context = await playwright.request.newContext({
			baseURL: 'http://localhost:5173'
		});

		// Login to get session cookie
		const loginRes = await context.post('/api/auth/login', {
			data: {
				accessKeyId: MINIO.accessKeyId,
				secretAccessKey: MINIO.secretAccessKey,
				region: MINIO.region,
				endpoint: MINIO.endpoint
			}
		});

		if (!loginRes.ok()) {
			throw new Error(`Login failed: ${loginRes.status()} ${await loginRes.text()}`);
		}

		await use(context);

		// Cleanup: logout
		await context.post('/api/auth/logout');
		await context.dispose();
	}
});

export { expect } from '@playwright/test';

/**
 * Helper to login via the UI (for UI tests).
 * Uses the exact label text from LoginForm.svelte.
 */
export async function loginViaUI(page: import('@playwright/test').Page) {
	await page.goto('/');
	await page.locator('#accessKeyId').fill(MINIO.accessKeyId);
	await page.locator('#secretAccessKey').fill(MINIO.secretAccessKey);
	await page.locator('#endpoint').fill(MINIO.endpoint);
	await page.getByRole('button', { name: /connect to storage/i }).click();
	// Wait for redirect to browse page (allow extra time when server is under load)
	await page.waitForURL(/\/browse/, { timeout: 30_000 });
}
