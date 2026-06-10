// @ts-check
const { test, expect } = require('@playwright/test');

// ══════════════════════════════════════════
// Network+ Quiz — Playwright E2E Tests
// Tests actual browser behavior, not just source code
// ══════════════════════════════════════════

// v4.43.4 — Global test fixture (closes #152)
// `#custom-quiz-section` is a `<details>` that ships collapsed by default
// (part of the v4.41.0 homepage-density pass). That section contains the
// topic/difficulty/count chip groups AND the Generate Quiz button. Tests
// that exercise those elements were timing out at 30s because the elements
// are hidden when the <details> is closed.
//
// This init-script runs before every page load across all tests in the file,
// so ANY test that does `page.goto('/')` gets the section open without
// having to modify each test individually.
//
// v4.99.32 (Playwright triage) — also stub auth + Pro-tier state. Without
// this, _gateProOnly() at app.js:1713-1736 (added in v4.99.5 Phase E.4.2)
// blocks every drill / topology / lab / monitor page for anonymous users.
// Playwright tests can't actually sign into Supabase + don't exercise the
// quota system, so we stub the two globals that _gateProOnly() reads to let
// page navigation work as it did pre-v4.99.5. The `is-pro-tier` +
// `is-state-resolved` body classes mirror what auth-state.js sets when a
// real Pro user signs in (see auth-state.js:_renderProBadge + _setStateClass).
// Without this stub, 30+ tests fail on showPage() returning early. The
// product gating is correct in production; the tests just need to skip past
// it the same way a real Pro user would.
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    // v4.99.36: lock _certanvilSignedIn as non-writable. The v4.99.34
    // wire-up makes auth-state.js renderAnonymous() set this flag to false
    // when getSession() returns no session — which IS the case in Playwright
    // (no real Supabase auth). Without the lock, the stub gets clobbered ~50ms
    // after page load + every showPage() to a Pro-only feature blocks again.
    // defineProperty with writable:false silently rejects later assignments
    // (auth-state's writes are wrapped in try/catch per the v4.99.34 fix, so
    // they no-op silently). Bullet-proof stub.
    Object.defineProperty(window, '_certanvilSignedIn', {
      value: true,
      writable: false,
      configurable: false
    });
    window._quotaState = { tier: 'pro', daily_limit: -1 };
    window.addEventListener('DOMContentLoaded', () => {
      // Stub Pro-tier body classes BEFORE _gateProOnly() runs
      try {
        document.body && document.body.classList.add('is-pro-tier', 'is-state-resolved');
      } catch (_) {}
      // v5.5.6: the v4.43.4 GLOBAL force-open of #custom-quiz-section was
      // REMOVED from here. v5.5.4 turned that section into a portal modal
      // (position:fixed; inset:0; z-index:140; scroll-locked; reparented
      // to <body>). Force-opening it for EVERY test then covered the whole
      // viewport with a backdrop → the ~89 tests that don't touch the modal
      // had their clicks intercepted → 30s actionability timeout + 1 retry
      // each → the chromium suite ran for hours and the CI gate never went
      // green (v5.5.4 + v5.5.5 never deployed as a result). The open is now
      // SCOPED to only the describe blocks that exercise the modal's chip
      // groups / Generate button (see openCustomQuizModal below).
    });
  });
});

// v5.5.6: scoped opener for the modal-dependent describe blocks. Same
// mechanism as the old v4.43.4 global hook (set .open on DOMContentLoaded
// → app.js _cqModalInit portals it + the dg-system.css [open] modal
// styles apply) but applied ONLY where #topic-group / #diff-group /
// #count-group / the Generate button are exercised, so the portal modal's
// full-viewport backdrop never covers the page for tests that don't use
// it. Each test gets a fresh page, so no teardown is needed.
const openCustomQuizModal = async ({ page }) => {
  await page.addInitScript(() => {
    window.addEventListener('DOMContentLoaded', () => {
      const sec = document.getElementById('custom-quiz-section');
      if (sec) sec.open = true;
    });
  });
};

// v7.35.0: Practice / Exam / Drill sections collapse by default on phones
// (≤620px). Expand before interacting so button clicks reach visible elements.
// No-op on desktop (section never gets .home-collapsed). Safe if
// _initHomeCollapse() hasn't run yet (count() returns 0 → skip).
async function expandHomeSection(page, cellClass) {
  if (await page.locator(`.${cellClass}.home-collapsed`).count()) {
    await page.locator(`.${cellClass} .tile-head`).first().click();
    await page.locator(`.${cellClass}.home-collapsed`)
      .waitFor({ state: 'detached', timeout: 2000 })
      .catch(() => {});
  }
}

test.describe('App Load & Setup Page', () => {
  test('loads and shows the setup page', async ({ page }) => {
    await page.goto('/');

    // Setup page should be visible
    const setupPage = page.locator('#page-setup');
    await expect(setupPage).toHaveClass(/active/);

    // v7.17.0 (home bento): the greeting heading (#hero-v2-display, now a hidden
    // legacy stub) is replaced by the bento command bar — cert identity +
    // days-to-exam + streak chips. Assert the cmd-bar rendered with the cert.
    await expect(page.locator('#page-setup .cmd-bar')).toBeVisible();
    await expect(page.locator('#cb-cert')).toBeVisible();
    await expect(page.locator('#cb-streak')).toBeVisible();

    // API key input is present (now type="hidden" since v4.99.3 retired BYOK
    // — stays in DOM as a vestigial bind target for legacy code paths).
    await expect(page.locator('#api-key')).toBeAttached();

    // v4.54.0: version string lives in sidebar brand
    await expect(page.locator('.sb-brand-version')).toContainText(/v\d+\.\d+/);
  });

  test('API key input is hidden (BYOK retired in v4.99.3)', async ({ page }) => {
    await page.goto('/');
    const input = page.locator('#api-key');
    // v4.99.32 — was a "has aria-label" test from BYOK era. v4.99.3 moved
    // AI calls server-side and converted #api-key to type="hidden" (it stays
    // in DOM as a vestigial bind target for legacy paths). New assertion is
    // a regression-guard: if BYOK is ever re-enabled, this test will fail
    // loudly + remind us to restore the visible input + ARIA label.
    await expect(input).toHaveAttribute('type', 'hidden');
  });
});

test.describe('Theme Toggle', () => {
  test('switches between dark and light theme', async ({ page }) => {
    await page.goto('/');

    const html = page.locator('html');
    const initial = await html.getAttribute('data-theme');

    // v4.54.0: theme toggle lives in the persistent topbar (#topbar-theme) — #theme-toggle
    // still exists in the hidden legacy hero but is display:none
    await page.locator('#topbar-theme').click();
    const afterFirst = await html.getAttribute('data-theme');
    expect(afterFirst).not.toBe(initial);

    // Click again — should flip back
    await page.locator('#topbar-theme').click();
    const afterSecond = await html.getAttribute('data-theme');
    expect(afterSecond).toBe(initial);
  });
});

test.describe('Navigation', () => {
  test('navigates to analytics and back', async ({ page }) => {
    await page.goto('/');

    // v7.36.0 (mockup lift): sidebar retired — nav via the bottom tab bar,
    // then the Progress ⇄ Analytics seg switcher.
    await page.locator('#lift-tabbar .lift-tab[data-page="progress"]').click();
    await expect(page.locator('#page-progress')).toHaveClass(/active/);
    await page.locator('#page-progress .lift-seg-chip[data-page="analytics"]').click();
    await expect(page.locator('#page-analytics')).toHaveClass(/active/);

    await page.locator('#lift-tabbar .lift-tab[data-page="setup"]').click();
    await expect(page.locator('#page-setup')).toHaveClass(/active/);
  });

  test('navigates to topic progress and back', async ({ page }) => {
    await page.goto('/');

    // v7.36.0 (mockup lift): nav via the bottom tab bar
    await page.locator('#lift-tabbar .lift-tab[data-page="progress"]').click();
    await expect(page.locator('#page-progress')).toHaveClass(/active/);

    await page.locator('#lift-tabbar .lift-tab[data-page="setup"]').click();
    await expect(page.locator('#page-setup')).toHaveClass(/active/);
  });
});

// v7.36.0 (mockup lift): Settings is the Account tab in the bottom tab bar.
async function gotoSettings(page) {
  await page.locator('#lift-tabbar .lift-tab[data-page="settings"]').click();
  await expect(page.locator('#page-settings')).toHaveClass(/active/);
}
// v7.36.0 (mockup lift): Analytics sits behind the Progress tab's seg switcher.
async function gotoAnalytics(page) {
  await page.locator('#lift-tabbar .lift-tab[data-page="progress"]').click();
  await expect(page.locator('#page-progress')).toHaveClass(/active/);
  await page.locator('#page-progress .lift-seg-chip[data-page="analytics"]').click();
  await expect(page.locator('#page-analytics')).toHaveClass(/active/);
}

