/**
 * OgulcanUI chart sample catalog (75 sample ids → enterprise chart components).
 */

const ALL_SAMPLE_IDS = [
  'advanced/data-decimation',
  'advanced/derived-axis-type',
  'advanced/derived-chart-type',
  'advanced/linear-gradient',
  'advanced/programmatic-events',
  'advanced/progress-bar',
  'advanced/radial-gradient',
  'animations/delay',
  'animations/drop',
  'animations/loop',
  'animations/progressive-line',
  'animations/progressive-line-easing',
  'area/line-boundaries',
  'area/line-datasets',
  'area/line-drawtime',
  'area/line-stacked',
  'area/radar',
  'bar/border-radius',
  'bar/floating',
  'bar/horizontal',
  'bar/stacked',
  'bar/stacked-groups',
  'bar/vertical',
  'legend/events',
  'legend/html',
  'legend/point-style',
  'legend/position',
  'legend/title',
  'line/interpolation',
  'line/line',
  'line/multi-axis',
  'line/point-styling',
  'line/segments',
  'line/stepped',
  'line/styling',
  'other-charts/bubble',
  'other-charts/combo-bar-line',
  'other-charts/doughnut',
  'other-charts/multi-series-pie',
  'other-charts/pie',
  'other-charts/polar-area',
  'other-charts/polar-area-center-labels',
  'other-charts/radar',
  'other-charts/radar-skip-points',
  'other-charts/scatter',
  'other-charts/scatter-multi-axis',
  'other-charts/stacked-bar-line',
  'plugins/chart-area-border',
  'plugins/doughnut-empty-state',
  'plugins/quadrants',
  'scale-options/center',
  'scale-options/grid',
  'scale-options/ticks',
  'scale-options/titles',
  'scales/linear-min-max',
  'scales/linear-min-max-suggested',
  'scales/linear-step-size',
  'scales/log',
  'scales/stacked',
  'scales/time-combo',
  'scales/time-line',
  'scales/time-max-span',
  'scriptable/bar',
  'scriptable/bubble',
  'scriptable/line',
  'scriptable/pie',
  'scriptable/polar',
  'scriptable/radar',
  'subtitle/basic',
  'title/alignment',
  'tooltip/content',
  'tooltip/html',
  'tooltip/interactions',
  'tooltip/point-style',
  'tooltip/position'
];

/** @type {Record<string, string>} */
const SAMPLE_TO_COMPONENT = {
  'bar/vertical': 'DeploymentFrequencyBar',
  'bar/horizontal': 'DeploymentFrequencyBar',
  'bar/stacked': 'AttritionCohortBar',
  'bar/stacked-groups': 'FreightCostWaterfall',
  'bar/floating': 'CarbonFootprintPerShipment',
  'bar/border-radius': 'DeploymentFrequencyBar',
  'scriptable/bar': 'DeploymentFrequencyBar',
  'scales/stacked': 'AttritionCohortBar',
  'other-charts/stacked-bar-line': 'PnlWaterfallChart',

  'line/line': 'UptimeTrendLine',
  'line/styling': 'UptimeTrendLine',
  'line/interpolation': 'OnTimeDeliveryTrend',
  'line/segments': 'HeadcountTrendChart',
  'line/stepped': 'MarginExpansionTrend',
  'line/multi-axis': 'MarginExpansionTrend',
  'line/point-styling': 'MarginExpansionTrend',
  'scriptable/line': 'IncidentDensityTrend',
  'animations/progressive-line': 'TimeToMarketTrend',
  'animations/progressive-line-easing': 'TimeToMarketTrend',

  'area/line-boundaries': 'SalesEfficiencyRatio',
  'area/line-datasets': 'SalesEfficiencyRatio',
  'area/line-drawtime': 'ErrorBudgetSli',
  'area/line-stacked': 'ExpenseTrendStack',
  'area/radar': 'UtilizationByTeam',

  'other-charts/pie': 'MrrComposition',
  'other-charts/multi-series-pie': 'MrrComposition',
  'scriptable/pie': 'MrrComposition',

  'other-charts/doughnut': 'MrrComposition',
  'plugins/doughnut-empty-state': 'SlaBreachRate',

  'other-charts/bubble': 'CustomerProfitability',
  'scriptable/bubble': 'CustomerProfitability',

  'other-charts/scatter': 'RiskAdjustedMargin',
  'other-charts/scatter-multi-axis': 'HeadcountRoi',

  'other-charts/radar': 'UtilizationByTeam',
  'other-charts/radar-skip-points': 'NpsSegmentBreakdown',
  'scriptable/radar': 'UtilizationByTeam',

  'other-charts/polar-area': 'ForecastAccuracy',
  'scriptable/polar': 'MeanTimeDetect',
  'advanced/progress-bar': 'PipelineCoverage',

  'other-charts/polar-area-center-labels': 'SlaBreachRate',

  'other-charts/combo-bar-line': 'GrossMarginWaterfall',

  'scales/time-line': 'IncidentDensityTrend',
  'scales/time-combo': 'MarginExpansionTrend',
  'scales/time-max-span': 'LeadToCloseVelocity',

  'scales/log': 'ServiceLatencyP99',
  'scales/linear-min-max': 'ServiceLatencyP99',
  'scales/linear-min-max-suggested': 'CashConversionCycle',
  'scales/linear-step-size': 'ServiceLatencyP99',

  'scale-options/center': 'ForecastAccuracy',
  'scale-options/grid': 'ServiceLatencyP99',
  'scale-options/ticks': 'QueueBacklogMeter',
  'scale-options/titles': 'SkillsCoverageGrid',

  'legend/events': 'ReconciliationStatusGrid',
  'legend/html': 'RetentionMatrix',
  'legend/point-style': 'RetentionMatrix',
  'legend/position': 'RetentionMatrix',
  'legend/title': 'RetentionMatrix',

  'tooltip/content': 'WinLossAnalysis',
  'tooltip/html': 'FraudVelocitySpark',
  'tooltip/interactions': 'NetRevenueRetention',
  'tooltip/point-style': 'WinLossAnalysis',
  'tooltip/position': 'FraudVelocitySpark',

  'subtitle/basic': 'TimeToMarketTrend',
  'title/alignment': 'FraudVelocitySpark',

  'animations/delay': 'SkillsCoverageGrid',
  'animations/drop': 'SkillsCoverageGrid',
  'animations/loop': 'SkillsCoverageGrid',

  'plugins/chart-area-border': 'SupplierRiskIndex',
  'plugins/quadrants': 'SupplierRiskIndex',

  'advanced/data-decimation': 'CashConversionCycle',
  'advanced/derived-axis-type': 'CycleTimeControl',
  'advanced/derived-chart-type': 'CreditMigrationMatrix',
  'advanced/linear-gradient': 'ConversionStepFunnel',
  'advanced/radial-gradient': 'MrrComposition',
  'advanced/programmatic-events': 'ComplianceGapHeatmap'
};

