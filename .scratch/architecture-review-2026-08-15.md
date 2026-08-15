# Architecture review — personal-site (2026-08-15)

Review of the codebase and the deployed site (alihamzamalik.me). Vocabulary from
`/codebase-design`: module, interface, implementation, depth, seam, adapter,
leverage, locality.

> **Note:** the original review had seven candidates. Candidate 2
> ("Delete the al-folio corpse") was completed on 2026-08-15 (commit `7fa1c68`,
> 80 files, −2,510 lines) and is omitted here. Original numbering is kept so
> candidates map to the published artifact.

## Repo map (post-deletion)

The repo previously held three strata: an unreachable al-folio fork substrate
(now deleted), traces of a former Next.js site (git history only), and the
custom Jekyll site actually built: 5 layouts, 5 live includes (`head.html`,
`navigation.html`, `footer.html`, `news-window.html`, `publications-list.html`),
5 top-level pages, 3 loaded scripts, ~3,850 lines of CSS. All recent churn is in
the custom part: `assets/css/main.css`, `_includes/navigation.html`,
`_data/news.yml`, `index.html`, `assets/js/main.js`.

---

## Candidate 1 · One Publication record, five surfaces — **Strong**

**Files:** `_data/news.yml` · `_publications/*.md` · `papers/*.md` ·
`_posts/*.md` · `_history/*.md` · `_includes/news-window.html` ·
`_includes/publications-list.html` · `_layouts/paper.html` ·
`_layouts/project.html`

**Problem.** The QKD paper is five independent records with five field
vocabularies and three canonical URLs (arXiv `2608.07626` only in `news.yml`;
ResearchGate in `_publications` and `papers/`; `/blog-demo-qkd-fv/` as the
detail target). The richest detail page
(`papers/ieee-quantum-week-2026-qkd.md`, 77 lines, 3 committed figures) is
orphaned — nothing links to it since commit `6929cc4` retargeted news to the
blog post. Live drift on the deployed site: venue rendered as "QEC'26", "QCE",
and "Quantum Week"; vulnerability count stated as "three" on the blog post and
"four" on `/cv/`.

**Solution.** One publication module: one file per paper is the whole interface
(title, short title, venue, venue_url, badge, year, canonical_url, mirrors,
abstract); news, history, blog card, publications list, and the detail page are
derived behind it. Merge `paper.html`/`project.html` (near-duplicate
implementations — `paper.html` is strictly weaker) into one adapter. Collapse
`news.yml`'s `prefix`/`paper_title`/`suffix`/`venue` sentence assembly
(`news-window.html:47`) into a sentence template.

**Wins:** locality — venue named once, everywhere · leverage — one record, five
surfaces · drift impossible by construction · orphaned pages get routed or
deleted.

---

## Candidate 3 · Deepen the landing choreography — **Strong**

**Files:** `assets/js/landing-scroll.js` (219) · `assets/css/main.css` ·
`assets/js/main.js` · `index.html` · `_layouts/home.html`

**Problem.** One behaviour spread over four files, coupled by undeclared
conventions — the interface is ~15 implicit cross-file names:

- 6 DOM ids JS hard-codes and HTML must supply (`landing-scroll-track`,
  `landing-stage`, `landing-globe-slot`, `about`, `page-scroll-container`,
  `landing-globe-canvas`).
- 6 CSS custom properties written by JS, read only by CSS
  (`--landing-p/-exit/-reveal/-fade`, `--backdrop-scrim`, `--about-enter`).
- 3 classes toggled by JS, defined only in CSS (`globe-is-bg`,
  `landing-scroll-free`/`-soft`, `is-scrollable`).
- Magic numbers split across files: phase curve in JS
  (`exit = p/0.4`, `reveal = (p-0.1)/0.45`, `fade = (p-0.45)/0.55`,
  `SCRIM_MAX = 0.58`, snap gates `0.55`/`0.94`) vs track scale in CSS
  (`--landing-track-height: 230vh`, overridden per breakpoint). Changing the
  track height silently retimes every JS threshold.
- A DOM reparenting side effect (`landing-scroll.js` moves
  `#landing-globe-slot` onto `<body>`) anticipated by doubled CSS selectors.
- Reduced motion is a second, parallel implementation
  (`main.css` `@media (prefers-reduced-motion)` block duplicates what JS does).
- The 899/900px invariant ("≤899 stacks, ≥900 corners") is spread across ~5
  separate media-query blocks with no shared token; 17 landing-related media
  queries total.

**Solution.** Concentrate the phase curve into one declarative table (a
`--landing-*` custom-property block or `_data/landing.yml`) that both JS and
CSS read. The table is the interface; everything else becomes implementation.
Reduced motion derives from the same table instead of duplicating it.

**Wins:** locality — retiming edits touch one table · reduced-motion derives,
not duplicates · scrim/snap constants stop drifting · interface shrinks from
~15 names to 1.

---

## Candidate 4 · One owner for scroll-snap — **Strong**

**Files:** `assets/js/landing-scroll.js` (soft/free class toggling) ·
`assets/js/main.js` (`scrollWithinPanel` writes `style.scrollSnapType = 'none'`
then restores after a 900 ms timer; 700 ms `isNavigating` lock;
IntersectionObserver at 0.45)

