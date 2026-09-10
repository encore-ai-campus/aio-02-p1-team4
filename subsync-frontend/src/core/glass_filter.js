// Chromium Liquid Glass용 SVG backdrop displacement filter
(function () {
  const SubSync = (window.__SubSync = window.__SubSync || {});
  const SVG_NS = "http://www.w3.org/2000/svg";
  const FILTER_ID = "subsync-liquid-glass-filter";
  const DEFS_ID = "subsync-liquid-glass-filter-defs";

  let initialized = false;

  function setAttributes(element, attributes) {
    Object.entries(attributes).forEach(([name, value]) => {
      element.setAttribute(name, String(value));
    });
    return element;
  }

  function svgElement(name, attributes = {}) {
    return setAttributes(document.createElementNS(SVG_NS, name), attributes);
  }

  function createFilterDefinition() {
    const svg = svgElement("svg", {
      id: DEFS_ID,
      class: "subsync-glass-filter-defs",
      width: "1",
      height: "1",
      "aria-hidden": "true",
      focusable: "false"
    });
    svg.style.cssText = [
      "position: fixed",
      "left: -10000px",
      "top: -10000px",
      "width: 1px",
      "height: 1px",
      "overflow: hidden",
      "pointer-events: none",
      "opacity: 0"
    ].join(";");

    const defs = svgElement("defs");
    const filter = svgElement("filter", {
      id: FILTER_ID,
      x: "-20%",
      y: "-20%",
      width: "140%",
      height: "140%",
      "color-interpolation-filters": "sRGB"
    });

    const turbulence = svgElement("feTurbulence", {
      type: "fractalNoise",
      baseFrequency: "0.010 0.016",
      numOctaves: "2",
      seed: "17",
      stitchTiles: "stitch",
      result: "subsync-glass-noise"
    });

    const softenedNoise = svgElement("feGaussianBlur", {
      in: "subsync-glass-noise",
      stdDeviation: "1.35",
      result: "subsync-glass-soft-noise"
    });
    const displacement = svgElement("feDisplacementMap", {
      in: "SourceGraphic",
      in2: "subsync-glass-soft-noise",
      scale: "22",
      xChannelSelector: "R",
      yChannelSelector: "G",
      result: "subsync-glass-refracted"
    });
    const edgeSoftener = svgElement("feGaussianBlur", {
      in: "subsync-glass-refracted",
      stdDeviation: "0.18"
    });

    filter.append(turbulence, softenedNoise, displacement, edgeSoftener);
    defs.appendChild(filter);
    svg.appendChild(defs);
    return svg;
  }

  function init() {
    if (initialized) return true;
    if (!document.documentElement || !document.createElementNS) return false;

    if (document.getElementById(FILTER_ID)) {
      initialized = true;
      return true;
    }

    document.documentElement.appendChild(createFilterDefinition());
    initialized = true;
    return true;
  }

  SubSync.glassFilter = {
    FILTER_ID,
    init
  };
})();
