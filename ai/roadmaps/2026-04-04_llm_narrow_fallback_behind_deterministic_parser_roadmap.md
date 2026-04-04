# 2026-04-04 Roadmap: LLM Narrow Fallback Behind Deterministic Parser

## Purpose

Ship **Anthropic-backed parsing only when** [`parseMatchTranscript`](../../src/lib/matchParser.ts) returns a **clarification**, via a **Supabase Edge Function** (key never in the client). Successful LLM output becomes a normal **`kind: "proposal"`** in the existing review queue so **Confirm / Reject** and [`confirmStatEvent`](../../src/lib/data.ts) stay unchanged.

This document is a local planning artifact in `ai/roadmaps`. Product canon remains [`aiDocs/context.md`](../../aiDocs/context.md) → PRD, MVP, and [`aiDocs/architecture.md`](../../aiDocs/architecture.md).

We need to **avoid over-engineering, cruft, and legacy-compatibility features** in this clean code project. This slice is **fallback-only**, rules-first, one human confirm before any write — not LLM on every utterance.

## Alignment ([`aiDocs/context.md`](../../aiDocs/context.md))

- Supports a **narrow, reliable** path for the class/demo story: better natural language coverage without weakening trust (confirmation UI unchanged).
- Stays consistent with locked boundaries in [`aiDocs/evidence/phase_2_voice_pipeline_boundaries.md`](../../aiDocs/evidence/phase_2_voice_pipeline_boundaries.md) (Edge proxy, no silent commit, defer full-LLM-on-every-tap).

## Current Status

- Planning status: Ready for implementation.
- Implementation status: Not started.

## Document Status

- [x] Sub-plan drafted: [`2026-04-04_llm_narrow_fallback_behind_deterministic_parser_sub_plan.md`](./2026-04-04_llm_narrow_fallback_behind_deterministic_parser_sub_plan.md).
- [x] Companion roadmap drafted (this file).
- [x] Checked against `aiDocs/context.md` for placement and scope discipline.

## Milestones

- [ ] **Edge Function** `parse-stat-llm`: JWT + RLS-backed load of game and players; Anthropic Messages API via `fetch`; strict JSON validation against roster UUIDs and `StatEventType`.
- [ ] **Client module** [`src/lib/parseStatLlm.ts`](../../src/lib/parseStatLlm.ts) + feature flag (`VITE_LLM_PARSE_ENABLED`); invoke only for allowlisted clarification reasons in v1 (`missing_event_type`, `missing_player`) and bounded transcripts.
- [ ] **Dashboard**: extend `ReviewItem` + [`handleCapturedTranscript`](../../src/features/dashboard/GameDashboardPage.tsx) — loading/error on clarification row, upgrade to proposal on success, preserve captured `setNumber` + `createdAt`, and ignore late LLM results after rejection; `matchedPlayerBy` includes `llm` (or equivalent) for transparency.
- [ ] **Secrets & docs**: `ANTHROPIC_API_KEY` in Edge env (remote + local CLI); document env vars without committing secrets.
- [ ] **Observability & manual test**: `appLog` for LLM parse lifecycle; verify deterministic path never calls LLM; slang/clarification path → proposal → Confirm persists row; unauthorized or cross-team access fails closed.

## Completion Signal

This roadmap is done when coaches can optionally enable LLM assist after a failed rule parse, see the same confirm card for proposals, and nothing writes to Postgres without an explicit Confirm — with captured timing/set data preserved on the review item, late rejected results ignored, and keys plus roster validation enforced server-side.
