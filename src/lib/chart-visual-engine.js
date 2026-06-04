/**
 * OgulcanUI Chart Visual Engine — 50 painters · generated 2026-06-04T14:16:08.196Z.
 */
(function chartVisualEngine(global) {
  const ROOT = global;
  let PALETTE = ['#2563eb', '#0891b2', '#059669', '#d97706', '#7c3aed', '#dc2626', '#0d9488', '#4f46e5'];
  const PRIMARY = 'var(--color-primary, #2563eb)';
  const MAX_SERIES_POINTS = 128;
  const MAX_PARSE_CHARS = 65536;
  const MAX_TEXT_LEN = 512;
  const UNSAFE_TEXT = /<|>|javascript:|on\w+\s*=|data:text\/html/i;
  const UNSAFE_ATTR = /^(on\w+|href|xlink:href)$/i;

  function escapeHtml(v) {
    return String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function sanitizeText(v, maxLen) {
    const cap = maxLen == null ? MAX_TEXT_LEN : maxLen;
    let s = String(v ?? '').replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '').trim();
    if (UNSAFE_TEXT.test(s)) return '';
    return s.length > cap ? s.slice(0, cap) : s;
  }

  function sanitizeColor(v) {
    const s = sanitizeText(v, 64);
    if (!s) return '';
    if (/^#[0-9a-fA-F]{3,8}$/.test(s)) return s;
    if (/^var\(--[\w-]+/.test(s)) return s;
    if (/^(rgb|rgba|hsl|hsla)\([^)]+\)$/.test(s)) return s;
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

  const GRID = 'var(--border-color, rgba(148,163,184,0.12))';
  const AXIS = 'var(--border-color-hover, rgba(148,163,184,0.3))';
  const TEXT = 'var(--text-primary, #0f172a)';
  const MUTED = 'var(--text-muted, #64748b)';
  const CARD = 'var(--bg-card, #ffffff)';
  const GOOD = 'var(--color-success, #059669)';
  const WARN = 'var(--color-warning, #d97706)';
  const BAD = 'var(--color-danger, #dc2626)';
  const INFO = 'var(--color-info, #0891b2)';

  PALETTE = [
    'var(--color-primary, #60a5fa)',
    'var(--color-info, #22d3ee)',
    'var(--color-success, #34d399)',
    'var(--color-warning, #fbbf24)',
    'var(--color-danger, #f87171)',
    '#a78bfa',
    '#f472b6',
    '#38bdf8'
  ];

  const PALETTE_HEX = ['#60a5fa','#22d3ee','#34d399','#fbbf24','#f87171','#a78bfa','#f472b6','#38bdf8'];

  function clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }
  function numberFrom(v, fb) { const n = Number(v); return Number.isFinite(n) ? n : fb; }
  function colorAt(i, fb) { return fb && i === 0 ? fb : PALETTE[i % PALETTE.length]; }
  function hexAt(i) { return PALETTE_HEX[i % PALETTE_HEX.length]; }
  function crisp(v) { return Math.round(v) + 0.5; }
  function lerp(a, b, t) { return a + (b - a) * t; }

  function injectDefs(svg, extras) {
    let defs = svg.querySelector('defs');
    if (!defs) { defs = ns('defs'); svg.insertBefore(defs, svg.firstChild); }
    else defs.replaceChildren();
    // primary area gradient
    const pg = ns('linearGradient', { id: 'pg', x1: '0', y1: '0', x2: '0', y2: '1' });
    pg.appendChild(ns('stop', { offset: '0%', 'stop-color': 'var(--color-primary,#60a5fa)', 'stop-opacity': '0.35' }));
    pg.appendChild(ns('stop', { offset: '100%', 'stop-color': 'var(--color-primary,#60a5fa)', 'stop-opacity': '0' }));
    defs.appendChild(pg);
    // teal gradient
    const tg = ns('linearGradient', { id: 'tg', x1: '0', y1: '0', x2: '0', y2: '1' });
    tg.appendChild(ns('stop', { offset: '0%', 'stop-color': '#22d3ee', 'stop-opacity': '0.32' }));
    tg.appendChild(ns('stop', { offset: '100%', 'stop-color': '#22d3ee', 'stop-opacity': '0' }));
    defs.appendChild(tg);
    // green gradient
    const gg = ns('linearGradient', { id: 'gg', x1: '0', y1: '0', x2: '0', y2: '1' });
    gg.appendChild(ns('stop', { offset: '0%', 'stop-color': '#34d399', 'stop-opacity': '0.3' }));
    gg.appendChild(ns('stop', { offset: '100%', 'stop-color': '#34d399', 'stop-opacity': '0' }));
    defs.appendChild(gg);
    // warn gradient
    const wg = ns('linearGradient', { id: 'wg', x1: '0', y1: '0', x2: '0', y2: '1' });
    wg.appendChild(ns('stop', { offset: '0%', 'stop-color': '#fbbf24', 'stop-opacity': '0.28' }));
    wg.appendChild(ns('stop', { offset: '100%', 'stop-color': '#fbbf24', 'stop-opacity': '0' }));
    defs.appendChild(wg);
    // bar gradient (vertical)
    const bg = ns('linearGradient', { id: 'bg', x1: '0', y1: '0', x2: '0', y2: '1' });
    bg.appendChild(ns('stop', { offset: '0%', 'stop-color': 'var(--color-primary,#60a5fa)', 'stop-opacity': '1' }));
    bg.appendChild(ns('stop', { offset: '100%', 'stop-color': 'var(--color-primary,#60a5fa)', 'stop-opacity': '0.55' }));
    defs.appendChild(bg);
    if (extras) extras(defs);
  }

  function valueRange(values) {
    let mn = Infinity, mx = -Infinity;
    for (let i = 0; i < values.length; i++) {
      const n = Number(values[i]);
      if (Number.isFinite(n)) { if (n < mn) mn = n; if (n > mx) mx = n; }
    }
    if (!Number.isFinite(mn)) return { min: 0, max: 100, range: 100 };
    if (mn === mx) return { min: Math.min(0, mn), max: mx + 1, range: Math.abs(mx) + 1 };
    return { min: mn, max: mx, range: mx - mn };
  }

  function yScale(inner, range, v) {
    return inner.y + inner.h - ((v - range.min) / range.range) * inner.h;
  }
  function xScale(inner, count, i) {
    return inner.x + (i / Math.max(1, count - 1)) * inner.w;
  }
  function pointsFor(inner, values) {
    const range = valueRange(values);
    return values.map((v, i) => ({ x: xScale(inner, values.length, i), y: yScale(inner, range, v), v }));
  }

  function curvePath(pts) {
    if (!pts.length) return '';
    if (pts.length === 1) return 'M' + pts[0].x + ' ' + pts[0].y;
    if (pts.length === 2) return 'M' + pts[0].x + ' ' + pts[0].y + ' L' + pts[1].x + ' ' + pts[1].y;
    let d = 'M' + pts[0].x + ' ' + pts[0].y;
    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i], b = pts[i + 1];
      const cx1 = a.x + (b.x - a.x) / 3, cy1 = a.y;
      const cx2 = a.x + 2 * (b.x - a.x) / 3, cy2 = b.y;
      d += ' C' + cx1 + ' ' + cy1 + ' ' + cx2 + ' ' + cy2 + ' ' + b.x + ' ' + b.y;
    }
    return d;
  }
  function linePath(pts) { return curvePath(pts); }
  function areaPath(pts, baseY) {
    if (!pts.length) return '';
    return curvePath(pts) + ' L' + pts[pts.length - 1].x + ' ' + baseY + ' L' + pts[0].x + ' ' + baseY + ' Z';
  }

  function polarPoint(cx, cy, r, a) { return { x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r }; }

  function arcPath(cx, cy, r, start, end) {
    const s = polarPoint(cx, cy, r, start), e = polarPoint(cx, cy, r, end);
    const large = Math.abs(end - start) > Math.PI ? 1 : 0;
    return 'M' + s.x + ' ' + s.y + ' A' + r + ' ' + r + ' 0 ' + large + ' 1 ' + e.x + ' ' + e.y;
  }

  function wedgePath(cx, cy, r, ir, start, end) {
    const a = polarPoint(cx, cy, r, start), b = polarPoint(cx, cy, r, end);
    const c = polarPoint(cx, cy, ir, end), d = polarPoint(cx, cy, ir, start);
    const large = end - start > Math.PI ? 1 : 0;
    return 'M' + a.x + ' ' + a.y + ' A' + r + ' ' + r + ' 0 ' + large + ' 1 ' + b.x + ' ' + b.y +
      ' L' + c.x + ' ' + c.y + ' A' + ir + ' ' + ir + ' 0 ' + large + ' 0 ' + d.x + ' ' + d.y + ' Z';
  }

  function bindTooltip(el, tooltip, text) {
    if (!tooltip) return;
    el.addEventListener('mousemove', (e) => {
      const r = (el.ownerSVGElement || el).getBoundingClientRect();
      tip(tooltip, text, e.clientX - r.left + 10, e.clientY - r.top - 30);
    });
    el.addEventListener('mouseleave', () => hideTip(tooltip));
  }

  // === REUSABLE DRAWING PRIMITIVES ===

  function drawGridShell(svg, box, opts) {
    injectDefs(svg, opts && opts.defs);
    const inner = box.inner();
    const range = opts && opts.range;
    const gridCount = (opts && opts.gridCount) || 4;
    // background
    if (opts && opts.bg) {
      svg.appendChild(ns('rect', { x: inner.x, y: inner.y, width: inner.w, height: inner.h, fill: opts.bg, rx: 2 }));
    }
    // grid lines
    for (let i = 0; i <= gridCount; i++) {
      const y = crisp(inner.y + (inner.h / gridCount) * i);
      svg.appendChild(ns('line', { x1: inner.x, y1: y, x2: inner.x + inner.w, y2: y, class: 'grid-line' }));
      if (range) {
        const val = range.max - (i / gridCount) * range.range;
        let label = Math.abs(val) >= 1e6 ? (val / 1e6).toFixed(1) + 'M' :
                    Math.abs(val) >= 1e3 ? (val / 1e3).toFixed(1) + 'K' : Math.round(val);
        svg.appendChild(ns('text', { x: inner.x - 6, y: y + 3, class: 'grid-text' }, String(label)));
      }
    }
    // axis line
    svg.appendChild(ns('line', { x1: inner.x, y1: inner.y + inner.h, x2: inner.x + inner.w, y2: inner.y + inner.h, class: 'axis-line' }));
    // left axis line
    svg.appendChild(ns('line', { x1: crisp(inner.x), y1: inner.y, x2: crisp(inner.x), y2: inner.y + inner.h, class: 'axis-line' }));
    return inner;
  }

  // ── 1. AREA / LINE CHART ──────────────────────────────────────────────────
  function drawAreaLine(ctx, opts) {
    const { svg, color, tooltip } = ctx;
    const box = chartBox(svg);
    clear(svg);
    const count = (opts && opts.count) || 14;
    const vals = seriesFrom(ctx, count);
    const range = valueRange(vals);
    const inner = drawGridShell(svg, box, { range, gridCount: 4 });
    const pts = pointsFor(inner, vals);
    const stroke = color || (opts && opts.stroke) || 'var(--color-primary,#60a5fa)';
    const gradId = stroke.includes('22d3ee') ? 'tg' : stroke.includes('34d399') ? 'gg' : stroke.includes('fbbf24') ? 'wg' : 'pg';
    injectDefs(svg);
    // area fill
    svg.appendChild(ns('path', { d: areaPath(pts, inner.y + inner.h), fill: 'url(#' + gradId + ')', opacity: '1' }));
    // line
    svg.appendChild(ns('path', { d: linePath(pts), fill: 'none', stroke, 'stroke-width': 2.5, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }));
    // x-axis labels
    const step = Math.max(1, Math.floor(vals.length / 5));
    vals.forEach((v, i) => {
      if (i % step !== 0 && i !== vals.length - 1) return;
      svg.appendChild(ns('text', { x: xScale(inner, vals.length, i), y: inner.y + inner.h + 12, 'text-anchor': 'middle', class: 'grid-text' }, 'T' + (i + 1)));
    });
    // dots with hover + tooltip
    pts.forEach((p, i) => {
      const dot = ns('circle', { cx: p.x, cy: p.y, r: 3.5, fill: stroke, stroke: CARD, 'stroke-width': 1.5, class: 'chart-dot', style: 'cursor:pointer' });
      dot.addEventListener('mouseenter', () => dot.setAttribute('r', '5.5'));
      dot.addEventListener('mouseleave', () => dot.setAttribute('r', '3.5'));
      bindTooltip(dot, tooltip, 'T' + (i + 1) + ': ' + p.v.toFixed(1));
      svg.appendChild(dot);
    });
  }

  // ── 2. GROUPED BAR CHART ──────────────────────────────────────────────────
  function drawBars(ctx, opts) {
    const { svg, color, tooltip } = ctx;
    const box = chartBox(svg);
    clear(svg);
    const count = (opts && opts.count) || 8;
    const vals = seriesFrom(ctx, count);
    const range = valueRange(vals.concat([0]));
    const inner = drawGridShell(svg, box, { range, gridCount: 4 });
    injectDefs(svg);
    const bw = (inner.w / count) * 0.62;
    const gap = (inner.w / count) * 0.38 / 2;
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    vals.forEach((v, i) => {
      const x = inner.x + i * (inner.w / count) + gap;
      const y = yScale(inner, range, Math.max(0, v));
      const base = yScale(inner, range, 0);
      const h = Math.max(3, Math.abs(base - y));
      const useGrad = !color;
      const fill = useGrad ? ('url(#bg' + i + ')') : colorAt(i, color);
      // per-bar gradient
      if (useGrad) {
        let defs = svg.querySelector('defs');
        if (!defs) { defs = ns('defs'); svg.insertBefore(defs, svg.firstChild); }
        const gi = ns('linearGradient', { id: 'bg' + i, x1: '0', y1: '0', x2: '0', y2: '1' });
        gi.appendChild(ns('stop', { offset: '0%', 'stop-color': hexAt(i), 'stop-opacity': '0.95' }));
        gi.appendChild(ns('stop', { offset: '100%', 'stop-color': hexAt(i), 'stop-opacity': '0.55' }));
        defs.appendChild(gi);
      }
      const rect = ns('rect', { x, y: Math.min(y, base), width: bw, height: h, rx: 4, fill, style: 'cursor:pointer;transition:opacity 120ms' });
      rect.addEventListener('mouseenter', () => rect.setAttribute('opacity', '0.78'));
      rect.addEventListener('mouseleave', () => rect.setAttribute('opacity', '1'));
      bindTooltip(rect, tooltip, (months[i] || 'Item ' + (i + 1)) + ': ' + v.toFixed(1));
      svg.appendChild(rect);
      // value label on top
      if (h > 14) {
        svg.appendChild(ns('text', { x: x + bw / 2, y: Math.min(y, base) - 3, 'text-anchor': 'middle', class: 'grid-text', 'font-size': '7.5' }, String(Math.round(v))));
      }
      // x label
      svg.appendChild(ns('text', { x: x + bw / 2, y: inner.y + inner.h + 11, 'text-anchor': 'middle', class: 'grid-text' }, months[i] || String(i + 1)));
    });
  }

  // ── 3. DONUT / RING ───────────────────────────────────────────────────────
  function drawDonut(ctx, opts) {
    const { svg, color, tooltip } = ctx;
    const box = chartBox(svg);
    clear(svg);
    injectDefs(svg);
    const vals = seriesFrom(ctx, (opts && opts.count) || 5).map(v => Math.max(1, v));
    const total = vals.reduce((a, b) => a + b, 0);
    const cx = box.w / 2, cy = box.h / 2;
    const r = Math.min(box.w, box.h) * ((opts && opts.radius) || 0.36);
    const ir = r * ((opts && opts.thin) ? 0.68 : 0.55);
    let start = -Math.PI / 2;
    // shadow ring
    svg.appendChild(ns('circle', { cx, cy, r: r + 2, fill: 'none', stroke: GRID, 'stroke-width': 2 }));
    vals.forEach((v, i) => {
      const end = start + (v / total) * Math.PI * 2;
      const fill = colorAt(i, color);
      const wedge = ns('path', {
        d: wedgePath(cx, cy, r, ir, start + 0.025, end - 0.025),
        fill, opacity: 0.92, style: 'cursor:pointer;transition:opacity 140ms,transform 140ms;transform-origin:' + cx + 'px ' + cy + 'px'
      });
      wedge.addEventListener('mouseenter', () => { wedge.setAttribute('opacity', '1'); wedge.style.transform = 'scale(1.04)'; });
      wedge.addEventListener('mouseleave', () => { wedge.setAttribute('opacity', '0.92'); wedge.style.transform = 'scale(1)'; });
      const pct = Math.round((v / total) * 100);
      bindTooltip(wedge, tooltip, 'Segment ' + (i + 1) + ': ' + pct + '%');
      svg.appendChild(wedge);
      // segment label at midpoint
      const mid = start + (end - start) / 2;
      const lp = polarPoint(cx, cy, (r + ir) / 2, mid);
      if (pct >= 8) {
        svg.appendChild(ns('text', { x: lp.x, y: lp.y + 3, 'text-anchor': 'middle', fill: CARD, 'font-size': 8, 'font-weight': 700 }, pct + '%'));
      }
      start = end;
    });
    // center text
    const centerLabel = (opts && opts.center) || String(Math.round(total));
    svg.appendChild(ns('text', { x: cx, y: cy - 4, 'text-anchor': 'middle', fill: TEXT, 'font-size': 15, 'font-weight': 800, 'letter-spacing': '-0.02em' }, centerLabel));
    svg.appendChild(ns('text', { x: cx, y: cy + 11, 'text-anchor': 'middle', fill: MUTED, 'font-size': 8, 'font-weight': 500, 'letter-spacing': '0.04em' }, 'TOTAL'));
  }

  // ── 4. HALF-GAUGE ─────────────────────────────────────────────────────────
  function drawGauge(ctx, opts) {
    const { svg, color, tooltip } = ctx;
    const box = chartBox(svg);
    clear(svg);
    injectDefs(svg);
    const value = clamp(numberFrom(ctx.value, seriesFrom(ctx, 1)[0]), 0, 100);
    const pct = clamp(value / 100, 0, 1);
    const cx = box.w / 2, cy = box.h * 0.68;
    const r = Math.min(box.w * 0.42, box.h * 0.62);
    const startA = Math.PI * 0.85, span = Math.PI * 1.3;
    // track zones (danger/warn/good)
    const zones = [
      { pct: 0.4, color: BAD },
      { pct: 0.35, color: WARN },
      { pct: 0.25, color: GOOD }
    ];
    let za = startA;
    zones.forEach(z => {
      const ze = za + z.pct * span;
      svg.appendChild(ns('path', { d: arcPath(cx, cy, r, za, ze), fill: 'none', stroke: z.color, 'stroke-width': 10, opacity: 0.18, 'stroke-linecap': 'butt' }));
      za = ze;
    });
    // track outline
    svg.appendChild(ns('path', { d: arcPath(cx, cy, r, startA, startA + span), fill: 'none', stroke: GRID, 'stroke-width': 10, 'stroke-linecap': 'round' }));
    // value arc
    const strokeColor = color || (pct > 0.7 ? GOOD : pct > 0.4 ? WARN : BAD);
    const gp = ns('path', {
      d: arcPath(cx, cy, r, startA, startA + pct * span),
      fill: 'none', stroke: strokeColor, 'stroke-width': 10, 'stroke-linecap': 'round', style: 'cursor:pointer'
    });
    bindTooltip(gp, tooltip, (opts && opts.sub ? opts.sub + ': ' : 'Value: ') + value.toFixed(0) + '%');
    svg.appendChild(gp);
    // needle dot
    const needleA = startA + pct * span;
    const np = polarPoint(cx, cy, r, needleA);
    svg.appendChild(ns('circle', { cx: np.x, cy: np.y, r: 4.5, fill: CARD, stroke: strokeColor, 'stroke-width': 2.5 }));
    // center value
    svg.appendChild(ns('text', { x: cx, y: cy - 4, 'text-anchor': 'middle', fill: TEXT, 'font-size': 22, 'font-weight': 800, 'letter-spacing': '-0.03em' }, Math.round(value) + (opts && opts.suffix ? opts.suffix : '%')));
    if (opts && opts.sub) {
      svg.appendChild(ns('text', { x: cx, y: cy + 12, 'text-anchor': 'middle', fill: MUTED, 'font-size': 8, 'letter-spacing': '0.06em', 'font-weight': 600 }, opts.sub.toUpperCase()));
    }
    // min/max labels
    const minPt = polarPoint(cx, cy, r + 12, startA);
    const maxPt = polarPoint(cx, cy, r + 12, startA + span);
    svg.appendChild(ns('text', { x: minPt.x, y: minPt.y, 'text-anchor': 'middle', fill: MUTED, 'font-size': 8, 'font-weight': 600 }, '0'));
    svg.appendChild(ns('text', { x: maxPt.x, y: maxPt.y, 'text-anchor': 'middle', fill: MUTED, 'font-size': 8, 'font-weight': 600 }, '100'));
  }

  // ── 5. HEAT MATRIX ────────────────────────────────────────────────────────
  function drawMatrix(ctx, opts) {
    const { svg, color, tooltip } = ctx;
    const box = chartBox(svg);
    clear(svg);
    const cols = (opts && opts.cols) || 7;
    const rows = (opts && opts.rows) || 5;
    const inner = box.inner();
    const values = seriesFrom(ctx, cols * rows);
    const cw = inner.w / cols, ch = inner.h / rows;
    const rowLabels = ['Mon','Tue','Wed','Thu','Fri'].slice(0, rows);
    const colLabels = ['W1','W2','W3','W4','W5','W6','W7'].slice(0, cols);
    colLabels.forEach((lbl, j) => {
      svg.appendChild(ns('text', { x: inner.x + j * cw + cw / 2, y: inner.y - 3, 'text-anchor': 'middle', class: 'grid-text' }, lbl));
    });
    values.slice(0, cols * rows).forEach((v, i) => {
      const col = i % cols, row = Math.floor(i / cols);
      const x = inner.x + col * cw, y = inner.y + row * ch;
      const norm = clamp(v / 100, 0, 1);
      const fill = v > 72 ? GOOD : v > 45 ? WARN : v > 22 ? INFO : BAD;
      const rect = ns('rect', { x: x + 1.5, y: y + 1.5, width: cw - 3, height: ch - 3, rx: 3, fill, opacity: 0.12 + norm * 0.78, style: 'cursor:pointer;transition:opacity 120ms' });
      bindTooltip(rect, tooltip, (rowLabels[row] || 'Row' + row) + ' / ' + colLabels[col] + ': ' + Math.round(v) + '%');
      rect.addEventListener('mouseenter', () => { rect.setAttribute('opacity', String(Math.min(1, 0.12 + norm * 0.78 + 0.15))); });
      rect.addEventListener('mouseleave', () => { rect.setAttribute('opacity', String(0.12 + norm * 0.78)); });
      svg.appendChild(rect);
      if (cw > 22 && ch > 14) {
        svg.appendChild(ns('text', { x: x + cw / 2, y: y + ch / 2 + 3.5, 'text-anchor': 'middle', fill: norm > 0.55 ? CARD : TEXT, 'font-size': 7.5, 'font-weight': 700 }, Math.round(v) + '%'));
      }
    });
    rowLabels.forEach((lbl, r) => {
      svg.appendChild(ns('text', { x: inner.x - 5, y: inner.y + r * ch + ch / 2 + 3, 'text-anchor': 'end', class: 'grid-text' }, lbl));
    });
  }

  // ── 6. RADAR / SPIDER ─────────────────────────────────────────────────────
  function drawRadar(ctx, opts) {
    const { svg, color, tooltip } = ctx;
    const box = chartBox(svg);
    clear(svg);
    injectDefs(svg);
    const vals = seriesFrom(ctx, (opts && opts.axes) || 6);
    const n = vals.length;
    const cx = box.w / 2, cy = box.h / 2;
    const r = Math.min(box.w, box.h) * 0.34;
    const labelR = r + 14;
    const labels = (opts && opts.labels) || ['Risk','Perf','Qual','Cost','Speed','Scale','Trust','Growth'].slice(0, n);
    // rings
    [0.25, 0.5, 0.75, 1].forEach(f => {
      const pts = vals.map((_, i) => {
        const p = polarPoint(cx, cy, r * f, -Math.PI / 2 + (i / n) * Math.PI * 2);
        return p.x + ',' + p.y;
      }).join(' ');
      svg.appendChild(ns('polygon', { points: pts, fill: 'none', stroke: GRID, 'stroke-width': 1 }));
    });
    // spokes
    vals.forEach((_, i) => {
      const p = polarPoint(cx, cy, r, -Math.PI / 2 + (i / n) * Math.PI * 2);
      svg.appendChild(ns('line', { x1: cx, y1: cy, x2: p.x, y2: p.y, stroke: GRID, 'stroke-width': 1 }));
    });
    // data polygon
    const dataPts = vals.map((v, i) => {
      const p = polarPoint(cx, cy, r * clamp(v / 100, 0.05, 1), -Math.PI / 2 + (i / n) * Math.PI * 2);
      return p.x + ',' + p.y;
    }).join(' ');
    const poly = ns('polygon', { points: dataPts, fill: color || 'url(#pg)', opacity: 0.35, stroke: color || 'var(--color-primary,#60a5fa)', 'stroke-width': 2 });
    bindTooltip(poly, tooltip, labels.map((l, i) => l + ': ' + Math.round(vals[i])).join(' | '));
    svg.appendChild(poly);
    // data dots
    vals.forEach((v, i) => {
      const p = polarPoint(cx, cy, r * clamp(v / 100, 0.05, 1), -Math.PI / 2 + (i / n) * Math.PI * 2);
      svg.appendChild(ns('circle', { cx: p.x, cy: p.y, r: 3, fill: color || 'var(--color-primary,#60a5fa)', stroke: CARD, 'stroke-width': 1.5 }));
    });
    // axis labels
    vals.forEach((v, i) => {
      const lp = polarPoint(cx, cy, labelR, -Math.PI / 2 + (i / n) * Math.PI * 2);
      const anchor = lp.x < cx - 5 ? 'end' : lp.x > cx + 5 ? 'start' : 'middle';
      svg.appendChild(ns('text', { x: lp.x, y: lp.y + 3, 'text-anchor': anchor, fill: MUTED, 'font-size': 8, 'font-weight': 600, 'letter-spacing': '0.02em' }, labels[i]));
    });
  }

  // ── 7. KPI / SPARKLINE CARD ───────────────────────────────────────────────
  function drawKpi(ctx, opts) {
    const { svg, shadowRoot, color } = ctx;
    if (shadowRoot) {
      const valEl = shadowRoot.querySelector('.kpi-value');
      const chgEl = shadowRoot.querySelector('.kpi-change');
      if (valEl) valEl.textContent = sanitizeText(ctx.value || (opts && opts.defaultValue) || '—', 64);
      if (chgEl) {
        chgEl.textContent = sanitizeText(ctx.change || (opts && opts.defaultChange) || '', 128);
        const isDown = String(ctx.trend || '').toLowerCase() === 'down' || String(ctx.change || opts && opts.defaultChange || '').startsWith('-');
        chgEl.style.color = isDown ? BAD : GOOD;
      }
    }
    const box = chartBox(svg);
    clear(svg);
    injectDefs(svg);
    const inner = box.inner();
    const vals = seriesFrom({ component: ctx.component, data: ctx.sparkline || ctx.data }, 16);
    const pts = pointsFor(inner, vals);
    const stroke = color || (opts && opts.stroke) || 'var(--color-primary,#60a5fa)';
    const gradId = stroke.includes('34d399') ? 'gg' : stroke.includes('22d3ee') ? 'tg' : stroke.includes('fbbf24') ? 'wg' : 'pg';
    svg.appendChild(ns('path', { d: areaPath(pts, inner.y + inner.h), fill: 'url(#' + gradId + ')' }));
    svg.appendChild(ns('path', { d: linePath(pts), fill: 'none', stroke, 'stroke-width': 2, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }));
    if (pts.length) {
      const last = pts[pts.length - 1];
      svg.appendChild(ns('circle', { cx: last.x, cy: last.y, r: 3.5, fill: stroke, stroke: CARD, 'stroke-width': 1.5 }));
    }
  }

  // ── 8. HORIZONTAL BARS ────────────────────────────────────────────────────
  function drawHBar(ctx, opts) {
    const { svg, color, tooltip } = ctx;
    const box = chartBox(svg);
    clear(svg);
    const inner = box.inner();
    const vals = seriesFrom(ctx, (opts && opts.count) || 6);
    const labels = (opts && opts.labels) || ['Alpha','Beta','Gamma','Delta','Epsilon','Zeta','Eta','Theta'].slice(0, vals.length);
    const max = Math.max(...vals, 1);
    const rowH = inner.h / vals.length;
    injectDefs(svg);
    vals.forEach((v, i) => {
      const y = inner.y + i * rowH + rowH * 0.12;
      const h = rowH * 0.62;
      const fullW = inner.w * 0.85;
      const barW = Math.max(4, (v / max) * fullW);
      // track
      svg.appendChild(ns('rect', { x: inner.x + 40, y, width: fullW, height: h, rx: 3, fill: GRID, opacity: 0.9 }));
      // bar with gradient
      let defs = svg.querySelector('defs');
      if (!defs) { defs = ns('defs'); svg.insertBefore(defs, svg.firstChild); }
      const gi = ns('linearGradient', { id: 'hg' + i, x1: '0', y1: '0', x2: '1', y2: '0' });
      gi.appendChild(ns('stop', { offset: '0%', 'stop-color': hexAt(i), 'stop-opacity': '0.95' }));
      gi.appendChild(ns('stop', { offset: '100%', 'stop-color': hexAt(i), 'stop-opacity': '0.6' }));
      defs.appendChild(gi);
      const bar = ns('rect', { x: inner.x + 40, y, width: barW, height: h, rx: 3, fill: 'url(#hg' + i + ')', style: 'cursor:pointer;transition:opacity 120ms' });
      bar.addEventListener('mouseenter', () => bar.setAttribute('opacity', '0.75'));
      bar.addEventListener('mouseleave', () => bar.setAttribute('opacity', '1'));
      bindTooltip(bar, tooltip, labels[i] + ': ' + Math.round(v));
      svg.appendChild(bar);
      // label left
      svg.appendChild(ns('text', { x: inner.x + 36, y: y + h / 2 + 3.5, 'text-anchor': 'end', fill: MUTED, 'font-size': 8, 'font-weight': 600 }, labels[i]));
      // value right
      svg.appendChild(ns('text', { x: inner.x + 40 + barW + 4, y: y + h / 2 + 3.5, fill: TEXT, 'font-size': 8, 'font-weight': 700 }, Math.round(v)));
    });
  }

  // ── 9. WATERFALL / BRIDGE ─────────────────────────────────────────────────
  function drawWaterfall(ctx, opts) {
    const { svg, color, tooltip } = ctx;
    const box = chartBox(svg);
    clear(svg);
    const items = (opts && opts.items) || ['Start','Rev+','Cost-','Tax-','Adj+','End'];
    const deltas = seriesFrom(ctx, items.length - 1).map((v, i) => (i % 3 === 1 ? -Math.abs(v) * 0.45 : Math.abs(v) * 0.52));
    const startVal = 55;
    const allVals = [startVal];
    let cur = startVal;
    deltas.forEach(d => { cur += d; allVals.push(cur); });
    const range = valueRange([0, ...allVals]);
    const inner = drawGridShell(svg, box, { range, gridCount: 4 });
    const stepW = inner.w / (items.length);
    const bw = stepW * 0.5;
    let base = startVal;
    // start bar
    const sy = yScale(inner, range, startVal);
    const sb = yScale(inner, range, 0);
    svg.appendChild(ns('rect', { x: inner.x + stepW * 0.25, y: Math.min(sy, sb), width: bw, height: Math.max(3, Math.abs(sb - sy)), rx: 3, fill: hexAt(0), opacity: 0.85 }));
    svg.appendChild(ns('text', { x: inner.x + stepW * 0.25 + bw / 2, y: Math.min(sy, sb) - 3, 'text-anchor': 'middle', class: 'grid-text' }, items[0]));
    deltas.forEach((d, i) => {
      const x = inner.x + (i + 1) * stepW + stepW * 0.25;
      const newBase = base + d;
      const y1 = yScale(inner, range, Math.max(base, newBase));
      const y2 = yScale(inner, range, Math.min(base, newBase));
      const h = Math.max(3, y2 - y1);
      const fill = d >= 0 ? GOOD : BAD;
      const rect = ns('rect', { x, y: y1, width: bw, height: h, rx: 3, fill, opacity: 0.88, style: 'cursor:pointer' });
      bindTooltip(rect, tooltip, items[i + 1] + ': ' + (d >= 0 ? '+' : '') + d.toFixed(1));
      svg.appendChild(rect);
      // connector dashed line
      const connY = yScale(inner, range, newBase);
      if (i < deltas.length - 1) {
        svg.appendChild(ns('line', { x1: x + bw, y1: connY, x2: x + stepW, y2: connY, stroke: MUTED, 'stroke-width': 1, 'stroke-dasharray': '2 2' }));
      }
      // label
      svg.appendChild(ns('text', { x: x + bw / 2, y: inner.y + inner.h + 11, 'text-anchor': 'middle', class: 'grid-text' }, items[i + 1]));
      base = newBase;
    });
    // end bar
    const ey = yScale(inner, range, allVals[allVals.length - 1]);
    const eb = yScale(inner, range, 0);
    // already drawn via delta, just a label
  }

  // ── 10. FUNNEL ────────────────────────────────────────────────────────────
  function drawFunnel(ctx, opts) {
    const { svg, color, tooltip } = ctx;
    const box = chartBox(svg);
    clear(svg);
    const inner = box.inner();
    const labels = (opts && opts.labels) || ['Visitors','Leads','MQL','SQL','Deals','Won'];
    const vals = seriesFrom(ctx, labels.length);
    const maxV = Math.max(...vals, 1);
    const rowH = inner.h / vals.length;
    vals.forEach((v, i) => {
      const pct = v / maxV;
      const w = inner.w * (0.25 + pct * 0.68);
      const x = inner.x + (inner.w - w) / 2;
      const y = inner.y + i * rowH + 2;
      const h = rowH - 5;
      // trapezoid using polygon
      const nextPct = i < vals.length - 1 ? vals[i + 1] / maxV : pct * 0.85;
      const nextW = inner.w * (0.25 + nextPct * 0.68);
      const nx = inner.x + (inner.w - nextW) / 2;
      const points = [x, y, x + w, y, nx + nextW, y + h, nx, y + h].join(',');
      const poly = ns('polygon', { points, fill: colorAt(i, color), opacity: 0.82, style: 'cursor:pointer;transition:opacity 120ms' });
      poly.addEventListener('mouseenter', () => poly.setAttribute('opacity', '1'));
      poly.addEventListener('mouseleave', () => poly.setAttribute('opacity', '0.82'));
      const pctStr = Math.round(pct * 100) + '%';
      bindTooltip(poly, tooltip, labels[i] + ': ' + Math.round(v) + ' (' + pctStr + ')');
      svg.appendChild(poly);
      // label
      svg.appendChild(ns('text', { x: inner.x + inner.w / 2, y: y + h / 2 + 3.5, 'text-anchor': 'middle', fill: CARD, 'font-size': 8.5, 'font-weight': 700 }, labels[i] + ' ' + pctStr));
    });
  }

  // ── 11. SCATTER PLOT ──────────────────────────────────────────────────────
  function drawScatter(ctx, opts) {
    const { svg, color, tooltip } = ctx;
    const box = chartBox(svg);
    clear(svg);
    const inner = drawGridShell(svg, box, { gridCount: 3 });
    const n = 20;
    const xs = seriesFrom(ctx, n);
    const ys = seriesFrom({ component: ctx.component + '_y' }, n);
    const rx = valueRange(xs), ry = valueRange(ys);
    // best-fit trend line
    const sx = xs.reduce((a, b) => a + b, 0) / n;
    const sy = ys.reduce((a, b) => a + b, 0) / n;
    const num = xs.reduce((a, x, i) => a + (x - sx) * (ys[i] - sy), 0);
    const den = xs.reduce((a, x) => a + (x - sx) ** 2, 0) || 1;
    const slope = num / den, intercept = sy - slope * sx;
    const tx1 = rx.min, ty1 = slope * tx1 + intercept;
    const tx2 = rx.max, ty2 = slope * tx2 + intercept;
    const allY = [ty1, ty2, ...ys];
    const fullRy = valueRange(allY);
    const sx1 = inner.x + ((tx1 - rx.min) / rx.range) * inner.w;
    const sy1 = yScale(inner, fullRy, ty1);
    const sx2 = inner.x + ((tx2 - rx.min) / rx.range) * inner.w;
    const sy2 = yScale(inner, fullRy, ty2);
    svg.appendChild(ns('line', { x1: sx1, y1: sy1, x2: sx2, y2: sy2, stroke: WARN, 'stroke-width': 1.5, 'stroke-dasharray': '4 3', opacity: 0.7 }));
    xs.forEach((xv, i) => {
      const x = inner.x + ((xv - rx.min) / (rx.range || 1)) * inner.w;
      const y = yScale(inner, fullRy, ys[i]);
      const rad = 3.5 + (i % 4) * 0.8;
      const dot = ns('circle', { cx: x, cy: y, r: rad, fill: colorAt(i, color), opacity: 0.72, stroke: colorAt(i, color), 'stroke-width': 1, style: 'cursor:pointer;transition:r 100ms' });
      dot.addEventListener('mouseenter', () => dot.setAttribute('r', String(rad + 2)));
      dot.addEventListener('mouseleave', () => dot.setAttribute('r', String(rad)));
      bindTooltip(dot, tooltip, 'x: ' + xv.toFixed(1) + '  y: ' + ys[i].toFixed(1));
      svg.appendChild(dot);
    });
    // axis labels
    svg.appendChild(ns('text', { x: inner.x + inner.w / 2, y: inner.y + inner.h + 12, 'text-anchor': 'middle', class: 'grid-text' }, 'X Axis'));
    svg.appendChild(ns('text', { x: inner.x - 12, y: inner.y + inner.h / 2, 'text-anchor': 'middle', fill: MUTED, 'font-size': 8, transform: 'rotate(-90,' + (inner.x - 12) + ',' + (inner.y + inner.h / 2) + ')' }, 'Y Axis'));
  }

  // ── 12. STACKED BARS ─────────────────────────────────────────────────────
  function drawStacked(ctx, opts) {
    const { svg, color, tooltip } = ctx;
    const box = chartBox(svg);
    clear(svg);
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul'];
    const series = 3;
    const count = (opts && opts.count) || 7;
    const segs = [];
    for (let s = 0; s < series; s++) segs.push(seriesFrom({ component: ctx.component + 's' + s }, count));
    const totals = Array.from({ length: count }, (_, i) => segs.reduce((a, seg) => a + (seg[i] || 0), 0));
    const maxTotal = Math.max(...totals, 1);
    const range = valueRange([0, maxTotal]);
    const inner = drawGridShell(svg, box, { range, gridCount: 4 });
    const bw = (inner.w / count) * 0.62;
    const gap = (inner.w / count) * 0.38 / 2;
    const seriesLabels = ['Series A', 'Series B', 'Series C'];
    for (let i = 0; i < count; i++) {
      let baseY = inner.y + inner.h;
      for (let s = 0; s < series; s++) {
        const v = segs[s][i] || 5;
        const h = Math.max(2, (v / maxTotal) * inner.h);
        const y = baseY - h;
        const x = inner.x + i * (inner.w / count) + gap;
        const rect = ns('rect', { x, y, width: bw, height: h, rx: s === 0 ? 3 : 0, fill: colorAt(s + 1, color), opacity: 0.85, style: 'cursor:pointer' });
        bindTooltip(rect, tooltip, seriesLabels[s] + ' ' + months[i] + ': ' + Math.round(v));
        svg.appendChild(rect);
        baseY = y;
      }
      svg.appendChild(ns('text', { x: inner.x + i * (inner.w / count) + gap + bw / 2, y: inner.y + inner.h + 11, 'text-anchor': 'middle', class: 'grid-text' }, months[i]));
    }
    // legend
    seriesLabels.forEach((lbl, s) => {
      const lx = inner.x + s * 60;
      svg.appendChild(ns('rect', { x: lx, y: inner.y - 12, width: 8, height: 8, rx: 2, fill: colorAt(s + 1, color) }));
      svg.appendChild(ns('text', { x: lx + 11, y: inner.y - 5, fill: MUTED, 'font-size': 7.5, 'font-weight': 600 }, lbl));
    });
  }

  // ── 13. CONTROL CHART (SPC) ───────────────────────────────────────────────
  function drawControl(ctx, opts) {
    const { svg, color, tooltip } = ctx;
    const box = chartBox(svg);
    clear(svg);
    const vals = seriesFrom(ctx, 20);
    const mean = vals.reduce((a, b) => a + b, 0) / vals.length;
    const sd = Math.sqrt(vals.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / vals.length) || 5;
    const ucl = mean + 2.5 * sd, lcl = Math.max(0, mean - 2.5 * sd);
    const u1 = mean + sd, l1 = mean - sd;
    const allVals = vals.concat([ucl, lcl]);
    const range = valueRange(allVals);
    const inner = drawGridShell(svg, box, { range, gridCount: 4 });
    const pts = pointsFor(inner, vals);
    injectDefs(svg);
    // control band shading
    const uclY = yScale(inner, range, ucl);
    const lclY = yScale(inner, range, lcl);
    const u1Y = yScale(inner, range, u1);
    const l1Y = yScale(inner, range, l1);
    svg.appendChild(ns('rect', { x: inner.x, y: uclY, width: inner.w, height: lclY - uclY, fill: GOOD, opacity: 0.05 }));
    svg.appendChild(ns('rect', { x: inner.x, y: u1Y, width: inner.w, height: l1Y - u1Y, fill: GOOD, opacity: 0.06 }));
    // UCL/LCL lines
    svg.appendChild(ns('line', { x1: inner.x, y1: uclY, x2: inner.x + inner.w, y2: uclY, stroke: BAD, 'stroke-width': 1.2, 'stroke-dasharray': '4 3' }));
    svg.appendChild(ns('line', { x1: inner.x, y1: lclY, x2: inner.x + inner.w, y2: lclY, stroke: BAD, 'stroke-width': 1.2, 'stroke-dasharray': '4 3' }));
    svg.appendChild(ns('line', { x1: inner.x, y1: yScale(inner, range, mean), x2: inner.x + inner.w, y2: yScale(inner, range, mean), stroke: GOOD, 'stroke-width': 1.5, 'stroke-dasharray': '5 3' }));
    // labels
    svg.appendChild(ns('text', { x: inner.x + inner.w + 2, y: uclY + 3, fill: BAD, 'font-size': 7.5, 'font-weight': 700 }, 'UCL'));
    svg.appendChild(ns('text', { x: inner.x + inner.w + 2, y: lclY + 3, fill: BAD, 'font-size': 7.5, 'font-weight': 700 }, 'LCL'));
    svg.appendChild(ns('text', { x: inner.x + inner.w + 2, y: yScale(inner, range, mean) + 3, fill: GOOD, 'font-size': 7.5, 'font-weight': 700 }, 'CL'));
    // data line
    svg.appendChild(ns('path', { d: linePath(pts), fill: 'none', stroke: color || 'var(--color-primary,#60a5fa)', 'stroke-width': 2, 'stroke-linecap': 'round' }));
    // out-of-control points
    pts.forEach((p, i) => {
      const oc = vals[i] > ucl || vals[i] < lcl;
      const dot = ns('circle', { cx: p.x, cy: p.y, r: 3.5, fill: oc ? BAD : (color || 'var(--color-primary,#60a5fa)'), stroke: CARD, 'stroke-width': 1.5, style: 'cursor:pointer' });
      bindTooltip(dot, tooltip, 'Pt ' + (i + 1) + ': ' + vals[i].toFixed(1) + (oc ? ' ⚠ OOC' : ''));
      svg.appendChild(dot);
    });
  }

  // ── 14. BOX PLOT ──────────────────────────────────────────────────────────
  function drawBoxplot(ctx, opts) {
    const { svg, color, tooltip } = ctx;
    const box = chartBox(svg);
    clear(svg);
    const groups = (opts && opts.groups) || 5;
    const labels = (opts && opts.groupLabels) || ['Q1','Q2','Q3','Q4','Q5'].slice(0, groups);
    const allVals = [];
    const groupData = [];
    for (let g = 0; g < groups; g++) {
      const raw = seriesFrom({ component: ctx.component + '_g' + g }, 8).sort((a, b) => a - b);
      const q1 = raw[Math.floor(raw.length * 0.25)];
      const med = raw[Math.floor(raw.length * 0.5)];
      const q3 = raw[Math.floor(raw.length * 0.75)];
      const mn = raw[0], mx = raw[raw.length - 1];
      groupData.push({ q1, med, q3, mn, mx });
      allVals.push(mn, q1, med, q3, mx);
    }
    const range = valueRange(allVals.concat([0]));
    const inner = drawGridShell(svg, box, { range, gridCount: 4 });
    const slotW = inner.w / groups;
    groupData.forEach(({ q1, med, q3, mn, mx }, g) => {
      const cx2 = inner.x + (g + 0.5) * slotW;
      const bw2 = slotW * 0.46;
      const yq1 = yScale(inner, range, q1);
      const ymed = yScale(inner, range, med);
      const yq3 = yScale(inner, range, q3);
      const ymn = yScale(inner, range, mn);
      const ymx = yScale(inner, range, mx);
      // whiskers
      svg.appendChild(ns('line', { x1: cx2, y1: ymx, x2: cx2, y2: yq3, stroke: colorAt(g, color), 'stroke-width': 1.5, 'stroke-dasharray': '2 2' }));
      svg.appendChild(ns('line', { x1: cx2, y1: yq1, x2: cx2, y2: ymn, stroke: colorAt(g, color), 'stroke-width': 1.5, 'stroke-dasharray': '2 2' }));
      // whisker caps
      svg.appendChild(ns('line', { x1: cx2 - bw2 * 0.3, y1: ymx, x2: cx2 + bw2 * 0.3, y2: ymx, stroke: colorAt(g, color), 'stroke-width': 2 }));
      svg.appendChild(ns('line', { x1: cx2 - bw2 * 0.3, y1: ymn, x2: cx2 + bw2 * 0.3, y2: ymn, stroke: colorAt(g, color), 'stroke-width': 2 }));
      // IQR box
      const boxRect = ns('rect', { x: cx2 - bw2 / 2, y: Math.min(yq1, yq3), width: bw2, height: Math.max(3, Math.abs(yq3 - yq1)), rx: 3, fill: colorAt(g, color), opacity: 0.22, style: 'cursor:pointer' });
      bindTooltip(boxRect, tooltip, labels[g] + ': min=' + Math.round(mn) + ' Q1=' + Math.round(q1) + ' med=' + Math.round(med) + ' Q3=' + Math.round(q3) + ' max=' + Math.round(mx));
      svg.appendChild(boxRect);
      // median line
      svg.appendChild(ns('line', { x1: cx2 - bw2 / 2, y1: ymed, x2: cx2 + bw2 / 2, y2: ymed, stroke: TEXT, 'stroke-width': 2.5 }));
      // x label
      svg.appendChild(ns('text', { x: cx2, y: inner.y + inner.h + 11, 'text-anchor': 'middle', class: 'grid-text' }, labels[g]));
    });
  }

  // ── 15. FORECAST / PROJECTION ─────────────────────────────────────────────
  function drawProjection(ctx, opts) {
    const { svg, color, tooltip } = ctx;
    const box = chartBox(svg);
    clear(svg);
    const hist = seriesFrom(ctx, 10);
    const fut = seriesFrom({ component: ctx.component + '_f' }, 6).map(v => v * 0.75 + hist[hist.length - 1] * 0.25);
    const all = hist.concat(fut);
    const range = valueRange(all.concat([0]));
    const inner = drawGridShell(svg, box, { range, gridCount: 4 });
    injectDefs(svg);
    const ptsAll = pointsFor(inner, all);
    const ptsH = ptsAll.slice(0, hist.length);
    const ptsF = ptsAll.slice(hist.length - 1);
    // historical area
    svg.appendChild(ns('path', { d: areaPath(ptsH, inner.y + inner.h), fill: 'url(#pg)', opacity: 0.85 }));
    svg.appendChild(ns('path', { d: linePath(ptsH), fill: 'none', stroke: color || 'var(--color-primary,#60a5fa)', 'stroke-width': 2.5, 'stroke-linecap': 'round' }));
    // forecast band
    const bandUp = ptsF.map((p, i) => ({ x: p.x, y: p.y - 5 - i * 1.2, v: p.v }));
    const bandDown = ptsF.map((p, i) => ({ x: p.x, y: p.y + 5 + i * 1.2, v: p.v }));
    const bandPts = bandUp.concat([...bandDown].reverse());
    const bandD = bandPts.map((p, i) => (i === 0 ? 'M' : 'L') + p.x + ' ' + p.y).join(' ') + ' Z';
    svg.appendChild(ns('path', { d: bandD, fill: WARN, opacity: 0.12 }));
    // forecast line
    svg.appendChild(ns('path', { d: linePath(ptsF), fill: 'none', stroke: WARN, 'stroke-width': 2, 'stroke-dasharray': '5 3', 'stroke-linecap': 'round' }));
    // divider
    const divX = ptsH[ptsH.length - 1].x;
    svg.appendChild(ns('line', { x1: divX, y1: inner.y, x2: divX, y2: inner.y + inner.h, stroke: MUTED, 'stroke-width': 1, 'stroke-dasharray': '3 3', opacity: 0.6 }));
    svg.appendChild(ns('text', { x: divX + 3, y: inner.y + 9, fill: MUTED, 'font-size': 7.5, 'font-weight': 600 }, 'FORECAST →'));
    // dots
    ptsH.forEach((p, i) => {
      const dot = ns('circle', { cx: p.x, cy: p.y, r: 3, fill: color || 'var(--color-primary,#60a5fa)', stroke: CARD, 'stroke-width': 1.5, style: 'cursor:pointer' });
      bindTooltip(dot, tooltip, 'T' + (i + 1) + ': ' + Math.round(p.v));
      svg.appendChild(dot);
    });
  }

  // ── 16. GANTT / TIMELINE ──────────────────────────────────────────────────
  function drawGantt(ctx, opts) {
    const { svg, color, tooltip } = ctx;
    const box = chartBox(svg);
    clear(svg);
    const inner = drawGridShell(svg, box, { gridCount: 0 });
    const tasks = ['Plan','Design','Dev','Test','Deploy','Review'].slice(0, 6);
    const vals = seriesFrom(ctx, 6);
    const rowH = inner.h / tasks.length;
    // time axis
    ['W1','W2','W3','W4','W5','W6'].forEach((lbl, i) => {
      const x = inner.x + (i / 6) * inner.w;
      svg.appendChild(ns('line', { x1: x, y1: inner.y, x2: x, y2: inner.y + inner.h, stroke: GRID, 'stroke-width': 1 }));
      svg.appendChild(ns('text', { x: x + (inner.w / 6) / 2, y: inner.y + inner.h + 10, 'text-anchor': 'middle', class: 'grid-text' }, lbl));
    });
    tasks.forEach((task, i) => {
      const offset = (i % 3) * (inner.w / 12);
      const dur = (vals[i] % 50 + 20) / 100 * inner.w * 0.5;
      const y = inner.y + i * rowH + rowH * 0.18;
      const h = rowH * 0.58;
      // track
      svg.appendChild(ns('rect', { x: inner.x, y, width: inner.w, height: h, rx: 3, fill: GRID, opacity: 0.4 }));
      // bar
      const bar = ns('rect', { x: inner.x + offset, y, width: Math.min(dur, inner.w - offset - 2), height: h, rx: 3, fill: colorAt(i, color), opacity: 0.85, style: 'cursor:pointer' });
      bindTooltip(bar, tooltip, task + ': duration ' + Math.round(dur / inner.w * 6 * 10) / 10 + ' weeks');
      svg.appendChild(bar);
      // label on bar
      svg.appendChild(ns('text', { x: inner.x + offset + 4, y: y + h / 2 + 3.5, fill: CARD, 'font-size': 8.5, 'font-weight': 700 }, task));
    });
  }

  // ── 17. CALENDAR HEATMAP ──────────────────────────────────────────────────
  function drawCalendarHeat(ctx, opts) {
    const { svg, color, tooltip } = ctx;
    const box = chartBox(svg);
    clear(svg);
    const cols = (opts && opts.cols) || 10;
    const rows = (opts && opts.rows) || 5;
    const inner = box.inner();
    const vals = seriesFrom(ctx, cols * rows);
    const cw = (inner.w - 10) / cols;
    const ch = (inner.h - 14) / rows;
    const dayLabels = ['S','M','T','W','T','F','S'].slice(0, rows);
    const monthLabels = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct'].slice(0, cols);
    dayLabels.forEach((d, r) => {
      svg.appendChild(ns('text', { x: inner.x, y: inner.y + 14 + r * ch + ch / 2 + 3, fill: MUTED, 'font-size': 7, 'font-weight': 600 }, d));
    });
    monthLabels.forEach((m, c) => {
      if (!m) return;
      svg.appendChild(ns('text', { x: inner.x + 10 + c * cw + cw / 2, y: inner.y + 9, 'text-anchor': 'middle', fill: MUTED, 'font-size': 7, 'font-weight': 600 }, m));
    });
    for (let c = 0; c < cols; c++) {
      for (let r = 0; r < rows; r++) {
        const v = vals[c * rows + r] || 0;
        const x = inner.x + 10 + c * cw, y = inner.y + 14 + r * ch;
        const fill = v > 70 ? GOOD : v > 45 ? INFO : v > 20 ? WARN : GRID;
        const opacity = v > 5 ? 0.18 + (v / 100) * 0.75 : 0.12;
        const cell = ns('rect', { x: x + 0.5, y: y + 0.5, width: cw - 1, height: ch - 1, rx: 1.5, fill, opacity, style: 'cursor:pointer;transition:opacity 100ms' });
        cell.addEventListener('mouseenter', () => cell.setAttribute('opacity', String(Math.min(1, opacity + 0.15))));
        cell.addEventListener('mouseleave', () => cell.setAttribute('opacity', String(opacity)));
        bindTooltip(cell, tooltip, 'Day ' + (c * rows + r + 1) + ': ' + Math.round(v));
        svg.appendChild(cell);
      }
    }
  }

  // ── 18. PARETO CHART ──────────────────────────────────────────────────────
  function drawPareto(ctx, opts) {
    const { svg, color, tooltip } = ctx;
    const box = chartBox(svg);
    clear(svg);
    const labels = (opts && opts.labels) || ['Defect A','Defect B','Defect C','Defect D','Defect E','Defect F','Defect G','Defect H'].slice(0, 8);
    let vals = seriesFrom(ctx, labels.length).map((v, i) => ({ v, i })).sort((a, b) => b.v - a.v);
    const ordered = vals.map(o => o.v);
    const total = ordered.reduce((a, b) => a + b, 0) || 1;
    const range = valueRange(ordered.concat([0]));
    const inner = drawGridShell(svg, box, { range, gridCount: 4 });
    const step = inner.w / ordered.length;
    let cumPct = 0;
    const linePts = [];
    ordered.forEach((v, i) => {
      const x = inner.x + i * step + step * 0.1;
      const bh = Math.max(3, (v / range.max) * inner.h);
      const rect = ns('rect', { x, y: inner.y + inner.h - bh, width: step * 0.72, height: bh, rx: 3, fill: colorAt(i, color), opacity: 0.88, style: 'cursor:pointer' });
      bindTooltip(rect, tooltip, labels[i] + ': ' + Math.round(v) + ' (' + Math.round(v / total * 100) + '%)');
      svg.appendChild(rect);
      cumPct += v / total;
      const cy = yScale(inner, { min: 0, max: 1, range: 1 }, cumPct) * (inner.h / (inner.y + inner.h)) + inner.y * (1 - inner.h / (inner.y + inner.h));
      const cumY = inner.y + inner.h - cumPct * inner.h;
      linePts.push({ x: x + step * 0.46, y: cumY, v: cumPct });
      svg.appendChild(ns('circle', { cx: x + step * 0.46, cy: cumY, r: 2.5, fill: WARN, stroke: CARD, 'stroke-width': 1 }));
      // x label
      const shortLabel = labels[i].length > 5 ? labels[i].slice(0, 4) + '…' : labels[i];
      svg.appendChild(ns('text', { x: x + step * 0.36, y: inner.y + inner.h + 11, 'text-anchor': 'middle', class: 'grid-text' }, shortLabel));
    });
    // cumulative line
    for (let i = 1; i < linePts.length; i++) {
      svg.appendChild(ns('line', { x1: linePts[i - 1].x, y1: linePts[i - 1].y, x2: linePts[i].x, y2: linePts[i].y, stroke: WARN, 'stroke-width': 1.8 }));
    }
    // 80% reference
    const ref80Y = inner.y + inner.h * 0.2;
    svg.appendChild(ns('line', { x1: inner.x, y1: ref80Y, x2: inner.x + inner.w, y2: ref80Y, stroke: BAD, 'stroke-width': 1, 'stroke-dasharray': '3 3', opacity: 0.6 }));
    svg.appendChild(ns('text', { x: inner.x + inner.w - 2, y: ref80Y - 2, 'text-anchor': 'end', fill: BAD, 'font-size': 7.5, 'font-weight': 700 }, '80%'));
  }

  // ── 19. SANKEY / FLOW ─────────────────────────────────────────────────────
  function drawSankey(ctx, opts) {
    const { svg, color } = ctx;
    const box = chartBox(svg);
    clear(svg);
    const inner = box.inner();
    const sources = ['Revenue', 'Cost', 'Opex', 'Tax'];
    const flows = seriesFrom(ctx, 4);
    const totalFlow = flows.reduce((a, b) => a + b, 0) || 1;
    const nodeW = 12;
    // left nodes
    let leftY = inner.y;
    flows.forEach((v, i) => {
      const h = (v / totalFlow) * inner.h;
      svg.appendChild(ns('rect', { x: inner.x, y: leftY + 1, width: nodeW, height: Math.max(3, h - 2), rx: 2, fill: colorAt(i, color) }));
      svg.appendChild(ns('text', { x: inner.x + nodeW + 3, y: leftY + h / 2 + 3.5, fill: TEXT, 'font-size': 7.5, 'font-weight': 600 }, sources[i]));
      leftY += h;
    });
    // right node (combined)
    svg.appendChild(ns('rect', { x: inner.x + inner.w - nodeW, y: inner.y + 1, width: nodeW, height: inner.h - 2, rx: 2, fill: colorAt(4, color) }));
    svg.appendChild(ns('text', { x: inner.x + inner.w - nodeW - 3, y: inner.y + inner.h / 2 + 3.5, 'text-anchor': 'end', fill: TEXT, 'font-size': 7.5, 'font-weight': 600 }, 'Output'));
    // bezier flows
    let sy = inner.y;
    const ey = inner.y;
    flows.forEach((v, i) => {
      const h = (v / totalFlow) * inner.h;
      const rh = (v / totalFlow) * inner.h;
      const x0 = inner.x + nodeW, y0 = sy + h / 2;
      const x1 = inner.x + inner.w - nodeW, y1 = ey + (flows.slice(0, i).reduce((a, b) => a + b, 0) / totalFlow) * inner.h + rh / 2;
      const cpx = (x0 + x1) / 2;
      const d = 'M' + x0 + ' ' + (sy + 1) + ' C' + cpx + ' ' + (sy + 1) + ' ' + cpx + ' ' + (ey + (flows.slice(0, i).reduce((a, b) => a + b, 0) / totalFlow) * inner.h) + ' ' + (x1 - 0.5) + ' ' + (ey + (flows.slice(0, i).reduce((a, b) => a + b, 0) / totalFlow) * inner.h + 1) +
            ' L' + (x1 - 0.5) + ' ' + (ey + (flows.slice(0, i).reduce((a, b) => a + b, 0) / totalFlow) * inner.h + rh - 1) +
            ' C' + cpx + ' ' + (sy + h - 1) + ' ' + cpx + ' ' + (sy + h - 1) + ' ' + x0 + ' ' + (sy + h - 1) + ' Z';
      svg.appendChild(ns('path', { d, fill: colorAt(i, color), opacity: 0.28 }));
      sy += h;
    });
  }

  // ── 20. TREEMAP ───────────────────────────────────────────────────────────
  function drawTreemap(ctx, opts) {
    const { svg, color, tooltip } = ctx;
    const box = chartBox(svg);
    clear(svg);
    const inner = box.inner();
    const labels = (opts && opts.labels) || ['Revenue','OpEx','R&D','S&M','G&A','Profit','Tax','Other'];
    const vals = seriesFrom(ctx, labels.length);
    const total = vals.reduce((a, b) => a + b, 0) || 1;
    // squarified layout (simplified binary split)
    function layoutRect(items, rect) {
      if (!items.length) return [];
      if (items.length === 1) return [{ ...rect, ...items[0] }];
      const half = Math.ceil(items.length / 2);
      const firstSum = items.slice(0, half).reduce((a, b) => a + b.v, 0);
      const r = firstSum / items.reduce((a, b) => a + b.v, 0);
      const isWide = rect.w >= rect.h;
      if (isWide) {
        const w1 = rect.w * r;
        return [...layoutRect(items.slice(0, half), { x: rect.x, y: rect.y, w: w1, h: rect.h }),
                ...layoutRect(items.slice(half), { x: rect.x + w1, y: rect.y, w: rect.w - w1, h: rect.h })];
      } else {
        const h1 = rect.h * r;
        return [...layoutRect(items.slice(0, half), { x: rect.x, y: rect.y, w: rect.w, h: h1 }),
                ...layoutRect(items.slice(half), { x: rect.x, y: rect.y + h1, w: rect.w, h: rect.h - h1 })];
      }
    }
    const items = vals.map((v, i) => ({ v, i, label: labels[i] })).sort((a, b) => b.v - a.v);
    const rects = layoutRect(items, { x: inner.x, y: inner.y, w: inner.w, h: inner.h });
    rects.forEach(({ x, y, w, h, label, v, i }) => {
      const pad = 1.5;
      const fill = colorAt(i, color);
      const cell = ns('rect', { x: x + pad, y: y + pad, width: Math.max(2, w - pad * 2), height: Math.max(2, h - pad * 2), rx: 4, fill, opacity: 0.85, style: 'cursor:pointer;transition:opacity 120ms' });
      cell.addEventListener('mouseenter', () => cell.setAttribute('opacity', '1'));
      cell.addEventListener('mouseleave', () => cell.setAttribute('opacity', '0.85'));
      bindTooltip(cell, tooltip, label + ': ' + Math.round(v / total * 100) + '%');
      svg.appendChild(cell);
      if (w > 28 && h > 16) {
        svg.appendChild(ns('text', { x: x + w / 2, y: y + h / 2 + (h > 24 ? -3 : 3.5), 'text-anchor': 'middle', fill: CARD, 'font-size': Math.min(9, w / 7), 'font-weight': 700 }, label.length > 8 ? label.slice(0, 7) + '…' : label));
        if (h > 24) {
          svg.appendChild(ns('text', { x: x + w / 2, y: y + h / 2 + 9, 'text-anchor': 'middle', fill: CARD, 'font-size': 7, 'font-weight': 500, opacity: 0.85 }, Math.round(v / total * 100) + '%'));
        }
      }
    });
  }

  // ── 21. BULLET CHART ──────────────────────────────────────────────────────
  function drawBullet(ctx, opts) {
    const { svg, color, tooltip } = ctx;
    const box = chartBox(svg);
    clear(svg);
    const inner = box.inner();
    const metrics = (opts && opts.metrics) || ['Pipeline','Quota','Forecast','Actual'];
    const vals = seriesFrom(ctx, metrics.length);
    const rowH = inner.h / metrics.length;
    vals.forEach((v, i) => {
      const y = inner.y + i * rowH + rowH * 0.15;
      const h = rowH * 0.55;
      const maxVal = 100;
      const target = Math.min(85 + (i * 7) % 10, 100);
      const actual = clamp(v, 0, 100);
      // background zones
      [[1.0, '#e2e8f0'], [0.75, '#d1d5db'], [0.5, '#9ca3af']].forEach(([f, bg]) => {
        svg.appendChild(ns('rect', { x: inner.x + 44, y, width: (inner.w - 44) * f, height: h, rx: 2, fill: bg, opacity: 0.35 }));
      });
      // actual bar
      const actW = (actual / maxVal) * (inner.w - 44);
      const bar = ns('rect', { x: inner.x + 44, y: y + h * 0.25, width: Math.max(3, actW), height: h * 0.5, rx: 2, fill: colorAt(i, color), style: 'cursor:pointer' });
      bindTooltip(bar, tooltip, metrics[i] + ': ' + Math.round(actual) + '% (target ' + target + '%)');
      svg.appendChild(bar);
      // target line
      const tx = inner.x + 44 + (target / maxVal) * (inner.w - 44);
      svg.appendChild(ns('line', { x1: tx, y1: y + 1, x2: tx, y2: y + h - 1, stroke: TEXT, 'stroke-width': 2.5 }));
      // label
      svg.appendChild(ns('text', { x: inner.x + 40, y: y + h / 2 + 3.5, 'text-anchor': 'end', fill: MUTED, 'font-size': 8, 'font-weight': 600 }, metrics[i]));
    });
  }

  // ── 22. PROGRESS RING ─────────────────────────────────────────────────────
  function drawRing(ctx, opts) {
    const { svg, color, tooltip } = ctx;
    const box = chartBox(svg);
    clear(svg);
    const val = clamp(numberFrom(ctx.value, seriesFrom(ctx, 1)[0]), 0, 100);
    const cx = box.w / 2, cy = box.h / 2 + 4;
    const r = Math.min(box.w, box.h) * 0.33;
    const sw = 12;
    // bg ring
    svg.appendChild(ns('circle', { cx, cy, r, fill: 'none', stroke: GRID, 'stroke-width': sw + 2 }));
    svg.appendChild(ns('circle', { cx, cy, r, fill: 'none', stroke: GRID, 'stroke-width': sw }));
    // value arc
    const end = -Math.PI / 2 + (val / 100) * Math.PI * 2;
    const strokeC = color || (val > 75 ? GOOD : val > 45 ? WARN : BAD);
    const arc = ns('path', { d: arcPath(cx, cy, r, -Math.PI / 2, end), fill: 'none', stroke: strokeC, 'stroke-width': sw, 'stroke-linecap': 'round', style: 'cursor:pointer' });
    bindTooltip(arc, tooltip, 'Progress: ' + Math.round(val) + '%');
    svg.appendChild(arc);
    // glow effect (duplicated thin line)
    if (val > 0) {
      svg.appendChild(ns('path', { d: arcPath(cx, cy, r, -Math.PI / 2, end), fill: 'none', stroke: strokeC, 'stroke-width': sw - 4, 'stroke-linecap': 'round', opacity: 0.25 }));
    }
    // center text
    svg.appendChild(ns('text', { x: cx, y: cy - 3, 'text-anchor': 'middle', fill: TEXT, 'font-size': 18, 'font-weight': 800 }, Math.round(val) + '%'));
    svg.appendChild(ns('text', { x: cx, y: cy + 12, 'text-anchor': 'middle', fill: MUTED, 'font-size': 8, 'font-weight': 600, 'letter-spacing': '0.04em' }, (opts && opts.label) || 'PROGRESS'));
  }

  // ── 23. HISTOGRAM ─────────────────────────────────────────────────────────
  function drawHistogram(ctx, opts) {
    const { svg, color, tooltip } = ctx;
    const box = chartBox(svg);
    clear(svg);
    const vals = seriesFrom(ctx, 30);
    const bins = (opts && opts.bins) || 9;
    const counts = Array(bins).fill(0);
    const rng = valueRange(vals);
    vals.forEach(v => {
      let b = Math.floor(((v - rng.min) / (rng.range || 1)) * bins);
      b = clamp(b, 0, bins - 1);
      counts[b]++;
    });
    const maxC = Math.max(...counts, 1);
    const countRange = valueRange(counts.concat([0]));
    const inner = drawGridShell(svg, box, { range: countRange, gridCount: 4 });
    injectDefs(svg);
    const bw = inner.w / bins;
    const pad = bw * 0.08;
    // normal curve overlay
    const curvePts = Array.from({ length: 60 }, (_, k) => {
      const x = rng.min + (k / 59) * rng.range;
      const y = Math.exp(-0.5 * ((x - (rng.min + rng.range / 2)) / (rng.range / 4)) ** 2);
      const cx2 = inner.x + ((x - rng.min) / rng.range) * inner.w;
      const cy2 = inner.y + inner.h - y * inner.h * 0.88;
      return { x: cx2, y: cy2 };
    });
    counts.forEach((c, i) => {
      const h = Math.max(2, (c / maxC) * inner.h * 0.9);
      const x = inner.x + i * bw + pad;
      const rect = ns('rect', { x, y: inner.y + inner.h - h, width: bw - pad * 2, height: h, rx: 3, fill: color || 'var(--color-primary,#60a5fa)', opacity: 0.82, style: 'cursor:pointer;transition:opacity 120ms' });
      rect.addEventListener('mouseenter', () => rect.setAttribute('opacity', '1'));
      rect.addEventListener('mouseleave', () => rect.setAttribute('opacity', '0.82'));
      const rangeStart = (rng.min + (i / bins) * rng.range).toFixed(1);
      const rangeEnd = (rng.min + ((i + 1) / bins) * rng.range).toFixed(1);
      bindTooltip(rect, tooltip, rangeStart + '–' + rangeEnd + ': ' + c + ' items');
      svg.appendChild(rect);
    });
    // bell curve
    svg.appendChild(ns('path', { d: curvePath(curvePts), fill: 'none', stroke: WARN, 'stroke-width': 1.5, 'stroke-dasharray': '3 2', opacity: 0.7 }));
  }

  // ── 24. MULTI-LINE / SPARKLINES ───────────────────────────────────────────
  function drawMultiLine(ctx, opts) {
    const { svg, color, tooltip } = ctx;
    const box = chartBox(svg);
    clear(svg);
    const seriesCount = (opts && opts.series) || 3;
    const count = (opts && opts.count) || 16;
    const allVals = [];
    const seriesData = [];
    for (let s = 0; s < seriesCount; s++) {
      const vals = seriesFrom({ component: ctx.component + '_s' + s }, count);
      seriesData.push(vals);
      allVals.push(...vals);
    }
    const range = valueRange(allVals);
    const inner = drawGridShell(svg, box, { range, gridCount: 4 });
    injectDefs(svg);
    const seriesLabels = (opts && opts.labels) || ['Series A', 'Series B', 'Series C'];
    seriesData.forEach((vals, s) => {
      const pts = vals.map((v, i) => ({ x: xScale(inner, vals.length, i), y: yScale(inner, range, v), v }));
      const stroke = colorAt(s + 1, color);
      // area under first series
      if (s === 0) {
        const gradId = s === 0 ? 'pg' : s === 1 ? 'tg' : 'gg';
        svg.appendChild(ns('path', { d: areaPath(pts, inner.y + inner.h), fill: 'url(#' + gradId + ')', opacity: 0.5 }));
      }
      svg.appendChild(ns('path', { d: linePath(pts), fill: 'none', stroke, 'stroke-width': 2, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }));
      // last dot
      const last = pts[pts.length - 1];
      svg.appendChild(ns('circle', { cx: last.x, cy: last.y, r: 3.5, fill: stroke, stroke: CARD, 'stroke-width': 1.5 }));
    });
    // legend
    seriesLabels.forEach((lbl, s) => {
      const lx = inner.x + s * 70;
      svg.appendChild(ns('line', { x1: lx, y1: inner.y - 8, x2: lx + 12, y2: inner.y - 8, stroke: colorAt(s + 1, color), 'stroke-width': 2, 'stroke-linecap': 'round' }));
      svg.appendChild(ns('text', { x: lx + 15, y: inner.y - 5, fill: MUTED, 'font-size': 7.5, 'font-weight': 600 }, lbl));
    });
  }

  // ── 25. STEP / AREA STEP ──────────────────────────────────────────────────
  function drawStepArea(ctx, opts) {
    const { svg, color, tooltip } = ctx;
    const box = chartBox(svg);
    clear(svg);
    const vals = seriesFrom(ctx, 12);
    const range = valueRange(vals.concat([0]));
    const inner = drawGridShell(svg, box, { range, gridCount: 4 });
    injectDefs(svg);
    const stroke = color || 'var(--color-info,#22d3ee)';
    // step path
    let d = '';
    const pts = vals.map((v, i) => ({ x: xScale(inner, vals.length, i), y: yScale(inner, range, v), v }));
    pts.forEach((p, i) => {
      if (i === 0) { d += 'M' + p.x + ' ' + p.y; }
      else { d += ' H' + p.x + ' V' + p.y; }
    });
    const aD = d + ' H' + pts[pts.length - 1].x + ' V' + (inner.y + inner.h) + ' H' + inner.x + ' Z';
    svg.appendChild(ns('path', { d: aD, fill: 'url(#tg)', opacity: 0.9 }));
    svg.appendChild(ns('path', { d, fill: 'none', stroke, 'stroke-width': 2.5, 'stroke-linecap': 'square' }));
    pts.forEach((p, i) => {
      const dot = ns('circle', { cx: p.x, cy: p.y, r: 3.5, fill: stroke, stroke: CARD, 'stroke-width': 1.5, style: 'cursor:pointer' });
      bindTooltip(dot, tooltip, 'T' + (i + 1) + ': ' + Math.round(p.v));
      svg.appendChild(dot);
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  function applyInteractionSignature(ctx, opts, index) {
    const svg = ctx && ctx.svg;
    if (!svg || !opts) return;
    const box = chartBox(svg);
    const mode = sanitizeText(opts.interaction || 'inspect', 48);
    const category = sanitizeText(opts.category || 'Chart', 48);
    const color = colorAt(index || 0, ctx.color);
    const chipW = Math.min(168, Math.max(86, 34 + mode.length * 5.6));
    const chipH = 18;
    const pad = 8;
    const x = index % 2 === 0 ? box.w - chipW - pad : pad;
    const y = index % 3 === 0 ? pad : box.h - chipH - pad;
    const group = ns('g', {
      class: 'interaction-signature',
      tabindex: '0',
      role: 'button',
      'aria-label': category + ': ' + mode,
      style: 'cursor:pointer;outline:none'
    });
    const bg = ns('rect', {
      x, y, width: chipW, height: chipH, rx: 5,
      fill: CARD, stroke: color, 'stroke-width': 1, opacity: 0.92
    });
    const glyphs = ['+', 'x', '/', '<>', '[]', 'o', '||', '~', '^', '#'];
    const glyph = glyphs[index % glyphs.length];
    const mark = ns('text', {
      x: x + 8, y: y + 12.5, fill: color, 'font-size': 9,
      'font-weight': 800, 'font-family': 'system-ui, sans-serif'
    }, glyph);
    const label = ns('text', {
      x: x + 25, y: y + 12.5, fill: TEXT, 'font-size': 8.5,
      'font-weight': 700, 'font-family': 'system-ui, sans-serif'
    }, mode);

    group.appendChild(bg);
    group.appendChild(mark);
    group.appendChild(label);
    svg.appendChild(group);

    let active = false;
    function setActive(next) {
      active = next;
      bg.setAttribute('fill', active ? color : CARD);
      bg.setAttribute('opacity', active ? '0.16' : '0.92');
      mark.setAttribute('fill', active ? TEXT : color);
      if (ctx.tooltip) {
        const text = active ? category + ' ' + mode + ' locked' : category + ' ' + mode;
        tip(ctx.tooltip, text, x + 4, Math.max(4, y - 24));
      }
    }

    group.addEventListener('mouseenter', () => {
      bg.setAttribute('stroke-width', '2');
      label.textContent = mode;
      if (ctx.tooltip) tip(ctx.tooltip, category + ' interaction: ' + mode, x + 4, Math.max(4, y - 24));
    });
    group.addEventListener('mouseleave', () => {
      bg.setAttribute('stroke-width', '1');
      hideTip(ctx.tooltip);
    });
    group.addEventListener('click', () => setActive(!active));

    const channel = index % 5;
    if (channel === 0) {
      group.addEventListener('pointermove', (event) => {
        const local = event.offsetX || x + chipW / 2;
        mark.textContent = local > box.w / 2 ? '>' : '<';
      });
    } else if (channel === 1) {
      group.addEventListener('dblclick', () => {
        label.textContent = active ? mode : category.slice(0, 16);
      });
    } else if (channel === 2) {
      group.addEventListener('wheel', (event) => {
        event.preventDefault();
        bg.setAttribute('opacity', event.deltaY < 0 ? '1' : '0.5');
      }, { passive: false });
    } else if (channel === 3) {
      group.addEventListener('pointerdown', () => {
        bg.setAttribute('width', Math.max(64, chipW - 18));
      });
      group.addEventListener('pointerup', () => {
        bg.setAttribute('width', chipW);
      });
    } else {
      group.addEventListener('focus', () => {
        bg.setAttribute('stroke-dasharray', '3 2');
      });
      group.addEventListener('blur', () => {
        bg.removeAttribute('stroke-dasharray');
      });
    }
  }

  // === 50 CATALOG PAINTERS (5 categories x 10) ===
  PAINTERS.customerJourneySankey = function (ctx) { const opts = { title: 'Customer Journey Sankey', category: 'Flow Intelligence', interaction: 'pulse-route', count: 7 }; drawSankey(ctx, opts); applyInteractionSignature(ctx, opts, 0); };
  PAINTERS.revenueStreamTreemap = function (ctx) { const opts = { title: 'Revenue Stream Treemap', category: 'Flow Intelligence', interaction: 'tile-inspect', count: 8 }; drawTreemap(ctx, opts); applyInteractionSignature(ctx, opts, 1); };
  PAINTERS.channelMixDonut = function (ctx) { const opts = { title: 'Channel Mix Donut', category: 'Flow Intelligence', interaction: 'slice-focus', count: 7, center: 'CHANNE', thin: true }; drawDonut(ctx, opts); applyInteractionSignature(ctx, opts, 2); };
  PAINTERS.conversionPathFunnel = function (ctx) { const opts = { title: 'Conversion Path Funnel', category: 'Flow Intelligence', interaction: 'stage-lift', labels: ["Enter","Qualify","Commit","Review","Approve","Launch"] }; drawFunnel(ctx, opts); applyInteractionSignature(ctx, opts, 3); };
  PAINTERS.supplyChainGantt = function (ctx) { const opts = { title: 'Supply Chain Gantt', category: 'Flow Intelligence', interaction: 'lane-scrub', count: 11 }; drawGantt(ctx, opts); applyInteractionSignature(ctx, opts, 4); };
  PAINTERS.dependencyRadar = function (ctx) { const opts = { title: 'Dependency Radar', category: 'Flow Intelligence', interaction: 'axis-pin', axes: 7 }; drawRadar(ctx, opts); applyInteractionSignature(ctx, opts, 5); };
  PAINTERS.allocationWaterfall = function (ctx) { const opts = { title: 'Allocation Waterfall', category: 'Flow Intelligence', interaction: 'bridge-step', count: 13 }; drawWaterfall(ctx, opts); applyInteractionSignature(ctx, opts, 6); };
  PAINTERS.segmentBridgePareto = function (ctx) { const opts = { title: 'Segment Bridge Pareto', category: 'Flow Intelligence', interaction: 'rank-sweep', count: 6 }; drawPareto(ctx, opts); applyInteractionSignature(ctx, opts, 7); };
  PAINTERS.productAdoptionStack = function (ctx) { const opts = { title: 'Product Adoption Stack', category: 'Flow Intelligence', interaction: 'layer-peel', count: 7 }; drawStacked(ctx, opts); applyInteractionSignature(ctx, opts, 8); };
  PAINTERS.workflowStepArea = function (ctx) { const opts = { title: 'Workflow Step Area', category: 'Flow Intelligence', interaction: 'step-toggle', count: 8 }; drawStepArea(ctx, opts); applyInteractionSignature(ctx, opts, 9); };
  PAINTERS.demandForecastProjection = function (ctx) { const opts = { title: 'Demand Forecast Projection', category: 'Signal Exploration', interaction: 'forecast-drag', count: 9 }; drawProjection(ctx, opts); applyInteractionSignature(ctx, opts, 10); };
  PAINTERS.anomalyBandControl = function (ctx) { const opts = { title: 'Anomaly Band Control', category: 'Signal Exploration', interaction: 'limit-brush', count: 10 }; drawControl(ctx, opts); applyInteractionSignature(ctx, opts, 11); };
  PAINTERS.cohortRetentionHeatmap = function (ctx) { const opts = { title: 'Cohort Retention Heatmap', category: 'Signal Exploration', interaction: 'cell-lens', cols: 9, rows: 5 }; drawCalendarHeat(ctx, opts); applyInteractionSignature(ctx, opts, 12); };
  PAINTERS.marketPulseLine = function (ctx) { const opts = { title: 'Market Pulse Line', category: 'Signal Exploration', interaction: 'crosshair-hover', count: 14, stroke: '#7c3aed' }; drawAreaLine(ctx, opts); applyInteractionSignature(ctx, opts, 13); };
  PAINTERS.sensorDriftScatter = function (ctx) { const opts = { title: 'Sensor Drift Scatter', category: 'Signal Exploration', interaction: 'point-cluster', count: 13 }; drawScatter(ctx, opts); applyInteractionSignature(ctx, opts, 14); };
  PAINTERS.qualityHistogram = function (ctx) { const opts = { title: 'Quality Histogram', category: 'Signal Exploration', interaction: 'bin-zoom', bins: 7 }; drawHistogram(ctx, opts); applyInteractionSignature(ctx, opts, 15); };
  PAINTERS.scenarioSensitivityMultiLine = function (ctx) { const opts = { title: 'Scenario Sensitivity Multi Line', category: 'Signal Exploration', interaction: 'series-solo', count: 15, series: 3, labels: ["Base","Stress","Upside"] }; drawMultiLine(ctx, opts); applyInteractionSignature(ctx, opts, 16); };
  PAINTERS.volatilityBoxplot = function (ctx) { const opts = { title: 'Volatility Boxplot', category: 'Signal Exploration', interaction: 'quartile-read', groups: 4 }; drawBoxplot(ctx, opts); applyInteractionSignature(ctx, opts, 17); };
  PAINTERS.growthCurveArea = function (ctx) { const opts = { title: 'Growth Curve Area', category: 'Signal Exploration', interaction: 'curve-reveal', count: 19, stroke: BAD }; drawAreaLine(ctx, opts); applyInteractionSignature(ctx, opts, 18); };
  PAINTERS.thresholdRing = function (ctx) { const opts = { title: 'Threshold Ring', category: 'Signal Exploration', interaction: 'arc-threshold', label: 'THRESHOLD' }; drawRing(ctx, opts); applyInteractionSignature(ctx, opts, 19); };
  PAINTERS.complianceObligationMatrix = function (ctx) { const opts = { title: 'Compliance Obligation Matrix', category: 'Risk And Controls', interaction: 'matrix-select', cols: 6, rows: 4 }; drawMatrix(ctx, opts); applyInteractionSignature(ctx, opts, 20); };
  PAINTERS.incidentSeverityPareto = function (ctx) { const opts = { title: 'Incident Severity Pareto', category: 'Risk And Controls', interaction: 'severity-drill', count: 12 }; drawPareto(ctx, opts); applyInteractionSignature(ctx, opts, 21); };
  PAINTERS.accessPostureRadar = function (ctx) { const opts = { title: 'Access Posture Radar', category: 'Risk And Controls', interaction: 'control-spoke', axes: 8 }; drawRadar(ctx, opts); applyInteractionSignature(ctx, opts, 22); };
  PAINTERS.riskAppetiteGauge = function (ctx) { const opts = { title: 'Risk Appetite Gauge', category: 'Risk And Controls', interaction: 'needle-read', sub: 'appetite score', suffix: '%' }; drawGauge(ctx, opts); applyInteractionSignature(ctx, opts, 23); };
  PAINTERS.auditFindingWaterfall = function (ctx) { const opts = { title: 'Audit Finding Waterfall', category: 'Risk And Controls', interaction: 'finding-step', count: 7 }; drawWaterfall(ctx, opts); applyInteractionSignature(ctx, opts, 24); };
  PAINTERS.controlCoverageBullet = function (ctx) { const opts = { title: 'Control Coverage Bullet', category: 'Risk And Controls', interaction: 'target-slide', metrics: ["Plan","Actual","Risk","Gap"] }; drawBullet(ctx, opts); applyInteractionSignature(ctx, opts, 25); };
  PAINTERS.fraudPatternScatter = function (ctx) { const opts = { title: 'Fraud Pattern Scatter', category: 'Risk And Controls', interaction: 'pattern-lasso', count: 9 }; drawScatter(ctx, opts); applyInteractionSignature(ctx, opts, 26); };
  PAINTERS.policyExceptionHeatmap = function (ctx) { const opts = { title: 'Policy Exception Heatmap', category: 'Risk And Controls', interaction: 'exception-peek', cols: 9, rows: 4 }; drawCalendarHeat(ctx, opts); applyInteractionSignature(ctx, opts, 27); };
  PAINTERS.exposureLimitBars = function (ctx) { const opts = { title: 'Exposure Limit Bars', category: 'Risk And Controls', interaction: 'limit-compare', count: 9 }; drawHBar(ctx, opts); applyInteractionSignature(ctx, opts, 28); };
  PAINTERS.breachRateRing = function (ctx) { const opts = { title: 'Breach Rate Ring', category: 'Risk And Controls', interaction: 'breach-scan', label: 'BREACH' }; drawRing(ctx, opts); applyInteractionSignature(ctx, opts, 29); };
  PAINTERS.uptimeKpiSpark = function (ctx) { const opts = { title: 'Uptime Kpi Spark', category: 'Operating Pulse', interaction: 'spark-scrub', defaultValue: '96', defaultChange: '+0.4 sigma', stroke: GOOD }; drawKpi(ctx, opts); applyInteractionSignature(ctx, opts, 30); };
  PAINTERS.queueDepthBars = function (ctx) { const opts = { title: 'Queue Depth Bars', category: 'Operating Pulse', interaction: 'bar-press', count: 10, square: true }; drawBars(ctx, opts); applyInteractionSignature(ctx, opts, 31); };
  PAINTERS.latencyControlChart = function (ctx) { const opts = { title: 'Latency Control Chart', category: 'Operating Pulse', interaction: 'latency-band', count: 7 }; drawControl(ctx, opts); applyInteractionSignature(ctx, opts, 32); };
  PAINTERS.capacityStackedTrend = function (ctx) { const opts = { title: 'Capacity Stacked Trend', category: 'Operating Pulse', interaction: 'capacity-stack', count: 8 }; drawStacked(ctx, opts); applyInteractionSignature(ctx, opts, 33); };
  PAINTERS.releaseTrainGantt = function (ctx) { const opts = { title: 'Release Train Gantt', category: 'Operating Pulse', interaction: 'release-hover', count: 9 }; drawGantt(ctx, opts); applyInteractionSignature(ctx, opts, 34); };
  PAINTERS.serviceHealthMatrix = function (ctx) { const opts = { title: 'Service Health Matrix', category: 'Operating Pulse', interaction: 'health-cell', cols: 5, rows: 4 }; drawMatrix(ctx, opts); applyInteractionSignature(ctx, opts, 35); };
  PAINTERS.errorBudgetLine = function (ctx) { const opts = { title: 'Error Budget Line', category: 'Operating Pulse', interaction: 'budget-marker', count: 13, stroke: '#0891b2' }; drawAreaLine(ctx, opts); applyInteractionSignature(ctx, opts, 36); };
  PAINTERS.throughputHistogram = function (ctx) { const opts = { title: 'Throughput Histogram', category: 'Operating Pulse', interaction: 'throughput-bin', bins: 9 }; drawHistogram(ctx, opts); applyInteractionSignature(ctx, opts, 37); };
  PAINTERS.workforceUtilizationHBars = function (ctx) { const opts = { title: 'Workforce Utilization HBars', category: 'Operating Pulse', interaction: 'team-compare', count: 9 }; drawHBar(ctx, opts); applyInteractionSignature(ctx, opts, 38); };
  PAINTERS.burnRateKpi = function (ctx) { const opts = { title: 'Burn Rate Kpi', category: 'Operating Pulse', interaction: 'runway-spark', defaultValue: '99.98%', defaultChange: '+2.4% WoW', stroke: WARN }; drawKpi(ctx, opts); applyInteractionSignature(ctx, opts, 39); };
  PAINTERS.priceElasticityScatter = function (ctx) { const opts = { title: 'Price Elasticity Scatter', category: 'Decision Surfaces', interaction: 'elasticity-drag', count: 7 }; drawScatter(ctx, opts); applyInteractionSignature(ctx, opts, 40); };
  PAINTERS.portfolioOptimizationRadar = function (ctx) { const opts = { title: 'Portfolio Optimization Radar', category: 'Decision Surfaces', interaction: 'portfolio-weight', axes: 7 }; drawRadar(ctx, opts); applyInteractionSignature(ctx, opts, 41); };
  PAINTERS.budgetTradeoffWaterfall = function (ctx) { const opts = { title: 'Budget Tradeoff Waterfall', category: 'Decision Surfaces', interaction: 'tradeoff-step', count: 9 }; drawWaterfall(ctx, opts); applyInteractionSignature(ctx, opts, 42); };
  PAINTERS.prioritizationTreemap = function (ctx) { const opts = { title: 'Prioritization Treemap', category: 'Decision Surfaces', interaction: 'priority-tile', count: 10 }; drawTreemap(ctx, opts); applyInteractionSignature(ctx, opts, 43); };
  PAINTERS.strategyFunnel = function (ctx) { const opts = { title: 'Strategy Funnel', category: 'Decision Surfaces', interaction: 'strategy-stage', labels: ["Enter","Qualify","Commit","Review","Approve","Launch"] }; drawFunnel(ctx, opts); applyInteractionSignature(ctx, opts, 44); };
  PAINTERS.forecastConfidenceBoxplot = function (ctx) { const opts = { title: 'Forecast Confidence Boxplot', category: 'Decision Surfaces', interaction: 'confidence-range', groups: 5 }; drawBoxplot(ctx, opts); applyInteractionSignature(ctx, opts, 45); };
  PAINTERS.opportunityPareto = function (ctx) { const opts = { title: 'Opportunity Pareto', category: 'Decision Surfaces', interaction: 'opportunity-rank', count: 13 }; drawPareto(ctx, opts); applyInteractionSignature(ctx, opts, 46); };
  PAINTERS.investmentMixDonut = function (ctx) { const opts = { title: 'Investment Mix Donut', category: 'Decision Surfaces', interaction: 'mix-rotate', count: 4, center: 'INVEST' }; drawDonut(ctx, opts); applyInteractionSignature(ctx, opts, 47); };
  PAINTERS.planVsActualBullet = function (ctx) { const opts = { title: 'Plan Vs Actual Bullet', category: 'Decision Surfaces', interaction: 'actual-target', metrics: ["Plan","Actual","Risk","Gap"] }; drawBullet(ctx, opts); applyInteractionSignature(ctx, opts, 48); };
  PAINTERS.scenarioOutcomeProjection = function (ctx) { const opts = { title: 'Scenario Outcome Projection', category: 'Decision Surfaces', interaction: 'outcome-slider', count: 8 }; drawProjection(ctx, opts); applyInteractionSignature(ctx, opts, 49); };

  PAINTERS.barsFallback   = function(ctx) { drawBars(ctx, { count: 8, title: 'Data' }); };

  const KIND_MAP = {"CustomerJourneySankey":"customerJourneySankey","RevenueStreamTreemap":"revenueStreamTreemap","ChannelMixDonut":"channelMixDonut","ConversionPathFunnel":"conversionPathFunnel","SupplyChainGantt":"supplyChainGantt","DependencyRadar":"dependencyRadar","AllocationWaterfall":"allocationWaterfall","SegmentBridgePareto":"segmentBridgePareto","ProductAdoptionStack":"productAdoptionStack","WorkflowStepArea":"workflowStepArea","DemandForecastProjection":"demandForecastProjection","AnomalyBandControl":"anomalyBandControl","CohortRetentionHeatmap":"cohortRetentionHeatmap","MarketPulseLine":"marketPulseLine","SensorDriftScatter":"sensorDriftScatter","QualityHistogram":"qualityHistogram","ScenarioSensitivityMultiLine":"scenarioSensitivityMultiLine","VolatilityBoxplot":"volatilityBoxplot","GrowthCurveArea":"growthCurveArea","ThresholdRing":"thresholdRing","ComplianceObligationMatrix":"complianceObligationMatrix","IncidentSeverityPareto":"incidentSeverityPareto","AccessPostureRadar":"accessPostureRadar","RiskAppetiteGauge":"riskAppetiteGauge","AuditFindingWaterfall":"auditFindingWaterfall","ControlCoverageBullet":"controlCoverageBullet","FraudPatternScatter":"fraudPatternScatter","PolicyExceptionHeatmap":"policyExceptionHeatmap","ExposureLimitBars":"exposureLimitBars","BreachRateRing":"breachRateRing","UptimeKpiSpark":"uptimeKpiSpark","QueueDepthBars":"queueDepthBars","LatencyControlChart":"latencyControlChart","CapacityStackedTrend":"capacityStackedTrend","ReleaseTrainGantt":"releaseTrainGantt","ServiceHealthMatrix":"serviceHealthMatrix","ErrorBudgetLine":"errorBudgetLine","ThroughputHistogram":"throughputHistogram","WorkforceUtilizationHBars":"workforceUtilizationHBars","BurnRateKpi":"burnRateKpi","PriceElasticityScatter":"priceElasticityScatter","PortfolioOptimizationRadar":"portfolioOptimizationRadar","BudgetTradeoffWaterfall":"budgetTradeoffWaterfall","PrioritizationTreemap":"prioritizationTreemap","StrategyFunnel":"strategyFunnel","ForecastConfidenceBoxplot":"forecastConfidenceBoxplot","OpportunityPareto":"opportunityPareto","InvestmentMixDonut":"investmentMixDonut","PlanVsActualBullet":"planVsActualBullet","ScenarioOutcomeProjection":"scenarioOutcomeProjection"};

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
