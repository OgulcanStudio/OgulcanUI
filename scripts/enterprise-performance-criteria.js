/**
 * Enterprise-grade performance criteria — 100% component coverage.
 * Extends verify-criteria.js with burst, lifecycle, and batch gates.
 */

const criteria = require('./verify-criteria');

const BURST = {
  ticks: 120,
  /** Max average ms per attribute update at 100Hz-equivalent burst */
  avgFailMs: 0.9,
  avgWarnMs: 0.45,
  /** Max single tick in burst */
  p99FailMs: 4.5
};

/** Max shadow HTML growth after realtime burst (memory stability). */
const REALTIME_SHADOW = {
  maxGrowthRatio: 0.1,
  minInitialBytes: 48
};

const LIFECYCLE = {
  /** mount → disconnect cycles without timer leaks */
  cycles: 10,
  maxTotalMs: 80,
  maxCycleMs: 15
};

const BATCH = {
  /** Parallel instances on one dashboard row */
  instances: 5,
  maxTotalMountMs: 12,
  maxPerInstanceMs: 4
};

const BROWSER_METRICS = {
  widget: {
    mountAvgFail: 16,
    mountP95Fail: 24,
    updateAvgFail: 8,
    updateP95Fail: 16,
    burstAvgFail: 8,
    burstP95Fail: 16,
    domNodesFail: 80,
    shadowHtmlBytesFail: 6000,
    heapDeltaKbFail: 512
  },
  chart: {
    mountAvgFail: 24,
    mountP95Fail: 36,
    updateAvgFail: 14,
    updateP95Fail: 24,
    burstAvgFail: 14,
    burstP95Fail: 24,
    domNodesFail: 260,
    shadowHtmlBytesFail: 30000,
    heapDeltaKbFail: 1024
  },
  layout: {
    mountAvgFail: 32,
    mountP95Fail: 44,
    updateAvgFail: 18,
    updateP95Fail: 30,
    burstAvgFail: 18,
    burstP95Fail: 30,
    domNodesFail: 420,
    shadowHtmlBytesFail: 18000,
    heapDeltaKbFail: 1536
  }
};

const BROWSER_LOAD_METRICS = {
  widget: {
    instances: 24,
    batchMountFail: 120,
    perInstanceMountFail: 6,
    updateWaveFail: 48,
    updateWavePerInstanceFail: 2.2,
    burstWaveAvgFail: 56,
    burstWaveP95Fail: 72,
    totalDomNodesFail: 1800,
    totalShadowHtmlBytesFail: 100000,
    heapDeltaKbFail: 2048
  },
  chart: {
    instances: 12,
    batchMountFail: 180,
    perInstanceMountFail: 14,
    updateWaveFail: 72,
    updateWavePerInstanceFail: 6,
    burstWaveAvgFail: 88,
    burstWaveP95Fail: 120,
    totalDomNodesFail: 3200,
    totalShadowHtmlBytesFail: 400000,
    heapDeltaKbFail: 4096
  },
  layout: {
    instances: 6,
    batchMountFail: 220,
    perInstanceMountFail: 28,
    updateWaveFail: 80,
    updateWavePerInstanceFail: 12,
    burstWaveAvgFail: 100,
    burstWaveP95Fail: 132,
    totalDomNodesFail: 4200,
    totalShadowHtmlBytesFail: 220000,
    heapDeltaKbFail: 6144
  }
};

const TIER_PERF = {
  widget: { mountFail: 2.0, mountWarn: 1.0, updateFail: 1.0, updateWarn: 0.5 },
  chart: { mountFail: 4.0, mountWarn: 2.0, updateFail: 2.0, updateWarn: 1.0 },
  layout: { mountFail: 5.0, mountWarn: 2.5, updateFail: 2.5, updateWarn: 1.2 }
};

const MOCK_PERF_JITTER_MS =
  typeof process !== 'undefined' && process.env && process.env.OGULCAN_BROWSER_PERF !== '1'
    ? 0.5
    : 0;

/**
 * @param {string} componentName
 */
/** Node mock DOM is slower than real browsers — scale caps for CI honesty. */
const MOCK_PERF_SCALE =
  typeof process !== 'undefined' && process.env && process.env.OGULCAN_BROWSER_PERF !== '1'
    ? { widget: 1, chart: 12, layout: 10 }
    : { widget: 1, chart: 1, layout: 1 };

function getTierPerf(componentName) {
  const tier = criteria.getComponentTier(componentName);
  const base = TIER_PERF[tier];
  const scale = MOCK_PERF_SCALE[tier];
  return {
    mountFail: base.mountFail * scale,
    mountWarn: base.mountWarn * scale,
    updateFail: base.updateFail * scale,
    updateWarn: base.updateWarn * scale
  };
}

