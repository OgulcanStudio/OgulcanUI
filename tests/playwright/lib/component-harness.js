/**
 * Shared Playwright helpers for template-driven OgulcanUI component tests.
 * Enterprise gates mirror scripts/enterprise-*-criteria.js and component-test-suite.js.
 */

const path = require('path');
const entSec = require('../../../scripts/enterprise-security-criteria');
const entPerf = require('../../../scripts/enterprise-performance-criteria');

const VISUAL_BENCH = '/visual-bench.html';

/** @type {WeakMap<import('@playwright/test').Page, object>} */
const burstProbeCache = new WeakMap();

/** Playwright runs real Chromium — use browser perf caps (no 8× mock scale). */
const BURST_SCALE =
  typeof process !== 'undefined' && process.env && process.env.OGULCAN_BROWSER_PERF === '0'
    ? 8
    : 1;

/** @param {string} name PascalCase component folder name */
function toKebabTag(name) {
  const kebab = name.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();
  return `ogulcan-${kebab}`;
}

/**
 * Mirror scripts/lib/component-test-suite.js sampleAttributeValue().
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
 * @returns {string}
 */
function resolveBaseUrl() {
  return (
    process.env.PLAYWRIGHT_BASE_URL ||
    process.env.BASE_URL ||
    'http://127.0.0.1:4173'
  );
}

/**
 * @param {import('@playwright/test').Page} page
 */
async function waitForVisualBenchReady(page) {
  await page.waitForFunction(
    () => window.__OGULCAN_VISUAL_READY__ === true,
    undefined,
    { timeout: 30_000 }
  );
}

/**
 * @param {import('@playwright/test').Page} page
 * @param {{ name: string, width: number, height: number }} spec
 */
async function mountComponent(page, spec) {
  burstProbeCache.delete(page);

  const baseUrl = resolveBaseUrl();
  const benchUrl = new URL(VISUAL_BENCH, baseUrl).href;

  await page.goto(benchUrl, { waitUntil: 'domcontentloaded' });
  await waitForVisualBenchReady(page);

  const viewportPad = 48;
  await page.setViewportSize({
    width: spec.width + viewportPad,
    height: spec.height + viewportPad
  });

  await page.evaluate((renderSpec) => window.renderOgulcanVisualFor(renderSpec), {
    name: spec.name,
    width: spec.width,
    height: spec.height
  });

  await page.waitForSelector('#stage', { state: 'visible', timeout: 15_000 });
  await page.waitForSelector(`#mount ${spec.tag}`, { state: 'attached', timeout: 15_000 });
}

/**
 * @param {import('@playwright/test').Page} page
 * @param {{ tag: string, kpi?: boolean }} spec
 */
async function assertComponentWorking(page, spec) {
  const result = await page.evaluate(({ tag, kpi }) => {
    const errors = [];

    if (typeof customElements === 'undefined' || !customElements.get(tag)) {
      errors.push(`customElements.get('${tag}') is not registered`);
    }

    const host = document.querySelector(`#mount ${tag}`);
    if (!host) {
      errors.push(`Host element ${tag} not found under #mount`);
      return { ok: false, errors };
    }

    const root = host.shadowRoot;
    if (!root) {
      errors.push('shadowRoot is missing');
      return { ok: false, errors };
    }

    const shell = root.querySelector('.chart-card, .chart-body');
    if (!shell) {
      errors.push('Expected .chart-card or .chart-body in shadow DOM');
    }

    const hostRole = host.getAttribute('role');
    const hostLabel = (host.getAttribute('aria-label') || '').trim();
    const summary = root.querySelector('.chart-a11y-summary');
    const summaryText = (summary?.textContent || '').trim();

    if (hostRole !== 'img') {
      errors.push('Expected chart host to expose role="img"');
    }
    if (hostLabel.length < 16) {
      errors.push('Expected chart host to expose a meaningful aria-label summary');
    }
    if (!summary || summaryText.length < 16) {
      errors.push('Expected .chart-a11y-summary text alternative in shadow DOM');
    }

    const svg = root.querySelector('svg');
    const svgChildCount = svg ? svg.childElementCount : 0;
    const kpiValue = root.querySelector('.kpi-value');
    const kpiText = (kpiValue?.textContent || '').trim();

    if (kpi) {
      if (!kpiText) errors.push('.kpi-value is empty for KPI component');
    } else if (svgChildCount < 1) {
      errors.push(`Expected svg with childElementCount >= 1 (got ${svgChildCount})`);
    }

    return {
      ok: errors.length === 0,
      errors,
      svgChildCount,
      kpiText
    };
  }, { tag: spec.tag, kpi: Boolean(spec.kpi) });

  if (!result.ok) {
    throw new Error(result.errors.join('; '));
  }
}

