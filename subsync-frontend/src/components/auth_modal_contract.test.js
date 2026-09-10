const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const source = fs.readFileSync(path.join(__dirname, "auth_modal.js"), "utf8");

test("Google login icon has an inline fallback when the extension image cannot load", () => {
  assert.match(source, /function googleButtonFallbackMarkup/);
  assert.match(source, /addEventListener\("error"/);
  assert.match(source, /replaceWith/);
  assert.match(source, /viewBox="0 0 24 24"/);
});
