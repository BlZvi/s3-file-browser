import { test, expect } from '@playwright/test';
import { loginViaUI } from '../fixtures/auth';
import { BUCKETS } from '../fixtures/constants';

test.describe('UI: Context Menu', () => {
	test.beforeEach(async ({ page }) => {
		await loginViaUI(page);
		// Navigate to test-bucket
		await page.getByText(BUCKETS.test).click();
		await page.waitForURL(`**/browse/${BUCKETS.test}**`, { timeout: 10_000 });
		await expect(page.getByText('hello.txt')).toBeVisible({ timeout: 10_000 });
	});

	test('right-click file shows context menu', async ({ page }) => {
		// Right-click on hello.txt row
		const row = page.locator('[data-row]').filter({ hasText: 'hello.txt' });
		await row.click({ button: 'right' });

		// Context menu should appear with role="menu"
		const contextMenu = page.locator('[role="menu"]');
		await expect(contextMenu).toBeVisible({ timeout: 3_000 });

		// Should have download and delete options
		await expect(contextMenu.getByText('Download')).toBeVisible();
		await expect(contextMenu.getByText('Delete')).toBeVisible();
	});

	test('context menu Download works', async ({ page, context }) => {
		// Right-click on hello.txt
		const row = page.locator('[data-row]').filter({ hasText: 'hello.txt' });
		await row.click({ button: 'right' });

		// Wait for context menu
		const contextMenu = page.locator('[role="menu"]');
		await expect(contextMenu).toBeVisible({ timeout: 3_000 });

		// Listen for new page
		const pagePromise = context.waitForEvent('page', { timeout: 5_000 }).catch(() => null);

		// Click download
		await contextMenu.getByText('Download').click();

		const newPage = await pagePromise;
		if (newPage) {
			expect(newPage.url()).toContain('hello.txt');
			await newPage.close();
		}
	});

	test('context menu Delete works', async ({ page }) => {
		// Right-click on hello.txt
		const row = page.locator('[data-row]').filter({ hasText: 'hello.txt' });
		await row.click({ button: 'right' });

		// Wait for context menu
		const contextMenu = page.locator('[role="menu"]');
		await expect(contextMenu).toBeVisible({ timeout: 5_000 });

		// Click delete in context menu (use force to avoid race with window click handler)
		await contextMenu.getByText('Delete').click({ force: true });

		// Should open delete confirmation modal
		await expect(page.getByText('Confirm Delete')).toBeVisible({ timeout: 10_000 });
		await expect(page.getByText('This action cannot be undone')).toBeVisible({ timeout: 5_000 });

		// Cancel to avoid actually deleting the seeded file
		const cancelBtn = page.getByRole('button', { name: /cancel/i });
		await cancelBtn.click();
	});
});