/**
 * Runtime XSS injection — mirrors enterprise-security-criteria auditRuntimeXss().
 * @param {import('@playwright/test').Page} page
 * @param {{ tag: string, attrs?: string[] }} spec
 */
async function assertEnterpriseSecurity(page, spec) {
  const attrs =
    Array.isArray(spec.attrs) && spec.attrs.length > 0
      ? spec.attrs
      : await page.evaluate(({ tag }) => {
          const Cls = customElements.get(tag);
          return Cls && Cls.observedAttributes ? [...Cls.observedAttributes] : [];
        }, { tag: spec.tag });

  if (attrs.length === 0) return;

  const result = await page.evaluate(
    ({ tag, attrs, xssPayloads, structuredPayload }) => {
      const issues = [];
      const host = document.querySelector(`#mount ${tag}`);
      if (!host) {
        return { ok: false, issues: [`Host ${tag} not found for security audit`] };
      }

      function stripAttributeValues(html) {
        return html.replace(/"[^"]*"|'[^']*'/g, '""');
      }

      function buildStructuredPayloads(attr) {
        switch (attr) {
          case 'rows':
            return [JSON.stringify([[structuredPayload]])];
          case 'headers':
            return [`Region,Status,${structuredPayload}`];
          case 'events':
            return [JSON.stringify([{ time: 'now', text: structuredPayload, status: 'danger' }])];
          case 'avatars':
            return [JSON.stringify([{ name: structuredPayload, initials: 'XX' }])];
          case 'features':
          case 'tags':
          case 'items':
          case 'logs':
          case 'steps':
            return [JSON.stringify([structuredPayload])];
          default:
            return [];
        }
      }

      for (const attr of attrs) {
        const payloads = [...xssPayloads, ...buildStructuredPayloads(attr)];
        for (const payload of payloads) {
          try {
            host.setAttribute(attr, payload);
          } catch {
            continue;
          }
          const root = host.shadowRoot;
          const html = root ? root.innerHTML || '' : '';
          if (!html) continue;

          const lower = html.toLowerCase();
          const strippedTagAttrs = stripAttributeValues(html);
          const rawPayloadInDom = typeof payload === 'string' && html.includes(payload);

          if (rawPayloadInDom && lower.includes('<script')) {
            issues.push(
              `Attribute "${attr}" reflected raw <script> in shadow DOM (payload not entity-escaped).`
            );
            break;
          }

          if (/<[a-z][^>]*\s+on(?:error|load|click)\s*=/i.test(strippedTagAttrs)) {
            issues.push(
              `Attribute "${attr}" reflected an active inline event handler in shadow DOM.`
            );
            break;
          }

          if (/(?:href|src|xlink:href)\s*=\s*["']?\s*javascript:/i.test(html)) {
            issues.push(
              `Attribute "${attr}" bound javascript: into href/src (must be blocked or sanitized).`
            );
            break;
          }

          if (/<foreignobject/i.test(lower)) {
            issues.push(`Attribute "${attr}" reflected SVG foreignObject in shadow DOM.`);
            break;
          }

          if (/data:text\/html/i.test(html)) {
            issues.push(`Attribute "${attr}" bound data:text/html URL in shadow DOM.`);
            break;
          }
        }
        if (issues.length > 0) break;
      }

      return { ok: issues.length === 0, issues };
    },
    {
      tag: spec.tag,
      attrs,
      xssPayloads: entSec.XSS_PAYLOADS,
      structuredPayload: '<img src=x onerror=alert(1)>'
    }
  );

  if (!result.ok) {
    throw new Error(`Enterprise security: ${result.issues.join('; ')}`);
  }
}

/**
 * @param {import('@playwright/test').Page} page
 * @param {{ tag: string, attrs?: string[], name?: string }} spec
 */
async function runRealtimeBurstProbe(page, spec) {
  const cached = burstProbeCache.get(page);
  if (cached) return cached;

  const attrs =
    Array.isArray(spec.attrs) && spec.attrs.length > 0
      ? spec.attrs
      : await page.evaluate(({ tag }) => {
          const Cls = customElements.get(tag);
          return Cls && Cls.observedAttributes ? [...Cls.observedAttributes] : [];
        }, { tag: spec.tag });

  const probe = await page.evaluate(
    ({ tag, attrs, ticks, samples }) => {
      const host = document.querySelector(`#mount ${tag}`);
      if (!host) {
        return { ok: false, error: `Host ${tag} not found for burst probe` };
      }

      const perfAttr =
        attrs.find((a) => a === 'data' || a.endsWith('-data')) || attrs[0] || null;
      if (!perfAttr) {
        return { ok: true, tickMs: [], preBytes: 0, postBytes: 0, skipped: true };
      }

      const root = host.shadowRoot;
      const preBytes = root ? (root.innerHTML || '').length : 0;
      const tickMs = [];

      for (let i = 0; i < ticks; i++) {
        const t0 = performance.now();
        const payload =
          perfAttr === 'data' || perfAttr.endsWith('-data')
            ? JSON.stringify([i, i + 1, i + 2])
            : `tick-${i}`;
        host.setAttribute(perfAttr, payload);
        tickMs.push(performance.now() - t0);
      }

      const postBytes = root ? (root.innerHTML || '').length : 0;
      return { ok: true, tickMs, preBytes, postBytes, perfAttr, skipped: false };
    },
    {
      tag: spec.tag,
      attrs,
      ticks: entPerf.BURST.ticks,
      samples: null
    }
  );

  if (!probe.ok) {
    throw new Error(probe.error || 'Burst probe failed');
  }

  burstProbeCache.set(page, probe);
  return probe;
}

/**
 * 120-tick attribute burst; fails if avg > cap or p99 > cap (BURST from enterprise-performance-criteria).
 * @param {import('@playwright/test').Page} page
 * @param {{ tag: string, attrs?: string[], name?: string }} spec
 */
async function assertRealtimeBurst(page, spec) {
  const probe = await runRealtimeBurstProbe(page, spec);
  if (probe.skipped) return;

  const avgCap = entPerf.BURST.avgFailMs * BURST_SCALE;
  const p99Cap = entPerf.BURST.p99FailMs * BURST_SCALE;

  const sum = probe.tickMs.reduce((a, b) => a + b, 0);
  const avg = sum / probe.tickMs.length;
  const sorted = [...probe.tickMs].sort((a, b) => a - b);
  const p99 = sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * 0.99))];

  const errors = [];
  if (avg > avgCap) {
    errors.push(
      `${entPerf.BURST.ticks} updates averaged ${avg.toFixed(3)} ms (cap ${avgCap} ms)`
    );
  }
  if (p99 > p99Cap) {
    errors.push(`p99 tick ${p99.toFixed(2)} ms exceeds ${p99Cap} ms spike cap`);
  }

  if (errors.length > 0) {
    throw new Error(`Realtime burst: ${errors.join('; ')}`);
  }
}

