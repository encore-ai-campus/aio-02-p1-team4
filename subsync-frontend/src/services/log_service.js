// 로컬 학습 기록 서비스
(function () {
  const SubSync = (window.__SubSync = window.__SubSync || {});

  function currentVideoTitle() {
    if (typeof document === "undefined") return "";
    const selectors = [
      "h1.ytd-watch-metadata yt-formatted-string",
      "h1.title yt-formatted-string",
      "meta[property=\"og:title\"]"
    ];
    for (const selector of selectors) {
      const element = document.querySelector(selector);
      const value = element?.content || element?.textContent;
      if (value && String(value).trim()) return String(value).trim();
    }
    return String(document.title || "")
      .replace(/\s*-\s*YouTube\s*$/i, "")
      .trim();
  }

  SubSync.logService = {
    recordClick(word, sentence) {
      if (SubSync.learningHistory && SubSync.player) {
        SubSync.learningHistory.recordWordClick(word, sentence, {
          video_id: SubSync.getVideoId ? SubSync.getVideoId() : "",
          timestamp: SubSync.player.getCurrentTime()
        });
      }
    },

    recordWatch(durationSec) {
      const title = currentVideoTitle();
      if (SubSync.learningHistory && SubSync.getVideoId) {
        SubSync.learningHistory.recordWatch(
          SubSync.getVideoId(),
          durationSec,
          { timestamp: SubSync.player.getCurrentTime(), title }
        );
      }
    }
  };
})();
