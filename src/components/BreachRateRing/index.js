/**
 * OgulcanUI BreachRateRing — one-line enterprise chart (attributes only).
 */
export class OgulcanBreachRateRing extends HTMLElement {
  static MAX_JSON_ATTR = 65536;
  static MAX_SERIES = 128;

  static sanitizeAttr(s, max = 512) {
    const t = String(s ?? '').slice(0, max);
    if (/[<>'"]|javascript:|on\w+\s*=|data:text\/html/i.test(t)) return '';
    return t.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
  }

  static parseSeriesAttr(raw) {
    if (!raw || String(raw).length > OgulcanBreachRateRing.MAX_JSON_ATTR) return [];
    try {
      const j = JSON.parse(raw);
      if (!Array.isArray(j)) return [];
      const nums = j.map((p) => (typeof p === 'number' ? p : Number(p && (p.value ?? p.y)))).filter((n) => Number.isFinite(n));
      return nums.length > OgulcanBreachRateRing.MAX_SERIES ? nums.slice(0, OgulcanBreachRateRing.MAX_SERIES) : nums;
    } catch {
      if (typeof raw === 'string' && raw.includes(',')) {
        const nums = raw.split(',').map((v) => Number(v.trim())).filter((n) => Number.isFinite(n));
        return nums.length > OgulcanBreachRateRing.MAX_SERIES ? nums.slice(0, OgulcanBreachRateRing.MAX_SERIES) : nums;
      }
      return [];
    }
  }

  static get observedAttributes() {
    return ["value","min","max","label","color"];
  }

  constructor() {
    super();
    this._value = '';
    this._min = '';
    this._max = '';
    this._label = '';
    this._color = '';
    this._structureReady = false;
    this.resizeObserver = null;
    this._resizeFrame = 0;
    this._lastSize = '';
    this._paintSig = '';
    this.attachShadow({ mode: 'open' });
  }

  connectedCallback() {
    this.renderStructure();
    this.upgradeProperty('value');
    this.upgradeProperty('min');
    this.upgradeProperty('max');
    this.upgradeProperty('label');
    this.upgradeProperty('color');
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
      case 'value':
        this._value = OgulcanBreachRateRing.sanitizeAttr(newValue);
        this._paintSig = '';
        break;
      case 'min':
        this._min = OgulcanBreachRateRing.sanitizeAttr(newValue);
        this._paintSig = '';
        break;
      case 'max':
        this._max = OgulcanBreachRateRing.sanitizeAttr(newValue);
        this._paintSig = '';
        break;
      case 'label':
        this._label = OgulcanBreachRateRing.sanitizeAttr(newValue);
        this._paintSig = '';
        break;
      case 'color':
        this._color = OgulcanBreachRateRing.sanitizeAttr(newValue);
        this._paintSig = '';
        break;
    }
    if (this.isConnected) this.draw();
  }

  get value() { return this._value; }
  set value(v) {
    const s = v == null ? '' : (typeof v === 'object' ? JSON.stringify(v) : String(v));
    this._value = typeof v === 'object' ? v : s;
    this.setAttribute('value', s);
  }
  get min() { return this._min; }
  set min(v) {
    const s = v == null ? '' : (typeof v === 'object' ? JSON.stringify(v) : String(v));
    this._min = typeof v === 'object' ? v : s;
    this.setAttribute('min', s);
  }
  get max() { return this._max; }
  set max(v) {
    const s = v == null ? '' : (typeof v === 'object' ? JSON.stringify(v) : String(v));
    this._max = typeof v === 'object' ? v : s;
    this.setAttribute('max', s);
  }
  get label() { return this._label; }
  set label(v) {
    const s = v == null ? '' : (typeof v === 'object' ? JSON.stringify(v) : String(v));
    this._label = typeof v === 'object' ? v : s;
    this.setAttribute('label', s);
  }
  get color() { return this._color; }
  set color(v) {
    const s = v == null ? '' : (typeof v === 'object' ? JSON.stringify(v) : String(v));
    this._color = typeof v === 'object' ? v : s;
    this.setAttribute('color', s);
  }

  renderStructure() {
    if (this._structureReady) return;
    this.shadowRoot.innerHTML = `
      <style>
        /* [style.css] */
      </style>
      <!-- [template.html] -->
    `;
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
      const next = `${Math.round(rect.width)}x${Math.round(rect.height)}`;
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
    const label = ctx.label || ctx.title || 'Breach Rate Ring';
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
      return `${label} chart. ${values.length} data points. Minimum ${min}, maximum ${max}, average ${avg}.`;
    }
    const value = ctx.value ? ` Current value ${ctx.value}.` : '';
    const change = ctx.change ? ` Change ${ctx.change}.` : '';
    return `${label} chart.${value}${change}`;
  }

  collectPaintContext() {
    const el = this;
    const ctx = { component: 'BreachRateRing', svg: this.svg, tooltip: this.tooltip, shadowRoot: this.shadowRoot };
    ctx.label = OgulcanBreachRateRing.sanitizeAttr(el.getAttribute('label') || el.getAttribute('title') || '');
    ctx.color = OgulcanBreachRateRing.sanitizeAttr(el.getAttribute('color') || el.getAttribute('theme-color') || '', 64);
    ctx._parsedData = Array.isArray(this._data) && this._data.length ? this._data : null;
    ctx._parsedSpark = Array.isArray(this._sparkline) && this._sparkline.length ? this._sparkline : null;
    ctx.data = ctx._parsedData ? JSON.stringify(ctx._parsedData) : el.getAttribute('data');
    ctx.value = OgulcanBreachRateRing.sanitizeAttr(el.getAttribute('value'), 64);
    ctx.title = OgulcanBreachRateRing.sanitizeAttr(el.getAttribute('title'));
    ctx.change = OgulcanBreachRateRing.sanitizeAttr(el.getAttribute('change'), 128);
    ctx.trend = OgulcanBreachRateRing.sanitizeAttr(el.getAttribute('trend'), 32);
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

customElements.define('ogulcan-breach-rate-ring', OgulcanBreachRateRing);
