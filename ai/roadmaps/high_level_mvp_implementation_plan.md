# 2026-04-01 High-Level MVP Implementation Plan

## Summary

This roadmap maps the full WhisperStat MVP into a small number of implementation phases so later planning docs can go deeper without redefining the overall path. It is based on the current product and technical source-of-truth docs: `aiDocs/prd.md`, `aiDocs/mvp.md`, `aiDocs/architecture.md`, and `aiDocs/final_project_alignment.md`.

This document is a local planning artifact in `ai/roadmaps`. If grader-facing or shared process evidence is needed later, the relevant outcomes should also be reflected in tracked docs that align with the repo's canonical documentation pattern.

This project should stay intentionally clean and focused. We need to avoid over-engineering, cruft, and legacy-compatibility features, and instead prefer the smallest clean implementation that delivers the MVP and supports a dependable class-final demo.

## Planning Principles

- Build the smallest reliable implementation first.
- Prefer direct, simple systems before adding abstraction.
- Defer optional sophistication until validation proves it is needed.
- Do not add legacy-compatibility features in this clean-code reset project.
- Treat this as a compressed final-project execution loop: research, planning, implementation, verification, and evidence.
- Keep scope anchored to the MVP: volleyball-only PWA, roster setup, push-to-talk voice capture, structured stat events, confirmation and correction flows, live per-set stats, persisted game data, and a post-game summary.

## Non-Goals For This Roadmap

This roadmap does not plan for native mobile apps, multi-sport support, multi-user collaboration, advanced exports, video sync, scouting workflows, fan-facing views, or other V1+ expansion ideas. Those can be reconsidered only after the MVP is implemented, verified, and demonstrated reliably.

## Phase 1: Project Alignment And Success Criteria

**Goal:** Lock the MVP framing, phase boundaries, and class-final definition of success before implementation accelerates.

**Major outcomes:**
- Shared understanding of the product scope, final-project framing, and demo priorities.
- Clear framing that this is a post-midterm reset project being evaluated on disciplined process and reliable execution.
- Clear success criteria for the MVP build, validation loop, and live demo.
- A roadmap structure that later detailed plan docs can expand phase by phase.

**Dependencies / gating decisions:**
- Confirm that the repo will optimize for a narrow, reliable class-final MVP rather than the broader long-term product vision.
- Keep the scope aligned with the existing PRD, MVP, architecture, and final-project alignment docs.

**Later detailed plans should expand:**
- Phase-specific deliverables and acceptance criteria.
- How validation, falsification, and customer evidence will be captured as work progresses.
- Verification evidence expectations for each milestone.

## Phase 2: Product And Technical Foundation

**Goal:** Establish the minimum app foundation needed to support a clean implementation of the MVP workflow.

**Major outcomes:**
- Base PWA application structure and core environment setup.
- Initial product flows for roster, match context, and persisted data foundations.
- A technical direction for voice input, parsing, persistence, structured logging, CLI-checkable workflows, and safe demo fallback behavior that fits the architecture and class process expectations.

**Dependencies / gating decisions:**
- Keep architectural choices simple and easy to verify.
- Avoid adding infrastructure or abstractions that are not required for the MVP path.

**Later detailed plans should expand:**
- The first implementation slice for app setup and data flow.
- Logging, testing, and fallback expectations needed before implementation gets deep.
- Any decisions around safe fallback behavior needed for the demo path.

## Phase 3: Core Match Workflow

**Goal:** Build the main in-game stat capture loop that defines the value of the product.

**Major outcomes:**
- Roster-aware match setup for one team and one game flow.
- Push-to-talk voice capture that produces structured stat events for the MVP stat set.
- A clear reviewable path from spoken input to confirmed event capture.

**Dependencies / gating decisions:**
- The voice workflow must prioritize coach trust and usable latency over feature breadth.
- Parsing should stay focused on the MVP event vocabulary and common utterance patterns.

**Later detailed plans should expand:**
- Match setup flow and event capture behavior.
- Boundaries between deterministic handling, ambiguity handling, and user confirmation.

## Phase 4: Trust And Correction Flows

**Goal:** Make stat capture dependable enough that a coach can trust the system during and after a match.

**Major outcomes:**
- Confirmation behavior before committed events become part of the record.
- Undo, correction, and event-log editing flows that preserve trust.
- A clear audit-friendly path for fixing mistakes without adding complexity to the core workflow.

**Dependencies / gating decisions:**
- Trust and correction are required MVP behavior, not optional polish.
- Any correction flow should remain simple enough to use quickly during live play.

**Later detailed plans should expand:**
- Event correction rules and editing UX.
- How to handle mistakes, reversals, and low-confidence situations within MVP scope.

## Phase 5: Live Stats And Game Management

**Goal:** Turn captured events into usable live match information for the coach.

**Major outcomes:**
- Live per-player and per-set stat views.
- Match and set context management for the active game, including current-set and score-state support needed for the MVP dashboard.
- Persisted event and game data that supports live viewing and post-game use.

**Dependencies / gating decisions:**
- The live dashboard should stay focused on the MVP stat views needed for match use and demo clarity.
- Game management should support the MVP loop without expanding into advanced analytics or broader operational tooling.

**Later detailed plans should expand:**
- Dashboard priorities and update behavior.
- Match-state handling needed for a dependable demo and verification flow.

## Phase 6: Post-Game Summary And Polish

**Goal:** Complete the MVP loop by turning stored match data into a useful post-game output and improving the end-to-end experience.

**Major outcomes:**
- Post-game summary generation based on stored event data.
- A cleaner end-of-match flow that connects capture, review, and summary output.
- Focused polish on the parts of the experience that most affect comprehension, trust, and demo quality.

**Dependencies / gating decisions:**
- The summary should remain grounded in the available MVP data rather than expanding into advanced historical or comparative features unless already supported.
- Polish should improve reliability and clarity, not introduce new surface area.

**Later detailed plans should expand:**
- Summary generation behavior and presentation.
- Final UX refinements needed for the MVP narrative and demo path.

## Phase 7: Verification, Demo Hardening, And Final Evidence

**Goal:** Make the MVP stable, demonstrable, and well-supported by process evidence for the class final.

**Major outcomes:**
- Verification of the end-to-end MVP workflow against the project’s success criteria.
- Demo hardening, fallback planning, and reduction of obvious reliability risks.
- Executed validation and falsification evidence tied to the product claims in the PRD and context docs.
- Final-project evidence showing the document-driven process from scope to implementation to verification.

**Dependencies / gating decisions:**
- The team should prioritize a dependable demo path over extra features.
- Verification must reflect executed testing and evidence, not only intended behavior.

**Later detailed plans should expand:**
- Test and verification passes for each critical workflow.
- Validation results, research outcomes, and what changed because of them.
- Demo checklist, fallback strategy, and final evidence packaging.

## How To Use This Roadmap

Each later plan doc should drill into one phase or one tightly related slice of work, while preserving the sequencing and scope boundaries defined here. If a future plan introduces major new product scope, extra abstraction, or legacy-oriented compatibility work, it should be treated as out of bounds unless the MVP itself changes.
