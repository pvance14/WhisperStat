# 2026-04-04 Roadmap: Multi-Event Rally Parsing V1

## Purpose

This roadmap defines a narrow first version of **multi-event rally parsing** so one captured rally recap can produce an **ordered batch of supported stat proposals** instead of only one event. The goal is to make the live workflow feel meaningfully faster and more differentiated without weakening the existing confirm-before-write trust model.

This document is a local planning artifact in `ai/roadmaps`. Product canon remains [`aiDocs/context.md`](../../aiDocs/context.md) → PRD, MVP, and [`aiDocs/architecture.md`](../../aiDocs/architecture.md).

We need to avoid over-engineering, cruft, and legacy-compatibility features in this clean code project. This slice should prove a realistic multi-event workflow for short rally summaries, not attempt full autonomous volleyball understanding.

## Alignment

- Supports the product direction of a faster, more coach-friendly stat capture workflow while preserving explicit review and confirmation.
- Builds directly on the current deterministic parser and review queue instead of replacing them with an opaque all-LLM pipeline.
- Creates a sharper differentiation story for the class demo and future product pitch: **one rally summary in, multiple structured stat suggestions out**.

## Current Status

- Planning status: Ready for implementation planning.
- Implementation status: Core v1 parser, grouped review UX, and confirm flow implemented; manual live verification still pending.
- Scope status: Narrow v1 focused on short, linear rally summaries and existing supported stat types.

## Document Status

- [x] Sub-plan drafted: [`2026-04-04_multi_event_rally_parsing_v1_sub_plan.md`](./2026-04-04_multi_event_rally_parsing_v1_sub_plan.md).
- [x] Companion roadmap drafted (this file).
- [x] Checked against current parser, dashboard review flow, and `aiDocs/context.md`.

## Milestones

- [x] **Parser shape**: introduce a batch-capable parse result that can represent multiple ordered proposals from one transcript while preserving the current single-event path.
- [x] **Deterministic segmentation**: split short rally narration into candidate clauses and parse each clause against the roster and supported stat vocabulary.
- [x] **Batch review UX**: update the review queue so one captured transcript can render a grouped, ordered set of proposals with fast confirm/discard actions.
- [x] **Schema discipline**: keep v1 limited to stat types already supported by [`StatEventType`](../../src/lib/database.types.ts); unsupported rally actions remain context only.
- [ ] **Observability and verification**: log batch parse outcomes and manually verify short-rally examples, partial failures, and confirm behavior.

## Readiness Checks

- [x] The plan keeps the explicit human-confirm step before any write.
- [x] The plan does not require a schema expansion for positive passing/reception in v1.
- [x] The plan preserves backward compatibility for single-event captures so demo reliability does not regress.
- [x] The plan favors deterministic parsing first and leaves broader language understanding as a later extension.

## Completion Signal

This roadmap is complete when a coach can speak or type a short rally recap such as “Sally dig, Kelly set, Mary kill,” see one grouped review item with those ordered supported proposals, and confirm them without the app silently inventing or committing unsupported events.
