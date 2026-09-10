const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.resolve(__dirname, "..", "..");
const iconDir = path.join(root, "assets", "icons");
const iconAssets = fs.readFileSync(path.join(root, "src", "core", "icon_assets.js"), "utf8");
const hoverTooltipSrc = fs.readFileSync(path.join(__dirname, "hover_tooltip.js"), "utf8");
const clickPopupSrc = fs.readFileSync(path.join(__dirname, "click_popup.js"), "utf8");
const savedWordsViewSrc = fs.readFileSync(
  path.join(root, "src", "components", "saved_words_view.js"),
  "utf8"
);
const subtitleViewSrc = fs.readFileSync(
  path.join(root, "src", "components", "subtitle_view.js"),
  "utf8"
);
const historyServiceSrc = fs.readFileSync(
  path.join(root, "src", "services", "learning_history_service.js"),
  "utf8"
);
const iconsCss = fs.readFileSync(path.join(root, "styles", "icons.css"), "utf8");
const interactiveCss = fs.readFileSync(path.join(root, "styles", "interactive.css"), "utf8");
const subtitleCss = fs.readFileSync(path.join(root, "styles", "subtitle.css"), "utf8");

test("star save icons ship as local outline and filled SVG assets", () => {
  for (const name of ["star.svg", "star-filled.svg"]) {
    const svg = fs.readFileSync(path.join(iconDir, name), "utf8");
    assert.match(svg, /^<svg\b/);
    assert.match(svg, /viewBox="0 0 24 24"/);
    assert.match(svg, /stroke=/);
    assert.doesNotMatch(svg, /<script\b|<image\b|(?:href|xlink:href)=["']https?:\/\//i);
  }
  assert.match(fs.readFileSync(path.join(iconDir, "star.svg"), "utf8"), /stroke="#BFC0C4"/);
  assert.match(fs.readFileSync(path.join(iconDir, "star-filled.svg"), "utf8"), /fill="#FFD54A"/);
  assert.match(iconAssets, /star:\s*"star\.svg"/);
  assert.match(iconAssets, /["']star-filled["']:\s*"star-filled\.svg"/);
});

test("hover tooltip exposes a star save action at the header end", () => {
  assert.match(hoverTooltipSrc, /subsync-tt-save-btn/);
  assert.match(hoverTooltipSrc, /SubSync\.icon\([\s\S]*"star"[\s\S]*"subsync-tt-save-icon"[\s\S]*\)/);
  assert.match(hoverTooltipSrc, /dictService\.saveWord\(\s*word/);
  assert.match(hoverTooltipSrc, /dictService\.removeWord/);
  assert.match(hoverTooltipSrc, /subsync-tt-save-saved/);
  assert.match(hoverTooltipSrc, /subsync-save-icon-on/);
  assert.match(hoverTooltipSrc, /subsync-save-icon-off/);
  assert.match(interactiveCss, /\.subsync-tt-save-btn/);
  assert.match(iconsCss, /\.subsync-tt-save-icon/);
  assert.match(iconsCss, /@keyframes\s+subsync-save-icon-on/);
  assert.match(iconsCss, /@keyframes\s+subsync-save-icon-off/);
});

test("saved word cards pass their saved record identity into the word tooltip", () => {
  assert.match(savedWordsViewSrc, /savedWordId/);
  assert.match(hoverTooltipSrc, /savedWordId/);
  assert.match(hoverTooltipSrc, /currentSavedWord/);
});

test("subtitle panel does not expose a sentence save action", () => {
  assert.doesNotMatch(subtitleViewSrc, /subsync-sub-save-btn/);
  assert.doesNotMatch(subtitleViewSrc, /saveSentence/);
  assert.doesNotMatch(historyServiceSrc, /saveSentence/);
  assert.doesNotMatch(historyServiceSrc, /getSavedSentences/);
  assert.doesNotMatch(historyServiceSrc, /savedSentences/);
  assert.doesNotMatch(subtitleCss, /\.subsync-sub-save-btn/);
  assert.doesNotMatch(iconsCss, /\.subsync-sub-save-icon/);
});

test("detail popup save control uses the star SVG and supports toggling", () => {
  assert.match(clickPopupSrc, /SubSync\.icon\("star", "subsync-popup-save-icon"\)/);
  assert.doesNotMatch(clickPopupSrc, /⭐/);
  assert.match(clickPopupSrc, /dictService\.removeWord/);
  assert.match(clickPopupSrc, /subsync-popup-save-saved/);
  assert.match(clickPopupSrc, /subsync-save-icon-on/);
  assert.match(clickPopupSrc, /subsync-save-icon-off/);
  assert.match(iconsCss, /\.subsync-popup-save-icon/);
});

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
    if (child.id && this.ownerDocument) this.ownerDocument.elementsById.set(child.id, child);
    return child;
  }

  addEventListener(type, handler) {
    if (!this.listeners.has(type)) this.listeners.set(type, []);
    this.listeners.get(type).push(handler);
  }

  setAttribute(name, value) {
    this.attributes[name] = String(value);
  }

  removeAttribute(name) {
    delete this.attributes[name];
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
    this.elementsById = new Map();
    this.body = new FakeElement("body", this);
    this.player = new FakeElement("div", this);
    this.player.id = "movie_player";
    this.body.appendChild(this.player);
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

  addEventListener(type, handler) {
    if (!this.listeners.has(type)) this.listeners.set(type, []);
    this.listeners.get(type).push(handler);
  }

  getElementById(id) {
    return this.elementsById.get(id) || null;
  }

  querySelector(selector) {
    if (selector === "#movie_player") return this.player;
    return this.body.querySelector(selector);
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

function createContext() {
  const document = new FakeDocument();
  const context = {
    console,
    document,
    setTimeout,
    clearTimeout,
    getComputedStyle() {
      return { position: "relative" };
    },
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
  const filename = path.join(root, "src", relativePath);
  vm.runInNewContext(fs.readFileSync(filename, "utf8"), context, { filename });
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

test("hover tooltip star button toggles the hovered word save state", async () => {
  const context = createContext();
  const SubSync = context.__SubSync;
  const saved = [];
  const removed = [];
  SubSync.settings = { get: () => true };
  SubSync.authService = {
    async isAuthenticated() {
      return true;
    }
  };
  SubSync.authModal = { show() {} };
  SubSync.dictService = {
    async getHoverMeaning() {
      return { meanings: ["어떤"] };
    },
    async saveWord(word, meaning, sentence) {
      saved.push([word, meaning, sentence]);
      return { id: "local_word_1", word, video_id: "" };
    },
    async removeWord(item) {
      removed.push(item);
    }
  };
  SubSync.icon = () => `<img class="subsync-tt-save-icon" src="assets/icons/star.svg">`;
  SubSync.iconUrl = (name) => `assets/icons/${name}.svg`;
  SubSync.clickPopup = { show() {} };

  loadScript(context, "interactive/hover_tooltip.js");

  const target = context.document.createElement("span");
  context.document.body.appendChild(target);
  SubSync.hoverTooltip.show("that", target, "See that?");
  await wait(240);

  const saveButton = context.document.querySelector(".subsync-tt-save-btn");
  assert.ok(saveButton);
  saveButton.dispatchEvent("click");
  await wait(60);

  assert.deepEqual(saved, [["that", "어떤", "See that?"]]);
  assert.ok(saveButton.classList.contains("subsync-tt-save-saved"));
  assert.ok(saveButton.querySelector(".subsync-save-icon-on"));

  saveButton.dispatchEvent("click");
  await wait(60);

  assert.equal(removed.length, 1);
  assert.equal(removed[0].id, "local_word_1");
  assert.equal(saveButton.classList.contains("subsync-tt-save-saved"), false);
  assert.ok(saveButton.querySelector(".subsync-save-icon-off"));
});

test("storage word tooltip cancels by saved record ID even without local history", async () => {
  const context = createContext();
  const SubSync = context.__SubSync;
  const removed = [];
  SubSync.settings = { get: () => true };
  SubSync.authService = {
    async isAuthenticated() {
      return true;
    }
  };
  SubSync.authModal = { show() {} };
  SubSync.dictService = {
    async getHoverMeaning() {
      return { meanings: ["순간"] };
    },
    async removeWord(item) {
      removed.push(item);
    },
    async saveWord() {
      throw new Error("저장소 단어는 취소되어야 합니다.");
    }
  };

  SubSync.icon = () => `<img class="subsync-tt-save-icon" src="assets/icons/star.svg">`;
  SubSync.iconUrl = (name) => `assets/icons/${name}.svg`;
  SubSync.clickPopup = { show() {} };

  loadScript(context, "interactive/hover_tooltip.js");

  const target = context.document.createElement("span");
  target.dataset.savedWordId = "remote-word-1";
  target.dataset.savedWordVideoId = "video-1";
  context.document.body.appendChild(target);
  SubSync.hoverTooltip.show("moment", target, "A scary moment.");
  await wait(240);

  const saveButton = context.document.querySelector(".subsync-tt-save-btn");
  assert.ok(saveButton.classList.contains("subsync-tt-save-saved"));
  saveButton.dispatchEvent("click");
  await wait(60);

  assert.equal(removed.length, 1);
  assert.equal(removed[0].id, "remote-word-1");
  await wait(360);
  assert.equal(context.document.querySelector(".subsync-hover-tooltip").style.display, "none");
});

test("subtitle panel renders the current sentence without a save button", () => {
  const context = createContext();
  const SubSync = context.__SubSync;
  SubSync.settings = { get: () => true };
  SubSync.interactiveText = {
    attach(element, text) {
      element.textContent = text;
    }
  };
  SubSync.drag = { attach() {} };
  SubSync.icon = () => "";

  loadScript(context, "components/subtitle_view.js");

  const side = context.document.createElement("div");
  context.document.body.appendChild(side);
  SubSync.subtitleView.render(side, {
    video_id: "vid1",
    timestamp: 31,
    learn: "See that? That's my gym!",
    known: "보이세요? 내 헬스장!"
  });

  assert.equal(side.querySelector(".subsync-sub-save-btn"), null);
  assert.equal(side.querySelector(".subsync-sub-learn").textContent, "See that? That's my gym!");
});
