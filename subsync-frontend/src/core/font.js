// SubSync UI 폰트 적용 및 변경 구독
(function () {
  const SubSync = (window.__SubSync = window.__SubSync || {});
  const VALID_FONTS = Object.freeze(["system", "gmarket"]);
  const FONT_FACE_STYLE_ID = "subsync-font-face-style";
  const FONT_ASSET_PATH = "assets/fonts/GmarketSansMedium.woff";

  let currentFont = "system";
  let isListening = false;

  function normalizeFont(font) {
    return VALID_FONTS.includes(font) ? font : "system";
  }

  function getFontAssetUrl() {
    try {
      if (
        typeof chrome !== "undefined" &&
        chrome.runtime &&
        typeof chrome.runtime.getURL === "function"
      ) {
        return chrome.runtime.getURL(FONT_ASSET_PATH);
      }
    } catch (_) {}
    return FONT_ASSET_PATH;
  }

  function ensureFontFace() {
    if (typeof document === "undefined" || typeof document.createElement !== "function") {
      return;
    }

    const existing =
      typeof document.getElementById === "function"
        ? document.getElementById(FONT_FACE_STYLE_ID)
        : null;
    if (existing) return;

    const style = document.createElement("style");
    style.id = FONT_FACE_STYLE_ID;
    style.textContent = [
      "@font-face {",
      '  font-family: "GMarketSans";',
      `  src: url(${JSON.stringify(getFontAssetUrl())}) format("woff");`,
      "  font-weight: 500;",
      "  font-style: normal;",
      "  font-display: swap;",
      "}"
    ].join("\n");

    const parent = document.head || document.documentElement || document.body;
    if (parent && typeof parent.appendChild === "function") {
      parent.appendChild(style);
    }
  }

  function apply(font) {
    ensureFontFace();
    currentFont = normalizeFont(font);
    const body = document.body;
    if (body && typeof body.setAttribute === "function") {
      body.setAttribute("data-subsync-font", currentFont);
    }
    return currentFont;
  }

  function init() {
    ensureFontFace();
    if (!isListening && SubSync.settings && SubSync.settings.onChange) {
      SubSync.settings.onChange((key, value) => {
        if (key === "fontFamily") apply(value);
      });
      isListening = true;
    }

    const savedFont =
      SubSync.settings && SubSync.settings.get ? SubSync.settings.get("fontFamily") : "system";
    return apply(savedFont);
  }

  SubSync.font = {
    VALID_FONTS,
    normalizeFont,
    apply,
    init,
    get() {
      return currentFont;
    }
  };
})();
