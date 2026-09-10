const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

class FakeBody {
  constructor() {
    this.attributes = {};
  }

  setAttribute(name, value) {
    this.attributes[name] = String(value);
  }

  getAttribute(name) {
    return this.attributes[name] || null;
  }
}

function createContext(savedFont = "system") {
  const body = new FakeBody();
  const styles = [];
  const document = {
    body,
    head: {
      appendChild(node) {
        styles.push(node);
      }
    },
    documentElement: {
      appendChild(node) {
        styles.push(node);
      }
    },
    createElement(tagName) {
      return {
        tagName: tagName.toUpperCase(),
        id: "",
        textContent: "",
        setAttribute(name, value) {
          this[name] = String(value);
        }
      };
    },
    getElementById(id) {
      return styles.find((node) => node.id === id) || null;
    }
  };
  let listener = null;
  const settings = {
    get(key) {
      return key === "fontFamily" ? savedFont : undefined;
    },
    onChange(fn) {
      listener = fn;
    }
  };
  const context = {
    console,
    document,
    chrome: {
      runtime: {
        getURL(assetPath) {
          return `chrome-extension://test/${assetPath}`;
        }
      }
    },
    window: null,
    __SubSync: { settings }
  };
  context.window = context;
  return {
    context,
    body,
    styles,
    notify: (...args) => listener && listener(...args)
  };
}

function loadFont(context) {
  const filename = path.join(__dirname, "font.js");
  vm.runInNewContext(fs.readFileSync(filename, "utf8"), context, { filename });
}

test("font manager registers the bundled face with the extension runtime URL", () => {
  const { context, styles } = createContext();
  loadFont(context);

  context.__SubSync.font.init();

  const faceStyle = styles.find((style) => style.id === "subsync-font-face-style");
  assert.ok(faceStyle);
  assert.match(
    faceStyle.textContent,
    /chrome-extension:\/\/test\/assets\/fonts\/GmarketSansMedium\.woff/
  );
  assert.doesNotMatch(faceStyle.textContent, /\.\.\/assets\/fonts/);
});

test("font manager applies the saved font and reacts to font changes", () => {
  const { context, body, notify } = createContext("gmarket");
  loadFont(context);

  assert.equal(context.__SubSync.font.init(), "gmarket");
  assert.equal(body.getAttribute("data-subsync-font"), "gmarket");

  notify("fontFamily", "system");
  assert.equal(body.getAttribute("data-subsync-font"), "system");

  assert.equal(context.__SubSync.font.apply("unsupported"), "system");
  assert.equal(body.getAttribute("data-subsync-font"), "system");
});
