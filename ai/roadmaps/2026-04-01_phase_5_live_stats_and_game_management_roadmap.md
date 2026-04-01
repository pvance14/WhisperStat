# 2026-04-01 Phase 5 Roadmap: Live Stats And Game Management

## Purpose

This roadmap maps the implementation planning milestones for the live stats and game management phase. It keeps the team focused on delivering clear in-game value from captured events without drifting into advanced analytics.

This document is a local planning artifact in `ai/roadmaps`. If grader-facing roadmap evidence is needed later, the relevant milestones should also be reflected in tracked documentation.

We need to avoid over-engineering, cruft, and legacy-compatibility features in this clean code project. Live match value should come from clarity and usability, not extra complexity.

## Current Status

- Planning status: Ready for implementation planning.
- Implementation status: Not started.
- Scope status: Focused on live stat views, current match state, and persisted game management within MVP boundaries.

## Document Status

- [x] Phase sub-plan drafted.
- [x] Companion roadmap drafted.
- [x] Alignment checked against the main high-level plan docs and `aiDocs/context.md`.
- [x] Ready to archive in `ai/roadmaps/complete` as a finished planning pair.

## Milestones

- [ ] Build **per-player / per-set** stat table (MVP categories from `mvp.md`).
- [ ] Add **in-app visual stats report** for the **current** game: dedicated route or full-screen view with the same aggregates (tables + optional simple bar/leader visuals); **not** a PDF export.
- [ ] Implement **set navigation** + **current set** display tied to `games.current_set`.
- [ ] Implement **manual set-by-set score** persistence (minimal schema decision documented; **manual** is source of truth—see `aiDocs/evidence/mvp_implementation_decisions.md` for optional future voice-assisted score **proposals**).
- [ ] Wire **live refresh** (polling) after confirmed events and corrections.
- [ ] Add **complete game** action (status) to unlock post-game flow.
- [ ] Sanity-check aggregates vs SQL for sample games.

## Readiness Checks

- [ ] The phase matches the live dashboard expectations in `aiDocs/mvp.md`.
- [ ] Match-state handling is clear enough for a dependable demo.
- [ ] No roadmap work expands into advanced analytics, exports, or V1 reporting.
- [ ] The live views improve the MVP loop rather than becoming a detached reporting layer.

## Completion Signal

This phase is ready to close when the product can present trustworthy, usable live match information across players, sets, and current match state.
