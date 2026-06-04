const fs = require('fs');
const path = require('path');
const { runScript } = require('./lib/runtime');
const {
  STYLE_PLACEHOLDER,
  TEMPLATE_PLACEHOLDER,
  toKebabTag,
  toClassName
} = require('./component-contract');

const green = '\x1b[32m';
const red = '\x1b[31m';
const yellow = '\x1b[33m';
const reset = '\x1b[0m';
const bold = '\x1b[1m';

function formatTitle(str) {
  return str.replace(/([a-z0-9])([A-Z])/g, '$1 $2');
}

function addComponent() {
  const args = process.argv.slice(2);
  const name = args[0];

  if (!name) {
    console.error(`${red}Error: Please specify component name.${reset}`);
    console.log(`Usage: ${bold}bun run add-component <ComponentName>${reset}`);
    process.exit(1);
  }

  if (!/^[A-Z][a-zA-Z0-9]*$/.test(name)) {
    console.error(`${red}Error: "${name}" must be PascalCase.${reset}`);
    process.exit(1);
  }

  const componentsDir = path.join(__dirname, '../src/components');
  const compDir = path.join(componentsDir, name);
  if (fs.existsSync(compDir)) {
    console.error(`${red}Error: Component "${name}" already exists.${reset}`);
    process.exit(1);
  }

  fs.mkdirSync(compDir, { recursive: true });

  const title = formatTitle(name);
  const tag = toKebabTag(name);
  const className = toClassName(name);

  const htmlContent = `<section class="card">
  <header class="head">
    <div>
      <p class="eyebrow">${title}</p>
      <h3 class="title"></h3>
    </div>
    <span class="status-pill"></span>
  </header>
  <div class="content">
    <p class="body-copy"></p>
  </div>
  <button class="action-btn" type="button">Run action</button>
</section>
`;

  const cssContent = `:host {
  display: block;
  font-family: var(--font-sans, sans-serif);
  color: var(--text-primary, #fff);
}

.card {
  display: grid;
  gap: 14px;
  padding: 18px;
  background: var(--glass-bg, rgba(17, 24, 39, 0.7));
  border: 1px solid var(--glass-border, rgba(55, 65, 81, 0.8));
  border-radius: var(--radius-xl, 8px);
  box-shadow: var(--shadow-md);
}

.head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
}

.eyebrow {
  margin: 0;
  font-size: 11px;
  color: var(--text-muted, #9ca3af);
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.title {
  margin: 4px 0 0;
  font-size: 17px;
}

.status-pill {
  display: inline-flex;
  align-items: center;
  min-height: 28px;
  padding: 0 10px;
  border-radius: var(--radius-full, 9999px);
  font-size: 11px;
  font-weight: 700;
  background: rgba(16, 185, 129, 0.12);
  border: 1px solid rgba(16, 185, 129, 0.28);
  color: var(--color-success, #10b981);
}

.body-copy {
  margin: 0;
  font-size: 13px;
  color: var(--text-secondary, #e5e7eb);
}

.action-btn {
  min-height: 40px;
  border: none;
  border-radius: var(--radius-lg, 8px);
  background: linear-gradient(135deg, var(--color-primary, #6366f1) 0%, var(--color-info, #06b6d4) 100%);
  color: var(--text-on-primary, #fff);
  font-weight: 700;
  cursor: pointer;
}
`;

  const jsContent = `/**
 * OgulcanUI ${name} Web Component
 */
export class ${className} extends HTMLElement {
  static get observedAttributes() {
    return ['title', 'status', 'body-copy', 'action-label'];
  }

  constructor() {
    super();
    this._title = '${title}';
    this._status = 'Ready';
    this._bodyCopy = '${title} state available.';
    this._actionLabel = 'Run action';
    this._structureReady = false;
    this._eventsBound = false;
    this.attachShadow({ mode: 'open' });
  }

  connectedCallback() {
    this.renderStructure();
    this.cacheElements();
    this.bindEvents();
    this.upgradeProperty('title');
    this.upgradeProperty('status');
    this.upgradeProperty('bodyCopy');
    this.upgradeProperty('actionLabel');
    this.draw();
  }

  disconnectedCallback() {
    if (this._actionHandler && this.actionBtn) {
      this.actionBtn.removeEventListener('click', this._actionHandler);
    }
    this._eventsBound = false;
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue === newValue) return;

    switch (name) {
      case 'title':
        this._title = newValue || '${title}';
        break;
      case 'status':
        this._status = newValue || 'Ready';
        break;
      case 'body-copy':
        this._bodyCopy = newValue || '${title} state available.';
        break;
      case 'action-label':
        this._actionLabel = newValue || 'Run action';
        break;
    }

    if (this.isConnected) this.draw();
  }

  get title() { return this._title; }
  set title(v) { this._title = v; this.setAttribute('title', v == null ? '${title}' : String(v)); }
  get status() { return this._status; }
  set status(v) { this._status = v; this.setAttribute('status', v == null ? 'Ready' : String(v)); }
  get bodyCopy() { return this._bodyCopy; }
  set bodyCopy(v) { this._bodyCopy = v; this.setAttribute('body-copy', v == null ? '${title} state available.' : String(v)); }
  get actionLabel() { return this._actionLabel; }
  set actionLabel(v) { this._actionLabel = v; this.setAttribute('action-label', v == null ? 'Run action' : String(v)); }

  upgradeProperty(prop) {
    if (Object.prototype.hasOwnProperty.call(this, prop)) {
      const value = this[prop];
      delete this[prop];
      this[prop] = value;
    }
  }

  renderStructure() {
    if (this._structureReady) return;
    this.shadowRoot.innerHTML = \`
      <style>
        ${STYLE_PLACEHOLDER}
      </style>
      ${TEMPLATE_PLACEHOLDER}
    \`;
    this._structureReady = true;
  }

  cacheElements() {
    this.titleEl = this.shadowRoot.querySelector('.title');
    this.statusEl = this.shadowRoot.querySelector('.status-pill');
    this.bodyCopyEl = this.shadowRoot.querySelector('.body-copy');
    this.actionBtn = this.shadowRoot.querySelector('.action-btn');
  }

  bindEvents() {
    if (this._eventsBound || !this.actionBtn) return;
    this._actionHandler = () => {
      this.dispatchEvent(new CustomEvent('action-triggered', {
        detail: {
          component: '${name}',
          status: this._status,
          timestamp: Date.now()
        },
        bubbles: true,
        composed: true
      }));
    };
    this.actionBtn.addEventListener('click', this._actionHandler);
    this._eventsBound = true;
  }

  draw() {
    if (this.titleEl) this.titleEl.textContent = this._title;
    if (this.statusEl) this.statusEl.textContent = this._status;
    if (this.bodyCopyEl) this.bodyCopyEl.textContent = this._bodyCopy;
    if (this.actionBtn) this.actionBtn.textContent = this._actionLabel;
  }
}

customElements.define('${tag}', ${className});
`;

  fs.writeFileSync(path.join(compDir, 'index.html'), htmlContent, 'utf8');
  fs.writeFileSync(path.join(compDir, 'index.css'), cssContent, 'utf8');
  fs.writeFileSync(path.join(compDir, 'index.js'), jsContent, 'utf8');

  console.log(`${green}Scaffolded ${name}.${reset}`);

  const testResult = runScript(path.join(__dirname, 'test-all-components.js'), [name]);
  if (testResult.status !== 0) {
    console.error(`${red}Verification failed for ${name}.${reset}`);
    process.exit(1);
  }

  const buildResult = runScript(path.join(__dirname, 'build.js'), []);
  if (buildResult.status !== 0) {
    console.warn(`${yellow}Build step failed after scaffold. Run bun run build manually.${reset}`);
  }

  console.log(`${green}${bold}Success: ${name} added with enterprise scaffold.${reset}`);
}

addComponent();
