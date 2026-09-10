// 사전 조회 서비스 (sessionStorage 1차 캐시 → 백엔드 호출)
(function () {
  const SubSync = (window.__SubSync = window.__SubSync || {});

  function currentVideoId() {
    try {
      return SubSync.getVideoId ? String(SubSync.getVideoId() || "") : "";
    } catch (_) {
      return "";
    }
  }

  function currentTimestamp() {
    try {
      return SubSync.player && typeof SubSync.player.getCurrentTime === "function"
        ? SubSync.player.getCurrentTime()
        : null;
    } catch (_) {
      return null;
    }
  }

  function matchesSavedWord(item, input = {}) {
    if (!item) return false;
    if (input.id && String(item.id) === String(input.id)) return true;
    const wordMatches = String(item.word || "").trim().toLowerCase() === String(input.word || "").trim().toLowerCase();
    if (!wordMatches) return false;
    const videoId = String(input.video_id || "");
    return !videoId || !item.video_id || String(item.video_id) === videoId;
  }

  SubSync.dictService = {
    async getHoverMeaning(word) {
      const cleanWord = word.toLowerCase().trim();
      const cacheKey = `subsync_hover_${cleanWord}`;
      const cached = sessionStorage.getItem(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }

      const res = await SubSync.apiClient.request(`/dictionary/hover?word=${encodeURIComponent(cleanWord)}`);
      sessionStorage.setItem(cacheKey, JSON.stringify(res));
      return res;
    },

    async getDetailMeaning(word, sentence) {
      const cleanWord = word.toLowerCase().trim();
      const query = `/dictionary/detail?word=${encodeURIComponent(cleanWord)}&context=${encodeURIComponent(sentence || "")}`;
      return await SubSync.apiClient.request(query);
    },

    async saveWord(word, meaning, sentence) {
      const payload = {
        word,
        meaning,
        video_id: currentVideoId(),
        timestamp: currentTimestamp(),
        context_sentence: sentence
      };

      let result;
      try {
        const response = await SubSync.apiClient.request("/words/save", {
          method: "POST",
          body: JSON.stringify(payload)
        });
        if (SubSync.learningHistory) {
          await SubSync.learningHistory.saveWord({
            ...payload,
            ...response,
            local_only: false
          });
        }
        result = response;
      } catch (error) {
        if (!SubSync.learningHistory) throw error;
        result = await SubSync.learningHistory.saveWord({
          ...payload,
          local_only: true
        });
      }

      if (SubSync.savedWordsView && SubSync.savedWordsView.refresh) {
        await SubSync.savedWordsView.refresh();
      }
      return result;
    },

    async removeWord(savedWord = {}) {
      const input = {
        ...savedWord,
        video_id: savedWord.video_id || currentVideoId()
      };
      const localItems = SubSync.learningHistory && SubSync.learningHistory.getSavedWords
        ? await SubSync.learningHistory.getSavedWords()
        : [];
      const storedItem = (Array.isArray(localItems) ? localItems : []).find((item) => matchesSavedWord(item, input));
      const id = storedItem?.id || input.id || "";
      if (!id) return null;

      const isLocalOnly = String(id).startsWith("local_word_");
      if (!isLocalOnly && SubSync.apiClient && SubSync.apiClient.request) {
        await SubSync.apiClient.request(`/words/${encodeURIComponent(id)}`, { method: "DELETE" });
      }
      if (SubSync.learningHistory && SubSync.learningHistory.deleteSavedWord) {
        await SubSync.learningHistory.deleteSavedWord(id);
      }
      if (SubSync.savedWordsView && SubSync.savedWordsView.refresh) {
        await SubSync.savedWordsView.refresh();
      }
      return storedItem || input;
    }
  };
})();
