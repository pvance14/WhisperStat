# 2026-04-06 Sub-Plan: Deepgram Realtime STT Replacement

## Summary

Implement one focused capture-layer replacement that:

1. Removes the app's dependence on browser `window.SpeechRecognition` for live dictation.
2. Adds Deepgram realtime transcription behind the existing push-to-talk UI and `useSpeechCapture` hook contract.
3. Keeps the current parser, review queue, correction flow, and confirm-before-write trust model intact.

This document is a local planning artifact in `ai/roadmaps`. See [`aiDocs/context.md`](../../aiDocs/context.md) for canonical product pointers.

We need to avoid over-engineering, cruft, and legacy-compatibility features in this clean code project. This sub-plan intentionally focuses on the speech-transcription layer and does not bundle in unrelated parser redesigns or broad workflow changes.

## Problem This Slice Solves

Right now the main speech limitation is upstream of the parser:

- The app uses the browser-managed Web Speech API for speech recognition.
- The app does not record and stream raw audio itself.
- The parser only receives one browser-produced transcript string after speech capture ends.

That means transcript quality is capped by the browser/device speech engine before the roster-aware parser ever gets a chance to work. This is especially painful for:

- player names
- nicknames and aliases
- volleyball-specific phrases
- noisy gym audio

## In Scope

- Add a Supabase Edge function that returns a short-lived Deepgram access token for authenticated users.
- Replace the internals of `useSpeechCapture` so it streams audio to Deepgram during push-to-talk.
- Keep the existing `CaptureResult` shape and downstream page behavior the same.
- Add active-roster and volleyball vocabulary biasing to the Deepgram connection setup.
- Reuse the new Deepgram-backed capture path for both:
  - main live stat capture
  - last-event voice correction
- Add verification notes for auth, capture lifecycle, and transcript quality.

## Out Of Scope

- Full backend audio proxying through Supabase or another custom websocket layer.
- Always-on listening or passive background capture.
- Silent writes or automatic persistence after transcript return.
- Large deterministic-parser rewrites in the same slice.
- Custom model training or broader Deepgram product experimentation beyond the basic realtime STT integration.

## Recommended Auth + Transport Direction

Use **temporary token + direct browser websocket** rather than shipping the Deepgram API key to the client or proxying all audio through a custom backend.

Recommended flow:

1. Browser asks a new Supabase Edge function for a short-lived Deepgram token.
2. Edge function validates the signed-in Supabase user.
3. Edge function calls Deepgram's token grant endpoint using the server-side `DEEPGRAM_API_KEY`.
4. Browser opens the Deepgram realtime socket with the returned temporary token.
5. Browser streams mic audio directly to Deepgram during the active push-to-talk session.

This is necessary because it matches the repo's current server-boundary pattern and avoids exposing a long-lived speech-provider secret in the client bundle.

## Recommended Client Capture Direction

### 1. Preserve the `useSpeechCapture` interface

Keep the hook's external contract stable:

- `startListening`
- `stopListening`
- `isListening`
- `liveTranscript`
- `error`
- final callback with `{ transcript, durationMs, source: "speech" }`

This is necessary because the dashboard and correction flows already depend on that contract. Reusing it keeps the implementation focused on the capture engine swap instead of spilling into UI rewrites.

### 2. Replace browser ASR with Deepgram live streaming

When capture starts:

- request mic permission with `getUserMedia`
- request a short-lived Deepgram token from the new Edge function
- create a Deepgram realtime connection with a browser `WebSocket` using Deepgram's browser-safe auth pattern
- begin streaming microphone audio chunks while the button is held
- show interim transcript text in the existing live transcript UI

When capture stops:

- stop sending new audio
- finalize the Deepgram stream
- wait briefly for the last final transcript
- submit the final transcript to the same parser/review flow used today
- release mic tracks, audio nodes, socket listeners, and timers cleanly

### 3. Use raw PCM audio rather than containerized browser recordings

Preferred implementation:

- use `AudioContext` + `MediaStreamAudioSourceNode`
- convert audio to mono 16 kHz `linear16`
- stream small PCM chunks to Deepgram in realtime

