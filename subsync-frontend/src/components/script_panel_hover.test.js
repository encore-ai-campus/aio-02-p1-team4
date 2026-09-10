const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const scriptPanelSource = fs.readFileSync(
  path.join(__dirname, "script_panel.js"),
  "utf8"
);
const iconCss = fs.readFileSync(
  path.join(__dirname, "../../styles/icons.css"),
  "utf8"
);

test("collapsed Script preview is owned by the stable card hover target", () => {
  assert.match(
    iconCss,
    /\.subsync-script-panel-container\.subsync-script-panel-collapsed:hover\s+\.subsync-script-list/
  );
  assert.match(
    iconCss,
    /\.subsync-script-panel-container\.subsync-script-panel-collapsed:hover\s+\.subsync-script-list[\s\S]*pointer-events:\s*auto/
  );
  assert.doesNotMatch(iconCss, /subsync-script-panel-preparing/);
  assert.doesNotMatch(
    scriptPanelSource,
    /collapseHovering|collapseHoverTimer|COLLAPSE_HOVER_EXIT_DELAY_MS/
  );
});

test("collapsed Script preview does not toggle from child mouse boundaries", () => {
  assert.doesNotMatch(
    scriptPanelSource,
    /collapseBtn\.addEventListener\("mouseenter"/
  );
  assert.doesNotMatch(
    scriptPanelSource,
    /collapseBtn\.addEventListener\("mouseleave"/
  );
  assert.doesNotMatch(
    scriptPanelSource,
    /listEl\?\.addEventListener\("mouseenter"/
  );
  assert.doesNotMatch(
    scriptPanelSource,
    /listEl\?\.addEventListener\("mouseleave"/
  );
  assert.doesNotMatch(scriptPanelSource, /collapseFocused/);
});

test("reduced motion keeps the card-hover preview transition-free", () => {
  assert.match(
    iconCss,
    /@media\s*\(prefers-reduced-motion:\s*reduce\)[\s\S]*\.subsync-script-panel-container\.subsync-script-panel-collapsed\s+\.subsync-script-list[\s\S]*transition:\s*none/
  );
});
