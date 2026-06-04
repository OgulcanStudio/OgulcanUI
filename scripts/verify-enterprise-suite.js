/**
 * Enterprise-grade verification — security + performance for all components.
 *
 * Usage:
 *   bun run test                                    # full gate (preferred)
 *   node scripts/verify-enterprise-suite.js         # static security + static perf
 *   node scripts/verify-enterprise-suite.js --runtime
 *   node scripts/verify-enterprise-suite.js --security
 *   node scripts/verify-enterprise-suite.js --performance
 *   node scripts/verify-enterprise-suite.js StatCard
 *   node scripts/verify-enterprise-suite.js --json  # reports/enterprise-compliance.json
 */

const fs = require('fs');
const path = require('path');

const contract = require('./component-contract');
const criteria = require('./verify-criteria');
const entSec = require('./enterprise-security-criteria');
const entPerf = require('./enterprise-performance-criteria');
const { setupMockDOM } = require('./dom-harness');
const { parseUserArgv, printHelp, resolveTargets, loadComponentCatalog } = require('./lib/cli');

const srcComponentsDir = path.join(__dirname, '../src/components');
const scratchDir = path.join(__dirname, '../scratch');
const reportsDir = path.join(__dirname, '../reports');

const green = '\x1b[32m';
const red = '\x1b[31m';
const yellow = '\x1b[33m';
const cyan = '\x1b[36m';
const reset = '\x1b[0m';
const bold = '\x1b[1m';

/**
 * @param {string} name
 * @param {{ runtime?: boolean, security?: boolean, performance?: boolean }} opts
 */
async function verifyComponent(name, opts = {}) {
  const security = opts.security !== false;
  const performance = opts.performance !== false;
  const dirPath = path.join(srcComponentsDir, name);

  const result = {
    name,
    tag: contract.toKebabTag(name),
    tier: criteria.getComponentTier(name),
    security: { passed: true, issues: [], warnings: [] },
    performance: { passed: true, issues: [], warnings: [] },
    metrics: null,
    passed: true
  };

  if (!fs.existsSync(dirPath)) {
    const miss = { name: 'Component Folder', desc: `Not found: ${dirPath}` };
    if (security) result.security.issues.push(miss);
    if (performance) result.performance.issues.push(miss);
    result.security.passed = false;
    result.performance.passed = false;
    result.passed = false;
    return result;
  }

  const files = contract.loadComponentFiles(dirPath);

  if (security) {
    const mountFactory = opts.runtime
      ? () => createRuntimeMount(name, files)
      : undefined;
    const sec = await entSec.auditComponentSecurity(name, files, {
      runtime: opts.runtime,
      mount: mountFactory
    });
    const consolidated = entSec.consolidateSecurity(sec.issues, sec.warnings);
    result.security.issues = consolidated.issues;
    result.security.warnings = consolidated.warnings;
    result.security.passed = consolidated.passed;
  }

  if (performance) {
    const perfIssues = [];
    const perfWarnings = [];

    const sizeAudit = criteria.auditPayloadSizes(files.sizes, name);
    perfIssues.push(...sizeAudit.issues);
    perfWarnings.push(...sizeAudit.warnings);

    const staticPerf = criteria.auditStaticCompliance(
      files.js,
      files.css,
      files.html,
      name,
      null,
      files.sizes
    );
    const perfStaticNames = new Set([
      'Timer Leak',
      'rAF Leak',
      'ResizeObserver Leak',
      'Global Listener Leak',
      'Full DOM Rebuild on Attribute Change',
      'Observed Attribute Budget'
    ]);
    staticPerf.issues
      .filter((i) => perfStaticNames.has(i.name))
      .forEach((i) => perfIssues.push(i));

    if (opts.runtime) {
      const runtimePerf = await runPerformanceRuntime(name, files);
      perfIssues.push(...runtimePerf.issues);
      perfWarnings.push(...runtimePerf.warnings);
      result.metrics = runtimePerf.metrics;
    }

    const consolidated = entPerf.consolidatePerf(perfIssues, perfWarnings);
    result.performance.issues = consolidated.issues;
    result.performance.warnings = consolidated.warnings;
    result.performance.passed = consolidated.passed;
  }

  result.passed = result.security.passed && result.performance.passed;
  return result;
}

