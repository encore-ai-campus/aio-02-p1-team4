// 마우스 Hover 시 빠른 단어 뜻 툴팁 표시기
(function () {
  const SubSync = (window.__SubSync = window.__SubSync || {});

  const HIDE_DELAY_MS = 280;
  const TOOLTIP_TRANSITION_MS = 180;
  let tooltipEl = null;
  let hideTimer = null;
  let exitTimer = null;
  let renderToken = 0;
  let saveStateToken = 0;
  let targetActive = false;
  let tooltipActive = false;
  let currentWord = "";
  let currentSentence = "";
  let currentTarget = null;
  let currentSavedWord = null;

  function clearHideTimer() {
    if (hideTimer) {
      clearTimeout(hideTimer);
      hideTimer = null;
    }
  }

  function clearExitTimer() {
    if (exitTimer) {
      clearTimeout(exitTimer);
      exitTimer = null;
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

  function savedWordFromTarget(targetEl, word) {
    const id = targetEl?.dataset?.savedWordId;
    if (!id) return null;
    return {
      id: String(id),
      word,
      video_id: String(targetEl.dataset.savedWordVideoId || "")
    };
  }

  async function findSavedWord(word) {
    if (!SubSync.learningHistory || !SubSync.learningHistory.getSavedWords) return null;
    const items = await SubSync.learningHistory.getSavedWords();
    const videoId = getCurrentVideoId();
    return (Array.isArray(items) ? items : []).find((item) => isMatchingSavedWord(item, word, videoId)) || null;
  }

  function restartSaveIconAnimation(button, isSaved) {
    const icon = button?.querySelector && button.querySelector(".subsync-tt-save-icon");
    if (!icon || !icon.classList) return;
    icon.classList.remove("subsync-save-icon-on", "subsync-save-icon-off");
    void icon.offsetWidth;
    icon.classList.add(isSaved ? "subsync-save-icon-on" : "subsync-save-icon-off");
  }

  function setSaveButtonState(button, savedWord, options = {}) {
    if (!button) return;
    const isSaved = Boolean(savedWord);
    if (isSaved) {
      button.classList.add("subsync-tt-save-saved");
    } else {
      button.classList.remove("subsync-tt-save-saved");
    }
    button.setAttribute("aria-pressed", String(isSaved));
    button.setAttribute("aria-label", isSaved ? "단어 저장됨. 클릭하여 저장 취소" : "단어 저장하기");
    button.title = isSaved ? "저장 취소" : "저장소에 단어 저장";

    const icon = button.querySelector && button.querySelector(".subsync-tt-save-icon");
    if (icon && SubSync.iconUrl) {
      icon.src = SubSync.iconUrl(isSaved ? "star-filled" : "star");
    }
    if (options.animate) restartSaveIconAnimation(button, isSaved);
  }

  function hideNow() {
    clearHideTimer();
    clearExitTimer();
    renderToken += 1;
    saveStateToken += 1;
    targetActive = false;
    tooltipActive = false;
    currentWord = "";
    currentSentence = "";
    currentTarget = null;
    currentSavedWord = null;
    if (tooltipEl) {
      tooltipEl.classList.remove("subsync-tooltip-visible");
      tooltipEl.classList.add("subsync-tooltip-exiting");
      exitTimer = setTimeout(() => {
        if (tooltipEl && !targetActive && !tooltipActive) {
          tooltipEl.style.display = "none";
          tooltipEl.classList.remove("subsync-tooltip-exiting");
        }
        exitTimer = null;
      }, TOOLTIP_TRANSITION_MS);
    }
  }

  function scheduleHide() {
    clearHideTimer();
    hideTimer = setTimeout(() => {
      hideTimer = null;
      if (!targetActive && !tooltipActive) hideNow();
    }, HIDE_DELAY_MS);
  }

  function ensureTooltip() {
    if (tooltipEl) return tooltipEl;

    tooltipEl = document.createElement("div");
    tooltipEl.className = "subsync-hover-tooltip";
    tooltipEl.style.display = "none";
    tooltipEl.setAttribute("role", "tooltip");

    tooltipEl.addEventListener(
      "wheel",
      (event) => {
        event.preventDefault();
        event.stopPropagation();
      },
      { passive: false }
    );

    tooltipEl.addEventListener("mouseenter", () => {
      tooltipActive = true;
      clearHideTimer();
    });
    tooltipEl.addEventListener("mouseleave", () => {
      tooltipActive = false;
      scheduleHide();
    });

    document.body.appendChild(tooltipEl);
    return tooltipEl;
  }

  function positionTooltip(targetEl) {
    if (!targetEl || !tooltipEl) return;
    const rect = targetEl.getBoundingClientRect();
    const scrollX = Number(window.scrollX) || 0;
    const scrollY = Number(window.scrollY) || 0;
    const margin = 8;
    const gap = 8;
    const tooltipRect = typeof tooltipEl.getBoundingClientRect === "function"
      ? tooltipEl.getBoundingClientRect()
      : {};
    const tooltipWidth = Number(tooltipEl.offsetWidth) || Number(tooltipRect.width) || 0;
    const tooltipHeight = Number(tooltipEl.offsetHeight) || Number(tooltipRect.height) || 0;
    const viewportWidth = Number(window.innerWidth);
    const viewportHeight = Number(window.innerHeight);
    const targetBottom = Number.isFinite(Number(rect.bottom))
      ? Number(rect.bottom)
      : Number(rect.top || 0) + Number(rect.height || 0);

    let left = Number(rect.left || 0) + scrollX;
    if (Number.isFinite(viewportWidth) && tooltipWidth > 0) {
      left = Math.min(left, scrollX + viewportWidth - tooltipWidth - margin);
    }
    left = Math.max(scrollX + margin, left);

    const targetTop = Number(rect.top || 0) + scrollY;
    const topBoundary = scrollY + margin;
    const bottomBoundary = Number.isFinite(viewportHeight)
      ? scrollY + viewportHeight - margin
      : Infinity;
    let top = targetTop - tooltipHeight - gap;
    if (top < topBoundary) top = targetBottom + scrollY + gap;
    if (top + tooltipHeight > bottomBoundary && tooltipHeight > 0) {
      const aboveTop = targetTop - tooltipHeight - gap;
      top = aboveTop >= topBoundary
        ? aboveTop
        : Math.max(topBoundary, bottomBoundary - tooltipHeight);
    }

    tooltipEl.style.left = `${Math.round(left)}px`;
    tooltipEl.style.top = `${Math.round(Math.max(topBoundary, top))}px`;
  }

  function renderContent(word, sentence, targetEl, meaningText, isLoading) {
    const el = ensureTooltip();
    const isStorageWord = Boolean(targetEl?.dataset?.savedWordId);
    el.innerHTML = "";

    const top = document.createElement("div");
    top.className = "subsync-tt-top";

    const wordEl = document.createElement("span");
    wordEl.className = "subsync-tt-word";
    wordEl.textContent = word;
    top.appendChild(wordEl);

    const meaningEl = document.createElement("span");
    meaningEl.className = isLoading ? "subsync-tt-loading" : "subsync-tt-mean";
    meaningEl.textContent = isLoading ? "뜻 불러오는 중..." : meaningText;
    top.appendChild(meaningEl);

    const saveButton = document.createElement("button");
    saveButton.type = "button";
    saveButton.className = "subsync-tt-save-btn";
    saveButton.innerHTML = SubSync.icon ? SubSync.icon("star", "subsync-tt-save-icon") : "";
    setSaveButtonState(saveButton, currentSavedWord);
    saveButton.addEventListener("click", async (event) => {
      event.preventDefault();
      event.stopPropagation();
      if (saveButton.disabled) return;

      const authed = SubSync.authService
        ? await SubSync.authService.isAuthenticated()
        : true;
      if (!authed) {
        if (SubSync.authModal) SubSync.authModal.show();
        return;
      }

      const wasSaved = Boolean(currentSavedWord) || saveButton.classList.contains("subsync-tt-save-saved");
      const mutationToken = ++saveStateToken;
      saveButton.disabled = true;
      saveButton.setAttribute("aria-busy", "true");
      try {
        if (wasSaved) {
          if (!SubSync.dictService || !SubSync.dictService.removeWord) {
            throw new Error("단어 저장 취소 기능을 사용할 수 없습니다.");
          }
          await SubSync.dictService.removeWord(currentSavedWord || {
            word,
            video_id: getCurrentVideoId()
          });
          currentSavedWord = null;
        } else {
          if (!SubSync.dictService || !SubSync.dictService.saveWord) {
            throw new Error("단어 저장 기능을 사용할 수 없습니다.");
          }
          const saved = await SubSync.dictService.saveWord(
            word,
            isLoading ? "" : meaningText,
            sentence
          );
          currentSavedWord = saved && typeof saved === "object"
            ? saved
            : { word, video_id: getCurrentVideoId() };
        }
        if (mutationToken === saveStateToken) {
          setSaveButtonState(saveButton, currentSavedWord, { animate: true });
          if (wasSaved && isStorageWord) hideNow();
        }
      } catch (_) {
        // 실패한 요청은 현재 상태를 바꾸지 않고 다시 클릭할 수 있게 한다.
        setSaveButtonState(saveButton, currentSavedWord);
      } finally {
        saveButton.disabled = false;
        saveButton.removeAttribute("aria-busy");
      }
    });
    top.appendChild(saveButton);

    const detailButton = document.createElement("button");
    detailButton.type = "button";
    detailButton.className = "subsync-tt-hint";
    detailButton.textContent = "클릭하여 자세히 보기 ›";
    detailButton.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();

      const selectedWord = word;
      const selectedSentence = sentence;
      const selectedTarget = targetEl;
      hideNow();

      if (SubSync.clickPopup && SubSync.clickPopup.show) {
        SubSync.clickPopup.show(selectedWord, selectedSentence, selectedTarget);
      }
    });

    el.appendChild(top);
    el.appendChild(detailButton);
    positionTooltip(targetEl);
  }

  SubSync.hoverTooltip = {
    show(word, targetEl, fullSentence) {
      clearHideTimer();
      targetActive = true;

      if (
        SubSync.settings &&
        (!SubSync.settings.get("subsyncEnabled") || !SubSync.settings.get("hoverLearning"))
      ) {
        hideNow();
        return;
      }

      if (!word || !targetEl) {
        this.leaveTarget();
        return;
      }

      currentWord = word;
      currentSentence = fullSentence || word;
      currentTarget = targetEl;
      currentSavedWord = null;
      const token = ++renderToken;
      const savedLookupToken = ++saveStateToken;
      const storageSavedWord = savedWordFromTarget(targetEl, word);
      const el = ensureTooltip();
      const wasHidden = el.style.display === "none" || !el.classList.contains("subsync-tooltip-visible");
      clearExitTimer();
      el.style.display = "block";
      el.classList.remove("subsync-tooltip-exiting");
      if (wasHidden) {
        void el.offsetWidth;
        el.classList.add("subsync-tooltip-visible");
      }
      renderContent(word, currentSentence, targetEl, "", true);

      if (storageSavedWord) {
        currentSavedWord = storageSavedWord;
        setSaveButtonState(el.querySelector(".subsync-tt-save-btn"), storageSavedWord);
      } else {
        Promise.resolve(findSavedWord(word))
          .then((savedWord) => {
            if (savedLookupToken !== saveStateToken || token !== renderToken || currentWord !== word) return;
            currentSavedWord = savedWord;
            setSaveButtonState(el.querySelector(".subsync-tt-save-btn"), savedWord);
          })
          .catch(() => {});
      }

      Promise.resolve()
        .then(() => {
          if (!SubSync.dictService || !SubSync.dictService.getHoverMeaning) return null;
          return SubSync.dictService.getHoverMeaning(word);
        })
        .then((dict) => {
          if (token !== renderToken || currentWord !== word || !tooltipEl) return;
          const meaningText =
            dict && dict.meanings && dict.meanings.length ? dict.meanings.join(", ") : "단어";
          renderContent(word, currentSentence, targetEl, meaningText, false);
        })
        .catch(() => {
          if (token !== renderToken || currentWord !== word || !tooltipEl) return;
          renderContent(word, currentSentence, targetEl, "", false);
        });
    },

    leaveTarget() {
      targetActive = false;
      scheduleHide();
    },

    hide() {
      hideNow();
    }
  };
})();
