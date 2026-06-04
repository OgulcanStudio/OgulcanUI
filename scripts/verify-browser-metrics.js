const fs = require('fs');
const path = require('path');

const criteria = require('./verify-criteria');
const { parseUserArgv, printHelp, resolveTargets, loadComponentCatalog } = require('./lib/cli');
const { resolveConcurrency, runPool } = require('./lib/async-pool');
const entPerf = require('./enterprise-performance-criteria');
const {
  resolveBrowserPath,
  getOpenPort,
  startStaticServer,
  closeServer,
  evalInPage,
  openBrowserBenchSession,
  closeBrowserBenchSession
} = require('./browser-harness');

const rootDir = path.join(__dirname, '..');
const reportsDir = path.join(rootDir, 'reports');
const scratchDir = path.join(rootDir, 'scratch');
const browserBenchPage = '/browser-bench.html';
const CONCURRENCY_ENV = 'OGULCAN_BROWSER_METRICS_CONCURRENCY';

const green = '\x1b[32m';
const red = '\x1b[31m';
const cyan = '\x1b[36m';
const reset = '\x1b[0m';
const bold = '\x1b[1m';

async function measureComponentMetrics(cdp, name) {
  await cdp.send('HeapProfiler.collectGarbage');
  const heapBefore = await evalInPage(cdp, 'performance.memory ? performance.memory.usedJSHeapSize : 0');
  const metrics = await evalInPage(cdp, `window.runOgulcanBrowserBenchFor(${JSON.stringify(name)})`, true);
  await cdp.send('HeapProfiler.collectGarbage');
  const heapAfter = await evalInPage(cdp, 'performance.memory ? performance.memory.usedJSHeapSize : 0');

  metrics.heapDeltaKB = typeof heapBefore === 'number' && typeof heapAfter === 'number'
    ? Number(((heapAfter - heapBefore) / 1024).toFixed(3))
    : null;

  const audited = entPerf.auditBrowserRuntimeMetrics(metrics, name);
  const consolidated = entPerf.consolidateBrowser(audited.issues, audited.warnings);

  return {
    name,
    tag: `ogulcan-${name.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase()}`,
    tier: criteria.getComponentTier(name),
    passed: consolidated.passed,
    metrics,
    issues: consolidated.issues,
    warnings: consolidated.warnings
  };
}

function printComponentResult(entry) {
  if (entry.passed) {
    console.log(`[${green}PASS${reset}] [${entry.tier}] ${entry.name}`);
    return;
  }
  console.log(`[${red}FAIL${reset}] [${entry.tier}] ${entry.name}`);
  entry.issues.forEach((issue) => {
    console.log(`  ${red}x ${issue.name}: ${issue.desc}${reset}`);
  });
}

async function main() {
  const parsed = parseUserArgv(process.argv.slice(2));
  if (parsed.help) {
    printHelp('OgulcanUI — browser metrics', [
      'Usage:',
      '  bun run test',
      '  bun scripts/verify-browser-metrics.js',
      '  bun scripts/verify-browser-metrics.js <ComponentName>',
      '  -h, --help',
      '',
      'Env:',
      `  ${CONCURRENCY_ENV}=<n>  parallel browser workers (default: CPU-based, cap 8)`
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
  const concurrency = resolveConcurrency(CONCURRENCY_ENV, 8);
  const serverPort = await getOpenPort();
  const serverUrl = `http://127.0.0.1:${serverPort}${browserBenchPage}`;
  const server = await startStaticServer(rootDir, serverPort, browserBenchPage);
  const benchArgs = ['--enable-precise-memory-info'];

  fs.mkdirSync(scratchDir, { recursive: true });
  const runId = `${process.pid}-${Date.now()}`;

  try {
    console.log(`${bold}${cyan}OgulcanUI Browser Metrics${reset}`);
    console.log(`Browser: ${browserPath}`);
    console.log(`Components: ${componentNames.length}`);
    console.log(`Workers: ${Math.min(concurrency, componentNames.length)}\n`);

    const componentResults = await runPool(
      componentNames,
      concurrency,
      async (name, _index, _workerId, session) => measureComponentMetrics(session.cdp, name),
      {
        createContext: async (workerId) => {
          const profileDir = path.join(scratchDir, `browser-profile-${runId}-w${workerId}`);
          return openBrowserBenchSession(browserPath, serverUrl, profileDir, benchArgs, {
            startupDelayMs: workerId * 350
          });
        },
        destroyContext: async (session) => closeBrowserBenchSession(session)
      }
    );

    const report = {
      generatedAt: new Date().toISOString(),
      browserPath,
      concurrency,
      totalComponents: componentNames.length,
      passed: 0,
      failed: 0,
      components: []
    };
    const failures = [];

    for (const entry of componentResults) {
      report.components.push({
        name: entry.name,
        tag: entry.tag,
        tier: entry.tier,
        passed: entry.passed,
        metrics: entry.metrics,
        issues: entry.issues,
        warnings: entry.warnings
      });

      if (entry.passed) report.passed++;
      else {
        report.failed++;
        failures.push(entry.name);
      }

      printComponentResult(entry);
    }

    fs.mkdirSync(reportsDir, { recursive: true });
    const reportPath = path.join(reportsDir, 'browser-metrics.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf8');

    console.log(`\n${bold}--- Browser Summary ---${reset}`);
    console.log(`${green}Passed: ${report.passed}${reset}`);
    if (report.failed > 0) {
      console.log(`${red}Failed: ${report.failed}${reset} [${failures.join(', ')}]`);
      console.log(`${cyan}Report: ${reportPath}${reset}`);
      process.exitCode = 1;
    } else {
      console.log(`${green}All ${report.passed} components passed browser metrics.${reset}`);
      console.log(`${cyan}Report: ${reportPath}${reset}`);
    }
  } finally {
    await closeServer(server);
  }
}

main().catch((err) => {
  console.error(`${red}Browser metrics failed: ${err.message}${reset}`);
  process.exit(1);
});