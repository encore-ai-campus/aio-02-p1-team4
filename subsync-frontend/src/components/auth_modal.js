// Google OAuth 로그인 모달
(function () {
  const SubSync = (window.__SubSync = window.__SubSync || {});

  let modalEl = null;
  let onSuccessCallback = null;
  let hideTimer = null;

  const MODAL_TRANSITION_MS = 240;

  function clearHideTimer() {
    if (hideTimer) {
      clearTimeout(hideTimer);
      hideTimer = null;
    }
  }

  function hideModal() {
    if (!modalEl) return;
    clearHideTimer();
    modalEl.classList.remove("subsync-modal-visible");
    modalEl.classList.add("subsync-modal-exiting");
    hideTimer = setTimeout(() => {
      if (modalEl) {
        modalEl.style.display = "none";
        modalEl.classList.remove("subsync-modal-exiting");
      }
      hideTimer = null;
    }, MODAL_TRANSITION_MS);
  }

  function showModal(element) {
    if (!element) return;
    clearHideTimer();
    element.style.display = "flex";
    element.classList.remove("subsync-modal-exiting");
    void element.offsetWidth;
    element.classList.add("subsync-modal-visible");
  }

  function googleButtonMarkup() {
    return SubSync.icon("google", "subsync-auth-google-icon");
  }

  function googleButtonFallbackMarkup() {
    return `<svg class="subsync-ui-icon subsync-auth-google-icon subsync-auth-google-icon-fallback" width="18" height="18" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path fill="#4285F4" d="M21.35 12.27c0-.79-.07-1.55-.2-2.27H12v4.3h5.24a4.48 4.48 0 0 1-1.94 2.94v2.45h3.14c1.84-1.69 2.91-4.18 2.91-7.42Z"/>
      <path fill="#34A853" d="M12 21.5c2.63 0 4.84-.87 6.45-2.36l-3.14-2.45c-.87.58-1.98.93-3.31.93-2.54 0-4.7-1.72-5.47-4.03H3.29v2.53A9.74 9.74 0 0 0 12 21.5Z"/>
      <path fill="#FBBC05" d="M6.53 12.66A5.86 5.86 0 0 1 6.22 11c0-.58.11-1.15.31-1.66V6.81H3.29A9.74 9.74 0 0 0 2.25 11c0 1.51.36 2.94 1.04 4.19l3.24-2.53Z"/>
      <path fill="#EA4335" d="M12 5.31c1.43 0 2.71.49 3.72 1.45l2.79-2.79C16.84 2.37 14.63 1.5 12 1.5a9.74 9.74 0 0 0-8.71 5.31l3.24 2.53C7.3 7.03 9.46 5.31 12 5.31Z"/>
    </svg>`;
  }

  function bindGoogleIconFallback(button) {
    const image = button?.querySelector("img.subsync-auth-google-icon");
    if (!image) return;
    image.addEventListener("error", () => {
      const template = document.createElement("template");
      template.innerHTML = googleButtonFallbackMarkup();
      image.replaceWith(template.content.firstElementChild);
    }, { once: true });
  }

  function renderGoogleButton(button, label, isBusy = false) {
    if (!button) return;
    button.innerHTML = googleButtonMarkup();
    bindGoogleIconFallback(button);
    button.setAttribute("aria-label", label);
    button.title = label;
    if (isBusy) {
      button.setAttribute("aria-busy", "true");
    } else {
      button.removeAttribute("aria-busy");
    }
  }

  function renderModalContent() {
    if (!modalEl) return;

    modalEl.innerHTML = `
      <div class="subsync-auth-modal" role="dialog" aria-modal="true" aria-labelledby="subsync-auth-title">
        <div class="subsync-auth-header">
          <div class="subsync-auth-title" id="subsync-auth-title">SubSync 로그인</div>
          <div class="subsync-auth-desc">
            Google 계정으로 로그인하면 나만의 단어장과 학습 기록을 관리할 수 있습니다.
          </div>
        </div>

        <div class="subsync-auth-actions subsync-auth-google-actions">
          <button
            id="subsync-auth-google-btn"
            class="subsync-btn-primary subsync-auth-google-btn"
            type="button"
            aria-label="Google로 계속하기"
            title="Google로 계속하기"
          >
            ${googleButtonMarkup()}
          </button>
          <button id="subsync-auth-cancel-btn" class="subsync-btn-secondary" type="button">닫기</button>
        </div>

        <div class="subsync-auth-footer">
          로그인하면 SubSync의 단어 저장 및 학습 기록 기능을 사용할 수 있습니다.
        </div>
      </div>
    `;

    bindGoogleIconFallback(document.getElementById("subsync-auth-google-btn"));

    document.getElementById("subsync-auth-cancel-btn")?.addEventListener("click", () => {
      hideModal();
    });

    document.getElementById("subsync-auth-google-btn")?.addEventListener("click", async () => {
      const button = document.getElementById("subsync-auth-google-btn");
      if (!button || button.disabled) return;

      button.disabled = true;
      renderGoogleButton(button, "Google 로그인 연결 중...", true);

      try {
        await SubSync.authService.loginWithGoogle();
        hideModal();
        if (SubSync.layout && typeof SubSync.layout.updateAuthUI === "function") {
          await SubSync.layout.updateAuthUI();
        }
        if (typeof onSuccessCallback === "function") {
          await onSuccessCallback();
        }
      } catch (error) {
        alert(`Google 로그인 실패: ${error.message}`);
        button.disabled = false;
        renderGoogleButton(button, "Google로 계속하기", false);
      }
    });
  }

  function ensureModal() {
    if (modalEl) return modalEl;
    modalEl = document.createElement("div");
    modalEl.className = "subsync-auth-modal-overlay";
    modalEl.style.display = "none";
    document.body.appendChild(modalEl);
    return modalEl;
  }

  SubSync.authModal = {
    show(callback) {
      onSuccessCallback = callback || null;
      const m = ensureModal();
      renderModalContent();
      showModal(m);
    },
    hide() {
      hideModal();
    }
  };
})();