**Problem.** Two modules write `scroll-snap-type` on the same container with no
arbitration; inline style beats class, so `landing-scroll-free`/`-soft` are
silently overridden for 900 ms after any hint-button/arrow-key navigation.
Neither file mentions the other. This is the exact shape of the shipped
scroll-trap regressions ("stop scroll traps after landing → About", "prefer
News scroll over headline clamping").

**Solution.** One scroll-owner module with a tiny interface
(`requestSnap(mode, reason)`); landing choreography and nav become callers, not
co-writers. Likely lands as a ticket inside Candidate 3's spec.

**Wins:** locality — snap bugs concentrate in one module · the 900 ms silent
override disappears · interface is one function, testable.

---

## Candidate 5 · Navigation as one data file — **Worth exploring**

**Files:** `_includes/navigation.html` · `index.html` (Explore More grid) ·
`assets/js/main.js` (`SECTION_ORDER`, `SECTION_CWD_MAP`, `PATHNAME_CWD_MAP`,
`sectionNavMap`)

**Problem.** A nav entry has up to four markup homes (desktop dropdown, mobile
menu, explore grid, plus per-entry `show_blog_in_nav` guards written twice) and
three parallel JS maps that must stay in sync by hand; the maps already
disagree (`news` is in `SECTION_CWD_MAP` but not `SECTION_ORDER`).
Empirically: three commits to add the FSM-tool link. Deployed symptom: the
"Contacts" href is a bare `#contact` fragment — dead on every page but the
homepage.

**Solution.** One `_data/nav.yml` (label, href, section id, cwd, placement
flags) rendered by one include and exposed to `main.js` as a JSON island. Fix
the bare-fragment Contacts href in the same pass.

**Wins:** leverage — one edit instead of six · locality — nav drift becomes
impossible · the three-commits-per-link pattern ends.

---

## Candidate 6 · Make the 8-viewport matrix executable — **Worth exploring**

**Files:** `AGENTS.md:31-54` (the prose test suite) · new:
`scripts/layout-probe`

**Problem.** The site's only test suite is prose in AGENTS.md. Every invariant
it states ("never clipped mid-item", "must not trap page scroll", "≤899px
stacks / ≥900px corners") is a runtime-layout fact with no code
representation — nothing fails when a media-query block is dropped, and the
manual matrix has been skipped under pressure ("regressions shipped more than
once").

**Solution.** A headless probe (Playwright or similar) asserting the boolean
invariants per viewport: named rects don't overlap; News/About fully visible or
`.is-scrollable`; synthetic wheel advances past `#about`; stack vs corners at
899/900. The interface is one command; the behaviour behind it is the whole
8×6 matrix. Complements — does not replace — the AGENTS.md constraint: the
matrix stays as the spec; the probe automates its mechanical half. Screenshots
stay for the eyeball pass.

**Wins:** leverage — one command runs the matrix · regressions caught before
signoff · Candidates 3–4 become refactorable safely.

---

## Candidate 7 · One document shell, one seam — **Speculative**

**Files:** `_layouts/default.html` · `_layouts/home.html` ·
`_includes/footer.html:2` · `experience.html` ↔ `index.html` (17 duplicated
lines of the `site.data.cv.experience` loop)

**Problem.** Two layouts are two adapters at a seam ("does this page use the
one-page scroll shell?") expressed by duplicating the document skeleton — they
differ only by two root classes, one backdrop div, one wrapper, one button, and
two scripts — and the condition already leaks into `footer.html`
(`{% if page.layout == 'home' %}`). Only one adapter varies meaningfully, so
the seam is paid for without being real.

**Solution.** One shell layout with a front-matter flag
(`one_page_scroll: true`); extract the shared experience loop into an include.
Consider folding into Candidate 3's spec.

**Wins:** locality — skeleton edits happen once · delete 17 duplicated lines ·
footer stops reaching across the seam.

---

## Deployed-site observations feeding this review

- Venue naming drift for the one paper: "QEC'26" / "QCE" / "Quantum Week".
- Vulnerability count "three" (blog post) vs "four" (`/cv/`).
- Paper detail page slug is literally `blog-demo-qkd-fv`.
- Dead `/publications/` stub page ("Redirecting to Publications"), unlinked.
- Nav "Contacts" href is a bare `#contact` fragment.
- 8/9 project cards hotlink Unsplash stock photos; one photo reused across
  three unrelated projects (ENIGMA, RISC-V, FPGA renderer).
- Google Scholar link is a placeholder (`?user=alihamzamalik` is not a real
  Scholar id; bounces to sign-in).
- `/projects/drone-swarm/` claims "formation switching latency <2 minutes"
  alongside "communication latencies under 100ms" — probably meant seconds.

## Top recommendation (updated)

Candidate 2 (deletion) is done. Next: **Candidate 1 (Publication record)** —
the drift it fixes is publicly visible right now, and one record per paper
makes it impossible by construction. Run Candidate 6 (probe) before touching
Candidates 3/4.
