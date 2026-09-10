// 메인 패널 하단 인라인 Script (타임스탬프 점프, 단어 인터랙션, 스크롤 & 시간 하이라이트)
(function () {
  const SubSync = (window.__SubSync = window.__SubSync || {});

  let containerEl = null;
  let listEl = null;
  let currentSubtitles = [];
  let isOpen = false;
  let isCollapsed = true;
  let scriptCloseTimer = null;
  let searchCloseTimer = null;

  const SCRIPT_TRANSITION_MS = 260;
  const SEARCH_TRANSITION_MS = 220;
  const SCRIPT_TRACKING_TOP_GAP = 16;
  const SCRIPT_TRACKING_THRESHOLD = 8;

  SubSync.scriptPanel = {
    ensureContainer() {
      if (containerEl) return containerEl;

      containerEl = document.createElement("div");
      containerEl.id = "subsync-script-panel";
      containerEl.className =
        "subsync-script-panel-container subsync-inline-script-panel subsync-script-panel-open subsync-script-panel-collapsed";
      containerEl.style.display = "flex";
      isOpen = true;

      containerEl.innerHTML = `
        <div class="subsync-script-panel-header">
          <div class="subsync-script-header-title">
            <span class="subsync-script-icon">${SubSync.icon("script", "subsync-script-header-icon")}</span>
            <span class="subsync-script-title-text">Script</span>
          </div>
          <button id="subsync-script-collapse-btn" class="subsync-script-collapse-btn subsync-script-collapse-collapsed" type="button" title="전체 스크립트 펼치기" aria-label="전체 스크립트 펼치기" aria-expanded="false" aria-controls="subsync-script-list">${SubSync.icon("collapse", "subsync-script-collapse-icon")}</button>
          <div class="subsync-script-header-actions">
            <button id="subsync-script-search-toggle" class="subsync-script-tool-btn" type="button" title="검색" aria-label="스크립트 검색">${SubSync.icon("search", "subsync-script-search-icon")}</button>
            <button id="subsync-script-close-btn" class="subsync-script-close-btn" title="닫기" aria-label="전체 스크립트 닫기">×</button>
          </div>
        </div>
        <div id="subsync-script-search-bar" class="subsync-script-search-bar" style="display: none;">
          <input type="text" id="subsync-script-search-input" placeholder="스크립트 내 단어/문장 검색..." />
        </div>
        <div id="subsync-script-list" class="subsync-script-list">
          <div class="subsync-view-empty">자막 스크립트를 불러오는 중입니다...</div>
        </div>
      `;

      const mountEl =
        SubSync.layout && SubSync.layout.getScriptArea
          ? SubSync.layout.getScriptArea()
          : document.body;
      if (mountEl) mountEl.appendChild(containerEl);

      listEl = containerEl.querySelector("#subsync-script-list");

      const collapseBtn = containerEl.querySelector("#subsync-script-collapse-btn");
      collapseBtn.addEventListener("click", () => {
        this.setCollapsed(!isCollapsed);
      });

      // 닫기 버튼
      containerEl.querySelector("#subsync-script-close-btn").addEventListener("click", () => {
        this.close();
      });

      // 검색 토글 & 필터링
      const searchToggleBtn = containerEl.querySelector("#subsync-script-search-toggle");
      const searchBar = containerEl.querySelector("#subsync-script-search-bar");
      const searchInput = containerEl.querySelector("#subsync-script-search-input");

      searchToggleBtn.addEventListener("click", () => {
        if (searchCloseTimer) {
          clearTimeout(searchCloseTimer);
          searchCloseTimer = null;
        }

        const isShown =
          searchBar.classList.contains("subsync-search-open") ||
          searchBar.style.display !== "none";
        if (isShown) {
          searchBar.classList.remove("subsync-search-open");
          searchBar.classList.add("subsync-search-closing");
          searchCloseTimer = setTimeout(() => {
            if (!searchBar.classList.contains("subsync-search-open")) {
              searchBar.style.display = "none";
              searchBar.classList.remove("subsync-search-closing");
            }
            searchCloseTimer = null;
          }, SEARCH_TRANSITION_MS);
          return;
        }

        searchBar.style.display = "block";
        searchBar.classList.remove("subsync-search-closing");
        void searchBar.offsetWidth;
        searchBar.classList.add("subsync-search-open");
        searchInput.focus();
      });

      searchInput.addEventListener("input", (e) => {
        const query = e.target.value.toLowerCase().trim();
        this.filter(query);
      });

      return containerEl;
    },

    open() {
      this.ensureContainer();
      if (SubSync.layout && SubSync.layout.switchScreen) {
        SubSync.layout.switchScreen("video");
      }

      if (scriptCloseTimer) {
        clearTimeout(scriptCloseTimer);
        scriptCloseTimer = null;
      }

      const wasClosed =
        containerEl.classList.contains("subsync-script-panel-closed") ||
        containerEl.style.display === "none";
      containerEl.style.display = "flex";
      if (wasClosed) {
        void containerEl.offsetWidth;
        containerEl.classList.remove("subsync-script-panel-closed", "subsync-script-panel-closing");
      }
      containerEl.classList.add("subsync-script-panel-open");
      isOpen = true;
    },

    close() {
      if (!containerEl) return;
      if (scriptCloseTimer) clearTimeout(scriptCloseTimer);

      containerEl.classList.remove("subsync-script-panel-open");
      containerEl.classList.add("subsync-script-panel-closing");
      isOpen = false;
      scriptCloseTimer = setTimeout(() => {
        if (!isOpen) {
          containerEl.style.display = "none";
          containerEl.classList.remove("subsync-script-panel-closing");
          containerEl.classList.add("subsync-script-panel-closed");
        }
        scriptCloseTimer = null;
      }, SCRIPT_TRANSITION_MS);
    },

    toggle() {
      if (isOpen) {
        this.close();
      } else {
        this.open();
      }
    },

    setCollapsed(collapsed) {
      this.ensureContainer();
      isCollapsed = Boolean(collapsed);
      containerEl.classList.toggle("subsync-script-panel-collapsed", isCollapsed);

      const collapseBtn = containerEl.querySelector("#subsync-script-collapse-btn");
      if (collapseBtn) {
        collapseBtn.classList.toggle("subsync-script-collapse-collapsed", isCollapsed);
        collapseBtn.title = isCollapsed ? "전체 스크립트 펼치기" : "전체 스크립트 접기";
        collapseBtn.setAttribute("aria-label", collapseBtn.title);
        collapseBtn.setAttribute("aria-expanded", String(!isCollapsed));
      }
    },

    toggleCollapsed() {
      this.setCollapsed(!isCollapsed);
    },

    setSubtitles(subtitles) {
      currentSubtitles = subtitles || [];
      this.ensureContainer();
      this.renderList(currentSubtitles);
    },

    renderList(subtitles) {
      if (!listEl) return;
      listEl.innerHTML = "";

      if (!subtitles || !subtitles.length) {
        listEl.innerHTML = `<div class="subsync-view-empty">자막 스크립트를 찾을 수 없습니다.</div>`;
        return;
      }

      const frag = document.createDocumentFragment();

      subtitles.forEach((sub, idx) => {
        const row = document.createElement("div");
        row.className = "subsync-script-row";
        row.dataset.timestamp = sub.timestamp;
        if (Number.isFinite(Number(sub.end_timestamp))) {
          row.dataset.endTimestamp = sub.end_timestamp;
        }
        row.dataset.index = idx;

        const timeBtn = document.createElement("button");
        timeBtn.className = "subsync-script-time";
        const min = Math.floor(sub.timestamp / 60);
        const sec = Math.floor(sub.timestamp % 60);
        timeBtn.textContent = `${String(min).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
        timeBtn.addEventListener("click", () => {
          if (SubSync.player && SubSync.player.seekTo) {
            SubSync.player.seekTo(sub.timestamp);
          }
        });

        const contentBox = document.createElement("div");
        contentBox.className = "subsync-script-content";

        const enEl = document.createElement("div");
        enEl.className = "subsync-script-en";
        // Script 영어 단어에도 공통 Mouse Interaction 적용
        if (SubSync.interactiveText && SubSync.interactiveText.attach) {
          SubSync.interactiveText.attach(enEl, sub.learn, sub.learn);
        } else {
          enEl.textContent = sub.learn || "";
        }

        const koEl = document.createElement("div");
        koEl.className = "subsync-script-ko";
        koEl.textContent = sub.known || "";

        contentBox.appendChild(enEl);
        if (sub.known) contentBox.appendChild(koEl);

        row.appendChild(timeBtn);
        row.appendChild(contentBox);
        frag.appendChild(row);
      });

      listEl.appendChild(frag);
    },

    filter(query) {
      if (!listEl) return;
      const rows = listEl.querySelectorAll(".subsync-script-row");
      rows.forEach((row) => {
        const text = row.textContent.toLowerCase();
        const matches = !query || text.includes(query);
        row.style.display = "flex";
        row.classList.toggle("subsync-filter-hidden", !matches);
      });
    },

    highlightTime(currentTime, options = {}) {
      if (!containerEl || containerEl.style.display === "none") return;

      const rows = listEl ? listEl.querySelectorAll(".subsync-script-row") : [];
      let activeRow = null;

      rows.forEach((row, index) => {
        const start = parseFloat(row.dataset.timestamp);
        if (!Number.isFinite(start)) return;

        const explicitEnd = parseFloat(row.dataset.endTimestamp);
        const nextStart = rows[index + 1]
          ? parseFloat(rows[index + 1].dataset.timestamp)
          : Number.NaN;
        const fallbackEnd = Number.isFinite(nextStart) ? nextStart : start + 5;
        const end = Number.isFinite(explicitEnd) && explicitEnd > start ? explicitEnd : fallbackEnd;

        if (currentTime >= start && currentTime < end) {
          activeRow = row;
        }
      });

      if (!activeRow) {
        rows.forEach((row) => {
          const start = parseFloat(row.dataset.timestamp);
          if (Number.isFinite(start) && start <= currentTime) activeRow = row;
        });
      }

      rows.forEach((row) => row.classList.toggle("active", row === activeRow));

      // 필요 시 활성 위치 자동 스크롤 (사용자가 수동 스크롤 중이지 않을 때)
      if (activeRow && listEl && options.autoScroll !== false) {
        const topPos = activeRow.offsetTop - listEl.offsetTop;
        const trackingTop = Math.max(0, topPos - SCRIPT_TRACKING_TOP_GAP);
        if (Math.abs(listEl.scrollTop - trackingTop) > SCRIPT_TRACKING_THRESHOLD) {
          listEl.scrollTo({ top: trackingTop, behavior: "smooth" });
        }
      }
    }
  };
})();
