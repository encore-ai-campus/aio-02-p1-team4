// SubSync 로컬 SVG 아이콘 URL 및 마크업 헬퍼
(function () {
  const SubSync = (window.__SubSync = window.__SubSync || {});

  const ICON_FILES = Object.freeze({
    "video-learning": "video-learning.svg",
    "ai-tutor": "ai-tutor.svg",
    vocabulary: "vocabulary.svg",
    "learning-history": "learning-history.svg",
    settings: "settings.svg",
    script: "script.svg",
    search: "search.svg",
    collapse: "collapse.svg",
    refresh: "refresh.svg",
    google: "google.svg",
    star: "star.svg",
    "star-filled": "star-filled.svg"
  });

  function iconUrl(name) {
    const fileName = ICON_FILES[name];
    if (!fileName) return "";

    const relativePath = `assets/icons/${fileName}`;
    try {
      if (
        typeof chrome !== "undefined" &&
        chrome.runtime &&
        typeof chrome.runtime.getURL === "function"
      ) {
        return chrome.runtime.getURL(relativePath);
      }
    } catch (_) {}
    return relativePath;
  }

  SubSync.iconUrl = iconUrl;
  SubSync.icon = function icon(name, className = "") {
    const url = iconUrl(name);
    if (!url) return "";
    const safeClassName = String(className).replace(/[^a-zA-Z0-9_-]/g, " ").trim();
    const classes = ["subsync-ui-icon", safeClassName].filter(Boolean).join(" ");
    return `<img class="${classes}" src="${url}" alt="" aria-hidden="true" draggable="false">`;
  };
})();
