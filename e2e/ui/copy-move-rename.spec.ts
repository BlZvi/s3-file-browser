import { test, expect } from '@playwright/test';
import { loginViaUI } from '../fixtures/auth';
import { BUCKETS } from '../fixtures/constants';

test.describe('UI: Copy/Move/Rename', () => {
	test.beforeEach(async ({ page }) => {
		await loginViaUI(page);
		// Navigate to test-bucket
		await page.getByText(BUCKETS.test).click();
		await page.waitForURL(`**/browse/${BUCKETS.test}**`, { timeout: 10_000 });
		await expect(page.getByText('hello.txt')).toBeVisible({ timeout: 10_000 });
	});

	test('rename file via context menu', async ({ page }) => {
		// Right-click on hello.txt row
		const row = page.locator('[data-row]').filter({ hasText: 'hello.txt' });
		await row.click({ button: 'right' });

		// Context menu should appear
		const contextMenu = page.locator('[role="menu"]');
		await expect(contextMenu).toBeVisible({ timeout: 5_000 });

		// Should have Rename option
		await expect(contextMenu.getByText('Rename')).toBeVisible();

		// Click Rename — should open rename modal
		await contextMenu.getByText('Rename').click({ force: true });

		// Rename modal should appear
		const renameHeading = page.locator('h3, [class*="title"]').filter({ hasText: 'Rename' });
		await expect(renameHeading.first()).toBeVisible({ timeout: 5_000 });
		const input = page.locator('#renameName');
		await expect(input).toBeVisible({ timeout: 3_000 });

		// Input should be pre-filled with current name
		await expect(input).toHaveValue('hello.txt');

		// Cancel to avoid actually renaming the seeded file
		await page.getByRole('button', { name: /cancel/i }).click();
	});

	test('rename file via F2 keyboard shortcut', async ({ page }) => {
		// Click on the file table area first to ensure it has focus (not the search input)
		const fileTable = page.locator('[role="grid"]');
		await fileTable.click();
		await page.waitForTimeout(200);

		// Focus on a file row using arrow keys
		await page.keyboard.press('ArrowDown');
		await page.waitForTimeout(200);

		// Press F2 to open rename modal
		await page.keyboard.press('F2');

		// Rename modal should appear
		const renameHeading = page.locator('h3, [class*="title"]').filter({ hasText: 'Rename' });
		await expect(renameHeading.first()).toBeVisible({ timeout: 5_000 });

		// Cancel
		await page.getByRole('button', { name: /cancel/i }).click();
	});

	test('copy file via context menu opens path picker', async ({ page }) => {
		// Right-click on hello.txt
		const row = page.locator('[data-row]').filter({ hasText: 'hello.txt' });
		await row.click({ button: 'right' });

		// Wait for context menu
		const contextMenu = page.locator('[role="menu"]');
		await expect(contextMenu).toBeVisible({ timeout: 3_000 });

		// Should have "Copy to..." option
		await expect(contextMenu.getByText('Copy to...')).toBeVisible();

		// Click "Copy to..."
		await contextMenu.getByText('Copy to...').click();

		// Path picker modal should open with "Copy" in the title
		await expect(page.getByText('Copy — hello.txt')).toBeVisible({ timeout: 5_000 });

		// Should show destination bucket selector
		await expect(page.getByText('Destination Bucket')).toBeVisible();

		// Should show "Copy here" button
		await expect(page.getByRole('button', { name: /copy here/i })).toBeVisible();

		// Cancel
		await page.getByRole('button', { name: /cancel/i }).click();
	});

	test('move file via context menu opens path picker', async ({ page }) => {
		// Right-click on hello.txt
		const row = page.locator('[data-row]').filter({ hasText: 'hello.txt' });
		await row.click({ button: 'right' });

		// Wait for context menu
		const contextMenu = page.locator('[role="menu"]');
		await expect(contextMenu).toBeVisible({ timeout: 3_000 });

		// Should have "Move to..." option
		await expect(contextMenu.getByText('Move to...')).toBeVisible();

		// Click "Move to..."
		await contextMenu.getByText('Move to...').click();

		// Path picker modal should open with "Move" in the title
		await expect(page.getByText('Move — hello.txt')).toBeVisible({ timeout: 5_000 });

		// Should show "Move here" button
		await expect(page.getByRole('button', { name: /move here/i })).toBeVisible();

		// Cancel
		await page.getByRole('button', { name: /cancel/i }).click();
	});
});
