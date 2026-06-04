/**
 * OgulcanUI strict component contract — single source of truth for the 3-file template.
 * Used by test-all-components.js and add-component.js.
 */

const fs = require('fs');
const path = require('path');

const STYLE_PLACEHOLDER = '/* [style.css] */';
const TEMPLATE_PLACEHOLDER = '<!-- [template.html] -->';

const REQUIRED_FILES = ['index.js', 'index.css', 'index.html'];

/** @param {string} name PascalCase component folder name */
function toKebabTag(name) {
  const kebab = name.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();
  return `ogulcan-${kebab}`;
}

/** @param {string} name */
function toClassName(name) {
  return `Ogulcan${name}`;
}

/**
 * @param {string} dirPath
 * @returns {{ name: string, js: string, css: string, html: string, paths: Record<string,string>, sizes: object }}
 */
function loadComponentFiles(dirPath) {
  const name = path.basename(dirPath);
  const read = (file) => {
    const p = path.join(dirPath, file);
    return fs.existsSync(p) ? fs.readFileSync(p, 'utf8') : '';
  };
  const js = read('index.js');
  const css = read('index.css');
  const html = read('index.html');
  return {
    name,
    js,
    css,
    html,
    paths: {
      js: path.join(dirPath, 'index.js'),
      css: path.join(dirPath, 'index.css'),
      html: path.join(dirPath, 'index.html')
    },
    sizes: {
      jsSize: js.length,
      cssSize: css.length,
      htmlSize: html.length,
      totalSize: js.length + css.length + html.length
    }
  };
}

/**
 * Strict 3-file Web Component template audit (same rules for every component).
 * @param {string} name
 * @param {{ js: string, css: string, html: string, paths?: object }} files
 * @returns {{ issues: Array<{name:string,desc:string}>, warnings: Array<{name:string,desc:string}> }}
 */
