/**
 * Ensures Playwright template specs cover 100% of the banking chart catalog.
 *
 * Usage:
 *   bun scripts/verify-playwright-coverage.js
 */

const fs = require('fs');
const path = require('path');

const { CHARTS_ALLOWLIST } = require('./lib/charts-allowlist');

const specsPath = path.join(__dirname, '../tests/playwright/component-specs.json');
const baselinesDir = path.join(__dirname, '../tests/playwright/baselines');

function main() {
  if (!fs.existsSync(specsPath)) {
    console.error('Missing tests/playwright/component-specs.json — run: bun run generate-playwright-specs');
    process.exit(1);
  }

  const specs = JSON.parse(fs.readFileSync(specsPath, 'utf8'));
  const specNames = new Set(specs.map((s) => s.name));
  const allow = new Set(CHARTS_ALLOWLIST);

  const missingFromSpecs = CHARTS_ALLOWLIST.filter((n) => !specNames.has(n));
  const extraInSpecs = specs.map((s) => s.name).filter((n) => !allow.has(n));

  if (specs.length !== 50) {
    console.error(`Expected 50 Playwright specs, got ${specs.length}`);
    process.exit(1);
  }

  if (missingFromSpecs.length) {
    console.error(`Catalog names missing from component-specs.json (${missingFromSpecs.length}):`);
    missingFromSpecs.slice(0, 20).forEach((n) => console.error(`  - ${n}`));
    process.exit(1);
  }

  if (extraInSpecs.length) {
    console.error(`Specs not in CHARTS_ALLOWLIST (${extraInSpecs.length}):`);
    extraInSpecs.slice(0, 20).forEach((n) => console.error(`  - ${n}`));
    process.exit(1);
  }

  const requireBaselines = process.argv.includes('--require-baselines');
  if (requireBaselines) {
    const missingPng = CHARTS_ALLOWLIST.filter(
      (n) => !fs.existsSync(path.join(baselinesDir, `${n}.png`))
    );
    if (missingPng.length) {
      console.error(`Missing screenshot baselines (${missingPng.length}):`);
      missingPng.slice(0, 20).forEach((n) => console.error(`  - ${n}.png`));
      console.error('Run: bun run test:playwright:update');
      process.exit(1);
    }
    console.log(`Playwright coverage OK — ${specs.length} specs, ${specs.length} baselines.`);
    return;
  }

  const baselineCount = fs.existsSync(baselinesDir)
    ? fs.readdirSync(baselinesDir).filter((f) => f.endsWith('.png')).length
    : 0;

  console.log(`Playwright coverage OK — ${specs.length}/${CHARTS_ALLOWLIST.length} components in template specs.`);
  console.log(`  Screenshot baselines on disk: ${baselineCount}`);
  if (baselineCount < specs.length) {
    console.log('  Tip: bun run test:playwright:update  (creates tests/playwright/baselines/*.png)');
  }
}

main();