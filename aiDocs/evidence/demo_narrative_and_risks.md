# Demo Narrative And Risks — Phase 1 Baseline

**Date:** 2026-04-01  
**Purpose:** Define the narrow live-demo story now so later implementation phases optimize for the right product loop.

## Demo Narrative

We will show a coach logging a live volleyball game flow from one team’s roster and match setup into push-to-talk capture, immediate stat confirmation, live per-player and per-set updates, an in-app visual stats report for the current game, and a post-game summary that turns stored events into a readable coaching takeaway. The demo should emphasize that this is a disciplined class-final MVP: a narrow, trustworthy, volleyball-only PWA with natural-feeling voice capture, visible correction paths, and a complete end-to-end loop rather than a broad feature set.

## Top Demo Risks

| Risk | Why It Matters | Early Mitigation Direction |
|---|---|---|
| Microphone permissions or browser behavior | A broken mic flow would block the core differentiator in the live demo. | Test the deployed PWA on the intended phone early; document permission steps and fallback device/browser. |
| Unreliable Wi-Fi in the room or gym | Network problems can break auth, persistence, or any hosted speech/LLM step. | Keep the demo path narrow, minimize network dependence where possible, and define a fallback path in Phase 7. |
| ASR quality in noisy conditions | Misheard names or events make the product look untrustworthy. | Use push-to-talk, test phrase coverage early, and keep confirmation/undo visible in the demo. |
| Parsing ambiguity | Ambiguous phrasing can slow the flow or produce obviously wrong stats. | Keep the MVP vocabulary tight and favor deterministic handling for common phrases before fallback logic. |
| Correction flow friction | If fixing mistakes is slow, the product will feel unsafe in live use. | Treat undo and event-log correction as required MVP behavior, not polish. |
| Scope drift | Extra features can steal time from the one loop the demo actually needs. | Use `aiDocs/mvp_scope_sheet.md` as the build boundary for all later phases. |

## Phase 2 Handoff

Phase 2 should preserve this demo path when choosing architecture, logging, scripts, and fallback behavior. If a technical choice does not help this narrative land more reliably, it should be treated skeptically.
