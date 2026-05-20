import { test, expect } from '@playwright/test';

/**
 * E2E Smoke test: navigates the sidebar and confirms every page
 * renders without crashing. Does NOT depend on a real backend —
 * pages will show error states (or loading), which is OK.
 *
 * The goal is to confirm the SPA shell, routing, and component
 * lifecycle work end-to-end in a real browser.
 */
test.describe('Sidebar navigation smoke test', () => {
  test('all pages render without crashing', async ({ page }) => {
    await page.goto('/');

    // Wait for the sidebar to be visible
    await expect(page.locator('text=MediaMTX Admin')).toBeVisible();

    // Default route is dashboard → page should render (loading/error ok)
    await expect(page.locator('h1')).toBeVisible();

    const pages = [
      { name: 'Streams', heading: 'Streams' },
      { name: 'Logs', heading: 'Logs' },
      { name: 'Metrics', heading: 'Metrics' },
      { name: 'Config', heading: 'Configuration' },
      { name: 'Diagnostics', heading: 'Diagnostics' },
    ];

    for (const { name, heading } of pages) {
      // Click sidebar link
      await page.locator(`a:has-text("${name}")`).click();

      // Wait for the page heading to appear (confirms navigation + render)
      await expect(page.locator('h1')).toContainText(heading);

      // Page content area should be present (not blank)
      const main = page.locator('main');
      await expect(main).toBeVisible();
    }
  });

  test('can navigate back to dashboard', async ({ page }) => {
    await page.goto('/#streams');

    // Should be on Streams page
    await expect(page.locator('h1')).toContainText('Streams');

    // Click Dashboard in sidebar
    await page.locator('a:has-text("Dashboard")').click();
    await expect(page.locator('h1')).toContainText('Dashboard');
  });
});
