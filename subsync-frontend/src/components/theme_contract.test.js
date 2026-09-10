const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const projectRoot = path.resolve(root, "..");
const settingsService = fs.readFileSync(path.join(root, "services", "settings_service.js"), "utf8");
const settingsView = fs.readFileSync(path.join(root, "components", "settings_view.js"), "utf8");
const contentMain = fs.readFileSync(path.join(root, "content_main.js"), "utf8");
const themePath = path.join(root, "core", "theme.js");
const themeSource = fs.existsSync(themePath) ? fs.readFileSync(themePath, "utf8") : "";
const themeCssPath = path.join(projectRoot, "styles", "theme.css");
const themeCss = fs.existsSync(themeCssPath) ? fs.readFileSync(themeCssPath, "utf8") : "";
const manifest = JSON.parse(fs.readFileSync(path.join(projectRoot, "manifest.json"), "utf8"));


test("theme setting defaults to dark and is rendered in Settings", () => {
  assert.match(settingsService, /theme:\s*["']dark["']/);
  assert.match(settingsView, /name="theme"/);
  assert.match(settingsView, /value="dark"/);
  assert.match(settingsView, /value="light"/);
  assert.match(settingsView, /value="glass"/);
  assert.match(settingsView, /SubSync\.settings\.set\("theme"/);
  assert.match(settingsView, /\["light",\s*"glass"\]\.includes\(e\.target\.value\)/);
});

test("theme manager applies a scoped body theme attribute and listens for changes", () => {
  assert.ok(fs.existsSync(themePath));
  assert.match(themeSource, /data-subsync-theme/);
  assert.match(themeSource, /subsync-theme-transitioning/);
  assert.match(themeSource, /light/);
  assert.match(themeSource, /dark/);
  assert.match(themeSource, /glass/);
  assert.match(themeSource, /onChange/);
});

test("Manifest loads theme runtime and stylesheet", () => {
  const scripts = manifest.content_scripts.flatMap((item) => item.js || []);
  const stylesheets = manifest.content_scripts.flatMap((item) => item.css || []);
  assert.ok(scripts.includes("src/core/theme.js"));
  assert.ok(scripts.includes("src/core/glass_filter.js"));
  assert.ok(stylesheets.includes("styles/theme.css"));
  assert.ok(
    scripts.indexOf("src/core/theme.js") < scripts.indexOf("src/components/settings_view.js")
  );
  assert.ok(
    scripts.indexOf("src/core/glass_filter.js") < scripts.indexOf("src/content_main.js")
  );
  assert.match(contentMain, /SubSync\.theme\s*&&\s*SubSync\.theme\.init/);
  assert.match(contentMain, /SubSync\.glassFilter\s*&&\s*SubSync\.glassFilter\.init/);
});

test("light theme improves Korean subtitle readability without changing other themes", () => {
  const lightStart = themeCss.indexOf('body[data-subsync-theme="light"]');
  const lightEnd = themeCss.indexOf('body[data-subsync-theme="glass"]', lightStart);
  const lightTokens = themeCss.slice(lightStart, lightEnd);

  assert.match(lightTokens, /--subsync-overlay-bg:\s*rgba\(255,\s*255,\s*255,\s*0\.65\)/);
  assert.match(
    themeCss,
    /body\[data-subsync-theme="light"\]\s+\.subsync-overlay-ko\s*\{[\s\S]*?color:\s*var\(--subsync-accent-text\)[\s\S]*?font-size:\s*16px[\s\S]*?font-weight:\s*600[\s\S]*?line-height:\s*1\.4[\s\S]*?text-shadow:\s*none/
  );
});

test("light theme separates settings, history, and dual-subtitle surfaces", () => {
  assert.match(themeCss, /body\[data-subsync-theme="light"\]\s+\.subsync-settings-card[\s\S]*background:\s*rgba\(255,\s*255,\s*255,\s*0\.92\)[\s\S]*border:\s*1px\s+solid\s+rgba\(15,\s*23,\s*42,\s*0\.18\)[\s\S]*box-shadow:/i);
  assert.match(themeCss, /body\[data-subsync-theme="light"\]\s+\.subsync-saved-item[\s\S]*background:\s*rgba\(255,\s*255,\s*255,\s*0\.92\)[\s\S]*border:\s*1px\s+solid\s+rgba\(15,\s*23,\s*42,\s*0\.18\)[\s\S]*box-shadow:/i);
  assert.match(themeCss, /body\[data-subsync-theme="light"\]\s+\.subsync-history-item[\s\S]*background:\s*rgba\(255,\s*255,\s*255,\s*0\.92\)[\s\S]*border:\s*1px\s+solid\s+rgba\(15,\s*23,\s*42,\s*0\.18\)[\s\S]*box-shadow:/i);
  assert.match(themeCss, /body\[data-subsync-theme="light"\]\s+\.subsync-msg\.tutor[\s\S]*background:\s*rgba\(255,\s*255,\s*255,\s*0\.92\)[\s\S]*border:\s*1px\s+solid\s+rgba\(15,\s*23,\s*42,\s*0\.18\)[\s\S]*box-shadow:/i);
  assert.match(themeCss, /body\[data-subsync-theme="light"\]\s+\.subsync-tutor-box[\s\S]*background:\s*var\(--subsync-overlay-bg\)[\s\S]*border:\s*1px\s+solid\s+rgba\(15,\s*23,\s*42,\s*0\.18\)[\s\S]*box-shadow:/i);
  assert.match(themeCss, /body\[data-subsync-theme="light"\]\s+\.subsync-subtitle-box[\s\S]*background:\s*var\(--subsync-overlay-bg\)[\s\S]*border:\s*1px\s+solid\s+rgba\(15,\s*23,\s*42,\s*0\.22\)[\s\S]*box-shadow:/i);
  assert.match(themeCss, /body\[data-subsync-theme="light"\]\s+\.subsync-overlay-content[\s\S]*border:\s*1px\s+solid\s+rgba\(15,\s*23,\s*42,\s*0\.22\)[\s\S]*box-shadow:/i);
  assert.match(themeCss, /body\[data-subsync-theme="light"\]\s+\.subsync-htab[\s\S]*border:\s*1px\s+solid\s+rgba\(15,\s*23,\s*42,\s*0\.16\)/i);
});

test("all themes separate settings rows and sections", () => {
  const expectedDividers = {
    dark: "rgba(255, 255, 255, 0.14)",
    light: "rgba(15, 23, 42, 0.12)",
    glass: "rgba(178, 178, 178, 0.24)"
  };

  for (const [theme, divider] of Object.entries(expectedDividers)) {
    const start = themeCss.indexOf(`body[data-subsync-theme="${theme}"]`);
    const nextStart = themeCss.indexOf("body[data-subsync-theme=", start + 1);
    const tokens = themeCss.slice(start, nextStart === -1 ? themeCss.length : nextStart);
    assert.match(tokens, new RegExp(`--subsync-divider:\\s*${divider.replace(/[().,]/g, "\\$&")}`));
  }

  assert.match(
    themeCss,
    /body\[data-subsync-theme\] \.subsync-settings-card \.subsync-setting-row \+ \.subsync-setting-row,[\s\S]*?body\[data-subsync-theme\] \.subsync-settings-card \.subsync-setting-section\s*\{[\s\S]*?border-top:\s*1px solid var\(--subsync-divider\)[\s\S]*?padding-top:\s*12px/
  );
});

test("glass theme darkens word cards and keeps Korean subtitle surfaces tunable", () => {
  assert.match(
    themeCss,
    /body\[data-subsync-theme="glass"\]\s+\.subsync-saved-item\s*\{\s*background:\s*rgba\(24,\s*24,\s*24,\s*0\.78\)[\s\S]*?border-color:\s*rgba\(178,\s*178,\s*178,\s*0\.32\)[\s\S]*?box-shadow:/
  );
  assert.match(
    themeCss,
    /body\[data-subsync-theme="glass"\]\s+\.subsync-history-item\s*\{[\s\S]*background:\s*rgba\(24,\s*24,\s*24,\s*0\.78\)/
  );
  assert.match(
    themeCss,
    /body\[data-subsync-theme="glass"\]\s+\.subsync-script-time\s*\{\s*color:\s*var\(--subsync-text-muted\)/
  );
  assert.match(
    themeCss,
    /body\[data-subsync-theme="glass"\]\s+\.subsync-overlay-ko\s*\{[\s\S]*color:\s*#[0-9a-f]{6}[\s\S]*font-size:\s*16px[\s\S]*font-weight:\s*600[\s\S]*text-shadow:/i
  );
  assert.match(
    themeCss,
    /body\[data-subsync-theme="glass"\]\s+\.subsync-sub-known\s*\{[\s\S]*color:\s*#[0-9a-f]{6}[\s\S]*font-weight:\s*700[\s\S]*text-shadow:/i
  );
});

test("theme stylesheet keeps light colors scoped to SubSync surfaces", () => {
  assert.ok(fs.existsSync(themeCssPath));
  assert.match(themeCss, /body\[data-subsync-theme=["']light["']\]/);
  assert.match(themeCss, /body\[data-subsync-theme=["']glass["']\]/);
  assert.match(themeCss, /radial-gradient/);
  assert.match(themeCss, /backdrop-filter:\s*blur\(24px\)\s+saturate\(130%\)/);
  assert.match(themeCss, /-webkit-backdrop-filter:\s*blur\(24px\)\s+saturate\(130%\)/);
  const themeBlocks = ["dark", "light", "glass"].map((themeName) => {
    const start = themeCss.indexOf(`body[data-subsync-theme="${themeName}"]`);
    const nextStart = themeCss.indexOf("body[data-subsync-theme=", start + 1);
    return themeCss.slice(start, nextStart === -1 ? themeCss.length : nextStart);
  });
  for (const block of themeBlocks) {
    assert.match(block, /--subsync-accent:\s*#3f7ff5/i);
    assert.match(block, /--subsync-blue:\s*#3f7ff5/i);
    assert.match(block, /--subsync-blue-hover:\s*#66a0ff/i);
    assert.match(block, /--subsync-accent-soft:\s*rgba\(63,\s*127,\s*245,/i);
    assert.doesNotMatch(block, /--subsync-accent:\s*#(?:ff4757|d92d43|c43bff)/i);
  }
  assert.doesNotMatch(themeCss, /--subsync-accent:\s*#(?:ff4757|d92d43|c43bff)/i);
  const lightStart = themeCss.indexOf('body[data-subsync-theme="light"]');
  const lightEnd = themeCss.indexOf('body[data-subsync-theme="glass"]', lightStart);
  const lightTokens = themeCss.slice(lightStart, lightEnd);
  assert.match(lightTokens, /--subsync-panel-bg:\s*rgba\(255,\s*255,\s*255,\s*0\.65\)/);
  assert.match(lightTokens, /--subsync-overlay-bg:\s*rgba\(255,\s*255,\s*255,\s*0\.65\)/);
  const componentStyleFiles = ["main.css", "subtitle.css", "script.css", "tutor.css", "modal.css", "interactive.css", "motion.css"];
  for (const fileName of componentStyleFiles) {
    const css = fs.readFileSync(path.join(projectRoot, "styles", fileName), "utf8");
    assert.doesNotMatch(css, /#(?:ff4757|ff6b81|d92d43|c0273d|c43bff|e8a7ff)/i);
    assert.doesNotMatch(css, /rgba\(255,\s*71,\s*87/);
  }
  assert.match(themeCss, /body\[data-subsync-theme="glass"\] \.subsync-settings-card\s*\{[\s\S]*background:\s*rgba\(24,\s*24,\s*24,\s*0\.78\)/);
  assert.match(themeCss, /body\[data-subsync-theme="glass"\] \.subsync-script-panel-container\s*\{\s*background:\s*rgba\(24,\s*24,\s*24,\s*0\.78\)/);
  assert.match(themeCss, /body\[data-subsync-theme="glass"\] \.subsync-tutor-box\s*\{\s*background:\s*rgba\(24,\s*24,\s*24,\s*0\.78\)/);
  assert.match(themeCss, /body\[data-subsync-theme\] \.subsync-action-btn\s*\{\s*background:\s*var\(--subsync-accent/);
  assert.match(themeCss, /background-blend-mode:\s*overlay,\s*normal/);
  assert.match(themeCss, /backdrop-filter:\s*url\(["']?#subsync-liquid-glass-filter["']?\)\s+blur\(10px\)\s+saturate\(145%\)/);
  assert.match(themeCss, /-webkit-backdrop-filter:\s*url\(["']?#subsync-liquid-glass-filter["']?\)\s+blur\(10px\)\s+saturate\(145%\)/);
  assert.match(themeCss, /@supports\s*\([^)]*backdrop-filter/);
  const refractionStart = themeCss.indexOf('@supports (backdrop-filter: url("#subsync-liquid-glass-filter"))');
  const refractionEnd = themeCss.indexOf('body[data-subsync-theme="glass"] .subsync-quick-bar {', refractionStart);
  const refractionBlock = themeCss.slice(refractionStart, refractionEnd);
  for (const selector of [
    "subsync-container",
    "subsync-panel-header",
    "subsync-nav-tabs",
    "subsync-subtitle-box",
    "subsync-script-panel-container",
    "subsync-script-panel-header",
    "subsync-tutor-box",
    "subsync-settings-card",
    "subsync-saved-item",
    "subsync-history-item"
  ]) {
    assert.match(refractionBlock, new RegExp(`\\.${selector}`));
  }
  assert.doesNotMatch(themeCss, /\.subsync-container::before/);
  assert.doesNotMatch(themeCss, /width:\s*325px/);
  assert.doesNotMatch(themeCss, /height:\s*346px/);
  assert.doesNotMatch(themeCss, /backdrop-filter:\s*blur\(2px\)/);
  const glassStart = themeCss.indexOf('body[data-subsync-theme="glass"]');
  const glassEnd = themeCss.indexOf("/* 빠른 바와 메인 패널 */");
  const glassTokens = themeCss.slice(glassStart, glassEnd);
  assert.match(glassTokens, /--subsync-panel-bg:\s*rgba\(24,\s*24,\s*24,\s*0\.6\)/);
  assert.match(glassTokens, /--subsync-panel-border:\s*rgba\(178,\s*178,\s*178,\s*0\.34\)/);
  assert.match(glassTokens, /--subsync-bar-bg:\s*rgba\(24,\s*24,\s*24,\s*0\.52\)/);
  assert.match(glassTokens, /--subsync-inset:\s*rgba\(10,\s*10,\s*10,\s*0\.36\)/);
  assert.match(glassTokens, /--subsync-peek-border:\s*rgba\(178,\s*178,\s*178,\s*0\.28\)/);
  assert.match(glassTokens, /--subsync-glass-background:[\s\S]*rgba\(24,\s*24,\s*24,\s*0\.42\)/);
  assert.equal((glassTokens.match(/radial-gradient/g) || []).length, 1);
  assert.doesNotMatch(glassTokens, /rgba\(196,\s*55,\s*255,\s*0\.82\)/);
  assert.doesNotMatch(glassTokens, /rgba\(139,\s*63,\s*255,\s*0\.12\)/);
  assert.doesNotMatch(themeCss, /rgba\(\s*(?:142,\s*216,\s*235|165,\s*239,\s*255|110,\s*191,\s*244|70,\s*144,\s*213|137,\s*190,\s*207|220,\s*245,\s*250)/);
  assert.match(themeCss, /body\[data-subsync-theme="glass"\] \.subsync-container\s*\{\s*border:\s*none;\s*outline:\s*none;/);
  assert.match(themeCss, /body\[data-subsync-theme="glass"\] \.subsync-panel-header,[\s\S]*border-color:\s*rgba\(178,\s*178,\s*178,\s*0\.24\)/);
  assert.match(themeCss, /body\[data-subsync-theme="glass"\] \.subsync-settings-card\s*\{[\s\S]*border-color:\s*rgba\(178,\s*178,\s*178,\s*0\.32\)/);
  assert.match(themeCss, /body\[data-subsync-theme="glass"\] \.subsync-script-panel-container\s*\{[\s\S]*border-color:\s*rgba\(178,\s*178,\s*178,\s*0\.32\)/);
  assert.match(themeCss, /body\[data-subsync-theme="glass"\] \.subsync-tutor-box\s*\{[\s\S]*border-color:\s*rgba\(178,\s*178,\s*178,\s*0\.32\)/);
  assert.match(glassTokens, /--subsync-glass-background:[\s\S]*rgba\(255,\s*255,\s*255,\s*0\.12\)/);
  assert.match(themeCss, /subsync-theme-transitioning/);
  assert.match(themeCss, /transition:[\s\S]*background/);
  for (const selector of [
    "subsync-container",
    "subsync-quick-bar",
    "subsync-script-panel-container",
    "subsync-subtitle-box",
    "subsync-tutor-box",
    "subsync-hover-tooltip",
    "subsync-click-popup",
    "subsync-auth-modal"
  ]) {
    assert.match(themeCss, new RegExp(`\\.${selector}`));
  }
});