/**
 * @param {number} mountMs
 * @param {number} updateMs
 * @param {string} componentName
 * @param {number} attrCount
 */
function auditTierRuntimePerf(mountMs, updateMs, componentName, attrCount) {
  const limits = getTierPerf(componentName);
  const issues = [];
  const warnings = [];
  const jitter = MOCK_PERF_JITTER_MS;

  if (mountMs > limits.mountFail) {
    issues.push({
      name: 'Tier mount latency',
      desc: `Mount ${mountMs.toFixed(2)} ms exceeds ${limits.mountFail} ms (${criteria.getComponentTier(componentName)} tier).`
    });
  } else if (mountMs > limits.mountWarn + jitter) {
    warnings.push({
      name: 'Tier mount latency',
      desc: `Mount ${mountMs.toFixed(2)} ms — target < ${limits.mountWarn} ms.`
    });
  }

  if (attrCount > 0 && updateMs > limits.updateFail) {
    issues.push({
      name: 'Tier update latency',
      desc: `Update ${updateMs.toFixed(2)} ms exceeds ${limits.updateFail} ms (${criteria.getComponentTier(componentName)} tier).`
    });
  } else if (attrCount > 0 && updateMs > limits.updateWarn + jitter) {
    warnings.push({
      name: 'Tier update latency',
      desc: `Update ${updateMs.toFixed(2)} ms — target < ${limits.updateWarn} ms.`
    });
  }

  return { issues, warnings };
}

/**
 * @param {number[]} tickMs
 */
function auditBurstPerf(tickMs) {
  const issues = [];
  const warnings = [];
  if (tickMs.length === 0) return { issues, warnings };

  const scale =
    typeof process !== 'undefined' && process.env && process.env.OGULCAN_BROWSER_PERF !== '1'
      ? 8
      : 1;
  const avgCap = BURST.avgFailMs * scale;
  const avgWarnCap = BURST.avgWarnMs * scale;
  const p99Cap = BURST.p99FailMs * scale;

  const sum = tickMs.reduce((a, b) => a + b, 0);
  const avg = sum / tickMs.length;
  const sorted = [...tickMs].sort((a, b) => a - b);
  const p99 = sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * 0.99))];

  if (avg > avgCap) {
    issues.push({
      name: 'Burst update throughput',
      desc: `${BURST.ticks} updates averaged ${avg.toFixed(3)} ms (cap ${avgCap} ms) — sub-1Hz dashboards will stutter.`
    });
  } else if (avg > avgWarnCap) {
    warnings.push({
      name: 'Burst update throughput',
      desc: `${BURST.ticks} updates averaged ${avg.toFixed(3)} ms — target < ${avgWarnCap} ms.`
    });
  }

  if (p99 > p99Cap) {
    issues.push({
      name: 'Burst p99 latency',
      desc: `p99 tick ${p99.toFixed(2)} ms exceeds ${p99Cap} ms spike cap.`
    });
  }

  return { issues, warnings, avg, p99 };
}

/**
 * @param {number[]} cycleMs
 */
function auditLifecyclePerf(cycleMs) {
  const issues = [];
  const warnings = [];
  const total = cycleMs.reduce((a, b) => a + b, 0);
  const max = Math.max(...cycleMs, 0);

  if (total > LIFECYCLE.maxTotalMs) {
    issues.push({
      name: 'Lifecycle churn',
      desc: `${LIFECYCLE.cycles} mount/disconnect cycles took ${total.toFixed(2)} ms (cap ${LIFECYCLE.maxTotalMs} ms).`
    });
  }
  if (max > LIFECYCLE.maxCycleMs) {
    issues.push({
      name: 'Lifecycle single cycle',
      desc: `Slowest cycle ${max.toFixed(2)} ms exceeds ${LIFECYCLE.maxCycleMs} ms.`
    });
  }

  return { issues, warnings, total, max };
}

/**
 * @param {number} totalMs
 * @param {number} perInstanceMs
 */
function auditBatchMountPerf(totalMs, perInstanceMs) {
  const issues = [];
  const warnings = [];

  if (totalMs > BATCH.maxTotalMountMs) {
    issues.push({
      name: 'Batch mount (dashboard row)',
      desc: `${BATCH.instances} instances mounted in ${totalMs.toFixed(2)} ms (cap ${BATCH.maxTotalMountMs} ms).`
    });
  }
  if (perInstanceMs > BATCH.maxPerInstanceMs) {
    issues.push({
      name: 'Batch per-instance mount',
      desc: `Per-instance mount ${perInstanceMs.toFixed(2)} ms exceeds ${BATCH.maxPerInstanceMs} ms.`
    });
  }

  return { issues, warnings };
}

