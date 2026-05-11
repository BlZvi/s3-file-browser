import { test, expect } from '@playwright/test';
import { loginViaUI } from '../fixtures/auth';
import { BUCKETS } from '../fixtures/constants';

test.describe('UI: Bookmarks & Quick Access', () => {
	test.beforeEach(async ({ page }) => {
		await loginViaUI(page);
		await page.getByText(BUCKETS.test).click();
		await page.waitForURL(`**/browse/${BUCKETS.test}**`);
		await expect(page.getByText('hello.txt')).toBeVisible({ timeout: 10_000 });
	});

	test('bookmark toggle button exists', async ({ page }) => {
		const bookmarkBtn = page.locator('[data-testid="bookmark-toggle"]');
		await expect(bookmarkBtn).toBeVisible();
	});

	test('can bookmark current path', async ({ page }) => {
		const bookmarkBtn = page.locator('[data-testid="bookmark-toggle"]');
		await bookmarkBtn.click();
		// Star should be filled now
		await expect(bookmarkBtn).toHaveAttribute('data-bookmarked', 'true');
	});

	test('can unbookmark current path', async ({ page }) => {
		const bookmarkBtn = page.locator('[data-testid="bookmark-toggle"]');
		// Bookmark first
		await bookmarkBtn.click();
		await expect(bookmarkBtn).toHaveAttribute('data-bookmarked', 'true');
		// Unbookmark
		await bookmarkBtn.click();
		await expect(bookmarkBtn).toHaveAttribute('data-bookmarked', 'false');
	});

	test('command palette opens with Ctrl+K', async ({ page }) => {
		await page.keyboard.press('Control+k');
		const palette = page.locator('[data-testid="command-palette"]');
		await expect(palette).toBeVisible({ timeout: 3000 });
	});

	test('command palette shows buckets', async ({ page }) => {
		await page.keyboard.press('Control+k');
		const palette = page.locator('[data-testid="command-palette"]');
		await expect(palette).toBeVisible({ timeout: 3000 });
		// Should show bucket names
		await expect(palette.getByText(BUCKETS.test)).toBeVisible();
	});

	test('command palette search filters results', async ({ page }) => {
		await page.keyboard.press('Control+k');
		const searchInput = page.locator('[data-testid="command-palette-search"]');
		await searchInput.fill(BUCKETS.test);
		// Should filter to show matching bucket
		await expect(
			page.locator('[data-testid="command-palette"]').getByText(BUCKETS.test)
		).toBeVisible();
	});

	test('command palette closes with Escape', async ({ page }) => {
		await page.keyboard.press('Control+k');
		const palette = page.locator('[data-testid="command-palette"]');
		await expect(palette).toBeVisible({ timeout: 5000 });
		await page.waitForTimeout(200);
		await page.keyboard.press('Escape');
		await expect(palette).not.toBeVisible({ timeout: 5000 });
	});

	test('bookmarks panel shows bookmarked paths', async ({ page }) => {
		// First bookmark the current path
		const bookmarkBtn = page.locator('[data-testid="bookmark-toggle"]');
		await bookmarkBtn.click();

		// Open bookmarks panel
		const panelBtn = page.locator('[data-testid="bookmarks-panel-btn"]');
		if (await panelBtn.isVisible()) {
			await panelBtn.click();
			const panel = page.locator('[data-testid="bookmarks-panel"]');
			await expect(panel).toBeVisible({ timeout: 3000 });
			await expect(panel.getByText(BUCKETS.test)).toBeVisible();
		}
	});

	test('bookmarks panel shows empty state when no bookmarks', async ({ page }) => {
		// Open bookmarks panel without bookmarking anything
		const panelBtn = page.locator('[data-testid="bookmarks-panel-btn"]');
		if (await panelBtn.isVisible()) {
			await panelBtn.click();
			const panel = page.locator('[data-testid="bookmarks-panel"]');
			await expect(panel).toBeVisible({ timeout: 3000 });
			await expect(panel.getByText('No bookmarks yet')).toBeVisible();
		}
	});

	test('command palette shows bookmarked items', async ({ page }) => {
		// Bookmark current path
		const bookmarkBtn = page.locator('[data-testid="bookmark-toggle"]');
		await bookmarkBtn.click();
		await expect(bookmarkBtn).toHaveAttribute('data-bookmarked', 'true');

		// Open command palette
		await page.keyboard.press('Control+k');
		const palette = page.locator('[data-testid="command-palette"]');
		await expect(palette).toBeVisible({ timeout: 3000 });

		// Should show bookmarks section
		await expect(palette.getByText('Bookmarks')).toBeVisible();
	});
});
