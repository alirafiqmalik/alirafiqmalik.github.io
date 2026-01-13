# Ali Hamza Malik - Personal Website

Jekyll-based academic portfolio. Al-folio inspired design.

## Quick Start

```bash
# Install Ruby first (https://rubyinstaller.org/ for Windows)
gem install bundler jekyll

# Install dependencies
bundle install

# Serve locally
bundle exec jekyll serve --livereload
# Visit http://localhost:4000
```

## Structure

```
├── _config.yml      # Site configuration
├── _layouts/        # Page templates
├── _includes/       # Reusable components
├── _data/           # YAML data files
├── _projects/       # Project collection
├── _history/        # Timeline collection
├── assets/          # CSS, JS, images
└── *.html           # Pages
```

## Content

- Edit `_data/personal.yml` for profile info
- Edit `_data/cv.yml` for CV sections
- Add projects to `_projects/`
- Add timeline items to `_history/`

## Deploy

Push to GitHub - uses Jekyll Pages action in `.github/workflows/`.
