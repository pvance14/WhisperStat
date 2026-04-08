# 2026-04-07 Phase 7 Security And Performance Notes

## Purpose

This note closes the Phase 7 requirement for a quick RLS/security spot-check and qualitative performance notes on the capture path.

## Security / RLS Spot-Check

### What was already executed

- `aiDocs/evidence/phase_2_live_verification.md` recorded both:
  - RLS happy path
  - RLS denied path where a second user could not read or modify the first user's rows
- `aiDocs/evidence/phase_6_multi_event_llm_hardening_verification.md` recorded:
  - unauthenticated `parse-stat-llm` denial
  - hosted batch-confirm rejection when a proposal referenced a player outside the game roster
- `aiDocs/evidence/2026-04-06_deepgram_realtime_stt_replacement_verification.md` recorded:
  - server-side Deepgram token minting so the long-lived provider key stays out of the browser by default

### Why that is enough for Phase 7

- The app's main user-data boundary is already enforced with Supabase Auth + RLS.
- The optional AI fallback does not trust the browser's roster payload and still validates the authenticated user/server-side roster context.
- The speech provider key is no longer required in the browser for the intended deployed path.

## Performance Notes

### Existing instrumentation

- [`src/lib/logger.ts`](../../src/lib/logger.ts) wraps async work with duration logging.
- [`src/features/dashboard/GameDashboardPage.tsx`](../../src/features/dashboard/GameDashboardPage.tsx) logs:
  - `capture.parse.completed` with `parseDurationMs`
  - `capture.parse.llm.completed` / `capture.parse.llm.failed` with `latencyMs`
- [`src/features/games/useSpeechCapture.ts`](../../src/features/games/useSpeechCapture.ts) measures speech capture duration and surfaces ready/connecting/finalizing states so the user sees where latency is happening.

### Qualitative read for the class final

- Deterministic parsing is local and should be the fast path.
- Confirmation happens before persistence, which adds one intentional human step but is necessary for trust.
- Optional LLM assist is clearly slower and therefore remains a fallback, not the primary capture path.
- The UI now distinguishes mic permission, authentication, websocket connection, ready-to-speak, and finalizing states, which lowers perceived latency confusion even when network work exists.

### Evidence limits

- This shell session did not collect fresh p95 timings from a live device/browser run.
- For the class final, the right claim is therefore "the repo instruments capture latency and the fast path is deterministic-first," not "we measured polished production-grade latency at scale."
- `npm run build` did succeed during Phase 7 closeout, but Vite warned that the main JS chunk is slightly above 500 kB minified. That is worth tracking later, but it is not a demo blocker for the current class-final scope.
