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
    this.listeners = new Map();
    this.parentNode = null;
    this.rect = { left: 100, top: 80, width: 300, height: 200 };
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

  setPointerCapture(pointerId) {
    this.capturedPointerId = pointerId;
  }

  releasePointerCapture(pointerId) {
    this.releasedPointerId = pointerId;
  }

  getBoundingClientRect() {
    return {
      ...this.rect,
      right: this.rect.left + this.rect.width,
      bottom: this.rect.top + this.rect.height
    };
  }

  closest(selector) {
    if (selector.includes("button") && this.tagName === "BUTTON") return this;
    return null;
  }
}

class FakeDocument {
  constructor() {
    this.listeners = new Map();
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
    innerWidth: 1000,
    innerHeight: 800,
    console
  };
  context.window = context;
  context.__SubSync = {};
  return context;
}

function loadDragController(context) {
  const filename = path.join(__dirname, "drag_controller.js");
  vm.runInNewContext(fs.readFileSync(filename, "utf8"), context, { filename });
  return context.__SubSync.drag;
}

test("drag moves a floating element and converts it to viewport coordinates", () => {
  const context = createContext();
  const drag = loadDragController(context);
  const element = new FakeElement("div", context.document);
  const handle = new FakeElement("div", context.document);
  element.style.right = "24px";
  element.style.bottom = "60px";
  element.style.transform = "translateX(-50%)";

  drag.attach(element, handle);
  handle.dispatch("pointerdown", { clientX: 150, clientY: 120 });
  context.document.dispatch("pointermove", { clientX: 300, clientY: 270 });

  assert.equal(element.style.left, "250px");
  assert.equal(element.style.top, "230px");
  assert.equal(element.style.right, "auto");
  assert.equal(element.style.bottom, "auto");
  assert.equal(element.style.transform, "none");
  assert.equal(element.classList.contains("subsync-dragging"), true);

  context.document.dispatch("pointerup", { clientX: 300, clientY: 270 });
  assert.equal(element.classList.contains("subsync-dragging"), false);
  assert.equal(handle.releasedPointerId, 1);
});

test("drag clamps floating elements inside the viewport", () => {
  const context = createContext();
  const drag = loadDragController(context);
  const element = new FakeElement("div", context.document);
  const handle = new FakeElement("div", context.document);

  drag.attach(element, handle, { margin: 8 });
  handle.dispatch("pointerdown", { clientX: 100, clientY: 80 });
  context.document.dispatch("pointermove", { clientX: 2000, clientY: 2000 });

  assert.equal(element.style.left, "692px");
  assert.equal(element.style.top, "592px");
});

test("drag does not start when pressing a control inside the handle", () => {
  const context = createContext();
  const drag = loadDragController(context);
  const element = new FakeElement("div", context.document);
  const handle = new FakeElement("div", context.document);
  const button = new FakeElement("button", context.document);

  drag.attach(element, handle);
  handle.dispatch("pointerdown", { target: button, clientX: 150, clientY: 120 });
  context.document.dispatch("pointermove", { clientX: 300, clientY: 270 });

  assert.equal(element.style.left, undefined);
  assert.equal(element.style.top, undefined);
});

test("drag converts viewport coordinates to the absolute element parent coordinates", () => {
  const context = createContext();
  const drag = loadDragController(context);
  const parent = new FakeElement("div", context.document);
  parent.rect = { left: 220, top: 140, width: 900, height: 600 };

  const element = new FakeElement("div", context.document);
  element.rect = { left: 320, top: 240, width: 300, height: 200 };
  element.offsetParent = parent;
  const handle = new FakeElement("div", context.document);

  drag.attach(element, handle);
  handle.dispatch("pointerdown", { clientX: 350, clientY: 270 });
  context.document.dispatch("pointermove", { clientX: 360, clientY: 285 });

  assert.equal(element.style.left, "110px");
  assert.equal(element.style.top, "115px");
});

test("center-anchored drag keeps a subtitle's axis when its width changes", () => {
  const context = createContext();
  const drag = loadDragController(context);
  const parent = new FakeElement("div", context.document);
  parent.rect = { left: 220, top: 140, width: 900, height: 600 };

  const element = new FakeElement("div", context.document);
  element.rect = { left: 320, top: 240, width: 300, height: 200 };
  element.offsetParent = parent;
  const handle = new FakeElement("div", context.document);

  drag.attach(element, handle, { preserveCenterX: true });
  handle.dispatch("pointerdown", { clientX: 350, clientY: 270 });
  context.document.dispatch("pointermove", { clientX: 360, clientY: 285 });

  // The CSS left value is the center anchor, not the changing text box's left edge.
  assert.equal(element.style.left, "260px");
  assert.equal(element.style.top, "115px");
  assert.equal(element.style.transform, "translateX(-50%)");

  // A later subtitle width change must not move that center anchor.
  element.rect.width = 520;
  const visualCenter = parent.rect.left + Number.parseFloat(element.style.left);
  assert.equal(visualCenter, 480);
});
