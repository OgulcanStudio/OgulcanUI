/**
 * Refreshes 50 catalog painters in chart-painters-source.js.
 * Usage: node scripts/generate-banking-chart-painters.js
 */
const fs = require('fs');
const path = require('path');
const {
  CATALOG_50,
  buildPainterOpts,
  VISUAL_VARIANTS
} = require('./lib/banking-chart-catalog');

const paintersPath = path.join(__dirname, 'chart-painters-source.js');
let source = fs.readFileSync(paintersPath, 'utf8');

const MARKER_BANKING = '  // === 500 BANKING PAINTERS (auto-generated) ===';

function fnForVariant(visualVariant) {
  const v = VISUAL_VARIANTS.find((x) => x.id === visualVariant);
  return v ? v.fn : 'drawBars';
}

function painterLine(entry, index) {
  const fn = fnForVariant(entry.visualVariant);
  const opts = buildPainterOpts(entry, 1 + index);
  return `  PAINTERS.${entry.kind} = function (ctx) { const opts = ${opts}; ${fn}(ctx, opts); applyInteractionSignature(ctx, opts, ${index}); };`;
}

const catalogBlock = [
  '  // === 50 CATALOG PAINTERS (5 categories x 10) ===',
  ...CATALOG_50.map((entry, i) => painterLine(entry, i))
].join('\n');

if (source.includes(MARKER_BANKING)) {
  const re = new RegExp(
    `\\n  \\/\\/ === 500 BANKING PAINTERS \\(auto-generated\\) ===[\\s\\S]*?(?=\\n  PAINTERS\\.barsFallback)`,
    'm'
  );
  source = source.replace(re, '');
}

const reCatalog = new RegExp(
  `\\n  \\/\\/ (?:=== 50 (?:PAINTERS from scratch|LEGACY PAINTERS \\(catalog-aligned\\)|CATALOG PAINTERS|CATALOG PAINTERS \\(5 categories x 10\\)) ===|50 CATALOG PAINTERS)[\\s\\S]*?(?=\\n  PAINTERS\\.barsFallback)`,
  'm'
);

if (!reCatalog.test(source)) {
  console.error('Could not find the 50 painter registration block in chart-painters-source.js.');
  process.exit(1);
}

source = source.replace(reCatalog, `\n${catalogBlock}\n`);
source = source.replace(
  /Enterprise chart painters \(injected into chart-visual-engine\.js\)\.\s*\n \* .*50 unique enterprise visuals\./,
  'Enterprise chart painters (injected into chart-visual-engine.js).\n * Five categories. 50 unique enterprise visuals with distinct interaction signatures.'
);

fs.writeFileSync(paintersPath, source, 'utf8');

const { execSync } = require('child_process');
const bodyMatch = source.match(/module\.exports\s*=\s*`([\s\S]*)`;\s*$/);
if (!bodyMatch) {
  console.error('chart-painters-source.js must export template string');
  process.exit(1);
}

const checkPath = path.join(__dirname, '.painters-engine-check.tmp.js');
const engineStub = `(function chartVisualEngine(global) {
  const ROOT = global;
  const PALETTE = ['#2563eb'];
  const PRIMARY = '#2563eb';
  function ns() {}
  function seed() {}
  function rand() { return 0; }
  function parseData() { return null; }
  function seriesFrom() { return []; }
  function chartBox() { return { w: 320, h: 180, pad: { t: 12, r: 14, b: 26, l: 36 }, inner() { return { x: 36, y: 12, w: 270, h: 142 }; } }; }
  function clear() {}
  const PAINTERS = {};
  ${bodyMatch[1]}
})(globalThis);`;

fs.writeFileSync(checkPath, engineStub, 'utf8');
try {
  execSync(`node --check "${checkPath}"`, { stdio: 'pipe' });
} catch (_) {
  console.error('Generated painters fragment has syntax errors');
  process.exit(1);
} finally {
  try {
    fs.unlinkSync(checkPath);
  } catch (_) { /* ignore */ }
}

console.log(`Refreshed ${CATALOG_50.length} catalog PAINTERS.`);
