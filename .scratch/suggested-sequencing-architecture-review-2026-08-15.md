# Suggested sequencing — architecture review follow-up (2026-08-15)

How to work the remaining candidates from
`.scratch/architecture-review-2026-08-15.md` across multiple sessions without
losing manageability.

## Ground rules

- **One candidate = one unbroken session:** `/grill-with-docs` → `/to-spec` →
  `/to-tickets` → stop. Don't compact or clear mid-flow; the grilling, spec,
  and tickets must build on the same thinking.
- **Then `/clear`.** Later sessions run `/implement` per ticket, blockers
  first, clearing context between tickets. Each ticket is self-contained.
- **Point each grilling session at the review file** (this repo,
  `.scratch/architecture-review-2026-08-15.md`) as its primary source.
- Each grilling session leaves `CONTEXT.md` and `docs/adr/` entries behind —
  that's what makes session N+1 cheap. Neither exists yet; create lazily.
- **Do not `/triage` tickets that `/to-tickets` produced** — triage is only for
  issues you didn't create; these are already agent-ready.
- Tracker: GitHub Issues via `gh` (per AGENTS.md "Agent skills" section).
  Encode cross-candidate ordering as native blocking links between tickets.
- **AGENTS.md solid constraint applies to every implementation ticket** that
  touches landing/About/CSS/home layout: multi-device review before signoff
  (until Candidate 6's probe automates the mechanical half).

## Order

| # | Candidate | Flow | Blocked by | Why this position |
|---|-----------|------|------------|-------------------|
| 1 | ~~2 · Delete the al-folio corpse~~ | **DONE** — commit `7fa1c68` (2026-08-15) | — | No decisions to grill; pure subtraction. Every later session reads a smaller, honest repo. |
| 2 | ~~6 · Viewport-matrix probe~~ | **DONE** — commits `dd1f0d9`, `b910dca`, `c0f947e`, `832733f` (2026-08-15/16) | — | The safety net. Makes the landing refactors (3+4) reviewable by one command instead of the 8-viewport hand matrix. |
| 3 | 1 · Publication record | full flow | — | Deepest design question; drift is publicly visible on the deployed site. Grill: which file format is the one record? what happens to `papers/`, `_publications/`, the `blog-demo` slug (redirects?), venue naming, the 3-vs-4 vulnerability claim? |
| 4 | 3 + 4 · Landing choreography + scroll owner | grill **as one idea**, one spec | 6 | The scroll-owner module (4) will likely fall out as a ticket inside 3's spec rather than its own spec. Do not start before the probe exists. |
| 5 | 5 · Nav data file | short grill → `/to-spec` → `/to-tickets` (small spec is fine) | — | Mostly mechanical once the nav.yml schema is decided; include the `#contact` bare-fragment fix. |
| 6 | 7 · Document shell | fold into 3's spec, or drop | 3+4 | Speculative; only one adapter varies meaningfully today. Revisit after the landing work — it may become trivial or moot. |

Candidates 1, 5, and 6 are independent of each other — they can be grilled in
any order or interleaved between implementation sessions. Only 3+4 (and the
folded 7) have a hard blocker (the probe).

## Per-candidate session template

1. Open a fresh session in the repo.
2. `/grill-with-docs` — feed it: the candidate's section from the review file,
   plus any `CONTEXT.md`/ADRs from earlier candidates.
3. `/to-spec` in the same window.
4. `/to-tickets` in the same window — each ticket declares blocking edges;
   create as GitHub Issues.
5. Stop. `/clear`.
6. Later, per ticket (blockers done first): fresh session → `/implement`
   (drives `/tdd` internally, closes with `/code-review`) → commit → `/clear`.

## Smart-zone guard

If a grilling session approaches the smart zone (~150k tokens) before
`/to-tickets` has run, `/compact` at the nearest phase boundary (e.g. right
after the spec is written) and continue — don't push on degraded.

## Not in scope of any candidate (content fixes, do whenever)

Small deployed-site fixes that need no spec — can be one grab-bag ticket:
- Replace Unsplash placeholder images on 8/9 project cards (one photo is
  reused across three unrelated projects).
- Fix or remove the placeholder Google Scholar link.
- Delete or link the dead `/publications/` stub page.
- Fix "&lt;2 minutes" formation-switching latency on `/projects/drone-swarm/`
  (likely seconds).
- Reconcile the "three vs four vulnerabilities" claim (also folds into
  Candidate 1).
