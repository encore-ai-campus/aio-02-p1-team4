const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..", "..");
const iconDir = path.join(root, "assets", "icons");
const layout = fs.readFileSync(path.join(root, "src", "components", "layout.js"), "utf8");
const authModal = fs.readFileSync(path.join(root, "src", "components", "auth_modal.js"), "utf8");
const scriptPanel = fs.readFileSync(path.join(root, "src", "components", "script_panel.js"), "utf8");
const tutorChat = fs.readFileSync(path.join(root, "src", "components", "tutor_chat.js"), "utf8");
const iconAssets = fs.readFileSync(path.join(root, "src", "core", "icon_assets.js"), "utf8");
const iconCss = fs.readFileSync(path.join(root, "styles", "icons.css"), "utf8");
const themeCss = fs.readFileSync(path.join(root, "styles", "theme.css"), "utf8");
const searchSvg = fs.readFileSync(path.join(iconDir, "search.svg"), "utf8");
const collapseSvg = fs.readFileSync(path.join(iconDir, "collapse.svg"), "utf8");
const manifest = JSON.parse(fs.readFileSync(path.join(root, "manifest.json"), "utf8"));

const icons = [
  "video-learning",
  "ai-tutor",
  "vocabulary",
  "learning-history",
  "settings",
  "script",
  "search",
  "collapse",
  "refresh",
  "google",
  "star",
  "star-filled"
];

