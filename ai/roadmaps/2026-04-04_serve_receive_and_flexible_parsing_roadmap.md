# 2026-04-04 Roadmap: Serve Receive + Flexible Parsing

## Purpose

Add **serve receive** as a first-class supported stat event and broaden the live parser so more natural rally recaps can be captured without forcing coaches into overly rigid phrasing. The goal is to improve real-world volleyball fit while keeping the same trust posture: deterministic parsing first, narrow AI fallback second, and explicit confirm before any write.

This document is a local planning artifact in `ai/roadmaps`. Product canon remains [`aiDocs/context.md`](../../aiDocs/context.md) → PRD, MVP, and [`aiDocs/architecture.md`](../../aiDocs/architecture.md).

We need to avoid over-engineering, cruft, and legacy-compatibility features in this clean code project. This slice should improve the current volleyball workflow directly, not turn the parser into a broad free-form narrative engine.

## Alignment

- Supports the MVP need for natural language statting that feels usable in a live gym instead of only working for short command-like phrases.
- Fixes a current product mismatch where positive serve receive language is common in volleyball recaps but cannot be represented in the schema.
- Builds on the just-completed multi-event + clause-level AI hardening rather than bypassing it.

## Current Status

- Planning status: Ready for implementation planning.
- Implementation status: Not started.
- Scope status: Schema addition plus focused parsing flexibility for volleyball-specific live recaps.

## Document Status

- [x] Sub-plan drafted: [`2026-04-04_serve_receive_and_flexible_parsing_sub_plan.md`](./2026-04-04_serve_receive_and_flexible_parsing_sub_plan.md).
- [x] Companion roadmap drafted (this file).
- [x] Checked against current parser/data-layer constraints and `aiDocs/context.md`.

## Milestones

- [ ] **Schema support**: add `serve_receive` to the stat-event enum/type flow so the DB, typed client, stats aggregation, and UI all recognize it as a normal confirmed event.
- [ ] **Live stats/report support**: surface serve receive anywhere core stat totals, player rows, summaries, and post-game generation depend on the stat-event vocabulary.
- [ ] **Deterministic parser expansion**: support more volleyball-natural aliases and relation patterns around passing/serve receive, setting language, and longer spoken sentence structure.
- [ ] **Multi-event integration**: allow mixed rally recaps like “Chuck serve receive, passed to Shane, Shane set, Cosmo kill” to produce one grouped review item with supported rows plus skipped context where appropriate.
- [ ] **Clause-level AI compatibility**: preserve the current rule that AI only assists unresolved eligible clauses, now against the expanded vocabulary and broader clause shapes.
- [ ] **Verification**: record parser examples, serve receive persistence/report checks, and mixed deterministic/AI recovery notes in an evidence doc before archiving.

## Readiness Checks

- [ ] Serve receive is treated as a normal supported stat event end to end, not as metadata or notes.
- [ ] Existing confirmed-event trust flows remain unchanged.
- [ ] The parser broadens for volleyball-natural phrasing without turning every long sentence into an AI-first path.
- [ ] Mixed rally recaps still stay grouped in one review card.

## Completion Signal

This roadmap is complete when a coach can capture phrases like “Chuck serve receive, Shane set, Cosmo kill” or longer natural variants such as “Chuck got the serve receive, passed it to Shane, Shane set Cosmo for the kill,” see the supported rows represented correctly in one review flow, and confirm them without the app silently guessing beyond the supported schema.