Fallback:

- use a simpler browser audio-processing fallback only if the preferred path is not supported on the active device/browser

Why this is necessary:

- It gives the app direct control over the audio format instead of relying on browser-specific speech-recognition behavior.
- It avoids format mismatch confusion that would come from building the integration around a remote-stream demo snippet instead of a live microphone capture path.

## Recommended Deepgram Connection Shape

Use Deepgram's live transcription websocket with a narrow, explicit configuration:

- model: `nova-3`
- language: `en-US`
- `smart_format: true`
- `interim_results: true`
- low-latency endpointing settings suitable for push-to-talk
- one-channel speech input

Add roster-aware vocabulary biasing on each connection using:

- full player names
- aliases
- unique first or last names where helpful
- a small fixed list of volleyball stat phrases

Important constraint:

- Build the vocabulary list from the active game roster at capture time.
- Deduplicate and cap it so the integration stays simple and predictable.
- Treat this as transcript help, not as player-resolution authority. The roster-aware parser still owns final player matching.
- Keep `utterance_end_ms` optional rather than required. In the final browser temp-token path, it caused repeated non-101 websocket handshakes, so finalize-on-stop remained the safer closeout strategy.

## Downstream Behavior To Preserve

The following behavior should stay the same after the STT swap:

- transcript goes through `parseMatchTranscript`
- deterministic parser still runs first
- existing clause-level LLM fallback rules stay unchanged
- review items still require explicit confirm
- confirmed rows remain the only data written to `stat_events`
- manual text entry remains available when live capture fails

This is necessary so we can measure the effect of the Deepgram change without muddying the result with a second major workflow change.

## Error Handling + Observability

Add focused logging and user feedback for:

- token request start / success / failure
- mic permission failure
- Deepgram socket open / close / error
- no transcript returned after a capture
- final transcript latency
- capture cleanup on stop or error

User-facing behavior should stay simple:

- show a short recoverable error
- keep manual transcript entry available
- never enqueue a broken review item if the STT session fails before a usable final transcript exists

## Verification

Create a short evidence note once implemented. It should cover:

- authenticated token minting works and does not expose the real Deepgram key to the browser
- push-to-talk still starts and stops cleanly
- interim transcript text appears while speaking
- final transcript still enters the current review queue
- voice correction still works through the same hook contract
- at least a few real examples showing better handling of player names and core volleyball phrases than the current browser-managed speech path
- at least one failure example showing the user can fall back to manual transcript entry without losing the rest of the workflow

Implementation note:

- Added [`aiDocs/evidence/2026-04-06_deepgram_realtime_stt_replacement_verification.md`](../../aiDocs/evidence/2026-04-06_deepgram_realtime_stt_replacement_verification.md) with the local verification steps, temporary-token handshake debugging notes, and the completed localhost full-flow validation.

## Implementation Checklist

| # | Task |
|---|------|
| 1 | Add a Supabase Edge function for short-lived Deepgram token minting using server-side secrets |
| 2 | Add minimal browser audio plumbing and browser-safe Deepgram websocket auth for realtime mic streaming |
| 3 | Replace `useSpeechCapture` internals with a Deepgram-backed push-to-talk implementation while preserving its public contract |
| 4 | Add active-roster and volleyball keyterm biasing to the Deepgram session setup |
| 5 | Verify the main dashboard and last-event correction flows still work unchanged downstream |
| 6 | Add evidence notes and update roadmap/changelog when implementation is complete |

## Status Update

- [x] Task 1 completed.
- [x] Task 2 completed without adding a browser SDK dependency; a direct websocket implementation kept the slice smaller.
- [x] Task 3 completed.
- [x] Task 4 completed.
- [x] Task 5 completed through localhost full-flow validation of main capture, confirm, last-event voice correction, and manual fallback.
- [x] Task 6 completed with roadmap/changelog/evidence updates after the token-path handshake investigation and live verification pass.

When this pair is fully implemented, update the roadmap checkboxes, move both files to `ai/roadmaps/complete`, and add a line to [`ai/changelog.md`](../changelog.md) per [`aiDocs/context.md`](../../aiDocs/context.md).
