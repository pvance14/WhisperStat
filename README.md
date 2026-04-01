# WhisperStat

Voice-first volleyball stat tracking built as a React PWA with Supabase.

## Phase 2 Foundation

The repo now includes the full foundation slice for the MVP:

- Vite + React + TypeScript PWA scaffold
- Supabase client wiring and magic-link auth flow
- RLS-oriented SQL migration in `supabase/migrations/`
- Team management, roster CRUD, and game setup routes
- Dashboard and current-game stats report routes for later phases to build on
- Structured client logging and a CLI smoke script

## Local Setup

1. Copy `.env.example` to `.env`.
2. Add `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, and `VITE_SUPABASE_REDIRECT_URL`.
3. In Supabase Auth settings, allowlist the same redirect origin or URL you plan to use locally and in Vercel.
4. Run `npm install`.
5. Run `npm run smoke`.
6. Run `npm run dev`.

## Scripts

- `npm run dev`: start the Vite dev server
- `npm run build`: type-check and build the production app
- `npm run preview`: serve the production build locally
- `npm run typecheck`: run TypeScript only
- `npm run smoke`: verify the Phase 2 repository scaffold

## Supabase Notes

- The initial schema and RLS policies live in [`supabase/migrations/20260401161000_phase_2_foundation.sql`](./supabase/migrations/20260401161000_phase_2_foundation.sql).
- The schema supports:
  - multiple teams per coach
  - roster players with jersey uniqueness
  - games with current set and status
  - stat events with soft-delete-friendly fields, idempotency keys, and a team-consistency trigger between `game_id` and `player_id`
  - game summaries for later post-game output

## Deployment Assumptions

- Static frontend host: **Vercel**
- SPA routing fallback: [`vercel.json`](./vercel.json)
- Supabase handles auth and data; no server bundle is required for Phase 2
- Magic-link auth expects the deployed site URL or redirect URL to be allowlisted in Supabase Auth settings.

## Supporting Docs

- [`aiDocs/architecture.md`](./aiDocs/architecture.md)
- [`aiDocs/mvp_scope_sheet.md`](./aiDocs/mvp_scope_sheet.md)
- [`aiDocs/evidence/phase_2_voice_pipeline_boundaries.md`](./aiDocs/evidence/phase_2_voice_pipeline_boundaries.md)
- [`aiDocs/evidence/logging_and_smoke_conventions.md`](./aiDocs/evidence/logging_and_smoke_conventions.md)
- [`aiDocs/evidence/demo_fallback_spec.md`](./aiDocs/evidence/demo_fallback_spec.md)
