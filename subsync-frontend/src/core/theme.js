// SubSync 화면 테마 적용 및 변경 구독
(function () {
  const SubSync = (window.__SubSync = window.__SubSync || {});
  const VALID_THEMES = Object.freeze(["dark", "light", "glass"]);
  const THEME_TRANSITION_MS = 280;

  let currentTheme = "dark";
  let isListening = false;
  let transitionTimer = null;

  function normalizeTheme(theme) {
    return VALID_THEMES.includes(theme) ? theme : "dark";
  }

  function apply(theme) {
    currentTheme = normalizeTheme(theme);
    const body = document.body;
    if (body) {
      if (transitionTimer) clearTimeout(transitionTimer);
      if (body.classList && typeof body.classList.add === "function") {
        body.classList.add("subsync-theme-transitioning");
      }
      if (typeof body.setAttribute === "function") {
        body.setAttribute("data-subsync-theme", currentTheme);
      }
      transitionTimer = setTimeout(() => {
        if (body.classList && typeof body.classList.remove === "function") {
          body.classList.remove("subsync-theme-transitioning");
        }
        transitionTimer = null;
      }, THEME_TRANSITION_MS);
    }
    return currentTheme;
  }

  function init() {
    if (!isListening && SubSync.settings && SubSync.settings.onChange) {
      SubSync.settings.onChange((key, value) => {
        if (key === "theme") apply(value);
      });
      isListening = true;
    }

    const savedTheme =
      SubSync.settings && SubSync.settings.get ? SubSync.settings.get("theme") : "dark";
    return apply(savedTheme);
  }

  SubSync.theme = {
    VALID_THEMES,
    normalizeTheme,
    apply,
    init,
    get() {
      return currentTheme;
    }
  };
})();
