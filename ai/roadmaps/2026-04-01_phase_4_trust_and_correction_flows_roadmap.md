# 2026-04-01 Phase 4 Roadmap: Trust And Correction Flows

## Purpose

This roadmap maps the implementation planning milestones for the trust and correction phase. It keeps the team focused on the minimum behavior needed for coaches to trust the MVP during live use.

This document is a local planning artifact in `ai/roadmaps`. If grader-facing roadmap evidence is needed later, the relevant milestones should also be reflected in tracked documentation.

We need to avoid over-engineering, cruft, and legacy-compatibility features in this clean code project. Correction behavior should stay simple, visible, and fast.

## Current Status

- Planning status: Ready for implementation planning.
- Implementation status: Not started.
- Scope status: Focused on confirmation, undo, correction, and event-log editing behavior within MVP boundaries.

## Document Status

- [x] Phase sub-plan drafted.
- [x] Companion roadmap drafted.
- [x] Alignment checked against the main high-level plan docs and `aiDocs/context.md`.
- [x] Ready to archive in `ai/roadmaps/complete` as a finished planning pair.

## Milestones

- [ ] Define confirmation behavior for reviewable event capture.
- [ ] Define the fastest viable undo path for live use.
- [ ] Define the correction and event-log editing model for MVP scope.
- [ ] Define how low-confidence or mistake handling should surface to the user.
- [ ] Confirm the trust model supports later live-stats and summary flows.

## Readiness Checks

- [ ] The phase directly supports the trust requirements in `aiDocs/mvp.md`.
- [ ] Correction behavior stays clear enough for live match use.
- [ ] The workflow preserves auditability without growing into heavy admin tooling.
- [ ] The resulting behavior improves coach confidence in the product’s numbers.

## Completion Signal

This phase is ready to close when the product has clear confirmation and correction behavior that supports realistic live use without overcomplicating the core workflow.
