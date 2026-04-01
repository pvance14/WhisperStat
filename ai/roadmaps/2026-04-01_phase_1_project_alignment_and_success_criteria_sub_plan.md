# 2026-04-01 Phase 1 Sub-Plan: Project Alignment And Success Criteria

## Summary

This sub-plan expands Phase 1 of the main MVP implementation plan into a focused planning slice. It exists to lock the final-project framing, narrow MVP boundaries, and proof expectations before deeper implementation work begins.

This document is a local planning artifact in `ai/roadmaps`. If grader-facing or shared evidence is needed later, the important outcomes should also be reflected in tracked docs.

We need to avoid over-engineering, cruft, and legacy-compatibility features in this clean code project. This phase should reduce ambiguity, not add process overhead.

## Phase Intent

- Align the team on the narrow class-final MVP.
- Make the post-midterm reset legible as a disciplined process decision.
- Define what must be demoable, verifiable, and evidenced by the end of the build.

## In Scope

- Final-project framing and success criteria.
- MVP boundary confirmation against `aiDocs/prd.md`, `aiDocs/mvp.md`, and `aiDocs/final_project_alignment.md`.
- Definition of evidence expectations for validation, verification, and demo readiness.
- Agreement on what later phase plans are expected to produce.

## Out Of Scope

- Deep implementation design.
- UI polish decisions beyond what affects scope control.
- V1 or post-MVP product expansion.

## Planned Outcomes

- A stable interpretation of the MVP as a narrow, reliable class-final build.
- Clear separation between MVP requirements, stretch ideas, and explicit non-goals.
- A shared definition of success across product behavior, process evidence, and live-demo reliability.
- A clear handoff into Phase 2 without unresolved scope questions.

## Implementation Approach

- Reconcile scope across the PRD, MVP, architecture, and final-project alignment docs.
- Keep the final framing centered on disciplined execution, evidence gathering, and demo stability.
- Convert broad ambitions into explicit scope guardrails so later phases do not quietly expand.
- Treat validation and falsification as required evidence threads, not optional follow-up work.

## Dependencies And Decisions

- The team must prioritize a dependable class-final loop over the broader long-term startup vision.
- Any scope that increases demo risk without improving the MVP core loop should be deferred.
- Future phase plans should inherit the phase order and constraints defined here unless the MVP is intentionally revised.

## Verification And Evidence

- Confirm the phase outputs stay aligned with the current canonical docs.
- Confirm the resulting framing supports the PRD -> plan -> roadmap -> implementation -> verification loop expected by the class materials.
- Confirm that later plans can reference a stable definition of MVP scope, success, and non-goals.

## Assumptions

- The current `aiDocs/` set remains the source of truth unless a tracked update changes it.
- The class final will reward disciplined process evidence as much as product functionality.
- This phase is complete when the scope is clear enough that later plans do not need to re-litigate core product direction.

## Concrete deliverables (close-out artifacts)

- A single **MVP scope sheet** (can live in tracked `aiDocs/` or presentation appendix): bullets for **in / out / stretch**, explicitly citing `mvp.md` non-goals (no rotation engine, scouting, video, fan live, multi-sport, native store apps, multi-statistician sync, required exports).
- **Success criteria table** aligned with `mvp.md` §“Success Criteria” (accuracy, eyes-up / voice session rate, differentiation wording)—plus **class-final** criteria from `final_project_alignment.md` (PRD → plan → roadmap → implementation → verification visibility; executed falsification).
- **Validation backlog** derived from `prd.md` §10 / `final_project_alignment.md`: each row includes hypothesis, what would falsify, how to run, owner, target date, and where results will be **written** (tracked doc or appendix). Per `context.md`, these are gating learning steps, not hypothetical.
- **Demo narrative**: one paragraph “what we will show live” (setup → capture with confirm → live board → post-game)—kept narrow enough for gym Wi‑Fi and time risk.

## Acceptance criteria (phase done when)

- No open questions on **volleyball-only PWA** scope, **trust behaviors** (confirm / undo / edits), or **post-game narrative** being in-vs-out of the demo path.
- Phase 2–7 can start without revisiting whether Supabase + PWA is the stack (see `architecture.md`).
- Team agrees **evidence beats feature sprawl** for the final (per `context.md`).

## Technical / process anchors

- **`aiDocs/context.md`**: align execution with final rubric, falsification with documented results, phased scaffold with tests/logging expectations.
- Prefer recording decisions in **tracked** docs where graders need visibility; keep `ai/roadmaps` as working plans per repo convention.
