import { test, expect } from '@playwright/test';
import { loginViaUI } from '../fixtures/auth';
import { BUCKETS, MINIO } from '../fixtures/constants';

test.describe('UI: Delete', () => {
	// Create a unique file before each test to delete
	let testKey: string;

	test.beforeEach(async ({ page, request }) => {
		// Create a file via API first
		testKey = `e2e-ui-delete-${Date.now()}.txt`;

		// Login via API to get session
		const loginRes = await request.post('/api/auth/login', {
			data: {
				accessKeyId: MINIO.accessKeyId,
				secretAccessKey: MINIO.secretAccessKey,
				region: MINIO.region,
				endpoint: MINIO.endpoint
			}
		});
		expect(loginRes.ok()).toBe(true);

		// Upload a test file
		const presignRes = await request.post('/api/s3/upload', {
			data: { bucket: BUCKETS.test, key: testKey, contentType: 'text/plain' }
		});
		const { url } = await presignRes.json();
		await request.put(url, {
			data: 'delete me via UI',
			headers: { 'Content-Type': 'text/plain' }
		});

		// Login via UI and navigate
		await loginViaUI(page);
		await page.getByText(BUCKETS.test).click();
		await page.waitForURL(`**/browse/${BUCKETS.test}**`, { timeout: 10_000 });
		// Wait for the test file to appear
		await expect(page.getByText(testKey, { exact: true }).first()).toBeVisible({ timeout: 10_000 });
	});

	test('delete shows confirmation modal', async ({ page }) => {
		// Find the file row and hover to reveal action buttons
		const row = page.locator('[data-row]').filter({ hasText: testKey });
		await row.hover();

		// Click delete button (has title="Delete")
		const deleteBtn = row.locator('button[title="Delete"]');
		await deleteBtn.click();

		// Confirmation modal should appear with "Confirm Delete" title
		await expect(page.getByText('Confirm Delete')).toBeVisible({ timeout: 5_000 });
		await expect(page.getByText('This action cannot be undone')).toBeVisible();
	});

	test('confirm delete removes file', async ({ page }) => {
		// Find the file row and trigger delete
		const row = page.locator('[data-row]').filter({ hasText: testKey });
		await row.hover();

		const deleteBtn = row.locator('button[title="Delete"]');
		await deleteBtn.click();

		// Wait for confirmation modal
		await expect(page.getByText('Confirm Delete')).toBeVisible({ timeout: 5_000 });

		// Click the red "Delete" button in the modal footer
		// The flowbite Modal renders buttons in a footer section
		// Find the visible Delete button that's NOT a title="Delete" row action button
		const modalDeleteBtn = page.locator('button.text-white, button[class*="red"]').filter({ hasText: /Delete/ });
		await modalDeleteBtn.click();

		// File should disappear from listing
		await expect(page.locator('[data-row]').filter({ hasText: testKey })).not.toBeVisible({ timeout: 10_000 });
	});

	test('cancel delete keeps file', async ({ page }) => {
		// Find the file row and trigger delete
		const row = page.locator('[data-row]').filter({ hasText: testKey });
		await row.hover();

		const deleteBtn = row.locator('button[title="Delete"]');
		await deleteBtn.click();

		// Wait for confirmation modal
		await expect(page.getByText('Confirm Delete')).toBeVisible({ timeout: 5_000 });

		// Click cancel button
		const cancelBtn = page.getByRole('button', { name: /cancel/i });
		await cancelBtn.click();

		// File should still be visible in the table
		await expect(page.locator('[data-row]').filter({ hasText: testKey })).toBeVisible();
	});
});
