/**
 * OgulcanUI Enterprise Performance & Compliance Criteria (single source of truth).
 * Used by enterprise verify gates and verify.html.
 */

const { CHARTS_ALLOWLIST } = require('./lib/charts-allowlist');
const CHART_COMPONENTS = new Set(CHARTS_ALLOWLIST);

const SIZE_LIMITS = {
  widget: { js: 6000, css: 4500, html: 3500, total: 12000 },
  chart: { js: 20480, css: 5500, html: 2500, total: 24000 },
  layout: { js: 10000, css: 6000, html: 5000, total: 18000 }
};

const LAYOUT_COMPONENTS = new Set();

const PERF = {
  mountWarnMs: 1.0,
  mountFailMs: 2.0,
  updateWarnMs: 0.5,
  updateFailMs: 1.0,
  maxObservedAttributes: 12
};

/** @param {string} name */
function getComponentTier(name) {
  if (CHART_COMPONENTS.has(name)) return 'chart';
  if (LAYOUT_COMPONENTS.has(name)) return 'layout';
  return 'widget';
}

/** @param {string} name */
function getSizeLimits(name) {
  return SIZE_LIMITS[getComponentTier(name)];
}

/**
 * @param {string} attr
 * @returns {string}
 */
function attrToPropertyName(attr) {
  return attr.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
}

/**
 * Enterprise attribute reflection: getter/setter, switch case, or direct DOM read.
 * @param {object} proto
 * @param {string} attr
 * @param {string} jsContent
 */
function hasAttributeReflection(proto, attr, jsContent) {
  const prop = attrToPropertyName(attr);
  if (proto) {
    const desc = Object.getOwnPropertyDescriptor(proto, prop);
    if (desc && typeof desc.get === 'function' && typeof desc.set === 'function') {
      return true;
    }
  }
  const patterns = [
    new RegExp(`case\\s+['"]${attr}['"]\\s*:`),
    new RegExp(`if\\s*\\(\\s*n\\s*===\\s*['"]${attr}['"]`),
    new RegExp(`if\\s*\\(\\s*name\\s*===\\s*['"]${attr}['"]`),
    new RegExp(`getAttribute\\(\\s*['"]${attr}['"]`),
    new RegExp(`hasAttribute\\(\\s*['"]${attr}['"]`),
    new RegExp(`this\\._${prop}\\b`),
    new RegExp(`this\\._${attr.replace(/-/g, '_')}\\b`)
  ];
  return patterns.some((re) => re.test(jsContent));
}

/**
 * @param {string} jsContent
 */
