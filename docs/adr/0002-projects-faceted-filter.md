# Projects filter is faceted checkboxes over a two-axis taxonomy

The projects page filtered on a single flat row of mutually exclusive
category pills, one per distinct `category` value in `_projects/`.

## Why the pill row failed

Nine projects carried seven categories. Four of those categories — `AI &
Privacy`, `Machine Learning`, `Network Security`, `Robotics` — matched exactly
one project each, so choosing them was navigation, not filtering. The remaining
three matched two projects. No selection could ever narrow the set in a way
that told the reader something they could not already see by scrolling.

Three further problems compounded that:

- **Single-select.** The pills were radio behaviour dressed as buttons. "The
  hardware work *or* the security work" and "the ML work that is *also*
  embedded" were both inexpressible.
- **One axis holding three kinds of thing.** `Hardware Design` is a
  discipline, `Network Security` is a problem domain, and `Machine Learning`
  is a technique. Sorting them alphabetically into one row asserted they were
  comparable.
- **No counts.** Every dead end had to be clicked to be found.

## Decision

Filter on **facets**: several labelled rows of checkboxes, OR within a row and
AND across rows, matching the grouped-checkbox filter already shipped in the
sec-deadlines tool.

The shipped taxonomy is **Three Axes**:

| Domain (what it is about)     | Build Surface (what it is made of) | Setting (where it happened) |
| ----------------------------- | ---------------------------------- | --------------------------- |
| Security & Privacy            | RTL & FPGA                         | Research & Lab Work         |
| Hardware & Silicon            | Embedded Firmware                  | Coursework                  |
| Machine Learning              | ML & Data Pipelines                | Personal Build              |
| Robotics & Cyber-Physical     | Networking & Protocols             |                             |
| Networks & Distributed Systems| Tooling & Automation               |                             |

Thirteen checkboxes over nine projects, none returning fewer than three.
Projects are multi-valued on Domain and Build Surface, which is what lets a
single project answer both "show me the security work" and "show me the RTL
work" without either answer being a list of one. Setting is single-valued and
splits 3/3/3.

The shipped layout is **Console**: monospace, `[ ]` / `[x]` bracket toggles,
and an echoed command line that mirrors the query string. It matches the
terminal prompt already in the nav, so the filter reads as part of the site's
voice rather than as a generic form.

Two alternative taxonomies and two alternative layouts were built and remain
browsable at `/projects/filter-lab/`:

- **Two Axes** drops the Setting row. Ten checkboxes, same guarantees; the
  right choice if provenance stops being worth a row of its own.
- **Three Tracks** is one row of three mutually exclusive tracks, three
  projects each. It is the smallest change from the pill row and fixes the
  single-result problem, but it cannot express cross-cutting queries, which
  was the second reason the pill row failed.
- **Ledger** is the literal read of the sec-deadlines reference: square
  checkboxes and hairline rules. Densest and least decorated.
- **Chip rack** keeps the pill vocabulary the page already used, now grouped
  into labelled rows and multi-selecting. Largest touch targets, most vertical
  space.

## Consequences

- Facet membership lives in each project's front matter (`domain`, `stack`,
  `setting`, `track`); the vocabulary and the row order live in
  `_data/project_facets.yml`. A value listed there but tagged on no project
  renders a permanently empty checkbox, so the two must be kept in sync.
- `category` is retained. It still labels the card and the project detail
  page; it no longer drives filtering.
- Switching taxonomy is a one-line edit to `active_scheme`; switching layout
  is the `variant` parameter to `_includes/project-filters.html`. Neither
  requires touching the filter engine.
- Each checkbox reports how many projects it would return *given the other
  rows*, and disables itself at zero. Ignoring a row's own selection when
  counting is what keeps those numbers from jittering while that row is being
  edited.
- Filter state is mirrored into the query string, so a filtered view is a
  link. Reading it back on load is what makes `?domain=…&stack=…` work.
- Adding a project now means choosing facet values as well as a category.
  Getting it wrong is quiet — the project simply does not appear under a
  filter someone expected — so it is worth checking the counts after adding.

## Open

`setting` values for the coursework and personal-build projects are inferred
from the project write-ups, not recorded fact. The three `Research & Lab Work`
entries are grounded in `_data/cv.yml` (CSN Lab, IC Design Lab, TUKL Deep
Learning Lab); the other six are a guess that now ships on the live page.
Confirm them — a wrong `setting` is the one facet value a reader could catch
before the author does.