test("the original SubSync icon set contains twelve local SVG assets", () => {
  for (const name of icons) {
    const svg = fs.readFileSync(path.join(iconDir, `${name}.svg`), "utf8");
    assert.match(svg, /^<svg\b/);
    assert.match(svg, name === "google" ? /viewBox="0 0 118 120"/ : /viewBox="0 0 24 24"/);
    assert.match(svg, /stroke=/);
    assert.doesNotMatch(svg, /<script\b|<image\b|(?:href|xlink:href)=["']https?:\/\//i);
  }
});

test("icon assets use an extension URL helper and are exposed to YouTube", () => {
  assert.match(iconAssets, /chrome\.runtime\.getURL/);
  assert.match(iconAssets, /assets\/icons/);
  assert.ok(manifest.content_scripts[1].js.includes("src/core/icon_assets.js"));
  assert.ok(
    manifest.content_scripts[1].js.indexOf("src/core/icon_assets.js") <
      manifest.content_scripts[1].js.indexOf("src/components/layout.js")
  );
  assert.equal(manifest.web_accessible_resources.length, 1);
  assert.deepEqual(manifest.web_accessible_resources[0].matches, ["https://www.youtube.com/*"]);
  assert.ok(manifest.web_accessible_resources[0].resources.includes("assets/icons/*.svg"));
  assert.ok(manifest.web_accessible_resources[0].resources.includes("assets/fonts/*.woff"));
});

test("the feature controls use the original SVG icon set", () => {
  assert.match(layout, /SubSync\.icon\("video-learning"/);
  assert.match(layout, /SubSync\.icon\("ai-tutor"/);
  assert.match(layout, /SubSync\.icon\("vocabulary"/);
  assert.doesNotMatch(layout, /SubSync\.icon\("learning-history"/);
  assert.match(layout, /SubSync\.icon\("settings"/);
  assert.match(layout, /SubSync\.icon\("script"/);
  assert.match(scriptPanel, /SubSync\.icon\("script"/);
  assert.match(scriptPanel, /SubSync\.icon\("search"/);
  assert.match(scriptPanel, /SubSync\.icon\("collapse"/);
  assert.match(tutorChat, /SubSync\.icon\("ai-tutor"/);
  assert.match(
    layout,
    /id="subsync-auth-btn" class="subsync-btn-small" type="button" title="로그인" aria-label="로그인">로그인<\/button>/
  );
  assert.doesNotMatch(layout, /SubSync\.icon\("google"/);
  assert.match(authModal, /id="subsync-auth-google-btn"/);
  assert.match(authModal, /googleButtonMarkup\(\)/);
  assert.match(authModal, /aria-label="Google로 계속하기"/);
  assert.doesNotMatch(authModal, /subsync-auth-google-label/);

  for (const legacyIcon of ["📺", "🤖", "⭐", "📊", "⚙️", "📜"]) {
    assert.doesNotMatch(layout, new RegExp(legacyIcon));
  }
  assert.doesNotMatch(scriptPanel, /<span class="subsync-script-icon">📜<\/span>/);
  assert.doesNotMatch(scriptPanel, />🔍<\/button>/);
  assert.doesNotMatch(scriptPanel, />⌃<\/button>/);
  assert.doesNotMatch(tutorChat, /<div class="subsync-tutor-header">🤖/);
});

test("icon CSS keeps SVG sizing and state styling scoped to SubSync controls", () => {
  assert.match(iconCss, /\.subsync-ui-icon\s*\{/);
  assert.match(iconCss, /width:\s*16px/);
  assert.match(iconCss, /height:\s*16px/);
  assert.match(iconCss, /\.subsync-nav-btn[^}]*\.subsync-ui-icon/);
  assert.match(iconCss, /\.subsync-nav-btn\.active[^}]*\.subsync-ui-icon/);
  assert.doesNotMatch(iconCss, /\.subsync-auth-icon/);
  assert.match(iconCss, /\.subsync-auth-google-icon\s*\{[\s\S]*display:\s*block[\s\S]*width:\s*18px[\s\S]*height:\s*18px[\s\S]*flex:\s*0\s+0\s+18px[\s\S]*opacity:\s*1/);
  assert.match(iconCss, /\.subsync-script-panel-container\s+\.subsync-script-collapse-btn[\s\S]*left:\s*50%/);
  assert.match(iconCss, /subsync-script-collapse-collapsed/);
});

test("quick bar panel toggle reuses the circular collapse icon", () => {
  assert.match(layout, /SubSync\.icon\("collapse", "subsync-qb-expand-icon"\)/);
  assert.match(
    iconCss,
    /\.subsync-qb-panel-toggle\s*\{[\s\S]*width:\s*22px[\s\S]*height:\s*22px[\s\S]*padding:\s*0/
  );
  assert.match(
    iconCss,
    /\.subsync-qb-expand-icon\s*\{[\s\S]*width:\s*22px[\s\S]*height:\s*22px[\s\S]*opacity:\s*1/
  );
  assert.match(
    iconCss,
    /\.subsync-script-collapse-btn\s+\.subsync-script-collapse-icon\s*\{[\s\S]*opacity:\s*1/
  );
});

test("Script header icon and label use a shared vertical alignment box", () => {
  assert.match(iconCss, /\.subsync-script-header-title\s*\{[\s\S]*display:\s*flex[\s\S]*align-items:\s*center[\s\S]*line-height:\s*1/);
  assert.match(iconCss, /\.subsync-script-icon\s*\{[\s\S]*display:\s*flex[\s\S]*align-items:\s*center[\s\S]*line-height:\s*0/);
  assert.match(iconCss, /\.subsync-script-header-icon\s*\{[\s\S]*display:\s*block[\s\S]*margin:\s*0/);
});

test("light theme keeps the Script search icon high-contrast", () => {
  assert.match(
    themeCss,
    /body\[data-subsync-theme="light"\]\s+\.subsync-script-search-icon\s*\{[\s\S]*opacity:\s*1[\s\S]*filter:\s*brightness\(0\)\s+saturate\(100%\)/
  );
});

test("collapsed Script hover does not restart the panel entrance animation on exit", () => {
  const collapsedRule = iconCss.match(
    /\.subsync-script-panel-container\.subsync-script-panel-collapsed\s*\{[\s\S]*?\n\}/
  )?.[0] || "";
  const hoverRule = iconCss.match(
    /\.subsync-script-panel-container\.subsync-script-panel-collapsed:hover\s*\{[\s\S]*?\n\}/
  )?.[0] || "";

  assert.match(collapsedRule, /animation:\s*none/);
  assert.doesNotMatch(hoverRule, /animation\s*:/);
  assert.match(hoverRule, /transform:\s*translateY\(0\)\s*scale\(1\)/);
});

test("search and collapse icons use the neutral circle-chevron treatment", () => {
  assert.match(searchSvg, /stroke="#BFC0C4"/);
  assert.match(searchSvg, /stroke-width="2"/);
  assert.match(collapseSvg, /stroke="#BFC0C4"/);
  assert.match(collapseSvg, /stroke-width="2\.1"/);
  assert.match(collapseSvg, /<circle[^>]*cx="12"[^>]*cy="12"/);
  assert.match(collapseSvg, /d="M9\.2 10\.5 12 13\.3 14\.8 10\.5"/);
  assert.match(iconCss, /\.subsync-script-panel-header\s*\{[\s\S]*padding-bottom:\s*26px/);
  assert.match(iconCss, /\.subsync-script-panel-container\s+\.subsync-script-collapse-btn[\s\S]*bottom:\s*4px/);
  assert.match(iconCss, /\.subsync-script-panel-container\s+\.subsync-script-collapse-btn[\s\S]*width:\s*22px/);
  assert.match(iconCss, /\.subsync-script-panel-container\s+\.subsync-script-collapse-btn[\s\S]*height:\s*22px/);
  assert.match(iconCss, /\.subsync-script-collapse-btn\s+\.subsync-script-collapse-icon\s*\{[\s\S]*width:\s*22px/);
  assert.match(iconCss, /\.subsync-script-collapse-btn\s+\.subsync-script-collapse-icon\s*\{[\s\S]*height:\s*22px/);
  assert.match(iconCss, /\.subsync-script-search-icon\s*\{[\s\S]*width:\s*18px/);
  assert.match(iconCss, /\.subsync-script-search-icon\s*\{[\s\S]*height:\s*18px/);
  assert.match(iconCss, /\.subsync-script-panel-container\s+\.subsync-script-collapse-btn[\s\S]*background:\s*transparent/);
  assert.match(iconCss, /\.subsync-script-panel-container\.subsync-script-panel-collapsed:hover\s*\{/);
  assert.match(iconCss, /\.subsync-script-panel-container\.subsync-script-panel-collapsed:hover\s+\.subsync-script-list\s*\{[\s\S]*max-height:\s*12px/);
  assert.match(iconCss, /\.subsync-script-panel-container\.subsync-script-panel-collapsed:hover\s+\.subsync-script-list\s*\{[\s\S]*padding:\s*4px\s+10px\s+0/);
  assert.match(iconCss, /\.subsync-script-panel-container\.subsync-script-panel-collapsed:hover\s+\.subsync-script-list\s*\{[\s\S]*overflow:\s*hidden/);
  assert.match(iconCss, /\.subsync-script-panel-container\.subsync-script-panel-collapsed:hover\s+\.subsync-script-list\s*\{[\s\S]*pointer-events:\s*auto/);
  assert.match(iconCss, /\.subsync-script-panel-container\.subsync-script-panel-collapsed:hover\s+\.subsync-script-list::before/);
  assert.match(iconCss, /@media\s*\(prefers-reduced-motion:\s*reduce\)[\s\S]*\.subsync-script-panel-container\.subsync-script-panel-collapsed:hover\s+\.subsync-script-list[\s\S]*transition:\s*none/);
  assert.doesNotMatch(iconCss, /subsync-script-panel-preparing/);
  assert.doesNotMatch(scriptPanel, /collapseHovering|collapseHoverTimer|COLLAPSE_HOVER_EXIT_DELAY_MS/);
  assert.doesNotMatch(scriptPanel, /addEventListener\("mouseenter"/);
  assert.doesNotMatch(scriptPanel, /addEventListener\("mouseleave"/);
  assert.doesNotMatch(scriptPanel, /collapseFocused/);
  assert.doesNotMatch(scriptPanel, /addEventListener\("focus"/);
  assert.doesNotMatch(scriptPanel, /addEventListener\("blur"/);
});

test("main panel exposes a refresh control wired to SubSync refresh", () => {
  assert.match(layout, /id="subsync-refresh-btn"/);
  assert.match(layout, /SubSync\.icon\("refresh", "subsync-refresh-icon"\)/);
  assert.match(layout, /SubSync\.refresh/);
});
