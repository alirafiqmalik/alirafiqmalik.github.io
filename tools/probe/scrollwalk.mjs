// Scroll-Walk Group — the Viewport Matrix invariants decided by synthetically
// scrolling the page and observing progress (spec of record: AGENTS.md).
//
// Coupling per ADR-0001: "settled" is observed scroll-position stability,
// never a state class; progress is judged purely from scroll positions and
// element rectangles. Fixed budgets, no retries — a red walk is a real bug in
// the site or in the probe's settle detection.
import { fmt, waitScrollStable, measureReach, twoFrames } from "./geometry.mjs";

const WHEEL_DELTA = 260;

// The About reference the walk steers by: the #about section when the page has
// one (the real site), else the about-panel handle (fixtures).
const measureWalk = (page) =>
  page.evaluate(() => {
    const scroller =
      document.getElementById("page-scroll-container") ||
      document.scrollingElement ||
      document.documentElement;
    const aboutRef =
      document.getElementById("about") || document.querySelector('[data-probe="about-panel"]');
    const rect = aboutRef ? aboutRef.getBoundingClientRect() : null;
    return {
      scrollTop: scroller.scrollTop,
      scrollMax: scroller.scrollHeight - scroller.clientHeight,
      aboutTop: rect ? rect.top : null,
      aboutBottom: rect ? rect.bottom : null,
    };
  });

export async function resetToTop(page) {
  await page.evaluate(() => {
    const scroller =
      document.getElementById("page-scroll-container") ||
      document.scrollingElement ||
      document.documentElement;
    scroller.scrollTop = 0;
  });
  await waitScrollStable(page);
}

// --- Invariant: scroll-walk — synthetic wheel input at page center advances
// landing → About settled → at least one section beyond, within a fixed budget.
//
// One "flick" models a real wheel/trackpad gesture: a single wheel event
// worth most of a viewport height, then a fixed pause for the scroller (and
// any snap the site applies) to come to rest. Small individual notches are
// deliberately not the model: on a mandatory-snap page each one is
// snap-reverted before the next lands, which reads as stuck when no user
// scrolls that way. Approaching About the flick halves so the walk can
// observe About settling instead of flying past it.

export async function decideWalk(page, viewport) {
  const MAX_FLICKS = 40;
  const STALL_LIMIT = 4;

  await resetToTop(page);
  let state = await measureWalk(page);
  if (state.aboutTop === null) {
    return [`${viewport.name} / scroll-walk / About reference not found (#about or about-panel handle)`];
  }

  const vh = viewport.height;
  await page.mouse.move(viewport.width / 2, vh / 2);

  let phase = "to-about";
  let stalled = 0;
  let lastScrollTop = state.scrollTop;
  for (let flicks = 1; flicks <= MAX_FLICKS; flicks++) {
    const approaching = phase === "to-about" && state.aboutTop <= 0.9 * vh;
    await page.mouse.wheel(0, vh * (approaching ? 0.5 : 0.92));
    await twoFrames(page);
    await page.waitForTimeout(350);
    await waitScrollStable(page);
    state = await measureWalk(page);

    if (phase === "to-about" && state.aboutTop <= 0.25 * vh) {
      // About has arrived and scroll is stable — it must have settled near
      // the top, not been flown past.
      if (Math.abs(state.aboutTop) > 0.45 * vh) {
        return [
          `${viewport.name} / scroll-walk / About reached but not settled: top ` +
            `${fmt(state.aboutTop)} after stability (scrollTop ${fmt(state.scrollTop)} of ${fmt(state.scrollMax)}, ${flicks} flicks)`,
        ];
      }
      phase = "beyond";
      lastScrollTop = state.scrollTop;
      stalled = 0;
      continue;
    }
    if (phase === "beyond" && state.aboutBottom <= 0.6 * vh) {
      return []; // a section beyond About owns most of the viewport — walk done
    }

    if (Math.abs(state.scrollTop - lastScrollTop) < 2) {
      stalled++;
      if (stalled >= STALL_LIMIT) {
        return [
          `${viewport.name} / scroll-walk / stuck ${phase === "to-about" ? "before About" : "after About"}: ` +
            `scrollTop ${fmt(state.scrollTop)} of ${fmt(state.scrollMax)} unchanged for ${STALL_LIMIT} flicks ` +
            `(About top ${fmt(state.aboutTop)}, ${flicks} flicks)`,
        ];
      }
    } else {
      stalled = 0;
    }
    lastScrollTop = state.scrollTop;
  }
  return [
    `${viewport.name} / scroll-walk / budget exhausted in phase ${phase}: scrollTop ` +
      `${fmt(state.scrollTop)} of ${fmt(state.scrollMax)} after ${MAX_FLICKS} flicks (About top ${fmt(state.aboutTop)})`,
  ];
}

// --- Invariant: scroll-trap (Trap Probe) — with the cursor over a nested
// scrollport, once the inner scrollport reaches its end, further wheel input
// must advance the page.

export async function decideTrapProbe(page, viewport, handleName) {
  const MAX_TICKS = 60;
  const STALL_LIMIT = 6;
  const PAGE_ADVANCE = 40;

  const present = await page.evaluate((handle) => {
    const el = document.querySelector(`[data-probe="${handle}"]`);
    if (!el) return false;
    el.scrollIntoView({ block: "nearest", behavior: "instant" });
    return true;
  }, handleName);
  if (!present) {
    return [`${viewport.name} / scroll-trap / handle not found: ${handleName}`];
  }
  await waitScrollStable(page);

  let state = await measureReach(page, handleName);
  const startPage = state.pageScrollTop;
  let lastPage = startPage;
  let lastPort = state.portScrollTop;
  let stalled = 0;
  for (let ticks = 1; ticks <= MAX_TICKS; ticks++) {
    await page.mouse.move(state.cursorX, state.cursorY);
    await page.mouse.wheel(0, WHEEL_DELTA);
    await twoFrames(page);
    // Separate gestures: without a gap the browser keeps the wheel latched to
    // the inner scroller it started on, which would mask a legitimate
    // hand-back. A genuine trap (e.g. overscroll containment) traps every
    // gesture, so the gap never hides one.
    await page.waitForTimeout(60);
    state = await measureReach(page, handleName);

    if (state.pageScrollTop > startPage + PAGE_ADVANCE) {
      return []; // the page advanced — scrolling was handed back
    }
    const portMoved =
      state.portScrollTop !== null && Math.abs(state.portScrollTop - (lastPort ?? 0)) > 0.5;
    const pageMoved = Math.abs(state.pageScrollTop - lastPage) > 0.5;
    if (!portMoved && !pageMoved) {
      stalled++;
      if (stalled >= STALL_LIMIT) {
        const portInfo =
          state.portScrollMax === null
            ? "no inner scrollport"
            : `inner scrollport at ${fmt(state.portScrollTop)}/${fmt(state.portScrollMax)}`;
        return [
          `${viewport.name} / scroll-trap / ${handleName}: page scrollTop stuck at ` +
            `${fmt(state.pageScrollTop)} (started ${fmt(startPage)}) with ${portInfo}, ` +
            `${ticks} wheel ticks`,
        ];
      }
    } else {
      stalled = 0;
    }
    lastPage = state.pageScrollTop;
    lastPort = state.portScrollTop;
  }
  return [
    `${viewport.name} / scroll-trap / ${handleName}: page advanced only ` +
      `${fmt(lastPage - startPage)}px in ${MAX_TICKS} wheel ticks (needs > ${PAGE_ADVANCE}px)`,
  ];
}
