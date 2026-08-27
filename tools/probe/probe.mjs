#!/usr/bin/env node
// Layout Probe — executes the mechanical half of the Viewport Matrix
// (spec of record: AGENTS.md; coupling rules: docs/adr/0001).
//
//   npm run probe                 build the site, serve _site, probe it
//   npm run probe -- --url <base> attach to an already-running server
//
// Exit 0: all viewports green. Exit 1: failures, one stdout line each as
// "viewport / invariant / measured values". Exit 2: probe infrastructure error.
//
// Per ADR-0001 the probe locates elements only through data-probe handles and
// section ids — never styling or state classes.
import { spawn } from "node:child_process";
import { mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { chromium } from "playwright";
import { serveStatic } from "./serve.mjs";
import { VIEWPORTS } from "./viewports.mjs";
import {
  settle,
  measureHandles,
  decideOverlapInvariant,
  decideStackVsCorners,
  decideCtasUsable,
  decideReachable,
  decideNavLogoTarget,
  homepageHasLanding,
} from "./geometry.mjs";
import {
  decideLandingHandoff,
  decideWalk,
  decideTrapProbe,
  resetToTop,
} from "./scrollwalk.mjs";
import { decidePayload, formatPayloadSummary } from "./payload.mjs";

// The walk is repeated under prefers-reduced-motion: reduce at one phone and
// one desktop viewport (spec #22).
const REDUCED_MOTION_VIEWPORTS = new Set(["390x844", "1440x900"]);

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const OUT_DIR = join(REPO_ROOT, "probe-out");

function parseArgs(argv) {
  const opts = { url: null };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--url") {
      opts.url = argv[++i];
      if (!opts.url) usageError("--url requires a value");
    } else if (arg.startsWith("--url=")) {
      opts.url = arg.slice("--url=".length);
    } else {
      usageError(`unknown argument: ${arg}`);
    }
  }
  return opts;
}

function usageError(message) {
  console.error(`probe: ${message}`);
  console.error("usage: npm run probe [-- --url <base>]");
  process.exit(2);
}

function runCommand(command, args, env) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: REPO_ROOT,
      env: { ...process.env, ...env },
      stdio: ["ignore", "inherit", "inherit"],
    });
    child.on("error", reject);
    child.on("close", (code) =>
      code === 0 ? resolve() : reject(new Error(`${command} ${args.join(" ")} exited ${code}`))
    );
  });
}

async function probeViewport(browser, baseUrl, viewport, { reducedMotion = false } = {}) {
  const label = reducedMotion ? `${viewport.name}-rm` : viewport.name;
  const labeled = { ...viewport, name: label };
  const context = await browser.newContext({
    viewport: { width: viewport.width, height: viewport.height },
    deviceScaleFactor: viewport.deviceScaleFactor,
    isMobile: viewport.mobile,
    hasTouch: viewport.mobile,
    ...(reducedMotion ? { reducedMotion: "reduce" } : {}),
  });
  let page = null;
  try {
    page = await context.newPage();
    await page.goto(`${baseUrl}/`, { waitUntil: "load", timeout: 30_000 });
    await settle(page);

    const { rects, scrollbarGutter } = await measureHandles(page);
    // Screenshot every viewport on every run, pass or fail (feeds the Eyeball Pass).
    await page.screenshot({ path: join(OUT_DIR, `${label}.png`), fullPage: true });
    console.log(`# ${label} gutter=${scrollbarGutter}px`);

    let failures;
    if (reducedMotion) {
      // Reduced-motion runs repeat only the walk.
      failures = await decideWalk(page, labeled);
    } else {
      // Rest-position invariants first; the reachability invariants drive real
      // wheel input and may move the page; the walk and Trap Probes reset and
      // re-drive the page, so they run last.
      failures = [
        ...decideOverlapInvariant(labeled, rects),
        ...decideStackVsCorners(labeled, rects),
        ...(await decideCtasUsable(page, labeled, rects)),
        ...(await decideLandingHandoff(page, labeled)),
        ...(await decideReachable(page, labeled, "news-card", "news-reachable")),
        ...(await decideReachable(page, labeled, "about-panel", "about-reachable")),
      ];
      if (await homepageHasLanding(page)) {
        failures.push(...decideNavLogoTarget(labeled, rects));
        failures.push(
          ...(await decideReachable(page, labeled, "contact-panel", "contact-reachable"))
        );
      }
      failures.push(...(await decideWalk(page, labeled)));
      await resetToTop(page);
      failures.push(...(await decideTrapProbe(page, labeled, "news-card")));
      failures.push(...(await decideTrapProbe(page, labeled, "about-panel")));
    }

    if (failures.length === 0) {
      console.log(`ok ${label}`);
    } else {
      for (const line of failures) console.log(line);
    }
    return failures;
  } catch (error) {
    // One broken viewport must not abort the run: keep the per-viewport
    // screenshot guarantee for the rest and report this one as red.
    if (page) {
      await page
        .screenshot({ path: join(OUT_DIR, `${label}.png`), fullPage: true })
        .catch(() => {});
    }
    const failure = `${label} / probe-error / ${error.message.split("\n")[0]}`;
    console.log(failure);
    return [failure];
  } finally {
    await context.close();
  }
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  let server = null;
  let baseUrl;

  if (opts.url) {
    baseUrl = opts.url.replace(/\/+$/, "");
  } else {
    console.log("probe: building site (JEKYLL_ENV=production)…");
    await runCommand("bundle", ["exec", "jekyll", "build"], { JEKYLL_ENV: "production" });
    server = await serveStatic(join(REPO_ROOT, "_site"));
    baseUrl = server.baseUrl;
    console.log(`probe: serving _site at ${baseUrl}`);
  }

  await mkdir(OUT_DIR, { recursive: true });
  const browser = await chromium.launch({
    // Classic (non-overlay) scrollbars so results match real desktop Chrome
    // and scrollbar-width overlaps cannot pass silently. Playwright's headless
    // default --hide-scrollbars must be dropped or no width is ever reserved.
    ignoreDefaultArgs: ["--hide-scrollbars"],
    args: ["--disable-features=OverlayScrollbar"],
  });

  try {
    const allFailures = [];
    const payload = await decidePayload(browser, baseUrl);
    console.log(formatPayloadSummary(payload.measured));
    if (payload.failures.length === 0) {
      console.log("ok payload");
    } else {
      for (const line of payload.failures) console.log(line);
      allFailures.push(...payload.failures);
    }

    for (const viewport of VIEWPORTS) {
      allFailures.push(...(await probeViewport(browser, baseUrl, viewport)));
    }
    for (const viewport of VIEWPORTS.filter((v) => REDUCED_MOTION_VIEWPORTS.has(v.name))) {
      allFailures.push(...(await probeViewport(browser, baseUrl, viewport, { reducedMotion: true })));
    }
    if (allFailures.length > 0) {
      console.log(`probe: ${allFailures.length} failure(s) across the viewport set`);
      process.exitCode = 1;
    } else {
      console.log(`probe: all ${VIEWPORTS.length} viewports green`);
    }
  } finally {
    await browser.close();
    if (server) await server.close();
  }
}

main().catch((error) => {
  console.error(`probe: ${error.message}`);
  process.exit(2);
});
