# 2026-04-01 Phase 2 Roadmap: Product And Technical Foundation

## Purpose

This roadmap maps the implementation planning milestones for the product and technical foundation phase. It keeps the team focused on a clean, minimal baseline for the MVP rather than speculative platform work.

This document is a local planning artifact in `ai/roadmaps`. If grader-facing roadmap evidence is needed later, the relevant milestones should also be reflected in tracked documentation.

We need to avoid over-engineering, cruft, and legacy-compatibility features in this clean code project. The foundation should stay intentionally small and easy to verify.

## Current Status

- Planning status: Completed and ready to archive.
- Implementation status: Foundation scaffold, schema, docs, local verification, and live Supabase verification all landed.
- Scope status: Focused baseline is in place for auth, roster, game setup, observability, and fallback readiness.

## Document Status

- [x] Phase sub-plan drafted.
- [x] Companion roadmap drafted.
- [x] Alignment checked against the main high-level plan docs and `aiDocs/context.md`.
- [x] Phase 2 deliverables published in code and tracked docs.
- [x] Ready to archive in `ai/roadmaps/complete` as a finished planning pair.

## Milestones

- [x] Scaffold React PWA + Supabase client + **magic-link** auth; document **Vercel** deploy assumptions (`aiDocs/evidence/mvp_implementation_decisions.md`).
- [x] Land **schema + RLS** for `teams`, `players`, `games`, `stat_events` (and indexes noted in architecture §7); **`teams`** model supports **multiple teams per coach** (same `user_id` / owner id).
- [x] Implement **roster CRUD** (create/edit team, players with jersey uniqueness) and **game create** (opponent, date, status, `current_set`) across **team switcher** or list as needed.
- [x] Document **voice/parse pipeline** boundaries: Web Speech default; rules-first parse; LLM behind Edge when added.
- [x] Add **logging + smoke script** conventions aligned with `final_project_alignment.md`.
- [x] Write **demo fallback** spec (offline / ASR failure) for Phase 7 hardening.

## Readiness Checks

- [x] The foundation work stays consistent with `aiDocs/architecture.md`.
- [x] Logging, testability, and debug expectations align with `aiDocs/final_project_alignment.md`.
- [x] The baseline avoids unnecessary abstractions and deferred-scale complexity.
- [x] Live Supabase migration, auth redirect, and RLS verification are recorded against a real project.
- [x] Phase 2 can archive without overstating what has been verified.

## Delivered Artifacts

- `package.json`, `vite.config.ts`, `vercel.json`, `.env.example`
- `src/` app scaffold with auth, team, roster, game, dashboard, and report routes
- `scripts/smoke.mjs`
- `supabase/migrations/20260401161000_phase_2_foundation.sql`
- `aiDocs/evidence/phase_2_voice_pipeline_boundaries.md`
- `aiDocs/evidence/logging_and_smoke_conventions.md`
- `aiDocs/evidence/demo_fallback_spec.md`
- `aiDocs/evidence/phase_2_live_verification.md`
- `README.md`

## Verification Notes

- Verified locally:
  - `npm install`
  - `npm run smoke`
  - `npm run typecheck`
  - `npm run build`
- Verified live against the connected Supabase project:
  - applying the migration to a real Supabase project
  - generating types from the linked remote schema
  - signing in through the app with a real Supabase session
  - confirming auth redirect behavior
  - running authenticated RLS happy-path and denied-path checks

See `aiDocs/evidence/phase_2_live_verification.md` for the recorded close-out note.

## Completion Signal

This phase is ready to close when the project has a clean baseline for the MVP workflow, clear observability and fallback expectations, and recorded live verification for migration/auth/RLS behavior.
