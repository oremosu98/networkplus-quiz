// @ts-check
const { defineConfig } = require('@playwright/test');

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
    { name: 'chromium', use: { browserName: 'chromium' } },
  ],
  webServer: {
    command: 'npx serve . -l 3131 -s',
    port: 3131,
    reuseExistingServer: !process.env.CI,
    timeout: 10000,
  },
});
