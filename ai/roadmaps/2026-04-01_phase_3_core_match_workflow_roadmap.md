# 2026-04-01 Phase 3 Roadmap: Core Match Workflow

## Purpose

This roadmap maps the implementation planning milestones for the core match workflow phase. It keeps the team focused on the smallest repeatable in-game loop that demonstrates the MVP’s primary value.

This document is a local planning artifact in `ai/roadmaps`. If grader-facing roadmap evidence is needed later, the relevant milestones should also be reflected in tracked documentation.

We need to avoid over-engineering, cruft, and legacy-compatibility features in this clean code project. The workflow should stay narrow, testable, and coach-trust oriented.

## Current Status

- Planning status: Ready for implementation planning.
- Implementation status: In progress. The first live capture slice shipped on 2026-04-02.
- Scope status: Focused on one-team setup, MVP stat capture, and review-ready event handling.

## Document Status

- [x] Phase sub-plan drafted.
- [x] Companion roadmap drafted.
- [x] Alignment checked against the main high-level plan docs and `aiDocs/context.md`.
- [x] Ready to archive in `ai/roadmaps/complete` as a finished planning pair.

## Milestones

- [x] Ship **active game + roster** context in the capture UI (ties to `games` / `players`).
- [x] Ship **push-to-talk** + Web Speech → transcript pipeline.
- [x] Ship **parse → proposed event** for MVP stat vocabulary with rules-first routing and optional LLM fallback.
- [x] **Clarification UX** for unresolved player or stat (minimal: disambiguation prompt or “couldn’t parse” copy).
- [x] Confirm **no silent persist**: proposals only, unless shipped together with Phase 4 confirm (same PR).
- [ ] Exercise repeated capture in dev (logging timings) to prep trust + dashboard phases.

## Readiness Checks

- [x] The workflow matches the MVP voice-input requirements in `aiDocs/mvp.md`.
- [x] The capture loop prioritizes trust and usable latency over breadth.
- [x] No phase work expands into multi-user, analytics, or non-MVP behavior.
- [ ] The resulting workflow is stable enough to become the basis for correction and trust features.

## 2026-04-02 Progress Notes

- Added a live dashboard capture surface that combines active game context, roster-aware parsing, and a review queue.
- Added `current_set` controls on the active game so proposals use real match state instead of placeholder values.
- Kept the persistence boundary intact: proposals stay in UI review only, and `stat_events` writes remain deferred to explicit confirm work in Phase 4.
- Left real-device repetition testing and any low-confidence fallback expansion for the remaining Phase 3 work.

## Completion Signal

This phase is ready to close when the project has a repeatable path from roster-aware match setup to reviewable structured event capture for the MVP stat set.
