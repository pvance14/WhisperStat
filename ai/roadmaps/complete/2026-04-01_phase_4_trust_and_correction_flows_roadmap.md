# 2026-04-01 Phase 4 Roadmap: Trust And Correction Flows

## Purpose

This roadmap maps the implementation planning milestones for the trust and correction phase. It keeps the team focused on the minimum behavior needed for coaches to trust the MVP during live use.

This document is a local planning artifact in `ai/roadmaps`. If grader-facing roadmap evidence is needed later, the relevant milestones should also be reflected in tracked documentation.

We need to avoid over-engineering, cruft, and legacy-compatibility features in this clean code project. Correction behavior should stay simple, visible, and fast.

## Current Status

- Planning status: Ready for implementation planning.
- Implementation status: Complete on 2026-04-02.
- Scope status: Focused on confirmation, undo, correction, and event-log editing behavior within MVP boundaries.

## Document Status

- [x] Phase sub-plan drafted.
- [x] Companion roadmap drafted.
- [x] Alignment checked against the main high-level plan docs and `aiDocs/context.md`.
- [x] Ready to archive in `ai/roadmaps/complete` as a finished planning pair.

## Milestones

- [x] **Confirm / reject** UI wired to **insert** or discard proposed events.
- [x] **Undo last** + **event log** edits using soft-delete / reclassify patterns per `architecture.md`.
- [x] **Verbal correction** path for **the last confirmed event only** (follow-up utterance); **older events** corrected only via **event log** UI.
- [x] **Idempotent writes** verified (`client_event_id` or upsert strategy).
- [x] Low-confidence / parse-failure messaging reviewed for live-use clarity.
- [x] Spot-check aggregates after corrections match expected counts (prep for Phase 5).

## Readiness Checks

- [x] The phase directly supports the trust requirements in `aiDocs/mvp.md`.
- [x] Correction behavior stays clear enough for live match use.
- [x] The workflow preserves auditability without growing into heavy admin tooling.
- [x] The resulting behavior improves coach confidence in the product’s numbers.

## 2026-04-02 Progress Notes

- Added explicit confirm/reject actions on the review queue so parsed proposals only become durable rows after a visible coach action.
- Added idempotent `stat_events` confirmation using a stable `client_event_id` per review card and duplicate-safe insert handling.
- Added soft-delete undo, event-log edit controls, and last-confirmed-event correction limited to the most recent active event.
- Validation run confirmed the trust flow works end-to-end: confirm, undo, last-event correction, event-log edit, and aggregate updates all behaved clearly and correctly in live use.

## Completion Signal

This phase is ready to close when the product has clear confirmation and correction behavior that supports realistic live use without overcomplicating the core workflow.
