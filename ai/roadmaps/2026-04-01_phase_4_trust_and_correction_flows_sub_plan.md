# 2026-04-01 Phase 4 Sub-Plan: Trust And Correction Flows

## Summary

This sub-plan expands Phase 4 of the main MVP implementation plan into the trust and correction slice. Its purpose is to define the minimum confirmation, undo, and editing behavior required for coaches to trust the product during live use.

This document is a local planning artifact in `ai/roadmaps`. If grader-facing or shared evidence is needed later, the important outcomes should also be reflected in tracked docs.

We need to avoid over-engineering, cruft, and legacy-compatibility features in this clean code project. This phase should improve trust through simple, visible flows rather than complex recovery systems.

## Phase Intent

- Turn a functional capture loop into a trustworthy match workflow.
- Make correction paths visible, fast, and low-friction.
- Preserve auditability without bloating the core interaction model.

## In Scope

- Confirmation behavior before events become durable match records.
- Undo, correction, and event-log editing flows inside MVP scope.
- Low-confidence or mistake-handling expectations needed to keep the workflow trustworthy.

## Out Of Scope

- **Voice** targeting **non-last** events for correction (use event log UI only).
- Heavy review systems beyond MVP needs.
- Broad admin tooling for event management.
- Complex moderation or approval layers.

## Planned Outcomes

- A clear trust model for event capture and correction.
- Fast paths for fixing mistakes without breaking live match use.
- Event history behavior that supports coach confidence and later review.
- A cleaner bridge from capture to live use and post-game review.

## Implementation Approach

- Keep confirmation explicit so the app never feels like it silently committed an uncertain event.
- Prefer the shortest correction path that preserves clarity and trust.
- Use event-log editing as a controlled fallback for mistakes that are not handled in the immediate flow.
- Keep the UX understandable under match pressure rather than optimizing for rare edge cases.

## Dependencies And Decisions

- Phase 3 must already provide a stable capture loop to attach trust behavior to.
- Trust behavior is an MVP requirement, not a later enhancement.
- Any correction mechanism that adds confusion or slows live use too much should be cut back.

## Verification And Evidence

- Confirm the phase aligns with the MVP trust requirements around confirmation, undo, and edits.
- Confirm the correction model supports realistic match recovery behavior without excess complexity.
- Confirm the resulting workflow stays compatible with live stats and post-game summary needs.

## Assumptions

- The primary trust problem is clarity and recoverability, not lack of feature depth.
- Immediate visible correction paths matter more than sophisticated exception handling.
- This phase is complete when the system has believable, low-friction ways to handle mistakes during and after live capture.

## Concrete deliverables

- **Confirmation card:** accept / reject proposed event; show human-readable label (“Kill — #12 Name ✓”).
- **Insert on confirm:** write to `stat_events` with `created_by`, `set_number`, timestamps; attach **`client_event_id`** for idempotent retries.
- **Undo last:** prefer `deleted_at` soft delete or equivalent reversible flag per `architecture.md` §7 design notes—**no hard delete** of committed events for trust/audit.
- **Event log screen:** list recent events for the game (filter by set); actions: **soft-delete (undo)**, **reclassify event_type**, **reassign player** if feasible without scope creep.
- **Verbal correction (locked):** **Voice may only correct the most recently confirmed event** (e.g. “actually that was an attack error” as a follow-up parse that **replaces or adjusts** that row per product choice—still confirm if ambiguous). **Any older event** uses **event log** (tap: reclassify / soft-delete / reassign)—**no voice target** for non-last rows in MVP.
- **Low-confidence:** if using LLM fallback, surface “double-check” styling or explicit confirm (stretch: numeric confidence).

## Acceptance criteria

- Every stat on the live board traces to a user-confirmed action (or a deliberate log edit with visible outcome).
- Coach can recover from wrong stat **during** a set without leaving the game flow.
- Reclassify / delete flows keep aggregates correct (`deleted_at` filtered in queries).

## Technical anchors

- RLS still enforces coach scope on updates/deletes.
- Dashboard queries always `WHERE deleted_at IS NULL` unless showing an “audit” mode (optional).