function auditTemplateContract(name, files) {
  const issues = [];
  const warnings = [];
  const { js, css, html } = files;
  const tag = toKebabTag(name);
  const className = toClassName(name);

  REQUIRED_FILES.forEach((file) => {
    const p = files.paths?.[file.replace('index.', '')] || file;
    if (file === 'index.js' && !js) {
      issues.push({ name: 'Missing index.js', desc: 'Every component requires index.js.' });
    }
    if (file === 'index.css' && !css.trim()) {
      issues.push({ name: 'Missing index.css', desc: 'Styles must live in index.css (use :host).' });
    }
    if (file === 'index.html' && !html.trim()) {
      issues.push({ name: 'Missing index.html', desc: 'Markup must live in index.html (no logic).' });
    }
  });

  if (!js.includes(STYLE_PLACEHOLDER)) {
    issues.push({
      name: 'Style Placeholder',
      desc: `index.js must include "${STYLE_PLACEHOLDER}" inside shadow markup for build inlining.`
    });
  }
  if (!js.includes(TEMPLATE_PLACEHOLDER)) {
    issues.push({
      name: 'Template Placeholder',
      desc: `index.js must include "${TEMPLATE_PLACEHOLDER}" for build inlining.`
    });
  }

  if (css && !/:host\b/.test(css)) {
    issues.push({ name: ':host Rule', desc: 'index.css must scope styles with a :host selector.' });
  }

  if (!/\bexport\s+class\s+/.test(js)) {
    issues.push({ name: 'ES Module Export', desc: 'Export the component class: export class OgulcanX extends HTMLElement.' });
  }

  const classRe = new RegExp(`class\\s+${className}\\s+extends\\s+HTMLElement`);
  if (!classRe.test(js)) {
    issues.push({
      name: 'Class Naming',
      desc: `Expected "class ${className} extends HTMLElement".`
    });
  }

  if (!/attachShadow\s*\(\s*\{[^}]*mode\s*:\s*['"]open['"]/.test(js)) {
    issues.push({ name: 'Open Shadow Root', desc: 'Call this.attachShadow({ mode: "open" }) in the constructor.' });
  }

  const defineRe = new RegExp(
    `customElements\\.define\\(\\s*['"]${tag.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}['"]\\s*,\\s*${className}\\s*\\)`
  );
  if (!defineRe.test(js)) {
    issues.push({
      name: 'Custom Element Registration',
      desc: `Register with customElements.define('${tag}', ${className});`
    });
  }

  if (!/\bdisconnectedCallback\s*\(/.test(js)) {
    issues.push({
      name: 'disconnectedCallback',
      desc: 'Implement disconnectedCallback for timers, rAF, observers, and document listeners.'
    });
  }

  const observedMatch = js.match(/observedAttributes\s*\(\)\s*\{\s*return\s*\[([^\]]*)\]/);
  const observedAttrs = observedMatch
    ? observedMatch[1]
        .split(',')
        .map((s) => s.trim().replace(/['"]/g, ''))
        .filter(Boolean)
    : [];

  if (observedAttrs.length > 0) {
    if (!/\battributeChangedCallback\s*\(/.test(js)) {
      issues.push({ name: 'attributeChangedCallback', desc: 'Required when observedAttributes is non-empty.' });
    } else if (
      !/if\s*\(\s*(?:oldValue|o)\s*===\s*(?:newValue|nv)\s*\)\s*return/.test(js) &&
      !/if\s*\(\s*oldValue\s*===\s*newValue\s*\)\s*return/.test(js)
    ) {
      issues.push({
        name: 'Attribute Dedup',
        desc: 'attributeChangedCallback must bail when old and new values are equal.'
      });
    }

    if (!/\bupgradeProperty\s*\(/.test(js)) {
      issues.push({
        name: 'upgradeProperty',
        desc: 'Call upgradeProperty() in connectedCallback for each observed property.'
      });
    }
  }

  const usesRender = /\brender\s*\(\s*\)\s*\{/.test(js);
  const usesStructure = /\brenderStructure\s*\(\s*\)\s*\{/.test(js);
  const mountsInConnected =
    /\bconnectedCallback\s*\([^)]*\)\s*\{[\s\S]{0,1200}shadowRoot\.innerHTML/.test(js) &&
    js.includes(STYLE_PLACEHOLDER) &&
    js.includes(TEMPLATE_PLACEHOLDER);
  if (!usesRender && !usesStructure && !mountsInConnected) {
    issues.push({
      name: 'Lifecycle Render',
      desc: 'Implement render(), renderStructure(), or mount shadow DOM in connectedCallback with build placeholders.'
    });
  }

  if (usesRender && usesStructure) {
    warnings.push({
      name: 'Dual Render Methods',
      desc: 'Prefer either render() or renderStructure(), not both, unless structure is a one-time setup.'
    });
  }

  if (/<script/i.test(html)) {
    issues.push({ name: 'Template Script', desc: 'index.html must not contain <script> tags.' });
  }
  if (/\bon[a-z]+\s*=/i.test(html)) {
    issues.push({ name: 'Template Inline Events', desc: 'Bind events in index.js only.' });
  }

  return { issues, warnings };
}

/**
 * Inline assets the same way build.js does (for runtime mount tests).
 * @param {string} js
 * @param {string} css
 * @param {string} html
 */
function inlineComponentAssets(js, css, html) {
  let resolved = js;
  resolved = resolved.replace(/\/\*\s*\[style\.css\]\s*\*\//g, () => css.trim());
  resolved = resolved.replace(/<!--\s*\[template\.html\]\s*-->/g, () => html.trim());
  return resolved.replace(/\bexport\s+class\s+/, 'class ');
}

module.exports = {
  STYLE_PLACEHOLDER,
  TEMPLATE_PLACEHOLDER,
  REQUIRED_FILES,
  toKebabTag,
  toClassName,
  loadComponentFiles,
  auditTemplateContract,
  inlineComponentAssets
};