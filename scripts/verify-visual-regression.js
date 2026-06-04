const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const {
  resolveBrowserPath,
  getOpenPort,
  startStaticServer,
  closeServer,
  waitForPageTarget,
  createCdpClient,
  waitForFlag,
  evalInPage,
  setViewport,
  captureScreenshot,
  safeRm,
  waitForBrowserExit,
  launchBrowser
} = require('./browser-harness');

const rootDir = path.join(__dirname, '..');
const reportsDir = path.join(rootDir, 'reports');
const scratchDir = path.join(rootDir, 'scratch');
const visualPage = '/visual-bench.html';
const baselineDir = path.join(rootDir, 'visual-baselines');
const actualDir = path.join(reportsDir, 'visual-actual');
const specsPath = path.join(baselineDir, 'specs.json');
const { parseUserArgv, printHelp, resolveTargets } = require('./lib/cli');

const argv = process.argv.slice(2);
const parsed = parseUserArgv(argv);
const updateBaseline = argv.includes('--update');
const PIXEL_DIFF_RATIO_FAIL = 0.002;

const green = '\x1b[32m';
const red = '\x1b[31m';
const cyan = '\x1b[36m';
const yellow = '\x1b[33m';
const reset = '\x1b[0m';
const bold = '\x1b[1m';

