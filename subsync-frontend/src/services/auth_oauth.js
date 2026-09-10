// Supabase Google OAuth PKCE 유틸리티
(function () {
  const root = globalThis;

  function bytesToBase64Url(bytes) {
    let binary = "";
    for (const byte of bytes) binary += String.fromCharCode(byte);
    return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
  }

  function createCodeVerifier() {
    const bytes = new Uint8Array(32);
    crypto.getRandomValues(bytes);
    return bytesToBase64Url(bytes);
  }

  async function createCodeChallenge(verifier) {
    const encoded = new TextEncoder().encode(String(verifier || ""));
    const digest = await crypto.subtle.digest("SHA-256", encoded);
    return bytesToBase64Url(new Uint8Array(digest));
  }

  function normalizeSupabaseUrl(value) {
    return String(value || "").trim().replace(/\/+$/, "");
  }

  function buildGoogleAuthorizeUrl({ supabaseUrl, redirectTo, codeChallenge }) {
    const url = new URL(`${normalizeSupabaseUrl(supabaseUrl)}/auth/v1/authorize`);
    url.searchParams.set("provider", "google");
    url.searchParams.set("redirect_to", String(redirectTo || ""));
    url.searchParams.set("code_challenge", String(codeChallenge || ""));
    url.searchParams.set("code_challenge_method", "S256");
    return url.toString();
  }

  function parseOAuthCallback(rawUrl, expectedRedirectTo) {
    const callback = new URL(String(rawUrl || ""));
    const expected = new URL(String(expectedRedirectTo || ""));
    if (callback.origin !== expected.origin || callback.pathname !== expected.pathname) {
      throw new Error("OAuth callback 주소가 확장 프로그램 redirect 주소와 다릅니다.");
    }

    const hashParams = new URLSearchParams(String(callback.hash || "").replace(/^#/, ""));
    const error = callback.searchParams.get("error") || hashParams.get("error");
    if (error) {
      const description = callback.searchParams.get("error_description") ||
        hashParams.get("error_description") ||
        error;
      throw new Error(decodeURIComponent(description.replace(/\+/g, " ")));
    }

    const code = callback.searchParams.get("code");
    if (!code) throw new Error("Google OAuth 인증 코드가 반환되지 않았습니다.");
    return { code };
  }

  function normalizeSession(response) {
    const source = response && typeof response === "object" ? response : {};
    const accessToken = String(source.access_token || "");
    const refreshToken = String(source.refresh_token || "");
    const user = source.user && typeof source.user === "object" ? source.user : null;
    if (!accessToken || !refreshToken || !user || !user.id) {
      throw new Error("Supabase가 유효한 로그인 세션을 반환하지 않았습니다.");
    }

    const expiresIn = Number(source.expires_in);
    const expiresAt = Number(source.expires_at) ||
      (Number.isFinite(expiresIn) ? Math.floor(Date.now() / 1000) + expiresIn : 0);
    return {
      access_token: accessToken,
      refresh_token: refreshToken,
      expires_in: Number.isFinite(expiresIn) ? expiresIn : 0,
      expires_at: expiresAt,
      token_type: String(source.token_type || "bearer"),
      user
    };
  }

  function isSessionFresh(session, marginSeconds = 60) {
    const expiresAt = Number(session && session.expires_at);
    return !expiresAt || expiresAt > Math.floor(Date.now() / 1000) + Number(marginSeconds || 0);
  }

  root.SubSyncAuthOAuth = {
    bytesToBase64Url,
    createCodeVerifier,
    createCodeChallenge,
    buildGoogleAuthorizeUrl,
    parseOAuthCallback,
    normalizeSession,
    isSessionFresh
  };
})();
