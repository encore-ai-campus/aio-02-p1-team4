const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const filename = path.join(__dirname, "captions.js");
const source = fs.readFileSync(filename, "utf8");

function response(events) {
  return {
    ok: true,
    async text() {
      return JSON.stringify({ events });
    }
  };
}

function loadCaptions(fetchImpl) {
  const context = {
    console,
    URL,
    location: { origin: "https://www.youtube.com" },
    fetch: fetchImpl
  };
  context.window = context;
  context.__SubSync = {};
  vm.runInNewContext(source, context, { filename });
  return context.__SubSync;
}

function normalEvents() {
  return [
    { tStartMs: 0, dDurationMs: 900, segs: [{ utf8: "First sentence." }] },
    { tStartMs: 1000, dDurationMs: 900, segs: [{ utf8: "Second sentence." }] },
    { tStartMs: 2000, dDurationMs: 900, segs: [{ utf8: "Third sentence." }] }
  ];
}

test("empty track metadata requests the source language directly", async () => {
  const calls = [];
  const wholeTranscript = "A ".repeat(1200);
  const SubSync = loadCaptions(async (url) => {
    calls.push(url);
    const parsed = new URL(url);
    if (parsed.searchParams.get("tlang") === "en") {
      return response([
        { tStartMs: 129, dDurationMs: 827000, segs: [{ utf8: wholeTranscript }] }
      ]);
    }
    return response(normalEvents());
  });

  const subtitles = await SubSync.buildSubtitlesFromUrl(
    "fixture",
    "https://www.youtube.com/api/timedtext?x=1",
    { tracks: [], learnLang: "en", knownLang: "ko" }
  );

  const learnRequest = new URL(calls[0]);
  assert.equal(learnRequest.searchParams.get("lang"), "en");
  assert.notEqual(learnRequest.searchParams.get("tlang"), "en");
  assert.equal(subtitles.length, 3);
  assert.ok(Math.max(...subtitles.map((item) => item.learn.length)) < 500);
});

test("assigns all matching known cues to one learn cue without pulling the next cue", async () => {
  const SubSync = loadCaptions(async (url) => {
    const parsed = new URL(url);
    if (parsed.searchParams.get("lang") === "ko") {
      return response([
        { tStartMs: 0, dDurationMs: 2000, segs: [{ utf8: "이 제트팩은 시속 약 130km로 날 수 있죠" }] },
        { tStartMs: 2000, dDurationMs: 2000, segs: [{ utf8: "5킬로미터까지 이동이 가능해요" }] },
        { tStartMs: 8000, dDurationMs: 1000, segs: [{ utf8: "다음 문장입니다." }] }
      ]);
    }
    return response([
      {
        tStartMs: 0,
        dDurationMs: 5000,
        segs: [{ utf8: "This jetpack can fly over 80 miles an hour, and with a three mile range," }]
      },
      { tStartMs: 8000, dDurationMs: 1000, segs: [{ utf8: "Next sentence." }] }
    ]);
  });

  const subtitles = await SubSync.buildSubtitlesFromUrl(
    "fixture",
    "https://www.youtube.com/api/timedtext?x=1",
    { tracks: [{ lang: "en" }, { lang: "ko" }], learnLang: "en", knownLang: "ko" }
  );

  assert.equal(subtitles[0].known, "이 제트팩은 시속 약 130km로 날 수 있죠 5킬로미터까지 이동이 가능해요");
  assert.equal(subtitles[1].known, "다음 문장입니다.");
});

test("deduplicates identical overlapping known cues within one learn cue", async () => {
  const SubSync = loadCaptions(async (url) => {
    const parsed = new URL(url);
    if (parsed.searchParams.get("lang") === "ko") {
      return response([
        { tStartMs: 0, dDurationMs: 2000, segs: [{ utf8: "중복 번역" }] },
        { tStartMs: 0, dDurationMs: 2000, segs: [{ utf8: "중복 번역" }] }
      ]);
    }
    return response([
      { tStartMs: 0, dDurationMs: 3000, segs: [{ utf8: "One sentence." }] }
    ]);
  });

  const subtitles = await SubSync.buildSubtitlesFromUrl(
    "fixture",
    "https://www.youtube.com/api/timedtext?x=1",
    { tracks: [{ lang: "en" }, { lang: "ko" }], learnLang: "en", knownLang: "ko" }
  );

  assert.equal(subtitles[0].known, "중복 번역");
});

