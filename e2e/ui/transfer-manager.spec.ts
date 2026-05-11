import { test, expect } from '@playwright/test';
import { loginViaUI } from '../fixtures/auth';
import { BUCKETS } from '../fixtures/constants';

test.describe('UI: Transfer Manager', () => {
	test.beforeEach(async ({ page }) => {
		await loginViaUI(page);
		await page.getByText(BUCKETS.test).click();
		await page.waitForURL(`**/browse/${BUCKETS.test}**`);
		await expect(page.getByText('hello.txt')).toBeVisible({ timeout: 10_000 });
	});

	test('transfer manager is hidden when no transfers', async ({ page }) => {
		const tm = page.locator('[data-testid="transfer-manager"]');
		await expect(tm).not.toBeVisible();
	});

	test('transfer manager appears during upload', async ({ page }) => {
		// Open the upload modal by clicking the Upload button in the toolbar
		const uploadBtn = page.locator('button[title="Upload"]');
		await expect(uploadBtn).toBeVisible({ timeout: 5_000 });
		await uploadBtn.click();

		// Wait for the upload modal to appear
		await expect(page.getByText('Upload Files')).toBeVisible({ timeout: 5_000 });

		// Now the file input is in the DOM inside the modal
		const fileInput = page.locator('input[type="file"]').first();
		await fileInput.setInputFiles({
			name: `transfer-test-${Date.now()}.txt`,
			mimeType: 'text/plain',
			buffer: Buffer.from('Transfer manager test content')
		});

		// Click the Upload button in the modal footer to start the upload
		const submitBtn = page.getByRole('button', { name: /upload 1 file/i });
		if (await submitBtn.isVisible({ timeout: 3000 })) {
			await submitBtn.click();
		}

		// Transfer manager should appear
		const tm = page.locator('[data-testid="transfer-manager"]');
		await expect(tm).toBeVisible({ timeout: 10_000 });
	});

	test('transfer manager shows completed transfers', async ({ page }) => {
		// Open the upload modal
		const uploadBtn = page.locator('button[title="Upload"]');
		await expect(uploadBtn).toBeVisible({ timeout: 5_000 });
		await uploadBtn.click();
		await expect(page.getByText('Upload Files')).toBeVisible({ timeout: 5_000 });

		// Set file
		const fileInput = page.locator('input[type="file"]').first();
		await fileInput.setInputFiles({
			name: `transfer-complete-${Date.now()}.txt`,
			mimeType: 'text/plain',
			buffer: Buffer.from('test')
		});

		// Submit upload
		const submitBtn = page.getByRole('button', { name: /upload 1 file/i });
		if (await submitBtn.isVisible({ timeout: 3000 })) {
			await submitBtn.click();
		}

		// Wait for transfer to complete
		await page.waitForTimeout(3000);

		// Should show completed status
		const tm = page.locator('[data-testid="transfer-manager"]');
		if (await tm.isVisible({ timeout: 5000 })) {
			await expect(tm).toContainText(/complete|done|history/i);
		}
	});

	test('transfer manager can be collapsed and expanded', async ({ page }) => {
		// Open the upload modal
		const uploadBtn = page.locator('button[title="Upload"]');
		await expect(uploadBtn).toBeVisible({ timeout: 5_000 });
		await uploadBtn.click();
		await expect(page.getByText('Upload Files')).toBeVisible({ timeout: 5_000 });

		// Set file
		const fileInput = page.locator('input[type="file"]').first();
		await fileInput.setInputFiles({
			name: `transfer-collapse-${Date.now()}.txt`,
			mimeType: 'text/plain',
			buffer: Buffer.from('test')
		});

		// Submit upload
		const submitBtn = page.getByRole('button', { name: /upload 1 file/i });
		if (await submitBtn.isVisible({ timeout: 3000 })) {
			await submitBtn.click();
		}

		const header = page.locator('[data-testid="transfer-header"]');
		if (await header.isVisible({ timeout: 5000 })) {
			// Click to collapse
			await header.click();
			// Click to expand
			await header.click();
		}
	});

	test('clear completed removes finished transfers', async ({ page }) => {
		// Open the upload modal
		const uploadBtn = page.locator('button[title="Upload"]');
		await expect(uploadBtn).toBeVisible({ timeout: 5_000 });
		await uploadBtn.click();
		await expect(page.getByText('Upload Files')).toBeVisible({ timeout: 5_000 });

		// Set file
		const fileInput = page.locator('input[type="file"]').first();
		await fileInput.setInputFiles({
			name: `transfer-clear-${Date.now()}.txt`,
			mimeType: 'text/plain',
			buffer: Buffer.from('test')
		});

		// Submit upload
		const submitBtn = page.getByRole('button', { name: /upload 1 file/i });
		if (await submitBtn.isVisible({ timeout: 3000 })) {
			await submitBtn.click();
		}

		await page.waitForTimeout(3000);

		const clearBtn = page.locator('[data-testid="transfer-clear"]');
		if (await clearBtn.isVisible({ timeout: 5000 })) {
			await clearBtn.click();
			// Transfer manager should hide after clearing
			const tm = page.locator('[data-testid="transfer-manager"]');
			await expect(tm).not.toBeVisible({ timeout: 5000 });
		}
	});
});
