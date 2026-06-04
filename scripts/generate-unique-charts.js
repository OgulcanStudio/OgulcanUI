/**
 * Regenerates all 50 OgulcanUI charts with unique visuals + one-line attribute API.
 * Usage: bun scripts/generate-unique-charts.js
 */
const fs = require('fs');
const path = require('path');
const { CHARTS_ALLOWLIST } = require('./lib/charts-allowlist');
const { CHART_SPECS_FROM_CATALOG } = require('./lib/banking-chart-catalog');

const root = path.join(__dirname, '..');
const componentsDir = path.join(root, 'src', 'components');
const libDir = path.join(root, 'src', 'lib');

/** @type {Record<string, { attrs: string[], kind: string, kpi?: boolean }>} */
const CHART_SPECS = CHART_SPECS_FROM_CATALOG;

for (const name of CHARTS_ALLOWLIST) {
  if (!CHART_SPECS[name]) throw new Error(`Missing CHART_SPECS for ${name}`);
}

const SHARED_HTML = `<div class="chart-card">
  <div class="chart-header">
    <div class="chart-title"></div>
    <span class="chart-badge"></span>
  </div>
  <div class="chart-body">
    <svg class="chart-svg" aria-hidden="true" focusable="false"></svg>
    <div class="tooltip-card"></div>
  </div>
  <div class="chart-a11y-summary"></div>
</div>
`;

const KPI_HTML = `<div class="chart-card kpi-card">
  <div class="chart-header">
    <div class="chart-title"></div>
    <span class="chart-badge"></span>
  </div>
  <div class="kpi-body">
    <div class="kpi-value"></div>
    <div class="kpi-change"></div>
    <svg class="chart-svg kpi-spark" aria-hidden="true" focusable="false"></svg>
  </div>
  <div class="chart-a11y-summary"></div>
</div>
`;

const SHARED_CSS = `:host {
  display: block;
  width: 100%;
  height: 280px;
  min-height: 180px;
  font-family: var(--font-sans, system-ui, sans-serif);
  box-sizing: border-box;
  contain: layout style;
}
.chart-card {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  background: var(--bg-card, #ffffff);
  border: 1px solid var(--border-color, #e2e8f0);
  border-radius: var(--radius-lg, 8px);
  padding: 12px 14px;
  box-sizing: border-box;
  position: relative;
  box-shadow: 0 1px 3px rgba(15, 23, 42, 0.06);
  overflow: hidden;
}
.chart-header { margin-bottom: 8px; flex-shrink: 0; border-bottom: 1px solid var(--border-color, #e2e8f0); padding-bottom: 6px; }
.chart-title {
  font-size: var(--font-size-sm, 0.875rem);
  font-weight: var(--font-weight-semibold, 600);
  color: var(--text-primary, #0f172a);
  letter-spacing: 0;
}
.chart-badge {
  display: block;
  font-size: 10px;
  color: var(--text-muted, #64748b);
  margin-top: 2px;
}
.chart-body { position: relative; flex: 1; min-height: 0; contain: layout style; }
.chart-svg { width: 100%; height: 100%; display: block; contain: strict; }
.chart-a11y-summary {
  position: absolute;
  width: 1px;
  height: 1px;
  margin: -1px;
  padding: 0;
  border: 0;
  overflow: hidden;
  clip: rect(0 0 0 0);
  white-space: nowrap;
}
.tooltip-card {
  position: absolute;
  background: var(--bg-card, #ffffff);
  border: 1px solid var(--border-color, #e2e8f0);
  border-radius: var(--radius-md, 6px);
  padding: 6px 10px;
  pointer-events: none;
  opacity: 0;
  z-index: 10;
  transition: opacity var(--transition-fast, 90ms);
  font-size: 11px;
  color: var(--text-primary, #0f172a);
  box-shadow: 0 4px 12px rgba(15, 23, 42, 0.08);
}
.tooltip-card.visible { opacity: 1; }
.kpi-body { flex: 1; display: grid; grid-template-rows: auto auto 1fr; gap: 4px; min-height: 0; }
.kpi-value { font-size: 1.625rem; font-weight: 700; color: var(--text-primary, #0f172a); line-height: 1.2; }
.kpi-change { font-size: 0.75rem; font-weight: 600; }
.kpi-spark { height: 52px; margin-top: 4px; }
.chart-dot {
  cursor: pointer;
  transition: r 100ms;
  stroke: var(--bg-card, #ffffff);
  stroke-width: 1.5px;
}
.grid-line {
  stroke: var(--border-color, rgba(148,163,184,0.1));
  stroke-width: 1px;
  stroke-dasharray: 2 3;
}
.grid-text {
  fill: var(--text-muted, #64748b);
  font-size: 8px;
  text-anchor: end;
  font-weight: 500;
}
.axis-line {
  stroke: var(--border-color-hover, rgba(148,163,184,0.25));
  stroke-width: 1px;
}
.chart-svg-title {
  fill: var(--text-primary, #0f172a);
  font-size: 9px;
  font-weight: 600;
  letter-spacing: 0.05em;
}
`;

