import { test, expect } from '@playwright/test';
import { loginViaUI } from '../fixtures/auth';
import { BUCKETS } from '../fixtures/constants';

test.describe('UI: CORS Management', () => {
  // All CORS UI tests are skipped: MinIO does not implement the CORS management API
  // (PutBucketCors / DeleteBucketCors return NotImplemented), so the CorsEditor
  // component cannot load or save CORS configuration in the E2E environment.

  test.beforeEach(async ({ page }) => {
    await loginViaUI(page);
    await page.getByText(BUCKETS.test).click();
    await page.waitForURL(`**/browse/${BUCKETS.test}**`);
    await expect(page.getByText('hello.txt')).toBeVisible({ timeout: 10_000 });
  });

  test.skip('CORS section exists in bucket details', async ({ page }) => {
    // Open bucket details panel
    const detailsBtn = page.locator('[data-testid="bucket-details-btn"]');
    if (await detailsBtn.isVisible({ timeout: 3000 })) {
      await detailsBtn.click();
    }
    // Look for CORS section
    const corsSection = page.getByText(/CORS Configuration/i);
    await expect(corsSection).toBeVisible({ timeout: 5000 });
  });

  test.skip('can add a CORS rule', async ({ page }) => {
    const detailsBtn = page.locator('[data-testid="bucket-details-btn"]');
    if (await detailsBtn.isVisible({ timeout: 3000 })) {
      await detailsBtn.click();
    }
    // Look for Add Rule button
    const addBtn = page.locator('[data-testid="cors-add-rule"]');
    await expect(addBtn).toBeVisible({ timeout: 5000 });
    await addBtn.click();
    // A new rule form should appear
    await expect(page.getByText(/allowed origins/i)).toBeVisible({ timeout: 3000 });
    await expect(page.getByText(/allowed methods/i)).toBeVisible({ timeout: 3000 });
  });

  test.skip('can use quick setup buttons', async ({ page }) => {
    const detailsBtn = page.locator('[data-testid="bucket-details-btn"]');
    if (await detailsBtn.isVisible({ timeout: 3000 })) {
      await detailsBtn.click();
    }
    // Click Allow All Origins quick setup
    const quickAllBtn = page.locator('[data-testid="cors-quick-all"]');
    await expect(quickAllBtn).toBeVisible({ timeout: 5000 });
    await quickAllBtn.click();
    // Should now have a rule with * origin
    await expect(page.locator('[data-testid="cors-rule"]')).toBeVisible({ timeout: 3000 });
  });

  test.skip('can remove a CORS rule', async ({ page }) => {
    const detailsBtn = page.locator('[data-testid="bucket-details-btn"]');
    if (await detailsBtn.isVisible({ timeout: 3000 })) {
      await detailsBtn.click();
    }
    // Add a rule first
    const addBtn = page.locator('[data-testid="cors-add-rule"]');
    await expect(addBtn).toBeVisible({ timeout: 5000 });
    await addBtn.click();
    await expect(page.locator('[data-testid="cors-rule"]')).toBeVisible({ timeout: 3000 });

    // Remove it
    const removeBtn = page.locator('[data-testid="cors-remove-rule"]');
    await removeBtn.click();
    await expect(page.locator('[data-testid="cors-rule"]')).not.toBeVisible({ timeout: 3000 });
  });
});