/**
 * @param {string} name
 * @param {ReturnType<typeof contract.loadComponentFiles>} files
 */
async function createRuntimeMount(name, files) {
  setupMockDOM();
  const tag = contract.toKebabTag(name);
  const resolvedJs = contract.inlineComponentAssets(files.js, files.css, files.html);
  const tempPath = path.join(scratchDir, `ent_sec_${name}_${process.pid}.js`);

  if (!fs.existsSync(scratchDir)) fs.mkdirSync(scratchDir, { recursive: true });

  try {
    fs.writeFileSync(tempPath, resolvedJs, 'utf8');
    const fileUrl = new URL(`file:///${tempPath.replace(/\\/g, '/')}`).href;
    await import(fileUrl);

    const Cls = customElements.get(tag);
    if (!Cls) throw new Error(`customElements.get('${tag}') undefined`);

    const el = document.createElement(tag);
    document.body.appendChild(el);

    const attrs = Cls.observedAttributes || [];
    return {
      el,
      attrs,
      getShadowHtml: () => (el.shadowRoot ? el.shadowRoot.innerHTML || '' : '')
    };
  } finally {
    if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
  }
}

/**
 * @param {string} name
 * @param {ReturnType<typeof contract.loadComponentFiles>} files
 */
async function runPerformanceRuntime(name, files) {
  const issues = [];
  const warnings = [];
  const metrics = {
    mountMs: null,
    updateMs: null,
    burstAvgMs: null,
    burstP99Ms: null,
    lifecycleTotalMs: null,
    lifecycleMaxMs: null,
    batchTotalMs: null,
    batchPerInstanceMs: null
  };
  const tag = contract.toKebabTag(name);

  setupMockDOM();
  const resolvedJs = contract.inlineComponentAssets(files.js, files.css, files.html);
  const tempPath = path.join(scratchDir, `ent_perf_${name}_${process.pid}.js`);

  if (!fs.existsSync(scratchDir)) fs.mkdirSync(scratchDir, { recursive: true });

  try {
    fs.writeFileSync(tempPath, resolvedJs, 'utf8');
    const fileUrl = new URL(`file:///${tempPath.replace(/\\/g, '/')}`).href;
    await import(fileUrl);

    const Cls = customElements.get(tag);
    if (!Cls) {
      issues.push({ name: 'Runtime Registration', desc: `customElements.get('${tag}') undefined.` });
      return { issues, warnings, metrics };
    }

    const attrs = Cls.observedAttributes || [];
    const dataAttr = attrs.find((a) => a === 'data' || a.endsWith('-data')) || attrs[0];

    const sampleFor = (attr) =>
      attr === 'data' || attr.endsWith('-data')
        ? '[1,2,3]'
        : attr === 'sparkline'
          ? '1,2,3,4,5'
          : 'live-value';

    const el = document.createElement(tag);
    document.body.appendChild(el);

    const tMount = performance.now();
    const warm = document.createElement(tag);
    document.body.appendChild(warm);
    const mountMs = performance.now() - tMount;
    metrics.mountMs = Number(mountMs.toFixed(3));
    document.body.removeChild(warm);

    let updateMs = 0;
    if (attrs.length > 0) {
      const warmAttr = dataAttr || attrs[0];
      el.setAttribute(warmAttr, sampleFor(warmAttr));
      const tUp = performance.now();
      el.setAttribute(warmAttr, sampleFor(warmAttr));
      updateMs = performance.now() - tUp;
      metrics.updateMs = Number(updateMs.toFixed(3));
    }

    const tierAudit = entPerf.auditTierRuntimePerf(mountMs, updateMs, name, attrs.length);
    issues.push(...tierAudit.issues);
    warnings.push(...tierAudit.warnings);

    if (dataAttr || attrs.length > 0) {
      const perfAttr = dataAttr || attrs[0];
      const preBurstLen = el.shadowRoot ? (el.shadowRoot.innerHTML || '').length : 0;
      const tickMs = [];
      for (let i = 0; i < entPerf.BURST.ticks; i++) {
        const t0 = performance.now();
        const payload =
          perfAttr === 'data' || perfAttr.endsWith('-data')
            ? JSON.stringify([i, i + 1, i + 2])
            : `tick-${i}`;
        el.setAttribute(perfAttr, payload);
        tickMs.push(performance.now() - t0);
      }
      const burst = entPerf.auditBurstPerf(tickMs);
      issues.push(...burst.issues);
      warnings.push(...burst.warnings);
      if (burst.avg != null) metrics.burstAvgMs = Number(burst.avg.toFixed(3));
      if (burst.p99 != null) metrics.burstP99Ms = Number(burst.p99.toFixed(3));

      const afterBurstLen = el.shadowRoot ? (el.shadowRoot.innerHTML || '').length : 0;
      const bloat = entPerf.auditRealtimeShadowStability(preBurstLen, afterBurstLen, name);
      issues.push(...bloat.issues);
      warnings.push(...bloat.warnings);
      if (bloat.growthPct != null) metrics.shadowGrowthPct = bloat.growthPct;
    }

    const cycleMs = [];
    for (let c = 0; c < entPerf.LIFECYCLE.cycles; c++) {
      const t0 = performance.now();
      const inst = document.createElement(tag);
      document.body.appendChild(inst);
      document.body.removeChild(inst);
      cycleMs.push(performance.now() - t0);
    }
    const life = entPerf.auditLifecyclePerf(cycleMs);
    issues.push(...life.issues);
    warnings.push(...life.warnings);
    metrics.lifecycleTotalMs = Number(life.total.toFixed(3));
    metrics.lifecycleMaxMs = Number(life.max.toFixed(3));

    const batchStart = performance.now();
    const batchEls = [];
    for (let i = 0; i < entPerf.BATCH.instances; i++) {
      const inst = document.createElement(tag);
      document.body.appendChild(inst);
      batchEls.push(inst);
    }
    const batchTotal = performance.now() - batchStart;
    const batchPer = batchTotal / entPerf.BATCH.instances;
    batchEls.forEach((inst) => document.body.removeChild(inst));
    const batch = entPerf.auditBatchMountPerf(batchTotal, batchPer);
    issues.push(...batch.issues);
    metrics.batchTotalMs = Number(batchTotal.toFixed(3));
    metrics.batchPerInstanceMs = Number(batchPer.toFixed(3));

    let activeTimers = 0;
    const origSetInterval = globalThis.setInterval;
    globalThis.setInterval = function (...args) {
      activeTimers++;
      return origSetInterval.apply(this, args);
    };
    const leakEl = document.createElement(tag);
    document.body.appendChild(leakEl);
    document.body.removeChild(leakEl);
    globalThis.setInterval = origSetInterval;

    const mem = entPerf.auditMemoryHygiene(
      activeTimers > 0 && !files.js.includes('clearInterval')
    );
    issues.push(...mem.issues);

    document.body.removeChild(el);
  } catch (err) {
    issues.push({ name: 'Performance runtime', desc: err.message || String(err) });
  } finally {
    if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
  }

  return { issues, warnings, metrics };
}

