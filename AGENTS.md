# AGENTS.md

## Cursor Cloud specific instructions

This repo is a **Jekyll 4** static site (Ruby). It is a personal academic portfolio
served as static HTML; there is no backend, database, or automated test suite.

### Services / commands
- **Dev server**: `bundle exec jekyll serve --livereload --host 0.0.0.0 --port 4000` (serves at `http://localhost:4000/`). This is the main thing to run; see `README.md`.
- **Build**: `bundle exec jekyll build` (CI runs this with `JEKYLL_ENV=production`; see `.github/workflows/jekyll.yml`).
- **Landing globe (COBE)**: `npm ci && npm run build:globe` bundles `assets/js/globe-src.js` → `assets/js/globe.js` (depends on `cobe`). Re-run after editing the globe source.
- **Health check (closest thing to lint)**: `bundle exec jekyll doctor`. There is no separate linter or test framework.
- **Layout Probe**: `npm run probe` builds the site, serves `_site`, and decides the Viewport Matrix invariants (screenshots in `probe-out/`); `npm run probe -- --url <base>` attaches to a running server instead. One-time setup: `npm install` then `npx playwright install chromium`. Probe self-tests: `npm run probe:test`.

### Non-obvious notes
- Gems are installed into a project-local `vendor/bundle` (via `bundle config set --local path 'vendor/bundle'`). `vendor/` and `.bundle/` are gitignored. Always run Jekyll commands through `bundle exec`.
- The lockfile is pinned to **Bundler 4.0.6**; use that version (`gem install bundler -v 4.0.6`) so `bundle install` does not try to re-resolve.
- CI uses Ruby 3.3, but Ruby 3.2 (Ubuntu 24.04 system Ruby) builds the site fine; the Gemfile only requires Ruby 3+.
- Jekyll's livereload watcher does **not** pick up changes to `_config.yml`; restart `jekyll serve` after editing it. Content/layout/data file edits hot-reload automatically.

### SOLID CONSTRAINT — Signoff for landing / About / CSS / home-layout / news / social-icon changes

**Signoff is two steps, both mandatory:**
1. **`npm run probe` passes** (exit 0). The Layout Probe executes the mechanical
   half of the Viewport Matrix below at all 11 viewports — the 8 canonical ones
   plus the Boundary Pair (`899×800` / `900×800`) and the Narrow Floor
   (`320×568`) — and repeats the scroll walk under reduced motion at one phone
   and one desktop viewport.
2. **Eyeball Pass over `probe-out/`.** The probe writes a full-page screenshot
   per viewport on every run; a human (or vision-capable agent) reviews them
   before signoff. The probe complements, never replaces, this review
   (`docs/adr/0001-layout-probe-observable-only.md`): aesthetics — spacing,
   typography, visual balance — are out of the probe's scope by design.

If any viewport fails, fix and re-run until the probe is green; do not merge or
push landing/UI changes red. While iterating, `npm run probe -- --url <base>`
attaches to an already-running dev server and skips the build.

#### Viewport Matrix (spec of record)

Canonical viewports: phone `390×844`, short phone `360×640`, tablet portrait
`768×1024`, tablet landscape `1024×768`, MacBook common `1280×800`, compact
laptop `1440×780`, standard laptop `1440×900`, desktop `1920×1080`.

Every viewport must satisfy all of:
- **No overlaps:** name, tagline, nav, bio, and News must not cover each other.
- **Landing handoff:** About starts at the landing edge. No empty scroll runway
  separates the sections.
- **News readable:** every selected news item is reachable (fully visible or
  scrollable inside the News card) — never clipped mid-item with no way to read it.
- **About readable:** the full About bio is reachable (fully visible or scrollable
  inside the About panel) — never clipped mid-paragraph with no way to read it.
- **≤899px stacks:** title → news → bio/CTAs (not cramped absolute corners).
- **≥900px corners:** bio bottom-left, News bottom-right, title centered above.
- **CTAs usable:** social icons + CV/Projects fully on-screen and clickable.
- **Scroll continuity:** wheel/trackpad can advance landing → About → Research →
  later sections without getting stuck. Nested News/About scrollports must not
  trap page scroll (`overscroll-behavior: contain` is unsafe inside
  `#page-scroll-container`; `overflow-x: hidden` + `overflow-y: visible`
  computes to a scrollport — use `overflow-x: clip` instead). Soft-snap
  (`landing-scroll-soft`) must clear once About is settled.

#### Probe Handle contract

The homepage elements named by the Viewport Matrix carry `data-probe`
attributes: `name`, `tagline`, `nav`, `news-card`, `about-panel`, `cta-social`,
`cta-links`. The probe locates elements only through these handles and section
ids — never styling or state classes (ADR-0001) — so renaming or removing a
`data-probe` attribute is a contract change: keep the handle on the element
that plays that role, or update the probe and this section together.

#### Deliberate non-goals (do not "fix" these later)

- **Local-only** — no CI gate yet; promotion is a separate decision after
  observing flake rate.
- **Homepage-only** — other pages are out of the probe's scope.
- **No retries** — a red run is a real bug in the site or in the probe's settle
  detection; fix one of them, never re-roll.
- Landscape phone `844×390` is a possible later viewport row, not a current one.

## Agent skills

### Issue tracker

Issues are tracked in this repo's GitHub Issues (via the `gh` CLI). See `docs/agents/issue-tracker.md`.

### Triage labels

Default label vocabulary: `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context layout — `CONTEXT.md` and `docs/adr/` at the repo root. See `docs/agents/domain.md`.
