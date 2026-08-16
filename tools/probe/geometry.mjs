// Geometry Group — the Viewport Matrix invariants decidable from element
// rectangles, visibility, and driven scroll (spec of record: AGENTS.md).
//
// Coupling per ADR-0001: elements are located only via data-probe handles and
// section/container ids (#page-scroll-container, #landing-globe-canvas), never
// styling or state classes. Scrollability is decided by driving wheel input
// and watching the content move — a scrollport that only responds to
// programmatic scrollTop is not scrollable for a real visitor.

export const PROBE_HANDLES = [
  "name",
  "tagline",
  "nav",
  "news-card",
  "about-panel",
  "cta-social",
  "cta-links",
];

// The five named rects of the pairwise non-overlap invariant.
export const OVERLAP_HANDLES = ["name", "tagline", "nav", "about-panel", "news-card"];

export const fmt = (n) => Math.round(n * 10) / 10;
export const fmtRect = (r) => `[x=${fmt(r.x)} y=${fmt(r.y)} w=${fmt(r.width)} h=${fmt(r.height)}]`;

// Overlap = positive-area intersection beyond a subpixel tolerance.
const EPSILON = 0.5;
// Slack for order/edge comparisons (border rounding at fractional DPRs).
const EDGE_EPS = 2;

function intersection(a, b) {
  const width = Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x);
  const height = Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y);
  return width > EPSILON && height > EPSILON ? { width, height } : null;
}

const centerX = (r) => r.x + r.width / 2;
const bottom = (r) => r.y + r.height;
const hasArea = (r) => r && r.width > 0 && r.height > 0;

// --- Settle discipline (spec #22): geometry is measured only after fonts,
// images, and the globe canvas are ready and scroll position is stable.
// Bounded waits, no retries — a page that never settles is a real bug.

export async function waitScrollStable(page) {
  await page.waitForFunction(
    () =>
      new Promise((resolve) => {
        const scroller =
          document.getElementById("page-scroll-container") ||
          document.scrollingElement ||
          document.documentElement;
        const y0 = scroller.scrollTop;
        requestAnimationFrame(() =>
          requestAnimationFrame(() => resolve(scroller.scrollTop === y0))
        );
      }),
    undefined,
    { timeout: 15_000 }
  );
}

export async function settle(page) {
  await page.waitForFunction(() => document.fonts.status === "loaded", undefined, {
    timeout: 15_000,
  });
  await page.waitForFunction(
    () => [...document.images].every((img) => img.complete),
    undefined,
    { timeout: 15_000 }
  );
  // Globe canvas (when the page has one) must be laid out before measuring.
  await page.waitForFunction(
    () => {
      const canvas = document.getElementById("landing-globe-canvas");
      return !canvas || (canvas.clientWidth > 0 && canvas.clientHeight > 0);
    },
    undefined,
    { timeout: 15_000 }
  );
  await waitScrollStable(page);
}

// --- Measurement

export async function measureHandles(page) {
  return page.evaluate((names) => {
    const rects = {};
    for (const name of names) {
      const el = document.querySelector(`[data-probe="${name}"]`);
      rects[name] = el ? el.getBoundingClientRect().toJSON() : null;
    }
    // Root scrollbar gutter: >0 on an overflowing page proves classic
    // (non-overlay) scrollbars are in effect.
    return {
      rects,
      scrollbarGutter: window.innerWidth - document.documentElement.clientWidth,
    };
  }, PROBE_HANDLES);
}

// --- Invariant: pairwise non-overlap of the five named rects

export function decideOverlapInvariant(viewport, rects) {
  const failures = [];
  for (const handle of OVERLAP_HANDLES) {
    if (rects[handle] === null) {
      failures.push(`${viewport.name} / overlap / handle not found: ${handle}`);
    } else if (!hasArea(rects[handle])) {
      // A collapsed named rect cannot overlap anything — going silently green
      // here would be a false pass, so it fails instead.
      failures.push(
        `${viewport.name} / overlap / handle has zero-area rect: ${handle}=${fmtRect(rects[handle])}`
      );
    }
  }
  const visible = OVERLAP_HANDLES.filter((h) => hasArea(rects[h]));
  for (let i = 0; i < visible.length; i++) {
    for (let j = i + 1; j < visible.length; j++) {
      const [a, b] = [visible[i], visible[j]];
      const hit = intersection(rects[a], rects[b]);
      if (hit) {
        failures.push(
          `${viewport.name} / overlap / ${a}=${fmtRect(rects[a])} intersects ` +
            `${b}=${fmtRect(rects[b])} by ${fmt(hit.width)}x${fmt(hit.height)}px`
        );
      }
    }
  }
  return failures;
}

