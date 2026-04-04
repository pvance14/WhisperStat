# 2026-04-04 Roadmap: LLM Narrow Fallback Behind Deterministic Parser

## Purpose

Ship **Anthropic-backed parsing only when** [`parseMatchTranscript`](../../src/lib/matchParser.ts) leaves an **eligible clarification or unresolved rally clause**, via a **Supabase Edge Function** (key never in the client). Successful LLM output becomes a normal review proposal so the existing confirm/reject trust model stays unchanged.

This document is a local planning artifact in `ai/roadmaps`. Product canon remains [`aiDocs/context.md`](../../aiDocs/context.md) → PRD, MVP, and [`aiDocs/architecture.md`](../../aiDocs/architecture.md).

We need to **avoid over-engineering, cruft, and legacy-compatibility features** in this clean code project. This slice is **fallback-only**, rules-first, one human confirm before any write — not LLM on every utterance.

## Alignment ([`aiDocs/context.md`](../../aiDocs/context.md))

- Supports a **narrow, reliable** path for the class/demo story: better natural language coverage without weakening trust (confirmation UI unchanged).
- Stays consistent with locked boundaries in [`aiDocs/evidence/phase_2_voice_pipeline_boundaries.md`](../../aiDocs/evidence/phase_2_voice_pipeline_boundaries.md) (Edge proxy, no silent commit, defer full-LLM-on-every-tap).

## Current Status

- Planning status: Ready for implementation.
- Implementation status: Complete. Hosted Edge deployment, fail-closed auth checks, authenticated proposal recovery, and the multi-event clause-level integration are verified in [`aiDocs/evidence/phase_6_multi_event_llm_hardening_verification.md`](../../aiDocs/evidence/phase_6_multi_event_llm_hardening_verification.md).

## Document Status

- [x] Sub-plan drafted: [`2026-04-04_llm_narrow_fallback_behind_deterministic_parser_sub_plan.md`](./2026-04-04_llm_narrow_fallback_behind_deterministic_parser_sub_plan.md).
- [x] Companion roadmap drafted (this file).
- [x] Checked against `aiDocs/context.md` for placement and scope discipline.

## Milestones

- [x] **Edge Function** `parse-stat-llm`: JWT + RLS-backed load of game and players; Anthropic Messages API via `fetch`; strict JSON validation against roster UUIDs and `StatEventType`.
- [x] **Client module** [`src/lib/parseStatLlm.ts`](../../src/lib/parseStatLlm.ts) + feature flag (`VITE_LLM_PARSE_ENABLED`); invoke only for allowlisted clarification reasons in v1 (`missing_event_type`, `missing_player`) and bounded transcripts.
- [x] **Dashboard**: extend `ReviewItem` + [`handleCapturedTranscript`](../../src/features/dashboard/GameDashboardPage.tsx) — loading/error on clarification rows plus eligible skipped rally clauses, upgrade successful results into normal review proposals, preserve captured `setNumber` + `createdAt`, and ignore late LLM results after rejection; `matchedPlayerBy` includes `llm` for transparency.
- [x] **Secrets & docs**: `ANTHROPIC_API_KEY` in Edge env (remote + local CLI); document env vars without committing secrets.
- [x] **Observability & manual test**: `appLog` for LLM parse lifecycle; verify deterministic path stays first, eligible skipped rally clauses can recover through the normal review flow, hosted unauthorized access fails closed, and authenticated hosted parsing returns a real proposal. Evidence is recorded in [`aiDocs/evidence/phase_6_multi_event_llm_hardening_verification.md`](../../aiDocs/evidence/phase_6_multi_event_llm_hardening_verification.md).

## Completion Signal

This roadmap is done when coaches can optionally enable LLM assist after a failed rule parse or an eligible unresolved rally clause, see the same review surface for proposals, and nothing writes to Postgres without an explicit Confirm — with captured timing/set data preserved on the review item, late rejected results ignored, and keys plus roster validation enforced server-side.