function attrToProp(attr) {
  return attr.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
}

const JSON_ATTRS = new Set(['data', 'sparkline', 'events', 'values', 'bars']);

function generateComponentJs(name, spec) {
  const className = `Ogulcan${name}`;
  const tag = `ogulcan-${name.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase()}`;
  const attrs = spec.attrs;
  const cases = attrs
    .map((a) => {
      const prop = attrToProp(a);
      if (JSON_ATTRS.has(a)) {
        return `      case '${a}':
        this._${prop} = ${className}.parseSeriesAttr(newValue);
        this._paintSig = '';
        break;`;
      }
      return `      case '${a}':
        this._${prop} = ${className}.sanitizeAttr(newValue);
        this._paintSig = '';
        break;`;
    })
    .join('\n');

  const getters = attrs
    .map((a) => {
      const prop = attrToProp(a);
      return `  get ${prop}() { return this._${prop}; }
  set ${prop}(v) {
    const s = v == null ? '' : (typeof v === 'object' ? JSON.stringify(v) : String(v));
    this._${prop} = typeof v === 'object' ? v : s;
    this.setAttribute('${a}', s);
  }`;
    })
    .join('\n');

  const upgrades = attrs.map((a) => `    this.upgradeProperty('${attrToProp(a)}');`).join('\n');
  const initFields = attrs
    .map((a) => {
      const prop = attrToProp(a);
      const def =
        a === 'data' || a === 'sparkline' || a === 'events' || a === 'values' || a === 'bars'
          ? '[]'
          : "''";
      return `    this._${prop} = ${def};`;
    })
    .join('\n');

  return `/**
 * OgulcanUI ${name} — one-line enterprise chart (attributes only).
 */
export class ${className} extends HTMLElement {
  static MAX_JSON_ATTR = 65536;
  static MAX_SERIES = 128;

  static sanitizeAttr(s, max = 512) {
    const t = String(s ?? '').slice(0, max);
    if (/[<>'"]|javascript:|on\\w+\\s*=|data:text\\/html/i.test(t)) return '';
    return t.replace(/[\\x00-\\x08\\x0B\\x0C\\x0E-\\x1F\\x7F]/g, '');
  }

  static parseSeriesAttr(raw) {
    if (!raw || String(raw).length > ${className}.MAX_JSON_ATTR) return [];
    try {
      const j = JSON.parse(raw);
      if (!Array.isArray(j)) return [];
      const nums = j.map((p) => (typeof p === 'number' ? p : Number(p && (p.value ?? p.y)))).filter((n) => Number.isFinite(n));
      return nums.length > ${className}.MAX_SERIES ? nums.slice(0, ${className}.MAX_SERIES) : nums;
    } catch {
      if (typeof raw === 'string' && raw.includes(',')) {
        const nums = raw.split(',').map((v) => Number(v.trim())).filter((n) => Number.isFinite(n));
        return nums.length > ${className}.MAX_SERIES ? nums.slice(0, ${className}.MAX_SERIES) : nums;
      }
      return [];
    }
  }

  static get observedAttributes() {
    return ${JSON.stringify(attrs)};
  }

  constructor() {
    super();
${initFields}
    this._structureReady = false;
    this.resizeObserver = null;
    this._resizeFrame = 0;
    this._lastSize = '';
    this._paintSig = '';
    this.attachShadow({ mode: 'open' });
  }

  connectedCallback() {
    this.renderStructure();
${upgrades}
    this.setupResizeObserver();
    this.draw();
  }

  disconnectedCallback() {
    if (this._resizeFrame) {
      cancelAnimationFrame(this._resizeFrame);
      this._resizeFrame = 0;
    }
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
      this.resizeObserver = null;
    }
  }

  upgradeProperty(prop) {
    if (Object.prototype.hasOwnProperty.call(this, prop)) {
      const value = this[prop];
      delete this[prop];
      this[prop] = value;
    }
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue === newValue) return;
    switch (name) {
${cases}
    }
    if (this.isConnected) this.draw();
  }

${getters}

  renderStructure() {
    if (this._structureReady) return;
    this.shadowRoot.innerHTML = \`
      <style>
        /* [style.css] */
      </style>
      <!-- [template.html] -->
    \`;
    this.container = this.shadowRoot.querySelector('.chart-card');
    this.svg = this.shadowRoot.querySelector('.chart-svg');
    this.tooltip = this.shadowRoot.querySelector('.tooltip-card');
    this.a11ySummary = this.shadowRoot.querySelector('.chart-a11y-summary');
    this.setAttribute('role', 'img');
    this._structureReady = true;
  }

  setupResizeObserver() {
    if (typeof ResizeObserver === 'undefined' || !this.svg) return;
    this.resizeObserver = new ResizeObserver(() => {
      const rect = this.svg.getBoundingClientRect();
      const next = \`\${Math.round(rect.width)}x\${Math.round(rect.height)}\`;
      if (next === this._lastSize) return;
      this._lastSize = next;
      this._paintSig = '';
      if (this._resizeFrame) cancelAnimationFrame(this._resizeFrame);
      this._resizeFrame = requestAnimationFrame(() => {
        this._resizeFrame = 0;
        this.draw();
      });
    });
    this.resizeObserver.observe(this.svg);
  }

  _paintSigFor(ctx) {
    const r = this.svg && this.svg.getBoundingClientRect();
    return [
      Math.round(r && r.width || 0),
      Math.round(r && r.height || 0),
      ctx.data,
      ctx.sparkline,
      ctx.label,
      ctx.color,
      ctx.value,
      ctx.change,
      ctx.trend
    ].join('|');
  }

  chartA11ySummary(ctx) {
    const label = ctx.label || ctx.title || '${name.replace(/([a-z0-9])([A-Z])/g, '$1 $2')}';
    const values = Array.isArray(ctx._parsedData) && ctx._parsedData.length
      ? ctx._parsedData
      : (Array.isArray(ctx._parsedSpark) && ctx._parsedSpark.length ? ctx._parsedSpark : []);
    if (values.length) {
      let min = Infinity;
      let max = -Infinity;
      let sum = 0;
      for (let i = 0; i < values.length; i++) {
        const n = Number(values[i]);
        if (!Number.isFinite(n)) continue;
        if (n < min) min = n;
        if (n > max) max = n;
        sum += n;
      }
      const avg = values.length ? Math.round((sum / values.length) * 10) / 10 : 0;
      return \`\${label} chart. \${values.length} data points. Minimum \${min}, maximum \${max}, average \${avg}.\`;
    }
    const value = ctx.value ? \` Current value \${ctx.value}.\` : '';
    const change = ctx.change ? \` Change \${ctx.change}.\` : '';
    return \`\${label} chart.\${value}\${change}\`;
  }

  collectPaintContext() {
    const el = this;
    const ctx = { component: '${name}', svg: this.svg, tooltip: this.tooltip, shadowRoot: this.shadowRoot };
    ctx.label = ${className}.sanitizeAttr(el.getAttribute('label') || el.getAttribute('title') || '');
    ctx.color = ${className}.sanitizeAttr(el.getAttribute('color') || el.getAttribute('theme-color') || '', 64);
    ctx._parsedData = Array.isArray(this._data) && this._data.length ? this._data : null;
    ctx._parsedSpark = Array.isArray(this._sparkline) && this._sparkline.length ? this._sparkline : null;
    ctx.data = ctx._parsedData ? JSON.stringify(ctx._parsedData) : el.getAttribute('data');
    ctx.value = ${className}.sanitizeAttr(el.getAttribute('value'), 64);
    ctx.title = ${className}.sanitizeAttr(el.getAttribute('title'));
    ctx.change = ${className}.sanitizeAttr(el.getAttribute('change'), 128);
    ctx.trend = ${className}.sanitizeAttr(el.getAttribute('trend'), 32);
    ctx.sparkline = ctx._parsedSpark ? JSON.stringify(ctx._parsedSpark) : el.getAttribute('sparkline');
    ctx.events = el.getAttribute('events');
    ctx.status = el.getAttribute('status');
    ctx.source = el.getAttribute('source');
    ctx.target = el.getAttribute('target');
    ctx.flow = el.getAttribute('flow');
    ctx.min = el.getAttribute('min');
    ctx.max = el.getAttribute('max');
    ctx.q1 = el.getAttribute('q1');
    ctx.median = el.getAttribute('median');
    ctx.q3 = el.getAttribute('q3');
    ctx.threshold = el.getAttribute('threshold');
    ctx.used = el.getAttribute('used');
    ctx.total = el.getAttribute('total');
    ctx.values = el.getAttribute('values');
    ctx.labels = el.getAttribute('labels');
    ctx.colors = el.getAttribute('colors');
    ctx.bars = el.getAttribute('bars');
    ctx.ranges = el.getAttribute('ranges');
    ctx.targetAttr = el.getAttribute('target');
    const titleEl = this.shadowRoot.querySelector('.chart-title');
    if (titleEl) titleEl.textContent = ctx.label || ctx.title || '';
    const summary = this.chartA11ySummary(ctx);
    if (this.a11ySummary) this.a11ySummary.textContent = summary;
    this.setAttribute('aria-label', summary);
    return ctx;
  }

  draw() {
    if (!this.svg) return;
    const engine = typeof OgulcanChartSamples !== 'undefined' ? OgulcanChartSamples : null;
    if (!engine || !engine.paint) return;
    const ctx = this.collectPaintContext();
    const sig = this._paintSigFor(ctx);
    if (sig === this._paintSig) return;
    this._paintSig = sig;
    engine.paint(ctx);
  }
}

customElements.define('${tag}', ${className});
`;
}

