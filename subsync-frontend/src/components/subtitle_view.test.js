const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.resolve(__dirname, "..", "..");

class FakeElement {
  constructor(tagName, document) {
    this.tagName = tagName.toUpperCase();
    this.ownerDocument = document;
    this.style = {};
    this.className = "";
    this.id = "";
    this.listeners = new Map();
    this.children = [];
    this.parentNode = null;
    this._innerHTML = "";
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

  set innerHTML(value) {
    this._innerHTML = value;
    const ids = [...String(value).matchAll(/id="([^"]+)"/g)].map((match) => match[1]);
    this.children = ids.map((id) => {
      const child = new FakeElement("div", this.ownerDocument);
      child.id = id;
      child.parentNode = this;
      this.ownerDocument.elementsById.set(id, child);
      return child;
    });
  }

  get innerHTML() {
    return this._innerHTML;
  }

  appendChild(child) {
    child.parentNode = this;
    this.children.push(child);
    if (child.id) this.ownerDocument.elementsById.set(child.id, child);
    return child;
  }

  contains(node) {
    let current = node;
    while (current) {
      if (current === this) return true;
      current = current.parentNode;
    }
    return false;
  }

  addEventListener(type, handler, options) {
    if (!this.listeners.has(type)) this.listeners.set(type, []);
    this.listeners.get(type).push({ handler, options });
  }

  dispatch(type, extra = {}) {
    const event = {
      type,
      target: extra.target || this,
      currentTarget: this,
      preventDefault() {
        this.defaultPrevented = true;
      },
      stopPropagation() {
        this.propagationStopped = true;
      },
      ...extra
    };
    for (const { handler } of this.listeners.get(type) || []) handler(event);
    return event;
  }
}

class FakeDocument {
  constructor() {
    this.elementsById = new Map();
    this.body = new FakeElement("body", this);
    this.player = new FakeElement("div", this);
    this.player.id = "movie_player";
    this.body.appendChild(this.player);
  }

  createElement(tagName) {
    return new FakeElement(tagName, this);
  }

  querySelector(selector) {
    if (selector === "#movie_player") return this.player;
    return null;
  }

  getElementById(id) {
    return this.elementsById.get(id) || null;
  }

