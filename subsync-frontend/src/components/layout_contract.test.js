const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const layout = fs.readFileSync(path.join(root, "components", "layout.js"), "utf8");
const scriptPanel = fs.readFileSync(path.join(root, "components", "script_panel.js"), "utf8");
const mainCss = fs.readFileSync(path.join(root, "..", "styles", "main.css"), "utf8");
const scriptCss = fs.readFileSync(path.join(root, "..", "styles", "script.css"), "utf8");
const tutorCss = fs.readFileSync(path.join(root, "..", "styles", "tutor.css"), "utf8");
const tutorChat = fs.readFileSync(path.join(root, "components", "tutor_chat.js"), "utf8");
const manifest = JSON.parse(fs.readFileSync(path.join(root, "..", "manifest.json"), "utf8"));

test("main header does not render the unauthenticated status badge", () => {
  assert.doesNotMatch(layout, /subsync-auth-status|비로그인/);
});

test("quick bar uses a panel icon instead of the settings gear", () => {
  assert.match(
    layout,
    /id="subsync-qb-open-btn"[^>]*>\$\{SubSync\.icon\("collapse", "subsync-qb-expand-icon"\)\}<\/button>/
  );
  assert.doesNotMatch(layout, /id="subsync-qb-open-btn"[^>]*>▣<\/button>/);
  assert.doesNotMatch(layout, /id="subsync-qb-open-btn"[^>]*>⚙️<\/button>/);
});

