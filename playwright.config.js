// @ts-check
const path = require('path');
const fs = require('fs');
const { defineConfig, devices } = require('@playwright/test');

const repoRoot = __dirname;
const testDir = path.join(repoRoot, 'tests/playwright');

/** Prefer system Chrome/Edge (same as browser-harness) when Playwright Chromium hangs. */
function resolveLaunchOptions() {
  if (process.env.PLAYWRIGHT_EXECUTABLE_PATH) {
    return { executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH };
  }

  const candidates = [
    process.env.OGULCAN_BROWSER_BIN,
    process.env.CHROME_BIN,
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    '/usr/bin/google-chrome',
    '/usr/bin/google-chrome-stable',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
  ].filter(Boolean);

  for (const bin of candidates) {
    if (fs.existsSync(bin)) return { executablePath: bin };
  }

  return { channel: 'chrome' };
}

/** @type {import('@playwright/test').PlaywrightTestConfig} */
module.exports = defineConfig({
  testDir,
  fullyParallel: true,
  workers: process.env.CI ? 4 : Math.min(6, require('os').cpus().length),
  timeout: 60_000,
  expect: { timeout: 15_000 },
  retries: process.env.CI ? 1 : 0,
  forbidOnly: !!process.env.CI,
  snapshotPathTemplate: '{testDir}/baselines/{arg}{ext}',
  reporter: [
    ['list'],
    ['json', { outputFile: path.join(repoRoot, 'reports/playwright-report.json') }]
  ],
  use: {
    baseURL: 'http://127.0.0.1:4173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    launchOptions: {
      ...resolveLaunchOptions(),
      args: ['--disable-dev-shm-usage', '--no-sandbox']
    }
  },
  webServer: {
    command: 'bun scripts/playwright-server.js',
    url: 'http://127.0.0.1:4173/visual-bench.html',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000
  },
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        ...resolveLaunchOptions()
      }
    }
  ]
});