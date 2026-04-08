# 2026-04-07 Phase 7 Demo Hardening

## Purpose

This note closes the Phase 7 demo-hardening scope: preflight, fallback posture, and the seeded backup scenario for classroom-demo risk reduction.

## Preflight Checklist

Run this checklist before the final demo:

1. Confirm the frontend has `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` configured.
2. Confirm the hosted Supabase project still has `DEEPGRAM_API_KEY` and that `deepgram-token` is deployed.
3. If the narrow AI clarification fallback is part of the demo, confirm `ANTHROPIC_API_KEY` is present and `parse-stat-llm` is deployed.
4. Confirm the intended device/browser pair can sign in and already has microphone permission granted.
5. Confirm the deployed app origin is allowlisted in Supabase Auth redirects.
6. Open the app once before the presentation and verify:
   - sign-in succeeds
   - roster page loads
   - a target game opens
   - push-to-talk reaches the ready-to-speak state
7. Keep one signed-in backup device/browser available.
8. Keep the manual transcript fallback visible in the dashboard in case live speech capture fails after sign-in.

## Golden Demo Path

1. Sign in.
2. Open the roster-backed game.
3. Use push-to-talk.
4. Confirm the parsed event.
5. Show the live dashboard totals.
6. Open the current-game report.
7. Demonstrate one correction or undo.
8. Complete the game.
9. Open the post-game summary.

## Fallback Layers

These are intentionally narrow and all use real product paths already implemented:

### Fallback 1: Backup device/browser

Use the pre-cleared phone/browser pair that already has working mic permissions. This is the lowest-risk fallback because it preserves the full golden path.

### Fallback 2: Manual transcript capture

If Deepgram or the network path is unstable, use the manual text-entry path from the same dashboard review flow. This keeps:

- parser behavior
- confirm-before-write trust behavior
- live totals
- report updates
- post-game summary

The only thing removed is live speech capture.

### Fallback 3: Seeded backup game

If room Wi-Fi or auth stability makes live capture unrealistic, use the deterministic backup game seeded during the Phase 5 validation pass:

- game id: `11111111-1111-4111-8111-111111111111`
- label: `Phase 5 Validation`
- route pattern: `/app/games/:gameId`, `/app/report/:gameId`, `/app/summary/:gameId`

Why this backup is legitimate:

- it uses real persisted rows, saved set scores, and the same dashboard/report/summary screens
- it was originally seeded to verify aggregate correctness and soft-delete exclusion
- it supports a truthful fallback story: the storage/reporting loop is proven even if live speech is skipped

## Known Demo-Day Risks And Responses

| Risk | Response |
|---|---|
| Browser asks for mic permission too late | Use the pre-cleared device/browser and grant permission before presenting. |
| Temporary-token or Deepgram handshake fails | Fall back to manual transcript entry on the same dashboard. |
| Room Wi-Fi is unstable | Use the seeded validation game to show the persisted dashboard/report/summary loop. |
| AI clarification fallback is unavailable | Keep the demo on deterministic phrases; the MVP still works without optional LLM assist. |

## Why This Was Necessary

Phase 7 called for demo hardening instead of new feature work. This checklist turns the earlier fallback spec into something presentation-ready and ties each fallback to a real, already-verified product path.
