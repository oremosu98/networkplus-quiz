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
    const badge = page.locator('#page-setup .hero span:has-text("v3.")');
    await expect(badge).toBeVisible();
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
