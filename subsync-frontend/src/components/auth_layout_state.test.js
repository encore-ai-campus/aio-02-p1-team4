const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const source = fs.readFileSync(path.join(__dirname, "layout.js"), "utf8");

test("auth button logout action follows the displayed authentication state", () => {
  assert.match(source, /authBtn\.dataset\.authenticated\s*=\s*isAuthed\s*\?\s*"true"\s*:\s*"false"/);
  assert.match(source, /authBtn\.dataset\.authReady\s*=\s*"true"/);
  assert.match(source, /authButton\?\.dataset\.authReady\s*!==\s*"true"/);
  assert.match(source, /authButton\?\.dataset\.authenticated\s*===\s*"true"/);
});
