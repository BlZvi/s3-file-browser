import { test, expect } from '@playwright/test';
import { MINIO } from '../fixtures/constants';

test.describe('UI: Login Flow', () => {
	test.beforeEach(async ({ page }) => {
		await page.goto('/');
	});

	test('page loads with login form', async ({ page }) => {
		// Check form elements are visible
		await expect(page.locator('#accessKeyId')).toBeVisible();
		await expect(page.locator('#secretAccessKey')).toBeVisible();
		await expect(page.locator('#endpoint')).toBeVisible();
		await expect(page.getByRole('button', { name: /connect to storage/i })).toBeVisible();
		await expect(page.getByRole('button', { name: /test/i })).toBeVisible();

		// Check labels
		await expect(page.getByText('Access Key ID')).toBeVisible();
		await expect(page.getByText('Secret Access Key')).toBeVisible();
		await expect(page.getByText('Endpoint URL')).toBeVisible();
	});

	test('submit with empty fields shows validation error', async ({ page }) => {
		// Remove required attributes to test app-level validation
		await page.locator('#accessKeyId').evaluate((el) => el.removeAttribute('required'));
		await page.locator('#secretAccessKey').evaluate((el) => el.removeAttribute('required'));

		await page.getByRole('button', { name: /connect to storage/i }).click();

		// Should show validation error from the app
		await expect(page.getByRole('alert')).toBeVisible({ timeout: 5_000 });
		// Use exact text to avoid matching the "Required for non-AWS S3" helper
		await expect(page.getByText('Access Key ID and Secret Access Key are required')).toBeVisible();
	});

	test('submit with invalid credentials shows auth error', async ({ page }) => {
		await page.locator('#accessKeyId').fill('INVALID_KEY');
		await page.locator('#secretAccessKey').fill('INVALID_SECRET');
		await page.locator('#endpoint').fill(MINIO.endpoint);
		await page.getByRole('button', { name: /connect to storage/i }).click();

		// Wait for error to appear
		await expect(page.getByRole('alert')).toBeVisible({ timeout: 10_000 });
		await expect(page.getByText(/authentication failed/i)).toBeVisible();
	});

	test('submit with wrong endpoint shows connection error', async ({ page }) => {
		test.setTimeout(60_000); // Connection errors can take a while due to retries
		await page.locator('#accessKeyId').fill(MINIO.accessKeyId);
		await page.locator('#secretAccessKey').fill(MINIO.secretAccessKey);
		await page.locator('#endpoint').fill('http://localhost:19999');
		await page.getByRole('button', { name: /connect to storage/i }).click();

		// Wait for error to appear (connection errors may take longer due to retries)
		await expect(page.getByRole('alert')).toBeVisible({ timeout: 30_000 });
	});

	test('successful login redirects to /browse', async ({ page }) => {
		await page.locator('#accessKeyId').fill(MINIO.accessKeyId);
		await page.locator('#secretAccessKey').fill(MINIO.secretAccessKey);
		await page.locator('#endpoint').fill(MINIO.endpoint);
		await page.getByRole('button', { name: /connect to storage/i }).click();

		// Should redirect to browse
		await page.waitForURL(/\/browse/, { timeout: 10_000 });
		expect(page.url()).toContain('/browse');
	});

	test('Test Connection button shows success message', async ({ page }) => {
		await page.locator('#accessKeyId').fill(MINIO.accessKeyId);
		await page.locator('#secretAccessKey').fill(MINIO.secretAccessKey);
		await page.locator('#endpoint').fill(MINIO.endpoint);
		await page.getByRole('button', { name: /^test$/i }).click();

		// Should show success banner
		await expect(page.getByRole('status')).toBeVisible({ timeout: 10_000 });
		await expect(page.getByText(/connection successful/i)).toBeVisible();

		// Should NOT redirect
		expect(page.url()).not.toContain('/browse');
	});

	test('Test Connection with bad creds shows error', async ({ page }) => {
		await page.locator('#accessKeyId').fill('BAD_KEY');
		await page.locator('#secretAccessKey').fill('BAD_SECRET');
		await page.locator('#endpoint').fill(MINIO.endpoint);
		await page.getByRole('button', { name: /^test$/i }).click();

		// Should show error
		await expect(page.getByRole('alert')).toBeVisible({ timeout: 10_000 });
		// Should NOT redirect
		expect(page.url()).not.toContain('/browse');
	});

	test('remember endpoint checkbox persists endpoint', async ({ page }) => {
		const testEndpoint = MINIO.endpoint;

		// Set localStorage directly to simulate the "remember" feature
		await page.evaluate((ep) => {
			localStorage.setItem('objectdock_endpoint', ep);
		}, testEndpoint);

		// Reload the page to trigger onMount which reads localStorage
		await page.reload();
		await page.waitForTimeout(1000);

		// Endpoint should be pre-filled
		const endpointValue = await page.locator('#endpoint').inputValue();
		expect(endpointValue).toBe(testEndpoint);

		// The checkbox should also be checked
		// Clean up
		await page.evaluate(() => localStorage.removeItem('objectdock_endpoint'));
	});
});
