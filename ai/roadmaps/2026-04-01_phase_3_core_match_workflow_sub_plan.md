# 2026-04-01 Phase 3 Sub-Plan: Core Match Workflow

## Summary

This sub-plan expands Phase 3 of the main MVP implementation plan into the core in-game workflow slice. Its purpose is to define the minimum end-to-end loop that turns spoken match events into reviewable structured records during live use.

This document is a local planning artifact in `ai/roadmaps`. If grader-facing or shared evidence is needed later, the important outcomes should also be reflected in tracked docs.

We need to avoid over-engineering, cruft, and legacy-compatibility features in this clean code project. This phase should deliver the smallest useful voice-first workflow before any feature expansion.

## Phase Intent

- Build the primary value path of the product.
- Connect roster context, push-to-talk capture, structured parsing, and confirmation-ready event handling.
- Keep the core workflow narrow enough to be repeatedly tested and improved.

## In Scope

- One-team match setup tied to roster context.
- Push-to-talk event capture for the MVP stat vocabulary.
- Structured event handling from spoken input through review-ready output.
- Core latency, clarity, and flow decisions that affect real match usability.

## Out Of Scope

- Advanced ambiguity queues beyond MVP needs.
- Multi-user workflows.
- Expanded analytics or broader post-game behavior.

## Planned Outcomes

- A working core capture loop for the MVP stat set.
- A clear handoff from capture to confirmation without silent commits.
- A reusable workflow that can support correction, live stats, and later verification.
- Enough functional coverage to drive realistic testing and iteration.

## Implementation Approach

- Keep the parsing path tightly focused on the MVP vocabulary and the most common spoken patterns.
- Use roster context only to the degree needed for the MVP’s core loop.
- Optimize for coach trust and usable flow before expanding capability.
- Keep the workflow simple enough that mistakes are visible and later phases can correct them cleanly.

## Dependencies And Decisions

- Phase 2 must already provide the minimum app and data foundation.
- The team must prefer repeatable, testable core behavior over ambitious input flexibility.
- Any capture behavior that increases ambiguity or latency without improving the MVP loop should be deferred.

## Verification And Evidence

- Confirm the workflow aligns with the MVP definition of natural-language, push-to-talk stat entry.
- Confirm the capture loop is narrow enough to test under realistic conditions.
- Confirm the output of this phase is sufficient for trust, live-stats, and post-game follow-on phases.

## Assumptions

- A smaller, cleaner capture loop is more valuable than broader phrase coverage early.
- Trust depends on visible review points, not silent automation.
- This phase is complete when the product can move from setup to reviewable event capture in a repeatable way.

## Concrete deliverables

- **Active game context:** select/create game; load roster into memory for NLP; track `current_set` from `games` (read/write as match proceeds).
- **Push-to-talk UX:** explicit start/stop (or hold-to-talk) with clear recording state; handle mic permission UX (esp. Safari).
- **ASR integration:** Web Speech API default; surface **raw transcript** to the confirmation surface (helps debugging and trust).
- **Parse module:** roster-aware resolution (jersey `#`, first/last name, nicknames/`aliases` if present); map utterances to MVP `event_type` values only; return structured **proposed event** `{ player_id, event_type, set_number, … }` or explicit “needs clarification.”
- **Rules-first, LLM fallback:** implement deterministic/heuristic path first per `architecture.md` §2; optional Edge LLM call only when confidence low (stretch: confidence score in UI).
- **Persistence boundary:** Phase 3 ends with **reviewable** proposed events in UI. **Canonical inserts** to `stat_events` occur in Phase 4 on explicit confirm—unless this phase ships confirm in the same increment (see high-level sequencing note).

## Acceptance criteria

- From a real roster, utterances like “12 kill” / “Jane ace” resolve to the right player when unambiguous.
- Parsed output is visible **before** any durable write; no silent commits.
- Latency after utterance end feels acceptable for dev testing (identify slow steps for Phase 7).

## Technical anchors

- `stat_events` shape and `event_type` vocabulary: `mvp.md` + `architecture.md` §7.
- Do not persist without `client_event_id` strategy if offline replay is planned (generate UUID in client at queue time).