// Write visual engine (generated painters module is appended from painters-source.js)
const paintersSourcePath = path.join(__dirname, 'chart-painters-source.js');
if (!fs.existsSync(paintersSourcePath)) {
  console.error('Missing scripts/chart-painters-source.js — run after creating painter source.');
  process.exit(1);
}

const paintersSource = fs.readFileSync(paintersSourcePath, 'utf8');

const enginePrelude = require('./lib/chart-visual-engine-prelude');
const engineHeader = enginePrelude.replace(
  'runtime core (perf + security)',
  `50 painters · generated ${new Date().toISOString()}`
);

const engineFooter = `
  const KIND_MAP = ${JSON.stringify(Object.fromEntries(Object.entries(CHART_SPECS).map(([k, v]) => [k, v.kind])), null, 2)};

  function paint(ctx) {
    if (ctx.svg) {
      ctx.svg.setAttribute('aria-hidden', 'true');
      ctx.svg.setAttribute('focusable', 'false');
    }
    const kind = KIND_MAP[ctx.component];
    const fn = kind && PAINTERS[kind];
    if (fn) return fn(ctx);
    if (PAINTERS.barsFallback) PAINTERS.barsFallback(ctx); else if (PAINTERS.arpuCurve) PAINTERS.arpuCurve(ctx);
  }

  ROOT.OgulcanChartSamples = {
    paint,
    DEFAULTS: {},
    PALETTE,
    escapeHtml,
    demoSeries: (id, n) => seriesFrom({ component: id }, n),
    demoLabels: (n) => Array.from({ length: n }, (_, i) => 'T' + (i + 1))
  };
})(typeof globalThis !== 'undefined' ? globalThis : window);
`;

