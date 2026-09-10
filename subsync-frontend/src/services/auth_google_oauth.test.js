const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const srcRoot = path.join(__dirname, "..");
const projectRoot = path.join(srcRoot, "..");
const authConfigPath = path.join(srcRoot, "services", "auth_config.js");
const oauthHelperPath = path.join(srcRoot, "services", "auth_oauth.js");
const authServicePath = path.join(srcRoot, "services", "auth_service.js");
const authModalPath = path.join(srcRoot, "components", "auth_modal.js");
const modalCssPath = path.join(projectRoot, "styles", "modal.css");
const iconCssPath = path.join(projectRoot, "styles", "icons.css");
const themeCssPath = path.join(projectRoot, "styles", "theme.css");
const backgroundPath = path.join(srcRoot, "background.js");
const manifestPath = path.join(projectRoot, "manifest.json");

function readIfPresent(filePath) {
  return fs.existsSync(filePath) ? fs.readFileSync(filePath, "utf8") : "";
}

const authConfig = readIfPresent(authConfigPath);
const oauthHelper = readIfPresent(oauthHelperPath);
const authService = readIfPresent(authServicePath);
const authModal = readIfPresent(authModalPath);
const modalCss = readIfPresent(modalCssPath);
const iconCss = readIfPresent(iconCssPath);
const themeCss = readIfPresent(themeCssPath);
const background = readIfPresent(backgroundPath);
const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));

function loadOAuthHelper() {
  const context = {
    URL,
    URLSearchParams,
    Map,
    Set,
    String,
    Number,
    Boolean,
    Object,
    Array,
    Math,
    Date,
    JSON,
    Promise,
    Uint8Array,
    crypto: require("node:crypto").webcrypto,
    TextEncoder,
    btoa(value) {
      return Buffer.from(value, "binary").toString("base64");
    }
  };
  context.globalThis = context;
  vm.createContext(context);
  vm.runInContext(oauthHelper, context, { filename: "auth_oauth.js" });
  return context.SubSyncAuthOAuth;
}

test("manifest enables the Chrome identity flow and Supabase host", () => {
  assert.ok(manifest.permissions.includes("identity"));
  assert.ok(manifest.host_permissions.includes("https://*.supabase.co/*"));
  const scripts = manifest.content_scripts.flatMap((entry) => entry.js || []);
  assert.ok(scripts.includes("src/services/auth_config.js"));
  assert.ok(scripts.indexOf("src/services/auth_config.js") < scripts.indexOf("src/services/api_client.js"));
  assert.ok(scripts.indexOf("src/services/auth_config.js") < scripts.indexOf("src/services/auth_service.js"));
});

test("auth configuration exposes only replaceable public Supabase settings", () => {
  assert.match(authConfig, /supabaseUrl/);
  assert.match(authConfig, /supabasePublishableKey/);
  assert.match(authConfig, /isConfigured/);
  assert.doesNotMatch(authConfig, /service_role|SUPABASE_SERVICE_ROLE|GEMINI_API_KEY/i);
});

test("OAuth helper creates a PKCE Google authorize URL and parses its callback", async () => {
  assert.ok(oauthHelper, "auth_oauth.js must exist");
  const oauth = loadOAuthHelper();
  const verifier = oauth.createCodeVerifier();
  const challenge = await oauth.createCodeChallenge(verifier);
  const redirectTo = "https://abcdefghijklmnop.chromiumapp.org/supabase";
  const authorizeUrl = oauth.buildGoogleAuthorizeUrl({
    supabaseUrl: "https://example.supabase.co",
    redirectTo,
    codeChallenge: challenge
  });
  const parsed = new URL(authorizeUrl);
  assert.equal(parsed.pathname, "/auth/v1/authorize");
  assert.equal(parsed.searchParams.get("provider"), "google");
  assert.equal(parsed.searchParams.get("redirect_to"), redirectTo);
  assert.equal(parsed.searchParams.get("code_challenge_method"), "S256");
  assert.equal(parsed.searchParams.get("code_challenge"), challenge);

  const callback = oauth.parseOAuthCallback(`${redirectTo}?code=oauth-code`, redirectTo);
  assert.equal(callback.code, "oauth-code");
});