test("does not duplicate a known cue across adjacent learn cues", async () => {
  const SubSync = loadCaptions(async (url) => {
    const parsed = new URL(url);
    if (parsed.searchParams.get("lang") === "ko") {
      return response([
        { tStartMs: 0, dDurationMs: 2000, segs: [{ utf8: "첫 번째 번역" }] },
        { tStartMs: 2900, dDurationMs: 200, segs: [{ utf8: "두 번째 번역" }] }
      ]);
    }
    return response([
      { tStartMs: 0, dDurationMs: 3000, segs: [{ utf8: "First sentence." }] },
      { tStartMs: 6000, dDurationMs: 2000, segs: [{ utf8: "Second sentence." }] }
    ]);
  });

  const subtitles = await SubSync.buildSubtitlesFromUrl(
    "fixture",
    "https://www.youtube.com/api/timedtext?x=1",
    { tracks: [{ lang: "en" }, { lang: "ko" }], learnLang: "en", knownLang: "ko" }
  );

  assert.equal(subtitles[0].known, "첫 번째 번역 두 번째 번역");
  assert.equal(subtitles[1].known, "");
});

test("uses each native language track's own signed base URL", async () => {
  const calls = [];
  const SubSync = loadCaptions(async (url) => {
    calls.push(url);
    const parsed = new URL(url);
    return parsed.searchParams.get("lang") === "ko"
      ? response([{ tStartMs: 0, dDurationMs: 1000, segs: [{ utf8: "번역" }] }])
      : response([{ tStartMs: 0, dDurationMs: 1000, segs: [{ utf8: "Caption." }] }]);
  });

  await SubSync.buildSubtitlesFromUrl(
    "video-1",
    "https://www.youtube.com/api/timedtext?v=video-1&lang=en&sig=english",
    {
      tracks: [
        {
          lang: "en",
          baseUrl: "https://www.youtube.com/api/timedtext?v=video-1&lang=en&sig=english"
        },
        {
          lang: "ko",
          baseUrl: "https://www.youtube.com/api/timedtext?v=video-1&lang=ko&sig=korean"
        }
      ],
      learnLang: "en",
      knownLang: "ko"
    }
  );

  const knownRequest = new URL(calls[1]);
  assert.equal(knownRequest.searchParams.get("lang"), "ko");
  assert.equal(knownRequest.searchParams.get("sig"), "korean");
  assert.equal(knownRequest.searchParams.has("tlang"), false);
});

test("reports an HTTP 429 source failure instead of silently returning an unexplained empty build", async () => {
  const statuses = [];
  const SubSync = loadCaptions(async () => ({
    ok: false,
    status: 429,
    async text() {
      return "";
    }
  }));

  const subtitles = await SubSync.buildSubtitlesFromUrl(
    "video-1",
    "https://www.youtube.com/api/timedtext?v=video-1&lang=en",
    {
      tracks: [{ lang: "en" }],
      learnLang: "en",
      knownLang: "ko",
      onStatus(status) {
        statuses.push(status);
      }
    }
  );

  assert.equal(subtitles.length, 0);
  assert.equal(statuses.at(-1).state, "error");
  assert.equal(statuses.at(-1).phase, "learn");
  assert.equal(statuses.at(-1).code, "http");
  assert.equal(statuses.at(-1).httpStatus, 429);
});

test("uses the page-context caption fetcher when provided", async () => {
  const pageCalls = [];
  const SubSync = loadCaptions(async () => ({
    ok: false,
    status: 429,
    async text() {
      return "";
    }
  }));

  const subtitles = await SubSync.buildSubtitlesFromUrl(
    "video-1",
    "https://www.youtube.com/api/timedtext?v=video-1&lang=en",
    {
      tracks: [{ lang: "en" }],
      learnLang: "en",
      knownLang: "ko",
      fetchCaption: async (url) => {
        pageCalls.push(url);
        return response([
          { tStartMs: 0, dDurationMs: 1000, segs: [{ utf8: url.includes("tlang=ko") ? "번역" : "Caption." }] }
        ]);
      }
    }
  );

  assert.equal(pageCalls.length, 2);
  assert.equal(subtitles[0].learn, "Caption.");
  assert.equal(subtitles[0].known, "번역");
});