function listComponentNames(target) {
  const listPath = path.join(__dirname, '../src/components.json');
  const catalog = loadComponentCatalog(listPath);
  if (target) return resolveTargets([path.basename(target)], catalog);
  return catalog;
}

function printResult(result, verbose, flags) {
  const status = result.passed ? `${green}PASS${reset}` : `${red}FAIL${reset}`;
  console.log(`[${status}] ${bold}[${result.tier}] ${result.name}${reset} <${result.tag}>`);

  if (!verbose && result.passed) return;

  if (flags.security !== false) {
    const s = result.security.passed ? green : red;
    console.log(`  ${s}Security:${reset} ${result.security.passed ? 'ok' : result.security.issues.length + ' issue(s)'}`);
    result.security.issues.forEach((i) => console.log(`    ${red}✘ ${i.name}: ${i.desc}${reset}`));
  }
  if (flags.performance !== false) {
    const p = result.performance.passed ? green : red;
    console.log(`  ${p}Performance:${reset} ${result.performance.passed ? 'ok' : result.performance.issues.length + ' issue(s)'}`);
    result.performance.issues.forEach((i) => console.log(`    ${red}✘ ${i.name}: ${i.desc}${reset}`));
  }
  if (result.metrics && verbose) {
    console.log(`  ${cyan}Metrics:${reset} ${JSON.stringify(result.metrics)}`);
  }
}

