// Payload Group — decision logic and CLI seam (bytes, hosts, font counts).
// Observes only externally visible facts per ADR-0001.
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { serveStatic } from "../serve.mjs";
import {
  DEFAULT_BUDGETS,
  decidePayloadFromEntries,
  formatPayloadSummary,
} from "../payload.mjs";

const PROBE_DIR = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(PROBE_DIR, "..", "..", "..");
const PROBE = join(REPO_ROOT, "tools", "probe", "probe.mjs");
const FIXTURES = join(REPO_ROOT, "tools", "probe", "fixtures");

function runProbe(args, extraEnv = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [PROBE, ...args], {
      cwd: REPO_ROOT,
      env: { ...process.env, ...extraEnv },
    });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => (stdout += chunk));
    child.stderr.on("data", (chunk) => (stderr += chunk));
    child.on("error", reject);
    child.on("close", (code) => resolve({ code, stdout, stderr }));
  });
}

async function withIsolatedProbeOut(fn) {
  const probeOut = await mkdtemp(join(tmpdir(), "probe-payload-"));
  return fn({ PROBE_OUT: probeOut });
}

const ORIGIN = "http://127.0.0.1:4000";
const budgets = { ...DEFAULT_BUDGETS, origin: ORIGIN };

function entry(url, bytes, resourceType) {
  return { url, bytes, resourceType };
}

test("decidePayloadFromEntries: all four invariants pass under budget", () => {
  const entries = [
    entry(`${ORIGIN}/`, 12_000, "document"),
    entry(`${ORIGIN}/assets/css/main.css`, 40_000, "stylesheet"),
    entry(`${ORIGIN}/assets/img/hero.webp`, 80_000, "image"),
    entry(`${ORIGIN}/assets/fonts/body.woff2`, 30_000, "font"),
    entry(`${ORIGIN}/assets/fonts/mono.woff2`, 20_000, "font"),
  ];
  const { failures, measured } = decidePayloadFromEntries(entries, budgets);
  assert.deepEqual(failures, []);
  assert.equal(measured.total, 182_000);
  assert.equal(measured.images, 1);
  assert.equal(measured.fonts, 2);
  assert.equal(measured.thirdPartyFonts, 0);
  assert.equal(
    formatPayloadSummary(measured),
    "# payload total=182000 images=1 fonts=2 thirdPartyFonts=0"
  );
});

test("decidePayloadFromEntries: total-bytes fails when the sum exceeds 1 MB", () => {
  const entries = [
    entry(`${ORIGIN}/`, 500_000, "document"),
    entry(`${ORIGIN}/assets/js/app.js`, 600_000, "script"),
  ];
  const { failures } = decidePayloadFromEntries(entries, budgets);
  assert.equal(failures.length, 1);
  assert.equal(failures[0], "payload / total-bytes / 1100000 > 1048576");
});

test("decidePayloadFromEntries: image-ceiling names the oversized image path", () => {
  const entries = [
    entry(`${ORIGIN}/assets/img/ali.jpg`, 3_871_933, "image"),
    entry(`${ORIGIN}/favicon.ico`, 1_024, "image"),
  ];
  const { failures } = decidePayloadFromEntries(entries, budgets);
  assert.ok(
    failures.includes("payload / image-ceiling / /assets/img/ali.jpg 3871933 > 153600"),
    `expected image-ceiling line, got:\n${failures.join("\n")}`
  );
  assert.equal(
    failures.some((line) => line.includes("favicon.ico")),
    false,
    "images at or under the ceiling must not be named"
  );
});

test("decidePayloadFromEntries: image-ceiling treats svg/webp URLs as images even without type", () => {
  const entries = [entry(`${ORIGIN}/assets/img/hero.webp`, 200_000, "other")];
  const { failures } = decidePayloadFromEntries(entries, budgets);
  assert.ok(
    failures.some((line) => line.startsWith("payload / image-ceiling / /assets/img/hero.webp 200000")),
    `expected webp URL to count as an image\n${failures.join("\n")}`
  );
});

test("decidePayloadFromEntries: image at the ceiling passes", () => {
  const entries = [entry(`${ORIGIN}/photo.png`, 153_600, "image")];
  const { failures } = decidePayloadFromEntries(entries, budgets);
  assert.equal(
    failures.some((line) => line.includes("image-ceiling")),
    false
  );
});

test("decidePayloadFromEntries: Google Fonts stylesheet is a third-party font request", () => {
  const href = "https://fonts.googleapis.com/css2?family=Inter:wght@400&display=swap";
  const entries = [entry(href, 2_000, "stylesheet")];
  const { failures, measured } = decidePayloadFromEntries(entries, budgets);
  assert.ok(
    failures.includes(`payload / third-party-fonts / ${href}`),
    `expected third-party-fonts line, got:\n${failures.join("\n")}`
  );
  assert.equal(measured.thirdPartyFonts, 1);
  assert.equal(measured.fonts, 0, "a CSS stylesheet is not a font file");
});

