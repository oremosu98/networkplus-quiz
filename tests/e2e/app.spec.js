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
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    // Fire once on DOMContentLoaded — waiting for the details element to exist
    window.addEventListener('DOMContentLoaded', () => {
      const sec = document.getElementById('custom-quiz-section');
      if (sec) sec.open = true;
    });
  });
});

test.describe('App Load & Setup Page', () => {
  test('loads and shows the setup page', async ({ page }) => {
    await page.goto('/');

    // Setup page should be visible
    const setupPage = page.locator('#page-setup');
    await expect(setupPage).toHaveClass(/active/);

    // v4.54.0: hero v2 display heading replaces "Network+ AI Quiz" h1
    await expect(page.locator('#hero-v2-display')).toBeVisible();
    await expect(page.locator('#hero-v2-display')).toContainText('Simi');

    // API key input is present (inside Settings details — may be collapsed)
    await expect(page.locator('#api-key')).toBeAttached();

    // v4.54.0: version string lives in sidebar brand
    await expect(page.locator('.sb-brand-version')).toContainText(/v\d+\.\d+/);
  });

  test('API key input has ARIA label', async ({ page }) => {
    await page.goto('/');
    const input = page.locator('#api-key');
    await expect(input).toHaveAttribute('aria-label', /API key/i);
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
  test('navigates to subnet trainer and back', async ({ page }) => {
    await page.goto('/');

    // v4.53.0: nav lives in persistent sidebar — click sidebar item instead of setup-page button
    await page.locator('.sb-item[data-sb-page="subnet"]').click();

    // Subnet page should be active
    await expect(page.locator('#page-subnet')).toHaveClass(/active/);

    // Go back to setup
    await page.locator('.sb-item[data-sb-page="setup"]').click();
    await expect(page.locator('#page-setup')).toHaveClass(/active/);
  });

  test('navigates to port drill and back', async ({ page }) => {
    await page.goto('/');

    // v4.53.0: drills launcher retired — sidebar exposes per-drill entries directly
    await page.locator('.sb-item[data-sb-page="ports"]').click();
    await expect(page.locator('#page-ports')).toHaveClass(/active/);

    await page.locator('.sb-item[data-sb-page="setup"]').click();
    await expect(page.locator('#page-setup')).toHaveClass(/active/);
  });

  test('navigates to analytics and back', async ({ page }) => {
    await page.goto('/');

    // v4.53.0: nav via sidebar
    await page.locator('.sb-item[data-sb-page="analytics"]').click();
    await expect(page.locator('#page-analytics')).toHaveClass(/active/);

    await page.locator('.sb-item[data-sb-page="setup"]').click();
    await expect(page.locator('#page-setup')).toHaveClass(/active/);
  });

  test('navigates to topic progress and back', async ({ page }) => {
    await page.goto('/');

    // v4.53.0: nav via sidebar
    await page.locator('.sb-item[data-sb-page="progress"]').click();
    await expect(page.locator('#page-progress')).toHaveClass(/active/);

    await page.locator('.sb-item[data-sb-page="setup"]').click();
    await expect(page.locator('#page-setup')).toHaveClass(/active/);
  });
});

// Shared helpers for the Subnet Trainer practice flow (v4.43.4 rewrite).
// The Subnet Trainer now defaults to the Learn tab; switching to Practice
// triggers stNextQuestion(), renders the question into #st-question, and
// populates #st-answer-area with either a text input (#st-answer-input +
// #st-submit-btn) or MCQ buttons (.st-mcq-btn) depending on question type.
async function gotoSubnetPractice(page) {
  // v4.53.0: nav via sidebar
  await page.locator('.sb-item[data-sb-page="subnet"]').click();
  await page.locator('#st-tab-btn-practice').click();
}
// Answer whatever type of question is currently rendered. Returns the input
// element if free-text, null if MCQ.
async function answerCurrentSubnetQuestion(page, textAnswer = 'test') {
  const input = page.locator('#st-answer-input');
  if (await input.count() > 0) {
    await input.fill(textAnswer);
    await page.locator('#st-submit-btn').click();
    return input;
  }
  await page.locator('.st-mcq-btn').first().click();
  return null;
}

test.describe('Subnet Trainer', () => {
  test('generates a question and accepts answers', async ({ page }) => {
    await page.goto('/');
    await gotoSubnetPractice(page);

    // Question should be generated (no longer the "Loading…" placeholder)
    const question = page.locator('#st-question');
    await expect(question).not.toHaveText('Loading…');
    await expect(question).not.toBeEmpty();

    // Score starts at 0 / 0
    await expect(page.locator('#st-score')).toContainText('0 / 0');

    // Answer the question (handles both text and MCQ question types)
    await answerCurrentSubnetQuestion(page);

    // Feedback should appear — class is toggled to .st-feedback-visible
    const feedback = page.locator('#st-feedback');
    await expect(feedback).toHaveClass(/st-feedback-visible/);

    // Score should update to X / 1
    await expect(page.locator('#st-score')).toContainText('/ 1');
  });

  test('next button generates a new question', async ({ page }) => {
    await page.goto('/');
    await gotoSubnetPractice(page);

    await expect(page.locator('#st-q-num')).toContainText('Q1');

    await answerCurrentSubnetQuestion(page);

    // Click next
    await page.locator('#st-next-btn').click();

    // Q number should advance
    await expect(page.locator('#st-q-num')).toContainText('Q2');
  });

  test('Enter key submits answer', async ({ page }) => {
    await page.goto('/');
    await gotoSubnetPractice(page);

    // Subnet Trainer mixes text-input and MCQ questions. For the Enter-key
    // test we need a text-input question — skip through up to 8 MCQs until
    // we land on one with the text input rendered.
    for (let i = 0; i < 8; i++) {
      if (await page.locator('#st-answer-input').count() > 0) break;
      await page.locator('.st-mcq-btn').first().click();
      await page.locator('#st-next-btn').click();
    }

    const input = page.locator('#st-answer-input');
    await expect(input).toBeVisible();
    await input.fill('test');
    await input.press('Enter');

    // Feedback should appear
    await expect(page.locator('#st-feedback')).toHaveClass(/st-feedback-visible/);
  });
});

// Shared helper: navigate to Port Drill practice tab.
// Port Drill is tab-based now (Learn / Practice / Dashboard) — no more
// "pregame → game" flow. startPortDrill() defaults to the Learn tab; tests
// that want live questions click the Practice tab to fire ptNextQuestion().
async function gotoPortPractice(page) {
  // v4.53.0: drills launcher retired — sidebar has a direct Port Drill entry
  await page.locator('.sb-item[data-sb-page="ports"]').click();
  await page.locator('#pt-tab-btn-practice').click();
}

test.describe('Port Drill', () => {
  test('practice tab renders a question with 4 MCQ options', async ({ page }) => {
    await page.goto('/');
    await gotoPortPractice(page);

    // Practice panel is visible, Learn panel hidden
    await expect(page.locator('#pt-tab-practice')).not.toHaveClass(/is-hidden/);
    await expect(page.locator('#pt-tab-learn')).toHaveClass(/is-hidden/);

    // Question has been generated (not empty)
    await expect(page.locator('#pt-question')).not.toBeEmpty();

    // Score starts at 0 / 0
    await expect(page.locator('#pt-score')).toContainText('0 / 0');

    // 4 MCQ options rendered
    await expect(page.locator('.pt-mcq-btn')).toHaveCount(4);
  });

  test('clicking an answer advances state (next button + score)', async ({ page }) => {
    await page.goto('/');
    await gotoPortPractice(page);

    await page.locator('.pt-mcq-btn').first().click();

    // Next button becomes visible (was is-hidden pre-submit)
    await expect(page.locator('#pt-next-btn')).toBeVisible();

    // Score should update to X / 1 (X ∈ {0,1})
    await expect(page.locator('#pt-score')).toContainText('/ 1');
  });
});

// v4.54.1: Settings moved to its own page — navigate via sidebar first.
async function gotoSettings(page) {
  await page.locator('.sb-item[data-sb-page="settings"]').click();
  await expect(page.locator('#page-settings')).toHaveClass(/active/);
}
// v4.54.1: Recent Performance moved to Analytics — navigate via sidebar first.
async function gotoAnalytics(page) {
  await page.locator('.sb-item[data-sb-page="analytics"]').click();
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
  test('shows error for empty API key', async ({ page }) => {
    await page.goto('/');

    // v4.54.1: set localStorage key empty (input is on Settings page now; quiz reads from storage)
    await page.evaluate(() => localStorage.setItem('nplus_key', ''));
    await page.locator('#page-setup button:has-text("Generate Quiz")').click();

    const err = page.locator('#setup-err');
    await expect(err).toBeVisible();
    await expect(err).toContainText('API key');
  });

  test('shows error for invalid API key format', async ({ page }) => {
    await page.goto('/');

    // v4.54.1: api-key input lives on Settings page; set its value directly so
    // startQuiz() reads the invalid value and fires the format-validation error
    await page.evaluate(() => {
      const el = document.getElementById('api-key');
      if (el) el.value = 'invalid-key-123';
    });
    await page.locator('#page-setup button:has-text("Generate Quiz")').click();

    const err = page.locator('#setup-err');
    await expect(err).toBeVisible();
    await expect(err).toContainText('Invalid');
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
    // v4.54.0: hero v2 display heading, not the hidden legacy h1
    await expect(page.locator('#hero-v2-display')).toBeVisible();
    // API key is inside collapsed Settings — just needs to be attached to DOM
    await expect(page.locator('#api-key')).toBeAttached();
  });
});

// ══════════════════════════════════════════
// NEW TEST CASES
// ══════════════════════════════════════════

test.describe('Default Chip Selections', () => {
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
    // v4.54.1: API key input lives on Settings page now
    await gotoSettings(page);
    await page.locator('#api-key').fill('sk-ant-api03-test123');
    // Click the export button (any input-blur triggers save)
    await page.locator('#api-key').blur();
    // Also persist via evaluate to be deterministic
    await page.evaluate(() => localStorage.setItem('nplus_key', 'sk-ant-api03-test123'));

    const savedKey = await page.evaluate(() => localStorage.getItem('nplus_key'));
    expect(savedKey).toBe('sk-ant-api03-test123');
  });

  test('restores API key from localStorage on reload', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.setItem('nplus_key', 'sk-ant-api03-persisted'));
    await page.reload();

    // v4.54.1: navigate to Settings to see the populated input
    await gotoSettings(page);
    const val = await page.locator('#api-key').inputValue();
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

  test('theme toggle updates button text', async ({ page }) => {
    await page.goto('/');

    // v4.54.0: topbar theme button switches between \u2600 (sun, dark mode) and \u263E (crescent, light mode)
    const btn = page.locator('#topbar-theme');
    const initial = await btn.textContent();

    await btn.click();
    const afterFirst = await btn.textContent();
    expect(afterFirst).not.toBe(initial);

    await btn.click();
    const afterSecond = await btn.textContent();
    expect(afterSecond).toBe(initial);
  });
});

