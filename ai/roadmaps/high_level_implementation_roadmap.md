# 2026-04-01 High-Level Implementation Roadmap

## Purpose

This roadmap maps the major implementation phases for the WhisperStat MVP at a high level so the team can sequence work without over-specifying it too early. It should be read alongside `aiDocs/prd.md`, `aiDocs/mvp.md`, `aiDocs/architecture.md`, `aiDocs/final_project_alignment.md`, and the companion plan doc in `ai/roadmaps/2026-04-01_high_level_mvp_implementation_plan.md`.

This document lives in `ai/roadmaps` as a local planning artifact. If grader-facing roadmap evidence is needed later, the relevant milestones should also be reflected in tracked documentation.

This is a clean-code MVP project. We should avoid over-engineering, cruft, and legacy-compatibility features, and focus on the smallest reliable implementation that supports a strong class-final demo and a real validation loop.

## Roadmap Principles

- Move in phases, not parallel feature sprawl.
- Finish the core product loop before adding polish-heavy or future-looking scope.
- Prefer simple, direct implementation paths that are easy to verify.
- Include validation, verification, and evidence capture as part of implementation, not as separate future work.
- Keep the roadmap centered on the MVP only.
- Treat non-goals as out of scope unless the MVP definition changes.

## Scope Guardrails

This roadmap covers the MVP only: volleyball-only PWA setup, roster and match setup, push-to-talk voice capture, structured stat events, confirmation and correction flows, live per-set stats, persisted game data, post-game summary generation, and final verification.

This roadmap does not include native apps, multi-sport expansion, multi-user collaboration, advanced exports, scouting workflows, video features, or other V1+ capabilities.

## Phase 1: Align The Build

**Focus:** Lock the build around the narrow MVP and class-final success criteria.

**Phase outcomes:**
- Shared agreement on what the MVP includes and excludes.
- A stable implementation sequence for the remaining phases.
- Clear definitions of what must be demoable and verifiable by the end.
- Explicit framing that this is a post-midterm reset project being evaluated on disciplined process and a reliable class-final demo.

**Exit condition:** The team is aligned on a narrow scope and does not plan around future-product expansion during MVP implementation.

## Phase 2: Establish The Foundation

**Focus:** Set up the minimum application and technical foundation needed for the MVP workflow.

**Phase outcomes:**
- Working base application structure for the PWA.
- Core setup for roster, match context, and persistence-ready flows.
- Initial technical path for voice handling, parsing, stored game data, structured logging, CLI-checkable workflows, and safe demo fallback behavior.

**Exit condition:** The project has a clean baseline that can support end-to-end MVP slices without rework-heavy setup changes.

## Phase 3: Build The Core Capture Loop

**Focus:** Implement the primary user value: speaking a volleyball event and turning it into a structured match record.

**Phase outcomes:**
- Match setup and roster-aware voice capture for the MVP stat set.
- A usable path from push-to-talk input to structured event handling.
- A core capture experience that can be exercised repeatedly during development.

**Exit condition:** The product can capture and process core stat events through the main game workflow.

## Phase 4: Make The Workflow Trustworthy

**Focus:** Add the confirmation, undo, and correction behavior that makes the capture loop usable in real match conditions.

**Phase outcomes:**
- Clear confirmation before an event becomes part of the record.
- Simple correction and undo flows.
- Event-level trust safeguards that reduce coach risk and confusion.

**Exit condition:** The core workflow is no longer just functional; it is reliable enough to correct mistakes without breaking the live-use experience.

## Phase 5: Turn Events Into Live Match Value

**Focus:** Present captured data in a way that supports active game use and a clear demo story.

**Phase outcomes:**
- Live per-player and per-set stat views.
- Basic match and set management tied to stored events, including current-set and score-state support needed for the MVP experience.
- A coherent active-game experience instead of isolated event capture.

**Exit condition:** A coach can move from setup to live capture to live stats in one connected workflow.

## Phase 6: Complete The Post-Game Loop

**Focus:** Use stored match data to generate the MVP’s post-game takeaway and tighten the end-to-end product experience.

**Phase outcomes:**
- Post-game summary output from match data.
- Cleaner end-of-match flow across capture, review, and summary.
- Focused polish on the MVP path rather than broader feature growth.

**Exit condition:** The full MVP loop works from pre-game setup through post-game output.

## Phase 7: Verify, Harden, And Package

**Focus:** Prepare the MVP for dependable demonstration and final-project evidence.

**Phase outcomes:**
- End-to-end verification of the MVP workflow.
- Demo hardening and fallback readiness.
- Executed validation and falsification evidence tied to the project claims.
- Final evidence showing the project moved from docs to implementation to verification in a disciplined way.

**Exit condition:** The team has a stable demo path and enough implementation evidence to support the class-final narrative.

## How To Use This Roadmap

Use this document to keep implementation sequencing consistent as more focused planning docs are added. Later roadmap and plan docs should deepen one phase at a time, but they should not add major new scope, extra abstraction, or legacy-oriented compatibility work unless the MVP itself is intentionally redefined.
