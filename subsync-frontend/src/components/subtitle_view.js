// YouTube 동영상 화면 위 실시간 이중자막 오버레이 및 사이드바 뷰어
(function () {
  const SubSync = (window.__SubSync = window.__SubSync || {});

  let overlayEl = null;
  let currentSub = null;
  let currentRenderKey = null;
  let currentSideContainerEl = null;
  let currentOverlayEl = null;
  let captionExitTimer = null;
  let positionResetTimer = null;

  const POSITION_PROPERTIES = ["left", "top", "right", "bottom", "transform"];
  const POSITION_RESET_MS = 360;
  const DEFAULT_OVERLAY_BOTTOM = 60;


  function clearInlinePosition(element) {
    if (!element || !element.style) return;
    POSITION_PROPERTIES.forEach((property) => {
      if (typeof element.style.removeProperty === "function") {
        element.style.removeProperty(property);
      } else {
        element.style[property] = "";
      }
    });
  }

  function clearPositionResetTimer() {
    if (positionResetTimer) {
      clearTimeout(positionResetTimer);
      positionResetTimer = null;
    }
  }

  function getDefaultOverlayPosition(element) {
    const parent = element?.offsetParent || element?.parentElement || element?.parentNode;
    if (
      !parent ||
      typeof parent.getBoundingClientRect !== "function" ||
      typeof element.getBoundingClientRect !== "function"
    ) {
      return null;
    }

    const parentRect = parent.getBoundingClientRect();
    const overlayRect = element.getBoundingClientRect();
    return {
      left: parentRect.width / 2,
      top: parentRect.height - DEFAULT_OVERLAY_BOTTOM - overlayRect.height
    };
  }

  function resetOverlayPosition() {
    if (!overlayEl) return;
    clearPositionResetTimer();

    const defaultPosition = getDefaultOverlayPosition(overlayEl);
    overlayEl.classList.remove("subsync-dragging", "subsync-position-resetting");
    overlayEl.classList.add("subsync-position-resetting");

    // transition이 현재 위치에서 시작하도록 dragged 상태의 축을 고정한다.
    overlayEl.style.right = "auto";
    overlayEl.style.bottom = "auto";
    overlayEl.style.transform = "translateX(-50%)";
    void overlayEl.offsetWidth;

    if (defaultPosition) {
      overlayEl.style.left = `${Math.round(defaultPosition.left)}px`;
      overlayEl.style.top = `${Math.round(defaultPosition.top)}px`;
    }

    positionResetTimer = setTimeout(() => {
      if (overlayEl) {
        clearInlinePosition(overlayEl);
        overlayEl.classList.remove("subsync-position-resetting");
      }
      positionResetTimer = null;
    }, POSITION_RESET_MS);
  }

  function attachPositionReset(element) {
    if (!element || element.__subsyncPositionResetAttached) return;

    element.addEventListener("pointerdown", () => {
      clearPositionResetTimer();
      element.classList.remove("subsync-position-resetting");
    });
    element.addEventListener("dblclick", (event) => {
      event.preventDefault();
      event.stopPropagation();
      resetOverlayPosition();
    });
    element.__subsyncPositionResetAttached = true;
  }

  function restartAnimation(element, className) {
    if (!element || !element.classList) return;
    element.classList.remove(className);
    void element.offsetWidth;
    element.classList.add(className);
  }

  function clearCaptionExitTimer() {
    if (captionExitTimer) {
      clearTimeout(captionExitTimer);
      captionExitTimer = null;
    }
  }

  function makeRenderKey(subtitle, isSubsyncEnabled, isDualSubEnabled) {
    return JSON.stringify({
      enabled: Boolean(isSubsyncEnabled),
      dual: Boolean(isDualSubEnabled),
      subtitle: subtitle
        ? {
            videoId: subtitle.video_id || "",
            timestamp: subtitle.timestamp ?? null,
            endTimestamp: subtitle.end_timestamp ?? null,
            learn: subtitle.learn || "",
            known: subtitle.known || ""
          }
        : null
    });
  }

  function ensureVideoOverlay() {
    if (overlayEl && document.body.contains(overlayEl)) return overlayEl;

    const playerContainer =
      document.querySelector("#movie_player") ||
      document.querySelector(".html5-video-player") ||
      document.querySelector(".ytd-player");

    if (!playerContainer) return null;

    overlayEl = document.createElement("div");
    overlayEl.id = "subsync-video-caption-overlay";
    overlayEl.className = "subsync-video-caption-overlay";

    overlayEl.innerHTML = `
      <div class="subsync-overlay-content">
        <div class="subsync-overlay-en" id="subsync-overlay-en-text"></div>
        <div class="subsync-overlay-ko" id="subsync-overlay-ko-text"></div>
      </div>
    `;

    // position: relative 보장
    if (getComputedStyle(playerContainer).position === "static") {
      playerContainer.style.position = "relative";
    }

    playerContainer.appendChild(overlayEl);
    if (SubSync.drag && SubSync.drag.attach) {
      SubSync.drag.attach(overlayEl, overlayEl, { preserveCenterX: true });
    }
    attachPositionReset(overlayEl);
    return overlayEl;
  }

  SubSync.subtitleView = {
    render(sideContainerEl, subtitle) {
      const isSubsyncEnabled = SubSync.settings ? SubSync.settings.get("subsyncEnabled") : true;
      const isDualSubEnabled = SubSync.settings ? SubSync.settings.get("dualSubtitle") : true;
      const overlay = ensureVideoOverlay();
      const renderKey = makeRenderKey(subtitle, isSubsyncEnabled, isDualSubEnabled);

      if (
        currentRenderKey === renderKey &&
        currentSideContainerEl === sideContainerEl &&
        currentOverlayEl === overlay
      ) {
        return;
      }

      currentSub = subtitle;
      currentRenderKey = renderKey;
      currentSideContainerEl = sideContainerEl;
      currentOverlayEl = overlay;

      // 1. YouTube 영상 화면 위 오버레이 렌더링
      const isSubtitleVisible = isSubsyncEnabled && isDualSubEnabled && Boolean(subtitle);
      if (overlay) {
        if (!isSubtitleVisible) {
          overlay.style.display = "flex";
          const content = overlay.querySelector && overlay.querySelector(".subsync-overlay-content");
          if (content) {
            content.classList.remove("subsync-caption-entering");
            content.classList.add("subsync-caption-exiting");
            clearCaptionExitTimer();
            captionExitTimer = setTimeout(() => {
              if (overlayEl && !currentSub) {
                overlayEl.style.display = "none";
                content.classList.remove("subsync-caption-exiting");
              }
              captionExitTimer = null;
            }, 180);
          } else {
            overlay.style.display = "none";
          }
        } else {
          clearCaptionExitTimer();
          overlay.style.display = "flex";
          const enEl = document.getElementById("subsync-overlay-en-text");
          const koEl = document.getElementById("subsync-overlay-ko-text");

          if (enEl) {
            SubSync.interactiveText.attach(enEl, subtitle.learn, subtitle.learn);
          }
          if (koEl) {
            koEl.textContent = subtitle.known || "";
            koEl.style.display = subtitle.known ? "block" : "none";
          }
          if (overlay.querySelector) {
            const content = overlay.querySelector(".subsync-overlay-content");
            if (content) content.classList.remove("subsync-caption-exiting");
            restartAnimation(
              content,
              "subsync-caption-entering"
            );
          }
        }
      }

      // 2. 우측 SubSync 패널 내부 렌더링
      if (sideContainerEl) {
        if (!subtitle) {
          sideContainerEl.innerHTML = `<div class="subsync-sub-empty">자막 재생 대기 중...</div>`;
          return;
        }

        sideContainerEl.innerHTML = `
          <div class="subsync-sub-learn" id="subsync-sub-learn-text"></div>
          <div class="subsync-sub-known">${subtitle.known || ""}</div>
        `;

        const learnSideEl = document.getElementById("subsync-sub-learn-text");
        if (learnSideEl) {
          SubSync.interactiveText.attach(learnSideEl, subtitle.learn, subtitle.learn);
        }
        restartAnimation(sideContainerEl, "subsync-content-changing");
      }
    },

    clear() {
      currentSub = null;
      currentRenderKey = null;
      currentSideContainerEl = null;
      currentOverlayEl = null;
      if (overlayEl) {
        if (overlayEl.style.display === "none") return;
        overlayEl.style.display = "flex";
        const content = overlayEl.querySelector && overlayEl.querySelector(".subsync-overlay-content");
        if (!content) {
          overlayEl.style.display = "none";
          return;
        }
        content.classList.remove("subsync-caption-entering");
        content.classList.add("subsync-caption-exiting");
        clearCaptionExitTimer();
        captionExitTimer = setTimeout(() => {
          if (overlayEl && !currentSub) {
            overlayEl.style.display = "none";
            content.classList.remove("subsync-caption-exiting");
          }
          captionExitTimer = null;
        }, 180);
      }
    },

    resetPosition() {
      resetOverlayPosition();
    }
  };
})();
