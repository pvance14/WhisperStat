# 2026-04-01 Phase 2 Roadmap: Product And Technical Foundation

## Purpose

This roadmap maps the implementation planning milestones for the product and technical foundation phase. It keeps the team focused on a clean, minimal baseline for the MVP rather than speculative platform work.

This document is a local planning artifact in `ai/roadmaps`. If grader-facing roadmap evidence is needed later, the relevant milestones should also be reflected in tracked documentation.

We need to avoid over-engineering, cruft, and legacy-compatibility features in this clean code project. The foundation should stay intentionally small and easy to verify.

## Current Status

- Planning status: Ready for implementation planning.
- Implementation status: Not started.
- Scope status: Focused on baseline app structure, core data flow, observability, and fallback readiness.

## Document Status

- [x] Phase sub-plan drafted.
- [x] Companion roadmap drafted.
- [x] Alignment checked against the main high-level plan docs and `aiDocs/context.md`.
- [x] Ready to archive in `ai/roadmaps/complete` as a finished planning pair.

## Milestones

- [ ] Scaffold React PWA + Supabase client + **magic-link** auth; document **Vercel** deploy assumptions (`aiDocs/evidence/mvp_implementation_decisions.md`).
- [ ] Land **schema + RLS** for `teams`, `players`, `games`, `stat_events` (and indexes noted in architecture §7); **`teams`** model supports **multiple teams per coach** (same `user_id` / owner id).
- [ ] Implement **roster CRUD** (create/edit team, players with jersey uniqueness) and **game create** (opponent, date, status, `current_set`) across **team switcher** or list as needed.
- [ ] Document **voice/parse pipeline** boundaries: Web Speech default; rules-first parse; LLM behind Edge when added.
- [ ] Add **logging + smoke script** conventions aligned with `final_project_alignment.md`.
- [ ] Write **demo fallback** spec (offline / ASR failure) for Phase 7 hardening.

## Readiness Checks

- [ ] The foundation work stays consistent with `aiDocs/architecture.md`.
- [ ] Logging, testability, and debug expectations align with `aiDocs/final_project_alignment.md`.
- [ ] The baseline avoids unnecessary abstractions and deferred-scale complexity.
- [ ] Phase 3 can begin without open foundation-level blockers.

## Completion Signal

This phase is ready to close when the project has a clean baseline for the MVP workflow, clear observability and fallback expectations, and no unresolved setup decisions that would block core feature implementation.
