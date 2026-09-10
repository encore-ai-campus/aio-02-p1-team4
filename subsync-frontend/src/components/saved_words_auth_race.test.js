const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const source = fs.readFileSync(path.join(__dirname, "saved_words_view.js"), "utf8");

test("does not let an older authenticated fetch overwrite the login state", async () => {
  let authenticated = true;
  let resolveRemote;
  const container = {
    _html: "",
    set innerHTML(value) {
      this._html = value;
    },
    get innerHTML() {
      return this._html;
    },
    querySelectorAll() {
      return [];
    }
  };
  const subSync = {
    authService: {
      async isAuthenticated() {
        return authenticated;
      }
    },
    learningHistory: {
      async getSavedWords() {
        return [];
      }
    },
    apiClient: {
      request() {
        return new Promise((resolve) => {
          resolveRemote = resolve;
        });
      }
    }
  };
  const context = {
    __SubSync: subSync,
    window: { __SubSync: subSync },
    document: {
      getElementById() {
        return null;
      }
    }
  };

  vm.runInNewContext(source, context, { filename: "saved_words_view.js" });
  const oldRender = context.__SubSync.savedWordsView.render(container);
  while (!resolveRemote) await Promise.resolve();

  authenticated = false;
  await context.__SubSync.savedWordsView.render(container);
  assert.match(container.innerHTML, /로그인이 필요합니다/);

  resolveRemote({
    items: [{ id: "remote-1", word: "hello", meaning: "안녕" }]
  });
  await oldRender;

  assert.match(container.innerHTML, /로그인이 필요합니다/);
  assert.doesNotMatch(container.innerHTML, /remote-1|hello/);
});
