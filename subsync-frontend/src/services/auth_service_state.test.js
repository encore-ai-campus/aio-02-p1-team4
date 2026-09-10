const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const source = fs.readFileSync(path.join(__dirname, "auth_service.js"), "utf8");

function loadAuthService(sessionResponses) {
  let sessionIndex = 0;
  let getSessionCalls = 0;
  let storageChangeListener = null;
  const stored = new Map();
  const runtimeMessages = [];
  const context = {
    Promise,
    Boolean,
    String,
    Number,
    Object,
    Array,
    JSON,
    console,
    window: { __SubSync: {} },
    chrome: {
      storage: {
        local: {
          get(keys, callback) {
            const requested = Array.isArray(keys) ? keys : [keys];
            callback(Object.fromEntries(requested.map((key) => [key, stored.get(key)])));
          },
          set(values, callback) {
            Object.entries(values).forEach(([key, value]) => stored.set(key, value));
            if (callback) callback();
          },
          remove(keys, callback) {
            keys.forEach((key) => stored.delete(key));
            if (callback) callback();
          }
        },
        onChanged: {
          addListener(listener) {
            storageChangeListener = listener;
          }
        }
      },
      runtime: {
        lastError: null,
        sendMessage(message, callback) {
          runtimeMessages.push(message.type);
          if (message.type === "AUTH_GET_SESSION") {
            getSessionCalls += 1;
            callback({ ok: true, session: sessionResponses[sessionIndex++] || null });
            return;
          }
          callback({ ok: true });
        }
      }
    }
  };

  vm.runInNewContext(source, context, { filename: "auth_service.js" });
  return {
    authService: context.window.__SubSync.authService,
    subSync: context.window.__SubSync,
    getSessionCalls: () => getSessionCalls,
    runtimeMessages,
    emitStorageChange(changes, areaName = "local") {
      if (storageChangeListener) storageChangeListener(changes, areaName);
    }
  };
}

test("keeps header and protected screens on one auth session snapshot", async () => {
  const session = {
    access_token: "access-token-fixture",
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    user: { id: "user-fixture" }
  };
  const harness = loadAuthService([session, null]);

  const headerState = await harness.authService.isAuthenticated();
  const storageState = await harness.authService.isAuthenticated();

  assert.equal(headerState, true);
  assert.equal(storageState, true);
  assert.equal(harness.getSessionCalls(), 1);
});

test("clears the shared auth snapshot after logout", async () => {
  const session = {
    access_token: "access-token-fixture",
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    user: { id: "user-fixture" }
  };
  const harness = loadAuthService([session, null]);

  assert.equal(await harness.authService.isAuthenticated(), true);
  await harness.authService.logout();

  assert.equal(await harness.authService.isAuthenticated(), false);
  assert.ok(harness.runtimeMessages.includes("AUTH_LOGOUT"));
  assert.equal(harness.getSessionCalls(), 1);
});

test("invalidates the shared auth snapshot when extension storage changes", async () => {
  const session = {
    access_token: "access-token-fixture",
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    user: { id: "user-fixture" }
  };
  const harness = loadAuthService([session, null]);

  assert.equal(await harness.authService.isAuthenticated(), true);
  harness.emitStorageChange({ subsync_auth_session: { oldValue: session, newValue: undefined } });

  assert.equal(await harness.authService.isAuthenticated(), false);
  assert.equal(harness.getSessionCalls(), 2);
});

test("resynchronizes the header and current screen after auth storage changes", async () => {
  const session = {
    access_token: "access-token-fixture",
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    user: { id: "user-fixture" }
  };
  const harness = loadAuthService([session, null]);
  let updateAuthUICalls = 0;
  let renderCurrentScreenCalls = 0;
  harness.subSync.layout = {
    async updateAuthUI() {
      updateAuthUICalls += 1;
    },
    async renderCurrentScreen() {
      renderCurrentScreenCalls += 1;
    }
  };

  assert.equal(await harness.authService.isAuthenticated(), true);
  harness.emitStorageChange({ subsync_auth_session: { oldValue: session, newValue: undefined } });
  await new Promise((resolve) => setTimeout(resolve, 0));

  assert.equal(updateAuthUICalls, 1);
  assert.equal(renderCurrentScreenCalls, 1);
});
