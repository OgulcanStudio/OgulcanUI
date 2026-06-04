/**
 * OgulcanBank — regulated-environment integration layer.
 * Load after ogulcan-ui.js (+ styles.css). Zero deps. No storage. No remote fetch.
 */
(function ogulcanBankModule(root) {
  'use strict';

  const VERSION = '0.1.0';
  const TAG_PREFIX = 'ogulcan-';

  const DEFAULT_CSP = [
    "default-src 'self'",
    "script-src 'self'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data:",
    "font-src 'self'",
    "connect-src 'self'",
    "object-src 'none'",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'"
  ].join('; ');

  /** @param {string} name PascalCase manifest entry */
  function toKebabTag(name) {
    return TAG_PREFIX + String(name).replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();
  }

  /** @param {unknown} value */
  function escapeHtml(value) {
    if (value == null) return '';
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  /** @returns {string[]} */
  function listTags() {
    const manifest = root.OGULCAN_UI_MANIFEST;
    if (Array.isArray(manifest)) {
      return manifest.map(toKebabTag);
    }
    return [];
  }

  const tagSet = new Set();

  function refreshTagSet() {
    tagSet.clear();
    listTags().forEach((t) => tagSet.add(t));
  }

  /**
   * @param {string} tag
   * @param {boolean} strict
   */
  function assertTag(tag, strict) {
    if (!tag || typeof tag !== 'string' || !tag.startsWith(TAG_PREFIX)) {
      throw new Error(`OgulcanBank: invalid tag "${tag}". Use ${TAG_PREFIX}* custom elements.`);
    }
    if (strict && tagSet.size && !tagSet.has(tag)) {
      throw new Error(`OgulcanBank: unknown tag "${tag}". Check manifest or disable strictTags.`);
    }
  }

  /**
   * Safe factory — attributes only, text via textContent, no host innerHTML.
   * @param {string} tag
   * @param {Record<string, unknown>} [attrs]
   * @param {(Node|string|null|undefined)[]} [children]
   * @param {{ strict?: boolean }} [opts]
   */
  function create(tag, attrs = {}, children = [], opts = {}) {
    const strict = opts.strict !== false;
    assertTag(tag, strict);
    const el = document.createElement(tag);
    for (const [key, val] of Object.entries(attrs)) {
      if (val == null) continue;
      if (key === 'text' || key === 'textContent') {
        el.textContent = String(val);
      } else if (key === 'class' || key === 'className') {
        el.className = String(val);
      } else {
        el.setAttribute(key, String(val));
      }
    }
    for (const child of children) {
      if (child instanceof Node) el.appendChild(child);
      else if (child != null) el.appendChild(document.createTextNode(String(child)));
    }
    return el;
  }

  /**
   * @param {string|Element} selector
   * @param {Element} child
   */
  function mount(selector, child) {
    const host = typeof selector === 'string' ? document.querySelector(selector) : selector;
    if (!host) throw new Error('OgulcanBank.mount: host not found');
    host.appendChild(child);
    return child;
  }

  /**
   * @param {string} [policy]
   */
  function applyCspMeta(policy) {
    if (typeof document === 'undefined') return null;
    const existing = document.querySelector('meta[http-equiv="Content-Security-Policy"]');
    if (existing) return existing;
    const meta = document.createElement('meta');
    meta.httpEquiv = 'Content-Security-Policy';
    meta.content = policy || DEFAULT_CSP;
    document.head.prepend(meta);
    return meta;
  }

  /**
   * @param {string} tag
   */
  function whenDefined(tag) {
    assertTag(tag, false);
    return customElements.whenDefined(tag);
  }

  /**
   * @param {string[]} tags
   */
  function whenAllDefined(tags) {
    return Promise.all(tags.map((t) => whenDefined(t)));
  }

  /**
   * @param {{
   *   csp?: boolean,
   *   cspPolicy?: string,
   *   strictTags?: boolean,
   *   waitTags?: string[]
   * }} [options]
   */
  function init(options = {}) {
    const opts = {
      csp: true,
      strictTags: true,
      waitTags: [],
      ...options
    };

    refreshTagSet();

    if (opts.csp) applyCspMeta(opts.cspPolicy || DEFAULT_CSP);

    const strict = opts.strictTags !== false;
    const boundCreate = (tag, attrs, children) => create(tag, attrs, children, { strict });

    const waitList = (opts.waitTags && opts.waitTags.length)
      ? opts.waitTags
      : [];

    const ready = waitList.length
      ? whenAllDefined(waitList)
      : Promise.resolve();

    const api = {
      version: VERSION,
      componentCount: tagSet.size || listTags().length,
      tags: listTags(),
      create: boundCreate,
      mount,
      escapeHtml,
      whenDefined,
      whenAllDefined,
      applyCspMeta,
      DEFAULT_CSP,
      ready
    };

    root.OgulcanBank = Object.assign(root.OgulcanBank || {}, api);
    return api;
  }

  const exported = {
    VERSION,
    init,
    create,
    mount,
    escapeHtml,
    whenDefined,
    whenAllDefined,
    applyCspMeta,
    listTags,
    DEFAULT_CSP
  };

  root.OgulcanBank = Object.assign(root.OgulcanBank || {}, exported);

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = exported;
  }
})(typeof globalThis !== 'undefined' ? globalThis : window);
