# 2026-04-01 Phase 7 Sub-Plan: Verification, Demo Hardening, And Final Evidence

## Summary

This sub-plan expands Phase 7 of the main MVP implementation plan into the final verification and evidence slice. Its purpose is to define how the MVP is tested, hardened for demonstration, and documented as a disciplined final-project process.

This document is a local planning artifact in `ai/roadmaps`. If grader-facing or shared evidence is needed later, the important outcomes should also be reflected in tracked docs.

We need to avoid over-engineering, cruft, and legacy-compatibility features in this clean code project. This phase should prove the MVP works and can be defended, not reopen scope.

## Phase Intent

- Verify the end-to-end MVP against the success criteria defined earlier.
- Harden the demo path and define practical fallback behavior.
- Assemble the validation, verification, and process evidence needed for the class final.

## In Scope

- End-to-end workflow verification.
- Demo hardening and fallback planning.
- Executed validation and falsification evidence tied back to product claims.
- Final-project evidence that shows the repo followed a document-driven implementation process.

## Out Of Scope

- New feature work unless required to repair a critical demo blocker.
- Large architectural changes late in the cycle.
- Stretch functionality that does not improve reliability or evidence quality.

## Planned Outcomes

- A stable MVP that can be demonstrated with confidence.
- A clear test, validation, and fallback story.
- Evidence that the team moved from product definition to implementation to verification in a disciplined way.
- Final materials that support both the demo and the grading criteria.

## Implementation Approach

- Test the MVP as a connected workflow rather than as isolated components only.
- Prioritize fixes that reduce demo risk or improve evidence quality.
- Tie validation and falsification results back to earlier plans, claims, and scope decisions.
- Keep the late-stage work focused on reliability, explainability, and process visibility.

## Dependencies And Decisions

- Earlier phases must already produce a complete MVP loop worth validating.
- The team must prefer reliability and evidence quality over last-minute feature additions.
- Any late change should be justified by demo risk reduction or verification need.

## Verification And Evidence

- Confirm the product satisfies the MVP path defined in earlier plans.
- Confirm validation and falsification work has documented outcomes, not only intentions.
- Confirm the repo can show the class-expected process loop from docs through implementation and verification.

## Assumptions

- A narrower, well-verified demo is more valuable than a broader but less reliable one.
- Evidence quality is a product requirement for the class final, not just presentation polish.
- This phase is complete when the MVP can be demonstrated, defended, and traced back to the repo’s planning artifacts.

## Concrete deliverables

- **E2E verification script or checklist:** roster → new game → PTT capture → confirm → see live totals → open **visual stats report** → correct event → totals update → complete → summary; include expected DB rows or screenshots as needed; store checklist/results under **`aiDocs/evidence/`**.
- **Demo hardening:** offline/ASR failure path from Phase 2 spec; preflight env checklist; backup **seeded game** for live Wi‑Fi failure.
- **Executed validation packet:** PRD §10 / `final_project_alignment.md` tests with **results** (noise ASR, push-to-talk usability, priority of features)—each ties to a decision (what changed in UX or scope).
- **Traceability artifact:** short mapping “rubric / alignment doc requirement → **`aiDocs/evidence/`** file or PR” for graders (`context.md`: docs → implementation → verification).
- **Performance smoke:** note p95-ish timings for parse + confirm on target devices (qualitative OK for class final).

## Acceptance criteria

- `mvp.md` **Success Criteria** section revisited with **observed** notes (even qualitative) for what was actually tested.
- No P0 bugs on the **demo golden path**; known issues documented with workarounds.
- Repo shows **changelog** or tracked notes updated when roadmap pairs complete (per `context.md` workflow).

## Technical anchors

- Supabase logs / Edge logs reviewed for obvious errors before final.
- Confirm RLS regression: second account cannot read first account’s games.