// --- Invariant: stack vs corners
// ≤899px: stacked order title → news → bio/CTAs (cta-social stands in for the
// bio/CTA block — it is the top of the landing copy's footer row).
// ≥900px: corner layout — title centered above, News bottom-right, bio/CTAs
// bottom-left.

export function decideStackVsCorners(viewport, rects) {
  const failures = [];
  const needed = ["name", "tagline", "news-card", "cta-social"];
  for (const handle of needed) {
    if (!hasArea(rects[handle])) {
      failures.push(
        `${viewport.name} / stack-vs-corners / handle missing or zero-area: ${handle}`
      );
    }
  }
  if (failures.length > 0) return failures;

  const name = rects["name"];
  const tagline = rects["tagline"];
  const news = rects["news-card"];
  const cta = rects["cta-social"];
  const midX = viewport.width / 2;
  const midY = viewport.height / 2;

  if (viewport.width <= 899) {
    if (bottom(tagline) > news.y + EDGE_EPS) {
      failures.push(
        `${viewport.name} / stack-vs-corners / stacked order broken: tagline bottom ` +
          `${fmt(bottom(tagline))} below news-card top ${fmt(news.y)}`
      );
    }
    if (bottom(news) > cta.y + EDGE_EPS) {
      failures.push(
        `${viewport.name} / stack-vs-corners / stacked order broken: news-card bottom ` +
          `${fmt(bottom(news))} below cta-social top ${fmt(cta.y)}`
      );
    }
  } else {
    if (Math.abs(centerX(name) - midX) > 8) {
      failures.push(
        `${viewport.name} / stack-vs-corners / title not centered: name center-x ` +
          `${fmt(centerX(name))} vs viewport center ${fmt(midX)}`
      );
    }
    if (bottom(name) > news.y + EDGE_EPS || bottom(name) > cta.y + EDGE_EPS) {
      failures.push(
        `${viewport.name} / stack-vs-corners / title not above corners: name bottom ` +
          `${fmt(bottom(name))} vs news-card top ${fmt(news.y)}, cta-social top ${fmt(cta.y)}`
      );
    }
    if (centerX(news) <= midX || bottom(news) <= midY) {
      failures.push(
        `${viewport.name} / stack-vs-corners / news-card not bottom-right: center-x ` +
          `${fmt(centerX(news))} (mid ${fmt(midX)}), bottom ${fmt(bottom(news))} (mid ${fmt(midY)})`
      );
    }
    if (centerX(cta) >= midX || bottom(cta) <= midY) {
      failures.push(
        `${viewport.name} / stack-vs-corners / cta-social not bottom-left: center-x ` +
          `${fmt(centerX(cta))} (mid ${fmt(midX)}), bottom ${fmt(bottom(cta))} (mid ${fmt(midY)})`
      );
    }
  }
  return failures;
}

// --- Invariant: CTAs usable — both CTA handles fully within the viewport and
// their links actually hittable (nothing covering them).

export async function decideCtasUsable(page, viewport, rects) {
  const failures = [];
  for (const handle of ["cta-social", "cta-links"]) {
    const rect = rects[handle];
    if (!hasArea(rect)) {
      failures.push(`${viewport.name} / ctas-usable / handle missing or zero-area: ${handle}`);
      continue;
    }
    if (
      rect.x < -EDGE_EPS ||
      rect.y < -EDGE_EPS ||
      rect.x + rect.width > viewport.width + EDGE_EPS ||
      bottom(rect) > viewport.height + EDGE_EPS
    ) {
      failures.push(
        `${viewport.name} / ctas-usable / ${handle} not fully within viewport: ` +
          `${fmtRect(rect)} vs ${viewport.width}x${viewport.height}`
      );
      continue;
    }
    const covered = await page.evaluate((h) => {
      const el = document.querySelector(`[data-probe="${h}"]`);
      const out = [];
      for (const link of el.querySelectorAll("a, button")) {
        const b = link.getBoundingClientRect();
        if (b.width <= 0 || b.height <= 0) continue;
        const cx = b.x + b.width / 2;
        const cy = b.y + b.height / 2;
        const hit = document.elementFromPoint(cx, cy);
        if (!hit || !(hit === link || link.contains(hit))) {
          const label = (link.getAttribute("aria-label") || link.textContent || "")
            .trim()
            .slice(0, 24);
          const desc = hit
            ? `${hit.tagName.toLowerCase()}${hit.id ? `#${hit.id}` : ""}`
            : "nothing";
          out.push(`link "${label}" center (${Math.round(cx)},${Math.round(cy)}) hits ${desc}`);
        }
      }
      return out;
    }, handle);
    for (const miss of covered) {
      failures.push(`${viewport.name} / ctas-usable / ${handle} not clickable: ${miss}`);
    }
  }
  return failures;
}

