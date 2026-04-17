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

    // Title is present
    await expect(page.locator('h1')).toContainText('Network+ AI Quiz');

    // API key input is visible
    await expect(page.locator('#api-key')).toBeVisible();

    // Version badge is visible and contains a version number
    const badge = page.locator('#version-badge');
    await expect(badge).toBeVisible();
    await expect(badge).toHaveText(/v\d+\.\d+/);
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

    // Default: no data-theme attribute (dark)
    const html = page.locator('html');

    // Click theme toggle
    await page.locator('#theme-toggle').click();
    await expect(html).toHaveAttribute('data-theme', 'light');

    // Click again to go back to dark
    await page.locator('#theme-toggle').click();
    // Dark mode removes the attribute or sets it to empty
    const themeAttr = await html.getAttribute('data-theme');
    expect(!themeAttr || themeAttr === 'dark' || themeAttr === '').toBeTruthy();
  });
});

test.describe('Navigation', () => {
  test('navigates to subnet trainer and back', async ({ page }) => {
    await page.goto('/');

    // Find and click the Subnet Trainer button
    await page.locator('#page-setup button[onclick*="startSubnetTrainer"]').click();

    // Subnet page should be active
    await expect(page.locator('#page-subnet')).toHaveClass(/active/);

    // Go back to setup
    await page.locator('#page-subnet [onclick*="goSetup"]').first().click();
    await expect(page.locator('#page-setup')).toHaveClass(/active/);
  });

  test('navigates to port drill and back', async ({ page }) => {
    await page.goto('/');

    await page.locator('#drills-launcher-btn').click();
    await page.locator('#page-drills button:has-text("Port Drill")').click();
    await expect(page.locator('#page-ports')).toHaveClass(/active/);

    await page.locator('#page-ports [onclick*="goSetup"]').first().click();
    await expect(page.locator('#page-setup')).toHaveClass(/active/);
  });

  test('navigates to analytics and back', async ({ page }) => {
    await page.goto('/');

    await page.locator('#page-setup button:has-text("Analytics")').click();
    await expect(page.locator('#page-analytics')).toHaveClass(/active/);

    await page.locator('#page-analytics [onclick*="goSetup"]').first().click();
    await expect(page.locator('#page-setup')).toHaveClass(/active/);
  });

  test('navigates to topic progress and back', async ({ page }) => {
    await page.goto('/');

    await page.locator('#page-setup button[onclick*="renderProgressPage"]').click();
    await expect(page.locator('#page-progress')).toHaveClass(/active/);

    await page.locator('#page-progress [onclick*="goSetup"]').first().click();
    await expect(page.locator('#page-setup')).toHaveClass(/active/);
  });
});

