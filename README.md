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
3. Optional for the clarification-only AI fallback: set `VITE_LLM_PARSE_ENABLED=true`.
4. If you want the Edge fallback to work locally or remotely, set the Supabase function secret `ANTHROPIC_API_KEY` and optionally `ANTHROPIC_MODEL`.
5. In Supabase Auth settings, allowlist the same redirect origin or URL you plan to use locally and in Vercel.
6. Run `npm install`.
7. Run `npm run smoke`.
8. Run `npm run dev`.

For local Supabase Edge work, set secrets with the CLI before serving functions:

- `npx supabase secrets set ANTHROPIC_API_KEY=<your-key>`
- `npx supabase secrets set ANTHROPIC_MODEL=claude-sonnet-4-0`
- `npx supabase functions serve parse-stat-llm`
- `npx supabase functions deploy parse-stat-llm --no-verify-jwt`

## Optional Dev Admin Shortcut

If you want faster local sign-in during development, you can enable a dev-only shortcut that still
creates a real Supabase session:

1. Create a dedicated test admin user in Supabase Auth with an email/password login.
2. Add these local-only values to `.env`:
   - `VITE_ENABLE_DEV_ADMIN_SHORTCUT=true`
   - `VITE_DEV_ADMIN_EMAIL=<your test admin email>`
   - `VITE_DEV_ADMIN_PASSWORD=<that user's password>`
3. Restart `npm run dev`.

This exposes those values to the client bundle because they are Vite env vars, so this shortcut is
for local development only and should stay disabled in production.

## Clarification-Only AI Fallback

The narrow LLM assist is intentionally behind the existing deterministic parser:

- The client only calls the Edge function when a review item lands in a clarification state for `missing_event_type` or `missing_player`.
- The browser only sends the signed-in user JWT; `ANTHROPIC_API_KEY` stays in Supabase Edge secrets.
- Successful AI output is still just a normal review proposal, so nothing reaches `stat_events` until the coach presses Confirm.
- `ambiguous_player` stays deterministic-only in v1 to avoid a fuzzy AI pick when the roster match is already contested.
- This Anthropic account validated successfully with `claude-sonnet-4-0`. The cheaper `claude-3-5-haiku-latest` and `claude-3-5-sonnet-latest` aliases returned `not_found_error` during hosted testing, so use a cheaper model only if your account actually exposes it.

## Supabase Wiring

The repo is now wired for the official Supabase CLI workflow:

1. Authenticate your CLI:
   `npx supabase login`
2. Link this repo to your hosted project:
   `npm run supabase:link -- --project-ref <your-project-ref>`
3. Dry-run or apply the remote schema changes:
   `npm run supabase:db:push`
4. Regenerate typed DB definitions after the remote project is linked:
   `npm run supabase:types`

If you want to run the local Supabase stack as well, use:

- `npm run supabase:start`
- `npm run supabase:status`
- `npm run supabase:stop`

## Scripts

- `npm run dev`: start the Vite dev server
- `npm run build`: type-check and build the production app
- `npm run preview`: serve the production build locally
- `npm run typecheck`: run TypeScript only
- `npm run smoke`: verify the Phase 2 repository scaffold
- `npm run supabase:start`: boot the local Supabase stack
- `npm run supabase:status`: inspect local Supabase services
- `npm run supabase:stop`: stop the local Supabase stack
- `npm run supabase:link -- --project-ref <ref>`: link the repo to a hosted Supabase project
- `npm run supabase:db:push`: apply local migrations to the linked remote project
- `npm run supabase:types`: generate `src/lib/database.generated.ts` from the linked project schema
- `npx supabase functions serve parse-stat-llm`: run the clarification-only LLM fallback locally

## Supabase Notes

- The initial schema and RLS policies live in [`supabase/migrations/20260401161000_phase_2_foundation.sql`](./supabase/migrations/20260401161000_phase_2_foundation.sql).
- The CLI project config lives in [`supabase/config.toml`](./supabase/config.toml).
- The default local auth redirect URLs in `supabase/config.toml` were aligned to Vite's `5173` port so magic-link flows match the actual app scaffold.
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
- The optional AI clarification fallback runs as a Supabase Edge Function and expects `ANTHROPIC_API_KEY` to be configured in that environment
- Magic-link auth expects the deployed site URL or redirect URL to be allowlisted in Supabase Auth settings.

## Supporting Docs

- [`aiDocs/architecture.md`](./aiDocs/architecture.md)
- [`aiDocs/mvp_scope_sheet.md`](./aiDocs/mvp_scope_sheet.md)
- [`aiDocs/evidence/phase_2_voice_pipeline_boundaries.md`](./aiDocs/evidence/phase_2_voice_pipeline_boundaries.md)
- [`aiDocs/evidence/logging_and_smoke_conventions.md`](./aiDocs/evidence/logging_and_smoke_conventions.md)
- [`aiDocs/evidence/demo_fallback_spec.md`](./aiDocs/evidence/demo_fallback_spec.md)
