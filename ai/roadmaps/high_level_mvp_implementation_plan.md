# 2026-04-01 High-Level MVP Implementation Plan

## Summary

This roadmap maps the full WhisperStat MVP into a small number of implementation phases so later planning docs can go deeper without redefining the overall path. It is based on the current product and technical source-of-truth docs: `aiDocs/prd.md`, `aiDocs/mvp.md`, `aiDocs/architecture.md`, `aiDocs/final_project_alignment.md`, and `aiDocs/context.md` (current focus: class-final demo, executed validation, phased scaffold).

This document lives in **`ai/roadmaps/`**, which is **tracked** in this repo (see root `.gitignore`). Put rubric-ready validation write-ups in **`aiDocs/evidence/`** alongside `aiDocs/` product canon.

This project should stay intentionally clean and focused. We need to avoid over-engineering, cruft, and legacy-compatibility features, and instead prefer the smallest clean implementation that delivers the MVP and supports a dependable class-final demo.

## Planning Principles

- Build the smallest reliable implementation first.
- Prefer direct, simple systems before adding abstraction.
- Defer optional sophistication until validation proves it is needed.
- Do not add legacy-compatibility features in this clean-code reset project.
- Treat this as a compressed final-project execution loop: research, planning, implementation, verification, and evidence.
- Keep scope anchored to the MVP: volleyball-only PWA, roster setup, push-to-talk voice capture, structured stat events, confirmation and correction flows, live per-set stats, **in-app visual stats report** (current game), persisted game data, and a post-game summary.

## Locked MVP decisions (implementation defaults)

Canonical detail: `aiDocs/evidence/mvp_implementation_decisions.md`. Summary:

| Area | Decision |
|------|----------|
| Auth | Magic link (Supabase) |
| Frontend host | Vercel |
| DB changes | SQL migrations in repo |
| Score | **Manual** controls = source of truth; voice/LLM auto-score **not** in MVP unless added later as **confirmable** proposals only |
| Prior game (summary) | Most recent **other** completed game for same `team_id` (`game_date`, then `created_at`) |
| Voice correction | **Last event only**; older rows via **event log** UI |
| Transcripts | Not persisted long-term in DB for MVP |
| Teams | Multiple **teams per coach** when schema allows |
| Evidence | **Primary** validation/falsification packets in **`aiDocs/evidence/`**; roadmaps and changelog in tracked **`ai/`** |
| Visual reporting | **In-app** full stats view for current match (tables/simple charts OK); **not** required PDF export |

## Non-Goals For This Roadmap

This roadmap does not plan for native mobile apps, multi-sport support, multi-user collaboration, **PDF or file exports** (stretch per `mvp.md`), video sync, scouting workflows, fan-facing views, or other V1+ expansion ideas. Those can be reconsidered only after the MVP is implemented, verified, and demonstrated reliably.

**Clarification:** An **on-screen visual stats report** for the current game **is in scope** for the MVP; it is not the same as export/share/PDF.

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
- Base PWA application structure and core environment setup; **deploy path on Vercel** aligned with locked decisions.
- **Supabase Auth** with **magic link**; data model supports **multiple teams per coach** (`teams` owned by same user).
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
- Undo, correction, and event-log editing flows that preserve trust; **voice correction scoped to the last event**; older events corrected via **event log** UI.
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
- Live per-player and per-set stat views plus an **in-app visual stats report** for the **current** game (dedicated screen or full-width view; tables and simple visuals—read-only or live-updating).
- Match and set context management for the active game, including current-set and **manual** per-set score (see locked decisions).
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
- The summary should remain grounded in the available MVP data; **prior-match comparison** uses the **most recent other completed game** for the same team (per `aiDocs/evidence/mvp_implementation_decisions.md`), not arbitrary history.
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
- Final-project evidence showing the document-driven process from scope to implementation to verification, with artifacts in **`aiDocs/evidence/`** for grader visibility.

**Dependencies / gating decisions:**
- The team should prioritize a dependable demo path over extra features.
- Verification must reflect executed testing and evidence, not only intended behavior.

**Later detailed plans should expand:**
- Test and verification passes for each critical workflow.
- Validation results, research outcomes, and what changed because of them.
- Demo checklist, fallback strategy, and final evidence packaging.

## Build-depth checklist (minimum to ship MVP)

The phase sub-plans expand “what”; this checklist ties phases to **concrete product facts** from `aiDocs/mvp.md` and `aiDocs/architecture.md` so implementation is not under-specified:

1. **Data:** Postgres tables at least `teams`, `players`, `games`, `stat_events` (and `game_summaries` when post-game lands), with RLS scoped to coach-owned teams; `stat_events.event_type` limited to MVP set: kill, ace, serve_error, reception_error, block, dig, attack_error, set (assist); soft delete via `deleted_at`; `client_event_id` for offline/idempotent replay when the outbox exists.
2. **Voice path:** Default ASR = Web Speech API; parse path = roster-aware rules/heuristics first, **LLM only when needed**; provider keys only via Edge Function (or equivalent server proxy), not baked in the client for production.
3. **Trust:** Every persisted event passed explicit confirmation in UI; undo and log edit/reclassify; **verbal correction applies to the last event only** (older events via event log).
4. **Live game:** Dashboard aggregates per player and per set; **manual set-by-set score** and **current set**; **in-app visual stats report** for the current game (no PDF required); smallest score persistence model documented in migrations.
5. **Post-game:** Narrative from aggregates; when the team has **prior completed games**, include comparison themes where data allows (template-first per architecture cost posture; optional single batched LLM).
6. **Evidence (`context.md` / `final_project_alignment.md`):** Logging and CLI/smoke hooks suitable for class rubric; PRD §10-style tests **run and recorded** (hypothesis, falsifier, method, result, decision), not only planned.

Sub-plans under this folder flesh out deliverables and acceptance criteria per phase; they should stay aligned with the list above.

## How To Use This Roadmap

Each later plan doc should drill into one phase or one tightly related slice of work, while preserving the sequencing and scope boundaries defined here. If a future plan introduces major new product scope, extra abstraction, or legacy-oriented compatibility work, it should be treated as out of bounds unless the MVP itself changes.