// Shared helpers for the Subnet Trainer practice flow (v4.43.4 rewrite).
// The Subnet Trainer now defaults to the Learn tab; switching to Practice
// triggers stNextQuestion(), renders the question into #st-question, and
// populates #st-answer-area with either a text input (#st-answer-input +
// #st-submit-btn) or MCQ buttons (.st-mcq-btn) depending on question type.
async function gotoSubnetPractice(page) {
  await page.locator('#page-setup button[onclick*="startSubnetTrainer"]').click();
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
  await page.locator('#drills-launcher-btn').click();
  await page.locator('#page-drills button:has-text("Port Drill")').click();
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

test.describe('Data Export/Import', () => {
  test('export button is clickable', async ({ page }) => {
    await page.goto('/');

    // Scroll to export button and verify it exists
    const exportBtn = page.locator('#page-setup button:has-text("Export")');
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

    // Clear any saved key and try to start quiz
    await page.locator('#api-key').fill('');
    await page.locator('#page-setup button:has-text("Generate Quiz")').click();

    // Error should appear
    const err = page.locator('#setup-err');
    await expect(err).toBeVisible();
    await expect(err).toContainText('API key');
  });

  test('shows error for invalid API key format', async ({ page }) => {
    await page.goto('/');

    await page.locator('#api-key').fill('invalid-key-123');
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
    await expect(page.locator('h1')).toBeVisible();
    await expect(page.locator('#api-key')).toBeVisible();
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
    await page.locator('#api-key').fill('sk-ant-api03-test123');

    // Try to generate quiz — it will save the key to localStorage even if it fails
    await page.locator('#page-setup button:has-text("Generate Quiz")').click();

    // Check localStorage
    const savedKey = await page.evaluate(() => localStorage.getItem('nplus_key'));
    expect(savedKey).toBe('sk-ant-api03-test123');
  });

  test('restores API key from localStorage on reload', async ({ page }) => {
    await page.goto('/');

    // Set key in localStorage
    await page.evaluate(() => localStorage.setItem('nplus_key', 'sk-ant-api03-persisted'));

    // Reload
    await page.reload();

    // Input should have the saved key
    const val = await page.locator('#api-key').inputValue();
    expect(val).toBe('sk-ant-api03-persisted');
  });
});

test.describe('Theme Persistence', () => {
  test('persists light theme across reload', async ({ page }) => {
    await page.goto('/');

    // Switch to light theme
    await page.locator('#theme-toggle').click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');

    // Reload
    await page.reload();

    // Should still be light
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  });

  test('theme toggle updates button text', async ({ page }) => {
    await page.goto('/');

    // Dark mode default: sun emoji
    const btn = page.locator('#theme-toggle');

    // Switch to light — should show moon
    await btn.click();
    await expect(btn).toContainText('🌙');

    // Switch back to dark — should show sun
    await btn.click();
    await expect(btn).toContainText('☀️');
  });
});

test.describe('Exam Button Validation', () => {
  test('shows error for empty API key on exam start', async ({ page }) => {
    await page.goto('/');
    await page.locator('#api-key').fill('');
    await page.locator('#page-setup button:has-text("Simulate Full Exam")').click();

    const err = page.locator('#setup-err');
    await expect(err).toBeVisible();
    await expect(err).toContainText('API key');
  });

  test('shows error for invalid API key on exam start', async ({ page }) => {
    await page.goto('/');
    await page.locator('#api-key').fill('bad-key');
    await page.locator('#page-setup button:has-text("Simulate Full Exam")').click();

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

  test('history panel shows when history exists', async ({ page }) => {
    await page.goto('/');

    // Inject fake history
    await page.evaluate(() => {
      const history = [{
        topic: 'TCP/IP Basics', score: 8, total: 10, pct: 80,
        date: new Date().toISOString(), mode: 'quiz', difficulty: 'Exam Level'
      }];
      localStorage.setItem('nplus_history', JSON.stringify(history));
    });

    await page.reload();

    await expect(page.locator('#history-panel')).toBeVisible();
    await expect(page.locator('#history-list')).toContainText('TCP/IP');
  });

  test('stats card shows when history exists', async ({ page }) => {
    await page.goto('/');

    await page.evaluate(() => {
      const history = [{
        topic: 'Subnetting', score: 7, total: 10, pct: 70,
        date: new Date().toISOString(), mode: 'quiz', difficulty: 'Exam Level'
      }];
      localStorage.setItem('nplus_history', JSON.stringify(history));
    });

    await page.reload();

    await expect(page.locator('#stats-card')).toBeVisible();
    await expect(page.locator('#stats-grid')).toContainText('70%');
  });

  test('stats card hidden when no history', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.removeItem('nplus_history'));
    await page.reload();

    await expect(page.locator('#stats-card')).not.toBeVisible();
  });
});

test.describe('Readiness Card', () => {
  test('readiness card shows placeholder when no history', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.removeItem('nplus_history'));
    await page.reload();

    await expect(page.locator('#readiness-card')).toBeVisible();
    await expect(page.locator('#readiness-action')).toContainText('first quiz');
  });

  test('readiness card shows score with history', async ({ page }) => {
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
    const numText = await page.locator('#readiness-num').textContent();
    expect(numText).not.toBe('—');
  });
});