/**
 * @param {boolean} timersAfterDisconnect
 */
/**
 * @param {number} initialBytes
 * @param {number} afterBytes
 * @param {string} componentName
 */
function auditRealtimeShadowStability(initialBytes, afterBytes, componentName) {
  const issues = [];
  const warnings = [];
  if (initialBytes < REALTIME_SHADOW.minInitialBytes) {
    return { issues, warnings, growthPct: null };
  }
  const growth = (afterBytes - initialBytes) / initialBytes;
  const tier = criteria.getComponentTier(componentName);
  const cap =
    tier === 'layout' ? REALTIME_SHADOW.maxGrowthRatio * 1.5 : REALTIME_SHADOW.maxGrowthRatio;

  if (growth > cap) {
    issues.push({
      name: 'Realtime shadow bloat',
      desc: `Shadow HTML grew ${(growth * 100).toFixed(1)}% after ${BURST.ticks} live updates (cap ${(cap * 100).toFixed(0)}%) — fix incremental draw, not full innerHTML rebuilds.`
    });
  } else if (growth > cap * 0.75) {
    warnings.push({
      name: 'Realtime shadow bloat',
      desc: `Shadow HTML grew ${(growth * 100).toFixed(1)}% after burst — near ${(cap * 100).toFixed(0)}% cap.`
    });
  }

  return { issues, warnings, growthPct: Number((growth * 100).toFixed(2)) };
}

function auditMemoryHygiene(timersAfterDisconnect) {
  if (timersAfterDisconnect) {
    return {
      issues: [{
        name: 'Timer leak after disconnect',
        desc: 'setInterval still active after disconnectedCallback — causes memory/CPU leaks on SPA route changes.'
      }],
      warnings: []
    };
  }
  return { issues: [], warnings: [] };
}

function auditBrowserRuntimeMetrics(metrics, componentName) {
  const tier = criteria.getComponentTier(componentName);
  const limits = BROWSER_METRICS[tier];
  const issues = [];
  const warnings = [];
  const warnAt = 0.9;

  checkMetric(
    metrics.mountAvgMs,
    limits.mountAvgFail,
    warnAt,
    issues,
    warnings,
    'Browser mount avg',
    'Average headless-browser mount time'
  );
  checkMetric(
    metrics.mountP95Ms,
    limits.mountP95Fail,
    warnAt,
    issues,
    warnings,
    'Browser mount p95',
    'p95 headless-browser mount time'
  );

  if ((metrics.observedAttributesCount || 0) > 0) {
    checkMetric(
      metrics.updateAvgMs,
      limits.updateAvgFail,
      warnAt,
      issues,
      warnings,
      'Browser update avg',
      'Average headless-browser attribute update time'
    );
    checkMetric(
      metrics.updateP95Ms,
      limits.updateP95Fail,
      warnAt,
      issues,
      warnings,
      'Browser update p95',
      'p95 headless-browser attribute update time'
    );
    checkMetric(
      metrics.burstAvgMs,
      limits.burstAvgFail,
      warnAt,
      issues,
      warnings,
      'Browser burst avg',
      'Average headless-browser burst update time'
    );
    checkMetric(
      metrics.burstP95Ms,
      limits.burstP95Fail,
      warnAt,
      issues,
      warnings,
      'Browser burst p95',
      'p95 headless-browser burst update time'
    );
  }

  checkMetric(
    metrics.domNodes,
    limits.domNodesFail,
    warnAt,
    issues,
    warnings,
    'DOM node budget',
    'Rendered DOM node count'
  );
  checkMetric(
    metrics.shadowHtmlBytes,
    limits.shadowHtmlBytesFail,
    warnAt,
    issues,
    warnings,
    'Shadow HTML budget',
    'Rendered shadowRoot HTML bytes'
  );

  if (typeof metrics.heapDeltaKB === 'number' && Number.isFinite(metrics.heapDeltaKB)) {
    checkMetric(
      metrics.heapDeltaKB,
      limits.heapDeltaKbFail,
      warnAt,
      issues,
      warnings,
      'Heap delta',
      'Post-GC heap delta after lifecycle run (KB)'
    );
  } else {
    warnings.push({
      name: 'Heap metric unavailable',
      desc: 'Chromium heap metric unavailable for this run.'
    });
  }

  return { issues, warnings };
}

