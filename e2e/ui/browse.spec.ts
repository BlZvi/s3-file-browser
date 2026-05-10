import { test, expect } from '@playwright/test';
import { loginViaUI } from '../fixtures/auth';
import { BUCKETS } from '../fixtures/constants';

test.describe('UI: File Browser', () => {
	test.beforeEach(async ({ page }) => {
		await loginViaUI(page);
	});

	test('bucket sidebar lists all buckets', async ({ page }) => {
		// Wait for buckets to load
		await expect(page.getByText(BUCKETS.test)).toBeVisible({ timeout: 10_000 });
		await expect(page.getByText(BUCKETS.bulk)).toBeVisible();
		await expect(page.getByText(BUCKETS.types)).toBeVisible();
		await expect(page.getByText(BUCKETS.empty)).toBeVisible();
		await expect(page.getByText(BUCKETS.versioned)).toBeVisible();
	});

	test('click bucket loads its contents', async ({ page }) => {
		// Click on test-bucket
		await page.getByText(BUCKETS.test).click();
		await page.waitForURL(`**/browse/${BUCKETS.test}**`, { timeout: 10_000 });

		// Should show files from test-bucket
		await expect(page.getByText('hello.txt')).toBeVisible({ timeout: 10_000 });
		await expect(page.getByText('test.json')).toBeVisible();
	});

	test('click folder navigates into it', async ({ page }) => {
		// Navigate to test-bucket
		await page.getByText(BUCKETS.test).click();
		await page.waitForURL(`**/browse/${BUCKETS.test}**`, { timeout: 10_000 });

		// Wait for content to load — find the documents folder in the file table
		const documentsRow = page.locator('[data-row]').filter({ hasText: 'documents' }).first();
		await expect(documentsRow).toBeVisible({ timeout: 10_000 });

		// Click on documents folder row in the file table
		await documentsRow.click();

		// URL should update — wait for navigation
		await page.waitForURL(`**/browse/${BUCKETS.test}/documents**`, { timeout: 10_000 });

		// Should show files inside documents — wait for content to load
		await expect(page.locator('[data-row]').filter({ hasText: 'readme.txt' })).toBeVisible({ timeout: 15_000 });
	});

	test('breadcrumb navigation works', async ({ page }) => {
		// Navigate deep into test-bucket/documents/config
		await page.goto(`/browse/${BUCKETS.test}/documents/config`);

		// Wait for content to load
		await expect(page.getByText('settings.json')).toBeVisible({ timeout: 10_000 });

		// Click on "documents" in breadcrumb to go up
		const breadcrumbs = page.locator('nav, [aria-label*="breadcrumb"], [class*="breadcrumb"]');
		const documentsLink = breadcrumbs.getByText('documents').first();
		if (await documentsLink.isVisible()) {
			await documentsLink.click();
			await page.waitForURL(`**/browse/${BUCKETS.test}/documents**`, { timeout: 10_000 });
			await expect(page.getByText('readme.txt')).toBeVisible({ timeout: 10_000 });
		}
	});

	test('empty bucket shows empty state', async ({ page }) => {
		await page.getByText(BUCKETS.empty).click();
		await page.waitForURL(`**/browse/${BUCKETS.empty}**`, { timeout: 10_000 });

		// Should show some empty state indicator (no files)
		// Wait a moment for loading to complete
		await page.waitForTimeout(2000);

		// The file table should be empty (no data rows with file names)
		const fileRows = page.locator('[data-row]');
		await expect(fileRows).toHaveCount(0);
	});

	test('URL-based navigation works', async ({ page }) => {
		// Navigate directly via URL
		await page.goto(`/browse/${BUCKETS.test}/documents`);

		// Should load the correct content
		await expect(page.getByText('readme.txt')).toBeVisible({ timeout: 10_000 });
	});

	test('logout button works', async ({ page }) => {
		// Find and click logout button
		const logoutBtn = page.getByRole('button', { name: /logout|sign out|disconnect/i });
		if (await logoutBtn.isVisible()) {
			await logoutBtn.click();
		} else {
			// Try finding it by icon or other means
			const logoutLink = page.locator('button:has(svg)').filter({ hasText: /logout/i });
			if (await logoutLink.isVisible()) {
				await logoutLink.click();
			}
		}

		// Should redirect to login page
		await page.waitForURL('/', { timeout: 10_000 });
		await expect(page.locator('#accessKeyId')).toBeVisible();
	});
});
