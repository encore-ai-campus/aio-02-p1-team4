const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const subtitleCss = fs.readFileSync(
  path.join(__dirname, "..", "..", "styles", "subtitle.css"),
  "utf8"
);
const interactiveCss = fs.readFileSync(
  path.join(__dirname, "..", "..", "styles", "interactive.css"),
  "utf8"
);

function ruleFor(css, selector) {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return css.match(new RegExp(`${escaped}\\s*\\{([\\s\\S]*?)\\}`))?.[1] || "";
}

test("all bilingual subtitle surfaces keep vertical rhythm and compact word gaps", () => {
  const englishRule = ruleFor(subtitleCss, ".subsync-overlay-en");
  const koreanRule = ruleFor(subtitleCss, ".subsync-overlay-ko");
  const overlayWordRule = ruleFor(subtitleCss, ".subsync-overlay-en .subsync-word");
  const globalWordRule = ruleFor(interactiveCss, ".subsync-word");

  assert.match(englishRule, /line-height:\s*1\.35/);
  assert.match(koreanRule, /margin-top:\s*4px/);
  assert.match(koreanRule, /line-height:\s*1\.3/);
  assert.match(overlayWordRule, /padding:\s*1px\s+1px/);
  assert.match(globalWordRule, /padding:\s*0\s+1px/);
});
