const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

function createContext(storedSettings) {
  let savedPayload = null;
  const context = {
    console,
    window: null,
    chrome: {
      storage: {
        local: {
          get(_keys, callback) {
            callback({ subsync_user_settings: storedSettings });
          },
          set(payload, callback) {
            savedPayload = payload;
            if (callback) callback();
          }
        }
      }
    },
    __SubSync: {}
  };
  context.window = context;
  return {
    context,
    getSavedPayload() {
      return savedPayload;
    }
  };
}

function loadSettings(context) {
  const filename = path.join(__dirname, "settings_service.js");
  vm.runInNewContext(fs.readFileSync(filename, "utf8"), context, { filename });
}

test("settings service persists and normalizes the light/dark theme", async () => {
  const { context, getSavedPayload } = createContext({ theme: "light" });
  loadSettings(context);
  const settings = context.__SubSync.settings;

  await settings.init();
  assert.equal(settings.get("theme"), "light");

  await settings.set("theme", "glass");
  assert.equal(settings.get("theme"), "glass");
  assert.equal(getSavedPayload().subsync_user_settings.theme, "glass");

  await settings.set("theme", "invalid-theme");
  assert.equal(settings.get("theme"), "dark");
  assert.equal(getSavedPayload().subsync_user_settings.theme, "dark");
});

test("settings service persists and normalizes the selected font", async () => {
  const { context, getSavedPayload } = createContext({ fontFamily: "gmarket" });
  loadSettings(context);
  const settings = context.__SubSync.settings;

  await settings.init();
  assert.equal(settings.get("fontFamily"), "gmarket");

  await settings.set("fontFamily", "system");
  assert.equal(settings.get("fontFamily"), "system");
  assert.equal(getSavedPayload().subsync_user_settings.fontFamily, "system");

  await settings.set("fontFamily", "invalid-font");
  assert.equal(settings.get("fontFamily"), "system");
  assert.equal(getSavedPayload().subsync_user_settings.fontFamily, "system");
});
