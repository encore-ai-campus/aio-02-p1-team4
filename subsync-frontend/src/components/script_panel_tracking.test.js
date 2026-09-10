const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

class FakeElement {
  constructor(tagName, ownerDocument) {
    this.tagName = tagName.toUpperCase();
    this.ownerDocument = ownerDocument;
    this.children = [];
    this.parentNode = null;
    this.style = {};
    this.dataset = {};
    this.className = "";
    this.id = "";
    this.attributes = {};
    this.textContent = "";
    this.listeners = new Map();
    this.scrollTop = 0;
    this.scrollCalls = [];
    this.offsetTop = 0;
    this._innerHTML = "";
  }

  get classList() {
    const self = this;
    return {
      contains(name) {
        return self.className.split(/\s+/).filter(Boolean).includes(name);
      },
      add(...names) {
        const current = new Set(self.className.split(/\s+/).filter(Boolean));
        names.forEach((name) => current.add(name));
        self.className = [...current].join(" ");
      },
      remove(...names) {
        const removeSet = new Set(names);
        self.className = self.className
          .split(/\s+/)
          .filter((name) => name && !removeSet.has(name))
          .join(" ");
      },
      toggle(name, force) {
        const shouldAdd = force === undefined ? !this.contains(name) : Boolean(force);
        if (shouldAdd) this.add(name);
        else this.remove(name);
        return shouldAdd;
      }
    };
  }

  appendChild(child) {
    child.parentNode = this;
    child.offsetTop = this.children.length * 100;
    this.children.push(child);
    return child;
  }

  addEventListener(type, handler) {
    if (!this.listeners.has(type)) this.listeners.set(type, []);
    this.listeners.get(type).push(handler);
  }

  setAttribute(name, value) {
    this.attributes[name] = String(value);
  }

  scrollTo(options) {
    this.scrollCalls.push(options);
    this.scrollTop = options.top;
  }

  focus() {}

  set innerHTML(value) {
    this._innerHTML = String(value);
    this.children = [];
    const tagPattern = /<([a-zA-Z][\w-]*)([^>]*)>/g;
    let match;
    while ((match = tagPattern.exec(this._innerHTML))) {
      const [, tagName, attributes] = match;
      const child = new FakeElement(tagName, this.ownerDocument);
      const idMatch = attributes.match(/\bid=["']([^"']+)["']/i);
      const classMatch = attributes.match(/\bclass=["']([^"']+)["']/i);
      if (idMatch) child.id = idMatch[1];
      if (classMatch) child.className = classMatch[1];
      this.appendChild(child);
    }
  }

  get innerHTML() {
    return this._innerHTML;
  }

  querySelector(selector) {
    return this.querySelectorAll(selector)[0] || null;
  }

  querySelectorAll(selector) {
    const matches = [];
    const predicate = (node) => {
      if (selector.startsWith(".")) return node.classList.contains(selector.slice(1));
      if (selector.startsWith("#")) return node.id === selector.slice(1);
      return node.tagName.toLowerCase() === selector.toLowerCase();
    };
    const visit = (node) => {
      for (const child of node.children) {
        if (predicate(child)) matches.push(child);
        visit(child);
      }
    };
    visit(this);
    return matches;
  }
}

class FakeDocument {
  constructor() {
    this.body = new FakeElement("body", this);
  }

  createElement(tagName) {
    return new FakeElement(tagName, this);
  }

  createDocumentFragment() {
    return new FakeElement("fragment", this);
  }
}

function createContext() {
  const document = new FakeDocument();
  const context = {
    console,
    document,
    window: null,
    setTimeout,
    clearTimeout,
    __SubSync: {
      icon: (name, className) => `<img class="subsync-ui-icon ${className}" src="assets/icons/${name}.svg">`,
      layout: { getScriptArea: () => document.body, switchScreen() {} },
      player: { seekTo() {} }
    }
  };
  context.window = context;
  return context;
}

function loadScript(context) {
  const filename = path.join(__dirname, "script_panel.js");
  vm.runInNewContext(fs.readFileSync(filename, "utf8"), context, { filename });
}

test("paused Script time keeps the cue focused without moving the list", () => {
  const context = createContext();
  loadScript(context);
  const scriptPanel = context.__SubSync.scriptPanel;

  scriptPanel.setSubtitles([
    { timestamp: 58, end_timestamp: 80, learn: "The first sentence.", known: "첫 문장" },
    { timestamp: 81, end_timestamp: 90, learn: "The paused sentence.", known: "정지한 문장" }
  ]);

  const list = context.document.body.querySelector("#subsync-script-list");
  const rows = list.querySelectorAll(".subsync-script-row");
  list.offsetTop = 0;
  list.scrollTop = 500;

  scriptPanel.highlightTime(86, { autoScroll: false });
  assert.equal(rows[0].classList.contains("active"), false);
  assert.equal(rows[1].classList.contains("active"), true);
  assert.equal(list.scrollCalls.length, 0);

  scriptPanel.highlightTime(86, { autoScroll: true });
  assert.equal(list.scrollCalls.length, 1);
  assert.equal(list.scrollCalls[0].top, 84);
});
