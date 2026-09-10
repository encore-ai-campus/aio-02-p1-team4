const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const source = fs.readFileSync(path.join(__dirname, "dict_service.js"), "utf8");

function loadDictService(response = {}, dependencies = {}) {
  const calls = [];
  const values = new Map();
  const SubSync = {
    ...dependencies,
    apiClient: {
      async request(endpoint, options) {
        calls.push({ endpoint, options });
        if (dependencies.requestError) throw dependencies.requestError;
        return response;
      }
    }
  };
  const sessionStorage = {
    getItem(key) {
      return values.has(key) ? values.get(key) : null;
    },
    setItem(key, value) {
      values.set(key, value);
    }
  };
  const context = {
    console,
    sessionStorage,
    window: { __SubSync: SubSync }
  };
  context.__SubSync = SubSync;
  vm.runInNewContext(source, context, { filename: "dict_service.js" });
  return { dictService: SubSync.dictService, calls };
}

test("uses the backend dictionary route for hover and detail lookups", async () => {
  const response = { word: "honest", meanings: ["정직한"] };
  const { dictService, calls } = loadDictService(response);

  await dictService.getHoverMeaning(" Honest ");
  await dictService.getDetailMeaning(" Honest ", "Be honest with yourself.");

  assert.equal(calls[0].endpoint, "/dictionary/hover?word=honest");
  assert.equal(
    calls[1].endpoint,
    "/dictionary/detail?word=honest&context=Be%20honest%20with%20yourself."
  );
});

test("refreshes an open saved words view after saving a word", async () => {
  let refreshCount = 0;
  const savedItems = [];
  const response = { id: "remote-word-1", word: "night", meaning: "밤" };
  const { dictService } = loadDictService(response, {
    learningHistory: {
      async saveWord(item) {
        savedItems.push(item);
        return item;
      }
    },
    savedWordsView: {
      async refresh() {
        refreshCount += 1;
      }
    }
  });

  await dictService.saveWord("night", "밤", "A good night.");

  assert.equal(savedItems.length, 1);
  assert.equal(refreshCount, 1);
});

test("refreshes an open saved words view after local fallback save", async () => {
  let refreshCount = 0;
  const savedItems = [];
  const { dictService } = loadDictService({}, {
    requestError: new Error("backend unavailable"),
    learningHistory: {
      async saveWord(item) {
        savedItems.push(item);
        return item;
      }
    },
    savedWordsView: {
      async refresh() {
        refreshCount += 1;
      }
    }
  });

  await dictService.saveWord("night", "밤", "A good night.");

  assert.equal(savedItems.length, 1);
  assert.equal(savedItems[0].local_only, true);
  assert.equal(refreshCount, 1);
});