for (const id of ALL_SAMPLE_IDS) {
  if (!SAMPLE_TO_COMPONENT[id]) {
    throw new Error(`Unmapped chart sample: ${id}`);
  }
}

const COMPONENT_DEFAULT_SAMPLE = {
  CostOfRiskBars: 'bar/vertical',
  IncidentDensityTrend: 'line/line',
  ExpenseTrendStack: 'area/line-stacked',
  MrrComposition: 'other-charts/doughnut',
  ForecastAccuracy: 'other-charts/polar-area',
  SlaBreachRate: 'other-charts/polar-area-center-labels',
  CustomerProfitability: 'other-charts/bubble',
  UtilizationByTeam: 'other-charts/radar',
  GrossMarginWaterfall: 'other-charts/combo-bar-line',
  MarginExpansionTrend: 'scales/time-line',
  ServiceLatencyP99: 'scales/log',
  LeadToCloseVelocity: 'scales/time-max-span',
  WinLossAnalysis: 'tooltip/content',
  RetentionMatrix: 'legend/position',
  TimeToMarketTrend: 'subtitle/basic',
  FraudVelocitySpark: 'title/alignment',
  SkillsCoverageGrid: 'animations/loop',
  MeanTimeDetect: 'scale-options/center',
  QueueBacklogMeter: 'scale-options/ticks',
  SupplierRiskIndex: 'plugins/quadrants',
  CashConversionCycle: 'advanced/data-decimation',
  CreditMigrationMatrix: 'advanced/derived-chart-type',
  ConversionStepFunnel: 'advanced/linear-gradient',
  MrrComposition: 'advanced/radial-gradient',
  ComplianceGapHeatmap: 'advanced/programmatic-events',
  BudgetVariancePareto: 'bar/stacked'
};

const CHART_COMPONENTS = [...new Set(Object.values(SAMPLE_TO_COMPONENT))].sort();

function samplesForComponent(name) {
  return ALL_SAMPLE_IDS.filter((id) => SAMPLE_TO_COMPONENT[id] === name);
}

function validateCoverage() {
  const mapped = new Set(Object.keys(SAMPLE_TO_COMPONENT));
  for (const id of ALL_SAMPLE_IDS) {
    if (!mapped.has(id)) return { ok: false, missing: id };
    if (!SAMPLE_DISPLAY_NAMES[id]) return { ok: false, unnamedSample: id };
  }
  if (mapped.size !== ALL_SAMPLE_IDS.length) {
    const extra = [...mapped].filter((id) => !ALL_SAMPLE_IDS.includes(id));
    return { ok: false, extra };
  }
  for (const name of CHART_COMPONENTS) {
    if (!COMPONENT_DISPLAY_NAMES[name]) {
      return { ok: false, unnamedComponent: name };
    }
  }
  return { ok: true, count: ALL_SAMPLE_IDS.length };
}

const {
  SAMPLE_DISPLAY_NAMES,
  COMPONENT_DISPLAY_NAMES,
  formatSampleLabel,
  formatComponentLabel
} = require('../../src/lib/chart-display-names');

module.exports = {
  ALL_SAMPLE_IDS,
  SAMPLE_TO_COMPONENT,
  COMPONENT_DEFAULT_SAMPLE,
  CHART_COMPONENTS,
  SAMPLE_DISPLAY_NAMES,
  COMPONENT_DISPLAY_NAMES,
  formatSampleLabel,
  formatComponentLabel,
  samplesForComponent,
  validateCoverage
};
