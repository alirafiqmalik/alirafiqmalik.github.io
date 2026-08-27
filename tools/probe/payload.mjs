// Payload Group — landing-page bytes, image ceiling, font hosts, font count.
// Observes only externally visible facts (ADR-0001): request URLs, hosts, and
// body/transfer sizes collected while loading `/`. Never CSS classes.
export const DEFAULT_BUDGETS = {
  totalBytes: 1_048_576,
  imageCeiling: 153_600,
  fontCount: 3,
  maxFontFiles: 3,
};

const FONT_HOSTS = new Set(["fonts.googleapis.com", "fonts.gstatic.com"]);
const IMAGE_EXT = /\.(png|jpe?g|webp|gif|svg|ico)(\?|$)/i;
const FONT_EXT = /\.(woff2?|ttf|otf)(\?|$)/i;

function pathOf(url) {
  try {
    return new URL(url).pathname;
  } catch {
    return url;
  }
}

function hostOf(url) {
  try {
    return new URL(url).host;
  } catch {
    return "";
  }
}

function originHost(origin) {
  try {
    return new URL(origin).host;
  } catch {
    return "";
  }
}

function entryBytes(entry) {
  return Math.max(Number(entry.bytes) || 0, Number(entry.fallbackBytes) || 0);
}

function isImage(entry) {
  return entry.resourceType === "image" || IMAGE_EXT.test(entry.url);
}

function isFontFile(entry) {
  return entry.resourceType === "font" || FONT_EXT.test(entry.url);
}

function isThirdPartyFont(entry, pageHost) {
  const host = hostOf(entry.url);
  if (FONT_HOSTS.has(host)) return true;
  if (isFontFile(entry) && host && pageHost && host !== pageHost) return true;
  return false;
}

export function formatPayloadSummary(measured) {
  return (
    `# payload total=${measured.total} images=${measured.images} ` +
    `fonts=${measured.fonts} thirdPartyFonts=${measured.thirdPartyFonts}`
  );
}

/**
 * Decide Payload Group invariants from collected request entries.
 * `budgets.origin` is the page origin used to classify third-party hosts.
 */
export function decidePayloadFromEntries(entries, budgets = DEFAULT_BUDGETS) {
  const totalLimit = budgets.totalBytes ?? DEFAULT_BUDGETS.totalBytes;
  const imageLimit = budgets.imageCeiling ?? DEFAULT_BUDGETS.imageCeiling;
  const fontLimit = budgets.fontCount ?? budgets.maxFontFiles ?? DEFAULT_BUDGETS.fontCount;
  const pageHost = originHost(budgets.origin || "");

  const failures = [];
  let total = 0;
  let images = 0;
  let fonts = 0;
  let thirdPartyFonts = 0;

  for (const entry of entries) {
    const bytes = entryBytes(entry);
    total += bytes;

    if (isImage(entry)) {
      images += 1;
      if (bytes > imageLimit) {
        failures.push(
          `payload / image-ceiling / ${pathOf(entry.url)} ${bytes} > ${imageLimit}`
        );
      }
    }

    if (isFontFile(entry)) fonts += 1;

    if (isThirdPartyFont(entry, pageHost)) {
      thirdPartyFonts += 1;
      failures.push(`payload / third-party-fonts / ${entry.url}`);
    }
  }

  if (total > totalLimit) {
    failures.unshift(`payload / total-bytes / ${total} > ${totalLimit}`);
  }
  if (fonts > fontLimit) {
    failures.push(`payload / font-count / ${fonts} > ${fontLimit}`);
  }

  return {
    failures,
    measured: { total, images, fonts, thirdPartyFonts },
  };
}

async function sizeOfResponse(response) {
  const headers = response.headers();
  const contentLength = Number(headers["content-length"]);
  const headerBytes =
    Number.isFinite(contentLength) && contentLength > 0 ? contentLength : 0;
  let bodyBytes = 0;
  try {
    const body = await response.body();
    bodyBytes = body.length;
  } catch {
    // Body may already be consumed or unavailable; header/timing still apply.
  }
  return Math.max(headerBytes, bodyBytes);
}

