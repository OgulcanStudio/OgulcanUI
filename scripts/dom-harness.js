/**
 * Minimal DOM for mounting OgulcanUI custom elements in Node (no browser).
 * Invokes connected/disconnected callbacks like a real document.
 */

function setupMockDOM() {
  class MockHTMLElement {
    constructor() {
      this._attributes = new Map();
      this.shadowRoot = null;
      this.childNodes = [];
      this.style = {
        setProperty() {},
        getPropertyValue() {
          return '';
        }
      };
      this.classList = {
        add: () => {},
        remove: () => {},
        toggle: () => {},
        contains: () => false
      };
      this._listeners = new Map();
      this.isConnected = false;
    }

    attachShadow() {
      this.shadowRoot = new MockShadowRoot(this);
      return this.shadowRoot;
    }

    setAttribute(name, value) {
      const old = this._attributes.get(name);
      const next = String(value);
      this._attributes.set(name, next);
      if (this.attributeChangedCallback && old !== next) {
        this.attributeChangedCallback(name, old, next);
      }
    }

    getAttribute(name) {
      return this._attributes.has(name) ? this._attributes.get(name) : null;
    }

    hasAttribute(name) {
      return this._attributes.has(name);
    }

    removeAttribute(name) {
      const old = this._attributes.get(name);
      this._attributes.delete(name);
      if (this.attributeChangedCallback && old !== undefined) {
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

    contains() {
      return false;
    }

    addEventListener(event, callback) {
      this._listeners.set(event, callback);
    }

    removeEventListener(event) {
      this._listeners.delete(event);
    }

    dispatchEvent() {
      return true;
    }

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
      if (idx !== -1) this.childNodes.splice(idx, 1);
      return child;
    }

    querySelector() {
      return new MockElement('div');
    }

    querySelectorAll() {
      return [new MockElement('div')];
    }

    getElementById() {
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

    querySelector() {
      return new MockElement('div');
    }

    querySelectorAll() {
      return [new MockElement('div')];
    }
  }

  class MockCustomElement extends MockHTMLElement {
    connectedCallback() {}
    disconnectedCallback() {}
  }

  globalThis.HTMLElement = MockCustomElement;
  globalThis.window = globalThis;
  const docListeners = new Map();

  globalThis.document = {
    createElement(tagName) {
      const Registered = globalThis.customElements?.get?.(tagName);
      if (Registered) return new Registered();
      return new MockElement(tagName);
    },
    createElementNS(_ns, tagName) {
      return new MockElement(tagName);
    },
    createTextNode(text) {
      return { textContent: text };
    },
    addEventListener(type, handler) {
      docListeners.set(type, handler);
    },
    removeEventListener(type) {
      docListeners.delete(type);
    },
    body: new MockElement('body')
  };

  const origAppend = MockElement.prototype.appendChild;
  MockElement.prototype.appendChild = function (child) {
    origAppend.call(this, child);
    if (child && typeof child.connectedCallback === 'function' && !child.isConnected) {
      child.isConnected = true;
      try {
        child.connectedCallback();
      } catch (err) {
        err._ogulcanLifecycle = 'connectedCallback';
        throw err;
      }
    }
    return child;
  };

  const origRemove = MockElement.prototype.removeChild;
  MockElement.prototype.removeChild = function (child) {
    if (child && typeof child.disconnectedCallback === 'function' && child.isConnected) {
      child.isConnected = false;
      try {
        child.disconnectedCallback();
      } catch (err) {
        err._ogulcanLifecycle = 'disconnectedCallback';
        throw err;
      }
    }
    return origRemove.call(this, child);
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
      this.detail = options?.detail ?? null;
    }
  };

  globalThis.performance = globalThis.performance || { now: () => Date.now() };

  globalThis.requestAnimationFrame = (cb) => setTimeout(() => cb(performance.now()), 0);
  globalThis.cancelAnimationFrame = (id) => clearTimeout(id);
}

module.exports = { setupMockDOM };