const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.resolve(__dirname, "..");
const tokenizerSource = fs.readFileSync(path.join(__dirname, "tokenizer.js"), "utf8");
const interactiveCss = fs.readFileSync(path.join(root, "..", "styles", "interactive.css"), "utf8");
const subtitleCss = fs.readFileSync(path.join(root, "..", "styles", "subtitle.css"), "utf8");

class FakeClassList {
  constructor(owner) {
    this.owner = owner;
  }

  add(...names) {
    const classes = new Set(this.owner.className.split(/\s+/).filter(Boolean));
    names.forEach((name) => classes.add(name));
    this.owner.className = [...classes].join(" ");
  }

  remove(...names) {
    const remove = new Set(names);
    this.owner.className = this.owner.className
      .split(/\s+/)
      .filter((name) => name && !remove.has(name))
      .join(" ");
  }

  contains(name) {
    return this.owner.className.split(/\s+/).filter(Boolean).includes(name);
  }
}

class FakeElement {
  constructor(tagName) {
    this.tagName = tagName.toUpperCase();
    this.className = "";
    this.dataset = {};
    this.textContent = "";
    this.listeners = new Map();
    this.classList = new FakeClassList(this);
  }

  addEventListener(type, listener) {
    this.listeners.set(type, listener);
  }

  dispatch(type, event = {}) {
    this.listeners.get(type)?.({ type, target: this, ...event });
  }
}

class FakeFragment {
  constructor() {
    this.children = [];
  }

  appendChild(child) {
    this.children.push(child);
    return child;
  }
}

function loadTokenizer() {
  const document = {
    createDocumentFragment: () => new FakeFragment(),
    createElement: (tagName) => new FakeElement(tagName),
    createTextNode: (text) => ({ nodeType: 3, textContent: text })
  };
  const context = {
    window: { __SubSync: {} },
    document
  };
  vm.runInNewContext(tokenizerSource, context, { filename: "tokenizer.js" });
  return context.window.__SubSync.tokenizer;
}

test("word hover state is explicit and is removed when the pointer leaves", () => {
  const tokenizer = loadTokenizer();
  const hoverCalls = [];
  const fragment = tokenizer.tokenizeToFragment(
    "hello world",
    (word, span) => hoverCalls.push({ word, span }),
    null
  );
  const word = fragment.children.find((child) => child.className === "subsync-word");

  assert.ok(word, "tokenizer should create a word span");
  word.dispatch("mouseenter");
  assert.equal(word.classList.contains("subsync-word-hovered"), true);
  assert.equal(hoverCalls[0].word, "hello");

  word.dispatch("mouseleave");
  assert.equal(word.classList.contains("subsync-word-hovered"), false);
  assert.equal(hoverCalls.at(-1).word, null);
});

test("word hover state has a filled background contract on both subtitle surfaces", () => {
  for (const css of [interactiveCss, subtitleCss]) {
    assert.match(css, /\.subsync-word:hover[^{]*,[\s\S]*\.subsync-word\.subsync-word-hovered\s*\{/);
    assert.match(css, /background(?:-color)?:\s*var\(--subsync-accent/);
    assert.match(css, /color:\s*#(?:fff|ffffff)/i);
  }
});
