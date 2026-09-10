// 탭 기반 다중 화면 레이아웃 컨테이너 및 빠른 설정 바
(function () {
  const SubSync = (window.__SubSync = window.__SubSync || {});

  let rootEl = null;
  let quickBarEl = null;
  let currentScreen = "video"; // "video" | "script" | "tutor" | "storage" | "settings"
  let panelCloseTimer = null;
  let positionResetTimer = null;
  let navIndicatorInitialized = false;

  const PANEL_GAP = 10;
  const VIEWPORT_MARGIN = 12;
  const PANEL_TRANSITION_MS = 360;
  const POSITION_RESET_MS = 420;
  const SCREEN_ORDER = Object.freeze(["video", "tutor", "storage", "settings"]);

  function getScreenDirection(nextScreen) {
    const currentIndex = SCREEN_ORDER.indexOf(currentScreen);
    const nextIndex = SCREEN_ORDER.indexOf(nextScreen);
    if (currentIndex < 0 || nextIndex < 0) return "forward";
    return nextIndex >= currentIndex ? "forward" : "backward";
  }

  function updateNavIndicator() {
    if (!rootEl) return;
    const navTabs = rootEl.querySelector(".subsync-nav-tabs");
    const activeButton = navTabs?.querySelector(".subsync-nav-btn.active");
    const indicator = navTabs?.querySelector(".subsync-nav-active-indicator");
    if (!navTabs || !activeButton || !indicator) return;

    const navRect = navTabs.getBoundingClientRect();
    const activeRect = activeButton.getBoundingClientRect();
    const offsetLeft = Math.round(activeRect.left - navRect.left);
    const width = Math.round(activeRect.width);

    if (!navIndicatorInitialized) {
      indicator.classList.add("subsync-nav-active-indicator-initial");
    }
    indicator.style.width = `${width}px`;
    indicator.style.transform = `translate3d(${offsetLeft}px, 0, 0)`;

    if (!navIndicatorInitialized) {
      const releaseInitial = () => {
        indicator.classList.remove("subsync-nav-active-indicator-initial");
      };
      if (typeof window.requestAnimationFrame === "function") {
        window.requestAnimationFrame(releaseInitial);
      } else {
        setTimeout(releaseInitial, 0);
      }
      navIndicatorInitialized = true;
    }
  }

  function viewportSize() {
    return {
      width: Number(window.innerWidth) || document.documentElement?.clientWidth || 0,
      height: Number(window.innerHeight) || document.documentElement?.clientHeight || 0
    };
  }

  function clearInlineStyle(element, property) {
    if (!element || !element.style) return;
    if (typeof element.style.removeProperty === "function") {
      element.style.removeProperty(property);
    } else {
      element.style[property] = "";
    }
  }

  function updatePanelToggleState(isOpen) {
    const toggleButton = document.getElementById("subsync-qb-open-btn");
    if (toggleButton && toggleButton.setAttribute) {
      toggleButton.setAttribute("aria-expanded", String(isOpen));
    }
  }

  function positionMainPanelBelowQuickBar() {
    if (!rootEl || !quickBarEl) return;

    const quickBarRect = quickBarEl.getBoundingClientRect();
    const panelRect = rootEl.getBoundingClientRect();
    const viewport = viewportSize();
    const panelWidth = rootEl.offsetWidth || panelRect.width || 420;
    const panelHeight = rootEl.offsetHeight || panelRect.height || 520;
    const quickBarRight = quickBarRect.right ?? quickBarRect.left + quickBarRect.width;
    const quickBarBottom = quickBarRect.bottom ?? quickBarRect.top + quickBarRect.height;
    const maxLeft = Math.max(VIEWPORT_MARGIN, viewport.width - panelWidth - VIEWPORT_MARGIN);
    const maxTop = Math.max(VIEWPORT_MARGIN, viewport.height - panelHeight - VIEWPORT_MARGIN);

    const left = Math.min(
      Math.max(quickBarRight - panelWidth, VIEWPORT_MARGIN),
      maxLeft
    );
    const top = Math.min(
      Math.max(quickBarBottom + PANEL_GAP, VIEWPORT_MARGIN),
      maxTop
    );

    rootEl.style.left = `${Math.round(left)}px`;
    rootEl.style.top = `${Math.round(top)}px`;
    rootEl.style.right = "auto";
    rootEl.style.bottom = "auto";
    clearInlineStyle(rootEl, "transform");
  }

  function resetMainPanelPosition() {
    if (!rootEl) return;
    if (positionResetTimer) clearTimeout(positionResetTimer);

    rootEl.classList.remove("subsync-dragging", "subsync-resizing");
    rootEl.classList.add("subsync-position-resetting");
    void rootEl.offsetWidth;
    positionMainPanelBelowQuickBar();

    positionResetTimer = setTimeout(() => {
      rootEl?.classList.remove("subsync-position-resetting");
      positionResetTimer = null;
    }, POSITION_RESET_MS);
  }

  function cancelMainPanelPositionReset() {
    if (positionResetTimer) {
      clearTimeout(positionResetTimer);
      positionResetTimer = null;
    }
    rootEl?.classList.remove("subsync-position-resetting");
  }

  function openMainPanel() {
    if (!rootEl) return;
    cancelMainPanelPositionReset();
    if (panelCloseTimer) {
      clearTimeout(panelCloseTimer);
      panelCloseTimer = null;
    }

    const wasClosed = rootEl.classList.contains("subsync-panel-closed") || rootEl.style.display === "none";
    rootEl.style.display = "flex";
    positionMainPanelBelowQuickBar();

    if (wasClosed) {
      // 닫힌 상태의 스타일을 먼저 렌더링한 뒤 제거해야 열림 transition이 발생한다.
      void rootEl.offsetWidth;
      rootEl.classList.remove("subsync-panel-closed");
    }
    rootEl.classList.add("subsync-panel-open");
    updatePanelToggleState(true);
  }

  function closeMainPanel() {
    if (!rootEl) return;
    cancelMainPanelPositionReset();
    if (panelCloseTimer) clearTimeout(panelCloseTimer);

    clearInlineStyle(rootEl, "transform");
    rootEl.classList.remove("subsync-panel-open");
    rootEl.classList.add("subsync-panel-closed");
    updatePanelToggleState(false);
    panelCloseTimer = setTimeout(() => {
      if (rootEl && rootEl.classList.contains("subsync-panel-closed")) {
        rootEl.style.display = "none";
      }
      panelCloseTimer = null;
    }, PANEL_TRANSITION_MS);
  }

  SubSync.layout = {
    async ensureRoot() {
      if (rootEl) return rootEl;

      // 1. 빠른 설정 플로팅 바 (SubSync 상태, Script, 패널 열기)
      quickBarEl = document.createElement("div");
      quickBarEl.id = "subsync-quick-bar";
      quickBarEl.className = "subsync-quick-bar";
      quickBarEl.innerHTML = `
        <span class="subsync-qb-drag-handle" title="퀵바 드래그" aria-label="퀵바 이동">⠿</span>
        <button id="subsync-toggle-main-btn" class="subsync-qb-toggle">SubSync <span class="subsync-dot on">● ON</span></button>
        <button id="subsync-qb-script-btn" class="subsync-qb-script" title="전체 스크립트 열기">${SubSync.icon("script", "subsync-qb-icon")}<span>스크립트</span></button>
        <button id="subsync-qb-open-btn" class="subsync-qb-panel-toggle" title="학습 패널 열기" aria-controls="subsync-root" aria-expanded="true">${SubSync.icon("collapse", "subsync-qb-expand-icon")}</button>
      `;
      document.body.appendChild(quickBarEl);

      if (SubSync.drag && SubSync.drag.attach) {
        SubSync.drag.attach(quickBarEl, quickBarEl.querySelector(".subsync-qb-drag-handle"));
      }

      // 2. 메인 화면 프레임
      rootEl = document.createElement("div");
      rootEl.id = "subsync-root";
      rootEl.className = "subsync-container subsync-panel-open";

      rootEl.innerHTML = `
        <div class="subsync-panel-header">
          <div class="subsync-brand-area">
            <span class="subsync-brand">SubSync</span>
          </div>
          <div class="subsync-header-controls">
            <button id="subsync-refresh-btn" class="subsync-btn-small subsync-header-refresh-btn" title="SubSync 새로고침" aria-label="SubSync 새로고침">${SubSync.icon("refresh", "subsync-refresh-icon")}</button>
            <button id="subsync-auth-btn" class="subsync-btn-small" type="button" title="로그인" aria-label="로그인">로그인</button>
            <button id="subsync-close-btn" class="subsync-btn-close">×</button>
          </div>
        </div>

        <div class="subsync-nav-tabs">
          <span class="subsync-nav-active-indicator" aria-hidden="true"></span>
          <button class="subsync-nav-btn active" data-screen="video">${SubSync.icon("video-learning", "subsync-nav-icon")}<span>영상학습</span></button>
          <button class="subsync-nav-btn" data-screen="tutor">${SubSync.icon("ai-tutor", "subsync-nav-icon")}<span>AI 튜터</span></button>
          <button class="subsync-nav-btn" data-screen="storage">${SubSync.icon("vocabulary", "subsync-nav-icon")}<span>저장소</span></button>
          <button class="subsync-nav-btn" data-screen="settings">${SubSync.icon("settings", "subsync-nav-icon")}<span>설정</span></button>
        </div>

        <div class="subsync-body">
          <div id="subsync-screen-video" class="subsync-screen-panel active">
            <div id="subsync-subtitle-area" class="subsync-subtitle-box"></div>
            <div id="subsync-inline-script-area" class="subsync-inline-script-area"></div>
          </div>
          <div id="subsync-screen-tutor" class="subsync-screen-panel" style="display: none;">
            <div id="subsync-tutor-area"></div>
          </div>
          <div id="subsync-screen-storage" class="subsync-screen-panel" style="display: none;">
            <div id="subsync-storage-area"></div>
          </div>
          <div id="subsync-screen-settings" class="subsync-screen-panel" style="display: none;">
            <div id="subsync-settings-area"></div>
          </div>
        </div>
      `;

      document.body.appendChild(rootEl);

      positionMainPanelBelowQuickBar();
      updatePanelToggleState(true);
      updateNavIndicator();
      window.addEventListener("resize", updateNavIndicator);

      if (SubSync.drag && SubSync.drag.attach) {
        SubSync.drag.attach(rootEl, rootEl.querySelector(".subsync-panel-header"));
      }
      if (SubSync.resize && SubSync.resize.attach) {
        SubSync.resize.attach(rootEl);
      }

      // 이벤트 바인딩
      this.bindEvents();
      await this.updateAuthUI();
      // 인증 복원 중 저장소 탭으로 전환된 경우에도 최신 상태를 반영한다.
      await this.renderCurrentScreen();

      return rootEl;
    },

    bindEvents() {
      // 닫기 / 열기
      const refreshButton = document.getElementById("subsync-refresh-btn");
      refreshButton?.addEventListener("click", async () => {
        if (refreshButton.disabled) return;
        refreshButton.disabled = true;
        refreshButton.classList.add("subsync-refreshing");
        try {
          if (SubSync.refresh) await SubSync.refresh();
        } finally {
          refreshButton.disabled = false;
          refreshButton.classList.remove("subsync-refreshing");
        }
      });

      document.getElementById("subsync-close-btn").addEventListener("click", () => {
        closeMainPanel();
      });
      rootEl.querySelector(".subsync-panel-header")?.addEventListener("dblclick", (event) => {
        if (event.target?.closest?.("button, a, input, textarea, select")) return;
        event.preventDefault();
        resetMainPanelPosition();
      });
      rootEl.querySelector(".subsync-panel-header")?.addEventListener("pointerdown", () => {
        cancelMainPanelPositionReset();
      });
      document.getElementById("subsync-qb-open-btn").addEventListener("click", () => {
        if (rootEl.classList.contains("subsync-panel-closed") || rootEl.style.display === "none") {
          openMainPanel();
        } else {
          closeMainPanel();
        }
      });

      // Script 토글 (퀵바)
      document.getElementById("subsync-qb-script-btn").addEventListener("click", () => {
        if (SubSync.scriptPanel && SubSync.scriptPanel.toggle) {
          SubSync.scriptPanel.toggle();
        }
      });

      // 전체 SubSync 토글
      document.getElementById("subsync-toggle-main-btn").addEventListener("click", async () => {
        const current = SubSync.settings.get("subsyncEnabled");
        await SubSync.settings.set("subsyncEnabled", !current);
        this.updateEnabledUI(!current);
      });

      // 네비게이션 탭 전환
      rootEl.querySelectorAll(".subsync-nav-btn").forEach((btn) => {
        btn.addEventListener("click", () => {
          const targetScreen = btn.dataset.screen;
          this.switchScreen(targetScreen);
        });
      });

      // 로그인/로그아웃 버튼
      document.getElementById("subsync-auth-btn").addEventListener("click", async () => {
        const authButton = document.getElementById("subsync-auth-btn");
        if (authButton?.dataset.authReady !== "true") {
          await this.updateAuthUI();
        }
        const isAuthed = authButton?.dataset.authenticated === "true";
        if (isAuthed) {
          await SubSync.authService.logout();
          await this.updateAuthUI();
          await this.renderCurrentScreen();
          alert("로그아웃 되었습니다.");
        } else {
          SubSync.authModal.show(async () => {
            await this.updateAuthUI();
            await this.renderCurrentScreen();
          });
        }
      });
    },

    async renderCurrentScreen() {
      if (currentScreen === "storage") {
        return SubSync.historyView.render(document.getElementById("subsync-storage-area"));
      }
      if (currentScreen === "settings") {
        return SubSync.settingsView.render(document.getElementById("subsync-settings-area"));
      }
      return undefined;
    },

    switchScreen(screenName) {
      if (!rootEl || !screenName) return;

      if (screenName !== currentScreen) {
        const direction = getScreenDirection(screenName);
        const directionClass =
          direction === "forward"
            ? "subsync-screen-direction-forward"
            : "subsync-screen-direction-backward";
        currentScreen = screenName;
        rootEl.querySelectorAll(".subsync-nav-btn").forEach((b) => {
          b.classList.toggle("active", b.dataset.screen === screenName);
        });

        rootEl.querySelectorAll(".subsync-screen-panel").forEach((panel) => {
          panel.classList.remove(
            "subsync-screen-entering",
            "subsync-screen-direction-forward",
            "subsync-screen-direction-backward"
          );
          panel.style.display = "none";
        });

        const activePanel = document.getElementById(`subsync-screen-${screenName}`);
        if (activePanel) {
          activePanel.style.display = "flex";
          void activePanel.offsetWidth;
          activePanel.classList.add("subsync-screen-entering", directionClass);
        }
      }

      updateNavIndicator();
      this.renderCurrentScreen();
    },

    async updateAuthUI() {
      const isAuthed = await SubSync.authService.isAuthenticated();
      const authBtn = document.getElementById("subsync-auth-btn");
      if (!authBtn) return;
      authBtn.dataset.authenticated = isAuthed ? "true" : "false";
      authBtn.dataset.authReady = "true";

      if (isAuthed) {
        authBtn.textContent = "로그아웃";
        authBtn.title = "로그아웃";
        authBtn.setAttribute("aria-label", "로그아웃");
      } else {
        authBtn.textContent = "로그인";
        authBtn.title = "로그인";
        authBtn.setAttribute("aria-label", "로그인");
      }
    },

    updateEnabledUI(enabled) {
      const dot = document.querySelector(".subsync-dot");
      if (dot) {
        dot.textContent = enabled ? "● ON" : "○ OFF";
        dot.className = `subsync-dot ${enabled ? "on" : "off"}`;
        void dot.offsetWidth;
        dot.classList.add("subsync-state-pulse");
      }
      if (!enabled) {
        const subArea = document.getElementById("subsync-subtitle-area");
        if (subArea) subArea.classList.add("subsync-subtitle-disabled");
      } else {
        const subArea = document.getElementById("subsync-subtitle-area");
        if (subArea) {
          subArea.classList.remove("subsync-subtitle-disabled");
          subArea.style.display = "block";
        }
      }
    },

    getSubtitleArea() { return document.getElementById("subsync-subtitle-area"); },
    getTutorArea() { return document.getElementById("subsync-tutor-area"); },
    getScriptArea() { return document.getElementById("subsync-inline-script-area"); },
    openMainPanel,
    closeMainPanel,
    repositionMainPanel: positionMainPanelBelowQuickBar,
    resetMainPanelPosition
  };
})();
