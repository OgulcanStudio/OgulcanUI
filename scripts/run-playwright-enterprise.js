/**
 * Run Playwright template suite with enterprise gates (security, burst perf, CDN contract).
 * Skips screenshot comparison for faster CI; use test:playwright for full visual + enterprise.
 */
const { spawnSync } = require('child_process');

process.env.PLAYWRIGHT_SKIP_VISUAL = '1';
delete process.env.PLAYWRIGHT_SKIP_ENTERPRISE;
const args = process.argv.slice(2);
const cli = require.resolve('@playwright/test/cli');
const result = spawnSync(process.execPath, [cli, 'test', ...args], {
  stdio: 'inherit',
  env: process.env
});
process.exit(result.status ?? 1);