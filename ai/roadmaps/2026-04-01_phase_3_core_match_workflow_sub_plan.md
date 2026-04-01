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
