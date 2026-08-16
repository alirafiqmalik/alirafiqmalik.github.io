// The probe is tested at exactly one seam: its own CLI — command in,
// exit code + stdout + screenshot directory out (spec #22 testing decisions).
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { readdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { serveStatic } from "../serve.mjs";
import { VIEWPORTS } from "../viewports.mjs";

const PROBE_DIR = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(PROBE_DIR, "..", "..", "..");
const PROBE = join(REPO_ROOT, "tools", "probe", "probe.mjs");

function runProbe(args) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [PROBE, ...args], { cwd: REPO_ROOT });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => (stdout += chunk));
    child.stderr.on("data", (chunk) => (stderr += chunk));
    child.on("error", reject);
    child.on("close", (code) => resolve({ code, stdout, stderr }));
  });
}

async function screenshotSet() {
  const files = await readdir(join(REPO_ROOT, "probe-out"));
  return new Set(files);
}

test("overlap fixture goes red naming the overlap invariant", { timeout: 300_000 }, async () => {
  const server = await serveStatic(join(REPO_ROOT, "tools", "probe", "fixtures", "overlap"));
  try {
    const { code, stdout, stderr } = await runProbe(["--url", server.baseUrl]);
    assert.equal(code, 1, `expected exit 1\nstdout:\n${stdout}\nstderr:\n${stderr}`);
    for (const viewport of VIEWPORTS) {
      assert.match(
        stdout,
        new RegExp(`^${viewport.name} / overlap / name=.* intersects tagline=`, "m"),
        `expected an overlap failure line for ${viewport.name}\nstdout:\n${stdout}`
      );
    }
    const shots = await screenshotSet();
    for (const viewport of VIEWPORTS) {
      assert.ok(shots.has(`${viewport.name}.png`), `missing screenshot ${viewport.name}.png`);
    }
    // Classic scrollbars forced: a desktop viewport on this overflowing
    // fixture must reserve scrollbar width (overlay scrollbars reserve 0).
    const gutter = stdout.match(/^# 1280x800 gutter=(\d+)px$/m);
    assert.ok(gutter && Number(gutter[1]) > 0, `expected reserved scrollbar width at 1280x800\nstdout:\n${stdout}`);
  } finally {
    await server.close();
  }
});

test("clipped News fixture goes red naming the news-reachable invariant", { timeout: 300_000 }, async () => {
  const server = await serveStatic(join(REPO_ROOT, "tools", "probe", "fixtures", "news-clipped"));
  try {
    const { code, stdout, stderr } = await runProbe(["--url", server.baseUrl]);
    assert.equal(code, 1, `expected exit 1\nstdout:\n${stdout}\nstderr:\n${stderr}`);
    assert.match(
      stdout,
      /^1280x800 \/ news-reachable \//m,
      `expected a news-reachable failure line at 1280x800\nstdout:\n${stdout}`
    );
  } finally {
    await server.close();
  }
});

test("stacked-at-desktop fixture goes red naming the stack-vs-corners invariant", { timeout: 300_000 }, async () => {
  const server = await serveStatic(join(REPO_ROOT, "tools", "probe", "fixtures", "stacked-desktop"));
  try {
    const { code, stdout, stderr } = await runProbe(["--url", server.baseUrl]);
    assert.equal(code, 1, `expected exit 1\nstdout:\n${stdout}\nstderr:\n${stderr}`);
    assert.match(
      stdout,
      /^900x800 \/ stack-vs-corners \//m,
      `expected a stack-vs-corners failure line at 900x800\nstdout:\n${stdout}`
    );
    // Boundary Pair: the same layout must be green on the stacked side.
    assert.doesNotMatch(
      stdout,
      /^899x800 \/ stack-vs-corners \//m,
      `stacked side of the Boundary Pair should pass\nstdout:\n${stdout}`
    );
  } finally {
    await server.close();
  }
});

test("trap fixture goes red naming the scroll-trap invariant", { timeout: 300_000 }, async () => {
  const server = await serveStatic(join(REPO_ROOT, "tools", "probe", "fixtures", "scroll-trap"));
  try {
    const { code, stdout, stderr } = await runProbe(["--url", server.baseUrl]);
    assert.equal(code, 1, `expected exit 1\nstdout:\n${stdout}\nstderr:\n${stderr}`);
    assert.match(
      stdout,
      /^1280x800 \/ scroll-trap \/ news-card/m,
      `expected a scroll-trap failure line at 1280x800\nstdout:\n${stdout}`
    );
  } finally {
    await server.close();
  }
});

test("current site goes green (build + serve + probe exits 0)", { timeout: 600_000 }, async () => {
  const { code, stdout, stderr } = await runProbe([]);
  assert.equal(code, 0, `expected exit 0\nstdout:\n${stdout}\nstderr:\n${stderr}`);
  const shots = await screenshotSet();
  for (const viewport of VIEWPORTS) {
    assert.ok(shots.has(`${viewport.name}.png`), `missing screenshot ${viewport.name}.png`);
  }
});