  contains(node) {
    let current = node;
    while (current) {
      if (current === this.body) return true;
      current = current.parentNode;
    }
    return false;
  }
}

function loadSubtitleView() {
  const document = new FakeDocument();
  const context = {
    document,
    window: null,
    console,
    setTimeout,
    clearTimeout,
    getComputedStyle() {
      return { position: "relative" };
    }
  };
  context.window = context;
  context.__SubSync = {
    settings: { get: () => true },
    interactiveText: {
      attach(element, text) {
        element.textContent = text;
      }
    },
    drag: { attach() {} }
  };
  const filename = path.join(root, "src", "components", "subtitle_view.js");
  vm.runInNewContext(fs.readFileSync(filename, "utf8"), context, { filename });
  context.__SubSync.subtitleView.render(null, { learn: "hello", known: "안녕" });
  return { document, subtitleView: context.__SubSync.subtitleView };
}

test("caption CSS does not move when YouTube controls toggle autohide", () => {
  const cssPath = path.join(root, "styles", "subtitle.css");
  const css = fs.readFileSync(cssPath, "utf8");

  assert.doesNotMatch(css, /\.ytp-autohide\s+\.subsync-video-caption-overlay/);
  assert.match(css, /\.subsync-video-caption-overlay[\s\S]*bottom:\s*60px/);
  assert.match(css, /\.subsync-video-caption-overlay\.subsync-position-resetting[\s\S]*left[\s\S]*top/);
});

test("caption loading state shows a centered radial spinner", () => {
  const cssPath = path.join(root, "styles", "subtitle.css");
  const css = fs.readFileSync(cssPath, "utf8");

  assert.match(
    css,
    /\.subsync-subtitle-box\[data-caption-state="loading"\]\s*\{[\s\S]*?display:\s*flex;[\s\S]*?align-items:\s*center;[\s\S]*?justify-content:\s*center;/
  );
  const spinnerBlock = css.match(
    /\.subsync-subtitle-box\[data-caption-state="loading"\]::before\s*\{([\s\S]*?)\}/
  )?.[1] || "";
  const spinnerWidth = spinnerBlock.match(/width:\s*(\d+)px/)?.[1];
  assert.ok(spinnerWidth, "spinner width should be explicitly tunable");
  assert.match(spinnerBlock, new RegExp(`height:\\s*${spinnerWidth}px`));
  assert.match(spinnerBlock, new RegExp(`flex:\\s*0 0 ${spinnerWidth}px`));
  assert.match(
    spinnerBlock,
    /background:\s*transparent\s+url\(["']data:image\/svg\+xml[\s\S]*?\)\s+center\s*\/\s*contain\s+no-repeat;/
  );
  assert.match(spinnerBlock, /transform-origin:\s*center;/);
  assert.match(spinnerBlock, /animation:\s*subsync-caption-loading-spin/);
  const dataUri = css.match(/background:\s*transparent\s+url\(["'](data:image\/svg\+xml;base64,[^"')]+)["']\)/)?.[1];
  assert.ok(dataUri);
  const svg = Buffer.from(dataUri.split(",")[1], "base64").toString("utf8");
  assert.equal((svg.match(/<path\s/g) || []).length, 12);
  assert.match(svg, /stroke-linecap=['"]round['"]/);
  assert.doesNotMatch(
    css,
    /\.subsync-subtitle-box\[data-caption-state="loading"\]::before[\s\S]*?-webkit-mask:\s*url/
  );
  assert.match(css, /@keyframes\s+subsync-caption-loading-spin[\s\S]*?rotate\(360deg\)/);
  assert.match(
    css,
    /@media\s*\(prefers-reduced-motion:\s*reduce\)[\s\S]*?\.subsync-subtitle-box\[data-caption-state="loading"\]::before[\s\S]*?animation:\s*none;/
  );
});

test("double-clicking the video caption animates back to its default position", async () => {
  const { document } = loadSubtitleView();
  const overlay = document.getElementById("subsync-video-caption-overlay");
  assert.ok(overlay);

  overlay.style.left = "280px";
  overlay.style.top = "190px";
  overlay.style.right = "auto";
  overlay.style.bottom = "auto";
  overlay.style.transform = "none";

  const event = overlay.dispatch("dblclick");

  assert.equal(event.defaultPrevented, true);
  assert.equal(overlay.classList.contains("subsync-position-resetting"), true);
  assert.notEqual(overlay.style.left, "");
  assert.notEqual(overlay.style.top, "");

  await new Promise((resolve) => setTimeout(resolve, 380));
  assert.equal(overlay.classList.contains("subsync-position-resetting"), false);
  assert.equal(overlay.style.left, "");
  assert.equal(overlay.style.top, "");
  assert.equal(overlay.style.right, "");
  assert.equal(overlay.style.bottom, "");
  assert.equal(overlay.style.transform, "");
});

test("subtitle content refreshes when the current cue object is updated", () => {
  const { document, subtitleView } = loadSubtitleView();
  const sideContainer = document.createElement("div");
  const subtitle = { learn: "first subtitle", known: "첫 문장" };

  subtitleView.render(sideContainer, subtitle);
  assert.equal(document.getElementById("subsync-sub-learn-text").textContent, "first subtitle");
  assert.match(sideContainer.innerHTML, /첫 문장/);

  subtitle.learn = "updated subtitle";
  subtitle.known = "변경된 문장";
  subtitleView.render(sideContainer, subtitle);

  assert.equal(document.getElementById("subsync-sub-learn-text").textContent, "updated subtitle");
  assert.match(sideContainer.innerHTML, /변경된 문장/);
});

test("the same subtitle can render again after the subtitle view is cleared", () => {
  const { document, subtitleView } = loadSubtitleView();
  const sideContainer = document.createElement("div");
  const subtitle = { learn: "repeatable subtitle", known: "다시 표시" };

  subtitleView.render(sideContainer, subtitle);
  subtitleView.clear();
  sideContainer.innerHTML = "";
  subtitleView.render(sideContainer, subtitle);

  assert.match(sideContainer.innerHTML, /subsync-sub-learn-text/);
});
