// Video Tutor 채팅창 및 피드백 컴포넌트
(function () {
  const SubSync = (window.__SubSync = window.__SubSync || {});

  let proactiveCueKey = null;
  let proactiveInFlight = false;
  let lifecycleGeneration = 0;

  function getRecentSubtitles() {
    return SubSync.getRecentSubtitles ? SubSync.getRecentSubtitles(8) : [];
  }

  function currentPlaybackState() {
    const video = SubSync.player && SubSync.player.getVideo
      ? SubSync.player.getVideo()
      : null;
    return video && (video.paused || video.ended) ? "paused" : "playing";
  }

  SubSync.tutorChat = {
    init(containerEl) {
      if (!containerEl) return;

      lifecycleGeneration += 1;
      proactiveCueKey = null;
      proactiveInFlight = false;
      if (SubSync.tutorService && SubSync.tutorService.resetConversation) {
        SubSync.tutorService.resetConversation();
      }

      containerEl.innerHTML = `
        <div class="subsync-tutor-box">
          <div class="subsync-tutor-header">${SubSync.icon("ai-tutor", "subsync-tutor-icon")}<span>Video Tutor (AI 학습 대화)</span></div>
          <div class="subsync-tutor-messages" id="subsync-tutor-msgs"></div>
          <div class="subsync-tutor-input-box">
            <input type="text" id="subsync-tutor-input" placeholder="영상 내용 질문하기..." />
            <button id="subsync-tutor-send-btn">전송</button>
          </div>
        </div>
      `;

      this.addMessage(
        "tutor",
        "Hello! Feel free to ask any questions about expressions or context in this video."
      );

      const input = document.getElementById("subsync-tutor-input");
      const sendBtn = document.getElementById("subsync-tutor-send-btn");
      if (!input || !sendBtn) return;

      const handleSend = async () => {
        const text = input.value.trim();
        if (!text || sendBtn.disabled) return;
        input.value = "";
        sendBtn.disabled = true;
        this.addMessage("user", text);
        const thinkingEl = this.addThinkingIndicator();

        try {
          const res = await SubSync.tutorService.ask(text, getRecentSubtitles());
          this.removeThinkingIndicator(thinkingEl);
          this.addMessage("tutor", res.reply, res.message_id, res.conversation_id);
        } catch (err) {
          this.removeThinkingIndicator(thinkingEl);
          this.addMessage(
            "tutor",
            err && err.message
              ? `Tutor 연결 실패: ${err.message}`
              : "Tutor 답변을 불러오지 못했습니다. 네트워크를 확인해 주세요."
          );
        } finally {
          this.removeThinkingIndicator(thinkingEl);
          sendBtn.disabled = false;
        }
      };

      sendBtn.addEventListener("click", handleSend);
      input.addEventListener("keydown", (e) => {
        if (e.key === "Enter") handleSend();
      });
    },

    async triggerProactiveIfNeed(currentSubtitleEn) {
      if (
        !currentSubtitleEn ||
        !SubSync.settings.get("subsyncEnabled") ||
        !SubSync.settings.get("tutorEnabled") ||
        !SubSync.settings.get("proactiveTutor")
      ) {
        return;
      }

      const recentSubtitles = getRecentSubtitles();
      const activeContext = recentSubtitles.find(
        (subtitle) => subtitle.learn === currentSubtitleEn
      );
      const cueKey = `${SubSync.getVideoId ? SubSync.getVideoId() : ""}:${
        activeContext ? activeContext.timestamp : currentSubtitleEn
      }`;
      if (proactiveInFlight || proactiveCueKey === cueKey) return;
      proactiveCueKey = cueKey;
      proactiveInFlight = true;
      const generation = lifecycleGeneration;

      try {
        const response = await SubSync.tutorService.checkProactive(recentSubtitles, {
          playbackState: currentPlaybackState()
        });
        if (
          generation !== lifecycleGeneration ||
          !response ||
          !response.should_show ||
          !response.question
        ) {
          return;
        }
        this.addMessage("tutor", response.question);
      } catch (err) {
        console.warn("[SubSync] Tutor 선제 질문 요청 실패:", err && err.message ? err.message : "unknown");
      } finally {
        if (generation === lifecycleGeneration) proactiveInFlight = false;
      }
    },

    addThinkingIndicator() {
      const msgsEl = document.getElementById("subsync-tutor-msgs");
      if (!msgsEl) return null;

      const indicator = document.createElement("div");
      indicator.className = "subsync-msg tutor subsync-msg-thinking";
      indicator.setAttribute("role", "status");
      indicator.setAttribute("aria-label", "답변 준비 중");
      indicator.innerHTML = `
        <span class="subsync-tutor-thinking-dots" aria-hidden="true">
          <span class="subsync-tutor-thinking-dot"></span>
          <span class="subsync-tutor-thinking-dot"></span>
          <span class="subsync-tutor-thinking-dot"></span>
        </span>
      `;
      msgsEl.appendChild(indicator);
      msgsEl.scrollTop = msgsEl.scrollHeight;
      return indicator;
    },

    removeThinkingIndicator(indicator) {
      if (indicator && indicator.parentNode) indicator.remove();
    },

    addMessage(sender, text, messageId, conversationId) {
      const msgsEl = document.getElementById("subsync-tutor-msgs");
      if (!msgsEl) return;

      const msgEl = document.createElement("div");
      msgEl.className = `subsync-msg ${sender}`;

      const textEl = document.createElement("div");
      textEl.className = "subsync-msg-text";

      if (sender === "tutor") {
        SubSync.interactiveText.attach(textEl, text);
      } else {
        textEl.textContent = text;
      }
      msgEl.appendChild(textEl);

      if (sender === "tutor" && messageId) {
        const fbEl = document.createElement("div");
        fbEl.className = "subsync-msg-feedback";
        fbEl.innerHTML = `
          <span class="subsync-fb-label">도움이 되었나요?</span>
          <button class="subsync-fb-btn" data-rating="up" title="도움됨">👍</button>
          <button class="subsync-fb-btn" data-rating="down" title="아쉬움">👎</button>
        `;
        fbEl.querySelectorAll(".subsync-fb-btn").forEach((btn) => {
          btn.addEventListener("click", async () => {
            const rating = btn.dataset.rating;
            btn.disabled = true;
            try {
              await SubSync.tutorService.sendFeedback(
                messageId,
                rating,
                undefined,
                conversationId
              );
              fbEl.innerHTML = `<span class="subsync-fb-done">피드백이 반영되었습니다.</span>`;
            } catch (err) {
              btn.disabled = false;
              console.warn("[SubSync] Tutor feedback failed:", err && err.message ? err.message : "unknown");
            }
          });
        });
        msgEl.appendChild(fbEl);
      }

      msgsEl.appendChild(msgEl);
      msgsEl.scrollTop = msgsEl.scrollHeight;
    }
  };
})();
