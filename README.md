# WhisperStat

Voice-first volleyball stat tracking built as a React PWA with Supabase.

## What the app does

WhisperStat is a React PWA backed by Supabase: magic-link auth, Postgres schema with RLS, teams and rosters, game setup, and an end-to-end live match workflow. See [`ai/changelog.md`](./ai/changelog.md) for dated notes and roadmap references.

**Capture and parsing**

- Roster-aware transcript parsing (deterministic path first), including **multi-event rally** proposals from a single utterance (ordered batches, mixed success/clarification rows).
- **Web Speech** push-to-talk plus **manual text** fallback when the browser cannot capture audio.
- Parser and schema extensions such as **`serve_receive`** as a first-class stat type (see the `serve_receive` enum migration in [`supabase/migrations/`](./supabase/migrations/)).

**Trust and data**

- Review queue with **confirm / reject**; confirmed events write to `stat_events` with **duplicate-safe `client_event_id`** handling.
- **Soft-delete undo**, **last-event** voice/manual correction, and **event-log edits** so aggregates stay aligned with coach intent.
- **Atomic batch confirm** via `confirm_stat_event_batch` for multi-event groups (see the batch-confirm migrations under `supabase/migrations/`).

**Live game and reporting**

- Persisted **per-set scores** (`games.score_by_set`), dashboard score editing, **complete / reopen** game controls, and **locked capture** while a game is completed.
- **Live stats report** route with polling, current-set vs full-match views, saved set scores, and light leader-style visuals aligned with the live dashboard layout.

**Post-game**

- Deterministic **post-game summary** generation, persistence in `game_summaries`, **`/app/summary/:gameId`** with regenerate and error handling, plus handoff links from dashboard, report, and overview. Summaries can **fall back to on-screen preview** if persistence fails; `games.updated_at` is bumped on stat changes so saved summaries can go stale and regenerate when appropriate.

**UI**

- Shared **layout and hierarchy refresh** (summary strips, segmented controls, clearer hero/action panels) with **mobile-first** action grouping and **reduced-motion** support.

**Optional AI (narrow fallback)**

- Supabase Edge function **`parse-stat-llm`** runs **only behind** the deterministic parser for eligible clarification cases (see section below). Hosted deploy uses `--no-verify-jwt` with JWT checks inside the function; multi-event flows can run clause-level LLM assist only where configured.

## Local setup

1. Copy `.env.example` to `.env`.
2. Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
3. Optional: set `VITE_SUPABASE_REDIRECT_URL` if you want to force a specific auth redirect URL. If omitted, the app falls back to the current origin (works well for Vercel deploys).
4. Optional for the clarification-only AI fallback: set `VITE_LLM_PARSE_ENABLED=true`.
5. If you want the Edge fallback to work locally or remotely, set the Supabase function secret `ANTHROPIC_API_KEY` and optionally `ANTHROPIC_MODEL`.
6. In Supabase Auth settings, allowlist the local and deployed app URLs you plan to use.
7. Run `npm install`.
8. Run `npm run smoke`.
9. Run `npm run dev`.

For local Supabase Edge work, set secrets with the CLI before serving functions:

- `npx supabase secrets set ANTHROPIC_API_KEY=<your-key>`
- `npx supabase secrets set ANTHROPIC_MODEL=claude-sonnet-4-0`
- `npx supabase functions serve parse-stat-llm`
- `npx supabase functions deploy parse-stat-llm --no-verify-jwt`

## Optional dev admin shortcut

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

Hosted builds do not need `VITE_APP_ENV=production`; the app now infers production mode from the
Vite build when that env var is omitted.

## Clarification-only AI fallback

The narrow LLM assist is intentionally behind the existing deterministic parser:

- The client only calls the Edge function when a review item lands in a clarification state for `missing_event_type` or `missing_player`.
- The browser only sends the signed-in user JWT; `ANTHROPIC_API_KEY` stays in Supabase Edge secrets.
- Successful AI output is still just a normal review proposal, so nothing reaches `stat_events` until the coach presses Confirm.
- `ambiguous_player` stays deterministic-only in v1 to avoid a fuzzy AI pick when the roster match is already contested.
- Multi-event batches can mix deterministic rows, LLM-assisted rows, and unresolved clauses; confirm-all uses the server batch RPC.
- This Anthropic account validated successfully with `claude-sonnet-4-0`. The cheaper `claude-3-5-haiku-latest` and `claude-3-5-sonnet-latest` aliases returned `not_found_error` during hosted testing, so use a cheaper model only if your account actually exposes it.

## Supabase wiring

The repo is wired for the official Supabase CLI workflow:

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
- `npm run smoke`: verify core repo scaffold files (baseline migration + evidence paths; see `scripts/smoke.mjs`)
- `npm run supabase:start`: boot the local Supabase stack
- `npm run supabase:status`: inspect local Supabase services
- `npm run supabase:stop`: stop the local Supabase stack
- `npm run supabase:link -- --project-ref <ref>`: link the repo to a hosted Supabase project
- `npm run supabase:db:push`: apply local migrations to the linked remote project
- `npm run supabase:db:pull`: pull remote schema changes into local migration history (use with care)
- `npm run supabase:types`: generate `src/lib/database.generated.ts` from the linked project schema
- `npx supabase functions serve parse-stat-llm`: run the clarification-only LLM fallback locally

## Supabase notes

- Ordered SQL in [`supabase/migrations/`](./supabase/migrations/) establishes core tables and RLS first, then adds `games.score_by_set`, batch-confirm RPC hardening fixes, and the `serve_receive` stat enum value.
- The CLI project config lives in [`supabase/config.toml`](./supabase/config.toml).
- The default local auth redirect URLs in `supabase/config.toml` were aligned to Vite's `5173` port so magic-link flows match the actual app scaffold.
- The schema supports:
  - multiple teams per coach
  - roster players with jersey uniqueness
  - games with current set and status (plus per-set score storage)
  - stat events with soft-delete-friendly fields, idempotency keys, and team consistency between `game_id` and `player_id`
  - game summaries for post-game output

## Deployment assumptions

- Static frontend host: **Vercel**
- SPA routing fallback: [`vercel.json`](./vercel.json)
- Supabase handles auth, data, and RPCs; the optional AI clarification fallback runs as a Supabase Edge Function and expects `ANTHROPIC_API_KEY` in that environment
- Magic-link auth expects the deployed site URL or redirect URL to be allowlisted in Supabase Auth settings.

## Supporting docs

- [`ai/changelog.md`](./ai/changelog.md) — concise dated change log tied to roadmap docs
- [`aiDocs/architecture.md`](./aiDocs/architecture.md)
- [`aiDocs/mvp_scope_sheet.md`](./aiDocs/mvp_scope_sheet.md)
- [`aiDocs/evidence/README.md`](./aiDocs/evidence/README.md) — index of validation write-ups (voice pipeline boundaries, logging/smoke conventions, demo fallbacks, multi-event + LLM hardening, serve receive / flexible parsing)
- [`aiDocs/evidence/logging_and_smoke_conventions.md`](./aiDocs/evidence/logging_and_smoke_conventions.md)
- [`aiDocs/evidence/demo_fallback_spec.md`](./aiDocs/evidence/demo_fallback_spec.md)
- [Multi-event and LLM hardening verification](./aiDocs/evidence/phase_6_multi_event_llm_hardening_verification.md)
- [Serve receive and flexible parsing verification](./aiDocs/evidence/phase_6_serve_receive_and_flexible_parsing_verification.md)
