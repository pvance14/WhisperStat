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

## What Is Still Environment-Dependent

- I did not run a live Deepgram capture session in this repo session because no Deepgram secret was configured in the checked local env context, and the new `deepgram-token` Supabase Edge function was not deployed or served against a credentialed project here.
- Because of that, the following still need one credentialed verification pass:
  - authenticated token minting through `deepgram-token`
  - realtime websocket open/finalize behavior with actual mic audio
  - interim transcript quality with roster keyterms in a real noisy capture test

## Expected Manual Verification Once Secrets Are Available

1. Set Supabase Edge secret `DEEPGRAM_API_KEY`.
2. Serve or deploy `deepgram-token`.
3. Sign in to the app, open a game dashboard, and test:
   - main push-to-talk capture
   - last-event voice correction
   - manual fallback after intentionally blocking mic or stopping network
4. Confirm the resulting transcript still enters the existing review queue and only writes after explicit confirm.
