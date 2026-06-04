const fs = require('fs');
const path = require('path');

const criteria = require('./verify-criteria');
const { parseUserArgv, printHelp, resolveTargets, loadComponentCatalog } = require('./lib/cli');
const entPerf = require('./enterprise-performance-criteria');
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
const cyan = '\x1b[36m';
const reset = '\x1b[0m';
const bold = '\x1b[1m';

async function main() {
  const parsed = parseUserArgv(process.argv.slice(2));
  if (parsed.help) {
    printHelp('OgulcanUI — load bench', [
      'Usage:',
      '  bun run test',
      '  bun scripts/verify-load-bench.js',
      '  bun scripts/verify-load-bench.js <ComponentName>',
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
  const profileDir = path.join(scratchDir, `browser-load-profile-${process.pid}-${Date.now()}`);
  fs.mkdirSync(profileDir, { recursive: true });

  let browser;
  let cdp;
  try {
    browser = launchBrowser(
      browserPath,
      cdpPort,
      profileDir,
      `http://127.0.0.1:${serverPort}${browserBenchPage}`,
      ['--enable-precise-memory-info']
    );

    const target = await waitForPageTarget(cdpPort, `http://127.0.0.1:${serverPort}${browserBenchPage}`);
    cdp = await createCdpClient(target.webSocketDebuggerUrl);
    await cdp.send('Runtime.enable');
    await cdp.send('Page.enable');
    await cdp.send('HeapProfiler.enable');
    await waitForBenchReady(cdp);

    console.log(`${bold}${cyan}OgulcanUI Load Bench${reset}`);
    console.log(`Browser: ${browserPath}`);
    console.log(`Components: ${componentNames.length}\n`);

    const report = {
      generatedAt: new Date().toISOString(),
      browserPath,
      totalComponents: componentNames.length,
      passed: 0,
      failed: 0,
      components: []
    };
    const failures = [];

    for (const name of componentNames) {
      const tier = criteria.getComponentTier(name);
      const expectedInstances = entPerf.BROWSER_LOAD_METRICS[tier].instances;
      await cdp.send('HeapProfiler.collectGarbage');
      const heapBefore = await evalInPage(cdp, 'performance.memory ? performance.memory.usedJSHeapSize : 0');
      const metrics = await evalInPage(
        cdp,
        `window.runOgulcanLoadBenchFor(${JSON.stringify(name)}, ${JSON.stringify({ instances: expectedInstances })})`,
        true
      );
      await cdp.send('HeapProfiler.collectGarbage');
      const heapAfter = await evalInPage(cdp, 'performance.memory ? performance.memory.usedJSHeapSize : 0');

      metrics.heapDeltaKB = typeof heapBefore === 'number' && typeof heapAfter === 'number'
        ? Number(((heapAfter - heapBefore) / 1024).toFixed(3))
        : null;

      const audited = entPerf.auditBrowserLoadMetrics(metrics, name);
      const consolidated = entPerf.consolidateBrowser(audited.issues, audited.warnings);
      const passed = consolidated.passed;

      report.components.push({
        name,
        tag: `ogulcan-${name.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase()}`,
        tier,
        passed,
        metrics,
        issues: consolidated.issues,
        warnings: consolidated.warnings
      });

      if (passed) {
        report.passed++;
        console.log(`[${green}PASS${reset}] [${tier}] ${name}`);
      } else {
        report.failed++;
        failures.push(name);
        console.log(`[${red}FAIL${reset}] [${tier}] ${name}`);
        consolidated.issues.forEach((issue) => {
          console.log(`  ${red}x ${issue.name}: ${issue.desc}${reset}`);
        });
      }
    }

    fs.mkdirSync(reportsDir, { recursive: true });
    const reportPath = path.join(reportsDir, 'load-bench.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf8');

    console.log(`\n${bold}--- Load Summary ---${reset}`);
    console.log(`${green}Passed: ${report.passed}${reset}`);
    if (report.failed > 0) {
      console.log(`${red}Failed: ${report.failed}${reset} [${failures.join(', ')}]`);
      console.log(`${cyan}Report: ${reportPath}${reset}`);
      process.exitCode = 1;
    } else {
      console.log(`${green}All ${report.passed} components passed load bench.${reset}`);
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
  console.error(`${red}Load bench failed: ${err.message}${reset}`);
  process.exit(1);
});
