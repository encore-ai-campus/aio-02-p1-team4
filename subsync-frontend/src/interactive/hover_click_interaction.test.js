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
    this.disabled = false;
    this.listeners = new Map();
    this._innerHTML = "";
    this.offsetWidth = tagName.toLowerCase() === "div" ? 220 : 0;
    this.offsetHeight = tagName.toLowerCase() === "div" ? 72 : 0;
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
      }
    };
  }

  appendChild(child) {
    child.parentNode = this;
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

  dispatchEvent(type, extra = {}) {
    const event = {
      type,
      target: this,
      currentTarget: this,
      preventDefault() {},
      stopPropagation() {},
      ...extra
    };
    for (const handler of this.listeners.get(type) || []) handler(event);
  }

  contains(node) {
    if (node === this) return true;
    return this.children.some((child) => child.contains(node));
  }

  getBoundingClientRect() {
    return { left: 100, top: 100, bottom: 120, right: 180 };
  }

  set innerHTML(value) {
    this._innerHTML = String(value);
    this.children = [];

    const tagPattern = /<([a-zA-Z][\w-]*)([^>]*)>/g;
    let match;
    while ((match = tagPattern.exec(this._innerHTML))) {
      const [, tagName, attributes] = match;
      if (tagName.toLowerCase() === "!doctype") continue;
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
    this.listeners = new Map();
  }

  createElement(tagName) {
    return new FakeElement(tagName, this);
  }

  createTextNode(text) {
    const node = new FakeElement("text", this);
    node.textContent = text;
    return node;
  }

  createDocumentFragment() {
    return new FakeElement("fragment", this);
  }

  addEventListener(type, handler) {
    if (!this.listeners.has(type)) this.listeners.set(type, []);
    this.listeners.get(type).push(handler);
  }

  getElementById(id) {
    return this.body.querySelector(`#${id}`);
  }

  querySelector(selector) {
    return this.body.querySelector(selector);
  }
}

function createContext() {
  const document = new FakeDocument();
  const context = {
    console,
    document,
    setTimeout,
    clearTimeout,
    window: null,
    innerWidth: 1280,
    scrollX: 0,
    scrollY: 0,
    SubSync: {}
  };
  context.window = context;
  context.__SubSync = {};
  return context;
}

function loadScript(context, relativePath) {
  const filename = path.join(__dirname, relativePath);
  vm.runInNewContext(fs.readFileSync(filename, "utf8"), context, { filename });
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

test("hover preview remains open while moving from the word into the tooltip", async () => {
  const context = createContext();
  const SubSync = context.__SubSync;
  SubSync.settings = { get: () => true };
  SubSync.dictService = {
    async getHoverMeaning() {
      return { meanings: ["어떤"] };
    }
  };

  loadScript(context, "hover_tooltip.js");

  const target = context.document.createElement("span");
  context.document.body.appendChild(target);
  SubSync.hoverTooltip.show("any", target, "Ask any question.");
  await wait(240);

  const tooltip = context.document.querySelector(".subsync-hover-tooltip");
  assert.ok(tooltip);
  assert.equal(tooltip.style.display, "block");

  let wheelPrevented = false;
  let wheelStopped = false;
  tooltip.dispatchEvent("wheel", {
    preventDefault() {
      wheelPrevented = true;
    },
    stopPropagation() {
      wheelStopped = true;
    }
  });
  assert.equal(wheelPrevented, true);
  assert.equal(wheelStopped, true);

  target.dispatchEvent("mouseleave");
  SubSync.hoverTooltip.leaveTarget();
  tooltip.dispatchEvent("mouseenter");
  await wait(350);

  assert.equal(tooltip.style.display, "block");

  tooltip.dispatchEvent("mouseleave");
  await wait(500);
  assert.equal(tooltip.style.display, "none");
});

test("hover tooltip is placed outside the hovered token bounds", async () => {
  const context = createContext();
  const SubSync = context.__SubSync;
  SubSync.settings = { get: () => true };
  SubSync.dictService = {
    async getHoverMeaning() {
      return { meanings: ["어떤"] };
    }
  };

  loadScript(context, "hover_tooltip.js");

  const target = context.document.createElement("span");
  target.getBoundingClientRect = () => ({ left: 100, top: 100, bottom: 120, right: 180 });
  context.document.body.appendChild(target);
  SubSync.hoverTooltip.show("any", target, "Ask any question.");
  await wait(20);

  const tooltip = context.document.querySelector(".subsync-hover-tooltip");
  const tooltipTop = Number.parseFloat(tooltip.style.top);
  assert.ok(Number.isFinite(tooltipTop));
  assert.ok(
    tooltipTop + tooltip.offsetHeight <= target.getBoundingClientRect().top,
    "tooltip must not cover the hovered token"
  );
});

test("hover tooltip CTA opens the persistent detail interaction", async () => {
  const context = createContext();
  const SubSync = context.__SubSync;
  SubSync.settings = { get: () => true };
  SubSync.dictService = {
    async getHoverMeaning() {
      return { meanings: ["어떤"] };
    }
  };
  const calls = [];
  SubSync.clickPopup = {
    show(...args) {
      calls.push(args);
    }
  };

  loadScript(context, "hover_tooltip.js");

  const target = context.document.createElement("span");
  context.document.body.appendChild(target);
  SubSync.hoverTooltip.show("any", target, "Ask any question.");
  await wait(240);

  const cta = context.document.querySelector(".subsync-tt-hint");
  assert.ok(cta);
  assert.equal(cta.tagName, "BUTTON");
  cta.dispatchEvent("click");

  assert.deepEqual(calls, [["any", "Ask any question.", target]]);
});

test("detail popup stays available and closes with its X button", async () => {
  const context = createContext();
  const SubSync = context.__SubSync;
  SubSync.settings = { get: (key) => (key === "saveMode" ? "manual" : true) };
  SubSync.authService = { async isAuthenticated() { return true; } };
  SubSync.authModal = { show() {} };
  SubSync.dictService = {
    async getDetailMeaning() {
      return {
        word: "any",
        phonetic: "/ˈeni/",
        part_of_speech: "determiner",
        meanings: ["어떤"],
        definitions: ["하나라도"],
        phrases: []
      };
    },
    async saveWord() {}
  };
  SubSync.logService = { recordClick() {} };
  SubSync.player = { getCurrentTime: () => 1 };

  loadScript(context, "click_popup.js");

  const target = context.document.createElement("span");
  target.className = "subsync-word";
  context.document.body.appendChild(target);
  await SubSync.clickPopup.show("any", "Ask any question.", target);

  const popup = context.document.querySelector(".subsync-click-popup");
  assert.ok(popup);
  assert.equal(popup.style.display, "block");

  const closeButton = popup.querySelector(".subsync-popup-close-btn");
  assert.ok(closeButton);
  closeButton.dispatchEvent("click");
  await wait(260);
  assert.equal(popup.style.display, "none");
});

test("detail popup error state also keeps an X close control", async () => {
  const context = createContext();
  const SubSync = context.__SubSync;
  SubSync.settings = { get: (key) => (key === "saveMode" ? "manual" : true) };
  SubSync.authService = { async isAuthenticated() { return true; } };
  SubSync.authModal = { show() {} };
  SubSync.dictService = {
    async getDetailMeaning() {
      throw new Error("backend unavailable");
    }
  };
  SubSync.logService = { recordClick() {} };
  SubSync.player = { getCurrentTime: () => 1 };

  loadScript(context, "click_popup.js");

  const target = context.document.createElement("span");
  context.document.body.appendChild(target);
  await SubSync.clickPopup.show("any", "Ask any question.", target);

  const popup = context.document.querySelector(".subsync-click-popup");
  const closeButton = popup.querySelector(".subsync-popup-close-btn");
  assert.ok(closeButton);
  closeButton.dispatchEvent("click");
  await wait(260);
  assert.equal(popup.style.display, "none");
});
