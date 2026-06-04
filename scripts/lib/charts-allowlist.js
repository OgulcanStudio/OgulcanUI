/**
 * OgulcanUI chart-only allowlist (50 enterprise banking components).
 * Single source of truth for catalog size and verify chart tier.
 */

const { CHARTS_ALLOWLIST, BANKING_CHART_CATALOG } = require('./banking-chart-catalog');

if (new Set(CHARTS_ALLOWLIST).size !== 50) {
  throw new Error(`charts-allowlist must contain exactly 50 entries (got ${new Set(CHARTS_ALLOWLIST).size})`);
}

if (BANKING_CHART_CATALOG.length !== 50) {
  throw new Error(`banking-chart-catalog must contain 50 entries (got ${BANKING_CHART_CATALOG.length})`);
}

module.exports = { CHARTS_ALLOWLIST, BANKING_CHART_CATALOG };