/**
 * Injected prefix for chart-visual-engine.js (perf + security).
 * OWASP-aligned: sanitize text, bound parse size, SVG-only DOM, no innerHTML tooltips.
 */
module.exports = `/**
 * OgulcanUI Chart Visual Engine — runtime core (perf + security).
 */
(function chartVisualEngine(global) {
  const ROOT = global;
  let PALETTE = ['#2563eb', '#0891b2', '#059669', '#d97706', '#7c3aed', '#dc2626', '#0d9488', '#4f46e5'];
  const PRIMARY = 'var(--color-primary, #2563eb)';
  const MAX_SERIES_POINTS = 128;
  const MAX_PARSE_CHARS = 65536;
  const MAX_TEXT_LEN = 512;
  const UNSAFE_TEXT = /<|>|javascript:|on\\w+\\s*=|data:text\\/html/i;
  const UNSAFE_ATTR = /^(on\\w+|href|xlink:href)$/i;

  function escapeHtml(v) {
    return String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function sanitizeText(v, maxLen) {
    const cap = maxLen == null ? MAX_TEXT_LEN : maxLen;
    let s = String(v ?? '').replace(/[\\x00-\\x08\\x0B\\x0C\\x0E-\\x1F\\x7F]/g, '').trim();
    if (UNSAFE_TEXT.test(s)) return '';
    return s.length > cap ? s.slice(0, cap) : s;
  }

  function sanitizeColor(v) {
    const s = sanitizeText(v, 64);
    if (!s) return '';
    if (/^#[0-9a-fA-F]{3,8}$/.test(s)) return s;
    if (/^var\\(--[\\w-]+/.test(s)) return s;
    if (/^(rgb|rgba|hsl|hsla)\\([^)]+\\)$/.test(s)) return s;
    return '';
  }

  function downsampleSeries(arr, maxPoints) {
    const cap = Math.min(maxPoints, MAX_SERIES_POINTS);
    if (!arr || arr.length <= cap) return arr || [];
    const out = [];
    const step = arr.length / cap;
    for (let i = 0; i < cap; i++) out.push(arr[Math.floor(i * step)]);
    return out;
  }

  function parseData(raw) {
    if (raw == null || raw === '') return null;
    if (Array.isArray(raw)) return downsampleSeries(raw.map(Number).filter((n) => Number.isFinite(n)), MAX_SERIES_POINTS);
    const str = typeof raw === 'string' ? raw : String(raw);
    if (str.length > MAX_PARSE_CHARS) return null;
    if (UNSAFE_TEXT.test(str)) return null;
    try {
      const j = JSON.parse(str);
      if (Array.isArray(j)) {
        return downsampleSeries(
          j.map((p) => (typeof p === 'number' ? p : Number(p && (p.value ?? p.y)))).filter((n) => Number.isFinite(n)),
          MAX_SERIES_POINTS
        );
      }
    } catch (_) { /* */ }
    if (str.includes(',')) {
      return downsampleSeries(
        str.split(',').map((v) => Number(v.trim())).filter((n) => Number.isFinite(n)),
        MAX_SERIES_POINTS
      );
    }
    return null;
  }

  function ns(tag, attrs, text) {
    const el = document.createElementNS('http://www.w3.org/2000/svg', tag);
    if (attrs) {
      Object.entries(attrs).forEach(([k, v]) => {
        if (v == null || UNSAFE_ATTR.test(k)) return;
        const val = String(v);
        if (UNSAFE_TEXT.test(val)) return;
        el.setAttribute(k, val);
      });
    }
    if (text != null) el.textContent = sanitizeText(text, 64);
    return el;
  }

  function appendNodes(svg, nodes) {
    if (!nodes.length) return;
    const frag = document.createDocumentFragment();
    for (let i = 0; i < nodes.length; i++) frag.appendChild(nodes[i]);
    svg.appendChild(frag);
  }

  function seed(str) {
    let h = 0;
    for (let i = 0; i < str.length; i++) h = (h << 5) - h + str.charCodeAt(i);
    return Math.abs(h);
  }

  function rand(s, min, max) {
    const x = Math.sin(s * 12.9898) * 43758.5453;
    return min + (x - Math.floor(x)) * (max - min);
  }

  function seriesFrom(ctx, n) {
    const want = Math.min(n, MAX_SERIES_POINTS);
    const cached = ctx._parsedSpark && ctx._parsedSpark.length ? ctx._parsedSpark : ctx._parsedData;
    if (cached && cached.length) {
      const nums = downsampleSeries(cached.map((p) => (typeof p === 'number' ? p : Number(p))), want);
      if (nums.length) return nums;
    }
    const parsed = parseData(ctx.data) || parseData(ctx.bars) || parseData(ctx.sparkline);
    if (parsed && parsed.length) return parsed.slice(0, want);
    const s = seed(ctx.component || 'x');
    return Array.from({ length: want }, (_, i) => Math.round(rand(s + i, 14, 88)));
  }

  function chartBox(svg) {
    const w = Math.max(1, Math.round(svg.clientWidth || 320));
    const h = Math.max(1, Math.round(svg.clientHeight || 180));
    const vb = svg.getAttribute('viewBox');
    const next = '0 0 ' + w + ' ' + h;
    if (vb !== next) svg.setAttribute('viewBox', next);
    return { w, h, pad: { t: 12, r: 14, b: 26, l: 36 }, inner() {
      return { x: this.pad.l, y: this.pad.t, w: w - this.pad.l - this.pad.r, h: h - this.pad.t - this.pad.b };
    } };
  }

  function clear(svg) {
    svg.replaceChildren();
  }

  function tip(tooltip, text, x, y) {
    if (!tooltip) return;
    tooltip.textContent = sanitizeText(text, 120);
    tooltip.style.left = x + 'px';
    tooltip.style.top = y + 'px';
    tooltip.classList.add('visible');
  }

  function hideTip(tooltip) {
    if (tooltip) tooltip.classList.remove('visible');
  }

  function hardenPaintContext(ctx) {
    ctx.label = sanitizeText(ctx.label);
    ctx.title = sanitizeText(ctx.title);
    ctx.change = sanitizeText(ctx.change, 128);
    ctx.trend = sanitizeText(ctx.trend, 32);
    ctx.color = sanitizeColor(ctx.color);
    ctx.value = sanitizeText(ctx.value, 64);
    return ctx;
  }

  const PAINTERS = {};
`;