// @ts-check
// ══════════════════════════════════════════
// TB v3 Coach — Free Build flow E2E (v6.5.19 Task 20)
// ══════════════════════════════════════════
//
// In Free Build mode (no active PBQ) the Coach panel renders the FB
// body — a quiet message feed plus a free-form ask input. The Coach
// pill in the rrail toggles `coach-open` on the body. Action narration
// is wired by Task 7 and feeds the message queue when canvas events
// fire; here we exercise the panel surface only (canvas wiring is
// covered by the unit fixtures in tests/uat.js).

const { test, expect } = require('@playwright/test');

test.describe('TB v3 Coach · Free Build flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      try {
        window._certanvilSignedIn = true;
        window._quotaState = { tier: 'pro', plan: 'pro' };
        document.documentElement.classList.add('is-pro-tier');
        document.documentElement.classList.add('is-state-resolved');
        localStorage.setItem('nplus_dev_cert', 'netplus');
      } catch (_) {}
    });
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
  });

  test('01: Coach pill unlocked in the right rail', async ({ page }) => {
    await page.click('[data-sb-page="topology-builder-v3"]');
    const pill = page.locator('#tb3-rrail-coach');
    await expect(pill).toBeVisible();
    await expect(pill).toHaveAttribute('title', /Phase 9/);
  });

  test('02: clicking the Coach pill toggles coach-open on the body', async ({ page }) => {
    await page.click('[data-sb-page="topology-builder-v3"]');
    await page.click('#tb3-rrail-coach');
    await expect(page.locator('body.coach-open, #tb3-body.coach-open')).toBeAttached();
  });

  test('03: FB panel renders the ask input + Send action', async ({ page }) => {
    await page.click('[data-sb-page="topology-builder-v3"]');
    await page.click('#tb3-rrail-coach');
    await expect(page.locator('.tb3-coach')).toBeVisible();
    await expect(page.locator('.tb3-coach__ask')).toBeVisible();
    await expect(page.locator('.tb3-coach__footer [data-action="send"]')).toBeVisible();
  });

  test('04: FB ask input is keyboard accessible with aria-label', async ({ page }) => {
    await page.click('[data-sb-page="topology-builder-v3"]');
    await page.click('#tb3-rrail-coach');
    const input = page.locator('.tb3-coach__ask');
    await expect(input).toHaveAttribute('aria-label', /.+/);
    await input.focus();
    await expect(input).toBeFocused();
  });

  test('05: FB mode does NOT render PBQ Stuck/Next buttons', async ({ page }) => {
    await page.click('[data-sb-page="topology-builder-v3"]');
    await page.click('#tb3-rrail-coach');
    await expect(page.locator('.tb3-coach__footer [data-action="stuck"]')).toHaveCount(0);
    await expect(page.locator('.tb3-coach__footer [data-action="next"]')).toHaveCount(0);
  });
});
