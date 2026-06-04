const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

const PORT = 3000;
const PUBLIC_DIR = path.join(__dirname, '..');
const srcComponentsDir = path.join(__dirname, '../src/components');

/**
 * 1. Setup Mock DOM Environment for Dynamic Auditing in Bun
 */
function setupMockDOM() {
  // Check if Mock DOM already defined to prevent re-definition crashes
  if (globalThis.HTMLElement) return;

  class MockHTMLElement {
    constructor() {
      this._attributes = new Map();
      this.shadowRoot = null;
      this.childNodes = [];
      this.style = {};
      this.classList = {
        add: () => {},
        remove: () => {},
        toggle: () => {},
        contains: () => false
      };
      this._listeners = new Map();
      this.isConnected = false;
    }
    
    attachShadow(options) {
      this.shadowRoot = new MockShadowRoot(this);
      return this.shadowRoot;
    }
    
    setAttribute(name, value) {
      const old = this._attributes.get(name);
      this._attributes.set(name, String(value));
      if (this.attributeChangedCallback && old !== String(value)) {
        this.attributeChangedCallback(name, old, String(value));
      }
    }
    
    getAttribute(name) {
      return this._attributes.get(name) || null;
    }
    
    hasAttribute(name) {
      return this._attributes.has(name);
    }
    
    removeAttribute(name) {
      const old = this._attributes.get(name);
      this._attributes.delete(name);
      if (this.attributeChangedCallback && old !== null) {
        this.attributeChangedCallback(name, old, null);
      }
    }
    
    appendChild(child) {
      this.childNodes.push(child);
      child.parentNode = this;
      return child;
    }
    
    removeChild(child) {
      const idx = this.childNodes.indexOf(child);
      if (idx !== -1) {
        this.childNodes.splice(idx, 1);
        child.parentNode = null;
      }
      return child;
    }
    
    addEventListener(event, callback) {
      this._listeners.set(event, callback);
    }
    
    removeEventListener(event, callback) {
      this._listeners.delete(event);
    }
    
    dispatchEvent() {}
    
    getBoundingClientRect() {
      return { x: 0, y: 0, width: 300, height: 150, top: 0, right: 300, bottom: 150, left: 0 };
    }
  }

  class MockShadowRoot {
    constructor(host) {
      this.host = host;
      this.childNodes = [];
      this._innerHTML = '';
    }
    
    appendChild(child) {
      this.childNodes.push(child);
      return child;
    }
    
    removeChild(child) {
      const idx = this.childNodes.indexOf(child);
      if (idx !== -1) {
        this.childNodes.splice(idx, 1);
      }
      return child;
    }
    
    querySelector(selector) {
      return new MockElement('div');
    }
    
    querySelectorAll(selector) {
      return [new MockElement('div')];
    }
    
    getElementById(id) {
      return new MockElement('div');
    }
    
    get innerHTML() {
      return this._innerHTML;
    }
    
    set innerHTML(val) {
      this._innerHTML = val;
    }
  }

  class MockElement extends MockHTMLElement {
    constructor(tagName = 'div') {
      super();
      this.tagName = tagName.toUpperCase();
    }
    
    querySelector(selector) {
      return new MockElement('div');
    }
    
    querySelectorAll(selector) {
      return [new MockElement('div')];
    }
    
    appendChild(child) {
      super.appendChild(child);
      return child;
    }
  }

  globalThis.HTMLElement = MockHTMLElement;
  globalThis.window = globalThis;
  globalThis.document = {
    createElement(tagName) {
      return new MockElement(tagName);
    },
    createElementNS(ns, tagName) {
      return new MockElement(tagName);
    },
    createTextNode(text) {
      return { textContent: text };
    },
    body: new MockElement('body')
  };

  globalThis.customElements = {
    _registry: new Map(),
    define(name, constructor) {
      this._registry.set(name, constructor);
    },
    get(name) {
      return this._registry.get(name);
    }
  };

  globalThis.ResizeObserver = class MockResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  };

  globalThis.CustomEvent = class MockCustomEvent {
    constructor(type, options) {
      this.type = type;
      this.detail = options?.detail || null;
    }
  };
}

/**
 * 2. Audit a single component
 */
