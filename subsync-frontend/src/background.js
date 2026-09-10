// MV3 서비스 워커: YouTube 자막 요청의 임시 PO token relay
importScripts(
  "core/caption_requests.js",
  "services/auth_config.js",
  "services/auth_oauth.js"
);

const {
  applyCapturedCaptionRequest,
  captionRequestCacheKey,
  captionRequestCacheKeys,
  captionRequestFromUrl,
  isFreshCaptionRequest
} = globalThis.SubSyncCaptionRequests;

const YOUTUBE_HOSTS = new Set([
  "www.youtube.com",
  "m.youtube.com",
  "www.youtube-nocookie.com"
]);
const captionRequestMemory = new Map();
const CAPTION_CONTEXT_WAIT_MS = 1800;
const CAPTION_CONTEXT_POLL_MS = 100;

function notifyCaptionContextUpdated(tabId, request) {
  const tabs = chrome.tabs;
  if (!tabs || typeof tabs.sendMessage !== "function" || !request) return;

  try {
    const result = tabs.sendMessage(tabId, {
      type: "CAPTION_CONTEXT_UPDATED",
      videoId: request.videoId,
      languageCode: request.languageCode
    });
    if (result && typeof result.catch === "function") result.catch(() => {});
  } catch (_) {}
}

function rememberCaptionRequest(tabId, rawUrl) {
  const numericTabId = Number(tabId);
  if (!Number.isInteger(numericTabId) || numericTabId < 0) return;

  const request = captionRequestFromUrl(rawUrl);
  if (!request) return;

  const keys = [
    captionRequestCacheKey(numericTabId, request.videoId, request.languageCode),
    captionRequestCacheKey(numericTabId, request.videoId)
  ];
  const entries = {};
  let changed = false;
  for (const key of keys) {
    const previous = captionRequestMemory.get(key);
    if (!previous || previous.url !== request.url) changed = true;
    captionRequestMemory.set(key, request);
    entries[key] = request;
  }

  if (changed) notifyCaptionContextUpdated(numericTabId, request);

  const sessionStorage = chrome.storage && chrome.storage.session;
  if (sessionStorage && typeof sessionStorage.set === "function") {
    try {
      const result = sessionStorage.set(entries);
      if (result && typeof result.catch === "function") result.catch(() => {});
    } catch (_) {}
  }
}

async function getCapturedCaptionRequest(tabId, videoId, languageCode = "") {
  const numericTabId = Number(tabId);
  const normalizedVideoId = String(videoId || "");
  if (
    !Number.isInteger(numericTabId) ||
    numericTabId < 0 ||
    !normalizedVideoId
  ) {
    return null;
  }

  const keys = captionRequestCacheKeys(
    numericTabId,
    normalizedVideoId,
    languageCode
  );
  const now = Date.now();
  const fresh = [];
  for (const key of keys) {
    const cached = captionRequestMemory.get(key);
    if (isFreshCaptionRequest(cached, now)) fresh.push(cached);
  }

  const sessionStorage = chrome.storage && chrome.storage.session;
  if (sessionStorage && typeof sessionStorage.get === "function") {
    try {
      const stored = await sessionStorage.get(keys);
      for (const key of keys) {
        const cached = stored && stored[key];
        if (isFreshCaptionRequest(cached, now)) {
          captionRequestMemory.set(key, cached);
          fresh.push(cached);
        }
      }
    } catch (_) {}
  }

  return fresh.reduce((latest, candidate) => {
    if (!latest) return candidate;
    return Number(candidate.capturedAt) > Number(latest.capturedAt)
      ? candidate
      : latest;
  }, null);
}

