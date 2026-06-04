/**
 * Remove all non-chart components; keep exactly 50 from charts-allowlist.
 * Usage: bun scripts/prune-to-charts.js
 */
const fs = require('fs');
const path = require('path');
const { CHARTS_ALLOWLIST } = require('./lib/charts-allowlist');

const rootDir = path.join(__dirname, '..');
const componentsDir = path.join(rootDir, 'src', 'components');
const allow = new Set(CHARTS_ALLOWLIST);

const folders = fs.readdirSync(componentsDir).filter((name) => {
  const full = path.join(componentsDir, name);
  return fs.statSync(full).isDirectory();
});

let removed = 0;
for (const name of folders) {
  if (allow.has(name)) continue;
  fs.rmSync(path.join(componentsDir, name), { recursive: true, force: true });
  removed += 1;
}

const remaining = fs.readdirSync(componentsDir)
  .filter((name) => fs.statSync(path.join(componentsDir, name)).isDirectory())
  .sort();

const missing = CHARTS_ALLOWLIST.filter((name) => !remaining.includes(name));
if (missing.length) {
  console.error(`Missing chart folders: ${missing.join(', ')}`);
  process.exit(1);
}

if (remaining.length !== 50) {
  console.error(`Expected 50 components, found ${remaining.length}`);
  process.exit(1);
}

const manifestPath = path.join(rootDir, 'src', 'components.json');
fs.writeFileSync(manifestPath, `${JSON.stringify(remaining, null, 2)}\n`, 'utf8');

console.log(`Removed ${removed} non-chart components.`);
console.log(`Kept ${remaining.length} chart components.`);