# Layout probe observes only user-observable facts and complements the eyeball pass

The layout probe (Candidate 6, architecture review 2026-08-15) automates the
mechanical half of the AGENTS.md viewport matrix. Two coupled decisions:

1. **Observable-only coupling.** The probe asserts only user-observable facts
   — element rectangles, actual scrollability (drive the scroll, watch the
   content), actual page progress under synthetic wheel input. It locates
   elements exclusively through `data-probe` handles and section ids, never
   through styling or state classes (`is-scrollable`,
   `landing-scroll-free/-soft`, …). Rationale: Candidates 3 and 4 will rename
   or delete exactly those classes, and the probe exists to be the safety net
   *across* that rewrite — so it may depend on nothing those refactors are
   allowed to change. The pragmatic alternative (asserting class presence) was
   considered and rejected for this reason.

2. **Complements, never replaces, the eyeball pass.** The probe decides the
   boolean invariants and produces the per-viewport screenshots; a human still
   reviews those screenshots before signoff. The viewport-matrix prose in
   AGENTS.md remains the spec of record; the probe is an implementation of its
   mechanical half. Do not delete the manual review step when the probe goes
   green — aesthetic regressions (spacing, typography, visual balance) are out
   of the probe's scope by design.
