// 세부 설정 화면
(function () {
  const SubSync = (window.__SubSync = window.__SubSync || {});

  SubSync.settingsView = {
    render(containerEl) {
      if (!containerEl) return;

      const s = SubSync.settings.getAll();
      const theme = ["light", "glass"].includes(s.theme) ? s.theme : "dark";
      const fontFamily = s.fontFamily === "gmarket" ? "gmarket" : "system";

      containerEl.innerHTML = `
        <div class="subsync-settings-card">
          <div class="subsync-setting-row">
            <div>
              <div class="subsync-st-title">영·한 이중자막</div>
              <div class="subsync-st-desc">영어와 한국어 자막 동시 표시</div>
            </div>
            <label class="subsync-switch">
              <input type="checkbox" id="subsync-st-dual" ${s.dualSubtitle ? "checked" : ""}>
              <span class="subsync-slider"></span>
            </label>
          </div>

          <div class="subsync-setting-row">
            <div>
              <div class="subsync-st-title">Hover 단어 학습</div>
              <div class="subsync-st-desc">단어에 마우스 올리면 빠른 뜻 제공</div>
            </div>
            <label class="subsync-switch">
              <input type="checkbox" id="subsync-st-hover" ${s.hoverLearning ? "checked" : ""}>
              <span class="subsync-slider"></span>
            </label>
          </div>

          <div class="subsync-setting-row">
            <div>
              <div class="subsync-st-title">Tutor 선제 질문</div>
              <div class="subsync-st-desc">AI가 영상 속 유용한 표현을 먼저 질문</div>
            </div>
            <label class="subsync-switch">
              <input type="checkbox" id="subsync-st-proactive" ${s.proactiveTutor ? "checked" : ""}>
              <span class="subsync-slider"></span>
            </label>
          </div>

          <div class="subsync-setting-section subsync-theme-section">
            <div class="subsync-st-title">화면 테마</div>
            <div class="subsync-st-desc">SubSync 패널의 색상 테마를 선택</div>
            <div class="subsync-radio-group subsync-theme-group" role="radiogroup" aria-label="화면 테마">
              <label class="subsync-theme-option">
                <input type="radio" name="theme" value="dark" ${theme === "dark" ? "checked" : ""}>
                다크
              </label>
              <label class="subsync-theme-option">
                <input type="radio" name="theme" value="light" ${theme === "light" ? "checked" : ""}>
                화이트
              </label>
              <label class="subsync-theme-option">
                <input type="radio" name="theme" value="glass" ${theme === "glass" ? "checked" : ""}>
                글라스
              </label>
            </div>
          </div>

          <div class="subsync-setting-section subsync-font-section">
            <div class="subsync-st-title">폰트</div>
            <div class="subsync-st-desc">SubSync 화면에 사용할 폰트를 선택</div>
            <div class="subsync-radio-group subsync-font-group" role="radiogroup" aria-label="폰트">
              <label class="subsync-font-option subsync-font-system">
                <input type="radio" name="fontFamily" value="system" ${fontFamily === "system" ? "checked" : ""}>
                <span>
                  <strong>기본 시스템 폰트</strong>
                  <small>-apple-system · Segoe UI · Roboto</small>
                </span>
              </label>
              <label class="subsync-font-option subsync-font-gmarket">
                <input type="radio" name="fontFamily" value="gmarket" ${fontFamily === "gmarket" ? "checked" : ""}>
                <span>
                  <strong>GMarketSans</strong>
                  <small>G마켓 산스 Medium</small>
                </span>
              </label>
            </div>
          </div>
          <div class="subsync-setting-section subsync-about-section" aria-labelledby="subsync-about-title">
            <div id="subsync-about-title" class="subsync-st-title">About</div>
            <div class="subsync-st-desc">엔코아 멀티 에이전트 AI 오케스트레이션 2기</div>
            <div class="subsync-about-team" role="table" aria-label="엔코아 멀티 에이전트 AI 오케스트레이션 2기 팀 정보">
              <div class="subsync-about-team-row subsync-about-team-head" role="row">
                <span role="columnheader">이름</span>
                <span role="columnheader">담당 영역</span>
                <span role="columnheader">GitHub</span>
              </div>
              <div class="subsync-about-team-row" role="row">
                <span role="cell" class="subsync-about-member-name">노지훈</span>
                <span role="cell">PM</span>
                <a role="cell" class="subsync-about-github" href="https://github.com/931njhthe-star" target="_blank" rel="noopener noreferrer" aria-label="노지훈 GitHub 열기">열기 ↗</a>
              </div>
              <div class="subsync-about-team-row" role="row">
                <span role="cell" class="subsync-about-member-name">김훈</span>
                <span role="cell">Frontend</span>
                <a role="cell" class="subsync-about-github" href="https://github.com/teach97" target="_blank" rel="noopener noreferrer" aria-label="김훈 GitHub 열기">열기 ↗</a>
              </div>
              <div class="subsync-about-team-row" role="row">
                <span role="cell" class="subsync-about-member-name">전소예</span>
                <span role="cell">Dashboard</span>
                <a role="cell" class="subsync-about-github" href="https://github.com/soyedev" target="_blank" rel="noopener noreferrer" aria-label="전소예 GitHub 열기">열기 ↗</a>
              </div>
              <div class="subsync-about-team-row" role="row">
                <span role="cell" class="subsync-about-member-name">박서윤</span>
                <span role="cell">Backend</span>
                <a role="cell" class="subsync-about-github" href="https://github.com/seoyun-park" target="_blank" rel="noopener noreferrer" aria-label="박서윤 GitHub 열기">열기 ↗</a>
              </div>
              <div class="subsync-about-team-row" role="row">
                <span role="cell" class="subsync-about-member-name">최경락</span>
                <span role="cell">AI</span>
                <a role="cell" class="subsync-about-github" href="https://github.com/Kyeongrak-Choi" target="_blank" rel="noopener noreferrer" aria-label="최경락 GitHub 열기">열기 ↗</a>
              </div>
            </div>
            <a class="subsync-about-privacy" href="https://931njhthe-star.github.io/subsync-frontend/privacy.html" target="_blank" rel="noopener noreferrer">
              개인정보 처리방침 <span aria-hidden="true">↗</span>
            </a>
          </div>
        </div>
      `;

      document.getElementById("subsync-st-dual")?.addEventListener("change", (e) => {
        SubSync.settings.set("dualSubtitle", e.target.checked);
      });
      document.getElementById("subsync-st-hover")?.addEventListener("change", (e) => {
        SubSync.settings.set("hoverLearning", e.target.checked);
      });
      document.getElementById("subsync-st-proactive")?.addEventListener("change", (e) => {
        SubSync.settings.set("proactiveTutor", e.target.checked);
      });
      containerEl.querySelectorAll('input[name="theme"]').forEach((radio) => {
        radio.addEventListener("change", (e) => {
          if (!e.target.checked) return;
          const nextTheme = ["light", "glass"].includes(e.target.value) ? e.target.value : "dark";
          if (SubSync.theme && SubSync.theme.apply) {
            SubSync.theme.apply(nextTheme);
          }
          SubSync.settings.set("theme", nextTheme);
        });
      });
      containerEl.querySelectorAll('input[name="fontFamily"]').forEach((radio) => {
        radio.addEventListener("change", (e) => {
          if (!e.target.checked) return;
          const nextFont = e.target.value === "gmarket" ? "gmarket" : "system";
          if (SubSync.font && SubSync.font.apply) {
            SubSync.font.apply(nextFont);
          }
          SubSync.settings.set("fontFamily", nextFont);
        });
      });
    }
  };
})();