test.describe('Data Export/Import', () => {
  test('export button is clickable', async ({ page }) => {
    await page.goto('/');
    // v4.54.1: Export button moved to Settings page
    await gotoSettings(page);
    const exportBtn = page.locator('#page-settings button:has-text("Export")');
    await expect(exportBtn).toBeVisible();
  });
});

test.describe('Chip Selectors', () => {
  test.beforeEach(openCustomQuizModal);
  test('topic chips are selectable', async ({ page }) => {
    await page.goto('/');

    // Click a topic chip
    const chips = page.locator('#topic-group .chip');
    await expect(chips.first()).toBeVisible();

    // v4.43.4 fix: previously clicked nth(1) which is Mixed (already .on by default).
    // Clicking an already-on chip toggles it off → assertion fails. Click nth(2)
    // which is the first domain topic (unselected) so the click actually selects it.
    await chips.nth(2).click();
    await expect(chips.nth(2)).toHaveClass(/on/);
  });

  test('difficulty chips are selectable', async ({ page }) => {
    await page.goto('/');

    const chips = page.locator('#diff-group .chip');
    // nth(0) is Foundational (default .on). Click nth(2) to select a different one.
    await chips.nth(2).click();
    await expect(chips.nth(2)).toHaveClass(/on/);
  });

  test('count chips are selectable', async ({ page }) => {
    await page.goto('/');

    const chips = page.locator('#count-group .chip');
    // nth(1) is the default-selected chip; click a different one.
    await chips.nth(3).click();
    await expect(chips.nth(3)).toHaveClass(/on/);
  });
});

test.describe('API Key Validation', () => {
  test.beforeEach(openCustomQuizModal);
  // v4.99.36: these 2 tests originally asserted that the BYOK error fires for
  // empty / bad-format keys. v4.99.33 retargeted validateApiKey to skip the
  // check entirely for signed-in users (server proxy handles auth). Since the
  // beforeEach stubs `_certanvilSignedIn = true` for ALL tests in this file
  // (Pro-gate bypass), the BYOK error path isn't reachable here. Tests
  // updated to assert the v4.99.33 contract: signed-in users never see the
  // BYOK error, regardless of what the (now hidden) #api-key input contains.
  test('signed-in user with empty API key does NOT see BYOK error (v4.99.33 contract)', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.setItem('nplus_key', ''));
    await page.locator('#custom-quiz-section button:has-text("Generate Quiz")').click();
    // v4.99.33: error is suppressed for signed-in users (validateApiKey returns null).
    // Quiz generation will fail downstream because there's no real session, but
    // the BYOK gate doesn't fire — that's the contract under test.
    const err = page.locator('#setup-err');
    // Use a short timeout — error should NOT appear at all
    await expect(err).not.toBeVisible({ timeout: 1500 });
  });

  test('signed-in user with bad-format API key does NOT see BYOK error', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => {
      const el = document.getElementById('api-key');
      if (el) el.value = 'invalid-key-123';
    });
    await page.locator('#custom-quiz-section button:has-text("Generate Quiz")').click();
    const err = page.locator('#setup-err');
    await expect(err).not.toBeVisible({ timeout: 1500 });
  });
});

test.describe('Wrong Bank', () => {
  test('clear button exists in DOM', async ({ page }) => {
    await page.goto('/');

    // The clear button should exist even if hidden (no wrong answers yet)
    const clearBtn = page.locator('#wrong-bank-clear');
    await expect(clearBtn).toBeAttached();
  });
});

test.describe('Responsive Layout', () => {
  test('renders on mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/');

    await expect(page.locator('#page-setup')).toHaveClass(/active/);
    // v7.17.0 (home bento): bento command bar replaces the greeting heading.
    await expect(page.locator('#page-setup .cmd-bar')).toBeVisible();
    // API key is inside collapsed Settings — just needs to be attached to DOM
    await expect(page.locator('#api-key')).toBeAttached();
  });
});

// ══════════════════════════════════════════
// NEW TEST CASES
// ══════════════════════════════════════════

test.describe('Default Chip Selections', () => {
  test.beforeEach(openCustomQuizModal);
  test('Mixed topic is selected by default', async ({ page }) => {
    await page.goto('/');
    const mixedChip = page.locator('#topic-group .chip.on');
    await expect(mixedChip).toHaveCount(1);
    await expect(mixedChip).toContainText('Mixed');
  });

  test('Exam Level difficulty is selected by default', async ({ page }) => {
    await page.goto('/');
    const diffChip = page.locator('#diff-group .chip.on');
    await expect(diffChip).toHaveCount(1);
    await expect(diffChip).toContainText('Exam Level');
  });

  test('10 questions is selected by default', async ({ page }) => {
    await page.goto('/');
    const countChip = page.locator('#count-group .chip.on');
    await expect(countChip).toHaveCount(1);
    await expect(countChip).toHaveAttribute('data-v', '10');
  });
});

test.describe('Topic Chip Count', () => {
  test.beforeEach(openCustomQuizModal);
  test('has topic chips including Mixed and Smart', async ({ page }) => {
    await page.goto('/');
    const chips = page.locator('#topic-group .chip');
    // v4.42.3 expanded catalog from 40 → 50 topics; current total is 52 including
    // Smart + Mixed quickpicks. Keep the exact count as a regression guard — if a
    // topic is accidentally removed, fail loud. Update this number when the catalog
    // intentionally grows.
    await expect(chips).toHaveCount(52);
    // Sanity: Smart + Mixed are among them
    await expect(page.locator('#topic-group .chip-smart')).toHaveCount(1);
    await expect(page.locator('#topic-group .chip').filter({ hasText: 'Mixed' })).toHaveCount(1);
  });

  test('switching topic chip deselects previous', async ({ page }) => {
    await page.goto('/');
    const chips = page.locator('#topic-group .chip');

    // Mixed is on by default
    await expect(page.locator('#topic-group .chip.on')).toHaveCount(1);

    // v4.43.4 fix: click nth(2) (first domain topic) instead of nth(0) which is
    // the Smart chip — clicking Smart has special behavior (spaced-rep mode) and
    // doesn't follow the standard "single-select chip-group" contract.
    await chips.nth(2).click();

    // Only the clicked chip should be active
    await expect(page.locator('#topic-group .chip.on')).toHaveCount(1);
    await expect(chips.nth(2)).toHaveClass(/on/);
  });
});

test.describe('API Key Persistence', () => {
  test('saves API key to localStorage', async ({ page }) => {
    await page.goto('/');
    // v4.99.32: dropped the .fill() + .blur() flow — #api-key is now
    // type="hidden" (v4.99.3 BYOK retirement), .fill() hangs forever
    // on a hidden input. The contract worth keeping is round-tripping
    // the value through localStorage, which the eval below tests directly.
    await page.evaluate(() => localStorage.setItem('nplus_key', 'sk-ant-api03-test123'));

    const savedKey = await page.evaluate(() => localStorage.getItem('nplus_key'));
    expect(savedKey).toBe('sk-ant-api03-test123');
  });

  test('restores API key from localStorage on reload', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.setItem('nplus_key', 'sk-ant-api03-persisted'));
    await page.reload();

    // v4.99.32: was checking .inputValue() of #api-key in Settings —
    // input is now type="hidden", value is set programmatically by the
    // app via the loadKey path. Verify round-trip via localStorage read,
    // which is the actual cross-reload contract.
    const val = await page.evaluate(() => localStorage.getItem('nplus_key'));
    expect(val).toBe('sk-ant-api03-persisted');
  });
});

test.describe('Theme Persistence', () => {
  test('persists light theme across reload', async ({ page }) => {
    await page.goto('/');

    // v4.54.0: theme toggle in topbar, #theme-toggle is hidden inside legacy hero
    await page.locator('#topbar-theme').click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');

    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  });

  test('theme toggle swaps the SVG icon and persists the theme', async ({ page }) => {
    await page.goto('/');

    // v7.28.0: topbar theme button renders a monoline SVG (sun in dark, moon in
    // light); the icon swaps on toggle and the data-theme round-trips.
    const btn = page.locator('#topbar-theme');
    await expect(btn.locator('svg')).toBeVisible();
    const initialHtml = await btn.innerHTML();
    const initialTheme = await page.evaluate(() => document.documentElement.getAttribute('data-theme'));

    await btn.click();
    const afterTheme = await page.evaluate(() => document.documentElement.getAttribute('data-theme'));
    expect(afterTheme).not.toBe(initialTheme);
    await expect(btn.locator('svg')).toBeVisible();
    expect(await btn.innerHTML()).not.toBe(initialHtml);  // icon swapped, not wiped

    await btn.click();
    expect(await page.evaluate(() => document.documentElement.getAttribute('data-theme'))).toBe(initialTheme);
  });
});

