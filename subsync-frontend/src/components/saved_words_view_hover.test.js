const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const savedWordsViewSource = fs.readFileSync(path.join(__dirname, "saved_words_view.js"), "utf8");

function loadSavedWordsView(context) {
  vm.runInNewContext(savedWordsViewSource, context, { filename: "saved_words_view.js" });
}

test("saved word cards attach the shared hover interaction with sentence context", async () => {
  const wordElement = { className: "subsync-saved-word" };
  const attachCalls = [];
  const container = {
    _html: "",
    set innerHTML(value) {
      this._html = value;
    },
    get innerHTML() {
      return this._html;
    },
    querySelectorAll(selector) {
      if (selector === ".subsync-saved-word") return [wordElement];
      if (selector === ".subsync-saved-del-btn") return [];
      return [];
    }
  };
  const subSync = {
    authService: {
      async isAuthenticated() {
        return true;
      }
    },
    learningHistory: {
      async getSavedWords() {
        return [{
          word: "sitting",
          context_sentence: "sitting on wood planks, a broken cabinet."
        }];
      }
    },
    interactiveText: {
      attach(...args) {
        attachCalls.push(args);
      }
    }
  };
  const context = {
    __SubSync: subSync,
    window: { __SubSync: subSync }
  };

  loadSavedWordsView(context);
  await context.__SubSync.savedWordsView.render(container);

  assert.deepEqual(attachCalls, [[
    wordElement,
    "sitting",
    "sitting on wood planks, a broken cabinet."
  ]]);
});
