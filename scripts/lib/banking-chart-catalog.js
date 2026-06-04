/**
 * OgulcanUI chart catalog (50 components).
 * Five categories, ten unique chart components per category.
 */

const CHART_ATTRS = ['data', 'label', 'color'];
const KPI_ATTRS = ['title', 'value', 'change', 'trend', 'sparkline', 'color'];
const GAUGE_ATTRS = ['value', 'min', 'max', 'label', 'color'];

const CATEGORY_NAMES = [
  'Flow Intelligence',
  'Signal Exploration',
  'Risk And Controls',
  'Operating Pulse',
  'Decision Surfaces'
];

/** @type {Array<{ name: string, charts: Array<object> }>} */
const CHART_CATEGORIES = [
  {
    name: 'Flow Intelligence',
    charts: [
      { name: 'CustomerJourneySankey', kind: 'customerJourneySankey', attrs: CHART_ATTRS, domain: 'journey', visualVariant: 'sankey', interaction: 'pulse-route' },
      { name: 'RevenueStreamTreemap', kind: 'revenueStreamTreemap', attrs: CHART_ATTRS, domain: 'revenue', visualVariant: 'treemap', interaction: 'tile-inspect' },
      { name: 'ChannelMixDonut', kind: 'channelMixDonut', attrs: CHART_ATTRS, domain: 'channel', visualVariant: 'donut', interaction: 'slice-focus' },
      { name: 'ConversionPathFunnel', kind: 'conversionPathFunnel', attrs: CHART_ATTRS, domain: 'conversion', visualVariant: 'funnel', interaction: 'stage-lift' },
      { name: 'SupplyChainGantt', kind: 'supplyChainGantt', attrs: CHART_ATTRS, domain: 'supply', visualVariant: 'gantt', interaction: 'lane-scrub' },
      { name: 'DependencyRadar', kind: 'dependencyRadar', attrs: CHART_ATTRS, domain: 'dependency', visualVariant: 'radar', interaction: 'axis-pin' },
      { name: 'AllocationWaterfall', kind: 'allocationWaterfall', attrs: CHART_ATTRS, domain: 'allocation', visualVariant: 'waterfall', interaction: 'bridge-step' },
      { name: 'SegmentBridgePareto', kind: 'segmentBridgePareto', attrs: CHART_ATTRS, domain: 'segment', visualVariant: 'pareto', interaction: 'rank-sweep' },
      { name: 'ProductAdoptionStack', kind: 'productAdoptionStack', attrs: CHART_ATTRS, domain: 'adoption', visualVariant: 'stacked', interaction: 'layer-peel' },
      { name: 'WorkflowStepArea', kind: 'workflowStepArea', attrs: CHART_ATTRS, domain: 'workflow', visualVariant: 'stepArea', interaction: 'step-toggle' }
    ]
  },
  {
    name: 'Signal Exploration',
    charts: [
      { name: 'DemandForecastProjection', kind: 'demandForecastProjection', attrs: CHART_ATTRS, domain: 'demand', visualVariant: 'projection', interaction: 'forecast-drag' },
      { name: 'AnomalyBandControl', kind: 'anomalyBandControl', attrs: CHART_ATTRS, domain: 'anomaly', visualVariant: 'control', interaction: 'limit-brush' },
      { name: 'CohortRetentionHeatmap', kind: 'cohortRetentionHeatmap', attrs: CHART_ATTRS, domain: 'cohort', visualVariant: 'calendarHeat', interaction: 'cell-lens' },
      { name: 'MarketPulseLine', kind: 'marketPulseLine', attrs: CHART_ATTRS, domain: 'market', visualVariant: 'areaLine', interaction: 'crosshair-hover' },
      { name: 'SensorDriftScatter', kind: 'sensorDriftScatter', attrs: CHART_ATTRS, domain: 'sensor', visualVariant: 'scatter', interaction: 'point-cluster' },
      { name: 'QualityHistogram', kind: 'qualityHistogram', attrs: CHART_ATTRS, domain: 'quality', visualVariant: 'histogram', interaction: 'bin-zoom' },
      { name: 'ScenarioSensitivityMultiLine', kind: 'scenarioSensitivityMultiLine', attrs: CHART_ATTRS, domain: 'scenario', visualVariant: 'multiLine', interaction: 'series-solo' },
      { name: 'VolatilityBoxplot', kind: 'volatilityBoxplot', attrs: CHART_ATTRS, domain: 'volatility', visualVariant: 'boxplot', interaction: 'quartile-read' },
      { name: 'GrowthCurveArea', kind: 'growthCurveArea', attrs: CHART_ATTRS, domain: 'growth', visualVariant: 'areaLine', interaction: 'curve-reveal' },
      { name: 'ThresholdRing', kind: 'thresholdRing', attrs: GAUGE_ATTRS, domain: 'threshold', visualVariant: 'ring', interaction: 'arc-threshold' }
    ]
  },
  {
    name: 'Risk And Controls',
    charts: [
      { name: 'ComplianceObligationMatrix', kind: 'complianceObligationMatrix', attrs: CHART_ATTRS, domain: 'compliance', visualVariant: 'matrix', interaction: 'matrix-select' },
      { name: 'IncidentSeverityPareto', kind: 'incidentSeverityPareto', attrs: CHART_ATTRS, domain: 'incident', visualVariant: 'pareto', interaction: 'severity-drill' },
      { name: 'AccessPostureRadar', kind: 'accessPostureRadar', attrs: CHART_ATTRS, domain: 'access', visualVariant: 'radar', interaction: 'control-spoke' },
      { name: 'RiskAppetiteGauge', kind: 'riskAppetiteGauge', attrs: GAUGE_ATTRS, domain: 'appetite', visualVariant: 'gauge', interaction: 'needle-read' },
      { name: 'AuditFindingWaterfall', kind: 'auditFindingWaterfall', attrs: CHART_ATTRS, domain: 'audit', visualVariant: 'waterfall', interaction: 'finding-step' },
      { name: 'ControlCoverageBullet', kind: 'controlCoverageBullet', attrs: CHART_ATTRS, domain: 'coverage', visualVariant: 'bullet', interaction: 'target-slide' },
      { name: 'FraudPatternScatter', kind: 'fraudPatternScatter', attrs: CHART_ATTRS, domain: 'fraud', visualVariant: 'scatter', interaction: 'pattern-lasso' },
      { name: 'PolicyExceptionHeatmap', kind: 'policyExceptionHeatmap', attrs: CHART_ATTRS, domain: 'policy', visualVariant: 'calendarHeat', interaction: 'exception-peek' },
      { name: 'ExposureLimitBars', kind: 'exposureLimitBars', attrs: CHART_ATTRS, domain: 'exposure', visualVariant: 'horizontalBars', interaction: 'limit-compare' },
      { name: 'BreachRateRing', kind: 'breachRateRing', attrs: GAUGE_ATTRS, domain: 'breach', visualVariant: 'ring', interaction: 'breach-scan' }
    ]
  },
  {
    name: 'Operating Pulse',
    charts: [
      { name: 'UptimeKpiSpark', kind: 'uptimeKpiSpark', attrs: KPI_ATTRS, kpi: true, domain: 'uptime', visualVariant: 'kpi', interaction: 'spark-scrub' },
      { name: 'QueueDepthBars', kind: 'queueDepthBars', attrs: CHART_ATTRS, domain: 'queue', visualVariant: 'bars', interaction: 'bar-press' },
      { name: 'LatencyControlChart', kind: 'latencyControlChart', attrs: CHART_ATTRS, domain: 'latency', visualVariant: 'control', interaction: 'latency-band' },
      { name: 'CapacityStackedTrend', kind: 'capacityStackedTrend', attrs: CHART_ATTRS, domain: 'capacity', visualVariant: 'stacked', interaction: 'capacity-stack' },
      { name: 'ReleaseTrainGantt', kind: 'releaseTrainGantt', attrs: CHART_ATTRS, domain: 'release', visualVariant: 'gantt', interaction: 'release-hover' },
      { name: 'ServiceHealthMatrix', kind: 'serviceHealthMatrix', attrs: CHART_ATTRS, domain: 'service', visualVariant: 'matrix', interaction: 'health-cell' },
      { name: 'ErrorBudgetLine', kind: 'errorBudgetLine', attrs: CHART_ATTRS, domain: 'error', visualVariant: 'areaLine', interaction: 'budget-marker' },
      { name: 'ThroughputHistogram', kind: 'throughputHistogram', attrs: CHART_ATTRS, domain: 'throughput', visualVariant: 'histogram', interaction: 'throughput-bin' },
      { name: 'WorkforceUtilizationHBars', kind: 'workforceUtilizationHBars', attrs: CHART_ATTRS, domain: 'workforce', visualVariant: 'horizontalBars', interaction: 'team-compare' },
      { name: 'BurnRateKpi', kind: 'burnRateKpi', attrs: KPI_ATTRS, kpi: true, domain: 'burn', visualVariant: 'kpi', interaction: 'runway-spark' }
    ]
  },
  {
    name: 'Decision Surfaces',
    charts: [
      { name: 'PriceElasticityScatter', kind: 'priceElasticityScatter', attrs: CHART_ATTRS, domain: 'price', visualVariant: 'scatter', interaction: 'elasticity-drag' },
      { name: 'PortfolioOptimizationRadar', kind: 'portfolioOptimizationRadar', attrs: CHART_ATTRS, domain: 'portfolio', visualVariant: 'radar', interaction: 'portfolio-weight' },
      { name: 'BudgetTradeoffWaterfall', kind: 'budgetTradeoffWaterfall', attrs: CHART_ATTRS, domain: 'budget', visualVariant: 'waterfall', interaction: 'tradeoff-step' },
      { name: 'PrioritizationTreemap', kind: 'prioritizationTreemap', attrs: CHART_ATTRS, domain: 'priority', visualVariant: 'treemap', interaction: 'priority-tile' },
      { name: 'StrategyFunnel', kind: 'strategyFunnel', attrs: CHART_ATTRS, domain: 'strategy', visualVariant: 'funnel', interaction: 'strategy-stage' },
      { name: 'ForecastConfidenceBoxplot', kind: 'forecastConfidenceBoxplot', attrs: CHART_ATTRS, domain: 'confidence', visualVariant: 'boxplot', interaction: 'confidence-range' },
      { name: 'OpportunityPareto', kind: 'opportunityPareto', attrs: CHART_ATTRS, domain: 'opportunity', visualVariant: 'pareto', interaction: 'opportunity-rank' },
      { name: 'InvestmentMixDonut', kind: 'investmentMixDonut', attrs: CHART_ATTRS, domain: 'investment', visualVariant: 'donut', interaction: 'mix-rotate' },
      { name: 'PlanVsActualBullet', kind: 'planVsActualBullet', attrs: CHART_ATTRS, domain: 'plan', visualVariant: 'bullet', interaction: 'actual-target' },
      { name: 'ScenarioOutcomeProjection', kind: 'scenarioOutcomeProjection', attrs: CHART_ATTRS, domain: 'outcome', visualVariant: 'projection', interaction: 'outcome-slider' }
    ]
  }
];

