# OgulcanUI Documentation

**Version:** 0.1.0  
**License:** MIT  
**Current catalog:** 50 chart Web Components  
**Primary promise:** fast, small, accessible chart usage through one built browser file.

OgulcanUI is a vanilla Web Component chart library. It is designed for sites and dashboards that need high-performance charts without a framework runtime, build step, or copied source templates.

## Supported Usage

Use OgulcanUI in one of two supported ways:

1. CDN files from npm:

```html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/ogulcan-ui@0.1.0/dist/ogulcan-ui.css">
<script src="https://cdn.jsdelivr.net/npm/ogulcan-ui@0.1.0/dist/ogulcan-ui.js"></script>
```

2. Repository download files:

```text
ogulcan/ogulcan.js
ogulcan/ogulcan.css
```

`ogulcan/ogulcan.js` contains all 50 charts. It can be downloaded from the repository and hosted in any website.

Do not integrate by copying `src/components/*`, `scripts/*`, or generator internals into another project. Those files are source and maintenance tooling. The stable consumer artifact is the built browser file.

## Minimal Example

```html
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <link rel="stylesheet" href="./ogulcan.css">
  <script src="./ogulcan.js"></script>
</head>
<body>
  <ogulcan-market-pulse-line
    label="Market pulse"
    color="#2563eb"
    data="42,48,46,58,63,70,76">
  </ogulcan-market-pulse-line>
</body>
</html>
```

No npm install is required for website usage when using CDN or downloaded files.

## What Each File Does

| File | Audience | Purpose |
|------|----------|---------|
| `ogulcan/ogulcan.js` | Website users | All 50 charts in one browser file |
| `ogulcan/ogulcan.css` | Website users | Optional shared design tokens and theme defaults |
| `dist/ogulcan-ui.js` | npm/CDN users | Same all-chart browser bundle for package publishing |
| `dist/ogulcan-ui.css` | npm/CDN users | CSS shipped with the package |
| `dist/components.json` | Tooling users | Manifest of the 50 chart names |
| `src/components/*` | Contributors | Generated chart source folders |
| `scripts/generate-unique-charts.js` | Contributors | Generator for component source and shared visual engine |
| `scripts/lib/banking-chart-catalog.js` | Contributors | Catalog source of truth |

## Size And Performance

Measured current build:

| Artifact | Raw size | Gzip size |
|----------|----------|-----------|
| `ogulcan/ogulcan.js` | 668.7 KB | 35.3 KB |
| `ogulcan/ogulcan.css` | 12.1 KB | 3.2 KB |

Performance design:

- zero runtime dependencies
- no React, Svelte, Vue, D3, Chart.js, or canvas dependency
- one script request for all charts
- static SVG rendering inside Shadow DOM
- capped series length: 128 points
- capped attribute parsing
- redraw skipped when the chart fingerprint has not changed
- ResizeObserver redraws batched through `requestAnimationFrame`
- hidden accessibility summary added with one small node per chart

Verification:

```bash
bun run verify:load
```

Current result:

```text
Passed: 50
Failed: 0
```

The public demo includes a local benchmark panel. It measures mount and update cost in the visitor's own browser, which is the right way to compare old phones, low-power laptops, Chromium, Safari, Firefox, React apps, Svelte apps, and plain HTML pages.

## Accessibility And WCAG Coverage

Each chart has automated chart accessibility coverage:

- chart host has `role="img"`
- chart host receives a meaningful `aria-label`
- each Shadow DOM includes `.chart-a11y-summary`
- decorative SVG is `aria-hidden="true"`
- browser audit covers all 50 charts
- Playwright structural tests also assert the chart text alternative contract

Verification:

```bash
bun run verify:a11y
```

Current result:

```text
Passed: 50
Failed: 0
```

This is not a full-page WCAG certification. It means the chart components themselves have 100% automated coverage for the chart text-alternative contract. A consuming application must still test page-level color contrast, headings, forms, keyboard order, focus management, language, and navigation.

## Browser And Framework Support

OgulcanUI uses browser-native technologies:

- Custom Elements
- Shadow DOM
- SVG
- CSS custom properties
- `requestAnimationFrame`
- ResizeObserver with safe fallback behavior

It works in plain HTML and can be used inside:

- React
- Svelte
- Vue
- Astro
- Rails
- Laravel
- Django
- static HTML

