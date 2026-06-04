/**
 * Run Playwright template suite without screenshot comparison (mount + structure only).
 */
const { spawnSync } = require('child_process');

process.env.PLAYWRIGHT_SKIP_VISUAL = '1';
process.env.PLAYWRIGHT_SKIP_ENTERPRISE = '1';
const args = process.argv.slice(2);
const cli = require.resolve('@playwright/test/cli');
const result = spawnSync(process.execPath, [cli, 'test', ...args], {
  stdio: 'inherit',
  env: process.env
});
process.exit(result.status ?? 1);