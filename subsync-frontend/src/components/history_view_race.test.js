const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const componentsDir = __dirname;
const historyViewSource = fs.readFileSync(path.join(componentsDir, "history_view.js"), "utf8");
const savedWordsSource = fs.readFileSync(path.join(componentsDir, "saved_words_view.js"), "utf8");

class FakeButton {
  constructor(tab) {
    this.dataset = { tab };
    this.attributes = {};
    this.listeners = new Map();
    this.classList = { toggle() {} };
  }

  addEventListener(type, handler) {
    this.listeners.set(type, handler);
  }

  setAttribute(name, value) {
    this.attributes[name] = String(value);
  }

  click() {
    this.listeners.get("click")?.({ currentTarget: this });
  }
}

class FakeBody {
  constructor() {
    this._innerHTML = "";
    this.dataset = {};
  }

  set innerHTML(value) {
    this._innerHTML = String(value);
  }

  get innerHTML() {
    return this._innerHTML;
  }

  querySelectorAll() {
    return [];
  }
}

class FakeContainer {
  constructor() {
    this._innerHTML = "";
    this.body = new FakeBody();
    this.buttons = [new FakeButton("words"), new FakeButton("video")];
  }

  set innerHTML(value) {
    this._innerHTML = String(value);
  }

  get innerHTML() {
    return this._innerHTML;
  }

  querySelector(selector) {
    return selector === "#subsync-history-tab-body" ? this.body : null;
  }

  querySelectorAll(selector) {
    return selector === ".subsync-htab" ? this.buttons : [];
  }
}

function flush() {
  return new Promise((resolve) => setImmediate(resolve));
}

test("a late word-tab response cannot overwrite the selected watch-history tab", async () => {
  let resolveStaleWords;
  let requestCount = 0;
  const staleWordsResponse = new Promise((resolve) => {
    resolveStaleWords = resolve;
  });
  let resolveRefreshWords;
  const refreshWordsResponse = new Promise((resolve) => {
    resolveRefreshWords = resolve;
  });
  const subSync = {
    authService: {
      async isAuthenticated() {
        return true;
      }
    },
    learningHistory: {
      async getSavedWords() {
        return [];
      },
      async getVideoHistory() {
        return [{
          video_id: "abc123",
          title: "Video history",
          watched_seconds: 42,
          last_watched_at: "2026-09-07T00:00:00.000Z"
        }];
      }
    },
    apiClient: {
      request() {
        requestCount += 1;
        if (requestCount === 1) {
          return Promise.resolve({
            items: [{ id: "initial", word: "InitialWord", meaning: "초기 단어" }]
          });
        }
        if (requestCount === 2) return staleWordsResponse;
        return refreshWordsResponse;
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
    },
    setTimeout,
    clearTimeout,
    setImmediate
  };

  vm.runInNewContext(savedWordsSource, context, { filename: "saved_words_view.js" });
  vm.runInNewContext(historyViewSource, context, { filename: "history_view.js" });

  const container = new FakeContainer();
  await context.__SubSync.historyView.render(container);
  const [wordsTab, videoTab] = container.buttons;

  wordsTab.click();
  while (requestCount < 2) await flush();

  videoTab.click();
  await flush();
  await flush();
  assert.match(container.body.innerHTML, /Video history/);
  assert.equal(videoTab.attributes["aria-selected"], "true");

  resolveStaleWords({
    items: [{ id: "stale", word: "StaleWord", meaning: "늦게 도착한 단어" }]
  });
  await flush();
  await flush();

  assert.match(container.body.innerHTML, /Video history/);
  assert.doesNotMatch(container.body.innerHTML, /StaleWord/);
  assert.equal(videoTab.attributes["aria-selected"], "true");

  const requestCountBeforeRefresh = requestCount;
  await context.__SubSync.savedWordsView.refresh();
  assert.equal(requestCount, requestCountBeforeRefresh);
  assert.match(container.body.innerHTML, /Video history/);
  assert.doesNotMatch(container.body.innerHTML, /StaleWord/);

  wordsTab.click();
  while (requestCount < 3) await flush();
  const refreshPromise = context.__SubSync.savedWordsView.refresh();
  while (requestCount < 4) await flush();

  videoTab.click();
  await flush();
  await flush();
  assert.match(container.body.innerHTML, /Video history/);

  resolveRefreshWords({
    items: [{ id: "refresh-stale", word: "RefreshStaleWord", meaning: "refresh 중 도착한 단어" }]
  });
  await refreshPromise;
  await flush();
  await flush();

  assert.match(container.body.innerHTML, /Video history/);
  assert.doesNotMatch(container.body.innerHTML, /RefreshStaleWord/);
  assert.equal(videoTab.attributes["aria-selected"], "true");
});

test("a late watch-history response cannot overwrite the selected word tab", async () => {
  let resolveLateHistory;
  let requestCount = 0;
  const lateHistoryResponse = new Promise((resolve) => {
    resolveLateHistory = resolve;
  });
  const subSync = {
    authService: {
      async isAuthenticated() {
        return true;
      }
    },
    learningHistory: {
      async getSavedWords() {
        return [];
      },
      async getVideoHistory() {
        return lateHistoryResponse;
      }
    },
    apiClient: {
      request() {
        requestCount += 1;
        if (requestCount === 1) {
          return Promise.resolve({
            items: [{ id: "initial", word: "InitialWord", meaning: "초기 단어" }]
          });
        }
        return Promise.resolve({
          items: [{ id: "words-after-video", word: "WordsAfterVideo", meaning: "단어 탭 결과" }]
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
    },
    setTimeout,
    clearTimeout,
    setImmediate
  };

  vm.runInNewContext(savedWordsSource, context, { filename: "saved_words_view.js" });
  vm.runInNewContext(historyViewSource, context, { filename: "history_view.js" });

  const container = new FakeContainer();
  await context.__SubSync.historyView.render(container);
  const [wordsTab, videoTab] = container.buttons;

  videoTab.click();
  await flush();
  wordsTab.click();
  await flush();
  await flush();
  assert.match(container.body.innerHTML, /WordsAfterVideo/);
  assert.equal(wordsTab.attributes["aria-selected"], "true");

  resolveLateHistory([{
    video_id: "late123",
    title: "Late video history",
    watched_seconds: 18,
    last_watched_at: "2026-09-07T00:00:00.000Z"
  }]);
  await flush();
  await flush();

  assert.match(container.body.innerHTML, /WordsAfterVideo/);
  assert.doesNotMatch(container.body.innerHTML, /Late video history/);
  assert.equal(wordsTab.attributes["aria-selected"], "true");
});