React and Svelte users should render the custom element tag directly. A wrapper is optional and is not required by OgulcanUI.

## Attribute API

Most charts use `label`, `color`, and `data`:

```html
<ogulcan-revenue-stream-treemap
  label="Revenue"
  color="#0f766e"
  data="32,24,18,14,12">
</ogulcan-revenue-stream-treemap>
```

Gauge and ring charts use `value`, `min`, `max`, `label`, and `color`:

```html
<ogulcan-risk-appetite-gauge
  label="Risk appetite"
  value="68"
  min="0"
  max="100"
  color="#b45309">
</ogulcan-risk-appetite-gauge>
```

KPI spark charts use `title`, `value`, `change`, `trend`, `sparkline`, and `color`:

```html
<ogulcan-uptime-kpi-spark
  title="Uptime"
  value="99.98%"
  change="+0.03%"
  trend="up"
  sparkline="97,98,98,99,100"
  color="#0f766e">
</ogulcan-uptime-kpi-spark>
```

Runtime update:

```js
const chart = document.querySelector("ogulcan-market-pulse-line");
chart.setAttribute("data", "45,49,53,61,66,72");
```

Accepted data formats:

```html
data="10,20,30,40"
data="[10,20,30,40]"
data='[{"value":10},{"value":20}]'
```

## Component Catalog

### Flow Intelligence

| Tag | Component |
|-----|-----------|
| `ogulcan-customer-journey-sankey` | CustomerJourneySankey |
| `ogulcan-revenue-stream-treemap` | RevenueStreamTreemap |
| `ogulcan-channel-mix-donut` | ChannelMixDonut |
| `ogulcan-conversion-path-funnel` | ConversionPathFunnel |
| `ogulcan-supply-chain-gantt` | SupplyChainGantt |
| `ogulcan-dependency-radar` | DependencyRadar |
| `ogulcan-allocation-waterfall` | AllocationWaterfall |
| `ogulcan-segment-bridge-pareto` | SegmentBridgePareto |
| `ogulcan-product-adoption-stack` | ProductAdoptionStack |
| `ogulcan-workflow-step-area` | WorkflowStepArea |

### Signal Exploration

| Tag | Component |
|-----|-----------|
| `ogulcan-demand-forecast-projection` | DemandForecastProjection |
| `ogulcan-anomaly-band-control` | AnomalyBandControl |
| `ogulcan-cohort-retention-heatmap` | CohortRetentionHeatmap |
| `ogulcan-market-pulse-line` | MarketPulseLine |
| `ogulcan-sensor-drift-scatter` | SensorDriftScatter |
| `ogulcan-quality-histogram` | QualityHistogram |
| `ogulcan-scenario-sensitivity-multi-line` | ScenarioSensitivityMultiLine |
| `ogulcan-volatility-boxplot` | VolatilityBoxplot |
| `ogulcan-growth-curve-area` | GrowthCurveArea |
| `ogulcan-threshold-ring` | ThresholdRing |

### Risk And Controls

| Tag | Component |
|-----|-----------|
| `ogulcan-compliance-obligation-matrix` | ComplianceObligationMatrix |
| `ogulcan-incident-severity-pareto` | IncidentSeverityPareto |
| `ogulcan-access-posture-radar` | AccessPostureRadar |
| `ogulcan-risk-appetite-gauge` | RiskAppetiteGauge |
| `ogulcan-audit-finding-waterfall` | AuditFindingWaterfall |
| `ogulcan-control-coverage-bullet` | ControlCoverageBullet |
| `ogulcan-fraud-pattern-scatter` | FraudPatternScatter |
| `ogulcan-policy-exception-heatmap` | PolicyExceptionHeatmap |
| `ogulcan-exposure-limit-bars` | ExposureLimitBars |
| `ogulcan-breach-rate-ring` | BreachRateRing |

### Operating Pulse

| Tag | Component |
|-----|-----------|
| `ogulcan-uptime-kpi-spark` | UptimeKpiSpark |
| `ogulcan-queue-depth-bars` | QueueDepthBars |
| `ogulcan-latency-control-chart` | LatencyControlChart |
| `ogulcan-capacity-stacked-trend` | CapacityStackedTrend |
| `ogulcan-release-train-gantt` | ReleaseTrainGantt |
| `ogulcan-service-health-matrix` | ServiceHealthMatrix |
| `ogulcan-error-budget-line` | ErrorBudgetLine |
| `ogulcan-throughput-histogram` | ThroughputHistogram |
| `ogulcan-workforce-utilization-h-bars` | WorkforceUtilizationHBars |
| `ogulcan-burn-rate-kpi` | BurnRateKpi |