test("main layout exposes an inline Script mount and resizer", () => {
  assert.match(layout, /id="subsync-inline-script-area"/);
  assert.match(layout, /SubSync\.resize\.attach\(rootEl/);
  assert.match(layout, /getScriptArea\(\)/);
});

test("top navigation replaces the separate wordbook and learning-history tabs with Storage", () => {
  assert.match(layout, /data-screen="storage"[^>]*>[\s\S]*저장소/);
  assert.doesNotMatch(layout, /data-screen="words"/);
  assert.doesNotMatch(layout, /data-screen="history"/);
  assert.doesNotMatch(layout, />단어장<\/span>/);
  assert.doesNotMatch(layout, />학습기록<\/span>/);
  assert.match(layout, /id="subsync-screen-storage"/);
});

test("navigation uses one moving active indicator instead of per-tab background swaps", () => {
  assert.match(layout, /class="subsync-nav-active-indicator"/);
  assert.match(layout, /function updateNavIndicator\(\)/);
  assert.match(layout, /updateNavIndicator\(\)/);
  assert.match(mainCss, /\.subsync-nav-active-indicator[\s\S]*transition:[\s\S]*transform[\s\S]*width/);
  assert.match(mainCss, /\.subsync-nav-btn\.active\s*\{[\s\S]*background:\s*transparent/);
});

test("video screen does not render a second Script open button", () => {
  assert.doesNotMatch(layout, /id="subsync-open-script-from-video"/);
  assert.doesNotMatch(layout, /videoScriptBtn/);
});

test("Script panel title uses the compact Script label", () => {
  assert.match(scriptPanel, /subsync-script-title-text">Script<\/span>/);
  assert.doesNotMatch(scriptPanel, /subsync-script-title-text">전체 Script<\/span>/);
  assert.match(scriptCss, /\.subsync-script-header-title\s*\{[\s\S]*gap:\s*2px/);
});

test("Script panel mounts inside the main panel instead of document body", () => {
  assert.match(scriptPanel, /getScriptArea\(\)/);
  assert.doesNotMatch(scriptPanel, /document\.body\.appendChild\(containerEl\)/);
});


test("Script panel exposes an accessible collapse and expand control", () => {
  assert.match(scriptPanel, /id="subsync-script-collapse-btn"/);
  assert.match(scriptPanel, /setCollapsed\(/);
  assert.match(scriptPanel, /subsync-script-panel-collapsed/);
  assert.match(scriptPanel, /let isCollapsed = true/);
  assert.match(scriptPanel, /aria-expanded="false"/);
  assert.match(scriptPanel, /style\.display = "flex"/);
  assert.match(
    scriptPanel,
    /subsync-script-panel-container subsync-inline-script-panel subsync-script-panel-open subsync-script-panel-collapsed/
  );
  assert.match(scriptCss, /\.subsync-script-panel-container\.subsync-script-panel-collapsed/);
  assert.match(scriptCss, /\.subsync-script-list[\s\S]*max-height/);
  assert.doesNotMatch(
    scriptCss,
    /\.subsync-script-panel-container\.subsync-script-panel-collapsed\s*\{[\s\S]*display:\s*none/
  );
});

test("the Tutor mount is a host and renders only one Tutor surface", () => {
  const tutorMount = layout.match(/<div id="subsync-tutor-area"[^>]*>/);
  assert.ok(tutorMount, "Tutor mount should exist");
  assert.doesNotMatch(tutorMount[0], /subsync-tutor-box/);
  assert.equal((tutorChat.match(/class="subsync-tutor-box"/g) || []).length, 1);
});

test("Manifest loads the resize controller before layout", () => {
  const scripts = manifest.content_scripts.flatMap((item) => item.js || []);
  const resizeIndex = scripts.indexOf("src/interactive/resize_controller.js");
  const layoutIndex = scripts.indexOf("src/components/layout.js");
  assert.ok(resizeIndex >= 0);
  assert.ok(layoutIndex >= 0);
  assert.ok(resizeIndex < layoutIndex);
});

test("main panel is positioned below the quick bar when it opens", () => {
  assert.match(layout, /function positionMainPanelBelowQuickBar\(\)/);
  assert.match(layout, /quickBarEl\.getBoundingClientRect\(\)/);
  assert.match(layout, /quickBarRect\.bottom/);
  assert.match(layout, /rootEl\.style\.left/);
  assert.match(layout, /rootEl\.style\.top/);
  assert.match(layout, /positionMainPanelBelowQuickBar\(\)/);
});

test("main panel header double-click resets its position with a return transition", () => {
  assert.match(layout, /function resetMainPanelPosition\(\)/);
  assert.match(layout, /addEventListener\("dblclick"/);
  assert.match(layout, /subsync-position-resetting/);
  assert.match(mainCss, /\.subsync-container\.subsync-position-resetting[\s\S]*left[\s\S]*top/);
});

test("main panel uses a macOS-style spring transition for opening and closing", () => {
  assert.match(layout, /subsync-panel-closed/);
  assert.match(mainCss, /transform-origin:\s*top\s+right/);
  assert.match(mainCss, /cubic-bezier\(/);
  assert.match(mainCss, /prefers-reduced-motion/);
});

test("the inline Script grows with the resized main panel", () => {
  assert.match(layout, /activePanel\.style\.display = "flex"/);
  assert.match(mainCss, /\.subsync-inline-script-area[\s\S]*flex:\s*1\s*1\s*auto/);
  assert.match(mainCss, /\.subsync-inline-script-area[\s\S]*min-height:\s*0/);
  assert.match(scriptCss, /\.subsync-inline-script-panel[\s\S]*flex:\s*1\s*1\s*auto/);
  assert.match(scriptCss, /\.subsync-inline-script-panel[\s\S]*max-height:\s*none/);
});

test("the AI Tutor content fills the resized main panel", () => {
  assert.match(mainCss, /#subsync-screen-tutor[\s\S]*display:\s*flex/);
  assert.match(mainCss, /#subsync-tutor-area[\s\S]*flex:\s*1\s*1\s*auto/);
  assert.match(tutorCss, /\.subsync-tutor-box[\s\S]*min-height:\s*0/);
  assert.match(tutorCss, /\.subsync-tutor-messages[\s\S]*flex:\s*1\s*1\s*auto/);
  assert.match(tutorCss, /\.subsync-tutor-messages[\s\S]*max-height:\s*none/);
});

test("authentication changes rerender the current data screen", () => {
  const authSectionStart = layout.indexOf("// 로그인/로그아웃 버튼");
  const screenSwitchStart = layout.indexOf("switchScreen(screenName)");
  const authSection = layout.slice(authSectionStart, screenSwitchStart);

  assert.match(layout, /renderCurrentScreen\(\)/);
  assert.match(authSection, /authModal\.show\((?:async )?\(\) => \{[\s\S]*renderCurrentScreen\(\)/);
  assert.match(authSection, /await this\.renderCurrentScreen\(\)/);
});
