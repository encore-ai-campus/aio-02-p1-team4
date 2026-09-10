const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const settingsView = fs.readFileSync(path.join(root, "components", "settings_view.js"), "utf8");
const settingsService = fs.readFileSync(path.join(root, "services", "settings_service.js"), "utf8");

test("Settings does not expose the removed word save mode option", () => {
  assert.doesNotMatch(settingsView, /단어 저장 방식/);
  assert.doesNotMatch(settingsView, /name="saveMode"/);
  assert.doesNotMatch(settingsView, /좌클릭 시 자동 저장/);
  assert.doesNotMatch(settingsView, /저장 버튼을 눌러 저장/);
  assert.doesNotMatch(settingsView, /set\("saveMode"/);
  assert.doesNotMatch(settingsService, /saveMode/);
});
