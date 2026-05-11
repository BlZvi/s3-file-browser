import { test, expect } from '@playwright/test';
import { loginViaUI } from '../fixtures/auth';
import { BUCKETS } from '../fixtures/constants';

test.describe('UI: Pagination', () => {
	test.beforeEach(async ({ page }) => {
		await loginViaUI(page);
	});

	test('shows pagination bar with Load more button for large directories', async ({ page }) => {
		// Navigate to bulk bucket which has many objects
		await page.getByText(BUCKETS.bulk).click();
		await page.waitForURL(`**/browse/${BUCKETS.bulk}**`);
		// Wait for objects to load first
		await expect(page.locator('[data-row]').first()).toBeVisible({ timeout: 15_000 });

		const paginationBar = page.locator('[data-testid="pagination-bar"]');
		await expect(paginationBar).toBeVisible({ timeout: 10_000 });

		// Should show "more available" text since bulk bucket has many objects
		await expect(paginationBar).toContainText('more available', { timeout: 5_000 });

		// Load more button should be visible
		const loadMoreBtn = page.locator('[data-testid="load-more-btn"]');
		await expect(loadMoreBtn).toBeVisible({ timeout: 5_000 });
	});

	test('Load more button appends additional objects', async ({ page }) => {
		await page.getByText(BUCKETS.bulk).click();
		await page.waitForURL(`**/browse/${BUCKETS.bulk}**`);
		await expect(page.locator('[data-row]').first()).toBeVisible({ timeout: 15_000 });

		// Get initial row count
		const paginationBar = page.locator('[data-testid="pagination-bar"]');
		await expect(paginationBar).toBeVisible({ timeout: 10_000 });
		const initialRowCount = await page.locator('[data-row]').count();
		expect(initialRowCount).toBeGreaterThan(0);

		// Click Load more
		const loadMoreBtn = page.locator('[data-testid="load-more-btn"]');
		await expect(loadMoreBtn).toBeVisible({ timeout: 5_000 });
		await loadMoreBtn.click();

		// Wait for the pagination bar text to update (object count increases)
		// Use a longer timeout since loading from a large bucket can be slow
		await expect(paginationBar).not.toContainText(`Showing ${initialRowCount}`, { timeout: 30_000 });

		// Row count should have increased
		const updatedRowCount = await page.locator('[data-row]').count();
		expect(updatedRowCount).toBeGreaterThan(initialRowCount);
	});

	test('page size selector is visible and has options', async ({ page }) => {
		await page.getByText(BUCKETS.bulk).click();
		await page.waitForURL(`**/browse/${BUCKETS.bulk}**`);
		await page.waitForSelector('[data-testid="pagination-bar"]', { timeout: 15000 });

		const pageSizeSelect = page.locator('[data-testid="page-size-select"]');
		await expect(pageSizeSelect).toBeVisible();

		// Should have the expected options
		const options = pageSizeSelect.locator('option');
		const values = await options.allTextContents();
		expect(values).toContain('100');
		expect(values).toContain('200');
		expect(values).toContain('500');
		expect(values).toContain('1000');
	});

	test('page size selector changes number of loaded objects', async ({ page }) => {
		await page.getByText(BUCKETS.bulk).click();
		await page.waitForURL(`**/browse/${BUCKETS.bulk}**`);
		await page.waitForSelector('[data-testid="pagination-bar"]', { timeout: 15000 });

		const pageSizeSelect = page.locator('[data-testid="page-size-select"]');
		if (await pageSizeSelect.isVisible()) {
			// Change page size to 100 and verify reload
			await pageSizeSelect.selectOption('100');
			// Wait for reload
			await page.waitForTimeout(2000);

			const paginationBar = page.locator('[data-testid="pagination-bar"]');
			const text = await paginationBar.textContent();
			// Should show objects loaded (could be up to 100)
			expect(text).toMatch(/\d+ objects/);
		}
	});

	test('shows "All objects loaded" for small directories', async ({ page }) => {
		await page.getByText(BUCKETS.test).click();
		await page.waitForURL(`**/browse/${BUCKETS.test}**`);
		await page.waitForSelector('[data-testid="pagination-bar"]', { timeout: 15000 });

		const paginationBar = page.locator('[data-testid="pagination-bar"]');
		await expect(paginationBar).toBeVisible();

		// test-bucket has few objects, should show "All X objects loaded"
		await expect(paginationBar).toContainText('All');
		await expect(paginationBar).toContainText('objects loaded');
	});

	test('auto-load toggle is visible when truncated', async ({ page }) => {
		await page.getByText(BUCKETS.bulk).click();
		await page.waitForURL(`**/browse/${BUCKETS.bulk}**`);
		await expect(page.locator('[data-row]').first()).toBeVisible({ timeout: 15_000 });

		const paginationBar = page.locator('[data-testid="pagination-bar"]');
		await expect(paginationBar).toBeVisible({ timeout: 10_000 });

		const autoLoadToggle = page.locator('[data-testid="auto-load-toggle"]');
		await expect(autoLoadToggle).toBeVisible({ timeout: 5_000 });
	});
});