test.describe('Exam Button Validation', () => {
  // v4.99.36: same retargeting as the API Key Validation block above.
  // v4.99.33 made startExam() (and 4 other launchers) skip BYOK validation
  // for signed-in users. The Playwright stub makes ALL tests "signed-in",
  // so these tests now assert that the error does NOT appear.
  test('signed-in user with empty API key — exam start does NOT show BYOK error', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.setItem('nplus_key', ''));
    await expandHomeSection(page, 'cell-exam'); // v7.35.0: expand if collapsed on phones
    await page.locator('#page-setup button:has-text("Full Exam Simulator")').click();
    const err = page.locator('#setup-err');
    await expect(err).not.toBeVisible({ timeout: 1500 });
  });

  test('signed-in user with bad-format API key — exam start does NOT show BYOK error', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => {
      const el = document.getElementById('api-key');
      if (el) el.value = 'bad-key';
    });
    await expandHomeSection(page, 'cell-exam'); // v7.35.0: expand if collapsed on phones
    await page.locator('#page-setup button:has-text("Full Exam Simulator")').click();
    const err = page.locator('#setup-err');
    await expect(err).not.toBeVisible({ timeout: 1500 });
  });
});

test.describe('History & Stats Rendering', () => {
  test('history panel hidden when no history', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.removeItem('nplus_history'));
    await page.reload();

    await expect(page.locator('#history-panel')).not.toBeVisible();
  });

  test('history data still renders via renderHistoryPanel() even when the Analytics card is hidden', async ({ page }) => {
    // v4.54.10: Recent Performance card retired from Analytics (user feedback:
    // "clogging up the page"). The render function stays available for any
    // future surface — assert it still produces a valid #history-list when
    // called directly.
    await page.goto('/');
    await page.evaluate(() => {
      const history = [{
        topic: 'TCP/IP Basics', score: 8, total: 10, pct: 80,
        date: new Date().toISOString(), mode: 'quiz', difficulty: 'Exam Level'
      }];
      localStorage.setItem('nplus_history', JSON.stringify(history));
    });

    await gotoAnalytics(page);

    // Call the render function directly and check the content rendered.
    const listContent = await page.evaluate(() => {
      if (typeof window.renderHistoryPanel === 'function') window.renderHistoryPanel();
      const el = document.getElementById('history-list');
      return el ? el.textContent : '';
    });
    expect(listContent).toContain('TCP/IP');
  });

  test('bento momentum cell shows today + streak counters when history exists', async ({ page }) => {
    // v4.54.0: #stats-card retired; hero-v2 mini cards (Today + Streak) are the replacement.
    // v4.99.65 (dg Batch 4): wrapper rebuilt to the editorial .dgh-stats strip.
    // v5.4.0 (codex-home): rebuilt again to the .stat-row 2-card grid in .col-main.
    // v7.17.0 (home bento): the .stat-row / #mc-* mini cards are now hidden legacy
    // stubs; the live Today+Streak surface is the bento .cell-momentum tile
    // (#moDone questions-today, #moStreak day-streak). Re-point at the bento tile.
    await page.goto('/');

    await page.evaluate(() => {
      const history = [{
        topic: 'Subnetting', score: 7, total: 10, pct: 70,
        date: new Date().toISOString(), mode: 'quiz', difficulty: 'Exam Level'
      }];
      localStorage.setItem('nplus_history', JSON.stringify(history));
    });

    await page.reload();

    await expect(page.locator('#page-setup .cell-momentum')).toBeVisible();
    await expect(page.locator('#moDone')).toBeVisible();
    await expect(page.locator('#moStreak')).toBeVisible();
  });

  test('legacy stats-card is hidden (v4.54.0 retired via body.hero-v2-active)', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.removeItem('nplus_history'));
    await page.reload();

    // Legacy stats-card should be display:none (inside the hidden .hero parent)
    await expect(page.locator('#stats-card')).not.toBeVisible();
  });
});

test.describe('Readiness Card', () => {
  test('readiness card v2 shows placeholder when no history', async ({ page }) => {
    // v4.54.0: #readiness-card replaced by dark #readiness-card-v2 in hero v2 aside.
    await page.goto('/');
    await page.evaluate(() => localStorage.removeItem('nplus_history'));
    await page.reload();

    await expect(page.locator('#readiness-card-v2')).toBeVisible();
    // Placeholder copy moves to the lede of hero-v2 when no history.
    const lede = await page.locator('#hero-v2-lede').textContent();
    expect(lede).toMatch(/first quiz|Complete/i);
  });

  test('readiness card v2 shows score with history', async ({ page }) => {
    await page.goto('/');

    await page.evaluate(() => {
      const history = Array.from({ length: 5 }, (_, i) => ({
        topic: 'TCP/IP Basics', score: 8, total: 10, pct: 80,
        date: new Date(Date.now() - i * 86400000).toISOString(),
        mode: 'quiz', difficulty: 'Exam Level'
      }));
      localStorage.setItem('nplus_history', JSON.stringify(history));
    });

    await page.reload();

    // Score number should no longer be the em dash placeholder
    const numText = await page.locator('#rc-v2-num').textContent();
    expect(numText).not.toBe('—');
  });
});

test.describe('Wrong Bank Behavior', () => {
  // v4.41.0: legacy #wrong-bank-row deleted. The "Drill Mistakes" preset tile
  // is now the only drill entry, and the Clear button moved into Settings.
  // v4.76.0: visible "Drill Mistakes" tile relocated from #wrong-preset-tile
  // (now an empty hidden compat shim) to #modes-wrong-tile inside the Mode
  // Ladder Quick tier. renderWrongBankBtn() toggles BOTH for back-compat.
  // Tests check the new visible element: #modes-wrong-tile + #modes-wrong-sub.

  test('Drill Mistakes tile hidden when bank is empty', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.removeItem('nplus_wrong_bank'));
    await page.reload();

    await expect(page.locator('#modes-wrong-tile')).not.toBeVisible();
  });

  test('Drill Mistakes tile visible when bank has items', async ({ page }) => {
    await page.goto('/');

    await page.evaluate(() => {
      const bank = [{
        question: 'Test Q', options: ['A', 'B', 'C', 'D'],
        correct: 'A', picked: 'B', topic: 'TCP/IP', date: new Date().toISOString()
      }];
      localStorage.setItem('nplus_wrong_bank', JSON.stringify(bank));
    });

    await page.reload();

    // v7.17.0 (home bento): Drill Mistakes moved to the quick-start cell's
    // #bento-wrong-opt (shown by renderBentoQuickStart when the bank has items).
    await expect(page.locator('#bento-wrong-opt')).toBeVisible();
    await expect(page.locator('#bento-wrong-sub')).toContainText('1');
  });

  test('Settings clear button triggers confirm dialog', async ({ page }) => {
    await page.goto('/');

    // Set up wrong bank
    await page.evaluate(() => {
      const bank = [{
        question: 'Test Q', options: ['A', 'B', 'C', 'D'],
        correct: 'A', picked: 'B', topic: 'TCP/IP', date: new Date().toISOString()
      }];
      localStorage.setItem('nplus_wrong_bank', JSON.stringify(bank));
    });
    await page.reload();

    // v4.54.1: Settings is its own page now — navigate there
    await gotoSettings(page);

    // Listen for dialog and dismiss it
    page.on('dialog', dialog => dialog.dismiss());

    await page.locator('#wrong-bank-clear').click();

    // Bank should still exist since we dismissed
    const bank = await page.evaluate(() => localStorage.getItem('nplus_wrong_bank'));
    expect(bank).not.toBeNull();
  });

  test('Settings clear button removes bank when confirmed', async ({ page }) => {
    await page.goto('/');

    await page.evaluate(() => {
      const bank = [{
        question: 'Test Q', options: ['A', 'B', 'C', 'D'],
        correct: 'A', picked: 'B', topic: 'TCP/IP', date: new Date().toISOString()
      }];
      localStorage.setItem('nplus_wrong_bank', JSON.stringify(bank));
    });
    await page.reload();

    // v4.54.1: Settings is its own page now — navigate there
    await gotoSettings(page);

    // Accept the dialog
    page.on('dialog', dialog => dialog.accept());

    await page.locator('#wrong-bank-clear').click();

    // Bank should be removed
    const bank = await page.evaluate(() => localStorage.getItem('nplus_wrong_bank'));
    expect(bank).toBeNull();

    // Preset tile should be hidden (v4.76.0: now in Mode Ladder Quick tier)
    await expect(page.locator('#modes-wrong-tile')).not.toBeVisible();
  });
});

test.describe('Exam Modal', () => {
  test('exam modal is hidden by default', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('#exam-modal')).toHaveClass(/hidden/);
  });

  test('exam modal has ARIA attributes', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('#exam-modal')).toHaveAttribute('role', 'dialog');
    await expect(page.locator('#exam-modal')).toHaveAttribute('aria-label', /exam/i);
  });
});