// --- Invariants: News reachable / About reachable
// The last content of the handle must be fully visible, or driving real wheel
// input over the card must reveal it. The scrollport is discovered
// observationally: the nearest self-or-ancestor whose content overflows,
// stopping below the page scroll owner.

export async function measureReach(page, handleName) {
  return page.evaluate((handle) => {
    const el = document.querySelector(`[data-probe="${handle}"]`);
    if (!el) return null;
    const pageScroller =
      document.getElementById("page-scroll-container") ||
      document.scrollingElement ||
      document.documentElement;
    let port = null;
    for (let node = el; node && node !== document.documentElement; node = node.parentElement) {
      if (node === pageScroller || node === document.body) break;
      if (node.scrollHeight > node.clientHeight + 1) {
        port = node;
        break;
      }
    }
    const rect = el.getBoundingClientRect();
    let contentBottom = rect.bottom;
    for (const d of el.querySelectorAll("*")) {
      const b = d.getBoundingClientRect();
      if (b.height > 0 && b.bottom > contentBottom) contentBottom = b.bottom;
    }
    let portBottom = null;
    let portScrollTop = null;
    let portScrollMax = null;
    if (port) {
      const pb = port.getBoundingClientRect();
      portBottom = pb.top + port.clientTop + port.clientHeight;
      portScrollTop = port.scrollTop;
      portScrollMax = port.scrollHeight - port.clientHeight;
    }
    const visibleBottom =
      portBottom === null ? window.innerHeight : Math.min(portBottom, window.innerHeight);
    const clampNum = (v, lo, hi) => Math.min(Math.max(v, lo), hi);
    return {
      pageScrollTop: pageScroller.scrollTop,
      contentBottom,
      visibleBottom,
      portScrollTop,
      portScrollMax,
      cursorX: clampNum(rect.x + rect.width / 2, 1, window.innerWidth - 2),
      cursorY: clampNum((Math.max(rect.y, 0) + Math.min(rect.bottom, visibleBottom)) / 2, 1, window.innerHeight - 2),
    };
  }, handleName);
}

export const twoFrames = (page) =>
  page.evaluate(
    () =>
      new Promise((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(resolve))
      )
  );

export async function decideReachable(page, viewport, handleName, invariantName) {
  const present = await page.evaluate((handle) => {
    const el = document.querySelector(`[data-probe="${handle}"]`);
    if (!el) return false;
    el.scrollIntoView({ block: "nearest", behavior: "instant" });
    return true;
  }, handleName);
  if (!present) {
    return [`${viewport.name} / ${invariantName} / handle not found: ${handleName}`];
  }
  await waitScrollStable(page);

  const REACH_EPS = 1.5;
  const MAX_WHEEL_STEPS = 40;
  const STALL_LIMIT = 3;

  let state = await measureReach(page, handleName);
  if (state.contentBottom <= state.visibleBottom + REACH_EPS) return [];

  let steps = 0;
  let stalled = 0;
  let lastGap = state.contentBottom - state.visibleBottom;
  while (steps < MAX_WHEEL_STEPS) {
    await page.mouse.move(state.cursorX, state.cursorY);
    await page.mouse.wheel(0, 260);
    steps++;
    await twoFrames(page);
    state = await measureReach(page, handleName);
    const gap = state.contentBottom - state.visibleBottom;
    if (gap <= REACH_EPS) return [];
    if (gap >= lastGap - 0.5) {
      stalled++;
      if (stalled >= STALL_LIMIT) break;
    } else {
      stalled = 0;
    }
    lastGap = gap;
  }
  const portInfo =
    state.portScrollMax === null
      ? "no scrollable port"
      : `scrollport at ${fmt(state.portScrollTop)}/${fmt(state.portScrollMax)}`;
  return [
    `${viewport.name} / ${invariantName} / last content bottom ${fmt(state.contentBottom)} ` +
      `below visible bottom ${fmt(state.visibleBottom)} after ${steps} wheel steps (${portInfo})`,
  ];
}