// Fix CHART_SPECS reference in footer - it's only in node script, embed kind map at generation time
const kindMap = Object.fromEntries(Object.entries(CHART_SPECS).map(([k, v]) => [k, v.kind]));

const engineFooterFixed = `
  const KIND_MAP = ${JSON.stringify(kindMap)};

  function paint(ctx) {
    hardenPaintContext(ctx);
    if (ctx.svg) {
      ctx.svg.setAttribute('aria-hidden', 'true');
      ctx.svg.setAttribute('focusable', 'false');
    }
    const kind = KIND_MAP[ctx.component];
    const fn = kind && PAINTERS[kind];
    if (fn) return fn(ctx);
    if (PAINTERS.barsFallback) PAINTERS.barsFallback(ctx); else if (PAINTERS.arpuCurve) PAINTERS.arpuCurve(ctx);
  }

  ROOT.OgulcanChartSamples = {
    paint,
    DEFAULTS: {},
    PALETTE,
    escapeHtml,
    sanitizeText,
    sanitizeColor,
    demoSeries: (id, n) => seriesFrom({ component: id }, n),
    demoLabels: (n) => Array.from({ length: n }, (_, i) => 'T' + (i + 1))
  };
})(typeof globalThis !== 'undefined' ? globalThis : window);
`;

