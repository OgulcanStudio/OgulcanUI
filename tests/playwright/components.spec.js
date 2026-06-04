/**
 * Template-driven Playwright suite for all OgulcanUI banking chart components.
 * One test per entry in component-specs.json (50). No per-component spec files.
 *
 * Per component: mount → structural → security → burst → shadow stability → forbidden APIs
 * → CDN contract → (optional visual screenshot).
 * Set PLAYWRIGHT_SKIP_ENTERPRISE=1 for structural (+ optional visual) only.
 */

const { test, expect } = require('@playwright/test');

const specs = require('./component-specs.json');
const {
  mountComponent,
  assertComponentWorking,
  assertEnterpriseSecurity,
  assertRealtimeBurst,
  assertRealtimeShadowStability,
  assertNoForbiddenApis,
  assertCdnMountContract,
  captureComponentScreenshot,
  trackPageErrors
} = require('./lib/component-harness');

const filterRaw = process.env.PLAYWRIGHT_COMPONENT || process.env.COMPONENT;
const filterNames = filterRaw
  ? filterRaw.split(/[,;\s]+/).map((s) => s.trim()).filter(Boolean)
  : null;

const activeSpecs = filterNames
  ? specs.filter((s) => filterNames.includes(s.name))
  : specs;

const skipVisual = process.env.PLAYWRIGHT_SKIP_VISUAL === '1';
const skipEnterprise = process.env.PLAYWRIGHT_SKIP_ENTERPRISE === '1';

if (filterNames && activeSpecs.length === 0) {
  throw new Error(
    `No specs matched PLAYWRIGHT_COMPONENT/COMPONENT filter: ${filterNames.join(', ')}`
  );
}

test.describe('OgulcanUI components', () => {
  test.describe.configure({ mode: 'parallel' });

  test('component-specs.json covers all 50 banking charts', () => {
    const { CHARTS_ALLOWLIST } = require('../../scripts/lib/charts-allowlist');
    expect(specs.length).toBe(50);
    expect(CHARTS_ALLOWLIST.length).toBe(50);
    const specSet = new Set(specs.map((s) => s.name));
    for (const name of CHARTS_ALLOWLIST) {
      expect(specSet.has(name)).toBe(true);
    }
  });

  for (const spec of activeSpecs) {
    test(`[${spec.name}] enterprise mount, gates, and appearance`, async ({ page }) => {
      const { assertNoPageErrors } = trackPageErrors(page);

      await mountComponent(page, spec);
      await assertComponentWorking(page, spec);

      if (!skipEnterprise) {
        await assertEnterpriseSecurity(page, spec);
        await assertRealtimeBurst(page, spec);
        await assertRealtimeShadowStability(page, spec);
        await assertNoForbiddenApis(page, spec);
        await assertCdnMountContract(page, spec);
      }

      assertNoPageErrors();

      if (!skipVisual) {
        const stage = captureComponentScreenshot(page, spec);
        await expect(stage).toHaveScreenshot(`${spec.name}.png`, {
          maxDiffPixelRatio: 0.015
        });
      }
    });
  }
});