/**
 * Shadow HTML growth after burst must stay within REALTIME_SHADOW cap.
 * @param {import('@playwright/test').Page} page
 * @param {{ tag: string, attrs?: string[], name: string }} spec
 */
async function assertRealtimeShadowStability(page, spec) {
  const probe = await runRealtimeBurstProbe(page, spec);
  if (probe.skipped) return;

  const audit = entPerf.auditRealtimeShadowStability(
    probe.preBytes,
    probe.postBytes,
    spec.name
  );

  if (audit.issues.length > 0) {
    throw new Error(
      `Shadow stability: ${audit.issues.map((i) => i.desc || i.name).join('; ')}`
    );
  }
}

/**
 * Runtime shadow hygiene — no foreignObject / script sinks; tooltips use text, not HTML APIs.
 * @param {import('@playwright/test').Page} page
 * @param {{ tag: string }} spec
 */
async function assertNoForbiddenApis(page, spec) {
  const result = await page.evaluate(({ tag }) => {
    const errors = [];
    const host = document.querySelector(`#mount ${tag}`);
    if (!host?.shadowRoot) {
      return { ok: false, errors: ['shadowRoot missing for forbidden API audit'] };
    }

    const html = host.shadowRoot.innerHTML || '';
    const lower = html.toLowerCase();

    if (/<script/i.test(lower)) {
      errors.push('<script> found in shadow DOM');
    }
    if (/<foreignobject/i.test(lower)) {
      errors.push('SVG foreignObject found in shadow DOM');
    }
    if (/javascript:/i.test(html)) {
      errors.push('javascript: URL found in shadow DOM');
    }
    if (/<iframe/i.test(lower)) {
      errors.push('<iframe> found in shadow DOM');
    }
    if (/\bon[a-z]+\s*=/i.test(html.replace(/"[^"]*"|'[^']*'/g, '""'))) {
      errors.push('inline on* event handler found in shadow DOM markup');
    }

    const tooltip = host.shadowRoot.querySelector('.tooltip-card');
    if (tooltip) {
      if (tooltip.querySelector('script, iframe, foreignObject')) {
        errors.push('tooltip-card contains forbidden embedded content');
      }
      if (/<img[^>]+onerror/i.test(tooltip.innerHTML)) {
        errors.push('tooltip-card uses HTML injection instead of textContent');
      }
      const hasUnsafeInner =
        tooltip.children.length > 0 &&
        [...tooltip.querySelectorAll('*')].some((node) => {
          const tagName = node.tagName && node.tagName.toLowerCase();
          return tagName === 'script' || tagName === 'iframe';
        });
      if (hasUnsafeInner) {
        errors.push('tooltip-card subtree contains script/iframe nodes');
      }
    }

    return { ok: errors.length === 0, errors };
  }, { tag: spec.tag });

  if (!result.ok) {
    throw new Error(`Forbidden APIs (shadow): ${result.errors.join('; ')}`);
  }
}

/**
 * CDN one-line contract: registered custom element, attribute-only cold mount, no light DOM children.
 * @param {import('@playwright/test').Page} page
 * @param {{ tag: string, attrs?: string[] }} spec
 */
async function assertCdnMountContract(page, spec) {
  const attrs =
    Array.isArray(spec.attrs) && spec.attrs.length > 0
      ? spec.attrs
      : await page.evaluate(({ tag }) => {
          const Cls = customElements.get(tag);
          return Cls && Cls.observedAttributes ? [...Cls.observedAttributes] : [];
        }, { tag: spec.tag });

  const result = await page.evaluate(
    ({ tag, attrs, samples }) => {
      const errors = [];

      if (!customElements.get(tag)) {
        errors.push(`customElements.get('${tag}') is not registered`);
        return { ok: false, errors };
      }

      const benchHost = document.querySelector(`#mount ${tag}`);
      if (benchHost && benchHost.childElementCount > 0) {
        errors.push('Visual bench host must not require light-DOM element children');
      }

      const cold = document.createElement(tag);
      attrs.forEach((attr) => {
        try {
          cold.setAttribute(attr, samples[attr] ?? 'live-value');
        } catch (err) {
          errors.push(`setAttribute("${attr}") threw: ${err.message || String(err)}`);
        }
      });

      const holder = document.createElement('div');
      holder.id = 'ogulcan-cdn-cold-mount';
      holder.style.cssText = 'position:absolute;left:-9999px;width:1px;height:1px;overflow:hidden;';
      document.body.appendChild(holder);
      holder.appendChild(cold);

      if (cold.childElementCount > 0) {
        errors.push('Cold mount must not require light-DOM child elements');
      }

      const shadowLen = cold.shadowRoot ? (cold.shadowRoot.innerHTML || '').length : 0;
      if (!cold.shadowRoot || shadowLen < 24) {
        errors.push(
          'Shadow DOM must render from attributes alone (no required light-DOM children)'
        );
      }

      document.body.removeChild(holder);
      return { ok: errors.length === 0, errors };
    },
    {
      tag: spec.tag,
      attrs,
      samples: Object.fromEntries(attrs.map((a) => [a, sampleAttributeValue(a)]))
    }
  );

  if (!result.ok) {
    throw new Error(`CDN mount contract: ${result.errors.join('; ')}`);
  }
}

/**
 * @param {import('@playwright/test').Page} page
 * @param {{ name: string }} _spec
 * @returns {import('@playwright/test').Locator}
 */
function captureComponentScreenshot(page, _spec) {
  return page.locator('#stage');
}

/**
 * Install pageerror listener; call assertNoPageErrors() after actions.
 * @param {import('@playwright/test').Page} page
 */
function trackPageErrors(page) {
  const errors = [];
  page.on('pageerror', (err) => {
    errors.push(err.message || String(err));
  });
  return {
    errors,
    assertNoPageErrors() {
      if (errors.length > 0) {
        throw new Error(`Uncaught page errors: ${errors.join(' | ')}`);
      }
    }
  };
}

module.exports = {
  VISUAL_BENCH,
  toKebabTag,
  sampleAttributeValue,
  resolveBaseUrl,
  mountComponent,
  assertComponentWorking,
  assertEnterpriseSecurity,
  assertRealtimeBurst,
  assertRealtimeShadowStability,
  assertNoForbiddenApis,
  assertCdnMountContract,
  captureComponentScreenshot,
  trackPageErrors,
  runRealtimeBurstProbe
};
