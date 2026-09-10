const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const source = fs.readFileSync(path.join(__dirname, "tutor_service.js"), "utf8");

function loadTutorService(response = {}) {
  const calls = [];
  const SubSync = {
    getVideoId: () => "video-1",
    player: {
      getCurrentTime: () => 12.5
    },
    apiClient: {
      async request(endpoint, options) {
        calls.push({ endpoint, options });
        return response;
      }
    }
  };
  const context = { console, URL, window: { __SubSync: SubSync } };
  context.__SubSync = SubSync;
  vm.runInNewContext(source, context, { filename: "tutor_service.js" });
  return { tutorService: SubSync.tutorService, calls };
}

test("sends the backend-shaped Tutor ask payload and keeps the conversation", async () => {
  const response = {
    conversation_id: "conv-1",
    message_id: "msg-1",
    reply: "It means leaving the island.",
    suggested_questions: [],
    provider: "stub",
    model: "rule-based",
    usage: { input_tokens: 1, output_tokens: 2, total_tokens: 3 }
  };
  const { tutorService, calls } = loadTutorService(response);

  const result = await tutorService.ask(
    "What does this mean?",
    [{ timestamp: 10, learn: "Our only way off this island", known: "이 섬을 빠져나갈 유일한 방법" }],
    { focusWord: "way off" }
  );

  assert.equal(result, response);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].endpoint, "/tutor/ask");
  assert.deepEqual(JSON.parse(calls[0].options.body), {
    video_id: "video-1",
    timestamp: 12.5,
    user_message: "What does this mean?",
    recent_subtitles: [
      { time: 10, en: "Our only way off this island", ko: "이 섬을 빠져나갈 유일한 방법" }
    ],
    conversation_history: [],
    focus_word: "way off"
  });

  await tutorService.ask("And in another sentence?", []);
  const secondPayload = JSON.parse(calls[1].options.body);
  assert.equal(secondPayload.conversation_id, "conv-1");
  assert.deepEqual(secondPayload.conversation_history, [
    { role: "user", message: "What does this mean?" },
    { role: "tutor", message: "It means leaving the island." }
  ]);
});

test("sends the backend-shaped proactive request", async () => {
  const response = {
    should_show: true,
    reason: "new_expression",
    question_id: "question-1",
    question: "What does this expression mean?",
    focus_word: "way off",
    expires_in_seconds: 20
  };
  const { tutorService, calls } = loadTutorService(response);

  const result = await tutorService.checkProactive(
    [{ timestamp: 10, learn: "Our only way off this island", known: "이 섬을 빠져나갈 유일한 방법" }],
    { playbackState: "playing" }
  );

  assert.equal(result, response);
  assert.equal(calls[0].endpoint, "/tutor/proactive");
  assert.deepEqual(JSON.parse(calls[0].options.body), {
    video_id: "video-1",
    timestamp: 12.5,
    recent_subtitles: [
      { time: 10, en: "Our only way off this island", ko: "이 섬을 빠져나갈 유일한 방법" }
    ],
    playback_state: "playing",
    last_question_id: null,
    last_question_at: null
  });
});

test("maps UI feedback ratings and sends the active conversation ID", async () => {
  const response = { conversation_id: "conv-1", message_id: "msg-1", reply: "Answer" };
  const { tutorService, calls } = loadTutorService(response);
  await tutorService.ask("Question", []);

  await tutorService.sendFeedback("msg-1", "up");
  assert.equal(calls[1].endpoint, "/tutor/feedback");
  assert.deepEqual(JSON.parse(calls[1].options.body), {
    conversation_id: "conv-1",
    message_id: "msg-1",
    rating: "helpful"
  });
});
