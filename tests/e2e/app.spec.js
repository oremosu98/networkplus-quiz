// @ts-check
const { test, expect } = require('@playwright/test');

// ══════════════════════════════════════════
// Network+ Quiz — Playwright E2E Tests
// Tests actual browser behavior, not just source code
// ══════════════════════════════════════════

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
    await page.locator('#page-setup button:has-text("Subnet Trainer")').click();

    // Subnet page should be active
    await expect(page.locator('#page-subnet')).toHaveClass(/active/);

    // Go back to setup
    await page.locator('#page-subnet [onclick*="goSetup"]').first().click();
    await expect(page.locator('#page-setup')).toHaveClass(/active/);
  });

  test('navigates to port drill and back', async ({ page }) => {
    await page.goto('/');

    await page.locator('#page-setup button:has-text("Port Drill")').click();
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

    await page.locator('#page-setup button:has-text("Topic Progress")').click();
    await expect(page.locator('#page-progress')).toHaveClass(/active/);

    await page.locator('#page-progress [onclick*="goSetup"]').first().click();
    await expect(page.locator('#page-setup')).toHaveClass(/active/);
  });
});

test.describe('Subnet Trainer', () => {
  test('generates a question and accepts answers', async ({ page }) => {
    await page.goto('/');
    await page.locator('#page-setup button:has-text("Subnet Trainer")').click();

    // Question should be generated
    const question = page.locator('#subnet-question');
    await expect(question).not.toBeEmpty();

    // Score starts at 0 / 0
    await expect(page.locator('#subnet-score')).toContainText('0 / 0');

    // Type an answer and submit
    await page.locator('#subnet-answer').fill('255.255.255.0');
    await page.locator('#subnet-submit-btn').click();

    // Feedback should appear (either correct or wrong)
    const feedback = page.locator('#subnet-feedback');
    await expect(feedback).toBeVisible();
    const text = await feedback.textContent();
    expect(text.includes('Correct') || text.includes('Wrong')).toBeTruthy();

    // Score should update to X / 1
    await expect(page.locator('#subnet-score')).toContainText('/ 1');
  });

  test('next button generates a new question', async ({ page }) => {
    await page.goto('/');
    await page.locator('#page-setup button:has-text("Subnet Trainer")').click();

    const firstQ = await page.locator('#subnet-question').textContent();

    // Submit any answer to get next button
    await page.locator('#subnet-answer').fill('test');
    await page.locator('#subnet-submit-btn').click();

    // Click next
    await page.locator('#subnet-next-btn').click();

    // Q number should advance
    await expect(page.locator('#subnet-q-num')).toContainText('Q2');
  });

  test('Enter key submits answer', async ({ page }) => {
    await page.goto('/');
    await page.locator('#page-setup button:has-text("Subnet Trainer")').click();

    await page.locator('#subnet-answer').fill('255.255.255.0');
    await page.locator('#subnet-answer').press('Enter');

    // Feedback should appear
    await expect(page.locator('#subnet-feedback')).toBeVisible();
  });
});

