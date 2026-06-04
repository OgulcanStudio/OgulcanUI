/**
 * Universal component test suite — template contract + banking security + perf + one-line usage.
 * Single entry for test-all-components.js and verify-enterprise-suite.js.
 */

const fs = require('fs');
const path = require('path');

const contract = require('../component-contract');
const criteria = require('../verify-criteria');
const entSec = require('../enterprise-security-criteria');
const entPerf = require('../enterprise-performance-criteria');
const uiRules = require('./ui-testing-rules');
const { setupMockDOM } = require('../dom-harness');

const srcComponentsDir = path.join(__dirname, '../../src/components');
const scratchDir = path.join(__dirname, '../../scratch');

const SLOT_LAYOUT_EXCEPTIONS = new Set(['DashboardLayout']);

/**
 * @param {string} attr
 */
function sampleAttributeValue(attr) {
  if (attr === 'data' || attr.endsWith('-data')) return '[1,2,3]';
  if (attr === 'sparkline') return '1,2,3,4,5';
  if (attr === 'rows') return JSON.stringify([['A', '1']]);
  if (attr === 'headers') return 'Col,Val';
  if (attr === 'events') return JSON.stringify([{ time: '12:00', text: 'ok', status: 'ok' }]);
  if (['features', 'tags', 'items', 'logs', 'steps', 'avatars'].includes(attr)) {
    return JSON.stringify(['alpha']);
  }
  if (attr === 'color' || attr.endsWith('-color')) return '#6366f1';
  return 'live-value';
}

/**
 * Static: components must be configurable as one HTML element with attributes only.
 * @param {string} name
 * @param {{ js: string, html: string }} files
 */
