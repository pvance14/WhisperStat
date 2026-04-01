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
2. Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
3. Run `npm install`.
4. Run `npm run smoke`.
5. Run `npm run dev`.

## Scripts

- `npm run dev`: start the Vite dev server
- `npm run build`: type-check and build the production app
- `npm run preview`: serve the production build locally
- `npm run typecheck`: run TypeScript only
- `npm run smoke`: verify the Phase 2 repository scaffold

## Supabase Notes

- The initial schema and RLS policies live in [supabase/migrations/20260401161000_phase_2_foundation.sql](/Users/prestonvance/Documents/GitHub/stat-side/supabase/migrations/20260401161000_phase_2_foundation.sql).
- The schema supports:
  - multiple teams per coach
  - roster players with jersey uniqueness
  - games with current set and status
  - stat events with soft-delete-friendly fields and idempotency keys
  - game summaries for later post-game output

## Deployment Assumptions

- Static frontend host: **Vercel**
- SPA routing fallback: [vercel.json](/Users/prestonvance/Documents/GitHub/stat-side/vercel.json)
- Supabase handles auth and data; no server bundle is required for Phase 2

## Supporting Docs

- [architecture.md](/Users/prestonvance/Documents/GitHub/stat-side/aiDocs/architecture.md)
- [mvp_scope_sheet.md](/Users/prestonvance/Documents/GitHub/stat-side/aiDocs/mvp_scope_sheet.md)
- [phase_2_voice_pipeline_boundaries.md](/Users/prestonvance/Documents/GitHub/stat-side/aiDocs/evidence/phase_2_voice_pipeline_boundaries.md)
- [logging_and_smoke_conventions.md](/Users/prestonvance/Documents/GitHub/stat-side/aiDocs/evidence/logging_and_smoke_conventions.md)
- [demo_fallback_spec.md](/Users/prestonvance/Documents/GitHub/stat-side/aiDocs/evidence/demo_fallback_spec.md)
