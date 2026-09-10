const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const manifest = JSON.parse(fs.readFileSync(path.join(root, "manifest.json"), "utf8"));
const background = fs.readFileSync(path.join(root, "src", "background.js"), "utf8");

test("manifest grants passive webRequest observation for YouTube captions", () => {
  assert.ok(manifest.permissions.includes("webRequest"));
  assert.ok(manifest.host_permissions.includes("https://www.youtube.com/*"));
});

test("manifest grants the exact local Tutor API origin used by the client", () => {
  assert.ok(manifest.host_permissions.includes("http://127.0.0.1:8000/*"));
});

test("loads caption request helpers before the content caption engine", () => {
  const scripts = manifest.content_scripts.flatMap((entry) => entry.js || []);
  assert.ok(scripts.includes("src/core/caption_requests.js"));
  assert.ok(scripts.indexOf("src/core/caption_requests.js") < scripts.indexOf("src/core/captions.js"));
});

test("background observes timedtext and exposes a caption relay", () => {
  assert.match(background, /chrome\.webRequest\.onBeforeRequest/);
  assert.match(background, /GET_CAPTURED_CAPTION/);
  assert.match(background, /FETCH_CAPTION/);
  assert.match(background, /applyCapturedCaptionRequest/);
});
