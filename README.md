# Ali Hamza Malik — Personal Website

Jekyll academic portfolio. Built with vanilla CSS, dark mode, and project filtering.

## Local Development

```bash
gem install bundler
bundle install
npm ci
npm run build:globe   # bundles COBE landing globe → assets/js/globe.js
bundle exec jekyll serve --livereload
# http://localhost:4000
```

Requires Ruby 3+ and Node 18+. Works on macOS, Linux, and Windows.

The landing globe uses [`cobe`](https://github.com/shuding/cobe) (dark mode). Edit `assets/js/globe-src.js`, then run `npm run build:globe`.

## Structure

```
_config.yml      Site configuration
_layouts/        Page templates
_includes/       Reusable components (head, nav, footer)
_data/           YAML data (personal, cv, home, news)
_projects/       Project collection (markdown)
_history/        Timeline collection (markdown)
assets/          CSS, JS, images, PDF
```

## Deploy

Push to `main` — GitHub Actions builds and deploys via `.github/workflows/jekyll.yml`.

> Repo Settings → Pages → Source must be set to **GitHub Actions**.