test("decidePayloadFromEntries: fonts.gstatic.com host is third-party even as a font file", () => {
  const href = "https://fonts.gstatic.com/s/inter/v12/inter.woff2";
  const entries = [entry(href, 40_000, "font")];
  const { failures, measured } = decidePayloadFromEntries(entries, budgets);
  assert.ok(failures.includes(`payload / third-party-fonts / ${href}`));
  assert.equal(measured.fonts, 1);
  assert.equal(measured.thirdPartyFonts, 1);
});

test("decidePayloadFromEntries: font file from a foreign host is third-party", () => {
  const href = "https://cdn.example.com/fonts/display.woff2";
  const entries = [entry(href, 12_000, "font")];
  const { failures } = decidePayloadFromEntries(entries, budgets);
  assert.ok(failures.includes(`payload / third-party-fonts / ${href}`));
});

test("decidePayloadFromEntries: same-origin font files are not third-party", () => {
  const entries = [
    entry(`${ORIGIN}/assets/fonts/next.woff2`, 10_000, "font"),
    entry(`${ORIGIN}/assets/fonts/mono.woff2`, 10_000, "font"),
    entry(`${ORIGIN}/assets/fonts/extra.ttf`, 10_000, "other"),
  ];
  const { failures, measured } = decidePayloadFromEntries(entries, budgets);
  assert.equal(measured.fonts, 3);
  assert.equal(measured.thirdPartyFonts, 0);
  assert.equal(
    failures.some((line) => line.includes("third-party-fonts")),
    false
  );
});

test("decidePayloadFromEntries: font-count fails above 3 font files", () => {
  const entries = [
    entry(`${ORIGIN}/a.woff2`, 1, "font"),
    entry(`${ORIGIN}/b.woff2`, 1, "font"),
    entry(`${ORIGIN}/c.woff2`, 1, "font"),
    entry(`${ORIGIN}/d.woff`, 1, "font"),
  ];
  const { failures, measured } = decidePayloadFromEntries(entries, budgets);
  assert.equal(measured.fonts, 4);
  assert.ok(failures.includes("payload / font-count / 4 > 3"));
});

test("decidePayloadFromEntries: uses content-length/body bytes when transferSize is 0", () => {
  const { failures } = decidePayloadFromEntries(
    [{ url: `${ORIGIN}/app.js`, bytes: 0, resourceType: "script", fallbackBytes: 2_000_000 }],
    budgets
  );
  assert.ok(
    failures.includes("payload / total-bytes / 2000000 > 1048576"),
    `expected fallback bytes to count toward the total\n${failures.join("\n")}`
  );
});

test("decidePayloadFromEntries: under-counted transferSize cannot hide an over-budget image", () => {
  const { failures } = decidePayloadFromEntries(
    [
      {
        url: `${ORIGIN}/big.png`,
        bytes: 66_492,
        resourceType: "image",
        fallbackBytes: 200_000,
      },
    ],
    budgets
  );
  assert.ok(
    failures.includes("payload / image-ceiling / /big.png 200000 > 153600"),
    `expected the larger measured size to decide the ceiling\n${failures.join("\n")}`
  );
});

test("oversized image fixture goes red naming image-ceiling", { timeout: 300_000 }, async () => {
  const dir = join(FIXTURES, "payload-image");
  await writeFile(join(dir, "big.png"), Buffer.alloc(200_000, 1));
  const server = await serveStatic(dir);
  try {
    await withIsolatedProbeOut(async (env) => {
      const { code, stdout, stderr } = await runProbe(["--url", server.baseUrl], env);
      assert.equal(code, 1, `expected exit 1\nstdout:\n${stdout}\nstderr:\n${stderr}`);
      const imageLine = stdout.match(/^payload \/ image-ceiling \/ \/big\.png (\d+) > 153600$/m);
      assert.ok(imageLine, `expected an image-ceiling failure line\nstdout:\n${stdout}`);
      assert.ok(
        Number(imageLine[1]) >= 200_000,
        `expected measured image bytes >= 200000, got ${imageLine[1]}`
      );
      assert.match(stdout, /^# payload total=\d+ images=\d+ fonts=\d+ thirdPartyFonts=\d+$/m);
    });
  } finally {
    await server.close();
  }
});

test("Google Fonts fixture goes red naming third-party-fonts", { timeout: 300_000 }, async () => {
  const server = await serveStatic(join(FIXTURES, "payload-fonts"));
  try {
    await withIsolatedProbeOut(async (env) => {
      const { code, stdout, stderr } = await runProbe(["--url", server.baseUrl], env);
      assert.equal(code, 1, `expected exit 1\nstdout:\n${stdout}\nstderr:\n${stderr}`);
      assert.match(
        stdout,
        /^payload \/ third-party-fonts \/ https:\/\/fonts\.googleapis\.com\//m,
        `expected a third-party-fonts failure line\nstdout:\n${stdout}`
      );
    });
  } finally {
    await server.close();
  }
});