const CATALOG_50 = CHART_CATEGORIES.flatMap((category) =>
  category.charts.map((entry) => ({ ...entry, category: category.name }))
);

const VISUAL_VARIANTS = [
  { id: 'bars', fn: 'drawBars' },
  { id: 'areaLine', fn: 'drawAreaLine' },
  { id: 'donut', fn: 'drawDonut' },
  { id: 'gauge', fn: 'drawGauge' },
  { id: 'matrix', fn: 'drawMatrix' },
  { id: 'radar', fn: 'drawRadar' },
  { id: 'kpi', fn: 'drawKpi' },
  { id: 'horizontalBars', fn: 'drawHBar' },
  { id: 'pareto', fn: 'drawPareto' },
  { id: 'scatter', fn: 'drawScatter' },
  { id: 'stacked', fn: 'drawStacked' },
  { id: 'waterfall', fn: 'drawWaterfall' },
  { id: 'funnel', fn: 'drawFunnel' },
  { id: 'histogram', fn: 'drawHistogram' },
  { id: 'control', fn: 'drawControl' },
  { id: 'boxplot', fn: 'drawBoxplot' },
  { id: 'projection', fn: 'drawProjection' },
  { id: 'gantt', fn: 'drawGantt' },
  { id: 'calendarHeat', fn: 'drawCalendarHeat' },
  { id: 'sankey', fn: 'drawSankey' },
  { id: 'treemap', fn: 'drawTreemap' },
  { id: 'bullet', fn: 'drawBullet' },
  { id: 'ring', fn: 'drawRing' },
  { id: 'multiLine', fn: 'drawMultiLine' },
  { id: 'stepArea', fn: 'drawStepArea' }
];