function waitForCaptionContext(tabId, videoId, languageCode) {
  return (async () => {
    let captured = await getCapturedCaptionRequest(tabId, videoId, languageCode);
    if (captured || typeof setTimeout !== "function") return captured;

    const deadline = Date.now() + CAPTION_CONTEXT_WAIT_MS;
    while (Date.now() < deadline) {
      await new Promise((resolve) => setTimeout(resolve, CAPTION_CONTEXT_POLL_MS));
      captured = await getCapturedCaptionRequest(tabId, videoId, languageCode);
      if (captured) return captured;
    }
    return null;
  })();
}

function validateYouTubeCaptionUrl(rawUrl) {
  const url = new URL(rawUrl);
  if (!YOUTUBE_HOSTS.has(url.hostname) || url.pathname !== "/api/timedtext") {
    throw new Error("허용되지 않은 유튜브 자막 요청입니다.");
  }
  return url;
}

async function fetchCaption(rawUrl, tabId, videoId, languageCode) {
  const targetUrl = validateYouTubeCaptionUrl(rawUrl);
  const targetVideoId = targetUrl.searchParams.get("v") || "";
  if (videoId && targetVideoId && String(videoId) !== targetVideoId) {
    throw new Error("다른 영상의 자막 요청은 처리하지 않습니다.");
  }

  const resolvedVideoId = targetVideoId || videoId;
  const captured = targetUrl.searchParams.get("pot")
    ? await getCapturedCaptionRequest(tabId, resolvedVideoId, languageCode)
    : await waitForCaptionContext(tabId, resolvedVideoId, languageCode);
  const effectiveUrl = new URL(
    applyCapturedCaptionRequest(targetUrl.toString(), captured && captured.url)
  );
  effectiveUrl.searchParams.set("fmt", "json3");

  const response = await fetch(effectiveUrl.toString(), {
    credentials: "include"
  });
  const body = await response.text();
  return {
    ok: response.ok,
    status: Number(response.status) || 0,
    contentType: response.headers && response.headers.get
      ? response.headers.get("content-type") || ""
      : "",
    body
  };
}

if (chrome.webRequest && chrome.webRequest.onBeforeRequest) {
  chrome.webRequest.onBeforeRequest.addListener(
    (details) => {
      if (details && details.method === "GET") {
        rememberCaptionRequest(details.tabId, details.url);
      }
    },
    {
      urls: [
        "https://www.youtube.com/api/timedtext*",
        "https://m.youtube.com/api/timedtext*",
        "https://www.youtube-nocookie.com/api/timedtext*"
      ]
    }
  );
}

if (chrome.tabs && chrome.tabs.onRemoved) {
  chrome.tabs.onRemoved.addListener((tabId) => {
    const prefix = `subsync:caption-request:${String(tabId)}:`;
    for (const key of captionRequestMemory.keys()) {
      if (key.startsWith(prefix)) captionRequestMemory.delete(key);
    }
  });
}

const AUTH_SESSION_KEY = "subsync_auth_session";
const AUTH_TOKEN_KEY = "subsync_token";
const AUTH_USER_KEY = "subsync_user";
const AUTH_VERIFIER_KEY = "subsync_oauth_code_verifier";

function localStorageGet(keys) {
  return new Promise((resolve, reject) => {
    const local = chrome.storage && chrome.storage.local;
    if (!local || typeof local.get !== "function") {
      resolve({});
      return;
    }
    try {
      local.get(keys, (result) => resolve(result || {}));
    } catch (error) {
      reject(error);
    }
  });
}

function localStorageSet(values) {
  return new Promise((resolve, reject) => {
    const local = chrome.storage && chrome.storage.local;
    if (!local || typeof local.set !== "function") {
      reject(new Error("Chrome local storage를 사용할 수 없습니다."));
      return;
    }
    try {
      local.set(values, resolve);
    } catch (error) {
      reject(error);
    }
  });
}

function localStorageRemove(keys) {
  return new Promise((resolve, reject) => {
    const local = chrome.storage && chrome.storage.local;
    if (!local || typeof local.remove !== "function") {
      resolve();
      return;
    }
    try {
      local.remove(keys, resolve);
    } catch (error) {
      reject(error);
    }
  });
}

