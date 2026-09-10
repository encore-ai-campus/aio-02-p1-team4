// 프론트 학습 기록 read model
(function () {
  const SubSync = (window.__SubSync = window.__SubSync || {});
  const STORAGE_KEY = "subsync_learning_history";
  const MAX_WORD_HISTORY = 200;
  const MAX_VIDEO_HISTORY = 100;
  const MAX_SAVED_WORDS = 500;


  let state = null;
  let loadPromise = null;

  function emptyState() {
    return {
      wordHistory: [],
      videoHistory: [],
      savedWords: []
    };
  }

  function copy(value) {
    return value && typeof value === "object" ? { ...value } : value;
  }

  function normalizeState(value) {
    const source = value && typeof value === "object" ? value : {};
    return {
      wordHistory: Array.isArray(source.wordHistory) ? source.wordHistory.slice(0, MAX_WORD_HISTORY) : [],
      videoHistory: Array.isArray(source.videoHistory) ? source.videoHistory.slice(0, MAX_VIDEO_HISTORY) : [],
      savedWords: Array.isArray(source.savedWords) ? source.savedWords.slice(0, MAX_SAVED_WORDS) : []
    };
  }

  function storage() {
    try {
      if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.local) {
        return chrome.storage.local;
      }
    } catch (_) {}
    return null;
  }

  function now() {
    return new Date().toISOString();
  }

  function makeId(prefix) {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  }

  async function load() {
    if (state) return state;
    if (loadPromise) return loadPromise;

    const store = storage();
    if (!store || typeof store.get !== "function") {
      state = emptyState();
      return state;
    }

    loadPromise = new Promise((resolve) => {
      store.get([STORAGE_KEY], (result) => {
        state = normalizeState(result && result[STORAGE_KEY]);
        resolve(state);
      });
    });
    return loadPromise;
  }

  async function persist() {
    const store = storage();
    if (!store || typeof store.set !== "function") return;
    await new Promise((resolve) => {
      store.set({ [STORAGE_KEY]: state }, resolve);
    });
  }

  function sortNewest(items, dateKey) {
    return items.slice().sort((a, b) => String(b[dateKey] || "").localeCompare(String(a[dateKey] || "")));
  }

  SubSync.learningHistory = {
    async recordWordClick(word, contextSentence, metadata = {}) {
      await load();
      const item = {
        id: makeId("click"),
        activity: "clicked",
        word: String(word || ""),
        meaning: String(metadata.meaning || ""),
        context_sentence: String(contextSentence || ""),
        video_id: String(metadata.video_id || ""),
        timestamp: Number.isFinite(Number(metadata.timestamp)) ? Number(metadata.timestamp) : null,
        created_at: now()
      };
      state.wordHistory.unshift(item);
      state.wordHistory = state.wordHistory.slice(0, MAX_WORD_HISTORY);
      await persist();
      return copy(item);
    },

    async saveWord(input = {}) {
      await load();
      const existing = state.savedWords.find((item) =>
        (input.id && item.id === input.id) ||
        (!input.id && item.word === input.word && item.video_id === input.video_id && item.timestamp === input.timestamp)
      );
      const item = {
        id: existing ? existing.id : String(input.id || makeId("local_word")),
        activity: "saved",
        word: String(input.word || ""),
        meaning: String(input.meaning || ""),
        video_id: String(input.video_id || ""),
        timestamp: Number.isFinite(Number(input.timestamp)) ? Number(input.timestamp) : null,
        context_sentence: String(input.context_sentence || ""),
        saved_at: String(input.saved_at || now()),
        created_at: String(input.created_at || now()),
        local_only: Boolean(input.local_only)
      };

      state.savedWords = [item, ...state.savedWords.filter((saved) => saved.id !== item.id)].slice(0, MAX_SAVED_WORDS);
      state.wordHistory = [item, ...state.wordHistory].slice(0, MAX_WORD_HISTORY);
      await persist();
      return copy(item);
    },

    async deleteSavedWord(id) {
      await load();
      state.savedWords = state.savedWords.filter((item) => item.id !== id);
      await persist();
    },


    async recordWatch(videoId, durationSec, metadata = {}) {
      await load();
      const normalizedVideoId = String(videoId || "");
      const seconds = Math.max(0, Number(durationSec) || 0);
      if (!normalizedVideoId || seconds <= 0) return null;

      const watchedAt = now();
      const existing = state.videoHistory.find((item) => item.video_id === normalizedVideoId);
      if (existing) {
        existing.watched_seconds = Number(existing.watched_seconds || 0) + seconds;
        existing.last_timestamp = Number.isFinite(Number(metadata.timestamp)) ? Number(metadata.timestamp) : existing.last_timestamp;
        existing.last_watched_at = watchedAt;
        if (metadata.title) existing.title = String(metadata.title);
      } else {
        state.videoHistory.unshift({
          id: makeId("video"),
          video_id: normalizedVideoId,
          title: String(metadata.title || ""),
          watched_seconds: seconds,
          last_timestamp: Number.isFinite(Number(metadata.timestamp)) ? Number(metadata.timestamp) : 0,
          first_watched_at: watchedAt,
          last_watched_at: watchedAt
        });
      }
      state.videoHistory = sortNewest(state.videoHistory, "last_watched_at").slice(0, MAX_VIDEO_HISTORY);
      await persist();
      return copy(state.videoHistory.find((item) => item.video_id === normalizedVideoId));
    },

    async getWordHistory() {
      await load();
      return sortNewest(state.wordHistory, "created_at").map(copy);
    },

    async getVideoHistory() {
      await load();
      return sortNewest(state.videoHistory, "last_watched_at").map(copy);
    },

    async getSavedWords() {
      await load();
      return sortNewest(state.savedWords, "saved_at").map(copy);
    }
  };
})();