function auditOneLineDeclarativeContract(name, files) {
  const issues = [];
  const warnings = [];
  const { js, html } = files;

  if (!SLOT_LAYOUT_EXCEPTIONS.has(name) && /<slot[\s>]/i.test(html)) {
    issues.push({
      name: 'One-line slot dependency',
      desc: 'index.html must not require light-DOM <slot> children — configure via attributes on a single custom element tag.'
    });
  }

  const observedMatch = js.match(/observedAttributes\s*\(\)\s*\{\s*return\s*\[([^\]]*)\]/);
  const attrs = observedMatch
    ? observedMatch[1]
        .split(',')
        .map((s) => s.trim().replace(/['"]/g, ''))
        .filter(Boolean)
    : [];

  if (attrs.length === 0) {
    issues.push({
      name: 'One-line attributes',
      desc:
        'Expose observedAttributes[] so integrators mount with one tag, e.g. <ogulcan-widget title="x" color="#6366f1" data="[1,2]">.'
    });
  }

  if (/\bgetElementById\s*\(/.test(js) && !/shadowRoot\.getElementById/.test(js)) {
    issues.push({
      name: 'Light DOM coupling',
      desc: 'Do not query document/light DOM by id — keep configuration on attributes and shadow queries only.'
    });
  }

  return { issues, warnings };
}

/**
 * Runtime: attribute-only cold mount before connected upgrade paths.
 * @param {HTMLElement} el
 * @param {CustomElementConstructor} Cls
 * @param {string} tag
 */
function auditOneLineRuntime(el, Cls, tag) {
  const issues = [];
  const attrs = Cls.observedAttributes || [];
  if (attrs.length === 0) return issues;

  const cold = document.createElement(tag);
  attrs.forEach((a) => {
    try {
      cold.setAttribute(a, sampleAttributeValue(a));
    } catch (err) {
      issues.push({
        name: 'One-line attribute bind',
        desc: `setAttribute("${a}") before connect threw: ${err.message || String(err)}`
      });
    }
  });
  document.body.appendChild(cold);

  if (!cold.shadowRoot || (cold.shadowRoot.innerHTML || '').length < 24) {
    issues.push({
      name: 'One-line cold mount',
      desc: 'Shadow DOM must render from attributes alone (no required child nodes in light DOM).'
    });
  }

  document.body.removeChild(cold);
  return issues;
}

/**
 * @param {string} name
 * @param {ReturnType<typeof contract.loadComponentFiles>} files
 */
async function createRuntimeContext(name, files) {
  setupMockDOM();
  const tag = contract.toKebabTag(name);
  const resolvedJs = contract.inlineComponentAssets(files.js, files.css, files.html);
  const tempPath = path.join(scratchDir, `suite_${name}_${process.pid}.js`);

  if (!fs.existsSync(scratchDir)) fs.mkdirSync(scratchDir, { recursive: true });

  fs.writeFileSync(tempPath, resolvedJs, 'utf8');
  const fileUrl = new URL(`file:///${tempPath.replace(/\\/g, '/')}`).href;
  await import(fileUrl);

  const Cls = customElements.get(tag);
  if (!Cls) {
    if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
    throw new Error(`customElements.get('${tag}') undefined after module load`);
  }

  return {
    tag,
    Cls,
    tempPath,
    cleanup() {
      if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
    }
  };
}

/**
 * @param {string} name
 * @param {ReturnType<typeof contract.loadComponentFiles>} files
 * @param {CustomElementConstructor} Cls
 */
async function runBankingPerformanceRuntime(name, files, Cls) {
  const issues = [];
  const warnings = [];
  const metrics = {};
  const tag = contract.toKebabTag(name);
  const attrs = Cls.observedAttributes || [];
  const dataAttr = attrs.find((a) => a === 'data' || a.endsWith('-data')) || attrs[0];

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
    const sample = sampleAttributeValue(warmAttr);
    el.setAttribute(warmAttr, sample);
    const tUp = performance.now();
    el.setAttribute(warmAttr, sample);
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
    metrics.shadowGrowthPct = bloat.growthPct;
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
  metrics.lifecycleTotalMs = Number(life.total.toFixed(3));

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

  const mem = entPerf.auditMemoryHygiene(activeTimers > 0 && !files.js.includes('clearInterval'));
  issues.push(...mem.issues);

  document.body.removeChild(el);
  return { issues, warnings, metrics };
}

/**
 * Full audit for one component.
 * @param {string} name
 * @param {{ runtime?: boolean, template?: boolean, security?: boolean, performance?: boolean, oneLine?: boolean }} [options]
 */
async function auditComponent(name, options = {}) {
  const template = options.template !== false;
  const security = options.security !== false;
  const performance = options.performance !== false;
  const oneLine = options.oneLine !== false;
  const runtime = !!options.runtime;

  const dirPath = path.join(srcComponentsDir, name);
  const result = {
    name,
    tag: contract.toKebabTag(name),
    tier: criteria.getComponentTier(name),
    passed: true,
    issues: [],
    warnings: []
  };

  if (!fs.existsSync(dirPath)) {
    result.passed = false;
    result.issues.push({ name: 'Component Folder', desc: `Not found: ${dirPath}` });
    return result;
  }

  const files = contract.loadComponentFiles(dirPath);

  if (template) {
    const templateAudit = contract.auditTemplateContract(name, files);
    result.issues.push(...templateAudit.issues);
    result.warnings.push(...templateAudit.warnings);
  }

  if (oneLine) {
    const oneLineStatic = auditOneLineDeclarativeContract(name, files);
    result.issues.push(...oneLineStatic.issues);
    result.warnings.push(...oneLineStatic.warnings);
  }

  const sizeAudit = criteria.auditPayloadSizes(files.sizes, name);
  result.issues.push(...sizeAudit.issues);
  result.warnings.push(...sizeAudit.warnings);

  const staticAudit = criteria.auditStaticCompliance(
    files.js,
    files.css,
    files.html,
    name,
    null,
    files.sizes
  );
  result.issues.push(...staticAudit.issues);
  result.warnings.push(...staticAudit.warnings);

  const sync = uiRules.syncManifestWithFolders();
  const uiTestingAudit = uiRules.auditUiTestingRules(name, files, {
    manifest: sync.manifest,
    enforceRegistry: sync.manifest.includes(name)
  });
  result.issues.push(...uiTestingAudit.issues);
  result.warnings.push(...uiTestingAudit.warnings);

  if (security) {
    const sec = await entSec.auditComponentSecurity(name, files, { runtime: false });
    const consolidated = entSec.consolidateSecurity(sec.issues, sec.warnings);
    result.issues.push(...consolidated.issues);
    result.warnings.push(...consolidated.warnings);
  }

  if (runtime) {
    let ctx;
    try {
      ctx = await createRuntimeContext(name, files);

      if (security) {
        const el = document.createElement(ctx.tag);
        document.body.appendChild(el);
        const attrs = ctx.Cls.observedAttributes || [];
        const runtimeSec = entSec.auditRuntimeXss(el, attrs, () =>
          el.shadowRoot ? el.shadowRoot.innerHTML || '' : ''
        );
        result.issues.push(...runtimeSec.issues);
        document.body.removeChild(el);
      }

      if (oneLine) {
        const el = document.createElement(ctx.tag);
        document.body.appendChild(el);
        result.issues.push(...auditOneLineRuntime(el, ctx.Cls, ctx.tag));
        document.body.removeChild(el);
      }

      if (performance) {
        const perf = await runBankingPerformanceRuntime(name, files, ctx.Cls);
        const consolidated = entPerf.consolidatePerf(perf.issues, perf.warnings);
        result.issues.push(...consolidated.issues);
        result.warnings.push(...consolidated.warnings);
        result.metrics = perf.metrics;
      } else {
        const mountIssues = await runMountSmoke(name, files, ctx.Cls, ctx.tag);
        result.issues.push(...mountIssues);
      }
    } catch (err) {
      const phase = err._ogulcanLifecycle ? ` (${err._ogulcanLifecycle})` : '';
      result.issues.push({
        name: 'Runtime suite',
        desc: `${err.message || String(err)}${phase}`
      });
    } finally {
      if (ctx) ctx.cleanup();
    }
  }

  const consolidated = criteria.consolidateStatus(result.issues, result.warnings);
  result.issues = consolidated.issues;
  result.warnings = consolidated.warnings;
  result.passed = consolidated.passed;
  return result;
}

/**
 * @param {string} name
 * @param {object} files
 * @param {CustomElementConstructor} Cls
 * @param {string} tag
 */
async function runMountSmoke(name, files, Cls, tag) {
  const issues = [];
  const el = document.createElement(tag);
  document.body.appendChild(el);

  if (!el.shadowRoot) {
    issues.push({ name: 'Runtime Shadow Root', desc: 'connectedCallback did not produce a shadow root.' });
  }

  const attrs = Cls.observedAttributes || [];
  attrs.forEach((attr) => {
    const prop = criteria.attrToPropertyName(attr);
    const desc = Object.getOwnPropertyDescriptor(Cls.prototype, prop);
    if (!desc || typeof desc.get !== 'function' || typeof desc.set !== 'function') {
      issues.push({
        name: 'Editable Property API',
        desc: `Observed "${attr}" needs get ${prop}() / set ${prop}() for one-line HTML + property binding.`
      });
    }
    try {
      el.setAttribute(attr, sampleAttributeValue(attr));
    } catch (err) {
      issues.push({
        name: 'Attribute update',
        desc: `setAttribute("${attr}") threw: ${err.message || String(err)}`
      });
    }
  });

  document.body.removeChild(el);
  return issues;
}

module.exports = {
  auditComponent,
  auditOneLineDeclarativeContract,
  auditOneLineRuntime,
  createRuntimeContext,
  runBankingPerformanceRuntime,
  sampleAttributeValue,
  SLOT_LAYOUT_EXCEPTIONS
};