function authConfigOrThrow() {
  const config = globalThis.SubSyncAuthConfig;
  if (!config || typeof config.isConfigured !== "function" || !config.isConfigured()) {
    throw new Error("Supabase URL과 publishable key를 src/services/auth_config.js에 설정해주세요.");
  }
  return config;
}

function authOAuthOrThrow() {
  if (!globalThis.SubSyncAuthOAuth) {
    throw new Error("SubSync OAuth 모듈을 불러오지 못했습니다.");
  }
  return globalThis.SubSyncAuthOAuth;
}

function authUserSummary(user) {
  if (!user || typeof user !== "object") return null;
  const metadata = user.user_metadata && typeof user.user_metadata === "object"
    ? user.user_metadata
    : {};
  return {
    id: user.id || "",
    email: user.email || "",
    nickname: metadata.nickname || metadata.full_name || metadata.name || user.email || ""
  };
}

function authSessionProjection(session) {
  if (!session || typeof session !== "object" || !session.access_token) return null;
  return {
    access_token: session.access_token,
    expires_at: Number(session.expires_at) || 0,
    user: authUserSummary(session.user)
  };
}

async function readStoredAuthSession() {
  const stored = await localStorageGet([AUTH_SESSION_KEY, AUTH_TOKEN_KEY, AUTH_USER_KEY]);
  if (stored[AUTH_SESSION_KEY] && stored[AUTH_SESSION_KEY].access_token) {
    return stored[AUTH_SESSION_KEY];
  }
  if (stored[AUTH_TOKEN_KEY]) {
    return {
      access_token: stored[AUTH_TOKEN_KEY],
      refresh_token: "",
      expires_at: 0,
      user: stored[AUTH_USER_KEY] || null
    };
  }
  return null;
}

async function saveStoredAuthSession(rawSession) {
  const session = authOAuthOrThrow().normalizeSession(rawSession);
  await localStorageSet({
    [AUTH_SESSION_KEY]: session,
    [AUTH_TOKEN_KEY]: session.access_token,
    [AUTH_USER_KEY]: authUserSummary(session.user)
  });
  return session;
}

async function clearStoredAuthSession() {
  await localStorageRemove([AUTH_SESSION_KEY, AUTH_TOKEN_KEY, AUTH_USER_KEY, AUTH_VERIFIER_KEY]);
}

async function supabaseAuthRequest(path, options = {}) {
  const config = authConfigOrThrow();
  const headers = {
    apikey: config.supabasePublishableKey,
    "Content-Type": "application/json",
    ...(options.accessToken ? { Authorization: `Bearer ${options.accessToken}` } : {})
  };
  const response = await fetch(`${config.supabaseUrl}/auth/v1/${path}`, {
    method: options.method || "POST",
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined
  });
  const text = await response.text();
  let body = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch (_) {
    body = null;
  }
  if (!response.ok) {
    const message = body && (body.error_description || body.msg || body.error || body.message);
    throw new Error(message || `Supabase Auth 오류 (HTTP ${response.status})`);
  }
  return body;
}

function launchWebAuthFlow(authUrl) {
  return new Promise((resolve, reject) => {
    if (!chrome.identity || typeof chrome.identity.launchWebAuthFlow !== "function") {
      reject(new Error("Chrome identity 권한 또는 OAuth API를 사용할 수 없습니다."));
      return;
    }
    try {
      chrome.identity.launchWebAuthFlow(
        { url: authUrl, interactive: true },
        (responseUrl) => {
          const lastError = chrome.runtime && chrome.runtime.lastError;
          if (lastError) {
            reject(new Error(lastError.message));
            return;
          }
          if (!responseUrl) {
            reject(new Error("Google OAuth callback 주소가 없습니다."));
            return;
          }
          resolve(responseUrl);
        }
      );
    } catch (error) {
      reject(error);
    }
  });
}

