/**
 * Enterprise UI testing rules for OgulcanUI components (static analysis).
 * Used by component-test-suite.js and verify-new-component-gate.js.
 */

const fs = require('fs');
const path = require('path');

const criteria = require('../verify-criteria');
const { CHARTS_ALLOWLIST } = require('./charts-allowlist');

const ROOT_DIR = path.join(__dirname, '../..');
const COMPONENTS_DIR = path.join(ROOT_DIR, 'src/components');
const MANIFEST_PATH = path.join(ROOT_DIR, 'src/components.json');

/** @type {ReadonlyArray<{ id: string, name: string }>} */
const UI_TESTING_RULES = [
  { id: 'registry', name: 'components.json registration' },
  { id: 'svg-a11y', name: 'SVG decorative or informative a11y' },
  { id: 'no-presentation-on-interactive', name: 'No role=presentation on interactive nodes' },
  { id: 'chart-test-hooks', name: 'Chart test hooks (chart-body / chart-card / data-testid / ogulcan-*)' },
  { id: 'acb-innerhtml-xss', name: 'attributeChangedCallback innerHTML + escapeHtml' }
];

const INTERACTIVE_TAGS = ['button', 'a', 'input', 'select', 'textarea', 'summary', 'details'];

const ESCAPE_MARKERS = [
  /\bescapeHtml\s*\(/,
  /\b_htmlEncode\s*\(/,
  /\bencodeHTML\s*\(/,
  /\bsanitizeText\s*\(/,
  /textContent\s*=/,
  /createTextNode\s*\(/
];

const USER_CONTROLLED_MARKERS = [
  /\bnewValue\b/,
  /\boldValue\b/,
  /\bgetAttribute\s*\(/,
  /switch\s*\(\s*name\s*\)/,
  /case\s+['"][\w-]+['"]\s*:/
];

/**
 * @param {string} js
 * @returns {string}
 */
function extractAttributeChangedCallbackBody(js) {
  const match = js.match(
    /attributeChangedCallback\s*\([^)]*\)\s*\{([\s\S]*?)\n\s{0,4}(?:get |set |static |connectedCallback|disconnectedCallback|render|draw|upgradeProperty|renderStructure)\b/
  );
  if (match) return match[1];
  const loose = js.match(/attributeChangedCallback\s*\([^)]*\)\s*\{([\s\S]*?)\n\}/);
  return loose ? loose[1] : '';
}

/**
 * @param {string} html
 */
function auditSvgAccessibility(html, js) {
  const issues = [];
  const svgTags = html.match(/<svg\b[^>]*>/gi) || [];
  if (svgTags.length === 0) return issues;

  svgTags.forEach((tag, index) => {
    const hasAriaHidden = /aria-hidden\s*=\s*["']?true["']?/i.test(tag);
    const hasRoleImg = /role\s*=\s*["']img["']/i.test(tag);
    const hasAriaLabel = /aria-label\s*=\s*["'][^"']+["']/i.test(tag);

    if (hasAriaHidden) return;

    if (hasRoleImg && hasAriaLabel) return;

    if (hasRoleImg) {
      const syncsLabel =
        /aria-label|setAttribute\s*\(\s*['"]aria-label['"]/.test(js) &&
        /(?:getAttribute\s*\(\s*['"](?:label|title)['"]|this\._label|ctx\.label|ctx\.title)/.test(js);
      if (syncsLabel) return;
      issues.push({
        name: 'SVG informative a11y',
        desc: `SVG #${index + 1} uses role="img" but index.js must set aria-label from label/title attributes in draw() or connectedCallback.`
      });
      return;
    }

    issues.push({
      name: 'SVG chart a11y',
      desc: `SVG #${index + 1} must use aria-hidden="true" (decorative) OR role="img" with aria-label sourced from label/title.`
    });
  });

  return issues;
}

/**
 * @param {string} html
 */
function auditPresentationOnInteractive(html) {
  const issues = [];
  const tagGroup = INTERACTIVE_TAGS.join('|');
  const re = new RegExp(
    `<(${tagGroup})\\b[^>]*\\brole\\s*=\\s*["']presentation["'][^>]*>`,
    'gi'
  );
  const tabindexRe =
    /<([a-z][a-z0-9-]*)\b[^>]*\btabindex\s*=\s*["']?(?!-1)\d+["']?[^>]*\brole\s*=\s*["']presentation["'][^>]*>/gi;

  let m;
  while ((m = re.exec(html)) !== null) {
    issues.push({
      name: 'role=presentation on interactive',
      desc: `Do not use role="presentation" on <${m[1]}> — it removes semantics from keyboard/focusable controls.`
    });
  }
  while ((m = tabindexRe.exec(html)) !== null) {
    issues.push({
      name: 'role=presentation on tabindex',
      desc: `Do not use role="presentation" on focusable <${m[1]}> (tabindex >= 0).`
    });
  }
  return issues;
}

/**
 * @param {string} html
 * @param {string} componentName
 */
function auditChartTestHooks(html, componentName) {
  const issues = [];
  const tier = criteria.getComponentTier(componentName);
  const isChart = tier === 'chart' || CHARTS_ALLOWLIST.includes(componentName);
  if (!isChart) return issues;

  const hasChartBody = /\bchart-body\b/.test(html);
  const hasChartCard = /\bchart-card\b/.test(html);
  const hasDataTestId = /\bdata-testid\s*=/i.test(html);
  const hasOgulcanClass = /\bclass\s*=\s*["'][^"']*\bogulcan-[-a-z0-9]+/i.test(html);

  if (!hasChartBody && !hasChartCard && !hasDataTestId && !hasOgulcanClass) {
    issues.push({
      name: 'Chart test hooks',
      desc:
        'Chart templates require a test hook: .chart-body, .chart-card, data-testid="…", or an ogulcan-* class on the chart container.'
    });
  } else if (!hasChartBody && !hasChartCard) {
    issues.push({
      name: 'Chart layout hook',
      desc: 'Chart templates must include .chart-body or .chart-card for layout and visual regression selectors.'
    });
  }

  return issues;
}

/**
 * @param {string} js
 */
function auditAttributeChangedCallbackInnerHtml(js) {
  const issues = [];
  const body = extractAttributeChangedCallbackBody(js);
  if (!body || !/\binnerHTML\b/.test(body)) return issues;

  const usesUserData = USER_CONTROLLED_MARKERS.some((re) => re.test(body));
  if (!usesUserData) {
    issues.push({
      name: 'attributeChangedCallback innerHTML',
      desc: 'Do not assign innerHTML inside attributeChangedCallback — use draw() with textContent or escapeHtml().'
    });
    return issues;
  }

  const hasEscape = ESCAPE_MARKERS.some((re) => re.test(body));
  if (!hasEscape) {
    issues.push({
      name: 'attributeChangedCallback XSS',
      desc:
        'attributeChangedCallback uses innerHTML with user-controlled attributes — escape with escapeHtml() or use textContent/createTextNode.'
    });
  }
  return issues;
}

/**
 * @param {string} name
 * @param {string[]} manifest
 */
/**
 * @param {string} name
 * @param {string[]} manifest
 * @param {{ enforce?: boolean }} [options]
 */
function auditManifestRegistration(name, manifest, options = {}) {
  if (manifest.includes(name)) return [];
  if (options.enforce === false) return [];
  return [
    {
      name: 'components.json registration',
      desc: `Add "${name}" to src/components.json (sorted) before merge — run "bun run build" after scaffolding.`
    }
  ];
}

/**
 * @returns {{ folders: string[], manifest: string[], orphanFolders: string[], orphanManifest: string[] }}
 */
function syncManifestWithFolders() {
  const folders = fs.existsSync(COMPONENTS_DIR)
    ? fs
        .readdirSync(COMPONENTS_DIR)
        .filter((entry) => fs.statSync(path.join(COMPONENTS_DIR, entry)).isDirectory())
        .sort()
    : [];

  let manifest = [];
  if (fs.existsSync(MANIFEST_PATH)) {
    manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'));
    if (!Array.isArray(manifest)) {
      throw new Error('src/components.json must be a JSON array of component names.');
    }
  }

  const manifestSet = new Set(manifest);
  const folderSet = new Set(folders);

  return {
    folders,
    manifest,
    orphanFolders: folders.filter((f) => !manifestSet.has(f)),
    orphanManifest: manifest.filter((m) => !folderSet.has(m))
  };
}

/**
 * Full static UI testing audit for one component.
 * @param {string} name
 * @param {{ js: string, html: string }} files
 * @param {{ manifest?: string[] }} [options]
 */
function auditUiTestingRules(name, files, options = {}) {
  const issues = [];
  const warnings = [];
  const { js, html } = files;
  const manifest = options.manifest ?? syncManifestWithFolders().manifest;
  const enforceRegistry = options.enforceRegistry !== false;

  issues.push(...auditManifestRegistration(name, manifest, { enforce: enforceRegistry }));
  issues.push(...auditSvgAccessibility(html, js));
  issues.push(...auditPresentationOnInteractive(html));
  issues.push(...auditChartTestHooks(html, name));
  issues.push(...auditAttributeChangedCallbackInnerHtml(js));

  return { issues, warnings };
}

module.exports = {
  UI_TESTING_RULES,
  UI_TESTING_RULE_COUNT: UI_TESTING_RULES.length,
  MANIFEST_PATH,
  COMPONENTS_DIR,
  auditUiTestingRules,
  auditManifestRegistration,
  auditSvgAccessibility,
  auditPresentationOnInteractive,
  auditChartTestHooks,
  auditAttributeChangedCallbackInnerHtml,
  syncManifestWithFolders,
  extractAttributeChangedCallbackBody
};