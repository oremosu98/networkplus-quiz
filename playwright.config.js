// @ts-check
const { defineConfig, devices } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './tests/e2e',
  timeout: 30000,
  retries: 1,
  reporter: [['html', { open: 'never' }], ['list']],
  use: {
    baseURL: 'http://localhost:3131',
    screenshot: 'only-on-failure',
    serviceWorkers: 'block', // Prevent SW caching interference in tests
  },
  projects: [
    // Chromium is the GATING browser. CI runs `--project=chromium` only.
    // Tests must pass here before any deploy.
    // v7.8.2: cert-app projects ignore landing.spec.js — that targets the
    // landing/ codebase on :3132 via the `landing` project below.
    { name: 'chromium', testIgnore: /landing\.spec\.js/, use: { browserName: 'chromium' } },

    // v4.99.29 (iOS Plan Phase 3) — WebKit + Mobile Safari projects.
    // These run iOS Safari behavior locally (~95% match — Playwright's
    // WebKit is the same engine Safari uses). Not yet in CI's gating
    // path because (a) the Chromium suite has pre-existing failing tests
    // that need triage first, and (b) WebKit/Mobile Safari surface
    // additional iOS-specific failures that we want to track separately
    // before requiring them.
    //
    // Run locally:
    //   npm run test:webkit          → desktop Safari simulation
    //   npm run test:mobile-safari   → iPhone 14 simulation
    //   npm run test:e2e             → all 3 projects in parallel
    //
    // Once stable, promote to CI by removing the --project=chromium
    // filter in .github/workflows/ci.yml. See IOS_TESTING.md for the
    // full recipe + iPhone-via-USB Develop-menu setup.
    { name: 'webkit', testIgnore: /landing\.spec\.js/, use: { ...devices['Desktop Safari'] } },
    { name: 'mobile-safari', testIgnore: /landing\.spec\.js/, use: { ...devices['iPhone 14'] } },

    // v7.8.2: landing-site E2E project. Runs ONLY landing.spec.js against the
    // landing/ codebase served on :3132 (second webServer below). CI gates on
    // it via `--project=landing` alongside chromium. Guards the cd8c784
    // cert-coverage contract (8 canonical exams, no phantom certs).
    { name: 'landing', testMatch: /landing\.spec\.js/, use: { browserName: 'chromium', baseURL: 'http://localhost:3132' } },
  ],
  webServer: [
    {
      command: 'npx serve . -l 3131 -s',
      port: 3131,
      reuseExistingServer: !process.env.CI,
      timeout: 10000,
    },
    // v7.8.2: landing site served from landing/ for the `landing` project.
    // NO -s flag: the landing site is multi-page (account.html / analytics.html
    // etc.), not an SPA — `-s` would mask every route behind index.html. serve's
    // cleanUrls maps /analytics -> analytics.html (matches prod vercel.json).
    {
      command: 'npx serve landing -l 3132',
      port: 3132,
      reuseExistingServer: !process.env.CI,
      timeout: 10000,
    },
  ],
});
