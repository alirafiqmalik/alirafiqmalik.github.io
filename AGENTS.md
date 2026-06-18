# AGENTS.md

## Cursor Cloud specific instructions

This repo is a **Jekyll 4** static site (Ruby). It is a personal academic portfolio
served as static HTML; there is no backend, database, or automated test suite.

### Services / commands
- **Dev server**: `bundle exec jekyll serve --livereload --host 0.0.0.0 --port 4000` (serves at `http://localhost:4000/`). This is the main thing to run; see `README.md`.
- **Build**: `bundle exec jekyll build` (CI runs this with `JEKYLL_ENV=production`; see `.github/workflows/jekyll.yml`).
- **Health check (closest thing to lint)**: `bundle exec jekyll doctor`. There is no separate linter or test framework.

### Non-obvious notes
- Gems are installed into a project-local `vendor/bundle` (via `bundle config set --local path 'vendor/bundle'`). `vendor/` and `.bundle/` are gitignored. Always run Jekyll commands through `bundle exec`.
- The lockfile is pinned to **Bundler 4.0.6**; use that version (`gem install bundler -v 4.0.6`) so `bundle install` does not try to re-resolve.
- CI uses Ruby 3.3, but Ruby 3.2 (Ubuntu 24.04 system Ruby) builds the site fine; the Gemfile only requires Ruby 3+.
- Jekyll's livereload watcher does **not** pick up changes to `_config.yml`; restart `jekyll serve` after editing it. Content/layout/data file edits hot-reload automatically.
