const fs = require('fs');
const path = require('path');

const rootDir = path.join(__dirname, '..');
const packageJsonPath = path.join(rootDir, 'package.json');

function fail(message) {
  console.error(`Package verify failed: ${message}`);
  process.exit(1);
}

function ensureFile(filePath) {
  if (!fs.existsSync(filePath)) {
    fail(`Missing file: ${filePath}`);
  }
}

function assertNoRemoteCss(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  if (/@import\s+url\(\s*['"]?https?:/i.test(content)) {
    fail(`Remote @import not allowed in ${filePath}`);
  }
  if (/url\(\s*['"]?https?:/i.test(content)) {
    fail(`Remote url() asset not allowed in ${filePath}`);
  }
}

function resolveExportTarget(target) {
  return path.join(rootDir, target.replace(/^\.\//, ''));
}

function main() {
  const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

  const expectedFiles = [
    'dist/ogulcan-ui.js',
    'dist/ogulcan-ui.css',
    'dist/ogulcan-bank.js',
    'dist/components.json',
    'dist/components-manifest.js',
    'README.md',
    'LICENSE'
  ];

  expectedFiles.forEach((file) => ensureFile(path.join(rootDir, file)));

  if (!pkg.main || pkg.main !== 'dist/ogulcan-ui.js') {
    fail('package.json main must point to dist/ogulcan-ui.js');
  }
  if (!pkg.style || pkg.style !== 'dist/ogulcan-ui.css') {
    fail('package.json style must point to dist/ogulcan-ui.css');
  }
  if (!pkg.exports || !pkg.exports['.']) {
    fail('package.json exports missing "." entry');
  }

  const rootExport = pkg.exports['.'];
  const exportTargets = [];
  if (typeof rootExport === 'string') exportTargets.push(rootExport);
  if (rootExport.default) exportTargets.push(rootExport.default);
  if (rootExport.import) exportTargets.push(rootExport.import);
  if (rootExport.require) exportTargets.push(rootExport.require);

  exportTargets.forEach((target) => ensureFile(resolveExportTarget(target)));

  const styleExport = pkg.exports['./styles.css'];
  if (!styleExport) {
    fail('package.json exports missing "./styles.css" entry');
  }
  ensureFile(resolveExportTarget(styleExport));

  const bankExport = pkg.exports['./bank'];
  if (!bankExport) {
    fail('package.json exports missing "./bank" entry');
  }
  const bankTarget = typeof bankExport === 'string' ? bankExport : bankExport.default;
  if (!bankTarget) {
    fail('package.json "./bank" export must resolve to dist/ogulcan-bank.js');
  }
  ensureFile(resolveExportTarget(bankTarget));

  if (!pkg.engines || !pkg.engines.bun) {
    fail('package.json engines.bun is required (Bun-only toolchain)');
  }

  if (!Array.isArray(pkg.files) || !pkg.files.includes('dist')) {
    fail('package.json files must include dist');
  }

  assertNoRemoteCss(path.join(rootDir, 'src', 'ogulcan-ui.css'));
  assertNoRemoteCss(path.join(rootDir, 'dist', 'ogulcan-ui.css'));

  console.log('Package verify passed.');
}

main();
