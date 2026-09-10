const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const components = path.resolve(__dirname);
const root = path.resolve(components, "..");
const historyView = fs.readFileSync(path.join(components, "history_view.js"), "utf8");
const savedWordsView = fs.readFileSync(path.join(components, "saved_words_view.js"), "utf8");
const dictService = fs.readFileSync(path.join(root, "services", "dict_service.js"), "utf8");
const contentMain = fs.readFileSync(path.join(root, "content_main.js"), "utf8");
const logService = fs.readFileSync(path.join(root, "services", "log_service.js"), "utf8");
const manifest = JSON.parse(fs.readFileSync(path.join(root, "..", "manifest.json"), "utf8"));

test("Storage exposes only words and watch history tabs", () => {
  assert.match(historyView, /savedWordsView[\s\S]*render/);
  assert.match(historyView, /getVideoHistory/);
  assert.doesNotMatch(historyView, /현재 학습 중인 영상/);
  assert.doesNotMatch(historyView, /Video ID:/);
  assert.match(historyView, /data-tab="words"/);
  assert.match(historyView, /data-tab="video"/);
  assert.doesNotMatch(historyView, /data-tab="sentences"/);
  assert.doesNotMatch(historyView, />문장<\/button>/);
  assert.match(historyView, />단어<\/button>/);
  assert.match(historyView, />시청기록<\/button>/);
});

test("video history cards use a title, thumbnail, and linked YouTube destination", () => {
  assert.match(historyView, /subsync-history-video-thumb/);
  assert.match(historyView, /i\.ytimg\.com\/vi/);
  assert.match(historyView, /youtube\.com\/watch\?v=/);
  assert.match(historyView, /subsync-history-video-title/);
  assert.match(historyView, /target="_blank"/);
});

test("saved words view accepts the API contract and local fallback", () => {
  assert.match(savedWordsView, /getSavedWords/);
  assert.match(savedWordsView, /response\.words/);
  assert.match(savedWordsView, /response\.items/);
  assert.match(savedWordsView, /deleteSavedWord/);
  assert.doesNotMatch(savedWordsView, /formatTimestamp|subsync-saved-time/);
  assert.match(savedWordsView, /refresh/);
  assert.match(dictService, /savedWordsView[\s\S]*refresh/);
});

test("saved word cards reuse the shared hover interaction", () => {
  assert.match(savedWordsView, /querySelectorAll\("\.subsync-saved-word"\)/);
  assert.match(savedWordsView, /SubSync\.interactiveText\.attach/);

  const scripts = manifest.content_scripts.flatMap((item) => item.js || []);
  const savedWordsIndex = scripts.indexOf("src/components/saved_words_view.js");
  for (const dependency of [
    "src/interactive/tokenizer.js",
    "src/interactive/hover_tooltip.js",
    "src/interactive/interactive_text.js"
  ]) {
    assert.ok(scripts.indexOf(dependency) < savedWordsIndex, `${dependency} must load before saved words`);
  }
});

test("content lifecycle records watch intervals while video playback is active", () => {
  assert.match(contentMain, /recordWatch/);
  assert.match(contentMain, /watchSampleAt/);
});

test("watch logging stores the current YouTube title with the video record", () => {
  assert.match(logService, /document\.title/);
  assert.match(logService, /title\s*}/);
});

test("manifest loads the learning history service before its consumers", () => {
  const scripts = manifest.content_scripts.flatMap((item) => item.js || []);
  assert.ok(scripts.includes("src/services/learning_history_service.js"));
  assert.ok(scripts.indexOf("src/services/learning_history_service.js") < scripts.indexOf("src/services/log_service.js"));
  assert.ok(scripts.indexOf("src/services/learning_history_service.js") < scripts.indexOf("src/components/history_view.js"));
});