const paintersMatch = paintersSource.match(/module\.exports\s*=\s*`([\s\S]*)`;\s*$/);
if (!paintersMatch) {
  console.error('chart-painters-source.js must export a template string: module.exports = `...`;');
  process.exit(1);
}
const engineBody = paintersMatch[1];

fs.writeFileSync(
  path.join(libDir, 'chart-visual-engine.js'),
  engineHeader + engineBody + engineFooterFixed,
  'utf8'
);

// Regenerate each component folder
for (const name of CHARTS_ALLOWLIST) {
  const spec = CHART_SPECS[name];
  const dir = path.join(componentsDir, name);
  fs.mkdirSync(dir, { recursive: true });
  const isKpi = spec.kpi === true;
  fs.writeFileSync(path.join(dir, 'index.html'), isKpi ? KPI_HTML : SHARED_HTML, 'utf8');
  fs.writeFileSync(path.join(dir, 'index.css'), SHARED_CSS, 'utf8');
  fs.writeFileSync(path.join(dir, 'index.js'), generateComponentJs(name, spec), 'utf8');
}

// Point build at new engine (keep old file as shim)
fs.writeFileSync(
  path.join(libDir, 'chart-sample-engine.js'),
  `/** @deprecated Use chart-visual-engine.js — shim for compatibility */\n(function(g){var e=g.OgulcanChartSamples;require&&(function(){});})(typeof globalThis!=='undefined'?globalThis:window);\n`,
  'utf8'
);

const enginePath = path.join(libDir, 'chart-visual-engine.js');
const { execSync } = require('child_process');
try {
  execSync(`node --check "${enginePath}"`, { stdio: 'pipe' });
} catch (err) {
  console.error('chart-visual-engine.js has syntax errors after generation.');
  process.exit(1);
}

console.log(`Generated chart-visual-engine.js + ${CHARTS_ALLOWLIST.length} unique chart components.`);