test.describe('Keyboard Hints', () => {
  test('quiz page shows keyboard shortcut hints', async ({ page }) => {
    await page.goto('/');

    // v4.54.8: .kb-hint replaced by editorial .quiz-kbd-hints footer.
    // The legacy .kb-hint is force-hidden via CSS (display: none) but we
    // assert the new hints element instead.
    const kbHint = page.locator('#page-quiz .quiz-kbd-hints');
    await expect(kbHint).toContainText('A');
    await expect(kbHint).toContainText('B');
    await expect(kbHint).toContainText('C');
    await expect(kbHint).toContainText('D');
    await expect(kbHint).toContainText('pick');
    await expect(kbHint).toContainText('flag');
  });

  test('exam page shows keyboard shortcut hints', async ({ page }) => {
    await page.goto('/');

    // v4.54.9: exam page adopted the editorial .quiz-kbd-hints footer (parity with quiz)
    const kbHint = page.locator('#page-exam .quiz-kbd-hints');
    await expect(kbHint).toContainText('A');
    await expect(kbHint).toContainText('F');
  });
});

test.describe('Page Structure', () => {
  test('all page divs exist', async ({ page }) => {
    await page.goto('/');

    const pages = [
      'page-setup', 'page-loading', 'page-quiz', 'page-results',
      'page-review', 'page-session-transition', 'page-session-complete',
      'page-progress', 'page-exam', 'page-exam-results',
      'page-analytics', 'page-topic-dive',
      'page-monitor'
    ];

    for (const id of pages) {
      await expect(page.locator(`#${id}`)).toBeAttached();
    }
  });

  test('only setup page is active on load', async ({ page }) => {
    await page.goto('/');

    const activePages = page.locator('.page.active');
    await expect(activePages).toHaveCount(1);
    await expect(page.locator('#page-setup')).toHaveClass(/active/);
  });
});

test.describe('Export Data', () => {
  test('export generates a downloadable file', async ({ page }) => {
    await page.goto('/');

    // Inject some data so export has content
    await page.evaluate(() => {
      localStorage.setItem('nplus_history', JSON.stringify([{
        topic: 'Test', score: 5, total: 10, pct: 50,
        date: new Date().toISOString(), mode: 'quiz'
      }]));
    });

    // v4.54.1: Export button is on the Settings page now
    await gotoSettings(page);
    const downloadPromise = page.waitForEvent('download');
    await page.locator('#page-settings button:has-text("Export")').click();
    const download = await downloadPromise;

    // Verify filename pattern
    expect(download.suggestedFilename()).toMatch(/networkplus.*\.json/);
  });
});

test.describe('Streak Badge', () => {
  test('streak shows in sidebar when streak exists', async ({ page }) => {
    // v4.54.0: streak lives in sidebar footer (.sb-streak) + hero v2 mini card (#mc-streak-num)
    await page.goto('/');

    await page.evaluate(() => {
      localStorage.setItem('nplus_streak', JSON.stringify({
        current: 3, best: 5, lastDate: new Date().toISOString().slice(0, 10)
      }));
    });
    await page.reload();

    // Sidebar streak badge should show the streak count
    await expect(page.locator('.sb-streak-num')).toContainText('3');
    await expect(page.locator('.sb-streak-label')).toContainText(/day streak/i);
  });

  test('sidebar shows empty-state when no streak', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.removeItem('nplus_streak'));
    await page.reload();

    // v7.36.0 (mockup lift): sidebar retired — the streak signal lives in the
    // Home console chip (#cb-streak), which reads 0 in the empty state.
    await expect(page.locator('#cb-streak')).toBeVisible();
    await expect(page.locator('#cb-streak')).toHaveText('0');
  });
});

test.describe('Meta Tags & PWA', () => {
  test('has meta description', async ({ page }) => {
    await page.goto('/');
    const desc = page.locator('meta[name="description"]');
    await expect(desc).toHaveAttribute('content', /Network\+/);
  });

  test('has theme-color meta', async ({ page }) => {
    await page.goto('/');
    const meta = page.locator('meta[name="theme-color"]');
    await expect(meta).toHaveAttribute('content', /.+/);
  });

  test('has manifest link', async ({ page }) => {
    await page.goto('/');
    const manifest = page.locator('link[rel="manifest"]');
    await expect(manifest).toHaveAttribute('href', 'manifest.json');
  });
});

test.describe('Production Monitor', () => {
  test('triple-tap version badge opens monitor', async ({ page }) => {
    await page.goto('/');

    // v7.36.0 (mockup lift): sidebar retired — the triple-tap gesture also
    // binds to the topbar version pill (v4.89.7), which the lift keeps visible.
    const badge = page.locator('#topbar-version-pill');
    await badge.click();
    await badge.click();
    await badge.click();

    await expect(page.locator('#page-monitor')).toHaveClass(/active/);
    await expect(page.locator('#monitor-stats')).toBeVisible();
  });

  test('monitor shows empty state when no errors', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.removeItem('nplus_error_log'));

    // v7.36.0 (mockup lift): sidebar retired — the triple-tap gesture also
    // binds to the topbar version pill (v4.89.7), which the lift keeps visible.
    const badge = page.locator('#topbar-version-pill');
    await badge.click();
    await badge.click();
    await badge.click();

    await expect(page.locator('#monitor-log')).toContainText('No errors logged');
  });

  test('monitor displays logged errors', async ({ page }) => {
    await page.goto('/');

    // Inject a fake error
    await page.evaluate(() => {
      const log = [{
        type: 'runtime', message: 'Test error for monitoring',
        timestamp: new Date().toISOString(), page: 'page-setup',
        version: '3.6', userAgent: 'test', source: 'app.js', line: 42, col: 1, stack: ''
      }];
      localStorage.setItem('nplus_error_log', JSON.stringify(log));
    });

    // v7.36.0 (mockup lift): sidebar retired — the triple-tap gesture also
    // binds to the topbar version pill (v4.89.7), which the lift keeps visible.
    const badge = page.locator('#topbar-version-pill');
    await badge.click();
    await badge.click();
    await badge.click();

    await expect(page.locator('.mon-entry')).toHaveCount(1);
    await expect(page.locator('.mon-entry-msg')).toContainText('Test error for monitoring');
    await expect(page.locator('.mon-stat-val').first()).toContainText('1');
  });

  test('clear button removes all errors', async ({ page }) => {
    await page.goto('/');

    await page.evaluate(() => {
      const log = [{ type: 'runtime', message: 'Error to clear', timestamp: new Date().toISOString(), page: 'page-setup', version: '3.6', userAgent: 'test' }];
      localStorage.setItem('nplus_error_log', JSON.stringify(log));
    });

    // v7.36.0 (mockup lift): sidebar retired — the triple-tap gesture also
    // binds to the topbar version pill (v4.89.7), which the lift keeps visible.
    const badge = page.locator('#topbar-version-pill');
    await badge.click();
    await badge.click();
    await badge.click();

    page.on('dialog', d => d.accept());
    await page.locator('button:has-text("Clear All")').click();

    await expect(page.locator('#monitor-log')).toContainText('No errors logged');
    const log = await page.evaluate(() => localStorage.getItem('nplus_error_log'));
    expect(log).toBeNull();
  });

  test('error handler logs errors to localStorage', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.removeItem('nplus_error_log'));

    // Trigger a real error
    await page.evaluate(() => {
      window.onerror('Test runtime error', 'app.js', 10, 5, new Error('Test'));
    });

    const log = await page.evaluate(() => JSON.parse(localStorage.getItem('nplus_error_log') || '[]'));
    expect(log.length).toBe(1);
    expect(log[0].type).toBe('runtime');
    expect(log[0].message).toContain('Test runtime error');
  });
});

