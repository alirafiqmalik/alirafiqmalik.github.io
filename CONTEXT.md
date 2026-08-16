# Personal Site

Single-context Jekyll portfolio site. This glossary pins the language used in
specs, tickets, and reviews.

## Language

### Layout verification

**Viewport Matrix**:
The set of viewports crossed with the invariants each must satisfy before
landing/UI signoff. The prose in AGENTS.md is the spec of record.
_Avoid_: test matrix, device matrix

**Layout Probe**:
The automated check that executes the mechanical half of the Viewport Matrix
and emits a per-viewport verdict plus screenshots.
_Avoid_: layout tests, e2e suite

**Invariant**:
One boolean layout fact that must hold at a given viewport (e.g. "News is
fully visible or scrollable").
_Avoid_: assertion, rule, check

**Geometry Group**:
The invariants decidable from element rectangles and visibility alone.

**Scroll-Walk Group**:
The invariants decided by synthetically scrolling the page and observing
progress (no scroll traps, landing → About → later sections).

**Trap Probe**:
A targeted scroll check aimed at a nested scrollport (News, About) verifying
that reaching its end hands scrolling back to the page.

**Probe Handle**:
An element explicitly marked as part of the Viewport Matrix contract; the
Layout Probe may locate elements only through handles and section ids, never
through styling classes or internal state classes.

**Narrow Floor**:
The smallest viewport width the site commits to supporting (320px).

**Boundary Pair**:
The 899px and 900px viewports that prove the stack-vs-corners breakpoint from
both sides. Part of the probe's viewport set but not of the 8 canonical
viewports.

**Eyeball Pass**:
The human visual review of screenshots across the Viewport Matrix. Stays
manual; the Layout Probe feeds it but never replaces it.
_Avoid_: manual QA

**Signoff**:
The gate before merging or pushing landing/About/CSS/home-layout changes:
Layout Probe passing plus Eyeball Pass done.
