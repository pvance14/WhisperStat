# Demo Fallback Spec

**Date:** 2026-04-01  
**Purpose:** Define the safe fallback posture early enough that architecture and feature work can support it later.

## Golden Path

The intended final demo path remains:

1. sign in
2. select team and roster
3. open a game
4. use push-to-talk capture
5. confirm the parsed event
6. show live dashboard updates
7. show the in-app current-game report
8. finish with the post-game summary

## Acceptable Fallback Layers

If live voice capture is unstable, fallback should narrow the demo rather than widen the product:

### Fallback 1: pre-cleared browser/device path

- switch to the tested phone/browser pair
- use the already-approved mic permissions path

### Fallback 2: transcript-driven confirmation demo

- use a short pre-recorded or pre-transcribed utterance set
- feed the same parse/confirm UI path without pretending the ASR succeeded live

### Fallback 3: manual event-seeding for dashboard/report proof

- if capture must be skipped, demonstrate that the stored event pipeline, dashboard, and current-game report still work with known-good seeded events

## Out Of Bounds For Fallback

- inventing a new feature surface just for demo day
- silently skipping confirmation
- expanding into exports, native apps, or multi-user features because live voice is shaky

## Implementation Implications

- Later phases should keep the event pipeline modular enough that capture, confirmation, persistence, and display can be demonstrated separately if needed.
- Dashboard and report views should remain useful even when events are seeded manually.
- Any fallback must still support the class-final story of disciplined execution, not a fake “everything worked live” claim.
