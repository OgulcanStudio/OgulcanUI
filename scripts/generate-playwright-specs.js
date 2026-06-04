/**
 * Generates tests/playwright/component-specs.json from BANKING_CHART_CATALOG (50 entries).
 * Run: node scripts/generate-playwright-specs.js
 */

const fs = require('fs');
const path = require('path');

const { BANKING_CHART_CATALOG } = require('./lib/banking-chart-catalog');
const { toKebabTag } = require('./component-contract');

const rootDir = path.join(__dirname, '..');
const outPath = path.join(rootDir, 'tests', 'playwright', 'component-specs.json');

const CHART_SIZE = { width: 820, height: 420 };
const KPI_SIZE = { width: 520, height: 280 };
const GAUGE_SIZE = { width: 520, height: 420 };

/**
 * @param {import('./lib/banking-chart-catalog.types').BankingChartEntry} entry
 */
function resolveDimensions(entry) {
  if (entry.kpi) return KPI_SIZE;
  const isGauge =
    entry.visualVariant === 'gauge' ||
    entry.visualVariant === 'ring' ||
    (Array.isArray(entry.attrs) &&
      entry.attrs.includes('value') &&
      entry.attrs.includes('min') &&
      !entry.kpi);
  if (isGauge) return GAUGE_SIZE;
  return CHART_SIZE;
}

/**
 * @param {import('./lib/banking-chart-catalog.types').BankingChartEntry} entry
 */
function toPlaywrightSpec(entry) {
  const { width, height } = resolveDimensions(entry);
  /** @type {{ name: string, tag: string, width: number, height: number, attrs: string[], kpi?: boolean }} */
  const spec = {
    name: entry.name,
    tag: toKebabTag(entry.name),
    width,
    height,
    attrs: entry.attrs
  };
  if (entry.kpi) spec.kpi = true;
  return spec;
}

function main() {
  if (BANKING_CHART_CATALOG.length !== 50) {
    throw new Error(
      `BANKING_CHART_CATALOG must contain 50 entries (got ${BANKING_CHART_CATALOG.length})`
    );
  }

  const specs = BANKING_CHART_CATALOG.map(toPlaywrightSpec);

  const names = new Set(specs.map((s) => s.name));
  if (names.size !== 50) {
    throw new Error(`Duplicate component names in generated specs (${names.size} unique)`);
  }

  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(specs, null, 2) + '\n', 'utf8');

  const kpiCount = specs.filter((s) => s.kpi).length;
  const gaugeCount = specs.filter(
    (s) => !s.kpi && s.width === GAUGE_SIZE.width && s.height === GAUGE_SIZE.height
  ).length;
  const chartCount = specs.length - kpiCount - gaugeCount;

  console.log(`Wrote ${specs.length} Playwright component specs → ${outPath}`);
  console.log(`  charts: ${chartCount}, kpi: ${kpiCount}, gauge: ${gaugeCount}`);
}

main();