/**
 * Load `/` once and collect request entries (Playwright). One pass per probe
 * invocation — Payload Group is not per-viewport.
 */
export async function collectLandingPayload(browser, baseUrl) {
  const origin = baseUrl.replace(/\/+$/, "");
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1,
  });
  const page = await context.newPage();
  const byUrl = new Map();
  const pending = new Set();

  const record = (url, resourceType, bytes, fallbackBytes = 0) => {
    const prev = byUrl.get(url);
    const nextBytes = Math.max(bytes || 0, prev?.bytes || 0);
    const nextFallback = Math.max(fallbackBytes || 0, prev?.fallbackBytes || 0);
    byUrl.set(url, {
      url,
      resourceType: resourceType || prev?.resourceType || "other",
      bytes: nextBytes,
      fallbackBytes: nextFallback,
    });
  };

  page.on("request", (request) => {
    record(request.url(), request.resourceType(), 0);
  });
  page.on("response", (response) => {
    const req = response.request();
    const job = sizeOfResponse(response)
      .then((bytes) => {
        record(req.url(), req.resourceType(), 0, bytes);
      })
      .catch(() => {
        record(req.url(), req.resourceType(), 0);
      })
      .finally(() => pending.delete(job));
    pending.add(job);
  });
  page.on("requestfailed", (request) => {
    record(request.url(), request.resourceType(), 0);
  });

  try {
    await page.goto(`${origin}/`, { waitUntil: "load", timeout: 30_000 });
    // Blink lazy-load uses proximity to the *current* viewport. A jump to
    // scrollHeight can skip mid-page images (the About portrait sits several
    // viewports above Contact). Walk every img into view and force eager load
    // so the budget sees every homepage image, not just what happened to fetch.
    await page
      .evaluate(async () => {
        const scroller =
          document.getElementById("page-scroll-container") ||
          document.scrollingElement ||
          document.documentElement;

        for (const el of document.querySelectorAll("section, footer, [data-probe]")) {
          el.scrollIntoView({ block: "center", behavior: "instant" });
        }

        const imgs = [...document.images];
        await Promise.all(
          imgs.map((img) => {
            img.loading = "eager";
            img.scrollIntoView({ block: "center", behavior: "instant" });
            if (img.complete) return Promise.resolve();
            return new Promise((resolve) => {
              img.addEventListener("load", resolve, { once: true });
              img.addEventListener("error", resolve, { once: true });
            });
          })
        );

        scroller.scrollTo(0, scroller.scrollHeight);
      })
      .catch(() => {});
    await page.waitForLoadState("networkidle", { timeout: 8_000 }).catch(() => {});
    await Promise.all([...pending]);

    const timing = await page.evaluate(() => {
      const list = [
        ...performance.getEntriesByType("navigation"),
        ...performance.getEntriesByType("resource"),
      ];
      const map = {};
      for (const entry of list) {
        map[entry.name] = {
          transferSize: entry.transferSize || 0,
          encodedBodySize: entry.encodedBodySize || 0,
        };
      }
      return map;
    });
    for (const [url, entry] of byUrl) {
      const timed = timing[url];
      if (!timed) continue;
      // Prefer the larger of transfer vs encoded body so a Resource Timing
      // under-count cannot hide an over-budget file.
      const timedBytes = Math.max(timed.transferSize || 0, timed.encodedBodySize || 0);
      if (timedBytes > 0) {
        entry.fallbackBytes = Math.max(entry.fallbackBytes || 0, timedBytes);
      }
    }
  } finally {
    await context.close();
  }

  return {
    origin,
    entries: [...byUrl.values()],
  };
}

export async function decidePayload(browser, baseUrl) {
  const { origin, entries } = await collectLandingPayload(browser, baseUrl);
  const { failures, measured } = decidePayloadFromEntries(entries, {
    ...DEFAULT_BUDGETS,
    origin,
  });
  return { failures, measured };
}

export const runPayloadPass = decidePayload;