function auditBrowserLoadMetrics(metrics, componentName) {
  const tier = criteria.getComponentTier(componentName);
  const limits = BROWSER_LOAD_METRICS[tier];
  const issues = [];
  const warnings = [];
  const warnAt = 0.95;

  if ((metrics.instances || 0) !== limits.instances) {
    warnings.push({
      name: 'Load instance count',
      desc: `Load bench used ${metrics.instances || 0} instances, expected ${limits.instances}.`
    });
  }

  checkMetric(
    metrics.batchMountMs,
    limits.batchMountFail,
    warnAt,
    issues,
    warnings,
    'Load batch mount',
    'Batch mount time under load'
  );
  checkMetric(
    metrics.perInstanceMountMs,
    limits.perInstanceMountFail,
    warnAt,
    issues,
    warnings,
    'Load per-instance mount',
    'Per-instance mount time under load'
  );

  if ((metrics.observedAttributesCount || 0) > 0) {
    checkMetric(
      metrics.updateWaveMs,
      limits.updateWaveFail,
      warnAt,
      issues,
      warnings,
      'Load update wave',
      'Whole-dashboard update wave time'
    );
    checkMetric(
      metrics.updateWavePerInstanceMs,
      limits.updateWavePerInstanceFail,
      warnAt,
      issues,
      warnings,
      'Load update wave per-instance',
      'Per-instance update wave time'
    );
    checkMetric(
      metrics.burstWaveAvgMs,
      limits.burstWaveAvgFail,
      warnAt,
      issues,
      warnings,
      'Load burst avg',
      'Average dashboard burst wave time'
    );
    checkMetric(
      metrics.burstWaveP95Ms,
      limits.burstWaveP95Fail,
      warnAt,
      issues,
      warnings,
      'Load burst p95',
      'p95 dashboard burst wave time'
    );
  }

  checkMetric(
    metrics.totalDomNodes,
    limits.totalDomNodesFail,
    warnAt,
    issues,
    warnings,
    'Load DOM node budget',
    'Total DOM nodes across concurrent instances'
  );
  checkMetric(
    metrics.totalShadowHtmlBytes,
    limits.totalShadowHtmlBytesFail,
    warnAt,
    issues,
    warnings,
    'Load shadow HTML budget',
    'Total shadow HTML bytes across concurrent instances'
  );

  if (typeof metrics.heapDeltaKB === 'number' && Number.isFinite(metrics.heapDeltaKB)) {
    checkMetric(
      metrics.heapDeltaKB,
      limits.heapDeltaKbFail,
      warnAt,
      issues,
      warnings,
      'Load heap delta',
      'Post-GC heap delta after load run (KB)'
    );
  } else {
    warnings.push({
      name: 'Load heap metric unavailable',
      desc: 'Chromium heap metric unavailable for this load run.'
    });
  }

  return { issues, warnings };
}

function checkMetric(value, failLimit, warnRatio, issues, warnings, name, label) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return;
  if (value > failLimit) {
    issues.push({
      name,
      desc: `${label} ${value.toFixed(2)} exceeds ${failLimit}.`
    });
  } else if (value > failLimit * warnRatio) {
    warnings.push({
      name,
      desc: `${label} ${value.toFixed(2)} is near limit ${failLimit}.`
    });
  }
}

const FAIL_ON_PERF_WARNINGS =
  typeof process !== 'undefined' && process.env
    ? process.env.OGULCAN_PERF_STRICT !== '0'
    : true;

function consolidatePerf(issues, warnings) {
  const all = [...issues];
  if (FAIL_ON_PERF_WARNINGS) {
    warnings.forEach((w) => all.push({ name: `[PERF WARN→FAIL] ${w.name}`, desc: w.desc }));
  }
  return { issues: all, warnings: FAIL_ON_PERF_WARNINGS ? [] : warnings, passed: all.length === 0 };
}

const FAIL_ON_BROWSER_WARNINGS =
  typeof process !== 'undefined' && process.env
    ? process.env.OGULCAN_BROWSER_STRICT !== '0'
    : true;

function consolidateBrowser(issues, warnings) {
  const all = [...issues];
  if (FAIL_ON_BROWSER_WARNINGS) {
    warnings.forEach((w) => all.push({ name: `[BROWSER WARN→FAIL] ${w.name}`, desc: w.desc }));
  }
  return { issues: all, warnings: FAIL_ON_BROWSER_WARNINGS ? [] : warnings, passed: all.length === 0 };
}

module.exports = {
  BURST,
  LIFECYCLE,
  BATCH,
  BROWSER_METRICS,
  BROWSER_LOAD_METRICS,
  TIER_PERF,
  getTierPerf,
  auditTierRuntimePerf,
  auditBurstPerf,
  auditLifecyclePerf,
  auditBatchMountPerf,
  REALTIME_SHADOW,
  auditRealtimeShadowStability,
  auditMemoryHygiene,
  auditBrowserRuntimeMetrics,
  auditBrowserLoadMetrics,
  consolidatePerf,
  consolidateBrowser,
  FAIL_ON_PERF_WARNINGS
};
