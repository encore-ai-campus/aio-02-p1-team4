const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const settingsView = fs.readFileSync(path.join(__dirname, "settings_view.js"), "utf8");

const team = [
  ["노지훈", "PM", "https://github.com/931njhthe-star"],
  ["김훈", "Frontend", "https://github.com/teach97"],
  ["전소예", "Dashboard", "https://github.com/soyedev"],
  ["박서윤", "Backend", "https://github.com/seoyun-park"],
  ["최경락", "AI", "https://github.com/Kyeongrak-Choi"]
];

test("Settings About section exposes the cohort and team information", () => {
  assert.match(settingsView, /subsync-about-section/);
  assert.match(settingsView, />About<\/div>/);
  assert.match(settingsView, /엔코아 멀티 에이전트 AI 오케스트레이션 2기/);
  const teamTableStart = settingsView.indexOf('<div class="subsync-about-team-row');
  const teamTableEnd = settingsView.indexOf('<a class="subsync-about-privacy"', teamTableStart);
  const teamTable = settingsView.slice(teamTableStart, teamTableEnd);
  assert.ok(teamTableStart >= 0);
  assert.ok(teamTableEnd > teamTableStart);
  assert.match(teamTable, /<span role="columnheader">담당 영역<\/span>/);
  assert.doesNotMatch(teamTable, /역할 · 담당 영역/);

  for (const [name, area, github] of team) {
    assert.match(settingsView, new RegExp(name));
    assert.match(settingsView, new RegExp(area.replace(/[.*+?^${}()|[\\]\\]/g, "\\$&")));
    assert.match(settingsView, new RegExp(github.replace(/[.*+?^${}()|[\\]\\]/g, "\\$&")));
  }

  assert.doesNotMatch(teamTable, /팀장|팀원|Project Management &amp; Backend|Artificial Intelligence|\bFE\b|\bDB\b|\bBE\b/);
});

test("Settings About section links to the published privacy policy safely", () => {
  assert.match(
    settingsView,
    /https:\/\/931njhthe-star\.github\.io\/subsync-frontend\/privacy\.html/
  );
  assert.match(settingsView, /target="_blank"/);
  assert.match(settingsView, /rel="noopener noreferrer"/);
  assert.match(settingsView, /개인정보\s*처리방침/);
});