async function runCli(argv = process.argv.slice(2)) {
  const parsed = parseUserArgv(argv);
  if (parsed.help) {
    printHelp('OgulcanUI — verify-enterprise-suite', [
      'Usage:',
      '  bun run test',
      '  bun run test -- <ComponentName>',
      '  node scripts/verify-enterprise-suite.js --runtime --json <ComponentName>',
      '',
      'Flags: --runtime, --json, --security, --performance, -v/--verbose, -h/--help'
    ]);
    process.exit(0);
  }

  const runtime = argv.includes('--runtime');
  const verbose = argv.includes('--verbose') || argv.includes('-v');
  const writeJson = argv.includes('--json');
  const securityOnly = argv.includes('--security');
  const perfOnly = argv.includes('--performance');

  const flags = {
    security: !perfOnly,
    performance: !securityOnly
  };

  let targets;
  try {
    targets = listComponentNames(parsed.names[0]);
  } catch (err) {
    console.error(`${red}${err.message}${reset}`);
    process.exit(1);
  }
  const modeParts = [];
  if (flags.security) modeParts.push('security');
  if (flags.performance) modeParts.push('performance');
  if (runtime) modeParts.push('runtime');

  console.log(`${bold}${cyan}OgulcanUI Enterprise Verification${reset}`);
  console.log(`Mode: ${modeParts.join(' + ')} | Components: ${targets.length}`);
  console.log(`Coverage: ${targets.length}/${targets.length} (100%)\n`);

  let passed = 0;
  let failed = 0;
  const failures = [];
  const report = {
    generatedAt: new Date().toISOString(),
    mode: modeParts,
    coveragePercent: 100,
    totalComponents: targets.length,
    passed: 0,
    failed: 0,
    components: []
  };

  for (const name of targets) {
    const result = await verifyComponent(name, { runtime, ...flags });
    printResult(result, verbose, flags);
    report.components.push({
      name: result.name,
      tag: result.tag,
      tier: result.tier,
      passed: result.passed,
      security: result.security,
      performance: result.performance,
      metrics: result.metrics
    });
    if (result.passed) passed++;
    else {
      failed++;
      failures.push(name);
    }
  }

  report.passed = passed;
  report.failed = failed;

  console.log(`\n${bold}--- Verify Summary ---${reset}`);
  console.log(`${green}✔ Passed: ${passed}${reset}`);
  if (failed > 0) {
    console.log(`${red}✘ Failed: ${failed}${reset} [${failures.join(', ')}]`);
  } else {
    console.log(`${green}✔ All ${passed} components meet enterprise-grade security & performance criteria.${reset}`);
  }

  if (writeJson) {
    if (!fs.existsSync(reportsDir)) fs.mkdirSync(reportsDir, { recursive: true });
    const outPath = path.join(reportsDir, 'enterprise-compliance.json');
    fs.writeFileSync(outPath, JSON.stringify(report, null, 2), 'utf8');
    console.log(`${cyan}Report: ${outPath}${reset}`);
  }

  process.exit(failed > 0 ? 1 : 0);
}

if (require.main === module) {
  runCli().catch((err) => {
    console.error(`${red}Fatal: ${err.message}${reset}`);
    process.exit(1);
  });
}

module.exports = { verifyComponent, runCli };