const STROKES = ['PRIMARY', 'GOOD', 'WARN', 'BAD', "'#2563eb'", "'#0891b2'", "'#7c3aed'", "'#be123c'"];

function displayName(name) {
  return name.replace(/([a-z0-9])([A-Z])/g, '$1 $2');
}

function buildPainterOpts(entry, index) {
  const title = displayName(entry.name).replace(/'/g, "\\'");
  const seed = index % 97;
  const parts = [
    `title: '${title}'`,
    `category: '${entry.category}'`,
    `interaction: '${entry.interaction}'`
  ];

  switch (entry.visualVariant) {
    case 'bars':
      parts.push(`count: ${6 + (seed % 7)}`);
      if (seed % 2 === 0) parts.push('square: true');
      break;
    case 'areaLine':
      parts.push(`count: ${12 + (seed % 12)}`, `stroke: ${STROKES[seed % STROKES.length]}`);
      if (seed % 3 === 0) parts.push('area: true');
      break;
    case 'donut':
      parts.push(`count: ${4 + (seed % 4)}`, `center: '${entry.domain.slice(0, 6).toUpperCase()}'`);
      if (seed % 2) parts.push('thin: true');
      break;
    case 'gauge':
      parts.push(`sub: '${entry.domain} score'`, "suffix: '%'");
      break;
    case 'matrix':
      parts.push(`cols: ${5 + (seed % 4)}`, `rows: ${4 + (seed % 3)}`);
      break;
    case 'radar':
      parts.push(`axes: ${5 + (seed % 4)}`);
      break;
    case 'kpi': {
      const vals = ['99.98%', '1.42x', '$4.8M', '73 ms', '18.6 mo', '42 bps', '8.4K', '96'];
      const chg = ['+2.4% WoW', '-0.8% MoM', '+7 pts', '-11 bps', '+1.2x', '+420K', '-3 min', '+0.4 sigma'];
      parts.push(`defaultValue: '${vals[seed % vals.length]}'`, `defaultChange: '${chg[seed % chg.length]}'`, `stroke: ${STROKES[(seed + 2) % STROKES.length]}`);
      break;
    }
    case 'horizontalBars':
      parts.push(`count: ${5 + (seed % 5)}`);
      break;
    case 'funnel':
      parts.push(`labels: ${JSON.stringify(['Enter', 'Qualify', 'Commit', 'Review', 'Approve', 'Launch'])}`);
      break;
    case 'histogram':
      parts.push(`bins: ${7 + (seed % 4)}`);
      break;
    case 'calendarHeat':
      parts.push(`cols: ${8 + (seed % 3)}`, `rows: ${4 + (seed % 2)}`);
      break;
    case 'boxplot':
      parts.push(`groups: ${4 + (seed % 3)}`);
      break;
    case 'multiLine':
      parts.push(`count: ${14 + (seed % 8)}`, `series: ${2 + (seed % 2)}`, `labels: ${JSON.stringify(['Base', 'Stress', 'Upside'])}`);
      break;
    case 'bullet':
      parts.push(`metrics: ${JSON.stringify(['Plan', 'Actual', 'Risk', 'Gap'])}`);
      break;
    case 'ring':
      parts.push(`label: '${entry.domain.toUpperCase()}'`);
      break;
    default:
      parts.push(`count: ${6 + (seed % 8)}`);
      break;
  }

  return `{ ${parts.join(', ')} }`;
}

const BANKING_CHART_CATALOG = CATALOG_50;
const LEGACY_50 = CATALOG_50;

if (CHART_CATEGORIES.length !== 5) {
  throw new Error(`CHART_CATEGORIES must contain five categories (got ${CHART_CATEGORIES.length})`);
}

for (const category of CHART_CATEGORIES) {
  if (category.charts.length !== 10) {
    throw new Error(`Category "${category.name}" must contain 10 charts (got ${category.charts.length})`);
  }
}

if (BANKING_CHART_CATALOG.length !== 50) {
  throw new Error(`BANKING_CHART_CATALOG must contain 50 entries (got ${BANKING_CHART_CATALOG.length})`);
}

const kindSet = new Set(BANKING_CHART_CATALOG.map((e) => e.kind));
if (kindSet.size !== 50) {
  throw new Error(`Duplicate kind ids in catalog (unique ${kindSet.size} / 50)`);
}

const nameSet = new Set(BANKING_CHART_CATALOG.map((e) => e.name));
if (nameSet.size !== 50) {
  throw new Error(`Duplicate names in catalog (unique ${nameSet.size} / 50)`);
}

/** @type {Record<string, { attrs: string[], kind: string, kpi?: boolean }>} */
const CHART_SPECS_FROM_CATALOG = Object.fromEntries(
  BANKING_CHART_CATALOG.map((e) => [
    e.name,
    { attrs: e.attrs, kind: e.kind, ...(e.kpi ? { kpi: true } : {}) }
  ])
);

const CHARTS_ALLOWLIST = BANKING_CHART_CATALOG.map((e) => e.name).sort();
const CHART_CATEGORY_MAP = Object.fromEntries(
  BANKING_CHART_CATALOG.map((e) => [e.name, e.category])
);

function generateBankingExtensions() {
  return [];
}

module.exports = {
  CATEGORY_NAMES,
  CHART_CATEGORIES,
  CHART_CATEGORY_MAP,
  BANKING_CHART_CATALOG,
  CHART_SPECS_FROM_CATALOG,
  CHARTS_ALLOWLIST,
  CATALOG_50,
  LEGACY_50,
  generateBankingExtensions,
  buildPainterOpts,
  VISUAL_VARIANTS,
  displayName
};