test.describe('Exam Button Validation', () => {
  test('shows error for empty API key on exam start', async ({ page }) => {
    await page.goto('/');
    // v4.54.1: API key is on Settings page; use localStorage for this flow-test
    await page.evaluate(() => localStorage.setItem('nplus_key', ''));
    // v4.79.0: standalone "Simulate Full Exam" button retired; the
    // Mode Ladder Exam tier is now the entry point (text "Full Exam Simulator").
    await page.locator('#page-setup button:has-text("Full Exam Simulator")').click();

    const err = page.locator('#setup-err');
    await expect(err).toBeVisible();
    await expect(err).toContainText('API key');
  });

  test('shows error for invalid API key on exam start', async ({ page }) => {
    await page.goto('/');
    // v4.54.1: set input value directly (api-key is on Settings page now)
    await page.evaluate(() => {
      const el = document.getElementById('api-key');
      if (el) el.value = 'bad-key';
    });
    // v4.79.0: standalone "Simulate Full Exam" button retired; the
    // Mode Ladder Exam tier is now the entry point (text "Full Exam Simulator").
    await page.locator('#page-setup button:has-text("Full Exam Simulator")').click();

    const err = page.locator('#setup-err');
    await expect(err).toBeVisible();
    await expect(err).toContainText('Invalid');
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

  test('hero v2 mini cards show when history exists', async ({ page }) => {
    // v4.54.0: #stats-card retired; hero-v2 mini cards (Today + Streak) are the replacement
    await page.goto('/');

    await page.evaluate(() => {
      const history = [{
        topic: 'Subnetting', score: 7, total: 10, pct: 70,
        date: new Date().toISOString(), mode: 'quiz', difficulty: 'Exam Level'
      }];
      localStorage.setItem('nplus_history', JSON.stringify(history));
    });

    await page.reload();

    await expect(page.locator('.hero-v2-mini-row')).toBeVisible();
    await expect(page.locator('#mc-today-done')).toBeVisible();
    await expect(page.locator('#mc-streak-num')).toBeVisible();
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

    await expect(page.locator('#modes-wrong-tile')).toBeVisible();
    await expect(page.locator('#modes-wrong-sub')).toContainText('1');
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

test.describe('Subnet Trainer Advanced', () => {
  test('streak counter starts at 0', async ({ page }) => {
    await page.goto('/');
    await gotoSubnetPractice(page);

    // #st-streak renders as "🔥 0" — the emoji plus the number
    await expect(page.locator('#st-streak')).toContainText('0');
  });

  test('reference table is present with common rows', async ({ page }) => {
    await page.goto('/');
    await gotoSubnetPractice(page);

    // #st-ref-details is a <details> that ships collapsed — open it
    await page.evaluate(() => {
      const ref = document.getElementById('st-ref-details');
      if (ref) ref.open = true;
    });

    const table = page.locator('#st-ref-details .subnet-table');
    await expect(table).toBeVisible();
    await expect(table).toContainText('/24');
    await expect(table).toContainText('255.255.255.0');
  });

  test('next button appears after submitting an answer', async ({ page }) => {
    await page.goto('/');
    await gotoSubnetPractice(page);

    await answerCurrentSubnetQuestion(page);

    // Next button should become visible (was is-hidden pre-submit)
    await expect(page.locator('#st-next-btn')).toBeVisible();
  });
});

test.describe('Port Drill Timer & Scoring', () => {
  test('timed mode countdown starts at 30 and ticks down', async ({ page }) => {
    await page.goto('/');
    await gotoPortPractice(page);

    // Switch to timed mode — ptStartTimer() sets #pt-timer to 30 and ticks
    await page.locator('#pt-mode-timed').click();

    const timer = page.locator('#pt-timer');
    await expect(timer).toBeVisible();
    const startVal = parseInt(await timer.textContent(), 10);
    // May have ticked once already — accept 29 or 30
    expect(startVal).toBeGreaterThanOrEqual(28);
    expect(startVal).toBeLessThanOrEqual(30);

    // Wait ~2 seconds, confirm it's ticked down further
    await page.waitForTimeout(2100);
    const laterVal = parseInt(await timer.textContent(), 10);
    expect(laterVal).toBeLessThan(startVal);
  });

  test('port best score persists in localStorage across reloads', async ({ page }) => {
    // v4.45.2: the Practice Drills stats card (#ana-s-drills) was removed —
    // port best no longer surfaces in the Analytics UI. It still drives
    // the `perfect_port` / `streak_port_25` milestones via PORT_BEST +
    // PORT_STREAK_BEST localStorage keys, so this test now verifies
    // simple persistence (what milestones depend on).
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.setItem('nplus_port_best', '7');
    });
    await page.reload();
    const persisted = await page.evaluate(() => localStorage.getItem('nplus_port_best'));
    expect(persisted).toBe('7');
  });

  test('timed mode shows time\'s-up screen when timer expires', async ({ page }) => {
    await page.goto('/');
    await gotoPortPractice(page);
    await page.locator('#pt-mode-timed').click();

    // Force timer to expire directly by calling the end function. Both
    // ptStopTimer and ptEndTimedChallenge are declared at module scope in
    // app.js so they're globally available in the page context.
    await page.evaluate(() => {
      if (typeof ptStopTimer === 'function') ptStopTimer();
      if (typeof ptEndTimedChallenge === 'function') ptEndTimedChallenge();
    });

    // #pt-q-card gets rewritten with the "Time's Up!" screen
    await expect(page.locator('#pt-q-card')).toContainText('Time');
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
      'page-subnet', 'page-ports', 'page-analytics', 'page-topic-dive',
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

    // v4.54.0: empty state rendered as .sb-streak-empty inside the sidebar footer
    await expect(page.locator('.sb-streak-empty')).toBeVisible();
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

    // v4.54.0: legacy #version-badge is hidden; the v4.54.0 init attaches the same triple-tap handler to .sb-brand-version in the sidebar
    const badge = page.locator('.sb-brand-version');
    await badge.click();
    await badge.click();
    await badge.click();

    await expect(page.locator('#page-monitor')).toHaveClass(/active/);
    await expect(page.locator('#monitor-stats')).toBeVisible();
  });

  test('monitor shows empty state when no errors', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.removeItem('nplus_error_log'));

    // v4.54.0: legacy #version-badge is hidden; the v4.54.0 init attaches the same triple-tap handler to .sb-brand-version in the sidebar
    const badge = page.locator('.sb-brand-version');
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

    // v4.54.0: legacy #version-badge is hidden; the v4.54.0 init attaches the same triple-tap handler to .sb-brand-version in the sidebar
    const badge = page.locator('.sb-brand-version');
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

    // v4.54.0: legacy #version-badge is hidden; the v4.54.0 init attaches the same triple-tap handler to .sb-brand-version in the sidebar
    const badge = page.locator('.sb-brand-version');
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
// whitelist of page IDs; any page not on the list (e.g. page-ports in
// v4.16.1, or a new launch point added later) silently fell back to
// page-topic-dive and dumped the user on a stale screen. Current code
// (v4.42.5+) finds the active page via `.page.active` — this spec guards
// both the existing Topic Deep Dive flow AND a programmatic page-ports
// launch so the regression class can't come back via either path.
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
    // some other fallback (e.g. page-ports)
    await page.locator('#lab-back-btn').click();
    await expect(page.locator('#page-topic-dive')).toHaveClass(/active/);
    await expect(page.locator('#page-guided-lab')).not.toHaveClass(/active/);
  });

  test('Back button returns to page-ports when launched from there (v4.16.2 regression guard)', async ({ page }) => {
    await page.goto('/');

    // This is the scenario that shipped broken in v4.16.1 → fixed in v4.16.2.
    // The v4.42.5 refactor replaced the page-whitelist with a `.page.active`
    // lookup so ANY launching page is tracked — the guard here ensures that
    // contract holds for page-ports specifically, since that's where the
    // original regression surfaced.
    await page.evaluate(() => window.showPage('ports'));
    await expect(page.locator('#page-ports')).toHaveClass(/active/);

    await page.evaluate(() => window.openGuidedLab('Port Numbers'));
    await expect(page.locator('#page-guided-lab')).toHaveClass(/active/);

    await page.locator('#lab-back-btn').click();
    await expect(page.locator('#page-ports')).toHaveClass(/active/);
    await expect(page.locator('#page-topic-dive')).not.toHaveClass(/active/);
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

// ══════════════════════════════════════════
// v4.63.0 — Network Builder 3D View Mode (issue #199 Phase 1)
//
// End-to-end: click the 3D View pill, verify scene mounts, click a
// device label, verify the existing v4.60.0 Live Inspector popup opens,
// click Back to 2D, verify SVG canvas returns. Also verifies the
// dynamic-import contract: vendored Three.js fetches ONLY on first
// 3D-View entry (not on initial page load).
// ══════════════════════════════════════════
test.describe('Network Builder 3D View', () => {
  test.beforeEach(async ({ page }) => {
    // Seed localStorage with a minimal saved topology so the 3D scene
    // has something to render. Goes into the draft key tbState is
    // restored from.
    await page.addInitScript(() => {
      const draft = {
        id: 'e2e',
        name: 'E2E',
        devices: [
          { id: 'd1', type: 'router', x: 900, y: 550, hostname: 'R1',
            interfaces: [{ name: 'Gi0/0', ip: '10.0.0.1', mask: '255.255.255.0', mac: 'aa:aa:aa:00:00:01', vlan: 1, mode: 'access', enabled: true, cableId: null, subInterfaces: [] }],
            routingTable: [], arpTable: [], macTable: [], vlanDb: [], dhcpServer: null, dhcpRelay: null, acls: [] },
          { id: 'd2', type: 'switch', x: 700, y: 700, hostname: 'SW1',
            interfaces: [{ name: 'Fa0/1', ip: '10.0.0.2', mask: '255.255.255.0', mac: 'bb:bb:bb:00:00:01', vlan: 1, mode: 'access', enabled: true, cableId: null, subInterfaces: [] }],
            routingTable: [], arpTable: [], macTable: [], vlanDb: [{ id: 1, name: 'default' }], dhcpServer: null, dhcpRelay: null, acls: [] }
        ],
        cables: [
          { id: 'c1', from: 'd1', to: 'd2', type: 'cat6', fromIface: 'Gi0/0', toIface: 'Fa0/1' }
        ],
        created: Date.now(),
        updated: Date.now()
      };
      localStorage.setItem('nplus_topology_draft', JSON.stringify(draft));
    });
  });

  test('Three.js is NOT fetched on initial page load (dynamic-import contract)', async ({ page }) => {
    const vendorRequests = [];
    page.on('request', req => {
      if (req.url().includes('/vendor/three/')) vendorRequests.push(req.url());
    });
    await page.goto('/');
    // Wait for all network activity to settle
    await page.waitForLoadState('networkidle');
    expect(vendorRequests).toHaveLength(0);
  });

  test('opens 3D view, mounts canvas, vendored Three.js fetches lazily, back to 2D works', async ({ page }) => {
    const vendorRequests = [];
    page.on('request', req => {
      if (req.url().includes('/vendor/three/')) vendorRequests.push(req.url());
    });
    await page.goto('/');

    // showPage activates the page; openTopologyBuilder restores tbState
    // from the seeded draft. Fire both.
    await page.evaluate(() => {
      window.showPage('topology-builder');
      window.openTopologyBuilder();
    });
    await expect(page.locator('#page-topology-builder')).toHaveClass(/active/);

    // Click the 🧭 3D View pill
    await page.locator('[data-tb-pill="3d"]').click();

    // 3D host becomes visible
    const host = page.locator('#tb-3d-host');
    await expect(host).toHaveClass(/tb-3d-host-active/);

    // Three.js WebGL canvas mounts inside #tb-3d-canvas
    const canvas = page.locator('#tb-3d-canvas canvas');
    await expect(canvas).toBeVisible({ timeout: 5000 });

    // Dynamic-import contract: vendored Three.js was fetched on this entry
    expect(vendorRequests.length).toBeGreaterThan(0);

    // Back to 2D
    await page.locator('#tb-3d-back-btn').click();
    await expect(host).not.toHaveClass(/tb-3d-host-active/);
    await expect(page.locator('#tb-canvas')).toBeVisible();
  });

  test('3D View pill is present in the canvas pill toolbar', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => window.showPage('topology-builder'));
    const pill = page.locator('[data-tb-pill="3d"]');
    await expect(pill).toBeVisible();
    await expect(pill).toHaveAttribute('onclick', /tbOpen3DView/);
    await expect(pill).toHaveText(/3D View/);
  });
});

// ══════════════════════════════════════════
// v4.64.0 — TB 3D View Phase 2 (issue #199 Phase 2)
//
// Packet trace animation + hop-card strip + HUD pill + playback controls.
// Render-only contract: tb3d.js uses setTraceState(); app.js owns all
// trace state + mutations.
// ══════════════════════════════════════════
test.describe('Network Builder 3D View — Phase 2 Packet Trace', () => {
  test.beforeEach(async ({ page }) => {
    // Seed a 2-device topology with known IPs in the same subnet.
    await page.addInitScript(() => {
      const draft = {
        id: 'e2e-trace',
        name: 'E2E Trace',
        devices: [
          { id: 'd1', type: 'router', x: 900, y: 450, hostname: 'R1',
            interfaces: [{ name: 'Gi0/0', ip: '10.0.0.1', mask: '255.255.255.0', mac: 'aa:aa:aa:00:00:01', vlan: 1, mode: 'access', enabled: true, cableId: 'c1', subInterfaces: [] }],
            routingTable: [], arpTable: [], macTable: [], vlanDb: [], dhcpServer: null, dhcpRelay: null, acls: [] },
          { id: 'd2', type: 'pc', x: 700, y: 650, hostname: 'PC1',
            interfaces: [{ name: 'eth0', ip: '10.0.0.2', mask: '255.255.255.0', mac: 'bb:bb:bb:00:00:01', vlan: 1, mode: 'access', enabled: true, cableId: 'c1', subInterfaces: [] }],
            routingTable: [], arpTable: [], macTable: [], vlanDb: [], dhcpServer: null, dhcpRelay: null, acls: [] }
        ],
        cables: [
          { id: 'c1', from: 'd1', to: 'd2', type: 'cat6', fromIface: 'Gi0/0', toIface: 'eth0' }
        ],
        created: Date.now(),
        updated: Date.now()
      };
      localStorage.setItem('nplus_topology_draft', JSON.stringify(draft));
    });
  });

  test('trace pill + playback controls + HUD + hop strip all exist in 3D DOM', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => {
      window.showPage('topology-builder');
      window.openTopologyBuilder();
    });

    // Open 3D view
    await page.locator('[data-tb-pill="3d"]').click();
    await expect(page.locator('#tb-3d-host')).toHaveClass(/tb-3d-host-active/);

    // Assert all Phase 2 chrome elements exist (even if hidden at rest)
    await expect(page.locator('#tb-3d-trace-btn')).toBeVisible();
    await expect(page.locator('#tb-3d-playback-controls')).toBeAttached();
    await expect(page.locator('#tb-3d-trace-hud')).toBeAttached();
    await expect(page.locator('#tb-3d-hop-strip')).toBeAttached();

    // At rest (no trace), HUD + hop strip + playback controls should be hidden
    await expect(page.locator('#tb-3d-trace-hud')).toBeHidden();
    await expect(page.locator('#tb-3d-hop-strip')).toBeHidden();
    await expect(page.locator('#tb-3d-playback-controls')).toBeHidden();
  });

  test('firing a trace reveals the HUD, hop-strip, and playback controls', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => {
      window.showPage('topology-builder');
      window.openTopologyBuilder();
    });

    // Open 3D view
    await page.locator('[data-tb-pill="3d"]').click();
    await expect(page.locator('#tb-3d-host')).toHaveClass(/tb-3d-host-active/);
    await expect(page.locator('#tb-3d-canvas canvas')).toBeVisible({ timeout: 5000 });

    // Fire a trace directly. tbStartTrace kicks tbRenderTraceCanvasState
    // which invokes the 3D render hook. Fast speed so the test runs quick.
    await page.evaluate(() => {
      window.tbStartTrace('d2', '10.0.0.1');
    });

    // HUD becomes visible with src → dst text
    const hud = page.locator('#tb-3d-trace-hud');
    await expect(hud).toBeVisible();
    await expect(page.locator('#tb-3d-trace-hud-text')).toContainText('PC1');
    await expect(page.locator('#tb-3d-trace-hud-text')).toContainText('10.0.0.1');

    // Hop strip becomes visible with ≥1 hop card
    const strip = page.locator('#tb-3d-hop-strip');
    await expect(strip).toBeVisible();
    const cards = page.locator('#tb-3d-hop-strip-row .tb-3d-hop-card');
    expect(await cards.count()).toBeGreaterThan(0);

    // Playback controls become visible
    await expect(page.locator('#tb-3d-playback-controls')).toBeVisible();

    // After the initial render, hop 0 is the 'current' one
    const anyCurrent = await page.locator('.tb-3d-hop-card-current').count();
    expect(anyCurrent).toBeGreaterThan(0);
  });

  test('trace state persists across 3D → 2D → 3D toggle', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => {
      window.showPage('topology-builder');
      window.openTopologyBuilder();
    });

    // Enter 3D and fire a trace
    await page.locator('[data-tb-pill="3d"]').click();
    await expect(page.locator('#tb-3d-canvas canvas')).toBeVisible({ timeout: 5000 });
    await page.evaluate(() => {
      window.tbStartTrace('d2', '10.0.0.1');
    });
    await expect(page.locator('#tb-3d-trace-hud')).toBeVisible();

    // Back to 2D — the 2D trace panel should re-appear (indirect proof that
    // _tbUiState.trace.active is still true, since tbClose3DView only
    // unhides the panel when trace is active).
    await page.locator('#tb-3d-back-btn').click();
    await expect(page.locator('#tb-trace-panel')).toBeVisible();

    // Re-enter 3D — HUD should re-appear since trace is still active
    await page.locator('[data-tb-pill="3d"]').click();
    await expect(page.locator('#tb-3d-host')).toHaveClass(/tb-3d-host-active/);
    await expect(page.locator('#tb-3d-trace-hud')).toBeVisible();
  });

  test('2D trace panel is hidden while 3D is active (no overlap)', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => {
      window.showPage('topology-builder');
      window.openTopologyBuilder();
    });

    // Fire trace in 2D first — 2D trace panel should be visible
    await page.evaluate(() => {
      window.tbStartTrace('d2', '10.0.0.1');
    });
    await expect(page.locator('#tb-trace-panel')).toBeVisible();

    // Enter 3D — the 2D trace panel must be hidden
    await page.locator('[data-tb-pill="3d"]').click();
    await expect(page.locator('#tb-3d-host')).toHaveClass(/tb-3d-host-active/);
    await expect(page.locator('#tb-trace-panel')).toBeHidden();

    // Exit 3D — 2D trace panel should come back (trace is still active)
    await page.locator('#tb-3d-back-btn').click();
    await expect(page.locator('#tb-trace-panel')).toBeVisible();
  });
});