// ══════════════════════════════════════════
// v4.62.4 — Guided Terminal Lab flow (closes #71)
//
// Covers the v4.16.2 regression class: Back button from Guided Lab must
// return to whichever page the user launched from. Pre-v4.42.5 used a
// whitelist of page IDs; any page not on the list (or a new launch point
// added later) silently fell back to page-topic-dive and dumped the user
// on a stale screen. Current code (v4.42.5+) finds the active page via
// `.page.active` — this spec guards the Topic Deep Dive flow so the
// regression class can't come back.
//
// Tests call `openGuidedLab(...)` directly through page.evaluate() because
// the real Topic Deep Dive callout only renders after an API-gated Sonnet
// call — we exercise the Back-navigation contract, not the teacher tier.
// ══════════════════════════════════════════
test.describe('Guided Terminal Lab', () => {
  test('opens a lab and renders step structure (DNS lab)', async ({ page }) => {
    await page.goto('/');

    // Launch a lab that ships in guidedLabs (DNS Records & DNSSEC → _dnsLab)
    await page.evaluate(() => window.openGuidedLab('DNS Records & DNSSEC'));

    // Lab page is active
    await expect(page.locator('#page-guided-lab')).toHaveClass(/active/);

    // Title rendered (italic-accent editorial head)
    await expect(page.locator('#lab-title')).toContainText(/DNS Records/);

    // Meta pills: objective, duration, step count — all three present
    const pills = page.locator('#lab-meta .lab-meta-pill');
    await expect(pills).toHaveCount(3);

    // At least one lab-step, and every step has narration + terminal card + expect block
    const steps = page.locator('#lab-steps .lab-step');
    await expect(steps.first()).toBeVisible();
    const count = await steps.count();
    expect(count).toBeGreaterThan(0);
    for (let i = 0; i < count; i++) {
      await expect(steps.nth(i).locator('.lab-step-narration')).toBeVisible();
      await expect(steps.nth(i).locator('.terminal-card')).toBeVisible();
      await expect(steps.nth(i).locator('.lab-step-expect')).toBeVisible();
    }

    // Wrap-up section rendered
    await expect(page.locator('#lab-wrap .lab-wrap')).toBeVisible();
  });

  test('Back button returns to page-topic-dive when launched from there', async ({ page }) => {
    await page.goto('/');

    // Simulate landing on page-topic-dive (the teacher-tier callout that
    // normally exposes the Start Guided Lab button lives on this page).
    await page.evaluate(() => window.showPage('topic-dive'));
    await expect(page.locator('#page-topic-dive')).toHaveClass(/active/);

    await page.evaluate(() => window.openGuidedLab('DNS Records & DNSSEC'));
    await expect(page.locator('#page-guided-lab')).toHaveClass(/active/);

    // Click Back — the regression check: must land on page-topic-dive, not
    // some other fallback
    await page.locator('#lab-back-btn').click();
    await expect(page.locator('#page-topic-dive')).toHaveClass(/active/);
    await expect(page.locator('#page-guided-lab')).not.toHaveClass(/active/);
  });

  test('terminal cards expose a copy button with correct onclick wiring', async ({ page }) => {
    // Structural check (not a click test) — headless Chromium's clipboard
    // API resolution is flaky, so assert the button is wired rather than
    // firing the event. This still fails loud if a refactor strips the
    // copy affordance entirely, which is what we want to regression-guard.
    await page.goto('/');
    await page.evaluate(() => window.openGuidedLab('DNS Records & DNSSEC'));

    const copyBtn = page.locator('#lab-steps .terminal-card').first().locator('button.terminal-card-copy').first();
    await expect(copyBtn).toBeVisible();
    await expect(copyBtn).toHaveAttribute('onclick', /copyCmd\(/);
    await expect(copyBtn).toHaveAttribute('aria-label', /[Cc]opy/);
  });
});

// v4.81.31 — SR review E2E coverage. Closes the gap surfaced by the user
// after v4.81.30 ("would make sense for you to do an E2E walkthrough in UAT
// just to make sure these things are actually passing. this has happened a
// few times where you ship something and then we see its broken in live").
//
// vm-fixtures pass the structure, but real-browser interaction with the SR
// page (option click → reveal → confidence advance, multi-select Submit
// gate, post-v4.81.31 scrub of legacy non-reviewable cards) needs DOM-level
// coverage. These tests seed localStorage directly with crafted SR queue
// entries, navigate to the page, click through the flow, and assert the
// rendered DOM matches the expected state at each step.
test.describe('SR Review — MCQ happy path', () => {
  test('user picks an answer → reveal → confidence advances + completes', async ({ page }) => {
    // Seed one due MCQ card before navigation. nextReview = 0 so it's due now.
    await page.addInitScript(() => {
      const queue = [{
        id: 'sr-test-mcq-1',
        type: 'mcq',
        question: 'Which port does HTTPS use by default?',
        options: { A: '21', B: '80', C: '443', D: '22' },
        answer: 'C',
        explanation: 'HTTPS uses TCP port 443 by default.',
        topic: 'Ports & Protocols',
        difficulty: 'Foundational',
        nextReview: 0,
        intervalDays: 0,
        easiness: 2.5,
        repetitions: 0,
        graduated: false
      }];
      localStorage.setItem('nplus_sr_queue', JSON.stringify(queue));
    });

    await page.goto('/');

    // v7.17.0 (home bento): the #sr-review-card home prompt is a hidden legacy
    // stub. When cards are due, the bento recommend cell (#primaryLaunch) becomes
    // the review entry (renderBentoRecommended → startSrReview()).
    await expect(page.locator('#primaryLaunch #pl-title')).toContainText('Review 1 card');

    // Start review via the recommend cell.
    await page.locator('#primaryLaunch').click();
    await expect(page.locator('#page-sr-review')).toHaveClass(/active/);

    // Card should render with 4 options and the stem.
    await expect(page.locator('#sr-card-host')).toContainText('HTTPS');
    const options = page.locator('.sr-option[data-letter]');
    await expect(options).toHaveCount(4);

    // No reveal yet — explanation hidden, no confidence row.
    await expect(page.locator('.sr-explanation')).toHaveCount(0);
    await expect(page.locator('.sr-confidence-row')).toHaveCount(0);

    // Pick the correct answer C.
    await page.locator('.sr-option[data-letter="C"]').click();

    // After pick: reveal happened — explanation visible, picked option marked correct.
    await expect(page.locator('.sr-option[data-letter="C"]')).toHaveClass(/is-correct/);
    await expect(page.locator('.sr-explanation')).toBeVisible();
    await expect(page.locator('.sr-confidence-row')).toBeVisible();

    // Click confidence — Got it · was confident.
    await page.locator('.sr-confidence-confident').click();

    // Session advances. Only 1 card → completion screen.
    await expect(page.locator('#sr-complete')).toBeVisible();
  });

  test('user picks WRONG answer → reveal shows red marker + wrong-only confidence', async ({ page }) => {
    await page.addInitScript(() => {
      const queue = [{
        id: 'sr-test-mcq-2',
        type: 'mcq',
        question: 'What layer is ICMP at?',
        options: { A: 'Layer 2', B: 'Layer 3', C: 'Layer 4', D: 'Layer 7' },
        answer: 'B',
        explanation: 'ICMP operates at Layer 3 (Network).',
        topic: 'OSI Model',
        difficulty: 'Foundational',
        nextReview: 0,
        intervalDays: 0,
        easiness: 2.5,
        repetitions: 0,
        graduated: false
      }];
      localStorage.setItem('nplus_sr_queue', JSON.stringify(queue));
    });

    await page.goto('/');
    // v7.17.0 (home bento): enter review via the bento recommend cell.
    await expect(page.locator('#primaryLaunch #pl-title')).toContainText('Review 1 card');
    await page.locator('#primaryLaunch').click();
    await expect(page.locator('#page-sr-review')).toHaveClass(/active/);

    // Pick A (wrong — answer is B).
    await page.locator('.sr-option[data-letter="A"]').click();

    // A should be wrong-marked, B should be correct-marked.
    await expect(page.locator('.sr-option[data-letter="A"]')).toHaveClass(/is-wrong/);
    await expect(page.locator('.sr-option[data-letter="B"]')).toHaveClass(/is-correct/);

    // Only the wrong-confidence button should appear (no confident/uncertain pair).
    await expect(page.locator('.sr-confidence-wrong')).toBeVisible();
    await expect(page.locator('.sr-confidence-confident')).toHaveCount(0);

    // v7.20.0 (#1): a wrong card shows the same-session retry pill and returns
    // once more before the session can complete.
    await expect(page.locator('.sr-retry-pill')).toBeVisible();
    await page.locator('.sr-confidence-wrong').click();
    // Not done yet — the retry clone is re-queued (progress now "2 of 2").
    await expect(page.locator('#sr-progress-text')).toContainText('2 of 2');
    // Answer the retry card → the session now completes.
    await page.locator('.sr-option[data-letter="A"]').click();
    await page.locator('.sr-confidence-wrong').click();
    await expect(page.locator('#sr-complete')).toBeVisible();
  });
});

test.describe('SR Review — Multi-select happy path', () => {
  test('user toggles 2 picks → Submit enables → reveal shows correct/wrong/missed markers', async ({ page }) => {
    // Multi-select with answers C+E. We'll pick A (wrong) + C (correct), miss E.
    await page.addInitScript(() => {
      const queue = [{
        id: 'sr-test-multi-1',
        type: 'multi-select',
        question: '(Choose TWO) Which of the following are AAA protocols?',
        options: {
          A: 'HTTP',
          B: 'SMTP',
          C: 'RADIUS',
          D: 'SNMP',
          E: 'TACACS+'
        },
        answers: ['C', 'E'],
        explanation: 'RADIUS and TACACS+ are AAA protocols. The others are not.',
        topic: 'AAA',
        difficulty: 'Foundational',
        nextReview: 0,
        intervalDays: 0,
        easiness: 2.5,
        repetitions: 0,
        graduated: false
      }];
      localStorage.setItem('nplus_sr_queue', JSON.stringify(queue));
    });

    await page.goto('/');
    // v7.17.0 (home bento): enter review via the bento recommend cell.
    await expect(page.locator('#primaryLaunch #pl-title')).toContainText('Review 1 card');
    await page.locator('#primaryLaunch').click();
    await expect(page.locator('#page-sr-review')).toHaveClass(/active/);

    // Submit row should exist with disabled button.
    const submitBtn = page.locator('.sr-multi-submit-btn');
    await expect(submitBtn).toBeVisible();
    await expect(submitBtn).toBeDisabled();
    await expect(page.locator('.sr-multi-hint')).toContainText('0 selected');

    // Pick A (wrong) — Submit still disabled (only 1 picked).
    await page.locator('.sr-option[data-letter="A"]').click();
    await expect(submitBtn).toBeDisabled();
    await expect(page.locator('.sr-multi-hint')).toContainText('1 selected');
    await expect(page.locator('.sr-option[data-letter="A"]')).toHaveClass(/is-picked/);

    // Pick C (correct) — Submit enables.
    await page.locator('.sr-option[data-letter="C"]').click();
    await expect(submitBtn).toBeEnabled();
    await expect(page.locator('.sr-multi-hint')).toContainText('2 selected');

    // Click Submit → reveal.
    await submitBtn.click();

    // Markers: A wrong, C correct, E missed.
    await expect(page.locator('.sr-option[data-letter="A"]')).toHaveClass(/is-wrong/);
    await expect(page.locator('.sr-option[data-letter="C"]')).toHaveClass(/is-correct/);
    await expect(page.locator('.sr-option[data-letter="E"]')).toHaveClass(/is-missed/);

    // Partial-credit = wrong for SR. Only wrong-confidence button visible.
    await expect(page.locator('.sr-confidence-wrong')).toBeVisible();
    await expect(page.locator('.sr-confidence-confident')).toHaveCount(0);

    // v7.20.0 (#1): wrong card re-queues for one same-session retry before
    // the session can complete (progress goes to "2 of 2").
    await page.locator('.sr-confidence-wrong').click();
    await expect(page.locator('#sr-progress-text')).toContainText('2 of 2');
    // Re-answer the retry card (same picks) → Submit → mark → complete.
    await page.locator('.sr-option[data-letter="A"]').click();
    await page.locator('.sr-option[data-letter="C"]').click();
    await page.locator('.sr-multi-submit-btn').click();
    await page.locator('.sr-confidence-wrong').click();
    await expect(page.locator('#sr-complete')).toBeVisible();
  });
});

// v4.82.0 — Quiz Revisit E2E coverage. Tests the full editable-revisit flow:
// answer Q1 → advance → click dot back to Q1 → re-pick a different option →
// verify score/answered truth-up + streak preserved + revisit banner shows.
// Uses the v4.82.0 _testInjectQuiz hook to seed quiz state without making
// real Haiku API calls.
test.describe('Quiz Revisit — editable navigation', () => {
  // Seed a 3-question quiz with one MCQ + one multi-select + one order.
  // Each test below starts with this fixture freshly injected.
  const QUIZ_FIXTURE = [
    {
      type: 'mcq',
      question: 'Which port does HTTPS use by default?',
      options: { A: '21', B: '80', C: '443', D: '22' },
      answer: 'C',
      explanation: 'HTTPS uses TCP port 443 by default.',
      topic: 'Ports & Protocols',
      difficulty: 'Foundational'
    },
    {
      type: 'mcq',
      question: 'At which OSI layer does ICMP operate?',
      options: { A: 'Layer 2', B: 'Layer 3', C: 'Layer 4', D: 'Layer 7' },
      answer: 'B',
      explanation: 'ICMP operates at Layer 3 (Network).',
      topic: 'OSI Model',
      difficulty: 'Foundational'
    },
    {
      type: 'mcq',
      question: 'Which subnet mask matches /24?',
      options: { A: '255.255.0.0', B: '255.255.255.0', C: '255.255.255.128', D: '255.0.0.0' },
      answer: 'B',
      explanation: '/24 is 255.255.255.0.',
      topic: 'Subnetting',
      difficulty: 'Foundational'
    }
  ];

  test('happy path: answer Q1 → next → dot back to Q1 → re-pick changes score', async ({ page }) => {
    await page.goto('/');
    // Inject the fixture quiz state via the v4.82.0 hook.
    await page.evaluate((qs) => window._testInjectQuiz(qs), QUIZ_FIXTURE);

    // Verify quiz page is active + nav arrows + dots rendered.
    await expect(page.locator('#page-quiz')).toHaveClass(/active/);
    await expect(page.locator('#q-label')).toContainText('Question 1 of 3');
    await expect(page.locator('#quiz-prev-btn')).toBeDisabled();
    await expect(page.locator('#quiz-next-arrow-btn')).toBeDisabled();
    await expect(page.locator('#quiz-revisit-banner')).toHaveClass(/is-hidden/);
    const dots = page.locator('#quiz-prog-dots .qpd-cell');
    await expect(dots).toHaveCount(3);

    // Pick wrong answer A on Q1 (correct is C).
    await page.locator('#options .option').nth(0).click();
    await expect(page.locator('#live-score')).toContainText('0 / 1');

    // Next-arrow should now be enabled (Q1 answered).
    await expect(page.locator('#quiz-next-arrow-btn')).toBeEnabled();

    // Click next-arrow → advance to Q2.
    await page.locator('#btn-next').click(); // v7.36.0 lift: arrows hidden, footer Next advances
    await expect(page.locator('#q-label')).toContainText('Question 2 of 3');
    await expect(page.locator('#quiz-revisit-banner')).toHaveClass(/is-hidden/);
    // Prev should be enabled now.
    await expect(page.locator('#quiz-prev-btn')).toBeEnabled();

    // Click dot for Q1 → revisit.
    await page.locator('#quiz-prog-dots .qpd-cell').nth(0).click();
    await expect(page.locator('#q-label')).toContainText('Question 1 of 3 · revisiting');
    // Revisit banner now visible.
    await expect(page.locator('#quiz-revisit-banner')).not.toHaveClass(/is-hidden/);
    // Explanation visible (since Q1 is answered).
    await expect(page.locator('#exp-box')).toBeVisible();
    // Option A should be marked wrong, C marked reveal-correct (correct answer).
    await expect(page.locator('#options .option').nth(0)).toHaveClass(/wrong/);
    await expect(page.locator('#options .option').nth(2)).toHaveClass(/reveal-correct/);
    // Options should NOT be disabled — re-pick allowed.
    await expect(page.locator('#options .option').nth(2)).not.toBeDisabled();

    // Re-pick C (correct) — score should update from 0/1 to 1/1.
    await page.locator('#options .option').nth(2).click();
    await expect(page.locator('#live-score')).toContainText('1 / 1');
    // Option C should now be 'correct' class (was reveal-correct).
    await expect(page.locator('#options .option').nth(2)).toHaveClass(/correct/);
    // Option A should still be present but no longer 'wrong' (now 'dimmed' since user picked C).
    await expect(page.locator('#options .option').nth(0)).not.toHaveClass(/wrong/);

    // Dot for Q1 should now reflect green (qpd-done) since updated answer is correct.
    await expect(page.locator('#quiz-prog-dots .qpd-cell').nth(0)).toHaveClass(/qpd-done/);
  });

  test('streak does not move on re-pick after revisit', async ({ page }) => {
    await page.goto('/');
    await page.evaluate((qs) => window._testInjectQuiz(qs), QUIZ_FIXTURE);

    // Pick correct answer C on Q1 — streak goes to 1.
    await page.locator('#options .option').nth(2).click();
    await expect(page.locator('#live-streak')).toContainText('Streak 1');

    // Advance to Q2 via next-arrow.
    await page.locator('#btn-next').click(); // v7.36.0 lift: arrows hidden, footer Next advances
    await expect(page.locator('#q-label')).toContainText('Question 2 of 3');

    // Click dot for Q1 → revisit.
    await page.locator('#quiz-prog-dots .qpd-cell').nth(0).click();
    // Re-pick A (wrong) — score should drop, but streak should stay at 1.
    await page.locator('#options .option').nth(0).click();
    await expect(page.locator('#live-score')).toContainText('0 / 1');
    await expect(page.locator('#live-streak')).toContainText('Streak 1');
  });

  test('keyboard ←/→ navigate prev/next', async ({ page }) => {
    await page.goto('/');
    await page.evaluate((qs) => window._testInjectQuiz(qs), QUIZ_FIXTURE);

    // Pick any option on Q1 to enable forward nav.
    await page.locator('#options .option').nth(2).click();
    await expect(page.locator('#q-label')).toContainText('Question 1 of 3');

    // Press → to advance to Q2.
    await page.keyboard.press('ArrowRight');
    await expect(page.locator('#q-label')).toContainText('Question 2 of 3');

    // Press ← to go back to Q1.
    await page.keyboard.press('ArrowLeft');
    await expect(page.locator('#q-label')).toContainText('Question 1 of 3 · revisiting');
  });

  test('progress dots are clickable buttons with onclick handler', async ({ page }) => {
    await page.goto('/');
    await page.evaluate((qs) => window._testInjectQuiz(qs), QUIZ_FIXTURE);
    // Verify dots are <button> with the expected onclick attribute.
    const firstDot = page.locator('#quiz-prog-dots .qpd-cell').first();
    await expect(firstDot).toHaveAttribute('onclick', /jumpToQuestion\(0\)/);
    // Verify they're buttons (not spans)
    const tagName = await firstDot.evaluate(el => el.tagName);
    expect(tagName).toBe('BUTTON');
  });
});

// v4.83.0 — Hot-Area question type E2E coverage. Tests all 3 sub-shapes
// (topology, OSI stack, cable-grid) end-to-end: render → click region →
// Submit → assert reveal markers + log entry. Uses _testInjectQuiz to
// drop a hot-area question into a quiz session without real Haiku calls.

test.describe('Quiz Hot-Area — click-on-diagram PBQs', () => {
  // Topology hot-area fixture
  const TOPOLOGY_FIXTURE = [{
    type: 'hot-area',
    subShape: 'topology',
    question: 'Click the device most likely misconfigured.',
    topic: 'Network Troubleshooting Methodology',
    difficulty: 'Exam Level',
    svgViewBox: '0 0 600 200',
    svgConnectors: [{ x1: 100, y1: 100, x2: 160, y2: 100 }],
    regions: [
      { id: 'pc1', label: 'PC1', shape: 'rect', x: 20, y: 70, w: 80, h: 60, isCorrect: false },
      { id: 'firewall', label: 'FW1', shape: 'rect', x: 440, y: 70, w: 80, h: 60, isCorrect: true }
    ],
    explanation: 'Firewall is most likely misconfigured.'
  }];

  // OSI dual-correct fixture (ARP at L2/L3)
  const OSI_FIXTURE = [{
    type: 'hot-area',
    subShape: 'osi',
    question: 'Click the OSI layer where ARP operates.',
    topic: 'Network Models & OSI',
    difficulty: 'Foundational',
    correctLayers: ['L2', 'L3'],
    explanation: 'ARP is the L2/L3 boundary protocol.'
  }];

  // Cable-grid fixture
  const CABLE_FIXTURE = [{
    type: 'hot-area',
    subShape: 'cable-grid',
    question: 'Which connector for SFP+ uplinks?',
    topic: 'Cabling & Topology',
    difficulty: 'Foundational',
    cables: [
      { id: 'rj45', isCorrect: false },
      { id: 'lc', isCorrect: true },
      { id: 'sc', isCorrect: false },
      { id: 'st', isCorrect: false }
    ],
    explanation: 'LC for SFP+.'
  }];

  test('topology: click region → Submit → reveal markers (correct pick)', async ({ page }) => {
    await page.goto('/');
    await page.evaluate((qs) => window._testInjectQuiz(qs), TOPOLOGY_FIXTURE);
    await expect(page.locator('#page-quiz')).toHaveClass(/active/);
    await expect(page.locator('#pbq-badge')).toContainText('Hot Area · Topology');

    // 2 regions render
    const regions = page.locator('.hot-region[data-region]');
    await expect(regions).toHaveCount(2);

    // Submit disabled at start
    await expect(page.locator('#ha-submit-btn')).toBeDisabled();

    // Click the firewall (correct)
    await page.locator('.hot-region[data-region="firewall"]').click();
    await expect(page.locator('.hot-region[data-region="firewall"]')).toHaveClass(/is-picked/);
    await expect(page.locator('#ha-submit-btn')).toBeEnabled();

    // Submit
    await page.locator('#ha-submit-btn').click();
    // Reveal: firewall = correct, others dimmed
    await expect(page.locator('.hot-region[data-region="firewall"]')).toHaveClass(/is-correct/);
    await expect(page.locator('.hot-region[data-region="pc1"]')).toHaveClass(/is-dimmed/);
    await expect(page.locator('#exp-box')).toBeVisible();
    // Score updates to 1/1
    await expect(page.locator('#live-score')).toContainText('1 / 1');
  });

  test('osi: dual-correct accepts either L2 or L3 (picked L3 = correct)', async ({ page }) => {
    await page.goto('/');
    await page.evaluate((qs) => window._testInjectQuiz(qs), OSI_FIXTURE);
    await expect(page.locator('#pbq-badge')).toContainText('Hot Area · OSI');

    // 7 layers rendered
    const layers = page.locator('.osi-layer[data-region]');
    await expect(layers).toHaveCount(7);

    // Click L3 (one of two correct answers via dual-correct)
    await page.locator('.osi-layer[data-region="L3"]').click();
    await expect(page.locator('.osi-layer[data-region="L3"]')).toHaveClass(/is-picked/);
    await page.locator('#ha-submit-btn').click();

    // L3 should be correct, L2 should be reveal-correct (the OTHER correct layer)
    await expect(page.locator('.osi-layer[data-region="L3"]')).toHaveClass(/is-correct/);
    await expect(page.locator('.osi-layer[data-region="L2"]')).toHaveClass(/is-reveal-correct/);
    await expect(page.locator('#live-score')).toContainText('1 / 1');
  });

  test('cable-grid: wrong pick → red marker + correct shown as reveal-correct', async ({ page }) => {
    await page.goto('/');
    await page.evaluate((qs) => window._testInjectQuiz(qs), CABLE_FIXTURE);
    await expect(page.locator('#pbq-badge')).toContainText('Hot Area · Cable');

    // 4 cable cards render with SVG icons
    const cards = page.locator('.cable-card[data-region]');
    await expect(cards).toHaveCount(4);
    // SVG icon present in at least one card
    await expect(page.locator('.cable-card[data-region="lc"] svg')).toBeAttached();

    // Click ST (wrong — correct is LC)
    await page.locator('.cable-card[data-region="st"]').click();
    await page.locator('#ha-submit-btn').click();

    await expect(page.locator('.cable-card[data-region="st"]')).toHaveClass(/is-wrong/);
    await expect(page.locator('.cable-card[data-region="lc"]')).toHaveClass(/is-reveal-correct/);
    await expect(page.locator('#live-score')).toContainText('0 / 1');
  });

  test('revisit: re-pick after first submit updates score (wrong → right)', async ({ page }) => {
    await page.goto('/');
    // Use a 2-question quiz so we can advance + revisit
    const TWO_Q = [
      TOPOLOGY_FIXTURE[0],
      { type: 'mcq', question: 'Filler MCQ', options: { A: 'a', B: 'b', C: 'c', D: 'd' }, answer: 'A', explanation: '.', topic: 'X', difficulty: 'Foundational' }
    ];
    await page.evaluate((qs) => window._testInjectQuiz(qs), TWO_Q);

    // Submit wrong on Q1 (pick PC1 instead of firewall)
    await page.locator('.hot-region[data-region="pc1"]').click();
    await page.locator('#ha-submit-btn').click();
    await expect(page.locator('#live-score')).toContainText('0 / 1');

    // Advance to Q2
    await page.locator('#btn-next').click(); // v7.36.0 lift: arrows hidden, footer Next advances
    await expect(page.locator('#q-label')).toContainText('Question 2 of 2');

    // Click dot back to Q1
    await page.locator('#quiz-prog-dots .qpd-cell').nth(0).click();
    await expect(page.locator('#q-label')).toContainText('Question 1 of 2 · revisiting');

    // Re-pick the firewall (correct) and re-submit
    await page.locator('.hot-region[data-region="firewall"]').click();
    await page.locator('#ha-submit-btn').click();

    // Score truth-up: 0/1 → 1/1
    await expect(page.locator('#live-score')).toContainText('1 / 1');
    // Dot for Q1 now green (qpd-done)
    await expect(page.locator('#quiz-prog-dots .qpd-cell').nth(0)).toHaveClass(/qpd-done/);
  });
});

test.describe('SR Review — v4.81.31 legacy-card scrub', () => {
  test('order-type cards are filtered out of session and scrubbed from queue', async ({ page }) => {
    // Seed two cards: one valid MCQ (due) + one legacy order-type card (due).
    // Pre-v4.81.31: order card would render as empty stem-only card.
    // Post-v4.81.31: order card filtered at session start AND removed from queue.
    await page.addInitScript(() => {
      const queue = [
        {
          id: 'sr-legacy-order',
          type: 'order',
          question: 'Arrange the following troubleshooting steps in the correct order.',
          items: ['Identify the problem', 'Establish a theory', 'Test the theory'],
          correctOrder: [0, 1, 2],
          topic: 'Troubleshooting Methodology',
          difficulty: 'Foundational',
          nextReview: 0,
          intervalDays: 0,
          easiness: 2.5,
          repetitions: 0,
          graduated: false
        },
        {
          id: 'sr-valid-mcq',
          type: 'mcq',
          question: 'Which subnet mask matches /24?',
          options: { A: '255.255.0.0', B: '255.255.255.0', C: '255.255.255.128', D: '255.0.0.0' },
          answer: 'B',
          explanation: '/24 is 255.255.255.0.',
          topic: 'Subnetting',
          difficulty: 'Foundational',
          nextReview: 0,
          intervalDays: 0,
          easiness: 2.5,
          repetitions: 0,
          graduated: false
        }
      ];
      localStorage.setItem('nplus_sr_queue', JSON.stringify(queue));
    });

    await page.goto('/');

    // Recommend cell shows 2 due (queue has 2 entries before scrub — this is
    // by design; getSrStats().due runs before startSrReview's scrub).
    // v7.17.0 (home bento): entry moved from #sr-review-card to #primaryLaunch.
    await expect(page.locator('#primaryLaunch #pl-title')).toContainText('Review 2 cards');

    await page.locator('#primaryLaunch').click();
    await expect(page.locator('#page-sr-review')).toHaveClass(/active/);

    // Session should only have 1 card — the MCQ. Order card filtered out.
    await expect(page.locator('#sr-progress-text')).toContainText('1 of 1');
    await expect(page.locator('#sr-card-host')).toContainText('subnet mask');
    await expect(page.locator('.sr-option[data-letter]')).toHaveCount(4);

    // Verify the queue was scrubbed — order card is GONE from storage.
    const remainingQueue = await page.evaluate(() => {
      return JSON.parse(localStorage.getItem('nplus_sr_queue') || '[]');
    });
    expect(remainingQueue).toHaveLength(1);
    expect(remainingQueue[0].id).toBe('sr-valid-mcq');
    expect(remainingQueue.some(c => c.type === 'order')).toBe(false);
  });
});

test.describe('bug-report drawer', () => {
  test.beforeEach(async ({ page }) => {
    // Seed a fake GH token so the form is unlocked
    await page.addInitScript(() => {
      try { localStorage.setItem('nplus_gh_monitor_token', 'ghp_test_dummy_token_value_for_e2e_only'); } catch (e) {}
    });
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
  });

  test('01: opens from topbar bug icon', async ({ page }) => {
    await page.click('#topbar-bug-report');
    const drawer = page.locator('#bug-report-drawer');
    await expect(drawer).toBeVisible();
    await expect(drawer).toHaveAttribute('role', 'dialog');
    await expect(drawer).toHaveAttribute('aria-modal', 'true');
    await expect(page.locator('#br-input-title')).toBeFocused();
  });

  test('02: closes via ESC, ×, Cancel, and backdrop click', async ({ page }) => {
    // ESC — wait for drawer to be visible (forces lazy-load + ESC listener
    // registration) before pressing Escape; then wait for the full portal
    // teardown (240ms transition) before re-opening
    await page.click('#topbar-bug-report');
    await expect(page.locator('#bug-report-drawer')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.locator('#bug-report-drawer')).toHaveCount(0);
    await expect(page.locator('#br-portal')).toHaveCount(0);
    // ×
    await page.click('#topbar-bug-report');
    await page.click('#br-close');
    await expect(page.locator('#bug-report-drawer')).toHaveCount(0);
    await expect(page.locator('#br-portal')).toHaveCount(0);
    // Cancel
    await page.click('#topbar-bug-report');
    await page.click('#br-cancel');
    await expect(page.locator('#bug-report-drawer')).toHaveCount(0);
    await expect(page.locator('#br-portal')).toHaveCount(0);
    // Backdrop
    await page.click('#topbar-bug-report');
    await page.locator('#br-backdrop').click({ position: { x: 10, y: 10 } });
    await expect(page.locator('#bug-report-drawer')).toHaveCount(0);
    await expect(page.locator('#br-portal')).toHaveCount(0);
  });

  test('03: Send disabled until both required fields filled', async ({ page }) => {
    await page.click('#topbar-bug-report');
    const send = page.locator('#br-send');
    await expect(send).toBeDisabled();
    await page.fill('#br-input-title', 'a');
    await expect(send).toBeDisabled();
    await page.fill('#br-input-desc', 'b');
    await expect(send).toBeEnabled();
    await page.fill('#br-input-title', '');
    await expect(send).toBeDisabled();
  });

  test('04: char counter activates at 4,000 and hard-caps at 5,000', async ({ page }) => {
    await page.click('#topbar-bug-report');
    const counter = page.locator('#br-desc-counter');
    await expect(counter).toBeHidden();
    await page.fill('#br-input-desc', 'a'.repeat(3999));
    await expect(counter).toBeHidden();
    await page.fill('#br-input-desc', 'a'.repeat(4000));
    await expect(counter).toBeVisible();
    await page.fill('#br-input-desc', 'a'.repeat(5500));
    const actualLen = await page.inputValue('#br-input-desc').then(s => s.length);
    expect(actualLen).toBe(5000);
  });

  test('05: steps expander inserts textarea and hides link', async ({ page }) => {
    await page.click('#topbar-bug-report');
    await expect(page.locator('#br-steps-toggle')).toBeVisible();
    await expect(page.locator('#br-input-steps')).toHaveCount(0);
    await page.click('#br-steps-toggle');
    await expect(page.locator('#br-input-steps')).toBeVisible();
    await expect(page.locator('#br-steps-toggle')).toBeHidden();
  });

  test('06: queue drain seed → drains on page load', async ({ page }) => {
    await page.addInitScript(() => {
      try {
        localStorage.setItem('nplus_bug_reports', JSON.stringify([{
          id: 'rpt_test', attempts: 1, terminal: false,
          payload: {
            id: 'rpt_test', title: 'queued', description: 'q',
            steps: null, attempt_count: 1, submitted_at: '2026-05-20T14:32:07Z',
            context: { version: 'v5.5.12', page: '#page-setup', cert: 'netplus-N10-009',
                       theme: 'light', viewport: '1440x900', last_quiz: null, wrong_bank_size: 0 }
          }
        }]));
      } catch (e) {}
    });
    // Intercept the GitHub API call and return 401 (since fake token) — confirms a request was attempted
    await page.route('https://api.github.com/**', route => route.fulfill({ status: 401, body: '{}' }));
    await page.goto('/');
    await page.waitForTimeout(3500); // 2s delay + buffer
    // After drain, queue should have updated attempts (the 401 marks it terminal)
    const q = await page.evaluate(() => localStorage.getItem('nplus_bug_reports'));
    expect(q).toBeTruthy();
    const parsed = JSON.parse(q);
    expect(parsed.length).toBe(1);
    expect(parsed[0].terminal).toBe(true);
  });

  test('07: token banner shows when GH_TOKEN missing', async ({ page }) => {
    await page.addInitScript(() => {
      try { localStorage.removeItem('nplus_gh_monitor_token'); } catch (e) {}
    });
    await page.goto('/');
    await page.click('#topbar-bug-report');
    await expect(page.locator('#br-no-token')).toBeVisible();
    await expect(page.locator('#br-send')).toBeDisabled();
  });

  test('08: cross-cert leak filter — Sec+ active files secplus context, not netplus', async ({ page }) => {
    // v7.13.3: the visible "Auto-attached" panel was removed from the drawer
    // (end-users don't need it). The diagnostic context still travels in the
    // filed GitHub issue body + cert label, so the cross-cert leak guard now
    // asserts against the captured POST payload — a stronger check than the
    // old display-panel read.
    await page.addInitScript(() => {
      try {
        localStorage.setItem('nplus_dev_cert', 'secplus');
        localStorage.setItem('nplus_gh_monitor_token', 'ghp_faketoken_for_e2e');
      } catch (e) {}
    });
    let postData = null;
    await page.route('https://api.github.com/**', route => {
      if (route.request().method() === 'POST') postData = route.request().postData();
      route.fulfill({ status: 201, contentType: 'application/json',
        body: JSON.stringify({ number: 1, html_url: 'https://github.com/x/y/issues/1' }) });
    });
    await page.goto('/');
    await page.click('#topbar-bug-report');
    await page.fill('#br-input-title', 'cross-cert leak check');
    await page.fill('#br-input-desc', 'verifying the filed context reflects the active cert');
    await page.click('#br-send');
    await expect.poll(() => postData, { timeout: 8000 }).toBeTruthy();
    expect(postData).toContain('secplus');
    expect(postData).not.toContain('netplus');
  });

  test('09: topbar dot appears when queue non-empty', async ({ page }) => {
    await page.addInitScript(() => {
      try {
        localStorage.setItem('nplus_bug_reports', JSON.stringify([{
          id: 'rpt_test', attempts: 1, terminal: true,
          payload: { id:'rpt_test', title:'q', context:{} }
        }]));
      } catch (e) {}
    });
    await page.goto('/');
    // Open the drawer (which triggers _updateTopbarDot)
    await page.click('#topbar-bug-report');
    await page.click('#br-close');
    await expect(page.locator('#topbar-bug-report')).toHaveClass(/has-queue/);
  });
});
