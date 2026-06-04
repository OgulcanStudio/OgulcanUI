const fs = require('fs');
const path = require('path');

const criteria = require('./verify-criteria');
const { parseUserArgv, printHelp, resolveTargets, loadComponentCatalog } = require('./lib/cli');
const {
  resolveBrowserPath,
  getOpenPort,
  startStaticServer,
  closeServer,
  waitForPageTarget,
  createCdpClient,
  waitForBenchReady,
  evalInPage,
  safeRm,
  waitForBrowserExit,
  launchBrowser
} = require('./browser-harness');

const rootDir = path.join(__dirname, '..');
const reportsDir = path.join(rootDir, 'reports');
const scratchDir = path.join(rootDir, 'scratch');
const browserBenchPage = '/browser-bench.html';

const green = '\x1b[32m';
const red = '\x1b[31m';
const yellow = '\x1b[33m';
const cyan = '\x1b[36m';
const reset = '\x1b[0m';
const bold = '\x1b[1m';

async function main() {
  const parsed = parseUserArgv(process.argv.slice(2));
  if (parsed.help) {
    printHelp('OgulcanUI — accessibility audit', [
      'Usage:',
      '  bun run test',
      '  bun scripts/verify-accessibility.js',
      '  bun scripts/verify-accessibility.js <ComponentName>',
      '  -h, --help'
    ]);
    process.exit(0);
  }

  const catalog = loadComponentCatalog(path.join(rootDir, 'src/components.json'));
  let componentNames;
  try {
    componentNames = resolveTargets(parsed.names, catalog);
  } catch (err) {
    console.error(`${red}${err.message}${reset}`);
    process.exit(1);
  }
  const browserPath = resolveBrowserPath();
  const serverPort = await getOpenPort();
  const cdpPort = await getOpenPort();
  const server = await startStaticServer(rootDir, serverPort, browserBenchPage);

  fs.mkdirSync(scratchDir, { recursive: true });
  const profileDir = path.join(scratchDir, `browser-a11y-profile-${process.pid}-${Date.now()}`);
  fs.mkdirSync(profileDir, { recursive: true });

  let browser;
  let cdp;
  try {
    browser = launchBrowser(
      browserPath,
      cdpPort,
      profileDir,
      `http://127.0.0.1:${serverPort}${browserBenchPage}`
    );

    const target = await waitForPageTarget(cdpPort, `http://127.0.0.1:${serverPort}${browserBenchPage}`);
    cdp = await createCdpClient(target.webSocketDebuggerUrl);
    await cdp.send('Runtime.enable');
    await cdp.send('Page.enable');
    await waitForBenchReady(cdp);

    console.log(`${bold}${cyan}OgulcanUI Accessibility Audit${reset}`);
    console.log(`Browser: ${browserPath}`);
    console.log(`Components: ${componentNames.length}\n`);

    const report = {
      generatedAt: new Date().toISOString(),
      browserPath,
      totalComponents: componentNames.length,
      passed: 0,
      failed: 0,
      warnings: 0,
      components: []
    };

    const failures = [];

    for (const name of componentNames) {
      const audited = await evalInPage(
        cdp,
        `window.runOgulcanAccessibilityAuditFor(${JSON.stringify(name)})`,
        true
      );
      const passed = audited.issues.length === 0;
      report.warnings += audited.warnings.length;
      report.components.push({
        name,
        tag: `ogulcan-${name.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase()}`,
        tier: criteria.getComponentTier(name),
        passed,
        issues: audited.issues,
        warnings: audited.warnings
      });

      if (passed) {
        report.passed++;
        const warnText = audited.warnings.length > 0 ? ` ${yellow}(${audited.warnings.length} warning${audited.warnings.length === 1 ? '' : 's'})${reset}` : '';
        console.log(`[${green}PASS${reset}] [${criteria.getComponentTier(name)}] ${name}${warnText}`);
      } else {
        report.failed++;
        failures.push(name);
        console.log(`[${red}FAIL${reset}] [${criteria.getComponentTier(name)}] ${name}`);
        audited.issues.forEach((issue) => {
          console.log(`  ${red}x ${issue.name}: ${issue.desc}${reset}`);
        });
        audited.warnings.forEach((warning) => {
          console.log(`  ${yellow}! ${warning.name}: ${warning.desc}${reset}`);
        });
      }
    }

    fs.mkdirSync(reportsDir, { recursive: true });
    const reportPath = path.join(reportsDir, 'accessibility-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf8');

    console.log(`\n${bold}--- Accessibility Summary ---${reset}`);
    console.log(`${green}Passed: ${report.passed}${reset}`);
    if (report.warnings > 0) {
      console.log(`${yellow}Warnings: ${report.warnings}${reset}`);
    }
    if (report.failed > 0) {
      console.log(`${red}Failed: ${report.failed}${reset} [${failures.join(', ')}]`);
      console.log(`${cyan}Report: ${reportPath}${reset}`);
      process.exitCode = 1;
    } else {
      console.log(`${green}All ${report.passed} components passed accessibility audit.${reset}`);
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

main().catch((err) => {
  console.error(`${red}Accessibility audit failed: ${err.message}${reset}`);
  process.exit(1);
});