### Decision Surfaces

| Tag | Component |
|-----|-----------|
| `ogulcan-price-elasticity-scatter` | PriceElasticityScatter |
| `ogulcan-portfolio-optimization-radar` | PortfolioOptimizationRadar |
| `ogulcan-budget-tradeoff-waterfall` | BudgetTradeoffWaterfall |
| `ogulcan-prioritization-treemap` | PrioritizationTreemap |
| `ogulcan-strategy-funnel` | StrategyFunnel |
| `ogulcan-forecast-confidence-boxplot` | ForecastConfidenceBoxplot |
| `ogulcan-opportunity-pareto` | OpportunityPareto |
| `ogulcan-investment-mix-donut` | InvestmentMixDonut |
| `ogulcan-plan-vs-actual-bullet` | PlanVsActualBullet |
| `ogulcan-scenario-outcome-projection` | ScenarioOutcomeProjection |

## Local Development

Install:

```bash
bun install
```

Build:

```bash
bun run build
```

Serve demo:

```bash
bun run start
```

Open:

```text
http://localhost:3000/demo.html
```

## Scripts

| Command | Purpose |
|---------|---------|
| `bun run dev` / `bun run start` | Local static server on port 3000 |
| `bun run build` | Build `dist/` and `ogulcan/` browser artifacts |
| `bun run test` | Full quality gate |
| `bun run verify` | Enterprise verification suite |
| `bun run verify:a11y` | Chromium accessibility audit for all charts |
| `bun run verify:load` | Multi-instance browser load benchmark |
| `bun run verify:browser` | Browser mount/update metrics |
| `bun run verify:visual` | Visual regression against PNG baselines |
| `bun run verify:package` | npm/CDN package surface audit |
| `bun run verify:component-gate` | Registry, accessibility, and UI safety rules |
| `bun run verify:playwright-coverage` | Catalog and Playwright spec coverage |
| `bun run test:playwright:structural` | Fast Chromium mount/structure suite |
| `bun run test:playwright:enterprise` | Security, perf, and CDN checks without screenshots |
| `bun run test:playwright` | Full Playwright suite with screenshot baselines |
| `bun run generate-charts` | Regenerate catalog components and visual engine |
| `bun run generate-playwright-specs` | Regenerate Playwright component specs |
| `bun run add-component MyChart` | Scaffold a new component source folder |

## Editing Internals

Most users should not edit internals. They should consume `ogulcan.js` or the CDN.

Contributor workflow:

1. Edit chart metadata in `scripts/lib/banking-chart-catalog.js`.
2. Edit shared structure/accessibility/performance behavior in `scripts/generate-unique-charts.js`.
3. Regenerate components:

```bash
bun run generate-charts
```

4. Build artifacts:

```bash
bun run build
```

5. Verify:

```bash
bun run verify:a11y
bun run verify:load
bun run test:playwright:structural
```

Do not manually edit one generated component folder as a long-term fix. The generator can overwrite those changes.

## Quality Gates

The current quality suite checks:

- component registration
- Shadow DOM structure
- chart accessibility summary
- SVG decorative hiding
- runtime XSS hardening
- forbidden API usage
- burst update performance
- Shadow DOM growth
- multi-instance load
- Playwright catalog coverage
- optional visual snapshots

## Project Layout

```text
ogulcan/                         Downloadable browser files for repository users
dist/                            npm/CDN browser artifacts
src/components/                  50 generated chart source folders
src/lib/chart-visual-engine.js   Shared SVG painters
src/lib/chart-display-names.js   Human-readable chart labels
src/ogulcan-ui.css               Design tokens and global styles
scripts/lib/banking-chart-catalog.js
scripts/generate-unique-charts.js
tests/playwright/                Browser tests and PNG baselines
demo.html                        Public demo catalog and speed panel
verify.html                      Interactive verifier
docs/DOCUMENTATION.md            This guide
```

## License

MIT - see [../LICENSE](../LICENSE).
