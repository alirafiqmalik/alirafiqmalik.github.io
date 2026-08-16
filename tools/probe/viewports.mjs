// The 11-viewport set of the Viewport Matrix (spec of record: AGENTS.md):
// the 8 canonical viewports + Boundary Pair (899/900) + Narrow Floor (320).
// Rows ≤899px wide run under mobile emulation (isMobile, hasTouch, realistic
// deviceScaleFactor) so hover/pointer media queries resolve as on real phones;
// desktop rows run DPR 1.
const MOBILE_MAX_WIDTH = 899;

const ROWS = [
  { width: 320, height: 568, deviceScaleFactor: 2 }, // Narrow Floor
  { width: 360, height: 640, deviceScaleFactor: 3 }, // Short phone
  { width: 390, height: 844, deviceScaleFactor: 3 }, // Phone
  { width: 768, height: 1024, deviceScaleFactor: 2 }, // Tablet portrait
  { width: 899, height: 800, deviceScaleFactor: 2 }, // Boundary Pair (stack side)
  { width: 900, height: 800, deviceScaleFactor: 1 }, // Boundary Pair (corner side)
  { width: 1024, height: 768, deviceScaleFactor: 1 }, // Tablet landscape / small laptop
  { width: 1280, height: 800, deviceScaleFactor: 1 }, // MacBook common
  { width: 1440, height: 780, deviceScaleFactor: 1 }, // Compact laptop
  { width: 1440, height: 900, deviceScaleFactor: 1 }, // Standard laptop
  { width: 1920, height: 1080, deviceScaleFactor: 1 }, // Desktop
];

export const VIEWPORTS = ROWS.map((row) => ({
  ...row,
  name: `${row.width}x${row.height}`,
  mobile: row.width <= MOBILE_MAX_WIDTH,
}));
