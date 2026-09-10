// 마우스 Click 시 단어 상세 설명 팝업/패널 및 저장 관리
(function () {
  const SubSync = (window.__SubSync = window.__SubSync || {});

  const POPUP_TRANSITION_MS = 220;
  let popupEl = null;
  let hideTimer = null;

  function clearHideTimer() {
    if (hideTimer) {
      clearTimeout(hideTimer);
      hideTimer = null;
    }
  }

  function getCurrentVideoId() {
    try {
      return SubSync.getVideoId ? String(SubSync.getVideoId() || "") : "";
    } catch (_) {
      return "";
    }
  }

  function isMatchingSavedWord(item, word, videoId) {
    if (!item || String(item.word || "").trim().toLowerCase() !== String(word || "").trim().toLowerCase()) {
      return false;
    }
    return !videoId || !item.video_id || String(item.video_id) === videoId;
  }

  async function findSavedWord(word) {
    if (!SubSync.learningHistory || !SubSync.learningHistory.getSavedWords) return null;
    try {
      const items = await SubSync.learningHistory.getSavedWords();
      const videoId = getCurrentVideoId();
      return (Array.isArray(items) ? items : []).find((item) => isMatchingSavedWord(item, word, videoId)) || null;
    } catch (_) {
      return null;
    }
  }

  function restartSaveIconAnimation(button, isSaved) {
    const icon = button?.querySelector && button.querySelector(".subsync-popup-save-icon");
    if (!icon || !icon.classList) return;
    icon.classList.remove("subsync-save-icon-on", "subsync-save-icon-off");
    void icon.offsetWidth;
    icon.classList.add(isSaved ? "subsync-save-icon-on" : "subsync-save-icon-off");
  }

  function setSaveButtonState(button, savedWord, options = {}) {
    if (!button) return;
    const isSaved = Boolean(savedWord);
    if (isSaved) {
      button.classList.add("subsync-popup-save-saved");
    } else {
      button.classList.remove("subsync-popup-save-saved");
    }
    button.setAttribute("aria-pressed", String(isSaved));
    button.setAttribute("aria-label", isSaved ? "단어 저장됨. 클릭하여 저장 취소" : "단어 저장하기");
    button.title = isSaved ? "저장 취소" : "저장소에 단어 저장";

    const label = button.querySelector && button.querySelector(".subsync-popup-save-label");
    if (label) label.textContent = isSaved ? "저장 취소" : "저장하기";
    const icon = button.querySelector && button.querySelector(".subsync-popup-save-icon");
    if (icon && SubSync.iconUrl) {
      icon.src = SubSync.iconUrl(isSaved ? "star-filled" : "star");
    }
    if (options.animate) restartSaveIconAnimation(button, isSaved);
  }

  function showPopupElement(element) {
    if (!element) return;
    clearHideTimer();
    const wasHidden =
      element.style.display === "none" || !element.classList.contains("subsync-popup-visible");
    element.style.display = "block";
    element.classList.remove("subsync-popup-exiting");
    if (wasHidden) {
      void element.offsetWidth;
      element.classList.add("subsync-popup-visible");
    }
  }

  function hidePopupElement() {
    if (!popupEl) return;
    clearHideTimer();
    popupEl.classList.remove("subsync-popup-visible");
    popupEl.classList.add("subsync-popup-exiting");
    hideTimer = setTimeout(() => {
      if (popupEl) {
        popupEl.style.display = "none";
        popupEl.classList.remove("subsync-popup-exiting");
      }
      hideTimer = null;
    }, POPUP_TRANSITION_MS);
  }

  function ensurePopup() {
    if (popupEl) return popupEl;
    popupEl = document.createElement("div");
    popupEl.className = "subsync-click-popup";
    popupEl.style.display = "none";
    document.body.appendChild(popupEl);

    document.addEventListener("click", (e) => {
      if (
        popupEl &&
        popupEl.style.display !== "none" &&
        !popupEl.contains(e.target) &&
        !e.target.classList.contains("subsync-word")
      ) {
        hidePopupElement();
      }
    });

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        SubSync.clickPopup.hide();
      }
    });

    return popupEl;
  }

  SubSync.clickPopup = {
    async show(word, sentence, targetEl) {
      if (SubSync.settings && !SubSync.settings.get("subsyncEnabled")) return;

      const isAuthed = await SubSync.authService.isAuthenticated();
      if (!isAuthed) {
        SubSync.authModal.show(() => {
          this.show(word, sentence, targetEl);
        });
        return;
      }

      const el = ensurePopup();
      const rect = targetEl.getBoundingClientRect();
      el.style.left = `${Math.min(window.innerWidth - 320, Math.max(16, rect.left + window.scrollX))}px`;
      el.style.top = `${rect.bottom + window.scrollY + 8}px`;
      showPopupElement(el);
      el.innerHTML = `<div class="subsync-popup-loading">상세 설명 로딩 중...</div>`;

      // 클릭 로그 기록
      SubSync.logService.recordClick(word, sentence);

      try {
        const data = await SubSync.dictService.getDetailMeaning(word, sentence);
        let savedWord = await findSavedWord(word);
        const defsHtml = (data.definitions || [])
          .map((d, i) => `<div class="subsync-popup-def-item">${i + 1}. ${d}</div>`)
          .join("");

        const phrasesHtml = (data.phrases || [])
          .map((p) => `<div class="subsync-popup-phrase-item"><b>${p.expression}</b>: ${p.meaning}</div>`)
          .join("");

        el.innerHTML = `
          <div class="subsync-popup-header">
            <div>
              <span class="subsync-popup-word">${data.word}</span>
              <span class="subsync-popup-phonetic">${data.phonetic || ""}</span>
            </div>
            <button class="subsync-popup-save-btn" id="subsync-save-word-btn" type="button">
              ${SubSync.icon ? SubSync.icon("star", "subsync-popup-save-icon") : ""}<span class="subsync-popup-save-label">저장하기</span>
            </button>
            <button type="button" class="subsync-popup-close-btn" aria-label="상세 학습 닫기">×</button>
          </div>
          <div class="subsync-popup-pos">${data.part_of_speech || "단어"} · ${(data.meanings || []).join(", ")}</div>
          ${defsHtml ? `<div class="subsync-popup-defs">${defsHtml}</div>` : ""}
          ${data.context_meaning ? `<div class="subsync-popup-context">💡 <b>문맥 의미:</b> ${data.context_meaning}</div>` : ""}
          ${phrasesHtml ? `<div class="subsync-popup-phrases"><div class="subsync-popup-phrases-title">관련 표현</div>${phrasesHtml}</div>` : ""}
        `;

        const saveBtn = el.querySelector("#subsync-save-word-btn");
        const closeBtn = el.querySelector(".subsync-popup-close-btn");
        setSaveButtonState(saveBtn, savedWord);
        if (closeBtn) {
          closeBtn.addEventListener("click", (event) => {
            event.preventDefault();
            event.stopPropagation();
            this.hide();
          });
        }

        if (saveBtn) {
          saveBtn.addEventListener("click", async (event) => {
            event.preventDefault();
            event.stopPropagation();
            if (saveBtn.disabled) return;

            const wasSaved = Boolean(savedWord) || saveBtn.classList.contains("subsync-popup-save-saved");
            saveBtn.disabled = true;
            saveBtn.setAttribute("aria-busy", "true");
            try {
              if (wasSaved) {
                if (!SubSync.dictService.removeWord) {
                  throw new Error("단어 저장 취소 기능을 사용할 수 없습니다.");
                }
                await SubSync.dictService.removeWord(savedWord || {
                  word,
                  video_id: getCurrentVideoId()
                });
                savedWord = null;
              } else {
                if (!SubSync.dictService.saveWord) {
                  throw new Error("단어 저장 기능을 사용할 수 없습니다.");
                }
                const saved = await SubSync.dictService.saveWord(
                  word,
                  (data.meanings || []).join(", "),
                  sentence
                );
                savedWord = saved && typeof saved === "object"
                  ? saved
                  : { word, video_id: getCurrentVideoId() };
              }
              setSaveButtonState(saveBtn, savedWord, { animate: true });
            } catch (_) {
              setSaveButtonState(saveBtn, savedWord);
            } finally {
              saveBtn.disabled = false;
              saveBtn.removeAttribute("aria-busy");
            }
          });
        }
      } catch (err) {
        el.innerHTML = `
          <div class="subsync-popup-error">
            <span>상세 정보를 불러오지 못했습니다.</span>
            <button type="button" class="subsync-popup-close-btn" aria-label="상세 학습 닫기">×</button>
          </div>
        `;
        const errorCloseBtn = el.querySelector(".subsync-popup-close-btn");
        if (errorCloseBtn) {
          errorCloseBtn.addEventListener("click", (event) => {
            event.preventDefault();
            event.stopPropagation();
            this.hide();
          });
        }
      }
    },

    hide() {
      hidePopupElement();
    }
  };
})();
