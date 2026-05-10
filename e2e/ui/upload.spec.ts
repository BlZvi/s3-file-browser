import { test, expect } from '@playwright/test';
import { loginViaUI } from '../fixtures/auth';
import { BUCKETS } from '../fixtures/constants';
import path from 'path';
import fs from 'fs';
import os from 'os';

test.describe('UI: Upload', () => {
	test.beforeEach(async ({ page }) => {
		await loginViaUI(page);
		// Navigate to test-bucket
		await page.getByText(BUCKETS.test).click();
		await page.waitForURL(`**/browse/${BUCKETS.test}**`, { timeout: 10_000 });
		await expect(page.getByText('hello.txt')).toBeVisible({ timeout: 10_000 });
	});

	test('upload modal opens', async ({ page }) => {
		// Find and click upload button (has title="Upload")
		const uploadBtn = page.locator('button[title="Upload"]');
		await uploadBtn.click();

		// Flowbite Modal renders with a specific structure — look for the modal title
		await expect(page.getByText('Upload Files')).toBeVisible({ timeout: 5_000 });
		// Also check for the file input area
		await expect(page.locator('input[type="file"]')).toBeAttached();
	});

	test('upload a file via modal', async ({ page }) => {
		// Create a temporary test file
		const tmpDir = os.tmpdir();
		const testFileName = `e2e-ui-upload-${Date.now()}.txt`;
		const testFilePath = path.join(tmpDir, testFileName);
		fs.writeFileSync(testFilePath, 'e2e upload test content');

		try {
			// Click upload button
			const uploadBtn = page.locator('button[title="Upload"]');
			await uploadBtn.click();

			// Wait for modal
			await expect(page.getByText('Upload Files')).toBeVisible({ timeout: 5_000 });

			// Set file on the file input
			const fileInput = page.locator('input[type="file"]');
			await fileInput.setInputFiles(testFilePath);

			// Wait for upload to complete
			await page.waitForTimeout(3000);

			// Refresh the page to see the uploaded file
			await page.reload();
			await page.waitForTimeout(2000);
		} finally {
			// Cleanup temp file
			if (fs.existsSync(testFilePath)) {
				fs.unlinkSync(testFilePath);
			}
		}
	});
});
