# 2026-04-01 Phase 7 Roadmap: Verification, Demo Hardening, And Final Evidence

## Purpose

This roadmap maps the implementation planning milestones for the final verification phase. It keeps the team focused on proving the MVP, reducing demo risk, and producing the evidence expected by the class-final process.

This document is a local planning artifact in `ai/roadmaps`. If grader-facing roadmap evidence is needed later, the relevant milestones should also be reflected in tracked documentation.

We need to avoid over-engineering, cruft, and legacy-compatibility features in this clean code project. This roadmap should focus on proof, reliability, and evidence instead of feature growth.

## Current Status

- Planning status: Ready for implementation planning.
- Implementation status: Not started.
- Scope status: Focused on validation, verification, demo hardening, and final evidence.

## Document Status

- [x] Phase sub-plan drafted.
- [x] Companion roadmap drafted.
- [x] Alignment checked against the main high-level plan docs and `aiDocs/context.md`.
- [x] Ready to archive in `ai/roadmaps/complete` as a finished planning pair.

## Milestones

- [ ] Run and document **E2E verification** (scripted or manual checklist) for full MVP loop.
- [ ] Execute **demo hardening**: fallback path, preflight, seeded backup scenario.
- [ ] Complete **validation/falsification packet** with actual outcomes (not placeholders).
- [ ] Produce **grader traceability**: alignment doc requirements → files under **`aiDocs/evidence/`** (or linked PRs).
- [ ] **RLS / security** spot-check and quick performance notes on capture path.
- [ ] Freeze scope: late changes only for demo blockers or evidence gaps.

## Readiness Checks

- [ ] The roadmap supports the final-project expectations in `aiDocs/final_project_alignment.md`.
- [ ] Validation and falsification are captured as executed outcomes, not just planned steps.
- [ ] Demo hardening is prioritized over late-stage feature additions.
- [ ] The project can be traced clearly from PRD through implementation and verification.

## Completion Signal

This phase is ready to close when the MVP has a dependable demo path, documented verification outcomes, and enough process evidence to support the final-project story.