async function startGoogleOAuth() {
  const config = authConfigOrThrow();
  const oauth = authOAuthOrThrow();
  if (!chrome.identity || typeof chrome.identity.getRedirectURL !== "function") {
    throw new Error("manifest에 identity 권한을 추가해야 합니다.");
  }

  const redirectTo = chrome.identity.getRedirectURL(config.oauthRedirectPath);
  const verifier = oauth.createCodeVerifier();
  const challenge = await oauth.createCodeChallenge(verifier);
  await localStorageSet({ [AUTH_VERIFIER_KEY]: verifier });

  try {
    const authorizeUrl = oauth.buildGoogleAuthorizeUrl({
      supabaseUrl: config.supabaseUrl,
      redirectTo,
      codeChallenge: challenge
    });
    const callbackUrl = await launchWebAuthFlow(authorizeUrl);
    const { code } = oauth.parseOAuthCallback(callbackUrl, redirectTo);
    const stored = await localStorageGet([AUTH_VERIFIER_KEY]);
    const codeVerifier = stored[AUTH_VERIFIER_KEY] || verifier;
    const response = await supabaseAuthRequest("token?grant_type=pkce", {
      body: { auth_code: code, code_verifier: codeVerifier }
    });
    const session = await saveStoredAuthSession(response);
    return authSessionProjection(session);
  } finally {
    await localStorageRemove([AUTH_VERIFIER_KEY]);
  }
}

async function refreshStoredAuthSession(session) {
  if (!session || !session.refresh_token) return null;
  const response = await supabaseAuthRequest("token?grant_type=refresh_token", {
    body: { refresh_token: session.refresh_token }
  });
  const refreshed = await saveStoredAuthSession(response);
  return authSessionProjection(refreshed);
}

async function getCurrentAuthSession() {
  const stored = await readStoredAuthSession();
  if (!stored) return null;

  if (authOAuthOrThrow().isSessionFresh(stored)) {
    return authSessionProjection(stored);
  }

  try {
    const refreshed = await refreshStoredAuthSession(stored);
    if (refreshed) return refreshed;
  } catch (_) {
    await clearStoredAuthSession();
  }
  return null;
}

async function signOutStoredAuthSession() {
  const stored = await readStoredAuthSession();
  try {
    if (stored && stored.access_token) {
      await supabaseAuthRequest("logout", {
        accessToken: stored.access_token
      });
    }
  } finally {
    await clearStoredAuthSession();
  }
}

if (chrome.runtime && chrome.runtime.onMessage) {
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (!message || !message.type) return false;

    if (message.type === "AUTH_GOOGLE_LOGIN") {
      startGoogleOAuth()
        .then((session) => sendResponse({ ok: true, session }))
        .catch((error) => sendResponse({ ok: false, error: error.message }));
      return true;
    }

    if (message.type === "AUTH_GET_SESSION") {
      getCurrentAuthSession()
        .then((session) => sendResponse({ ok: true, session }))
        .catch((error) => sendResponse({ ok: false, error: error.message }));
      return true;
    }

    if (message.type === "AUTH_LOGOUT") {
      signOutStoredAuthSession()
        .then(() => sendResponse({ ok: true }))
        .catch((error) => sendResponse({ ok: false, error: error.message }));
      return true;
    }

    if (message.type === "GET_CAPTURED_CAPTION") {
      getCapturedCaptionRequest(
        sender && sender.tab && sender.tab.id,
        message.videoId,
        message.languageCode
      )
        .then((data) => sendResponse({ ok: true, data }))
        .catch((error) => sendResponse({ ok: false, error: error.message }));
      return true;
    }

    if (message.type === "FETCH_CAPTION") {
      fetchCaption(
        message.url,
        sender && sender.tab && sender.tab.id,
        message.videoId,
        message.languageCode
      )
        .then((data) => sendResponse({ ok: true, data }))
        .catch((error) => sendResponse({ ok: false, error: error.message }));
      return true;
    }

    return false;
  });
}
