// YouTube timedtext 요청의 관찰·임시 재사용 보조 모듈
(function () {
  "use strict";

  const CACHE_PREFIX = "subsync:caption-request";
  const CAPTION_REQUEST_TTL_MS = 30 * 60 * 1000;
  const YOUTUBE_HOSTS = new Set([
    "www.youtube.com",
    "m.youtube.com",
    "www.youtube-nocookie.com"
  ]);
  const TOKEN_CONTEXT_PARAMS = Object.freeze([
    "pot",
    "potc",
    "c",
    "cver",
    "cplayer",
    "cbr",
    "cbrver",
    "cos",
    "cosver",
    "cplatform",
    "xorb",
    "xobt",
    "xovt",
    "hl"
  ]);

  function normalizeLanguageCode(value) {
    return String(value || "").trim().toLowerCase();
  }

  function captionRequestCacheKey(tabId, videoId, languageCode = "") {
    return [
      CACHE_PREFIX,
      String(tabId),
      encodeURIComponent(String(videoId || "")),
      encodeURIComponent(normalizeLanguageCode(languageCode) || "*")
    ].join(":");
  }

  function captionRequestCacheKeys(tabId, videoId, languageCode = "") {
    const normalizedLanguage = normalizeLanguageCode(languageCode);
    const fallbackKey = captionRequestCacheKey(tabId, videoId);
    return normalizedLanguage
      ? [captionRequestCacheKey(tabId, videoId, normalizedLanguage), fallbackKey]
      : [fallbackKey];
  }

  function captionRequestFromUrl(rawUrl, capturedAt = Date.now()) {
    try {
      const url = new URL(rawUrl);
      const videoId = url.searchParams.get("v") || "";
      const poToken = url.searchParams.get("pot") || "";
      if (
        !YOUTUBE_HOSTS.has(url.hostname) ||
        url.pathname !== "/api/timedtext" ||
        !videoId ||
        !poToken
      ) {
        return null;
      }
      return {
        url: url.toString(),
        videoId,
        languageCode: normalizeLanguageCode(url.searchParams.get("lang")),
        capturedAt: Number(capturedAt)
      };
    } catch (_) {
      return null;
    }
  }

  function isFreshCaptionRequest(request, now = Date.now(), maxAge = CAPTION_REQUEST_TTL_MS) {
    const capturedAt = Number(request && request.capturedAt);
    const age = Number(now) - capturedAt;
    return Number.isFinite(capturedAt) && age >= 0 && age <= maxAge;
  }

  function applyCapturedCaptionRequest(rawTargetUrl, rawCapturedUrl) {
    const capturedRequest = captionRequestFromUrl(rawCapturedUrl);
    if (!capturedRequest) return rawTargetUrl;

    try {
      const targetUrl = new URL(rawTargetUrl);
      if (targetUrl.searchParams.get("v") !== capturedRequest.videoId) {
        return rawTargetUrl;
      }

      const capturedUrl = new URL(capturedRequest.url);
      TOKEN_CONTEXT_PARAMS.forEach((parameter) => {
        const value = capturedUrl.searchParams.get(parameter);
        if (value !== null && value !== "") {
          targetUrl.searchParams.set(parameter, value);
        }
      });
      return targetUrl.toString();
    } catch (_) {
      return rawTargetUrl;
    }
  }

  const api = Object.freeze({
    applyCapturedCaptionRequest,
    captionRequestCacheKey,
    captionRequestCacheKeys,
    captionRequestFromUrl,
    isFreshCaptionRequest
  });

  globalThis.SubSyncCaptionRequests = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})();
