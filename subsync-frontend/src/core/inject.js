// YouTube timedtext URL·track metadata를 관찰하고 필요할 때만 caption warm-up을 수행하는 엔진 (MAIN 월드)
(function () {
  const TAG = "[SubSync/inject]";
  const CAPTION_WARMUP_TIMEOUT_MS = 5000;
  const capturedUrls = new Map();
  let activeRequest = null;
  let latestPlayerResponse = null;
  let captionWarmup = null;
  let captionWarmupTimer = null;

  function looksLikeTimedText(url) {
    return typeof url === "string" && url.indexOf("/api/timedtext") !== -1;
  }

  function hasPoToken(url) {
    try {
      return Boolean(new URL(url, window.location.href).searchParams.get("pot"));
    } catch (_) {
      return false;
    }
  }

  function getCurrentVideoId() {
    try {
      const pageUrl = new URL(window.location.href);
      if (pageUrl.pathname === "/watch") return pageUrl.searchParams.get("v");
      const shorts = pageUrl.pathname.match(/^\/shorts\/([\w-]+)/);
      return shorts ? shorts[1] : null;
    } catch (_) {
      return null;
    }
  }

  function getTimedTextVideoId(url) {
    try {
      return new URL(url, window.location.href).searchParams.get("v");
    } catch (_) {
      return null;
    }
  }

  function getCaptionTracks(playerResponse) {
    return (
      (((playerResponse || {}).captions || {}).playerCaptionsTracklistRenderer || {})
        .captionTracks || []
    );
  }

  function sendCapturedUrl(videoId, requestId) {
    const url = videoId ? capturedUrls.get(videoId) : null;
    if (!videoId || !url) return false;
    window.postMessage(
      {
        source: "SUBSYNC",
        type: "TIMEDTEXT_URL",
        videoId,
        requestId: requestId || null,
        url
      },
      "*"
    );
    return true;
  }

  function postCaptured(url, options = {}) {
    if (!looksLikeTimedText(url)) return false;

    const urlVideoId = getTimedTextVideoId(url);
    const videoId = urlVideoId || options.videoId || getCurrentVideoId();
    if (!videoId) return false;
    if (options.videoId && urlVideoId && options.videoId !== urlVideoId) {
      return false;
    }

    const requestId =
      options.requestId ||
      (activeRequest && activeRequest.videoId === videoId
        ? activeRequest.requestId
        : null);

    const previousUrl = capturedUrls.get(videoId);
    // tracklist의 baseUrl(무토큰)가 늦게 도착해도 이미 관찰한 signed URL을 덮어쓰지 않는다.
    if (hasPoToken(previousUrl) && !hasPoToken(url)) {
      if (options.forceNotify) sendCapturedUrl(videoId, requestId);
      return true;
    }

    const changed = previousUrl !== url;
    capturedUrls.set(videoId, url);
    if (!changed && !options.forceNotify) return false;

    sendCapturedUrl(videoId, requestId);
    if (hasPoToken(url)) finishCaptionWarmup(videoId);
    if (changed) console.log(TAG, "현재 영상 timedtext URL 관찰");
    return true;
  }

  const origFetch = window.fetch;

  function sendPageFetchResult(request, result) {
    window.postMessage(
      {
        source: "SUBSYNC",
        type: "PAGE_FETCH_RESULT",
        fetchId: request.fetchId,
        videoId: request.videoId,
        requestId: request.requestId,
        ok: Boolean(result.ok),
        status: Number(result.status) || 0,
        body: typeof result.body === "string" ? result.body : ""
      },
      "*"
    );
  }

  function fetchCaptionInPage(request) {
    const url = request && request.url;
    const videoId = request && request.videoId;
    const urlVideoId = getTimedTextVideoId(url);
    if (
      !request ||
      !request.fetchId ||
      !request.requestId ||
      !videoId ||
      !looksLikeTimedText(url) ||
      (urlVideoId && urlVideoId !== videoId)
    ) {
      return;
    }

    if (typeof origFetch !== "function") {
      sendPageFetchResult(request, { ok: false, status: 0, body: "" });
      return;
    }

    Promise.resolve()
      .then(() => origFetch.call(window, url, { credentials: "include" }))
      .then((response) =>
        response
          .text()
          .then((body) =>
            sendPageFetchResult(request, {
              ok: response.ok,
              status: response.status,
              body
            })
          )
      )
      .catch(() => sendPageFetchResult(request, { ok: false, status: 0, body: "" }));
  }

  window.fetch = function (...args) {
    let url = "";
    try {
      url = typeof args[0] === "string" ? args[0] : args[0] && args[0].url;
    } catch (_) {}
    const result = origFetch.apply(this, args);
    if (looksLikeTimedText(url)) postCaptured(url, { forceNotify: true });
    return result;
  };

  const origOpen = XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open = function (method, url) {
    if (looksLikeTimedText(url)) {
      try {
        postCaptured(url, { forceNotify: true });
      } catch (_) {}
    }
    return origOpen.apply(this, arguments);
  };

  function getResponseVideoId(playerResponse, captionTracks) {
    const responseVideoId =
      playerResponse && playerResponse.videoDetails && playerResponse.videoDetails.videoId;
    if (responseVideoId) return responseVideoId;
    const firstUrl = captionTracks && captionTracks[0] && captionTracks[0].baseUrl;
    return getTimedTextVideoId(firstUrl);
  }

  function isPlayerResponseForVideo(playerResponse, expectedVideoId) {
    if (!playerResponse || typeof playerResponse !== "object") return false;
    const responseVideoId = getResponseVideoId(
      playerResponse,
      getCaptionTracks(playerResponse)
    );
    return Boolean(responseVideoId && (!expectedVideoId || responseVideoId === expectedVideoId));
  }

  function findPlayerResponse(value, expectedVideoId, state = null, depth = 0) {
    if (!value || typeof value !== "object") return null;
    const traversal = state || { seen: new Set(), nodes: 0 };
    if (traversal.seen.has(value) || traversal.nodes >= 4000 || depth > 8) return null;
    traversal.seen.add(value);
    traversal.nodes += 1;

    if (isPlayerResponseForVideo(value, expectedVideoId)) return value;

    const preferredKeys = [
      "playerResponse",
      "pageData",
      "watchNextResponse",
      "response",
      "data",
      "player"
    ];
    const keys = [
      ...preferredKeys,
      ...Object.keys(value).filter((key) => !preferredKeys.includes(key))
    ];
    for (const key of keys) {
      let child;
      try {
        child = value[key];
      } catch (_) {
        continue;
      }
      const found = findPlayerResponse(child, expectedVideoId, traversal, depth + 1);
      if (found) return found;
    }
    return null;
  }

  function getCurrentPlayer() {
    try {
      const player = document.getElementById("movie_player");
      return player || null;
    } catch (_) {
      return null;
    }
  }

  function getCurrentPlayerResponseFromPlayer() {
    const player = getCurrentPlayer();
    if (!player || typeof player.getPlayerResponse !== "function") return null;
    try {
      return player.getPlayerResponse() || null;
    } catch (_) {
      return null;
    }
  }

  function snapshotCaptionTrack(track) {
    if (!track || typeof track !== "object") return {};
    const snapshot = {};
    ["languageCode", "vssId", "kind"].forEach((key) => {
      if (track[key] !== undefined && track[key] !== null && track[key] !== "") {
        snapshot[key] = track[key];
      }
    });
    return snapshot;
  }

  function restoreCaptionWarmup() {
    const state = captionWarmup;
    if (!state) return false;
    captionWarmup = null;
    if (captionWarmupTimer !== null) {
      clearTimeout(captionWarmupTimer);
      captionWarmupTimer = null;
    }

    const player = state.player;
    if (!player || typeof player.setOption !== "function") return false;
    try {
      player.setOption("captions", "track", state.previousTrack || {});
      return true;
    } catch (_) {
      return false;
    }
  }

  function startCaptionWarmup(request = {}) {
    const videoId = request.videoId || getCurrentVideoId();
    if (!videoId) return false;
    if (captionWarmup && captionWarmup.videoId === videoId) return true;
    restoreCaptionWarmup();

    const player = getCurrentPlayer();
    const playerResponse = getCurrentPlayerResponse(videoId);
    const responseTracks = getCaptionTracks(playerResponse);
    if (
      !player ||
      typeof player.setOption !== "function"
    ) {
      return false;
    }

    let previousTrack = {};
    try {
      if (typeof player.getOption === "function") {
        previousTrack = snapshotCaptionTrack(player.getOption("captions", "track"));
      }
    } catch (_) {}

    try {
      if (typeof player.loadModule === "function") {
        player.loadModule("captions");
      }
    } catch (_) {}

    let playerTracks = [];
    try {
      if (typeof player.getOption === "function") {
        playerTracks = player.getOption("captions", "tracklist") || [];
      }
    } catch (_) {}
    const captionTracks = Array.isArray(playerTracks) && playerTracks.length
      ? playerTracks
      : responseTracks;
    const preferredTrack =
      captionTracks.find((track) => (track.languageCode || "").startsWith("en")) ||
      captionTracks[0];
    if (!preferredTrack) return false;

    captionWarmup = {
      videoId,
      requestId: request.requestId || null,
      player,
      previousTrack
    };
    try {
      player.setOption("captions", "track", {
        languageCode: preferredTrack.languageCode || "",
        vssId: preferredTrack.vssId || "",
        kind: preferredTrack.kind || ""
      });
      try {
        player.setOption("captions", "reload", true);
      } catch (_) {}
    } catch (_) {
      captionWarmup = null;
      return false;
    }

    captionWarmupTimer = setTimeout(() => {
      restoreCaptionWarmup();
    }, CAPTION_WARMUP_TIMEOUT_MS);
    return true;
  }

  function finishCaptionWarmup(videoId) {
    if (!captionWarmup || captionWarmup.videoId !== videoId) return false;
    return restoreCaptionWarmup();
  }

  function getCurrentPlayerResponse(videoId) {
    const candidates = [
      getCurrentPlayerResponseFromPlayer(),
      latestPlayerResponse,
      window.ytInitialPlayerResponse
    ];
    return candidates.find((candidate) => isPlayerResponseForVideo(candidate, videoId)) || null;
  }

  function announceTracks(request = {}) {
    try {
      const requestedVideoId = request.videoId || getCurrentVideoId();
      const playerResponse = getCurrentPlayerResponse(requestedVideoId);
      if (!playerResponse) return false;
      const renderer =
        ((playerResponse || {}).captions || {}).playerCaptionsTracklistRenderer || {};
      const captionTracks = renderer.captionTracks || [];
      const translations = renderer.translationLanguages || [];
      const responseVideoId = getResponseVideoId(playerResponse, captionTracks);

      // SPA 전환 중 남아 있는 이전 player response는 현재 영상 데이터로 사용하지 않는다.
      if (
        !responseVideoId ||
        (requestedVideoId && requestedVideoId !== responseVideoId)
      ) {
        return false;
      }

      const videoId = responseVideoId || requestedVideoId;
      if (!videoId) return false;

      const nameOf = (name) =>
        (name && (name.simpleText || (name.runs && name.runs[0] && name.runs[0].text))) || "";
      const tracks = captionTracks.map((track) => ({
        lang: track.languageCode,
        kind: track.kind || "",
        baseUrl: track.baseUrl || ""
      }));

      window.postMessage(
        {
          source: "SUBSYNC",
          type: "TRACKS",
          videoId,
          requestId: request.requestId || null,
          tracks,
          translations: translations.map((translation) => ({
            code: translation.languageCode,
            name: nameOf(translation.languageName)
          }))
        },
        "*"
      );

      const preferredTrack =
        captionTracks.find((track) => (track.languageCode || "").startsWith("en")) ||
        captionTracks[0];
      return postCaptured(preferredTrack && preferredTrack.baseUrl, {
        videoId,
        requestId: request.requestId,
        forceNotify: Boolean(request.requestId)
      });
    } catch (_) {
      return false;
    }
  }

  let attempts = 0;
  let timer = null;
  let pollingStopped = false;

  function reportSourceUnavailable() {
    if (!activeRequest || !activeRequest.videoId) return;
    window.postMessage(
      {
        source: "SUBSYNC",
        type: "CAPTION_SOURCE_ERROR",
        videoId: activeRequest.videoId,
        requestId: activeRequest.requestId,
        code: "source-unavailable"
      },
      "*"
    );
  }

  function startPolling() {
    attempts = 0;
    pollingStopped = false;
    if (timer) clearInterval(timer);
    announceTracks(activeRequest || {});

    const initialVideoId = activeRequest && activeRequest.videoId;
    const initialCapturedUrl = initialVideoId ? capturedUrls.get(initialVideoId) : null;
    if (hasPoToken(initialCapturedUrl)) {
      pollingStopped = true;
      return;
    }

    timer = setInterval(() => {
      if (pollingStopped) return;
      attempts++;
      const sent = announceTracks(activeRequest || {});
      const videoId = activeRequest && activeRequest.videoId;
      const capturedUrl = videoId ? capturedUrls.get(videoId) : null;
      const trackObserved = Boolean(sent || capturedUrl);
      const tokenObserved = hasPoToken(capturedUrl);
      const trackGraceExpired = trackObserved && attempts >= 20;
      if (tokenObserved || trackGraceExpired || attempts > 60) {
        pollingStopped = true;
        clearInterval(timer);
        if (!trackObserved && attempts > 60) reportSourceUnavailable();
      }
    }, 500);
  }

  function handleNavigateStart() {
    restoreCaptionWarmup();
    activeRequest = null;
    latestPlayerResponse = null;
    pollingStopped = true;
    if (timer) clearInterval(timer);
    timer = null;
  }

  function handlePageDataUpdated(event) {
    const requestedVideoId = getCurrentVideoId();
    const playerResponse = findPlayerResponse(
      event && event.detail,
      requestedVideoId
    );
    if (playerResponse) latestPlayerResponse = playerResponse;
    startPolling();
  }

  document.addEventListener("yt-navigate-start", handleNavigateStart);
  document.addEventListener("yt-page-data-updated", handlePageDataUpdated);

  document.addEventListener("yt-navigate-finish", () => {
    activeRequest = null;
    setTimeout(startPolling, 500);
  });

  startPolling();

  window.addEventListener("message", (event) => {
    if (
      event.source === window &&
      event.data &&
      event.data.source === "SUBSYNC_CAPTION_WARMUP_REQUEST"
    ) {
      startCaptionWarmup(event.data);
      return;
    }
    if (
      event.source === window &&
      event.data &&
      event.data.source === "SUBSYNC_CAPTION_WARMUP_STOP"
    ) {
      finishCaptionWarmup(event.data.videoId || getCurrentVideoId());
      return;
    }
    if (event.source === window && event.data && event.data.source === "SUBSYNC_PAGE_FETCH_REQUEST") {
      fetchCaptionInPage(event.data);
      return;
    }
    if (
      event.source !== window ||
      !event.data ||
      event.data.source !== "SUBSYNC_REQUEST"
    ) {
      return;
    }

    const videoId = event.data.videoId || getCurrentVideoId();
    activeRequest = {
      videoId,
      requestId: event.data.requestId || null
    };
    if (event.data.forceRefresh && videoId) capturedUrls.delete(videoId);

    const capturedFromTrack = announceTracks(activeRequest);
    if (!capturedFromTrack) sendCapturedUrl(videoId, activeRequest.requestId);
    if (!hasPoToken(capturedUrls.get(videoId))) startPolling();
  });
})();