async function main() {
  if (parsed.help) {
    printHelp('OgulcanUI — visual regression', [
      'Usage:',
      '  bun run test',
      '  bun scripts/verify-visual-regression.js',
      '  bun scripts/verify-visual-regression.js <ComponentName>',
      '  bun scripts/verify-visual-regression.js --update <ComponentName>',
      '  -h, --help'
    ]);
    process.exit(0);
  }

  let specs = JSON.parse(fs.readFileSync(specsPath, 'utf8'));
  if (parsed.names.length) {
    try {
      const names = resolveTargets(
        parsed.names,
        specs.map((s) => s.name)
      );
      specs = specs.filter((s) => names.includes(s.name));
    } catch (err) {
      console.error(`${red}${err.message}${reset}`);
      process.exit(1);
    }
  }
  const browserPath = resolveBrowserPath();
  const serverPort = await getOpenPort();
  const cdpPort = await getOpenPort();
  const server = await startStaticServer(rootDir, serverPort, visualPage);

  fs.mkdirSync(scratchDir, { recursive: true });
  fs.mkdirSync(reportsDir, { recursive: true });
  fs.mkdirSync(actualDir, { recursive: true });
  const profileDir = path.join(scratchDir, `browser-visual-profile-${process.pid}-${Date.now()}`);
  fs.mkdirSync(profileDir, { recursive: true });

  let browser;
  let cdp;
  try {
    browser = launchBrowser(
      browserPath,
      cdpPort,
      profileDir,
      `http://127.0.0.1:${serverPort}${visualPage}`,
      ['--hide-scrollbars']
    );

    const target = await waitForPageTarget(cdpPort, `http://127.0.0.1:${serverPort}${visualPage}`);
    cdp = await createCdpClient(target.webSocketDebuggerUrl);
    await cdp.send('Runtime.enable');
    await cdp.send('Page.enable');
    await waitForFlag(cdp, 'window.__OGULCAN_VISUAL_READY__ === true', 15000, 'visual page');

    console.log(`${bold}${cyan}OgulcanUI Visual Regression${reset}`);
    console.log(`Browser: ${browserPath}`);
    console.log(`Snapshots: ${specs.length}${updateBaseline ? ' (baseline update)' : ''}\n`);

    const report = {
      generatedAt: new Date().toISOString(),
      browserPath,
      baselineUpdated: updateBaseline,
      totalSnapshots: specs.length,
      passed: 0,
      failed: 0,
      snapshots: []
    };
    const failures = [];

    for (const spec of specs) {
      const png = await renderSnapshot(cdp, spec);
      const actualPath = path.join(actualDir, `${spec.name}.png`);
      fs.writeFileSync(actualPath, png);

      const actualHash = sha256(png);
      const baselinePath = path.join(baselineDir, `${spec.name}.png`);
      let passed = true;
      let expectedHash = null;
      let reason = 'match';
      let diff = null;

      if (updateBaseline || !fs.existsSync(baselinePath)) {
        fs.writeFileSync(baselinePath, png);
        expectedHash = actualHash;
        reason = updateBaseline ? 'baseline-updated' : 'baseline-created';
      } else {
        const baselinePng = fs.readFileSync(baselinePath);
        expectedHash = sha256(baselinePng);
        diff = await evalInPage(
          cdp,
          `window.compareVisualPngs(${JSON.stringify(baselinePng.toString('base64'))}, ${JSON.stringify(png.toString('base64'))})`,
          true
        );
        const diffRatio = diff.totalPixels > 0 ? diff.diffPixels / diff.totalPixels : 1;
        passed = diffRatio <= PIXEL_DIFF_RATIO_FAIL;
        reason = passed ? 'pixel-match' : 'pixel-diff';
      }

      report.snapshots.push({
        name: spec.name,
        width: spec.width,
        height: spec.height,
        baselinePath,
        actualPath,
        expectedHash,
        actualHash,
        pixelDiff: diff,
        passed,
        reason
      });

      if (passed) {
        report.passed++;
        const tag = reason === 'baseline-updated' || reason === 'baseline-created' ? 'SYNC' : 'PASS';
        const color = reason === 'baseline-updated' || reason === 'baseline-created' ? yellow : green;
        console.log(`[${color}${tag}${reset}] ${spec.name}`);
      } else {
        report.failed++;
        failures.push(spec.name);
        console.log(`[${red}FAIL${reset}] ${spec.name}`);
        console.log(`  ${red}x expected ${expectedHash}${reset}`);
        console.log(`  ${red}x actual   ${actualHash}${reset}`);
        if (diff) {
          console.log(`  ${red}x diff px  ${diff.diffPixels}/${diff.totalPixels} maxΔ ${diff.maxChannelDelta}${reset}`);
        }
      }
    }

    const reportPath = path.join(reportsDir, 'visual-regression.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf8');

    console.log(`\n${bold}--- Visual Summary ---${reset}`);
    console.log(`${green}Passed: ${report.passed}${reset}`);
    if (report.failed > 0) {
      console.log(`${red}Failed: ${report.failed}${reset} [${failures.join(', ')}]`);
      console.log(`${cyan}Report: ${reportPath}${reset}`);
      process.exitCode = 1;
    } else {
      console.log(`${green}All ${report.passed} visual snapshots matched baseline.${reset}`);
      console.log(`${cyan}Report: ${reportPath}${reset}`);
    }
  } finally {
    if (cdp) {
      try { await cdp.close(); } catch {}
    }
    if (browser && !browser.killed) {
      const exited = waitForBrowserExit(browser);
      browser.kill();
      await exited;
    }
    await closeServer(server);
    safeRm(profileDir);
  }
}

async function renderSnapshot(cdp, spec) {
  const viewportWidth = spec.width + 48;
  const viewportHeight = spec.height + 48;
  await setViewport(cdp, viewportWidth, viewportHeight, 1);
  const rect = await evalInPage(
    cdp,
    `window.renderOgulcanVisualFor(${JSON.stringify(spec)})`,
    true
  );
  return captureScreenshot(cdp, {
    x: Math.max(0, Math.floor(rect.x)),
    y: Math.max(0, Math.floor(rect.y)),
    width: Math.ceil(rect.width),
    height: Math.ceil(rect.height),
    scale: 1
  });
}

function sha256(buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

main().catch((err) => {
  console.error(`${red}Visual regression failed: ${err.message}${reset}`);
  process.exit(1);
});
