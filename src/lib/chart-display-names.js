/**
 * Enterprise display names for OgulcanUI chart samples and components.
 */
(function chartDisplayNames(root) {
  const SAMPLE_DISPLAY_NAMES = {
    'advanced/data-decimation': 'Settlement — Latency Distribution',
    'advanced/derived-axis-type': 'Settlement — Derived Axis',
    'advanced/derived-chart-type': 'Privileged Access — Parallel View',
    'advanced/linear-gradient': 'Data Flow — Sankey',
    'advanced/programmatic-events': 'Zero Trust — Coverage Map',
    'advanced/progress-bar': 'Quota Attainment Gauge',
    'advanced/radial-gradient': 'FX Exposure Treemap',
    'animations/delay': 'Resource Utilization — Delayed',
    'animations/drop': 'Resource Utilization — Drop',
    'animations/loop': 'Resource Utilization — Loop',
    'animations/progressive-line': 'Auth Failures — Progressive',
    'animations/progressive-line-easing': 'Auth Failures — Eased',
    'area/line-boundaries': 'Treasury Cash — Boundaries',
    'area/line-datasets': 'Treasury Cash — Multi-Series',
    'area/line-drawtime': 'Error Budget — Burn',
    'area/line-stacked': 'Treasury Cash — Stacked',
    'area/radar': 'Customer Health Radar',
    'bar/border-radius': 'Deployments — Rounded Bars',
    'bar/floating': 'Carbon per Shipment',
    'bar/horizontal': 'Deployments — Horizontal',
    'bar/stacked': 'Pipeline Funnel — Stacked',
    'bar/stacked-groups': 'Freight Cost — Stacked',
    'bar/vertical': 'Deployment Frequency',
    'legend/events': 'Reconciliation — Legend Events',
    'legend/html': 'Service Health — Legend',
    'legend/point-style': 'Reconciliation — Point Legend',
    'legend/position': 'Service Health Matrix',
    'legend/title': 'Reconciliation — Legend Title',
    'line/interpolation': 'On-Time Delivery Trend',
    'line/line': 'Uptime Trend Line',
    'line/multi-axis': 'Treasury Cash — Dual Axis',
    'line/point-styling': 'On-Time Delivery — Points',
    'line/segments': 'Headcount Trend',
    'line/stepped': 'Payroll Cost Sparkline',
    'line/styling': 'Uptime — Custom Style',
    'other-charts/bubble': 'Account Revenue Bubble',
    'other-charts/combo-bar-line': 'P&L Waterfall Combo',
    'other-charts/doughnut': 'Benefits Enrollment',
    'other-charts/multi-series-pie': 'Benefits — Multi-Series',
    'other-charts/pie': 'Benefits Enrollment Donut',
    'other-charts/polar-area': 'Engagement Pulse',
    'other-charts/polar-area-center-labels': 'SLA Compliance Ring',
    'other-charts/radar': 'Threat Detection Radar',
    'other-charts/radar-skip-points': 'Customer Health — Sparse',
    'other-charts/scatter': 'Account Revenue Scatter',
    'other-charts/scatter-multi-axis': 'Revenue — Dual Axis',
    'other-charts/stacked-bar-line': 'P&L — Stacked Combo',
    'plugins/chart-area-border': 'Supplier Lead Time — Box',
    'plugins/doughnut-empty-state': 'Training Completion Ring',
    'plugins/quadrants': 'Supplier Lead Time — Quadrants',
    'scale-options/center': 'Inventory Turnover Gauge',
    'scale-options/grid': 'API Latency — Grid',
    'scale-options/ticks': 'Queue Backlog Meter',
    'scale-options/titles': 'Resource Spark Grid',
    'scales/linear-min-max': 'API Latency — Fixed Bounds',
    'scales/linear-min-max-suggested': 'Settlement Latency Panel',
    'scales/linear-step-size': 'API Latency — Step Size',
    'scales/log': 'API Latency Percentile',
    'scales/stacked': 'Attrition Cohort Bars',
    'scales/time-combo': 'Treasury — Time Combo',
    'scales/time-line': 'Headcount — Time Series',
    'scales/time-max-span': 'Deal Velocity Gantt',
    'scriptable/bar': 'Deployments — Scriptable',
    'scriptable/bubble': 'Account Revenue — Scriptable',
    'scriptable/line': 'Uptime — Scriptable',
    'scriptable/pie': 'Benefits — Scriptable',
    'scriptable/polar': 'Compliance Score Gauge',
    'scriptable/radar': 'Threat Radar — Scriptable',
    'subtitle/basic': 'Auth Failure Sparkline',
    'title/alignment': 'Payroll Cost Sparkline',
    'tooltip/content': 'Win Rate Trend Card',
    'tooltip/html': 'Chargeback Trend Card',
    'tooltip/interactions': 'Churn Risk Scorecard',
    'tooltip/point-style': 'Win Rate — Point Tooltip',
    'tooltip/position': 'Chargeback — Tooltip Position'
  };

  const COMPONENT_DISPLAY_NAMES = {
    AccessPostureRadar: 'Access Posture Radar',
    AllocationWaterfall: 'Allocation Waterfall',
    AnomalyBandControl: 'Anomaly Band Control',
    AuditFindingWaterfall: 'Audit Finding Waterfall',
    BreachRateRing: 'Breach Rate Ring',
    BudgetTradeoffWaterfall: 'Budget Tradeoff Waterfall',
    BurnRateKpi: 'Burn Rate KPI',
    CapacityStackedTrend: 'Capacity Stacked Trend',
    ChannelMixDonut: 'Channel Mix Donut',
    CohortRetentionHeatmap: 'Cohort Retention Heatmap',
    ComplianceObligationMatrix: 'Compliance Obligation Matrix',
    ControlCoverageBullet: 'Control Coverage Bullet',
    ConversionPathFunnel: 'Conversion Path Funnel',
    CustomerJourneySankey: 'Customer Journey Sankey',
    DemandForecastProjection: 'Demand Forecast Projection',
    DependencyRadar: 'Dependency Radar',
    ErrorBudgetLine: 'Error Budget Line',
    ExposureLimitBars: 'Exposure Limit Bars',
    ForecastConfidenceBoxplot: 'Forecast Confidence Boxplot',
    FraudPatternScatter: 'Fraud Pattern Scatter',
    GrowthCurveArea: 'Growth Curve Area',
    IncidentSeverityPareto: 'Incident Severity Pareto',
    InvestmentMixDonut: 'Investment Mix Donut',
    LatencyControlChart: 'Latency Control Chart',
    MarketPulseLine: 'Market Pulse Line',
    OpportunityPareto: 'Opportunity Pareto',
    PlanVsActualBullet: 'Plan vs Actual Bullet',
    PolicyExceptionHeatmap: 'Policy Exception Heatmap',
    PortfolioOptimizationRadar: 'Portfolio Optimization Radar',
    PriceElasticityScatter: 'Price Elasticity Scatter',
    PrioritizationTreemap: 'Prioritization Treemap',
    ProductAdoptionStack: 'Product Adoption Stack',
    QualityHistogram: 'Quality Histogram',
    QueueDepthBars: 'Queue Depth Bars',
    ReleaseTrainGantt: 'Release Train Gantt',
    RevenueStreamTreemap: 'Revenue Stream Treemap',
    RiskAppetiteGauge: 'Risk Appetite Gauge',
    ScenarioOutcomeProjection: 'Scenario Outcome Projection',
    ScenarioSensitivityMultiLine: 'Scenario Sensitivity Multi Line',
    SegmentBridgePareto: 'Segment Bridge Pareto',
    SensorDriftScatter: 'Sensor Drift Scatter',
    ServiceHealthMatrix: 'Service Health Matrix',
    StrategyFunnel: 'Strategy Funnel',
    SupplyChainGantt: 'Supply Chain Gantt',
    ThresholdRing: 'Threshold Ring',
    ThroughputHistogram: 'Throughput Histogram',
    UptimeKpiSpark: 'Uptime KPI Spark',
    VolatilityBoxplot: 'Volatility Boxplot',
    WorkflowStepArea: 'Workflow Step Area',
    WorkforceUtilizationHBars: 'Workforce Utilization HBars'
  };

  function titleCaseSlug(slug) {
    return String(slug || '')
      .split(/[-_/]+/)
      .filter(Boolean)
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');
  }

  function formatSampleLabel(sampleId) {
    if (!sampleId) return '';
    if (SAMPLE_DISPLAY_NAMES[sampleId]) return SAMPLE_DISPLAY_NAMES[sampleId];
    const parts = String(sampleId).split('/');
    if (parts.length === 2) {
      return `${titleCaseSlug(parts[1])} — ${titleCaseSlug(parts[0])}`;
    }
    return titleCaseSlug(sampleId);
  }

  function formatComponentLabel(componentName) {
    if (!componentName) return '';
    if (COMPONENT_DISPLAY_NAMES[componentName]) return COMPONENT_DISPLAY_NAMES[componentName];
    return String(componentName).replace(/([a-z0-9])([A-Z])/g, '$1 $2');
  }

  const api = {
    SAMPLE_DISPLAY_NAMES,
    COMPONENT_DISPLAY_NAMES,
    formatSampleLabel,
    formatComponentLabel
  };

  root.OgulcanChartNames = api;
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : typeof window !== 'undefined' ? window : global);
