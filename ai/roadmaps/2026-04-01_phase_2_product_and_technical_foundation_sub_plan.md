# 2026-04-01 Phase 2 Sub-Plan: Product And Technical Foundation

## Summary

This sub-plan expands Phase 2 of the main MVP implementation plan into a focused foundation slice. Its purpose is to define the minimum product and technical setup needed to support the core match workflow without introducing unnecessary infrastructure.

This document is a local planning artifact in `ai/roadmaps`. If grader-facing or shared evidence is needed later, the important outcomes should also be reflected in tracked docs.

We need to avoid over-engineering, cruft, and legacy-compatibility features in this clean code project. This phase should establish a clean baseline, not a platform for hypothetical future needs.

## Phase Intent

- Create a stable baseline for the PWA and core user flows.
- Define the minimum technical direction for voice input, parsing, persistence, and app observability.
- Front-load the logging, testability, and demo fallback expectations that later phases will rely on.

## In Scope

- Base application structure and setup decisions.
- Foundational product flows for roster, match context, and persisted state.
- Simple technical boundaries for ASR, parsing, persistence, structured logging, and CLI-checkable workflows.
- Definition of safe fallback expectations for demo and testing conditions.

## Out Of Scope

- Full production hardening.
- Feature-level polish outside the MVP path.
- Advanced abstractions, scaling work, or V1 infrastructure.

## Planned Outcomes

- A clean technical baseline that supports end-to-end MVP slices.
- Clear boundaries between required infrastructure and deferred sophistication.
- Basic operational expectations for logging, testing, and fallback behavior before feature work deepens.
- A foundation that Phase 3 can build on without reworking setup choices.

## Implementation Approach

- Use the architecture doc as a direction setter, but keep implementation choices as simple as the MVP allows.
- Prefer decisions that make the core workflow testable, observable, and demo-safe.
- Treat logging and CLI-checkable workflows as part of the implementation baseline, not optional cleanup.
- Defer any infrastructure that is not directly needed for the MVP path.

## Dependencies And Decisions

- Phase 1 scope and success criteria must already be stable.
- The foundation should support the MVP core loop first: roster, voice capture, confirmation, persistence, and live stats.
- Demo fallback behavior must be defined early enough to shape later implementation choices.

## Verification And Evidence

- Confirm the foundation supports the MVP path described in `aiDocs/mvp.md` and `aiDocs/architecture.md`.
- Confirm that logging and testability expectations align with `aiDocs/final_project_alignment.md`.
- Confirm the chosen baseline reduces, rather than increases, implementation risk in later phases.

## Assumptions

- The project benefits more from a clean, direct baseline than from broader technical flexibility.
- Early clarity around logging and fallback behavior will reduce risk during demo hardening.
- This phase is complete when the project can begin end-to-end implementation without revisiting foundational setup questions.

## Concrete deliverables

- **Repo scaffold:** React PWA baseline (e.g. Vite + `vite-plugin-pwa` per `architecture.md` §4); routing placeholder for auth, roster, active game, dashboard, stats report; **production static host: Vercel** (env vars for Supabase URL/anon key).
- **Supabase:** project wired with **`supabase/` SQL migrations in repo** implementing **MVP sketch** tables: `teams`, `players`, `games`, `stat_events` from `architecture.md` §7; **`teams`** allows **many rows per coach** (no accidental “one team only” constraint unless product changes). Optional `game_summaries` can land in Phase 6 but stubbing the **enum constraint** / check for `event_type` early avoids drift.
- **RLS:** policies so coaches only read/write their teams’ rows (pattern in architecture §6); service-role key restricted to server/Edge only.
- **Auth:** **Magic link** (Supabase) per `aiDocs/evidence/mvp_implementation_decisions.md`; enough to obtain a session in the PWA and satisfy RLS tests.
- **Logging / observability:** minimal structured client logging (e.g. parse latency, ASR errors) + **npm script** smoke path (health check, env present—align with `final_project_alignment.md` expectations).
- **Demo fallback spec:** documented behavior when Web Speech fails (pre-recorded transcript paste, mock parse, or “manual event entry” kill-switch) without expanding product scope.

## Acceptance criteria

- Fresh clone → install → `dev` runs; PWA shell installable or precache path verified per tool docs.
- Migrations apply cleanly; one manual test insert/select proves RLS boundaries (happy path + denied path).
- Supabase client works from the app with anon key + user session; no LLM/STT secrets in client bundle for production paths.

## Technical anchors (`architecture.md`)

- Offline posture: document whether **outbox + IndexedDB** starts in Phase 2 stub or Phase 7; if deferred, note risk for gym Wi‑Fi (PRD/MVP).
- Prefer **polling** for live reads initially; Realtime is optional.
- Edge Functions: stub **LLM proxy** route or document when Phase 3+ first needs it.
