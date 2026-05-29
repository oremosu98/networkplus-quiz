// @ts-check
const { test, expect } = require('@playwright/test');

// ══════════════════════════════════════════════════════════════════════════
// CertAnvil LANDING — cert-coverage E2E (v7.8.2)
//
// Runs ONLY under the `landing` Playwright project (see playwright.config.js),
// which serves the landing/ folder on :3132 and is the project CI gates on via
// `--project=landing` alongside chromium.
//
// Guards the v7.0.0/cd8c784 cert-coverage contract that shipped UNTESTED by
// E2E: the three signed-in landing surfaces (Account Settings, My Certs modal,
// Cross-Cert Analytics) must show the CANONICAL 8 MVP exams and must NOT leak
// the phantom certs that the cd8c784 fix removed (CCNA / SAA-C03 / AZ-104).
//
// Those surfaces are Supabase-auth-gated, so rather than fake the auth chain we
// assert on the source-of-truth builders — exposed on window as E2E hooks
// (window.ccaGetCertCatalog / window.accGetCertEntitlements / window.renderMyCertsList),
// the same pattern the cert-app spec uses with window.renderHistoryPanel. The
// cd8c784 bug was in this DATA (wrong/missing certs), not the render loop, so
// asserting it here is the right-altitude regression guard.
// ══════════════════════════════════════════════════════════════════════════

// The canonical MVP set: 7 certs / 8 exams across 3 vendors.
const CANONICAL_IDS = [
  'netplus', 'secplus', 'aplus-core1', 'aplus-core2',
  'az900', 'ai900', 'sc900', 'clfc02',
];
// Exam codes as rendered in the My Certs modal rows (unambiguous substrings).
const CANONICAL_CODES = [
  'N10-009', 'SY0-701', '220-1201', '220-1202',
  'AZ-900', 'AI-900', 'SC-900', 'CLF-C02',
];
// Non-canonical certs the cd8c784 fix removed — must never reappear.
const PHANTOM_STRINGS = ['CCNA', 'SAA-C03', 'AZ-104'];

// Assert an array of cert ids is exactly the canonical 8 with no phantom leak.
function expectCanonicalIds(ids) {
  // No phantom id (case-insensitive, dash-insensitive).
  const joined = ids.join(' ').toLowerCase();
  expect(joined).not.toContain('ccna');
  expect(joined).not.toContain('saa');
  expect(joined.replace(/-/g, '')).not.toContain('az104');
  // Every canonical id present…
  for (const id of CANONICAL_IDS) expect(ids).toContain(id);
  // …and exactly 8 entries (catches both a missing cert AND an extra one).
  expect(ids.length).toBe(8);
}

test.describe('Landing — Cross-Cert Analytics catalog', () => {
  test('getCertCatalog renders the canonical 8 exams + no phantom certs (both roles)', async ({ page }) => {
    await page.goto('/analytics');
    await page.waitForFunction(() => typeof window.ccaGetCertCatalog === 'function');

    const userIds = await page.evaluate(() => window.ccaGetCertCatalog('user').map((c) => c.id));
    expectCanonicalIds(userIds);

    const adminIds = await page.evaluate(() => window.ccaGetCertCatalog('admin').map((c) => c.id));
    expectCanonicalIds(adminIds);
  });
});

test.describe('Landing — Account Settings entitlements', () => {
  test('getCertEntitlements renders the canonical 8 exams + no phantom certs (both roles)', async ({ page }) => {
    await page.goto('/account');
    await page.waitForFunction(() => typeof window.accGetCertEntitlements === 'function');

    const userIds = await page.evaluate(() => window.accGetCertEntitlements('user').map((c) => c.id));
    expectCanonicalIds(userIds);

    const adminIds = await page.evaluate(() => window.accGetCertEntitlements('admin').map((c) => c.id));
    expectCanonicalIds(adminIds);
  });
});

test.describe('Landing — My Certs modal', () => {
  test('renderMyCertsList paints all 8 canonical exam codes + no phantom certs', async ({ page }) => {
    await page.goto('/');
    await page.waitForFunction(() => typeof window.renderMyCertsList === 'function');
    await page.waitForSelector('#my-certs-list', { state: 'attached' });

    // Drive the renderer with a stub profile (no auth needed) and read the DOM.
    const html = await page.evaluate(() => {
      window.renderMyCertsList({ role: 'user', metadata: {} });
      const el = document.getElementById('my-certs-list');
      return el ? el.innerHTML : '';
    });

    // All 8 canonical exam codes render…
    for (const code of CANONICAL_CODES) expect(html).toContain(code);
    // …and no phantom cert leaks into the modal.
    for (const phantom of PHANTOM_STRINGS) expect(html).not.toContain(phantom);
    // 8 rows rendered (one <a class="my-cert-row"> per exam).
    const rowCount = (html.match(/class="my-cert-row"/g) || []).length;
    expect(rowCount).toBe(8);
  });
});
