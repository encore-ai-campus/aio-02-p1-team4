const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

class FakeBody {
  constructor() {
    this.attributes = {};
    this.classNames = new Set();
  }

  setAttribute(name, value) {
    this.attributes[name] = String(value);
  }

  getAttribute(name) {
    return this.attributes[name] || null;
  }

  get classList() {
    const self = this;
    return {
      add(name) {
        self.classNames.add(name);
      },
      remove(name) {
        self.classNames.delete(name);
      },
      contains(name) {
        return self.classNames.has(name);
      }
    };
  }
}

function createContext(savedTheme = "dark") {
  const body = new FakeBody();
  let listener = null;
  const settings = {
    get(key) {
      return key === "theme" ? savedTheme : undefined;
    },
    onChange(fn) {
      listener = fn;
    }
  };
  const context = {
    console,
    document: { body },
    window: null,
    setTimeout,
    clearTimeout,
    __SubSync: { settings }
  };
  context.window = context;
  return { context, body, notify: (...args) => listener && listener(...args) };
}

function loadTheme(context) {
  const filename = path.join(__dirname, "theme.js");
  vm.runInNewContext(fs.readFileSync(filename, "utf8"), context, { filename });
}

test("theme manager applies the saved theme and reacts to theme changes", async () => {
  const { context, body, notify } = createContext("light");
  loadTheme(context);

  assert.equal(context.__SubSync.theme.init(), "light");
  assert.equal(body.getAttribute("data-subsync-theme"), "light");

  notify("theme", "dark");
  assert.equal(body.getAttribute("data-subsync-theme"), "dark");

  assert.equal(context.__SubSync.theme.apply("glass"), "glass");
  assert.equal(body.getAttribute("data-subsync-theme"), "glass");

  assert.equal(context.__SubSync.theme.apply("unsupported"), "dark");
  assert.equal(body.getAttribute("data-subsync-theme"), "dark");
});

test("theme changes expose a temporary transition state", async () => {
  const { context, body } = createContext("dark");
  loadTheme(context);

  context.__SubSync.theme.apply("light");
  assert.equal(body.classList.contains("subsync-theme-transitioning"), true);

  await new Promise((resolve) => setTimeout(resolve, 340));
  assert.equal(body.classList.contains("subsync-theme-transitioning"), false);
});