test.describe('Wrong Bank Behavior', () => {
  // v4.41.0: legacy #wrong-bank-row deleted. The "Drill Mistakes" preset tile
  // (#wrong-preset-tile) is now the only drill entry, and the Clear button
  // moved into the Settings <details> section.

  test('wrong-preset-tile hidden when bank is empty', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.removeItem('nplus_wrong_bank'));
    await page.reload();

    await expect(page.locator('#wrong-preset-tile')).not.toBeVisible();
  });

  test('wrong-preset-tile visible when bank has items', async ({ page }) => {
    await page.goto('/');

    await page.evaluate(() => {
      const bank = [{
        question: 'Test Q', options: ['A', 'B', 'C', 'D'],
        correct: 'A', picked: 'B', topic: 'TCP/IP', date: new Date().toISOString()
      }];
      localStorage.setItem('nplus_wrong_bank', JSON.stringify(bank));
    });

    await page.reload();

    await expect(page.locator('#wrong-preset-tile')).toBeVisible();
    await expect(page.locator('#wrong-preset-sub')).toContainText('1');
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

    // Open the Settings <details> section (v4.41.0: clear button lives here now)
    await page.evaluate(() => { document.getElementById('advanced-section').open = true; });

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

    // Open the Settings <details> section (v4.41.0: clear button lives here now)
    await page.evaluate(() => { document.getElementById('advanced-section').open = true; });

    // Accept the dialog
    page.on('dialog', dialog => dialog.accept());

    await page.locator('#wrong-bank-clear').click();

    // Bank should be removed
    const bank = await page.evaluate(() => localStorage.getItem('nplus_wrong_bank'));
    expect(bank).toBeNull();

    // Preset tile should be hidden
    await expect(page.locator('#wrong-preset-tile')).not.toBeVisible();
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

  test('port best score persists via localStorage and surfaces in Analytics', async ({ page }) => {
    // v4.43.4: port best is no longer shown on the Port Drill page itself;
    // it renders in the Analytics Drills section (#ana-s-drills) via
    // _renderAnaDrills(). The Analytics page is gated behind "at least one
    // quiz in history" (renderAnalytics exits early otherwise), so we seed
    // one minimal history entry alongside the port-best value.
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.setItem('nplus_port_best', '7');
      localStorage.setItem('nplus_history', JSON.stringify([{
        topic: 'TCP/IP Basics', score: 5, total: 10, pct: 50,
        date: new Date().toISOString(), mode: 'quiz', difficulty: 'Exam Level'
      }]));
    });
    await page.reload();

    // Navigate to Analytics
    await page.locator('#page-setup button[onclick*="renderAnalytics"]').click();

    // #ana-s-drills is the Drills section wrapper — contains the Port Drill card
    const drillsSection = page.locator('#ana-s-drills');
    await expect(drillsSection).toBeVisible();
    await expect(drillsSection).toContainText('Port Drill');
    await expect(drillsSection).toContainText('7'); // timed best
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

    // The keyboard hint div exists in the quiz page
    const kbHint = page.locator('#page-quiz .kb-hint');
    await expect(kbHint).toContainText('A');
    await expect(kbHint).toContainText('B');
    await expect(kbHint).toContainText('C');
    await expect(kbHint).toContainText('D');
    await expect(kbHint).toContainText('Enter');
    await expect(kbHint).toContainText('flag');
  });

  test('exam page shows keyboard shortcut hints', async ({ page }) => {
    await page.goto('/');

    const kbHint = page.locator('#page-exam .kb-hint');
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

    // Listen for download
    const downloadPromise = page.waitForEvent('download');
    await page.locator('#page-setup button:has-text("Export")').click();
    const download = await downloadPromise;

    // Verify filename pattern
    expect(download.suggestedFilename()).toMatch(/networkplus.*\.json/);
  });
});

test.describe('Streak Badge', () => {
  test('streak badge shows when streak exists', async ({ page }) => {
    await page.goto('/');

    await page.evaluate(() => {
      localStorage.setItem('nplus_streak', JSON.stringify({
        current: 3, best: 5, lastDate: new Date().toISOString().slice(0, 10)
      }));
    });
    await page.reload();

    await expect(page.locator('#streak-badge')).not.toBeEmpty();
  });

  test('streak badge empty when no streak data', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.removeItem('nplus_streak'));
    await page.reload();

    const text = await page.locator('#streak-badge').textContent();
    expect(text.trim()).toBe('');
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

    const badge = page.locator('#version-badge');
    await badge.click();
    await badge.click();
    await badge.click();

    await expect(page.locator('#page-monitor')).toHaveClass(/active/);
    await expect(page.locator('#monitor-stats')).toBeVisible();
  });

  test('monitor shows empty state when no errors', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.removeItem('nplus_error_log'));

    const badge = page.locator('#version-badge');
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

    const badge = page.locator('#version-badge');
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

    const badge = page.locator('#version-badge');
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
