const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const projectRoot = path.resolve(root, "..");
const filterPath = path.join(root, "core", "glass_filter.js");
const contentMainPath = path.join(root, "content_main.js");
const manifest = JSON.parse(fs.readFileSync(path.join(projectRoot, "manifest.json"), "utf8"));
const filterSource = fs.existsSync(filterPath) ? fs.readFileSync(filterPath, "utf8") : "";
const contentMain = fs.readFileSync(contentMainPath, "utf8");


test("glass filter defines a static Chromium backdrop refraction surface", () => {
  assert.ok(fs.existsSync(filterPath));
  assert.match(filterSource, /SubSync\.glassFilter/);
  assert.match(filterSource, /subsync-liquid-glass-filter/);
  assert.match(filterSource, /createElementNS/);
  assert.match(filterSource, /feTurbulence/);
  assert.match(filterSource, /feGaussianBlur/);
  assert.match(filterSource, /feDisplacementMap/);
  assert.match(filterSource, /scale:\s*["']22["']/);
  assert.match(filterSource, /baseFrequency/);
  assert.doesNotMatch(filterSource, /attributeName:\s*["']baseFrequency["']/);
  assert.doesNotMatch(filterSource, /repeatCount/);
  assert.doesNotMatch(filterSource, /shouldAnimate|createElementNS\(SVG_NS,\s*["']animate["']\)/);
  assert.match(filterSource, /pointerEvents|pointer-events/);
  assert.doesNotMatch(filterSource, /(?:href|src|fetch)\s*[:=(]/i);
});

test("Manifest loads the glass filter before content_main", () => {
  const scripts = manifest.content_scripts.flatMap((item) => item.js || []);
  assert.ok(scripts.includes("src/core/glass_filter.js"));
  assert.ok(scripts.indexOf("src/core/glass_filter.js") < scripts.indexOf("src/content_main.js"));
  assert.match(contentMain, /SubSync\.glassFilter\s*&&\s*SubSync\.glassFilter\.init/);
});
