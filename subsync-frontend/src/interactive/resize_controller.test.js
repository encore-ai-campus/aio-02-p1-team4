const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

class FakeElement {
  constructor(tagName, document) {
    this.tagName = tagName.toUpperCase();
    this.ownerDocument = document;
    this.style = {};
    this.className = "";
    this.dataset = {};
    this.children = [];
    this.parentNode = null;
    this.listeners = new Map();
    this.rect = { left: 100, top: 80, width: 420, height: 520 };
  }

  get classList() {
    const self = this;
    return {
      contains(name) {
        return self.className.split(/\s+/).filter(Boolean).includes(name);
      },
      add(...names) {
        const values = new Set(self.className.split(/\s+/).filter(Boolean));
        names.forEach((name) => values.add(name));
        self.className = [...values].join(" ");
      },
      remove(...names) {
        const values = new Set(self.className.split(/\s+/).filter(Boolean));
        names.forEach((name) => values.delete(name));
        self.className = [...values].join(" ");
      }
    };
  }

  setAttribute(name, value) {
    this[name] = String(value);
  }

  appendChild(child) {
    child.parentNode = this;
    this.children.push(child);
    return child;
  }

  addEventListener(type, handler, options) {
    if (!this.listeners.has(type)) this.listeners.set(type, []);
    this.listeners.get(type).push({ handler, options });
  }

  removeEventListener(type, handler) {
    this.listeners.set(
      type,
      (this.listeners.get(type) || []).filter((item) => item.handler !== handler)
    );
  }

  dispatch(type, extra = {}) {
    const event = {
      type,
      target: this,
      currentTarget: this,
      button: 0,
      pointerId: 1,
      preventDefault() {
        this.defaultPrevented = true;
      },
      stopPropagation() {},
      ...extra
    };
    for (const { handler } of this.listeners.get(type) || []) handler(event);
    return event;
  }

  getBoundingClientRect() {
    return {
      ...this.rect,
      right: this.rect.left + this.rect.width,
      bottom: this.rect.top + this.rect.height
    };
  }
}

class FakeDocument {
  constructor() {
    this.listeners = new Map();
  }

  createElement(tagName) {
    return new FakeElement(tagName, this);
  }

  addEventListener(type, handler, options) {
    if (!this.listeners.has(type)) this.listeners.set(type, []);
    this.listeners.get(type).push({ handler, options });
  }

  removeEventListener(type, handler) {
    this.listeners.set(
      type,
      (this.listeners.get(type) || []).filter((item) => item.handler !== handler)
    );
  }

  dispatch(type, extra = {}) {
    const event = {
      type,
      target: this,
      currentTarget: this,
      pointerId: 1,
      preventDefault() {
        this.defaultPrevented = true;
      },
      stopPropagation() {},
      ...extra
    };
    for (const { handler } of this.listeners.get(type) || []) handler(event);
    return event;
  }
}

function createContext() {
  const document = new FakeDocument();
  const context = {
    document,
    window: null,
    innerWidth: 1280,
    innerHeight: 900,
    console
  };
  context.window = context;
  context.__SubSync = {};
  return context;
}

function loadResizer(context) {
  const filename = path.join(__dirname, "resize_controller.js");
  vm.runInNewContext(fs.readFileSync(filename, "utf8"), context, { filename });
  return context.__SubSync.resize;
}

function findHandle(element, direction) {
  return element.children.find((child) =>
    child.classList.contains(`subsync-resize-${direction}`)
  );
}

test("resize attaches all eight directional handles", () => {
  const context = createContext();
  const resize = loadResizer(context);
  const element = new FakeElement("div", context.document);

  resize.attach(element);

  for (const direction of ["n", "ne", "e", "se", "s", "sw", "w", "nw"]) {
    assert.ok(findHandle(element, direction), `missing ${direction} handle`);
  }
});

test("east and south handles resize the panel without moving its origin", () => {
  const context = createContext();
  const resize = loadResizer(context);
  const eastElement = new FakeElement("div", context.document);

  resize.attach(eastElement, { minWidth: 300, minHeight: 240 });
  const east = findHandle(eastElement, "e");
  east.dispatch("pointerdown", { clientX: 520, clientY: 340 });
  context.document.dispatch("pointermove", { clientX: 620, clientY: 340 });

  assert.equal(eastElement.style.left, "100px");
  assert.equal(eastElement.style.top, "80px");
  assert.equal(eastElement.style.width, "520px");
  assert.equal(eastElement.style.height, "520px");

  const southElement = new FakeElement("div", context.document);
  resize.attach(southElement, { minWidth: 300, minHeight: 240 });
  const south = findHandle(southElement, "s");
  south.dispatch("pointerdown", { clientX: 520, clientY: 600 });
  context.document.dispatch("pointermove", { clientX: 520, clientY: 700 });

  assert.equal(southElement.style.left, "100px");
  assert.equal(southElement.style.top, "80px");
  assert.equal(southElement.style.width, "420px");
  assert.equal(southElement.style.height, "620px");
});

test("northwest handle resizes while preserving the opposite corner", () => {
  const context = createContext();
  const resize = loadResizer(context);
  const element = new FakeElement("div", context.document);

  resize.attach(element, { minWidth: 300, minHeight: 240 });
  const northwest = findHandle(element, "nw");
  northwest.dispatch("pointerdown", { clientX: 100, clientY: 80 });
  context.document.dispatch("pointermove", { clientX: 40, clientY: 100 });

  assert.equal(element.style.left, "40px");
  assert.equal(element.style.top, "100px");
  assert.equal(element.style.width, "480px");
  assert.equal(element.style.height, "500px");
});

test("resizing cannot shrink the panel below its minimum size", () => {
  const context = createContext();
  const resize = loadResizer(context);
  const element = new FakeElement("div", context.document);

  resize.attach(element, { minWidth: 300, minHeight: 240 });
  const northwest = findHandle(element, "nw");
  northwest.dispatch("pointerdown", { clientX: 100, clientY: 80 });
  context.document.dispatch("pointermove", { clientX: 500, clientY: 500 });

  assert.equal(element.style.width, "300px");
  assert.equal(element.style.height, "240px");
});
