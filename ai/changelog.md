# Changelog

This is meant to be a CONCISE list of changes to track as we develop this project. When adding to this file, keep comments short and summarized. Always add references back to the source plan docs for each set of changes.

## 2026-04-01

- Added `aiDocs/final_project_alignment.md` to translate the final rubric and class slides into concrete repo and presentation expectations.
- Updated `aiDocs/context.md` so future sessions see final-project alignment, evidence gathering, and demo reliability as the current focus.
- Added phase-by-phase sub-plan and roadmap doc pairs in `ai/roadmaps` for all seven MVP implementation phases, aligned to `ai/roadmaps/2026-04-01_high_level_mvp_implementation_plan.md` and `ai/roadmaps/2026-04-01_high_level_implementation_roadmap.md`.
- Implemented Phase 1 alignment artifacts: added `aiDocs/mvp_scope_sheet.md`, `aiDocs/evidence/final_project_success_criteria.md`, `aiDocs/evidence/validation_backlog.md`, and `aiDocs/evidence/demo_narrative_and_risks.md`; updated `aiDocs/evidence/README.md`; and closed the Phase 1 roadmap/sub-plan pair for archive.
- Implemented Phase 2 foundation work: scaffolded the React/Vite PWA app, Supabase auth/data foundation, roster and game setup routes, structured logging, smoke/build verification scripts, repo SQL migrations/RLS, and Phase 2 evidence docs; then closed the Phase 2 roadmap/sub-plan pair for archive.
- Fixed review findings from the Phase 1/2 audit: strengthened `stat_events` team integrity checks, surfaced dashboard/report load failures, clarified magic-link redirect setup, replaced README filesystem links with repo-relative links, and reopened Phase 2 planning docs until live Supabase verification is actually recorded.
- Recorded successful live Supabase verification for Phase 2 (migration apply, remote type generation, app sign-in, auth redirect, and RLS happy/denied-path checks), so the Phase 2 roadmap/sub-plan pair is ready to archive again.

## 2026-04-02

- Began Phase 3 implementation from `ai/roadmaps/2026-04-01_phase_3_core_match_workflow_roadmap.md` and `ai/roadmaps/2026-04-01_phase_3_core_match_workflow_sub_plan.md`: added roster-aware transcript parsing, Web Speech push-to-talk capture plus manual fallback, review-only proposal/clarification cards on the live dashboard, and active `current_set` controls while intentionally deferring `stat_events` writes to Phase 4 confirm work.
- Began Phase 4 implementation from `ai/roadmaps/2026-04-01_phase_4_trust_and_correction_flows_roadmap.md` and `ai/roadmaps/2026-04-01_phase_4_trust_and_correction_flows_sub_plan.md`: added explicit confirm/reject persistence, duplicate-safe `client_event_id` writes, soft-delete undo, last-event voice/manual correction, and event-log edit controls so live stats now reflect trust-aware confirmed events instead of review-only proposals.
- Closed Phase 3 and archived its roadmap/sub-plan pair in `ai/roadmaps/complete` after repeated messy manual-fallback validation confirmed the one-event capture loop works as intended and fails safely on unsupported phrases.
- Closed Phase 4 and archived its roadmap/sub-plan pair in `ai/roadmaps/complete` after live trust-flow validation confirmed confirm, undo, last-event correction, event-log edits, and aggregate updates all behaved clearly and correctly.
- Began Phase 5 implementation from `ai/roadmaps/2026-04-01_phase_5_live_stats_and_game_management_roadmap.md` and `ai/roadmaps/2026-04-01_phase_5_live_stats_and_game_management_sub_plan.md`: added persisted manual `games.score_by_set` storage plus migration/type support, wired dashboard score editing and complete/reopen game controls, and upgraded the current-game report route into a polling live report with current-set/full-match views, saved set scores, and lightweight leader visuals.

## 2026-04-04

- Applied the Phase 5.5 design-system and hierarchy refresh from `ai/roadmaps/2026-04-02_phase_5_5_ui_overhaul_best_practices.md`: upgraded shared dashboard/report layout primitives, stronger summary strips, segmented controls, and clearer hero/action panel structure.
- Reworked the live dashboard to prioritize the trust path visually: match context and score summary first, then live capture/review, then fast recovery, then event-log and stats reference sections.
- Reworked the live report route to mirror the same structure so dashboard and report now feel like one cohesive product without changing routes, parser logic, or data behavior.
