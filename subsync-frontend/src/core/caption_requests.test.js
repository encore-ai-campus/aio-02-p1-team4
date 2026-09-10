const test = require("node:test");
const assert = require("node:assert/strict");

const {
  applyCapturedCaptionRequest,
  captionRequestCacheKeys,
  captionRequestFromUrl,
  isFreshCaptionRequest
} = require("./caption_requests.js");

const CAPTURED_URL =
  "https://www.youtube.com/api/timedtext?v=video-1&lang=en&fmt=json3&pot=token-1&potc=1&c=WEB&cver=2&cplayer=WEB";

test("accepts only YouTube timedtext requests carrying a PO token", () => {
  const request = captionRequestFromUrl(CAPTURED_URL, 1000);
  assert.equal(request.videoId, "video-1");
  assert.equal(request.languageCode, "en");
  assert.equal(request.capturedAt, 1000);
  assert.equal(captionRequestFromUrl(CAPTURED_URL.replace("&pot=token-1", ""), 1000), null);
  assert.equal(captionRequestFromUrl("https://evil.example/api/timedtext?v=video-1&pot=token-1", 1000), null);
});

test("prefers language-specific cache before the per-video fallback", () => {
  const keys = captionRequestCacheKeys(7, "video-1", "ko");
  assert.equal(keys.length, 2);
  assert.notEqual(keys[0], keys[1]);
  assert.deepEqual(captionRequestCacheKeys(7, "video-1", ""), [keys[1]]);
});

test("copies observed PO/client context while preserving target language", () => {
  const target = "https://www.youtube.com/api/timedtext?v=video-1&lang=en&tlang=ko&fmt=json3";
  const result = new URL(applyCapturedCaptionRequest(target, CAPTURED_URL));
  assert.equal(result.searchParams.get("lang"), "en");
  assert.equal(result.searchParams.get("tlang"), "ko");
  assert.equal(result.searchParams.get("fmt"), "json3");
  assert.equal(result.searchParams.get("pot"), "token-1");
  assert.equal(result.searchParams.get("potc"), "1");
  assert.equal(result.searchParams.get("c"), "WEB");
  assert.equal(result.searchParams.get("cver"), "2");
  assert.equal(result.searchParams.get("cplayer"), "WEB");
});

test("does not copy a token from another video", () => {
  const target = "https://www.youtube.com/api/timedtext?v=video-2&lang=en&fmt=json3";
  assert.equal(applyCapturedCaptionRequest(target, CAPTURED_URL), target);
});

test("expires observed request context after its temporary lifetime", () => {
  const request = captionRequestFromUrl(CAPTURED_URL, 1000);
  assert.equal(isFreshCaptionRequest(request, 1000), true);
  assert.equal(isFreshCaptionRequest(request, 1000 + 30 * 60 * 1000 + 1), false);
});