function hasIncrementalRenderPattern(jsContent) {
  return (
    /renderStructure\s*\(/.test(jsContent) ||
    /_structureReady\b/.test(jsContent) ||
    /_mounted\b/.test(jsContent) ||
    /_initialized\b/.test(jsContent) ||
    (/\.og-dynamic-mount/.test(jsContent) && /_shellReady/.test(jsContent)) ||
    /_structureReady/.test(jsContent) ||
    (/shadowRoot\.innerHTML[\s\S]{0,4000}shadowRoot\.querySelector/.test(jsContent) &&
      /attributeChangedCallback[\s\S]*?if\s*\(\s*o\s*===\s*nv\s*\)\s*return/.test(jsContent))
  );
}

/**
 * Full shadow DOM rebuild on attribute change — flagged for heavy/large components only.
 * @param {string} jsContent
 * @param {number} totalSize
 * @param {string} componentName
 */
function hasFullRebuildOnAttributeChange(jsContent, totalSize = 0, componentName = '') {
  if (!/shadowRoot\.innerHTML\s*=/.test(jsContent)) return false;
  if (!/attributeChangedCallback/.test(jsContent)) return false;
  if (hasIncrementalRenderPattern(jsContent)) return false;
  if (/this\.draw\s*\(|this\.paint\s*\(|this\.updateChart\s*\(/.test(jsContent)) return false;

  const tier = getComponentTier(componentName);
  if (tier === 'widget' && totalSize < 7000) return false;

  const acb = jsContent.match(
    /attributeChangedCallback[\s\S]*?(?=\n\s{0,4}(?:get |set |static |connectedCallback|disconnectedCallback|render|draw)|$)/
  );
  if (!acb || !/this\.render\s*\(/.test(acb[0])) return false;

  if (tier === 'chart' || tier === 'layout') return true;
  return totalSize >= 9000;
}

/**
 * @param {string} jsContent
 */
function hasTimerTeardown(jsContent) {
  if (!/setInterval\s*\(/.test(jsContent)) return true;
  return (
    /=\s*setInterval\s*\(/.test(jsContent) &&
    (/clearInterval\s*\(/.test(jsContent) || /disconnectedCallback/.test(jsContent))
  );
}

/**
 * @param {string} jsContent
 */
function hasRafTeardown(jsContent) {
  if (!/requestAnimationFrame\s*\(/.test(jsContent)) return true;
  return /cancelAnimationFrame\s*\(/.test(jsContent) || /disconnectedCallback/.test(jsContent);
}

/**
 * @param {{ jsSize: number, cssSize: number, htmlSize: number, totalSize: number }} sizes
 * @param {string} componentName
 * @returns {{ issues: Array<{name:string,desc:string}>, warnings: Array<{name:string,desc:string}> }}
 */
function auditPayloadSizes(sizes, componentName) {
  const limits = getSizeLimits(componentName);
  const tier = getComponentTier(componentName);
  const issues = [];
  const warnings = [];

  const check = (bytes, limit, label) => {
    const kb = (bytes / 1024).toFixed(1);
    const limitKb = (limit / 1024).toFixed(1);
    if (bytes > limit) {
      issues.push({
        name: `${label} Payload Exceeded (${tier})`,
        desc: `${label} is ${kb} KB — enterprise ${tier} max ${limitKb} KB.`
      });
    } else if (bytes > limit * 0.92) {
      warnings.push({
        name: `${label} Payload Near Limit`,
        desc: `${label} is ${kb} KB (${Math.round((bytes / limit) * 100)}% of ${tier} ${limitKb} KB cap).`
      });
    }
  };

  check(sizes.jsSize, limits.js, 'JS');
  check(sizes.cssSize, limits.css, 'CSS');
  check(sizes.htmlSize, limits.html, 'HTML');
  check(sizes.totalSize, limits.total, 'Total');

  return { issues, warnings };
}

/**
 * @param {string} jsContent
 * @param {string} cssContent
 * @param {string} htmlContent
 * @param {string} componentName
 * @param {typeof customElements} registry
 * @param {{ jsSize?: number, cssSize?: number, htmlSize?: number, totalSize?: number }} [sizes]
 */
function auditStaticCompliance(jsContent, cssContent, htmlContent, componentName, registry, sizes = {}) {
  const issues = [];
  const warnings = [];

  if (/\beval\s*\(/.test(jsContent)) {
    issues.push({ name: 'Banned API (eval)', desc: 'eval() forbidden (CSP + security).' });
  }
  if (/\bnew\s+Function\s*\(/.test(jsContent)) {
    issues.push({ name: 'Banned API (Function)', desc: 'new Function() forbidden.' });
  }
  if (/document\.write\s*\(/.test(jsContent)) {
    issues.push({ name: 'Banned API (document.write)', desc: 'document.write() forbidden.' });
  }
  if (/<script/i.test(htmlContent)) {
    issues.push({ name: 'Inline Script Tag', desc: 'No <script> in HTML templates.' });
  }
  if (/\bon[a-z]+\s*=/i.test(htmlContent)) {
    issues.push({ name: 'Inline Event Attributes', desc: 'Bind events in index.js only.' });
  }
  if (/@import\s+url\(\s*['"]?http/i.test(cssContent)) {
    issues.push({ name: 'External HTTP @import', desc: 'No remote stylesheet imports.' });
  }
  if (/url\(\s*['"]?http/i.test(cssContent)) {
    warnings.push({ name: 'External HTTP Asset', desc: 'External url() — prefer local/inlined assets.' });
  }
  if (/:host\s*\*\s*\{|^\s*\*\s*\{/m.test(cssContent)) {
    issues.push({ name: 'Universal Selector', desc: ':host * or * rules hurt shadow layout perf.' });
  }
  if (/transition:\s*all\b/i.test(cssContent)) {
    issues.push({ name: 'CSS transition:all', desc: 'transition:all forces broad repaints — list properties explicitly.' });
  }
  if (!hasTimerTeardown(jsContent)) {
    issues.push({ name: 'Timer Leak', desc: 'setInterval without stored ID + clearInterval in disconnectedCallback.' });
  }
  if (!hasRafTeardown(jsContent)) {
    issues.push({ name: 'rAF Leak', desc: 'requestAnimationFrame without cancelAnimationFrame teardown.' });
  }
  if (jsContent.includes('ResizeObserver') && !jsContent.includes('disconnect(')) {
    issues.push({ name: 'ResizeObserver Leak', desc: 'Call resizeObserver.disconnect() in disconnectedCallback.' });
  }
  if (
    (jsContent.includes('window.addEventListener') || jsContent.includes('document.addEventListener')) &&
    !jsContent.includes('removeEventListener')
  ) {
    issues.push({ name: 'Global Listener Leak', desc: 'Remove window/document listeners in disconnectedCallback.' });
  }
  if (hasFullRebuildOnAttributeChange(jsContent, sizes?.totalSize ?? 0, componentName)) {
    issues.push({
      name: 'Full DOM Rebuild on Attribute Change',
      desc: 'Use renderStructure() once + incremental draw/update — not shadowRoot.innerHTML on every attributeChangedCallback.'
    });
  }

  const defineMatch = jsContent.match(/customElements\.define\(\s*['"]([^'"]+)['"]/);
  const kebab = componentName.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();
  const expectedTag = `ogulcan-${kebab}`;
  if (!defineMatch) {
    issues.push({ name: 'Missing Registration', desc: 'customElements.define() required.' });
  } else if (defineMatch[1] !== expectedTag) {
    issues.push({ name: 'Tag Naming', desc: `Expected <${expectedTag}>, got "${defineMatch[1]}".` });
  }

  const classMatch = jsContent.match(/class\s+(\w+)\s+extends\s+(\w+)/);
  if (!classMatch) {
    issues.push({ name: 'Missing Class', desc: 'HTMLElement subclass required.' });
  } else {
    if (!classMatch[1].startsWith('Ogulcan')) {
      warnings.push({ name: 'Class Prefix', desc: `Class "${classMatch[1]}" should use Ogulcan prefix.` });
    }
    if (classMatch[2] !== 'HTMLElement') {
      issues.push({ name: 'Inheritance', desc: `Must extend HTMLElement, not ${classMatch[2]}.` });
    }
  }

  if (cssContent.length > 0 && !cssContent.includes('var(--') && /(?:^|[;{\s])color\s*:/m.test(cssContent)) {
    warnings.push({ name: 'Theme Variables', desc: 'Use var(--*) for colors to support theming.' });
  }

  const observed = (classMatch && registry)
    ? (() => {
        try {
          const Cls = registry.get(expectedTag);
          return Cls && Cls.observedAttributes ? Cls.observedAttributes : [];
        } catch {
          return [];
        }
      })()
    : [];

  const observedFromSource = jsContent.match(/observedAttributes\s*\(\)\s*\{\s*return\s*\[([^\]]+)\]/);
  let attrs = observed;
  if (attrs.length === 0 && observedFromSource) {
    attrs = observedFromSource[1]
      .split(',')
      .map((s) => s.trim().replace(/['"]/g, ''))
      .filter(Boolean);
  }

  if (attrs.length > PERF.maxObservedAttributes) {
    issues.push({
      name: 'Observed Attribute Budget',
      desc: `${attrs.length} observed attributes exceeds max ${PERF.maxObservedAttributes}.`
    });
  }

  if (attrs.length > 0) {
    attrs.forEach((attr) => {
      const prop = attrToPropertyName(attr);
      const hasGetterSetter =
        new RegExp(`get\\s+${prop}\\s*\\(`).test(jsContent) &&
        new RegExp(`set\\s+${prop}\\s*\\(`).test(jsContent);
      if (!hasGetterSetter) {
        issues.push({
          name: 'Editable Property API',
          desc: `Observed "${attr}" requires get ${prop}() and set ${prop}() for attribute + property binding.`
        });
      } else if (!hasAttributeReflection(null, attr, jsContent)) {
        issues.push({
          name: 'Attribute Reflection',
          desc: `Observed "${attr}" lacks switch handler or getAttribute sync in attributeChangedCallback.`
        });
      }
    });
  }

  return { issues, warnings };
}

/**
 * @param {number} mountMs
 * @param {number} updateMs
 * @param {number} observedCount
 */
function auditRuntimePerf(mountMs, updateMs, observedCount) {
  const issues = [];
  const warnings = [];

  if (mountMs > PERF.mountFailMs) {
    issues.push({
      name: 'Mount Latency',
      desc: `Mount ${mountMs.toFixed(2)} ms exceeds ${PERF.mountFailMs} ms enterprise cap.`
    });
  } else if (mountMs > PERF.mountWarnMs) {
    warnings.push({
      name: 'Mount Latency',
      desc: `Mount ${mountMs.toFixed(2)} ms — target < ${PERF.mountWarnMs} ms.`
    });
  }

  if (observedCount > 0) {
    if (updateMs > PERF.updateFailMs) {
      issues.push({
        name: 'Attribute Update Latency',
        desc: `Attribute updates ${updateMs.toFixed(2)} ms exceeds ${PERF.updateFailMs} ms cap.`
      });
    } else if (updateMs > PERF.updateWarnMs) {
      warnings.push({
        name: 'Attribute Update Latency',
        desc: `Updates ${updateMs.toFixed(2)} ms — target < ${PERF.updateWarnMs} ms.`
      });
    }
  }

  return { issues, warnings };
}

/** Treat warnings as failures in CI (enterprise gate). Set OGULCAN_VERIFY_STRICT=0 to allow warnings. */
const FAIL_ON_WARNINGS =
  typeof process !== 'undefined' && process.env
    ? process.env.OGULCAN_VERIFY_STRICT !== '0'
    : true;

function consolidateStatus(issues, warnings) {
  const allIssues = [...issues];
  if (FAIL_ON_WARNINGS) {
    warnings.forEach((w) => {
      allIssues.push({ name: `[WARN→FAIL] ${w.name}`, desc: w.desc });
    });
  }
  return {
    issues: allIssues,
    warnings: FAIL_ON_WARNINGS ? [] : warnings,
    passed: allIssues.length === 0
  };
}

const api = {
  CHART_COMPONENTS,
  LAYOUT_COMPONENTS,
  SIZE_LIMITS,
  PERF,
  FAIL_ON_WARNINGS,
  getComponentTier,
  getSizeLimits,
  attrToPropertyName,
  hasAttributeReflection,
  hasIncrementalRenderPattern,
  hasFullRebuildOnAttributeChange,
  auditPayloadSizes,
  auditStaticCompliance,
  auditRuntimePerf,
  consolidateStatus
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = api;
}
if (typeof window !== 'undefined') {
  window.OgulcanVerifyCriteria = api;
}
