# AGENTS.md

## Cursor Cloud specific instructions

This repo is a **Jekyll 4** static site (Ruby). It is a personal academic portfolio
served as static HTML; there is no backend, database, or automated test suite.

### Services / commands
- **Dev server**: `bundle exec jekyll serve --livereload --host 0.0.0.0 --port 4000` (serves at `http://localhost:4000/`). This is the main thing to run; see `README.md`.
- **Build**: `bundle exec jekyll build` (CI runs this with `JEKYLL_ENV=production`; see `.github/workflows/jekyll.yml`).
- **Landing globe (COBE)**: `npm ci && npm run build:globe` bundles `assets/js/globe-src.js` → `assets/js/globe.js` (depends on `cobe`). Re-run after editing the globe source.
- **Health check (closest thing to lint)**: `bundle exec jekyll doctor`. There is no separate linter or test framework.

### Non-obvious notes
- Gems are installed into a project-local `vendor/bundle` (via `bundle config set --local path 'vendor/bundle'`). `vendor/` and `.bundle/` are gitignored. Always run Jekyll commands through `bundle exec`.
- The lockfile is pinned to **Bundler 4.0.6**; use that version (`gem install bundler -v 4.0.6`) so `bundle install` does not try to re-resolve.
- CI uses Ruby 3.3, but Ruby 3.2 (Ubuntu 24.04 system Ruby) builds the site fine; the Gemfile only requires Ruby 3+.
- Jekyll's livereload watcher does **not** pick up changes to `_config.yml`; restart `jekyll serve` after editing it. Content/layout/data file edits hot-reload automatically.

### SOLID CONSTRAINT — multi-device review before signoff
**Do not sign off, merge, or push landing/UI changes as done until you have visually
reviewed the live local page across multiple device sizes.** A production Jekyll
build alone is not sufficient. Layout regressions (overlaps, clipped News, clipped
About bio, stacked vs corner hero breaking) have shipped more than once when agents
skipped this.

**Required before signoff (landing / About / CSS / home layout / news / social icons):**
1. Run the local server and hard-refresh after CSS changes.
2. Resize (or device-emulate) and screenshot **at least** these viewports:
   - Phone: `390×844`
   - Short phone: `360×640`
   - Tablet portrait: `768×1024`
   - Tablet landscape / small laptop: `1024×768`
   - MacBook common: `1280×800`
   - Compact laptop: `1440×780`
   - Standard laptop: `1440×900`
   - Desktop: `1920×1080`
3. Every viewport must **PASS** all of:
   - **No overlaps:** name, tagline, nav, bio, and News must not cover each other.
   - **News readable:** every selected news item is reachable (fully visible or
     scrollable inside the News card) — never clipped mid-item with no way to read it.
   - **About readable:** the full About bio is reachable (fully visible or scrollable
     inside the About panel) — never clipped mid-paragraph with no way to read it.
   - **≤899px stacks:** title → news → bio/CTAs (not cramped absolute corners).
   - **≥900px corners:** bio bottom-left, News bottom-right, title centered above.
   - **CTAs usable:** social icons + CV/Projects fully on-screen and clickable.
4. If any viewport fails, fix and re-run the full matrix before signing off.
5. Prefer browser/computer-use screenshots over guessing from CSS media queries.
