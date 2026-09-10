// Supabase Auth 공개 설정
// Supabase Auth 공개 설정. anon/publishable key만 포함한다.
(function () {
  const root = globalThis;
  const SubSync = (root.__SubSync = root.__SubSync || {});

  const configured = root.__SUBSYNC_AUTH_CONFIG__ && typeof root.__SUBSYNC_AUTH_CONFIG__ === "object"
    ? root.__SUBSYNC_AUTH_CONFIG__
    : {};
  const supabaseUrl = String(configured.supabaseUrl || "https://xlzfuotapkdvyuqdmmxz.supabase.co");
  const supabasePublishableKey = String(
    //configured.supabasePublishableKey  "YOUR_SUPABASE_PUBLISHABLE_KEY"
    configured.supabasePublishableKey || "sb_publishable_W4i2uMJjUPHtzVYezWA8iw_Chu4xrzT");
  // const supabasePublishableKey = String(
  //   configured.supabasePublishableKey || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhsemZ1b3RhcGtkdnl1cWRtbXh6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg3NTk0MTAsImV4cCI6MjEwNDMzNTQxMH0.oYnEUIwLkx1GQKQuWWFBlSO8-zPU-UDOYpsWR6ZSoas"
  // );

  function isConfigured() {
    return (
      /^https:\/\/[^/]+$/i.test(supabaseUrl) &&
      !supabaseUrl.includes("YOUR_PROJECT_REF") &&
      Boolean(supabasePublishableKey) &&
      !supabasePublishableKey.includes("YOUR_SUPABASE_PUBLISHABLE_KEY")
    );
  }

  SubSync.authConfig = {
    supabaseUrl,
    supabasePublishableKey,
    oauthRedirectPath: "supabase",
    isConfigured,
    getConfigurationError() {
      return "Supabase URL과 publishable key를 src/services/auth_config.js에 설정해주세요.";
    }
  };

  root.SubSyncAuthConfig = SubSync.authConfig;
})();
