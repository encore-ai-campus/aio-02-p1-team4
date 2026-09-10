// Video Tutor API 서비스 (질의응답, 선제 질문, 피드백)
(function () {
  const SubSync = (window.__SubSync = window.__SubSync || {});

  let conversationId = null;
  let conversationHistory = [];
  let lastQuestionId = null;
  let lastQuestionAt = null;

  function currentVideoId() {
    return SubSync.getVideoId ? SubSync.getVideoId() : "";
  }

  function currentTimestamp() {
    return SubSync.player && SubSync.player.getCurrentTime
      ? Number(SubSync.player.getCurrentTime()) || 0
      : 0;
  }

  function normalizeSubtitle(line) {
    if (!line) return null;
    const time = Number(line.time ?? line.timestamp);
    const en = String(line.en ?? line.learn ?? "").trim();
    const koValue = line.ko ?? line.known;
    const ko = koValue === undefined || koValue === null ? null : String(koValue).trim();
    if (!Number.isFinite(time) || !en) return null;
    return { time, en, ko: ko || null };
  }

  function normalizeSubtitles(lines) {
    return (Array.isArray(lines) ? lines : [])
      .map(normalizeSubtitle)
      .filter(Boolean)
      .slice(-100);
  }

  function appendConversation(userMessage, reply) {
    if (!reply) return;
    conversationHistory = [
      ...conversationHistory,
      { role: "user", message: userMessage },
      { role: "tutor", message: String(reply) }
    ].slice(-10);
  }

  function mapFeedbackRating(rating) {
    if (rating === "up" || rating === "helpful") return "helpful";
    if (rating === "down" || rating === "not_helpful") return "not_helpful";
    return rating;
  }

  SubSync.tutorService = {
    async ask(userMessage, recentSubtitles = [], options = {}) {
      const body = {
        video_id: currentVideoId(),
        timestamp: currentTimestamp(),
        user_message: String(userMessage || "").trim(),
        recent_subtitles: normalizeSubtitles(recentSubtitles),
        conversation_history: Array.isArray(options.conversationHistory)
          ? options.conversationHistory.slice(-10)
          : conversationHistory.slice(-10)
      };

      const requestedConversationId = options.conversationId || conversationId;
      if (requestedConversationId) body.conversation_id = requestedConversationId;
      if (options.focusWord) body.focus_word = String(options.focusWord).trim();
      if (options.learnerSignals) body.learner_signals = options.learnerSignals;

      const response = await SubSync.apiClient.request("/tutor/ask", {
        method: "POST",
        body: JSON.stringify(body)
      });

      if (!response || typeof response.reply !== "string" || !response.reply.trim()) {
        throw new Error("Tutor 응답에 답변이 없습니다.");
      }
      conversationId = response.conversation_id || requestedConversationId || null;
      appendConversation(body.user_message, response.reply);
      return response;
    },

    async checkProactive(recentSubtitles = [], options = {}) {
      const body = {
        video_id: currentVideoId(),
        timestamp: currentTimestamp(),
        recent_subtitles: normalizeSubtitles(recentSubtitles),
        playback_state: options.playbackState || "playing",
        last_question_id: options.lastQuestionId ?? lastQuestionId,
        last_question_at: options.lastQuestionAt ?? lastQuestionAt
      };
      const response = await SubSync.apiClient.request("/tutor/proactive", {
        method: "POST",
        body: JSON.stringify(body)
      });
      if (response && response.should_show) {
        lastQuestionId = response.question_id || null;
        lastQuestionAt = currentTimestamp();
      }
      return response;
    },

    async sendFeedback(messageId, rating, reason, requestedConversationId, comment) {
      const body = {
        conversation_id: requestedConversationId || conversationId || "",
        message_id: messageId,
        rating: mapFeedbackRating(rating)
      };
      if (reason) body.reason = reason;
      if (comment) body.comment = comment;
      if (!body.conversation_id) {
        throw new Error("Tutor 대화 ID가 없어 피드백을 보낼 수 없습니다.");
      }
      return await SubSync.apiClient.request("/tutor/feedback", {
        method: "POST",
        body: JSON.stringify(body)
      });
    },

    resetConversation() {
      conversationId = null;
      conversationHistory = [];
      lastQuestionId = null;
      lastQuestionAt = null;
    },

    getConversationId() {
      return conversationId;
    }
  };
})();
