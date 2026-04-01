# 2026-04-01 Phase 3 Roadmap: Core Match Workflow

## Purpose

This roadmap maps the implementation planning milestones for the core match workflow phase. It keeps the team focused on the smallest repeatable in-game loop that demonstrates the MVP’s primary value.

This document is a local planning artifact in `ai/roadmaps`. If grader-facing roadmap evidence is needed later, the relevant milestones should also be reflected in tracked documentation.

We need to avoid over-engineering, cruft, and legacy-compatibility features in this clean code project. The workflow should stay narrow, testable, and coach-trust oriented.

## Current Status

- Planning status: Ready for implementation planning.
- Implementation status: Not started.
- Scope status: Focused on one-team setup, MVP stat capture, and review-ready event handling.

## Document Status

- [x] Phase sub-plan drafted.
- [x] Companion roadmap drafted.
- [x] Alignment checked against the main high-level plan docs and `aiDocs/context.md`.
- [x] Ready to archive in `ai/roadmaps/complete` as a finished planning pair.

## Milestones

- [ ] Ship **active game + roster** context in the capture UI (ties to `games` / `players`).
- [ ] Ship **push-to-talk** + Web Speech → transcript pipeline.
- [ ] Ship **parse → proposed event** for MVP stat vocabulary with rules-first routing and optional LLM fallback.
- [ ] **Clarification UX** for unresolved player or stat (minimal: disambiguation prompt or “couldn’t parse” copy).
- [ ] Confirm **no silent persist**: proposals only, unless shipped together with Phase 4 confirm (same PR).
- [ ] Exercise repeated capture in dev (logging timings) to prep trust + dashboard phases.

## Readiness Checks

- [ ] The workflow matches the MVP voice-input requirements in `aiDocs/mvp.md`.
- [ ] The capture loop prioritizes trust and usable latency over breadth.
- [ ] No phase work expands into multi-user, analytics, or non-MVP behavior.
- [ ] The resulting workflow is stable enough to become the basis for correction and trust features.

## Completion Signal

This phase is ready to close when the project has a repeatable path from roster-aware match setup to reviewable structured event capture for the MVP stat set.
