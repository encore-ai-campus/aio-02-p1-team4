const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const filename = path.join(__dirname, "learning_history_service.js");

function createContext(initialState) {
  let stored = initialState;
  const context = {
    console,
    Date,
    Math,
    Promise,
    window: null,
    chrome: {
      storage: {
        local: {
          get(_keys, callback) {
            callback({ subsync_learning_history: stored });
          },
          set(payload, callback) {
            stored = payload.subsync_learning_history;
            callback?.();
          }
        }
      }
    },
    __SubSync: {}
  };
  context.window = context;
  return {
    context,
    getStored() {
      return stored;
    }
  };
}

function loadService(context) {
  if (!fs.existsSync(filename)) return;
  vm.runInNewContext(fs.readFileSync(filename, "utf8"), context, { filename });
}

test("learning history service exposes separate word, video, and saved-word stores", () => {
  const { context } = createContext(null);
  loadService(context);
  assert.ok(context.__SubSync.learningHistory);
  assert.equal(typeof context.__SubSync.learningHistory.getWordHistory, "function");
  assert.equal(typeof context.__SubSync.learningHistory.getVideoHistory, "function");
  assert.equal(typeof context.__SubSync.learningHistory.getSavedWords, "function");
});

test("learning history records word clicks and saved words independently", async () => {
  const { context } = createContext(null);
  loadService(context);
  const history = context.__SubSync.learningHistory;

  await history.recordWordClick("honest", "I want to be honest with you.", {
    video_id: "video-1",
    timestamp: 156.4
  });
  const saved = await history.saveWord({
    word: "honest",
    meaning: "정직한, 솔직한",
    video_id: "video-1",
    timestamp: 156.4,
    context_sentence: "I want to be honest with you."
  });

  const wordHistory = await history.getWordHistory();
  const savedWords = await history.getSavedWords();
  assert.equal(wordHistory.length, 2);
  assert.equal(wordHistory[0].activity, "saved");
  assert.equal(wordHistory[1].activity, "clicked");
  assert.equal(savedWords.length, 1);
  assert.equal(savedWords[0].id, saved.id);
});

test("learning history merges watch intervals by video", async () => {
  const { context } = createContext(null);
  loadService(context);
  const history = context.__SubSync.learningHistory;

  await history.recordWatch("video-1", 10, { timestamp: 10, title: "Video title" });
  await history.recordWatch("video-1", 15, { timestamp: 25, title: "Video title" });
  await history.recordWatch("video-2", 4, { timestamp: 4 });

  const videos = await history.getVideoHistory();
  assert.equal(videos.length, 2);
  assert.equal(videos.find((item) => item.video_id === "video-1").watched_seconds, 25);
  assert.equal(videos.find((item) => item.video_id === "video-1").last_timestamp, 25);
  assert.equal(videos.find((item) => item.video_id === "video-1").title, "Video title");
});

test("learning history deletes a saved word without deleting its learning record", async () => {
  const { context } = createContext(null);
  loadService(context);
  const history = context.__SubSync.learningHistory;
  const saved = await history.saveWord({ word: "honest", meaning: "정직한" });
  await history.recordWordClick("honest", "Be honest.");

  await history.deleteSavedWord(saved.id);
  assert.equal((await history.getSavedWords()).length, 0);
  assert.equal((await history.getWordHistory()).length, 2);
});
