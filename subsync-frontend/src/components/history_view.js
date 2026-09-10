// 저장소 화면 (단어, 시청기록)
(function () {
  const SubSync = (window.__SubSync = window.__SubSync || {});

  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, (character) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    })[character]);
  }

  function formatDate(value) {
    if (!value) return "최근";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return escapeHtml(value);
    return date.toLocaleString("ko-KR", { dateStyle: "medium", timeStyle: "short" });
  }

  function formatDuration(seconds) {
    const total = Math.max(0, Math.round(Number(seconds) || 0));
    const minutes = Math.floor(total / 60);
    const remainder = String(total % 60).padStart(2, "0");
    return `${minutes}:${remainder}`;
  }

  let activeContainerEl = null;
  let historyRenderGeneration = 0;

  function isCurrentHistoryRender(containerEl, generation) {
    return activeContainerEl === containerEl && historyRenderGeneration === generation;
  }

  function historyService() {
    return SubSync.learningHistory;
  }

  function normalizeVideoId(value) {
    const videoId = String(value || "").trim();
    return /^[A-Za-z0-9_-]{6,20}$/.test(videoId) ? videoId : "";
  }

  function videoUrl(videoId) {
    return `https://www.youtube.com/watch?v=${encodeURIComponent(videoId)}`;
  }

  function thumbnailUrl(videoId) {
    return `https://i.ytimg.com/vi/${encodeURIComponent(videoId)}/hqdefault.jpg`;
  }

  function currentPageTitle(videoId) {
    if (typeof document === "undefined" || !SubSync.getVideoId || SubSync.getVideoId() !== videoId) return "";
    return String(document.title || "")
      .replace(/\s*-\s*YouTube\s*$/i, "")
      .trim();
  }

  SubSync.historyView = {
    async render(containerEl) {
      if (!containerEl) return;
      activeContainerEl = containerEl;
      const generation = ++historyRenderGeneration;
      const isCurrentRender = () => isCurrentHistoryRender(containerEl, generation);

      const isAuthed = await SubSync.authService.isAuthenticated();
      if (!isCurrentRender()) return;
      if (!isAuthed) {
        containerEl.innerHTML = `
          <div class="subsync-view-empty">
            <p>저장소를 확인하려면 로그인이 필요합니다.</p>
            <button id="subsync-history-login-btn" class="subsync-btn-primary">로그인 / 회원가입</button>
          </div>
        `;
        document.getElementById("subsync-history-login-btn")?.addEventListener("click", () => {
          SubSync.authModal.show(() => this.render(containerEl));
        });
        return;
      }

      containerEl.innerHTML = `
        <div class="subsync-history-tabs" role="tablist" aria-label="저장소 분류">
          <button class="subsync-htab active" data-tab="words" role="tab" aria-selected="true">단어</button>
          <button class="subsync-htab" data-tab="video" role="tab" aria-selected="false">시청기록</button>
        </div>
        <div class="subsync-history-content" id="subsync-history-tab-body"></div>
      `;

      const tabBody = containerEl.querySelector("#subsync-history-tab-body");
      if (tabBody?.dataset) tabBody.dataset.subsyncHistoryTab = "words";
      await this.renderWords(tabBody, isCurrentRender);
      if (!isCurrentRender()) return;

      containerEl.querySelectorAll(".subsync-htab").forEach((tabBtn) => {
        tabBtn.addEventListener("click", () => {
          const tab = tabBtn.dataset.tab;
          const tabGeneration = ++historyRenderGeneration;
          const isCurrentTab = () => isCurrentHistoryRender(containerEl, tabGeneration);

          containerEl.querySelectorAll(".subsync-htab").forEach((button) => {
            const isActive = button === tabBtn;
            button.classList.toggle("active", isActive);
            button.setAttribute("aria-selected", String(isActive));
          });
          if (tabBody?.dataset) tabBody.dataset.subsyncHistoryTab = tab;
          void (tab === "words"
            ? this.renderWords(tabBody, isCurrentTab)
            : this.renderVideoHistory(tabBody, isCurrentTab));
        });
      });
    },

    async renderWords(containerEl, isCurrent = () => true) {
      if (!containerEl || !isCurrent()) return;
      if (SubSync.savedWordsView?.render) {
        await SubSync.savedWordsView.render(containerEl, { isCurrent });
        return;
      }
      if (!isCurrent()) return;
      containerEl.innerHTML = `<div class="subsync-view-empty">저장된 단어 화면을 불러올 수 없습니다.</div>`;
    },


    async renderVideoHistory(containerEl, isCurrent = () => true) {
      if (!containerEl || !isCurrent()) return;
      containerEl.innerHTML = `<div class="subsync-view-loading">시청 기록을 불러오는 중...</div>`;

      const items = historyService() ? await historyService().getVideoHistory() : [];
      if (!isCurrent()) return;
      if (!items.length) {
        containerEl.innerHTML = `<div class="subsync-view-empty">아직 시청 기록이 없습니다. 영상을 재생해보세요.</div>`;
        return;
      }

      containerEl.innerHTML = `
        <div class="subsync-history-local-note">영상 재생 중 누적된 이 브라우저의 시청 기록</div>
        <div class="subsync-history-list">
          ${items.map((item) => {
            const videoId = normalizeVideoId(item.video_id);
            const title = item.title || currentPageTitle(videoId) || (videoId ? `영상 ${videoId}` : "제목을 불러올 수 없는 영상");
            const href = videoId ? videoUrl(videoId) : "#";
            const thumbnail = videoId ? thumbnailUrl(videoId) : "";
            const thumbnailHtml = thumbnail
              ? `<a class="subsync-history-video-thumb" href="${href}" target="_blank" rel="noopener noreferrer" aria-label="${escapeHtml(title)} 영상 열기"><img src="${thumbnail}" alt="${escapeHtml(title)} 썸네일" loading="lazy" /></a>`
              : `<div class="subsync-history-video-thumb subsync-history-video-thumb-empty" aria-hidden="true"></div>`;
            const titleHtml = videoId
              ? `<a class="subsync-history-video-title" href="${href}" target="_blank" rel="noopener noreferrer">${escapeHtml(title)}</a>`
              : `<span class="subsync-history-video-title">${escapeHtml(title)}</span>`;
            return `
              <div class="subsync-history-item subsync-history-video-item">
                ${thumbnailHtml}
                <div class="subsync-history-video-info">
                  ${titleHtml}
                  <div class="subsync-h-meaning">누적 시청: ${formatDuration(item.watched_seconds)}</div>
                  <div class="subsync-h-date">마지막 시청 ${formatDate(item.last_watched_at)}</div>
                </div>
              </div>
            `;
          }).join("")}
        </div>
      `;
    }
  };
})();
