// API Client 공통 fetch 래퍼
(function () {
  const SubSync = (window.__SubSync = window.__SubSync || {});

  const BASE_URL = "https://subsync-backend-4bmh.onrender.com/api/v1";

  SubSync.apiClient = {
    async request(endpoint, options = {}) {
      const token = await SubSync.authService.getToken();
      const headers = {
        "Content-Type": "application/json",
        ...(options.headers || {})
      };

      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      try {
        const response = await fetch(`${BASE_URL}${endpoint}`, {
          ...options,
          headers
        });

        if (!response.ok) {
          const errBody = await response.json().catch(() => ({}));
          throw new Error(errBody.detail || `HTTP ${response.status}`);
        }

        return await response.json();
      } catch (err) {
        console.error(`[SubSync API Error] ${endpoint}:`, err);
        throw err;
      }
    }
  };
})();
