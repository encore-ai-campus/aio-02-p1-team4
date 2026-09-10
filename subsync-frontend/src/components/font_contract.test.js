const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const projectRoot = path.resolve(root, "..");
const settingsService = fs.readFileSync(path.join(root, "services", "settings_service.js"), "utf8");
const settingsView = fs.readFileSync(path.join(root, "components", "settings_view.js"), "utf8");
const fontRuntimePath = path.join(root, "core", "font.js");
const fontRuntime = fs.existsSync(fontRuntimePath) ? fs.readFileSync(fontRuntimePath, "utf8") : "";
const fontCssPath = path.join(projectRoot, "styles", "fonts.css");
const fontCss = fs.existsSync(fontCssPath) ? fs.readFileSync(fontCssPath, "utf8") : "";
const fontAssetPath = path.join(projectRoot, "assets", "fonts", "GmarketSansMedium.woff");
const manifest = JSON.parse(fs.readFileSync(path.join(projectRoot, "manifest.json"), "utf8"));

test("Settings exposes the current system font and GMarketSans choices", () => {
  assert.match(settingsService, /fontFamily:\s*["']system["']/);
  assert.match(settingsView, /name="fontFamily"/);
  assert.match(settingsView, /value="system"/);
  assert.match(settingsView, /value="gmarket"/);
  assert.match(settingsView, /기본 시스템 폰트/);
  assert.match(settingsView, /GMarketSans/);
  assert.match(settingsView, /SubSync\.font\s*&&\s*SubSync\.font\.apply/);
});

test("font runtime and stylesheet are registered before Settings", () => {
  const scripts = manifest.content_scripts.flatMap((item) => item.js || []);
  const stylesheets = manifest.content_scripts.flatMap((item) => item.css || []);
  assert.ok(scripts.includes("src/core/font.js"));
  assert.ok(stylesheets.includes("styles/fonts.css"));
  assert.ok(scripts.indexOf("src/core/font.js") < scripts.indexOf("src/components/settings_view.js"));
  assert.match(fontRuntime, /data-subsync-font/);
});

test("GMarketSans is bundled and applied only to SubSync UI roots", () => {
  assert.ok(fs.existsSync(fontAssetPath));
  assert.match(fontRuntime, /@font-face[\s\S]*font-family:\s*["']GMarketSans["']/);
  assert.match(fontRuntime, /GmarketSansMedium\.woff/);
  assert.match(fontCss, /body\[data-subsync-font="system"\]/);
  assert.match(fontCss, /body\[data-subsync-font="gmarket"\]/);
  assert.match(fontCss, /#subsync-root/);
  assert.match(fontCss, /#subsync-quick-bar/);
});

test("content-script font loading uses an extension URL instead of a page-relative URL", () => {
  assert.match(fontRuntime, /chrome\.runtime\.getURL/);
  assert.match(fontRuntime, /assets\/fonts\/GmarketSansMedium\.woff/);
  assert.match(fontRuntime, /subsync-font-face-style/);
  assert.doesNotMatch(fontCss, /src:\s*url\(["']\.\.\/assets\/fonts\/GmarketSansMedium\.woff/);
});
