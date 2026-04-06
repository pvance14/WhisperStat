# 2026-04-06 Roadmap: Deepgram Realtime STT Replacement

## Purpose

Replace the current browser `window.SpeechRecognition` capture path with Deepgram realtime transcription so the voice-first stat workflow has a better chance of handling player names and volleyball terminology in noisy gym conditions. The goal is to improve transcript quality while keeping the same trust posture: push-to-talk, transcript review, deterministic parser first, narrow AI fallback second, and explicit confirm before any write.

This document is a local planning artifact in `ai/roadmaps`. Product canon remains [`aiDocs/context.md`](../../aiDocs/context.md) → PRD, MVP, and [`aiDocs/architecture.md`](../../aiDocs/architecture.md).

We need to avoid over-engineering, cruft, and legacy-compatibility features in this clean code project. This slice should replace the speech engine cleanly, not redesign the whole capture/parsing architecture at the same time.

## Alignment

- Supports the MVP need for a usable live voice workflow in real gym conditions.
- Directly addresses the current accuracy ceiling caused by browser-managed speech recognition.
- Preserves the existing confirmation-first workflow instead of turning speech capture into an auto-save system.
- Fits the existing repo boundary of client app + Supabase Edge functions + server-side secrets.

## Current Status

- Planning status: Ready for implementation planning.
- Implementation status: Implemented and verified through a full localhost Deepgram capture pass.
- Scope status: Browser speech recognition has been replaced in code with Deepgram realtime streaming while preserving the current downstream capture flow.

## Document Status

- [x] Sub-plan drafted: [`2026-04-06_deepgram_realtime_stt_replacement_sub_plan.md`](./2026-04-06_deepgram_realtime_stt_replacement_sub_plan.md).
- [x] Companion roadmap drafted (this file).
- [x] Checked against current capture/parsing constraints and `aiDocs/context.md`.

## Milestones

- [x] **Server-side auth boundary**: add a Supabase Edge token-minting function so the browser never receives the long-lived Deepgram API key.
- [x] **Client capture replacement**: swap `window.SpeechRecognition` for Deepgram live streaming behind the existing `useSpeechCapture` contract.
- [x] **Audio streaming pipeline**: capture microphone audio, normalize it into a Deepgram-supported realtime format, and stream it over a live socket during push-to-talk sessions.
- [x] **Roster-aware vocabulary biasing**: send active-roster names and useful volleyball phrases as Deepgram keyterms to improve transcript quality for names and sport language.
- [x] **Workflow preservation**: keep the same review queue, parser, LLM fallback, correction flow, and confirm-before-write behavior after the new transcript arrives.
- [x] **Verification**: local code/build verification and a credentialed localhost full-flow capture pass are recorded.

## Readiness Checks

- [x] Production capture uses the Supabase token-mint path rather than a client-exposed Deepgram secret. A local-only debug fallback exists, but production builds ignore it in code.
- [x] Push-to-talk remains the capture posture for both live stat entry and last-event correction.
- [x] Existing review/confirm semantics remain unchanged after the STT swap.
- [x] The Deepgram path has a clear failure fallback to manual transcript entry instead of blocking the workflow.
- [x] The implementation stays narrow enough to attribute improvements to the STT change, not to unrelated parsing rewrites.

## Implementation Notes

- Added [`supabase/functions/deepgram-token/index.ts`](../../supabase/functions/deepgram-token/index.ts) for authenticated short-lived Deepgram token minting.
- Replaced the capture engine in [`src/features/games/useSpeechCapture.ts`](../../src/features/games/useSpeechCapture.ts) with a direct microphone + websocket Deepgram pipeline that still returns the same final capture payload shape, now with explicit capture phases so the UI can distinguish connecting from ready-to-speak.
- Added roster-aware keyterm assembly in [`src/lib/deepgram.ts`](../../src/lib/deepgram.ts) and passed it from [`src/features/dashboard/GameDashboardPage.tsx`](../../src/features/dashboard/GameDashboardPage.tsx) into both capture entry points.
- Verified the browser-safe temporary JWT path uses `Sec-WebSocket-Protocol: bearer, <JWT>` and intentionally leaves out `utterance_end_ms` because that option consistently caused non-101 websocket handshakes during live token-path debugging.
- Removed the old Web Speech type shim because the code no longer depends on that browser API.
- Recorded repo-local verification plus the credentialed localhost full-pass notes in [`aiDocs/evidence/2026-04-06_deepgram_realtime_stt_replacement_verification.md`](../../aiDocs/evidence/2026-04-06_deepgram_realtime_stt_replacement_verification.md).

## Completion Signal

This roadmap is complete when a coach can hold to talk, speak a short volleyball play, receive a Deepgram-produced transcript in the existing review flow, and confirm it exactly as before, with visibly better handling of player names and core volleyball terms than the current browser speech-recognition path.
