const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.join(__dirname, "..");
const helperSource = fs.readFileSync(path.join(__dirname, "core", "caption_requests.js"), "utf8");
const backgroundSource = fs.readFileSync(path.join(root, "src", "background.js"), "utf8");

function createBackgroundHarness() {
  let onBeforeRequest;
  let onMessage;
  const stored = new Map();
  const fetchedUrls = [];
  const contextUpdates = [];

  const context = {
    console: { log() {}, warn() {}, error() {} },
    URL,
    Map,
    Set,
    Date,
    Number,
    String,
    Boolean,
    Object,
    Promise,
    JSON,
    encodeURIComponent,
    decodeURIComponent,
    setTimeout,
    fetch: async (url) => {
      fetchedUrls.push(url);
      return {
        ok: true,
        status: 200,
        headers: { get: () => "application/json" },
        async text() {
          return JSON.stringify({ events: [] });
        }
      };
    }
  };
  context.globalThis = context;
  context.importScripts = () => vm.runInContext(helperSource, context);
  context.chrome = {
    storage: {
      session: {
        set(entries) {
          Object.entries(entries).forEach(([key, value]) => stored.set(key, value));
          return Promise.resolve();
        },
        async get(keys) {
          return Object.fromEntries(keys.map((key) => [key, stored.get(key)]));
        }
      }
    },
    webRequest: {
      onBeforeRequest: {
        addListener(listener) {
          onBeforeRequest = listener;
        }
      }
    },
    tabs: {
      onRemoved: { addListener() {} },
      sendMessage(tabId, message) {
        contextUpdates.push({ tabId, message });
        return Promise.resolve();
      }
    },
    runtime: {
      onMessage: {
        addListener(listener) {
          onMessage = listener;
        }
      }
    }
  };
  vm.createContext(context);
  vm.runInContext(backgroundSource, context, { filename: "background.js" });

  return {
    fetchedUrls,
    contextUpdates,
    observe(details) {
      assert.ok(onBeforeRequest, "background must register webRequest observer");
      onBeforeRequest(details);
    },
    request(message, sender = { tab: { id: 7 } }) {
      assert.ok(onMessage, "background must register runtime message listener");
      return new Promise((resolve) => {
        onMessage(message, sender, resolve);
      });
    }
  };
}

test("relays a Korean caption request with the observed PO/client context", async () => {
  const harness = createBackgroundHarness();
  harness.observe({
    tabId: 7,
    method: "GET",
    url: "https://www.youtube.com/api/timedtext?v=video-1&lang=en&pot=fixture-pot&potc=1&c=WEB&cver=2&cplayer=WEB"
  });

  const response = await harness.request({
    type: "FETCH_CAPTION",
    videoId: "video-1",
    languageCode: "ko",
    url: "https://www.youtube.com/api/timedtext?v=video-1&lang=en&tlang=ko&fmt=json3"
  });

  assert.equal(response.ok, true);
  assert.equal(response.data.ok, true);
  const fetched = new URL(harness.fetchedUrls[0]);
  assert.equal(fetched.searchParams.get("tlang"), "ko");
  assert.equal(fetched.searchParams.get("pot"), "fixture-pot");
  assert.equal(fetched.searchParams.get("potc"), "1");
  assert.equal(fetched.searchParams.get("c"), "WEB");
  assert.equal(fetched.searchParams.get("cver"), "2");
  assert.equal(fetched.searchParams.get("cplayer"), "WEB");
});

test("notifies the content script when a new PO context is observed", () => {
  const harness = createBackgroundHarness();
  harness.observe({
    tabId: 7,
    method: "GET",
    url: "https://www.youtube.com/api/timedtext?v=video-1&lang=en&pot=fixture-pot&c=WEB"
  });

  assert.equal(harness.contextUpdates.length, 1);
  assert.equal(harness.contextUpdates[0].tabId, 7);
  assert.equal(harness.contextUpdates[0].message.type, "CAPTION_CONTEXT_UPDATED");
  assert.equal(harness.contextUpdates[0].message.videoId, "video-1");
  assert.equal(harness.contextUpdates[0].message.languageCode, "en");
});

test("waits briefly for a PO context that arrives after the first relay request", async () => {
  const harness = createBackgroundHarness();
  const responsePromise = harness.request({
    type: "FETCH_CAPTION",
    videoId: "video-2",
    languageCode: "en",
    url: "https://www.youtube.com/api/timedtext?v=video-2&lang=en"
  });
  setTimeout(() => {
    harness.observe({
      tabId: 7,
      method: "GET",
      url: "https://www.youtube.com/api/timedtext?v=video-2&lang=en&pot=late-pot&c=WEB"
    });
  }, 40);

  const response = await responsePromise;
  assert.equal(response.ok, true);
  assert.equal(new URL(harness.fetchedUrls[0]).searchParams.get("pot"), "late-pot");
});