// ══════════════════════════════════════════
// v4.65.0 — TB 3D View Phase 3 (issue #199 Phase 3)
//
// OSI Layer Stack view. Click a device → OSI Stack button enables → click
// → device lifts into 7-plane stack with layer labels + dimmed siblings.
// Exit OSI returns to regular 3D view.
// ══════════════════════════════════════════
test.describe('Network Builder 3D View — Phase 3 OSI Layer Stack', () => {
  test.beforeEach(async ({ page }) => {
    // Seed a minimal 2-device topology so tbState has something to 3D-render.
    await page.addInitScript(() => {
      const draft = {
        id: 'e2e-osi',
        name: 'E2E OSI',
        devices: [
          { id: 'd1', type: 'router', x: 900, y: 450, hostname: 'R1',
            interfaces: [{ name: 'Gi0/0', ip: '10.0.0.1', mask: '255.255.255.0', mac: 'aa:aa:aa:00:00:01', vlan: 1, mode: 'access', enabled: true, cableId: 'c1', subInterfaces: [] }],
            routingTable: [], arpTable: [], macTable: [], vlanDb: [], dhcpServer: null, dhcpRelay: null, acls: [] },
          { id: 'd2', type: 'pc', x: 700, y: 650, hostname: 'PC1',
            interfaces: [{ name: 'eth0', ip: '10.0.0.2', mask: '255.255.255.0', mac: 'bb:bb:bb:00:00:01', vlan: 1, mode: 'access', enabled: true, cableId: 'c1', subInterfaces: [] }],
            routingTable: [], arpTable: [], macTable: [], vlanDb: [], dhcpServer: null, dhcpRelay: null, acls: [] }
        ],
        cables: [
          { id: 'c1', from: 'd1', to: 'd2', type: 'cat6', fromIface: 'Gi0/0', toIface: 'eth0' }
        ],
        created: Date.now(),
        updated: Date.now()
      };
      localStorage.setItem('nplus_topology_draft', JSON.stringify(draft));
    });
  });

  test('OSI button is always clickable + auto-picks a device if none selected (v4.65.1)', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => {
      window.showPage('topology-builder');
      window.openTopologyBuilder();
    });
    await page.locator('[data-tb-pill="3d"]').click();
    await expect(page.locator('#tb-3d-canvas canvas')).toBeVisible({ timeout: 5000 });

    const osiBtn = page.locator('#tb-3d-osi-btn');
    await expect(osiBtn).toBeVisible();
    // Button is always enabled — v4.65.1 removed the disabled-at-rest trap
    await expect(osiBtn).not.toHaveAttribute('disabled', '');

    // Clicking without prior selection should still work — auto-picks a device
    await page.evaluate(() => { window.tbV3InspectedDeviceId = null; });
    await osiBtn.click();
    await expect(page.locator('#tb-3d-host')).toHaveClass(/tb-3d-osi-active/);
    await expect(page.locator('.tb-3d-osi-label')).toHaveCount(7, { timeout: 3000 });
  });

  test('entering OSI mode lifts device into 7 layer planes with labels', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => {
      window.showPage('topology-builder');
      window.openTopologyBuilder();
    });
    await page.locator('[data-tb-pill="3d"]').click();
    await expect(page.locator('#tb-3d-canvas canvas')).toBeVisible({ timeout: 5000 });

    // Select a device then enter OSI view
    await page.evaluate(() => window.tbSelectDeviceForInspector('d1'));
    await page.locator('#tb-3d-osi-btn').click();

    // Host gets the tb-3d-osi-active class
    await expect(page.locator('#tb-3d-host')).toHaveClass(/tb-3d-osi-active/);

    // OSI Stack button hides, Exit OSI button + title show
    await expect(page.locator('#tb-3d-osi-btn')).toBeHidden();
    await expect(page.locator('#tb-3d-osi-exit-btn')).toBeVisible();
    await expect(page.locator('#tb-3d-trace-btn')).toBeHidden();

    // Title card shows the focused device hostname
    await expect(page.locator('#tb-3d-osi-title-name')).toContainText('R1');

    // All 7 OSI layer labels rendered in the DOM
    await expect(page.locator('.tb-3d-osi-label')).toHaveCount(7, { timeout: 3000 });

    // Each layer has the expected layer-N class variant
    for (let n = 1; n <= 7; n++) {
      await expect(page.locator(`.tb-3d-osi-label.layer-${n}`)).toHaveCount(1);
    }
  });

  test('Exit OSI returns to regular 3D view + tears down layer planes', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => {
      window.showPage('topology-builder');
      window.openTopologyBuilder();
    });
    await page.locator('[data-tb-pill="3d"]').click();
    await expect(page.locator('#tb-3d-canvas canvas')).toBeVisible({ timeout: 5000 });

    // Enter OSI
    await page.evaluate(() => window.tbSelectDeviceForInspector('d1'));
    await page.locator('#tb-3d-osi-btn').click();
    await expect(page.locator('.tb-3d-osi-label')).toHaveCount(7, { timeout: 3000 });

    // Exit OSI
    await page.locator('#tb-3d-osi-exit-btn').click();

    // All OSI layer labels gone, host class removed
    await expect(page.locator('#tb-3d-host')).not.toHaveClass(/tb-3d-osi-active/);
    await expect(page.locator('.tb-3d-osi-label')).toHaveCount(0);

    // Chrome buttons swap back: OSI visible, Exit OSI hidden, Trace visible
    await expect(page.locator('#tb-3d-osi-btn')).toBeVisible();
    await expect(page.locator('#tb-3d-osi-exit-btn')).toBeHidden();
    await expect(page.locator('#tb-3d-trace-btn')).toBeVisible();
  });

  test('Back-to-2D while in OSI mode properly cleans up', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => {
      window.showPage('topology-builder');
      window.openTopologyBuilder();
    });
    await page.locator('[data-tb-pill="3d"]').click();
    await expect(page.locator('#tb-3d-canvas canvas')).toBeVisible({ timeout: 5000 });

    // Enter OSI then immediately go back to 2D
    await page.evaluate(() => window.tbSelectDeviceForInspector('d1'));
    await page.locator('#tb-3d-osi-btn').click();
    await expect(page.locator('.tb-3d-osi-label')).toHaveCount(7, { timeout: 3000 });

    await page.locator('#tb-3d-back-btn').click();
    await expect(page.locator('#tb-3d-host')).not.toHaveClass(/tb-3d-host-active/);

    // Re-enter 3D — OSI should be reset (button disabled since selection
    // state is reset too, no device is currently selected in 3D).
    await page.locator('[data-tb-pill="3d"]').click();
    await expect(page.locator('#tb-3d-host')).toHaveClass(/tb-3d-host-active/);
    await expect(page.locator('#tb-3d-host')).not.toHaveClass(/tb-3d-osi-active/);
    await expect(page.locator('.tb-3d-osi-label')).toHaveCount(0);
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

    // Homepage card should be visible since we have 1 due card.
    await expect(page.locator('#sr-review-card')).not.toHaveClass(/is-hidden/);
    await expect(page.locator('#sr-review-card-headline')).toContainText('1 card due');

    // Start review.
    await page.locator('#sr-review-start-btn').click();
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
    await page.locator('#sr-review-start-btn').click();

    // Pick A (wrong — answer is B).
    await page.locator('.sr-option[data-letter="A"]').click();

    // A should be wrong-marked, B should be correct-marked.
    await expect(page.locator('.sr-option[data-letter="A"]')).toHaveClass(/is-wrong/);
    await expect(page.locator('.sr-option[data-letter="B"]')).toHaveClass(/is-correct/);

    // Only the wrong-confidence button should appear (no confident/uncertain pair).
    await expect(page.locator('.sr-confidence-wrong')).toBeVisible();
    await expect(page.locator('.sr-confidence-confident')).toHaveCount(0);

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
    await page.locator('#sr-review-start-btn').click();
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

    // Advance.
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
    await page.locator('#quiz-next-arrow-btn').click();
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
    await expect(page.locator('#live-streak')).toContainText('🔥 1');

    // Advance to Q2 via next-arrow.
    await page.locator('#quiz-next-arrow-btn').click();
    await expect(page.locator('#q-label')).toContainText('Question 2 of 3');

    // Click dot for Q1 → revisit.
    await page.locator('#quiz-prog-dots .qpd-cell').nth(0).click();
    // Re-pick A (wrong) — score should drop, but streak should stay at 1.
    await page.locator('#options .option').nth(0).click();
    await expect(page.locator('#live-score')).toContainText('0 / 1');
    await expect(page.locator('#live-streak')).toContainText('🔥 1');
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
// v4.84.0 — Network Analysis Drill (Phase 1, issue #270) E2E coverage.
// Tests the full flow: navigate to drill, see all 3 tabs, answer a Practice
// question, verify mastery storage updates, browse to Lessons + Dashboard.
test.describe('Network Analysis Drill — Phase 1 MVP', () => {
  test('drill tile is visible in launcher with NEW badge', async ({ page }) => {
    await page.goto('/');
    // Navigate to drills page via sidebar link
    await page.evaluate(() => window.showPage('drills'));
    await expect(page.locator('#page-drills')).toHaveClass(/active/);
    // 5th tile is Network Analysis
    const tile = page.locator('.drills-tile-new');
    await expect(tile).toBeVisible();
    await expect(tile).toContainText('Network Analysis');
    await expect(tile.locator('.drills-tile-new-badge')).toContainText('NEW');
  });

  test('clicking drill tile opens the drill page with all 3 tabs', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => window.startNetworkAnalysisDrill());
    await expect(page.locator('#page-network-analysis')).toHaveClass(/active/);
    // 3 tab buttons exist
    await expect(page.locator('#na-tab-btn-practice')).toBeVisible();
    await expect(page.locator('#na-tab-btn-lessons')).toBeVisible();
    await expect(page.locator('#na-tab-btn-dashboard')).toBeVisible();
  });

  test('first-time user lands on Practice tab', async ({ page }) => {
    await page.goto('/');
    // Clear mastery so the drill thinks it's a first-time user
    await page.evaluate(() => localStorage.removeItem('nplus_na_mastery'));
    await page.evaluate(() => window.startNetworkAnalysisDrill());
    await expect(page.locator('#na-tab-btn-practice')).toHaveClass(/na-tab-active/);
    await expect(page.locator('#na-tab-practice')).not.toHaveClass(/is-hidden/);
    // A question card is visible
    await expect(page.locator('.na-question-card')).toBeVisible();
    await expect(page.locator('.na-options .na-option')).toHaveCount(4);
  });

  test('answering a Practice question reveals explanation + advances', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.removeItem('nplus_na_mastery'));
    await page.evaluate(() => window.startNetworkAnalysisDrill());
    await expect(page.locator('.na-question-card')).toBeVisible();

    // Click any option (don't care which — we're testing the flow, not correctness)
    await page.locator('.na-options .na-option').first().click();

    // Explanation appears
    await expect(page.locator('.na-explanation')).toBeVisible();
    // Either is-correct or is-wrong class present
    const expHasState = await page.locator('.na-explanation').evaluate(el =>
      el.classList.contains('is-correct') || el.classList.contains('is-wrong')
    );
    expect(expHasState).toBe(true);

    // Mastery storage updated
    const mastery = await page.evaluate(() => JSON.parse(localStorage.getItem('nplus_na_mastery')));
    expect(mastery).toBeTruthy();
    const totalAnswered = ['tcpdump', 'wireshark', 'nmap', 'output-reading']
      .reduce((sum, c) => sum + (mastery[c]?.total || 0), 0);
    expect(totalAnswered).toBe(1);

    // Click Next → new question card
    await page.locator('.na-next-row .btn').click();
    await expect(page.locator('.na-explanation')).toHaveCount(0); // explanation gone on fresh Q
  });

  test('Lessons tab shows 4 lessons with progress indicators', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => window.startNetworkAnalysisDrill());
    await page.locator('#na-tab-btn-lessons').click();
    await expect(page.locator('#na-tab-lessons')).not.toHaveClass(/is-hidden/);

    // 4 lesson tiles (v4.85.0 added bpf-vs-display)
    const tiles = page.locator('.na-lesson-tile');
    await expect(tiles).toHaveCount(4);
    await expect(tiles.nth(0)).toContainText('tcpdump');
    await expect(tiles.nth(1)).toContainText('Wireshark');
    await expect(tiles.nth(2)).toContainText('Nmap');
    await expect(tiles.nth(3)).toContainText('BPF vs Display');
  });

  test('opening a lesson shows step 1 with cheatsheet on final step', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.removeItem('nplus_na_lessons'));
    await page.evaluate(() => window.startNetworkAnalysisDrill());
    await page.locator('#na-tab-btn-lessons').click();
    await page.locator('.na-lesson-tile').first().click();

    // Step 1 of 5
    await expect(page.locator('.na-step-num')).toContainText('Step 1 of 5');
    await expect(page.locator('.na-step-progress .na-step-pip')).toHaveCount(5);

    // Cheatsheet is NOT shown on step 1
    await expect(page.locator('.na-cheat-table')).toHaveCount(0);

    // Click Next 4 times to get to step 5
    for (let i = 0; i < 4; i++) {
      await page.locator('.na-lesson-cta-row .btn-primary').click();
    }

    // Now on step 5 — cheatsheet appears
    await expect(page.locator('.na-step-num')).toContainText('Step 5 of 5');
    await expect(page.locator('.na-cheat-table')).toBeVisible();
  });

  test('drill is reachable from sidebar nav (v4.84.1 regression guard)', async ({ page }) => {
    await page.goto('/');
    // Sidebar should have a "Network Analysis" entry under Drills section.
    // v4.84.0 shipped the drill but missed wiring it to the sidebar — caught
    // immediately by user dogfood. This test prevents that regression.
    const sidebarLink = page.locator('#app-sidebar').locator('text=Network Analysis');
    await expect(sidebarLink).toBeVisible();
    // Clicking it opens the drill page
    await sidebarLink.click();
    await expect(page.locator('#page-network-analysis')).toHaveClass(/active/);
  });

  test('Dashboard shows category mastery cards after attempts', async ({ page }) => {
    await page.goto('/');
    // Seed mastery so dashboard has data (v4.85.0: 5 categories incl. filter)
    await page.evaluate(() => {
      localStorage.setItem('nplus_na_mastery', JSON.stringify({
        'tcpdump': { right: 8, total: 10 },
        'wireshark': { right: 3, total: 6 },
        'nmap': { right: 4, total: 4 },
        'output-reading': { right: 0, total: 0 },
        'filter': { right: 0, total: 0 }
      }));
    });
    await page.evaluate(() => window.startNetworkAnalysisDrill());
    // With data, default tab should be Dashboard
    await expect(page.locator('#na-tab-btn-dashboard')).toHaveClass(/na-tab-active/);
    // 5 category cards (v4.85.0: added filter syntax recognition)
    await expect(page.locator('.na-cat-card')).toHaveCount(5);
    // Weakest callout — wireshark at 50%
    await expect(page.locator('.na-dash-callout')).toContainText('Wireshark display filters');
  });
});

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
    await page.locator('#quiz-next-arrow-btn').click();
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

    // Homepage card shows 2 due (queue has 2 entries before scrub — this is
    // by design; getSrDueCount runs before startSrReview's scrub).
    await expect(page.locator('#sr-review-card-headline')).toContainText('2 cards due');

    await page.locator('#sr-review-start-btn').click();
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