test("content auth service delegates Google OAuth to the MV3 service worker", () => {
  assert.match(authService, /AUTH_GOOGLE_LOGIN/);
  assert.match(authService, /AUTH_GET_SESSION/);
  assert.match(authService, /AUTH_LOGOUT/);
  assert.match(authService, /loginWithGoogle/);
  assert.match(authService, /subsync_auth_session/);
  assert.doesNotMatch(authService, /request\("\/auth\/login"/);
  assert.doesNotMatch(authService, /request\("\/auth\/signup"/);
});

test("auth modal exposes a Google login action instead of a local password form", () => {
  assert.match(authModal, /subsync-auth-google-btn/);
  assert.match(authModal, /loginWithGoogle/);
  assert.match(authModal, /SubSync\.icon\("google", "subsync-auth-google-icon"\)/);
  assert.match(authModal, /function googleButtonMarkup\(\)/);
  assert.match(authModal, /renderGoogleButton\(button, "Google 로그인 연결 중\.\.\."\, true\)/);
  assert.match(authModal, /renderGoogleButton\(button, "Google로 계속하기"\, false\)/);
  assert.doesNotMatch(authModal, /button\.textContent = "Google 로그인 연결 중\.\.\."/);
  assert.doesNotMatch(authModal, /subsync-auth-google-label|Google로 계속하기<\/span>/);
  assert.doesNotMatch(authModal, /subsync-auth-email/);
  assert.doesNotMatch(authModal, /subsync-auth-password/);
  assert.doesNotMatch(authModal, /회원가입하기/);
});

test("Google login popup button centers the icon and keeps the dark/white hover states", () => {
  assert.match(modalCss, /\.subsync-auth-google-btn\s*\{[\s\S]*display:\s*inline-flex[\s\S]*align-items:\s*center[\s\S]*justify-content:\s*center[\s\S]*background:\s*#3a3f48/);
  assert.match(modalCss, /\.subsync-auth-google-btn:hover:not\(:disabled\)\s*\{[\s\S]*background:\s*#ffffff[\s\S]*color:\s*#1f2937/);
  assert.match(iconCss, /\.subsync-auth-google-icon\s*\{[\s\S]*width:\s*18px[\s\S]*height:\s*18px[\s\S]*flex:\s*0\s+0\s+18px/);
  assert.match(themeCss, /body\[data-subsync-theme\]\s+\.subsync-auth-modal\s+\.subsync-auth-google-btn\s*\{[\s\S]*background:\s*#3a3f48[\s\S]*color:\s*#ffffff/);
  assert.match(themeCss, /body\[data-subsync-theme\]\s+\.subsync-auth-modal\s+\.subsync-auth-google-btn:hover:not\(:disabled\)\s*\{[\s\S]*background:\s*#ffffff[\s\S]*color:\s*#1f2937/);
});

test("background exchanges the OAuth code, stores the session, and refreshes it", () => {
  assert.match(background, /importScripts\([^)]*auth_config\.js/);
  assert.match(background, /AUTH_GOOGLE_LOGIN/);
  assert.match(background, /AUTH_GET_SESSION/);
  assert.match(background, /AUTH_LOGOUT/);
  assert.match(background, /chrome\.identity\.launchWebAuthFlow/);
  assert.match(background, /grant_type=pkce/);
  assert.match(background, /code_verifier/);
  assert.match(background, /grant_type=refresh_token/);
  assert.match(background, /subsync_auth_session/);
});

const sessionResponseFixture = {
  access_token: "access-token-fixture",
  refresh_token: "refresh-token-fixture",
  expires_in: 3600,
  expires_at: Math.floor(Date.now() / 1000) + 3600,
  token_type: "bearer",
  user: {
    id: "user-fixture",
    email: "user@example.com",
    user_metadata: { full_name: "Fixture User" }
  }
};

function createConfiguredBackgroundHarness() {
  let onMessage;
  const stored = new Map();
  const launchedUrls = [];
  const fetched = [];
  const sessionResponse = sessionResponseFixture;

  function storageResult(keys) {
    const list = Array.isArray(keys) ? keys : [keys];
    return Object.fromEntries(list.map((key) => [key, stored.get(key)]));
  }

  const context = {
    console: { log() {}, warn() {}, error() {} },
    URL,
    URLSearchParams,
    Map,
    Set,
    String,
    Number,
    Boolean,
    Object,
    Array,
    Math,
    Date,
    JSON,
    Promise,
    Uint8Array,
    TextEncoder,
    crypto: require("node:crypto").webcrypto,
    btoa(value) {
      return Buffer.from(value, "binary").toString("base64");
    },
    __SUBSYNC_AUTH_CONFIG__: {
      supabaseUrl: "https://example.supabase.co",
      supabasePublishableKey: "public-key-fixture"
    },
    fetch: async (url, options = {}) => {
      fetched.push({ url, options });
      if (url.includes("grant_type=pkce")) {
        return {
          ok: true,
          status: 200,
          async text() { return JSON.stringify(sessionResponse); }
        };
      }
      if (url.includes("grant_type=refresh_token")) {
        return {
          ok: true,
          status: 200,
          async text() {
            return JSON.stringify({
              ...sessionResponse,
              access_token: "refreshed-access-token",
              expires_at: Math.floor(Date.now() / 1000) + 3600
            });
          }
        };
      }
      return { ok: true, status: 204, async text() { return ""; } };
    }
  };
  context.globalThis = context;
  context.importScripts = (...paths) => {
    for (const file of paths) {
      if (file.endsWith("caption_requests.js")) vm.runInContext(fs.readFileSync(path.join(srcRoot, "core", "caption_requests.js"), "utf8"), context);
      if (file.endsWith("auth_config.js")) vm.runInContext(authConfig, context);
      if (file.endsWith("auth_oauth.js")) vm.runInContext(oauthHelper, context);
    }
  };
  context.chrome = {
    storage: {
      local: {
        get(keys, callback) { callback(storageResult(keys)); },
        set(values, callback) {
          Object.entries(values).forEach(([key, value]) => stored.set(key, value));
          if (callback) callback();
        },
        remove(keys, callback) {
          for (const key of keys) stored.delete(key);
          if (callback) callback();
        }
      },
      session: {
        set() { return Promise.resolve(); },
        async get(keys) { return storageResult(keys); }
      }
    },
    webRequest: { onBeforeRequest: { addListener() {} } },
    tabs: { onRemoved: { addListener() {} }, sendMessage() { return Promise.resolve(); } },
    identity: {
      getRedirectURL(suffix) {
        return `https://fixture-extension.chromiumapp.org/${suffix}`;
      },
      launchWebAuthFlow({ url }, callback) {
        launchedUrls.push(url);
        const redirect = new URL("https://fixture-extension.chromiumapp.org/supabase");
        redirect.searchParams.set("code", "oauth-code-fixture");
        callback(redirect.toString());
      }
    },
    runtime: {
      lastError: null,
      onMessage: {
        addListener(listener) { onMessage = listener; }
      }
    }
  };
  vm.createContext(context);
  vm.runInContext(background, context, { filename: "background.js" });

  return {
    launchedUrls,
    fetched,
    stored,
    request(message) {
      return new Promise((resolve) => onMessage(message, {}, resolve));
    }
  };
}

test("background completes Google OAuth and exposes only a session projection", async () => {
  const harness = createConfiguredBackgroundHarness();
  const response = await harness.request({ type: "AUTH_GOOGLE_LOGIN" });
  assert.equal(response.ok, true);
  assert.equal(response.session.access_token, "access-token-fixture");
  assert.equal(response.session.user.id, "user-fixture");
  assert.equal(response.session.refresh_token, undefined);
  assert.equal(harness.launchedUrls.length, 1);
  const authorize = new URL(harness.launchedUrls[0]);
  assert.equal(authorize.searchParams.get("provider"), "google");
  assert.equal(authorize.searchParams.get("code_challenge_method"), "S256");
  assert.ok(harness.stored.get("subsync_auth_session").refresh_token);
});

test("background refreshes an expired Supabase session before returning it", async () => {
  const harness = createConfiguredBackgroundHarness();
  harness.stored.set("subsync_auth_session", {
    ...sessionResponseFixture,
    expires_at: Math.floor(Date.now() / 1000) - 10
  });
  const response = await harness.request({ type: "AUTH_GET_SESSION" });
  assert.equal(response.ok, true);
  assert.equal(response.session.access_token, "refreshed-access-token");
  assert.ok(harness.fetched.some(({ url }) => url.includes("grant_type=refresh_token")));
});

test("background revokes the remote session and clears local auth state", async () => {
  const harness = createConfiguredBackgroundHarness();
  harness.stored.set("subsync_auth_session", sessionResponseFixture);
  harness.stored.set("subsync_token", sessionResponseFixture.access_token);
  harness.stored.set("subsync_user", { id: sessionResponseFixture.user.id });
  const response = await harness.request({ type: "AUTH_LOGOUT" });
  assert.equal(response.ok, true);
  assert.equal(harness.stored.has("subsync_auth_session"), false);
  assert.equal(harness.stored.has("subsync_token"), false);
  assert.ok(harness.fetched.some(({ url }) => url.endsWith("/auth/v1/logout")));
});
