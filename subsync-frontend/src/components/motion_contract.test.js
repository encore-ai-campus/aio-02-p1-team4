const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const src = path.join(root, "components");
const styles = path.join(root, "..", "styles");
const layout = fs.readFileSync(path.join(src, "layout.js"), "utf8");
const scriptPanel = fs.readFileSync(path.join(src, "script_panel.js"), "utf8");
const subtitleView = fs.readFileSync(path.join(src, "subtitle_view.js"), "utf8");
const hoverTooltip = fs.readFileSync(path.join(root, "interactive", "hover_tooltip.js"), "utf8");
const clickPopup = fs.readFileSync(path.join(root, "interactive", "click_popup.js"), "utf8");
const authModal = fs.readFileSync(path.join(src, "auth_modal.js"), "utf8");
const subtitleCss = fs.readFileSync(path.join(styles, "subtitle.css"), "utf8");
const manifest = JSON.parse(fs.readFileSync(path.join(root, "..", "manifest.json"), "utf8"));

function readMotionCss() {
  return fs.readFileSync(path.join(styles, "motion.css"), "utf8");
}

test("manifest loads the shared motion stylesheet", () => {
  const stylesheets = manifest.content_scripts.flatMap((item) => item.css || []);
  assert.ok(stylesheets.includes("styles/motion.css"));
  assert.ok(fs.existsSync(path.join(root, "..", "styles", "motion.css")));
});

test("shared motion stylesheet covers interactive states and reduced motion", () => {
  const css = readMotionCss();
  assert.match(css, /@keyframes\s+subsync-/);
  assert.match(css, /subsync-screen-entering/);
  assert.match(css, /subsync-script-panel-open/);
  assert.match(css, /subsync-tooltip-visible/);
  assert.match(css, /subsync-popup-visible/);
  assert.match(css, /subsync-modal-visible/);
  assert.match(css, /prefers-reduced-motion/);
});

test("screen changes, Script toggles, and dynamic content use motion states", () => {
  const css = readMotionCss();
  assert.match(layout, /subsync-screen-entering/);
  assert.match(layout, /SCREEN_ORDER/);
  assert.match(layout, /subsync-screen-direction-forward/);
  assert.match(layout, /subsync-screen-direction-backward/);
  assert.match(css, /subsync-screen-in-forward/);
  assert.match(css, /subsync-screen-in-backward/);
  assert.match(css, /subsync-screen-in-forward[\s\S]*translate3d\(100%,\s*0,\s*0\)/);
  assert.match(css, /subsync-screen-in-backward[\s\S]*translate3d\(-100%,\s*0,\s*0\)/);
  assert.match(scriptPanel, /subsync-script-panel-open/);
  assert.match(scriptPanel, /subsync-script-panel-closing/);
  assert.match(scriptPanel, /subsync-search-open/);
  assert.match(subtitleView, /subsync-content-changing/);
  assert.match(subtitleView, /subsync-caption-entering/);
  assert.match(subtitleView, /drag\.attach\(overlayEl, overlayEl, \{ preserveCenterX: true \}\)/);
});

test("tooltip, detail popup, and auth modal use enter and exit motion states", () => {
  assert.match(hoverTooltip, /subsync-tooltip-visible/);
  assert.match(hoverTooltip, /subsync-tooltip-exiting/);
  assert.match(clickPopup, /subsync-popup-visible/);
  assert.match(clickPopup, /subsync-popup-exiting/);
  assert.match(authModal, /subsync-modal-visible/);
  assert.match(authModal, /subsync-modal-exiting/);
});

test("Script row motion does not clip long subtitle content", () => {
  const css = readMotionCss();
  assert.doesNotMatch(
    css,
    /\.subsync-script-row\s*\{[\s\S]*max-height:\s*180px[\s\S]*overflow:\s*hidden/
  );
});

test("main panel Korean subtitle uses bold weight", () => {
  assert.match(subtitleCss, /\.subsync-sub-known\s*\{[\s\S]*font-weight:\s*700/);
});

test("current subtitle preview motion does not clip long content", () => {
  const css = readMotionCss();
  assert.doesNotMatch(
    css,
    /\.subsync-subtitle-box\s*\{[\s\S]*max-height:\s*220px[\s\S]*overflow:\s*hidden/
  );
  assert.match(css, /\.subsync-subtitle-box\.subsync-subtitle-disabled[\s\S]*overflow:\s*hidden/);
  assert.match(subtitleCss, /\.subsync-subtitle-box\s*\{[\s\S]*width:\s*100%[\s\S]*box-sizing:\s*border-box/);
  assert.match(subtitleCss, /\.subsync-sub-learn,[\s\S]*\.subsync-sub-known[\s\S]*white-space:\s*normal/);
  assert.match(subtitleCss, /overflow-wrap:\s*anywhere/);
});