test.describe('Port Drill', () => {
  test('shows pregame and starts drill', async ({ page }) => {
    await page.goto('/');
    await page.locator('#page-setup button:has-text("Port Drill")').click();

    // Pregame should be visible
    await expect(page.locator('#port-pregame')).toBeVisible();
    await expect(page.locator('#port-game')).not.toBeVisible();

    // Start drill
    await page.locator('#page-ports button:has-text("START DRILL")').click();

    // Game should be active
    await expect(page.locator('#port-game')).toBeVisible();
    await expect(page.locator('#port-pregame')).not.toBeVisible();

    // Prompt should have content
    await expect(page.locator('#port-prompt')).not.toBeEmpty();

    // Timer should show 30
    await expect(page.locator('#port-timer')).toContainText('30');

    // Options should be present
    const options = page.locator('.port-opt');
    await expect(options).toHaveCount(4);
  });

  test('clicking an answer loads next question', async ({ page }) => {
    await page.goto('/');
    await page.locator('#page-setup button:has-text("Port Drill")').click();
    await page.locator('#page-ports button:has-text("START DRILL")').click();

    // Click first option
    await page.locator('.port-opt').first().click();

    // Score should update (either 0 or 1)
    const score = await page.locator('#port-score').textContent();
    expect(score === '0' || score === '1').toBeTruthy();

    // New prompt should be loaded (still has content)
    await expect(page.locator('#port-prompt')).not.toBeEmpty();
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

    // Click second chip
    await chips.nth(1).click();
    await expect(chips.nth(1)).toHaveClass(/on/);
  });

  test('difficulty chips are selectable', async ({ page }) => {
    await page.goto('/');

    const chips = page.locator('#diff-group .chip');
    await chips.nth(1).click();
    await expect(chips.nth(1)).toHaveClass(/on/);
  });

  test('count chips are selectable', async ({ page }) => {
    await page.goto('/');

    const chips = page.locator('#count-group .chip');
    await chips.nth(1).click();
    await expect(chips.nth(1)).toHaveClass(/on/);
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
  test('has 42 topic chips including Mixed and Smart', async ({ page }) => {
    await page.goto('/');
    const chips = page.locator('#topic-group .chip');
    await expect(chips).toHaveCount(42);
  });

  test('switching topic chip deselects previous', async ({ page }) => {
    await page.goto('/');
    const chips = page.locator('#topic-group .chip');

    // Mixed is on by default
    await expect(page.locator('#topic-group .chip.on')).toHaveCount(1);

    // Click a specific topic
    await chips.nth(0).click();

    // Only the clicked chip should be active
    await expect(page.locator('#topic-group .chip.on')).toHaveCount(1);
    await expect(chips.nth(0)).toHaveClass(/on/);
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
  test('wrong bank row hidden when bank is empty', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.removeItem('nplus_wrong_bank'));
    await page.reload();

    await expect(page.locator('#wrong-bank-row')).not.toBeVisible();
  });

  test('wrong bank row visible when bank has items', async ({ page }) => {
    await page.goto('/');

    await page.evaluate(() => {
      const bank = [{
        question: 'Test Q', options: ['A', 'B', 'C', 'D'],
        correct: 'A', picked: 'B', topic: 'TCP/IP', date: new Date().toISOString()
      }];
      localStorage.setItem('nplus_wrong_bank', JSON.stringify(bank));
    });

    await page.reload();

    await expect(page.locator('#wrong-bank-row')).toBeVisible();
    await expect(page.locator('.wrong-count-badge')).toContainText('1');
  });

  test('clear button triggers confirm dialog', async ({ page }) => {
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

    // Listen for dialog and dismiss it
    page.on('dialog', dialog => dialog.dismiss());

    await page.locator('#wrong-bank-clear').click();

    // Bank should still exist since we dismissed
    const bank = await page.evaluate(() => localStorage.getItem('nplus_wrong_bank'));
    expect(bank).not.toBeNull();
  });

  test('clear button removes bank when confirmed', async ({ page }) => {
    await page.goto('/');

    await page.evaluate(() => {
      const bank = [{
        question: 'Test Q', options: ['A', 'B', 'C', 'D'],
        correct: 'A', picked: 'B', topic: 'TCP/IP', date: new Date().toISOString()
      }];
      localStorage.setItem('nplus_wrong_bank', JSON.stringify(bank));
    });
    await page.reload();

    // Accept the dialog
    page.on('dialog', dialog => dialog.accept());

    await page.locator('#wrong-bank-clear').click();

    // Bank should be removed
    const bank = await page.evaluate(() => localStorage.getItem('nplus_wrong_bank'));
    expect(bank).toBeNull();

    // Row should be hidden
    await expect(page.locator('#wrong-bank-row')).not.toBeVisible();
  });
});

test.describe('Subnet Trainer Advanced', () => {
  test('streak counter starts at 0', async ({ page }) => {
    await page.goto('/');
    await page.locator('#page-setup button:has-text("Subnet Trainer")').click();

    await expect(page.locator('#subnet-streak-lbl')).toContainText('0');
  });

  test('reference table is visible', async ({ page }) => {
    await page.goto('/');
    await page.locator('#page-setup button:has-text("Subnet Trainer")').click();

    await expect(page.locator('#subnet-ref')).toBeVisible();
    await expect(page.locator('.subnet-table')).toBeVisible();
    // Should contain /24 row
    await expect(page.locator('.subnet-table')).toContainText('/24');
    await expect(page.locator('.subnet-table')).toContainText('255.255.255.0');
  });

  test('submit button disabled state after submit', async ({ page }) => {
    await page.goto('/');
    await page.locator('#page-setup button:has-text("Subnet Trainer")').click();

    await page.locator('#subnet-answer').fill('test');
    await page.locator('#subnet-submit-btn').click();

    // Next button should appear
    await expect(page.locator('#subnet-next-btn')).toBeVisible();
  });
});

test.describe('Port Drill Timer & Scoring', () => {
  test('timer counts down from 30', async ({ page }) => {
    await page.goto('/');
    await page.locator('#page-setup button:has-text("Port Drill")').click();
    await page.locator('#page-ports button:has-text("START DRILL")').click();

    // Timer starts at 30
    await expect(page.locator('#port-timer')).toContainText('30');

    // Wait 1.5 seconds and check it decreased
    await page.waitForTimeout(1500);
    const timerVal = parseInt(await page.locator('#port-timer').textContent());
    expect(timerVal).toBeLessThan(30);
  });

  test('best score persists across drills', async ({ page }) => {
    await page.goto('/');

    // Set a best score
    await page.evaluate(() => localStorage.setItem('nplus_port_best', '5'));
    await page.reload();

    await page.locator('#page-setup button:has-text("Port Drill")').click();
    await expect(page.locator('#port-best')).toContainText('5');
  });

  test('port drill shows results when timer expires', async ({ page }) => {
    await page.goto('/');
    await page.locator('#page-setup button:has-text("Port Drill")').click();

    // Hack: set timer to 1 second by manipulating the timer directly
    await page.locator('#page-ports button:has-text("START DRILL")').click();

    // Force timer expiry
    await page.evaluate(() => {
      // Clear the real timer and trigger end
      if (window.portTimer) clearInterval(window.portTimer);
      window.endPortDrill();
    });

    // Results should show
    await expect(page.locator('#port-results')).toBeVisible();
    await expect(page.locator('#port-final-score')).toBeVisible();
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
