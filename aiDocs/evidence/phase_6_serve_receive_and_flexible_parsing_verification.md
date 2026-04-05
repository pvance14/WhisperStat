# Phase 6 Serve Receive + Flexible Parsing Verification

**Date:** 2026-04-04  
**Purpose:** Record the repo-local verification completed for the serve-receive schema addition and the focused deterministic parser expansion.

## Repo-Local Verification

Commands run:

- `npm run typecheck`
- `npm run build`
- `npm run smoke`
- `./node_modules/.bin/esbuild /tmp/serve-receive-parser-harness.ts --bundle --platform=node --format=esm --outfile=/tmp/serve-receive-parser-harness.mjs`
- `node /tmp/serve-receive-parser-harness.mjs`
- `./node_modules/.bin/esbuild /tmp/serve-receive-parser-ambiguous.ts --bundle --platform=node --format=esm --outfile=/tmp/serve-receive-parser-ambiguous.mjs && node /tmp/serve-receive-parser-ambiguous.mjs`

What those checks confirmed:

- `npm run typecheck` passed after adding `serve_receive` to the shared stat-event type surfaces.
- `npm run build` passed, which confirmed the dashboard, report, summary, and parser/UI code still compile together after the vocabulary change.
- `npm run smoke` passed, which confirmed the repo foundation and expected project files still match the smoke baseline.

Temporary parser harness verification against [`src/lib/matchParser.ts`](../../src/lib/matchParser.ts) confirmed:

- `"Chuck serve receive"` returned a single deterministic proposal for `Chuck -> serve_receive`.
- `"Chuck got the serve receive"` returned a single deterministic proposal for `Chuck -> serve_receive`.
- `"Chuck serve receive, Shane set, Cosmo kill"` returned one `proposal_batch` with three ordered supported proposals: `serve_receive`, `set`, and `kill`.
- `"Chuck got the serve receive, passed it to Shane, Shane set Cosmo for the kill"` returned one `proposal_batch` with:
  - supported deterministic proposals for `Chuck -> serve_receive`, `Shane -> set`, and `Cosmo -> kill`
  - one skipped `unsupported_event` clause for `"passed it to Shane"`, which is the intended trust-preserving behavior for unsupported rally context
- `"Shane set Cosmo"` returned a single deterministic proposal for `Shane -> set`, confirming that single-clause parsing now uses the same relation-aware player resolution instead of treating the phrase as an ambiguous two-player sentence.
- `"kill by Cosmo"` returned a single deterministic proposal for `Cosmo -> kill`.
- A duplicate-name roster test with `"Jordan serve receive"` returned an `ambiguous_player` clarification instead of guessing, confirming the safe-failure path still holds after the new serve-receive support.

## Notes

- This verification was repo-local only. The new migration file [`supabase/migrations/20260404190100_phase_6_serve_receive_enum.sql`](../../supabase/migrations/20260404190100_phase_6_serve_receive_enum.sql) was authored, but no hosted or local Supabase migration apply was run in this pass.
- The parser intentionally still treats generic pass movement like `"passed it to Shane"` as visible context, not a persisted stat, unless the clause safely maps to the supported vocabulary.
