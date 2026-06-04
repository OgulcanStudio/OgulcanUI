/**
 * Enterprise-grade security criteria — 100% component coverage.
 * Static CSP & sink analysis + runtime attribute XSS injection.
 */

const contract = require('./component-contract');

/** OWASP-style payloads for attribute → DOM reflection tests */
const XSS_PAYLOADS = [
  '<script>alert(1)</script>',
  '<img src=x onerror=alert(1)>',
  '"><svg/onload=alert(1)>',
  "javascript:alert(1)",
  "'-alert(1)-'",
  '<iframe src="javascript:alert(1)">',
  '{{constructor.constructor("return this")()}}',
  '\u003cimg src=x onerror=alert(1)\u003e',
  '\x3cscript\x3ealert(1)\x3c/script\x3e',
  '＜script＞alert(1)＜/script＞',
  '<svg><animate onbegin=alert(1) attributeName=x dur=1s>',
  '<math><mi//xlink:href="data:x,<script>alert(1)</script>">',
  '"><img src=x onerror=&#97;lert(1)>',
  '<body onpageshow=alert(1)>',
  '<isindex action="javascript:alert(1)">'
];

const STRUCTURED_XSS_PAYLOAD = '<img src=x onerror=alert(1)>';

const BANNED_JS_PATTERNS = [
  { re: /\beval\s*\(/, name: 'eval()', desc: 'eval() violates CSP and enables code injection.' },
  { re: /\bnew\s+Function\s*\(/, name: 'Function constructor', desc: 'new Function() is equivalent to eval.' },
  { re: /document\.write\s*\(/, name: 'document.write', desc: 'document.write() enables DOM takeover.' },
  { re: /\.insertAdjacentHTML\s*\(/, name: 'insertAdjacentHTML', desc: 'Use textContent or escaped templates only.' },
  { re: /document\.createElement\s*\(\s*['"]script['"]/i, name: 'dynamic script tag', desc: 'Do not inject <script> elements at runtime.' },
  { re: /setTimeout\s*\(\s*['"`]/, name: 'string setTimeout', desc: 'setTimeout with string argument is eval-like.' },
  { re: /setInterval\s*\(\s*['"`]/, name: 'string setInterval', desc: 'setInterval with string argument is eval-like.' },
  { re: /\blocalStorage\b|\bsessionStorage\b|\bindexedDB\b/, name: 'Web Storage API', desc: 'No localStorage/sessionStorage/indexedDB in UI primitives (PCI isolation).' },
  { re: /\bpostMessage\s*\([^)]*\)(?![\s\S]{0,200}origin)/, name: 'postMessage without origin', desc: 'postMessage must validate event.origin.' },
  { re: /\bfetch\s*\(\s*['"`]https?:\/\//i, name: 'hardcoded remote fetch', desc: 'Components must not call remote URLs (supply-chain / data exfiltration).' },
  { re: /\bWebSocket\s*\(/, name: 'WebSocket', desc: 'No WebSocket in presentational components.' },
  { re: /\bnavigator\.sendBeacon\b/, name: 'sendBeacon', desc: 'No beacon exfiltration from UI widgets.' },
  { re: /__proto__|constructor\s*\[\s*['"]prototype['"]\s*\]/, name: 'prototype pollution', desc: 'Avoid __proto__ / prototype manipulation.' },
  { re: /\.outerHTML\s*=/, name: 'outerHTML assignment', desc: 'outerHTML assignment can replace host tree — use shadow textContent/escapeHtml.' },
  { re: /document\.cookie\b/, name: 'document.cookie', desc: 'No cookie access in UI primitives (session fixation / exfiltration).' },
  { re: /navigator\.clipboard\b/, name: 'navigator.clipboard', desc: 'Clipboard APIs are blocked in banking UI widgets.' },
  { re: /\bimport\s*\(/, name: 'dynamic import()', desc: 'No dynamic import() in components (supply-chain injection).' },
  { re: /\bWorker\s*\(/, name: 'Worker', desc: 'No Worker threads in presentational components.' },
  { re: /\.setAttribute\s*\(\s*['"]on/i, name: 'setAttribute event handler', desc: 'Never set on* attributes from code — XSS vector.' },
  { re: /window\.open\s*\(/, name: 'window.open', desc: 'window.open requires noopener/noreferrer validation.' },
  { re: /srcdoc\s*=/i, name: 'srcdoc', desc: 'srcdoc can embed HTML scripts — forbidden.' },
  { re: /contenteditable/i, name: 'contenteditable', desc: 'contenteditable expands XSS surface in regulated UIs.' },
  { re: /data:text\/html/i, name: 'data:text/html', desc: 'data:text/html URLs can execute script in legacy engines.' }
];

const BANNED_HTML_PATTERNS = [
  { re: /<script/i, name: 'script in template', desc: 'index.html must not contain <script>.' },
  { re: /\bon[a-z]+\s*=/i, name: 'inline event handler', desc: 'Bind events in index.js only.' },
  { re: /<iframe/i, name: 'iframe in template', desc: 'iframes require sandbox — not allowed in templates.' },
  { re: /javascript:/i, name: 'javascript: URL', desc: 'javascript: URLs forbidden in templates.' },
  { re: /<foreignObject/i, name: 'foreignObject', desc: 'SVG foreignObject can embed HTML script.' },
  { re: /data:text\/html/i, name: 'data:text/html in template', desc: 'data:text/html href/src forbidden.' }
];

const BANNED_CSS_PATTERNS = [
  { re: /@import\s+url\(\s*['"]?https?:/i, name: 'remote @import', desc: 'No remote stylesheet imports.' },
  { re: /expression\s*\(/i, name: 'IE expression()', desc: 'CSS expression() is a legacy script vector.' },
  { re: /behavior\s*:\s*url/i, name: 'CSS behavior', desc: 'behavior:url is a legacy script vector.' }
];

const ESCAPE_MARKERS = [
  /\bescapeHtml\s*\(/,
  /\b_htmlEncode\s*\(/,
  /\bencodeHTML\s*\(/,
  /\bsanitizeText\s*\(/,
  /textContent\s*=/,
  /createTextNode\s*\(/
];

const USER_DATA_MARKERS = [
  /getAttribute\s*\(/,
  /this\._[a-zA-Z][a-zA-Z0-9]*/,
  /JSON\.stringify\s*\(/,
  /\.value\b/
];

const STRUCTURE_ONLY_INNER_HTML =
  /innerHTML\s*=\s*`\s*[\s\S]*?\/\*\s*\[style\.css\]\s*\*\/[\s\S]*?<!--\s*\[template\.html\]\s*-->[\s\S]*?`/;

/**
 * Detect innerHTML sinks that interpolate user-controlled data without escaping.
 * @param {string} js
 */
function findUnescapedInnerHtmlSinks(js) {
  const sinks = [];
  const re = /(?:shadowRoot|this)\.innerHTML\s*=\s*(`[\s\S]*?`|'[^']*'|"[^"]*"|[^;]+);/g;
  let m;
  while ((m = re.exec(js)) !== null) {
    const chunk = m[0];
    if (STRUCTURE_ONLY_INNER_HTML.test(chunk)) continue;
    const hasUserData = USER_DATA_MARKERS.some((r) => r.test(chunk));
    const hasEscape = ESCAPE_MARKERS.some((r) => r.test(js.slice(Math.max(0, m.index - 800), m.index + chunk.length + 400)));
    if (hasUserData && !hasEscape) {
      sinks.push(chunk.slice(0, 120).replace(/\s+/g, ' '));
    }
  }
  return sinks;
}

/**
 * @param {string} js
 * @param {string} css
 * @param {string} html
 * @param {string} componentName
 */
function auditStaticSecurity(js, css, html, componentName) {
  const issues = [];
  const warnings = [];

  BANNED_JS_PATTERNS.forEach(({ re, name, desc }) => {
    if (re.test(js)) issues.push({ name: `Banned API (${name})`, desc });
  });
  BANNED_HTML_PATTERNS.forEach(({ re, name, desc }) => {
    if (re.test(html)) issues.push({ name: `Template (${name})`, desc });
  });
  BANNED_CSS_PATTERNS.forEach(({ re, name, desc }) => {
    if (re.test(css)) issues.push({ name: `Stylesheet (${name})`, desc });
  });

  if (!/attachShadow\s*\(\s*\{[^}]*mode\s*:\s*['"]open['"]/.test(js)) {
    issues.push({
      name: 'Shadow encapsulation',
      desc: 'Enterprise integrations require attachShadow({ mode: "open" }) for auditability.'
    });
  }

  if (/target\s*=\s*['"]_blank['"]/i.test(html + js) && !/noopener|noreferrer/.test(html + js)) {
    issues.push({
      name: 'Tabnabbing',
      desc: 'target="_blank" links must include rel="noopener noreferrer".'
    });
  }

  if (/<iframe/i.test(js) && !/sandbox\s*=/.test(js)) {
    issues.push({ name: 'iframe sandbox', desc: 'iframes must use the sandbox attribute.' });
  }

  const sinks = findUnescapedInnerHtmlSinks(js);
  if (sinks.length > 0) {
    issues.push({
      name: 'XSS sink (innerHTML + user data)',
      desc: `Unescaped user data in innerHTML (${sinks.length} sink(s)). Use escapeHtml() or textContent. Example: ${sinks[0]}`
    });
  }

  if (/console\.(log|debug|info)\s*\([^)]*getAttribute/.test(js)) {
    warnings.push({
      name: 'Sensitive logging',
      desc: 'Avoid logging attribute values that may contain PII in production dashboards.'
    });
  }

  if (/Math\.random\s*\(\)/.test(js) && /(?:token|secret|password|pin|otp|session)/i.test(js)) {
    issues.push({
      name: 'Weak randomness',
      desc: 'Use crypto.getRandomValues for security-sensitive values, not Math.random().'
    });
  }

  return { issues, warnings };
}

/**
 * Runtime: inject XSS payloads into every observed attribute.
 * @param {HTMLElement} el
 * @param {string[]} attrs
 * @param {import('./dom-harness').MockShadowRoot | null} shadowRoot
 */
function auditRuntimeXss(el, attrs, getShadowHtml) {
  const issues = [];
  if (!attrs.length) return { issues, warnings: [] };

  for (const attr of attrs) {
    const payloads = [...XSS_PAYLOADS, ...buildStructuredPayloads(attr)];
    for (const payload of payloads) {
      try {
        el.setAttribute(attr, payload);
      } catch {
        continue;
      }
      const html = getShadowHtml();
      if (!html) continue;

      const lower = html.toLowerCase();
      const strippedTagAttrs = stripAttributeValues(html);
      const rawPayloadInDom = typeof payload === 'string' && html.includes(payload);

      if (rawPayloadInDom && lower.includes('<script')) {
        issues.push({
          name: 'Runtime XSS reflection',
          desc: `Attribute "${attr}" reflected raw <script> in shadow DOM (payload not entity-escaped).`
        });
        break;
      }

      if (/<[a-z][^>]*\s+on(?:error|load|click)\s*=/i.test(strippedTagAttrs)) {
        issues.push({
          name: 'Runtime XSS event handler',
          desc: `Attribute "${attr}" reflected an active inline event handler in shadow DOM.`
        });
        break;
      }

      if (/(?:href|src|xlink:href)\s*=\s*["']?\s*javascript:/i.test(html)) {
        issues.push({
          name: 'Runtime XSS javascript: URL',
          desc: `Attribute "${attr}" bound javascript: into href/src (must be blocked or sanitized).`
        });
        break;
      }

      if (/<foreignobject/i.test(lower)) {
        issues.push({
          name: 'Runtime XSS foreignObject',
          desc: `Attribute "${attr}" reflected SVG foreignObject in shadow DOM.`
        });
        break;
      }

      if (/data:text\/html/i.test(html)) {
        issues.push({
          name: 'Runtime XSS data:text/html',
          desc: `Attribute "${attr}" bound data:text/html URL in shadow DOM.`
        });
        break;
      }
    }
  }

  return { issues, warnings: [] };
}

function buildStructuredPayloads(attr) {
  switch (attr) {
    case 'rows':
      return [JSON.stringify([[STRUCTURED_XSS_PAYLOAD]])];
    case 'headers':
      return [`Region,Status,${STRUCTURED_XSS_PAYLOAD}`];
    case 'events':
      return [JSON.stringify([{ time: 'now', text: STRUCTURED_XSS_PAYLOAD, status: 'danger' }])];
    case 'avatars':
      return [JSON.stringify([{ name: STRUCTURED_XSS_PAYLOAD, initials: 'XX' }])];
    case 'features':
    case 'tags':
    case 'items':
    case 'logs':
    case 'steps':
      return [JSON.stringify([STRUCTURED_XSS_PAYLOAD])];
    default:
      return [];
  }
}

function stripAttributeValues(html) {
  return html.replace(/"[^"]*"|'[^']*'/g, '""');
}

/**
 * @param {string} name
 * @param {{ js: string, css: string, html: string }} files
 * @param {{ runtime?: boolean, mount?: () => Promise<{ el: object, attrs: string[], getShadowHtml: () => string }> }} opts
 */
async function auditComponentSecurity(name, files, opts = {}) {
  const staticResult = auditStaticSecurity(files.js, files.css, files.html, name);
  const issues = [...staticResult.issues];
  const warnings = [...staticResult.warnings];

  if (opts.runtime && opts.mount) {
    try {
      const { el, attrs, getShadowHtml } = await opts.mount();
      const runtime = auditRuntimeXss(el, attrs, getShadowHtml);
      issues.push(...runtime.issues);
      warnings.push(...runtime.warnings);
    } catch (err) {
      issues.push({ name: 'Security runtime mount', desc: err.message || String(err) });
    }
  }

  return {
    tag: contract.toKebabTag(name),
    issues,
    warnings,
    passed: issues.length === 0
  };
}

const FAIL_ON_SECURITY_WARNINGS =
  typeof process !== 'undefined' && process.env
    ? process.env.OGULCAN_SECURITY_STRICT !== '0'
    : true;

function consolidateSecurity(issues, warnings) {
  const all = [...issues];
  if (FAIL_ON_SECURITY_WARNINGS) {
    warnings.forEach((w) => all.push({ name: `[SEC WARN→FAIL] ${w.name}`, desc: w.desc }));
  }
  return { issues: all, warnings: FAIL_ON_SECURITY_WARNINGS ? [] : warnings, passed: all.length === 0 };
}

module.exports = {
  XSS_PAYLOADS,
  auditStaticSecurity,
  auditRuntimeXss,
  auditComponentSecurity,
  consolidateSecurity,
  findUnescapedInnerHtmlSinks,
  FAIL_ON_SECURITY_WARNINGS
};
