# 2026-04-06 Deepgram Realtime STT Replacement Verification

## What Changed

- Replaced browser `window.SpeechRecognition` capture with a Deepgram realtime websocket pipeline in [`src/features/games/useSpeechCapture.ts`](../../src/features/games/useSpeechCapture.ts).
- Added authenticated Deepgram temporary-token minting in [`supabase/functions/deepgram-token/index.ts`](../../supabase/functions/deepgram-token/index.ts) so the long-lived provider key stays server-side.
- Added roster-aware Deepgram keyterm construction in [`src/lib/deepgram.ts`](../../src/lib/deepgram.ts) and wired it into both dashboard capture and last-event voice correction from [`src/features/dashboard/GameDashboardPage.tsx`](../../src/features/dashboard/GameDashboardPage.tsx).
- Removed the old Web Speech type shim because the app no longer depends on that browser API.

## What I Verified

- Ran `npm run typecheck`.
  - Confirmed the new hook contract still matches both dashboard call sites and the new Deepgram helper/function typings compile cleanly.
- Ran `npm run build`.
  - Confirmed the app still produces a working production bundle after the capture-layer swap.
- Verified hosted temporary-token minting against the linked Supabase project.
  - Confirmed `deepgram-token` returns a real short-lived JWT for an authenticated user.
- Probed the Deepgram browser token path directly with real hosted temporary JWTs.
  - Confirmed browser-safe `Sec-WebSocket-Protocol: bearer, <JWT>` works.
  - Confirmed query-param auth variants do not work for the temporary JWT path.
  - Confirmed `language`, `endpointing`, `vad_events`, and roster-style `keyterm` params are accepted on the working temp-token path.
  - Confirmed `utterance_end_ms=700` consistently caused non-101 websocket handshakes, so the final config intentionally leaves it out and relies on finalize-on-stop.
- Completed a localhost full-pass verification with the browser API-key fallback disabled.
  - Main push-to-talk capture opened, transcribed, and entered the normal review queue.
  - Confirming the review item still saved through the existing confirm-before-write path.
  - Last-event voice correction still worked through the same `useSpeechCapture` contract.
  - Manual text entry remained available as the fallback path.
  - The updated capture-phase UI correctly distinguished connecting from ready-to-speak.

## What Is Still Environment-Dependent

- Production-hosted verification is still worth one preview or live pass before calling the deployment fully proven.
- I did not record side-by-side transcript-quality benchmarks versus the old Web Speech path in this note, so the “better names/terminology” claim is still qualitative rather than measured.

## Root-Cause Debugging Notes

- The browser temp-token path initially failed even after token minting was fixed.
- The underlying auth pattern was not the problem: Deepgram accepted temporary JWTs when the browser used `Sec-WebSocket-Protocol: bearer, <JWT>`.
- The main websocket-handshake breaker turned out to be the connection settings, specifically `utterance_end_ms`.
- The final live config keeps:
  - `model=nova-3`
  - `language=en-US`
  - `encoding=linear16`
  - `sample_rate=16000`
  - `channels=1`
  - `interim_results=true`
  - `smart_format=true`
  - `endpointing=300`
  - `vad_events=true`
  - roster-aware `keyterm` params
- The final live config intentionally omits:
  - `utterance_end_ms`

## Recommended Deployment Verification

1. Ensure the hosted Supabase project still has `DEEPGRAM_API_KEY`.
2. Ensure `deepgram-token` is deployed on that same project.
3. Leave `VITE_DEEPGRAM_API_KEY` unset in deployed environments.
4. Test a Vercel preview or production build with:
   - main push-to-talk capture
   - confirm flow
   - last-event voice correction
   - manual fallback still available if the mic path fails