async function auditComponent(name, dirPath) {
  const kebab = name.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();
  const tag = `ogulcan-${kebab}`;
  
  const result = {
    name,
    kebab,
    tag,
    status: 'passed',
    issues: [],
    warnings: [],
    metrics: {}
  };

  const jsPath = path.join(dirPath, 'index.js');
  const cssPath = path.join(dirPath, 'index.css');
  const htmlPath = path.join(dirPath, 'index.html');

  if (!fs.existsSync(jsPath)) {
    result.status = 'failed';
    result.issues.push({
      name: 'Missing Logic File',
      desc: `index.js is missing in component folder: ${dirPath}`
    });
    return result;
  }

  const hasCss = fs.existsSync(cssPath);
  const hasHtml = fs.existsSync(htmlPath);

  const jsContent = fs.readFileSync(jsPath, 'utf8');
  const cssContent = hasCss ? fs.readFileSync(cssPath, 'utf8') : '';
  const htmlContent = hasHtml ? fs.readFileSync(htmlPath, 'utf8') : '';

  const jsSize = jsContent.length;
  const cssSize = cssContent.length;
  const htmlSize = htmlContent.length;
  const totalSize = jsSize + cssSize + htmlSize;

  result.metrics = {
    jsSize,
    cssSize,
    htmlSize,
    totalSize
  };

  if (cssSize > 15000) {
    result.warnings.push({
      name: 'CSS Payload Size Limit',
      desc: `CSS payload size is ${(cssSize / 1024).toFixed(1)} KB (exceeds recommended 15 KB limit).`
    });
  }
  if (htmlSize > 10000) {
    result.warnings.push({
      name: 'HTML Payload Size Limit',
      desc: `HTML template size is ${(htmlSize / 1024).toFixed(1)} KB (exceeds recommended 10 KB limit).`
    });
  }
  if (jsSize > 20000) {
    result.warnings.push({
      name: 'JS Payload Size Limit',
      desc: `JS code size is ${(jsSize / 1024).toFixed(1)} KB (exceeds recommended 20 KB limit).`
    });
  }
  if (totalSize > 35000) {
    result.status = 'failed';
    result.issues.push({
      name: 'Total Weight Limit Exceeded',
      desc: `Combined payload weight is ${(totalSize / 1024).toFixed(1)} KB (exceeds strict 35 KB library limit).`
    });
  }

  // Static checks
  if (/\beval\s*\(/.test(jsContent)) {
    result.status = 'failed';
    result.issues.push({
      name: 'Banned API Usage (eval)',
      desc: 'Use of eval() is strictly prohibited due to severe security and CSP issues.'
    });
  }
  if (/\bnew\s+Function\s*\(/.test(jsContent)) {
    result.status = 'failed';
    result.issues.push({
      name: 'Banned API Usage (Function)',
      desc: 'Use of new Function() constructor is prohibited due to CSP compliance guidelines.'
    });
  }
  if (/document\.write\s*\(/.test(jsContent)) {
    result.status = 'failed';
    result.issues.push({
      name: 'Banned API Usage (document.write)',
      desc: 'Use of document.write() is prohibited as it causes performance degradation and security flaws.'
    });
  }
  if (/<script/i.test(htmlContent)) {
    result.status = 'failed';
    result.issues.push({
      name: 'Inline Template Script Tag',
      desc: 'Inline <script> tags inside HTML templates are forbidden to comply with strict CSP policies.'
    });
  }
  const inlineEventRegex = /\bon[a-z]+\s*=/i;
  if (inlineEventRegex.test(htmlContent)) {
    result.status = 'failed';
    result.issues.push({
      name: 'Inline Event Attributes',
      desc: 'Inline HTML event attributes (e.g. onclick, onerror) are forbidden. Bind events inside index.js instead.'
    });
  }
  if (/@import\s+url\(\s*['"]?http/i.test(cssContent)) {
    result.status = 'failed';
    result.issues.push({
      name: 'External HTTP Stylesheet Import',
      desc: 'CSS imports of external stylesheets via HTTP(S) are forbidden inside components to guarantee local execution.'
    });
  }
  if (/url\(\s*['"]?http/i.test(cssContent)) {
    result.warnings.push({
      name: 'External HTTP Asset Resource',
      desc: 'Found external asset reference in url(). Ensure it supports intranet/offline execution.'
    });
  }

  // Standards checks
  if (/:host\s*\*\s*\{|^\s*\*\s*\{/m.test(cssContent)) {
    result.warnings.push({
      name: 'Performance: Universal Selector (*)',
      desc: 'Avoid universal selectors in shadow styles as they degrade layout performance.'
    });
  }
  if (/setInterval\s*\(([^,]+)/.test(jsContent)) {
    const hasIntervalReference = /=\s*setInterval\s*\(/.test(jsContent);
    if (!hasIntervalReference) {
      result.warnings.push({
        name: 'Leak Warning: setInterval Reference',
        desc: 'setInterval used without storing its reference variable. Clean it up in disconnectedCallback to avoid memory leaks.'
      });
    }
  }
  if (jsContent.includes('ResizeObserver') && !jsContent.includes('disconnect(')) {
    result.warnings.push({
      name: 'Teardown Warning: ResizeObserver Teardown',
      desc: 'ResizeObserver instantiated but disconnect() is not invoked in disconnectedCallback.'
    });
  }
  if (jsContent.includes('addEventListener') && !jsContent.includes('removeEventListener') && !jsContent.includes('attachShadow')) {
    if (jsContent.includes('window.addEventListener') || jsContent.includes('document.addEventListener')) {
      result.warnings.push({
        name: 'Teardown Warning: Global Event Listeners',
        desc: 'Global event listeners registered but no corresponding removeEventListener cleanups found.'
      });
    }
  }
  if (cssContent.length > 0 && !cssContent.includes('var(--') && cssContent.includes('color:')) {
    result.warnings.push({
      name: 'Theme Compatibility: Raw Colors',
      desc: 'Standard color attributes defined directly without supporting CSS variable overrides (e.g. var(--color-primary)).'
    });
  }

  const defineMatch = jsContent.match(/customElements\.define\(\s*['"]([^'"]+)['"]/);
  if (!defineMatch) {
    result.status = 'failed';
    result.issues.push({
      name: 'Component Registration',
      desc: 'Component class must invoke customElements.define to register in the custom elements list.'
    });
  } else {
    const registeredTag = defineMatch[1];
    if (registeredTag !== tag) {
      result.status = 'failed';
      result.issues.push({
        name: 'Tag Naming Pattern Matching',
        desc: `Registered tag name "${registeredTag}" does not match file-kebab derived tag name "${tag}".`
      });
    }
  }

  const classMatch = jsContent.match(/class\s+(\w+)\s+extends\s+(\w+)/);
  if (!classMatch) {
    result.status = 'failed';
    result.issues.push({
      name: 'Class Inheritance',
      desc: 'Component JS must declare a class that extends HTMLElement.'
    });
  } else {
    const className = classMatch[1];
    const superClassName = classMatch[2];
    if (!className.startsWith('Ogulcan')) {
      result.warnings.push({
        name: 'Naming Guideline: PascalCase Class Prefix',
        desc: `Class "${className}" should start with "Ogulcan" (e.g. Ogulcan${name}).`
      });
    }
    if (superClassName !== 'HTMLElement') {
      result.status = 'failed';
      result.issues.push({
        name: 'Extended Super Class type',
        desc: `Class must extend "HTMLElement" directly (found extending "${superClassName}").`
      });
    }
  }

  // Dynamic sandbox mount audit
  if (result.status !== 'failed') {
    try {
      setupMockDOM();

      let resolvedJs = jsContent;
      resolvedJs = resolvedJs.replace(/\/\*\s*\[style\.css\]\s*\*\//g, () => cssContent.trim());
      resolvedJs = resolvedJs.replace(/<!--\s*\[template\.html\]\s*-->/g, () => htmlContent.trim());
      
      const tempFilename = `temp_srv_${name}_${Date.now()}.js`;
      const tempPath = path.join(__dirname, `../scratch/${tempFilename}`);
      
      if (!fs.existsSync(path.join(__dirname, '../scratch'))) {
        fs.mkdirSync(path.join(__dirname, '../scratch'));
      }
      
      fs.writeFileSync(tempPath, resolvedJs, 'utf8');

      // Import the component code inside Bun's context
      const fileUrl = 'file://' + tempPath.replace(/\\/g, '/');
      await import(fileUrl);
      fs.unlinkSync(tempPath);

      const RegisteredClass = customElements.get(tag);
      if (!RegisteredClass) {
        result.status = 'failed';
        result.issues.push({
          name: 'Mount: Custom Element Definition List',
          desc: `Tag <${tag}> was not found registered under customElements.`
        });
      } else {
        let element;
        try {
          element = new RegisteredClass();
          document.body.appendChild(element);
          element.isConnected = true;
          
          if (!element.shadowRoot) {
            result.status = 'failed';
            result.issues.push({
              name: 'Mount: Shadow Root Attachment',
              desc: 'Component class failed to attach a Shadow root to custom element.'
            });
          }

          const observedAttributes = RegisteredClass.observedAttributes || [];
          observedAttributes.forEach(attr => {
            const propName = attr.replace(/-([a-z])/g, (g) => g[1].toUpperCase());
            const proto = RegisteredClass.prototype;
            const propDesc = Object.getOwnPropertyDescriptor(proto, propName);
            if (!propDesc || typeof propDesc.get !== 'function' || typeof propDesc.set !== 'function') {
              result.warnings.push({
                name: `Sync Warning: Attribute property missing`,
                desc: `Attribute "${attr}" is observed, but class is missing matching getter/setter property "${propName}".`
              });
            }

            const testVal = attr === 'data' ? '[1,2,3]' : 'test';
            try {
              element.setAttribute(attr, testVal);
            } catch (e) {}
          });

          document.body.removeChild(element);
          element.isConnected = false;
        } catch (e) {
          result.status = 'failed';
          result.issues.push({
            name: 'Mount: Element Instantiation/Connection',
            desc: `Element crashed during setup: ${e.message}`
          });
        }
      }
    } catch (err) {
      result.status = 'failed';
      result.issues.push({
        name: 'Mount: ES Module Script Execution',
        desc: `Dynamic browser execution failed: ${err.message}`
      });
    }
  }

  if (result.issues.length > 0) {
    result.status = 'failed';
  } else if (result.warnings.length > 0) {
    result.status = 'warning';
  }

  return result;
}

/**
 * 3. Start Bun Server serving static client files & api calls
 */
const server = Bun.serve({
  port: PORT,
  async fetch(req) {
    const url = new URL(req.url);
    const pathname = url.pathname;

    // CORS headers for local environment
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Content-Type': 'application/json'
    };

    if (req.method === 'OPTIONS') {
      return new Response('', { headers: corsHeaders });
    }

    // API: GET /api/components
    if (pathname === '/api/components') {
      try {
        const listPath = path.join(PUBLIC_DIR, 'src/components.json');
        const list = JSON.parse(await Bun.file(listPath).text());
        return new Response(JSON.stringify(list), { headers: corsHeaders });
      } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders });
      }
    }

    // API: GET /api/components/:name
    if (pathname.startsWith('/api/components/')) {
      const compName = pathname.substring('/api/components/'.length);
      const compDir = path.join(srcComponentsDir, compName);
      try {
        if (!fs.existsSync(compDir)) {
          return new Response(JSON.stringify({ error: 'Component not found' }), { status: 404, headers: corsHeaders });
        }
        const js = await Bun.file(path.join(compDir, 'index.js')).text().catch(() => '');
        const css = await Bun.file(path.join(compDir, 'index.css')).text().catch(() => '');
        const html = await Bun.file(path.join(compDir, 'index.html')).text().catch(() => '');

        return new Response(JSON.stringify({ name: compName, js, css, html }), { headers: corsHeaders });
      } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders });
      }
    }

    // API: GET /api/verify
    if (pathname === '/api/verify') {
      try {
        const listPath = path.join(PUBLIC_DIR, 'src/components.json');
        const componentNames = JSON.parse(await Bun.file(listPath).text());
        const reports = [];

        for (const name of componentNames) {
          const compDir = path.join(srcComponentsDir, name);
          const report = await auditComponent(name, compDir);
          reports.push(report);
        }

        return new Response(JSON.stringify(reports), { headers: corsHeaders });
      } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders });
      }
    }

    // API: GET /api/verify/:name
    if (pathname.startsWith('/api/verify/')) {
      const compName = pathname.substring('/api/verify/'.length);
      const compDir = path.join(srcComponentsDir, compName);
      try {
        if (!fs.existsSync(compDir)) {
          return new Response(JSON.stringify({ error: 'Component not found' }), { status: 404, headers: corsHeaders });
        }
        const report = await auditComponent(compName, compDir);
        return new Response(JSON.stringify(report), { headers: corsHeaders });
      } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders });
      }
    }

    // Fallback: Static File Server
    let fileRelPath = pathname === '/' ? 'demo.html' : pathname;
    const filePath = path.join(PUBLIC_DIR, fileRelPath);

    // Prevent directory traversal
    if (!filePath.startsWith(PUBLIC_DIR)) {
      return new Response('Forbidden', { status: 403 });
    }

    const file = Bun.file(filePath);
    if (await file.exists()) {
      // Bun automatically resolves the MIME type based on file extension
      return new Response(file);
    }

    return new Response('Not Found', { status: 404 });
  }
});

console.log(`\n🚀 Bun server running at http://localhost:${PORT}/`);
console.log(`Open http://localhost:${PORT}/demo.html to view the Interactive Catalog Dashboard`);
console.log(`Open http://localhost:${PORT}/verify.html to run the Compliance Verifier\n`);

// Auto-open browser
const urlToOpen = `http://localhost:${PORT}/demo.html`;
const platform = process.platform;
let cmd = '';

if (platform === 'win32') {
  cmd = `start "" "${urlToOpen}"`;
} else if (platform === 'darwin') {
  cmd = `open "${urlToOpen}"`;
} else {
  cmd = `xdg-open "${urlToOpen}"`;
}

exec(cmd, (err) => {
  if (err) {
    console.log(`Note: Could not open browser automatically: ${err.message}`);
  } else {
    console.log(`✔ Automatically opened Interactive Catalog in default browser.`);
  }
});
