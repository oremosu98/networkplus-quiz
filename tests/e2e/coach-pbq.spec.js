// @ts-check
// ══════════════════════════════════════════
// TB v3 Coach — PBQ flow E2E (v6.5.19 Task 19)
// ══════════════════════════════════════════
//
// Exercises the Scenarios picker → Start PBQ → Coach PBQ panel render
// → first step + hint cascade. The picker emits a `.tb3-picker-row-pbq`
// button only for scenarios that have a matching TB_V3_PBQS entry; in
// v1 MVP only `soho-network-converged` carries a PBQ.
//
// Pro-tier stub mirrors app.spec.js global beforeEach — without it the
// _gateProOnly guard intercepts every TB v3 navigation.

const { test, expect } = require('@playwright/test');

test.describe('TB v3 Coach · PBQ flow', () => {
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

  test('01: scenarios picker renders Start PBQ button for soho-network-converged', async ({ page }) => {
    await page.click('[data-sb-page="topology-builder-v3"]');
    await expect(page.locator('#page-topology-builder-v3.page.active')).toBeVisible();
    await page.click('#tb3-rrail-scenarios');
    await expect(page.locator('#tb3-picker-list')).toBeVisible();
    const pbqBtn = page.locator('[data-pbq-id="soho-network-converged"]');
    await expect(pbqBtn).toBeVisible();
    await expect(pbqBtn).toContainText(/Start PBQ/i);
  });

  test('02: clicking Start PBQ activates Coach panel in PBQ mode', async ({ page }) => {
    await page.click('[data-sb-page="topology-builder-v3"]');
    await page.click('#tb3-rrail-scenarios');
    page.on('dialog', d => d.accept());
    await page.click('[data-pbq-id="soho-network-converged"]');
    await expect(page.locator('body.coach-open, #tb3-body.coach-open')).toBeAttached();
    await expect(page.locator('.tb3-coach')).toBeVisible();
    await expect(page.locator('.tb3-coach__pbq-task')).toContainText(/SOHO/i);
    await expect(page.locator('.tb3-coach__pbq-step')).toContainText(/Place the SOHO router/i);
  });

  test('03: PBQ footer shows Stuck + Next controls (no free-form input)', async ({ page }) => {
    await page.click('[data-sb-page="topology-builder-v3"]');
    await page.click('#tb3-rrail-scenarios');
    page.on('dialog', d => d.accept());
    await page.click('[data-pbq-id="soho-network-converged"]');
    await expect(page.locator('.tb3-coach__footer [data-action="stuck"]')).toBeVisible();
    await expect(page.locator('.tb3-coach__footer [data-action="next"]')).toBeVisible();
    await expect(page.locator('.tb3-coach__ask')).toHaveCount(0);
  });

  test('04: Stuck button reveals first hint', async ({ page }) => {
    await page.click('[data-sb-page="topology-builder-v3"]');
    await page.click('#tb3-rrail-scenarios');
    page.on('dialog', d => d.accept());
    await page.click('[data-pbq-id="soho-network-converged"]');
    await page.click('.tb3-coach__footer [data-action="stuck"]');
    await expect(page.locator('.tb3-coach__body')).toContainText(/router/i);
  });
});
