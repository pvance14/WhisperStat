# 2026-04-01 Phase 5 Roadmap: Live Stats And Game Management

## Purpose

This roadmap maps the implementation planning milestones for the live stats and game management phase. It keeps the team focused on delivering clear in-game value from captured events without drifting into advanced analytics.

This document is a local planning artifact in `ai/roadmaps`. If grader-facing roadmap evidence is needed later, the relevant milestones should also be reflected in tracked documentation.

We need to avoid over-engineering, cruft, and legacy-compatibility features in this clean code project. Live match value should come from clarity and usability, not extra complexity.

## Current Status

- Planning status: Ready for implementation planning.
- Implementation status: Complete.
- Scope status: Focused on live stat views, current match state, and persisted game management within MVP boundaries.

## Document Status

- [x] Phase sub-plan drafted.
- [x] Companion roadmap drafted.
- [x] Alignment checked against the main high-level plan docs and `aiDocs/context.md`.
- [x] Ready to archive in `ai/roadmaps/complete` as a finished planning pair.

## Milestones

- [x] Build **per-player / per-set** stat table (MVP categories from `mvp.md`).
- [x] Add **in-app visual stats report** for the **current** game: dedicated route or full-screen view with the same aggregates (tables + optional simple bar/leader visuals); **not** a PDF export.
- [x] Implement **set navigation** + **current set** display tied to `games.current_set`.
- [x] Implement **manual set-by-set score** persistence (minimal schema decision documented; **manual** is source of truth—see `aiDocs/evidence/mvp_implementation_decisions.md` for optional future voice-assisted score **proposals**).
- [x] Wire **live refresh** (polling) after confirmed events and corrections.
- [x] Add **complete game** action (status) to unlock post-game flow.
- [x] Sanity-check aggregates vs SQL for sample games.

## Readiness Checks

- [x] The phase matches the live dashboard expectations in `aiDocs/mvp.md`.
- [x] Match-state handling is clear enough for a dependable demo.
- [x] No roadmap work expands into advanced analytics, exports, or V1 reporting.
- [x] The live views improve the MVP loop rather than becoming a detached reporting layer.

## Validation Notes

- 2026-04-04: Applied `supabase/migrations/20260402113000_phase_5_game_score_by_set.sql` to the linked Supabase project and verified `public.games.score_by_set` exists as non-null `jsonb` with default `[]`.
- 2026-04-04: Seeded a deterministic linked-database validation game (`11111111-1111-4111-8111-111111111111`, opponent `Phase 5 Validation`) with two saved set scores, `current_set = 2`, `status = completed`, nine active stat events across two sets, and one soft-deleted event to verify `deleted_at` exclusion.
- 2026-04-04: SQL cross-check confirmed full-match active totals of kills 2, aces 2, serve errors 1, blocks 1, digs 1, attack errors 1, and sets 1; set-2 active totals of kill 1, ace 1, attack error 1, and set 1; and per-player/per-set counts consistent with the dashboard/report aggregation rules.
- 2026-04-04: Local verification passed with `npm run typecheck`, `npm run build`, and `npm run smoke`. `npm run preview` started successfully, but this environment would not allow a separate `curl` session to reach the preview server, so true interactive browser validation remains a local/manual follow-up for Phase 7 demo hardening rather than a Phase 5 blocker.

## Completion Signal

This phase is ready to close when the product can present trustworthy, usable live match information across players, sets, and current match state.
