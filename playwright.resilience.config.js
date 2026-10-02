const { defineConfig, devices } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './tests',
  testMatch: /resilience-browser\.spec\.js/,
  timeout: 30000,
  retries: 0,
  workers: 1,
  use: {
    baseURL: 'http://127.0.0.1:4173',
    trace: 'retain-on-failure'
  },
  webServer: {
    command: 'python3 -m http.server 4173 --bind 127.0.0.1 --directory dist',
    url: 'http://127.0.0.1:4173/index.html',
    reuseExistingServer: true,
    timeout: 15000
  },
  projects: [
    {
      name: 'webkit-iphone',
      use: { ...devices['iPhone 13'], browserName: 'webkit' }
    },
    {
      name: 'low-end-chromium',
      use: { ...devices['iPhone 13'], browserName: 'chromium' }
    }
  ]
});
