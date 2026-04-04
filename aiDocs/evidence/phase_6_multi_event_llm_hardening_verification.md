# Phase 6 Multi-Event + LLM Hardening Verification

**Date:** 2026-04-04  
**Purpose:** Record the verification done for the integration hardening slice that combined multi-event rally parsing, clause-level LLM fallback, and atomic grouped confirmation.

## Repo-Local Parser Verification

The deterministic parser changes were exercised with a temporary `esbuild`-bundled harness against [`src/lib/matchParser.ts`](../../src/lib/matchParser.ts) using a disposable in-memory roster.

Verified examples:

- `"Sally dig, Kelly set, Mary kill"` returned one `proposal_batch` with three ordered supported proposals.
- `"12 dig to 4 sets to 7 kill"` returned one `proposal_batch` with three ordered supported proposals, confirming both `to`-connector segmentation and inflected verb handling (`sets`).
- `"Sally dig, pass to Kelly, Kelly sets Mary, Mary kills"` returned one `proposal_batch` with three supported proposals and one skipped `unsupported_event` clause for the positive pass context.
- `"Jordan kill, Jordan dig"` against a duplicate-name roster returned one `proposal_batch` whose two clauses were both `ambiguous_player`, confirming that zero-proposal multi-event ambiguity no longer collapses into a misleading top-level `missing_event_type`.

## Hosted Supabase Verification

The linked hosted Supabase project was verified with the repo dev-admin shortcut credentials in `.env` after applying the batch-confirm migrations.

Completed checks:

- `npx supabase db push` applied:
  - `20260404153000_phase_6_multi_event_batch_confirm_hardening.sql`
  - `20260404162000_phase_6_confirm_stat_event_batch_fix.sql`
  - `20260404163000_phase_6_confirm_stat_event_batch_parentheses_fix.sql`
- A disposable hosted validation team, roster, and game were created for this check and deleted afterward.
- `confirm_stat_event_batch` success path passed:
  - a two-row batch confirm returned two rows
  - the persisted hosted `stat_events` count for that capture id was exactly two
- `confirm_stat_event_batch` retry/idempotency path passed:
  - rerunning the same payload returned the same two rows
  - persisted hosted row count remained two, not four
- `confirm_stat_event_batch` atomic failure path passed:
  - a batch containing one valid player and one out-of-roster player returned the explicit error
    `One or more batch proposals reference a player outside this game roster.`
  - persisted hosted row count for that failed capture id was zero
- `parse-stat-llm` unauthorized path passed:
  - invoking the function without an authenticated session returned a non-2xx error
- `parse-stat-llm` authenticated hosted path passed:
  - invoking the function against the disposable validation game with transcript `"Kelly got the set"` returned a real proposal payload with `eventType: "set"` and the correct hosted roster player id

## What This Closes

This note closes the earlier evidence gap around the hardening slice by backing the roadmap/changelog claims with:

- repo-local parser verification for the new deterministic batch behaviors
- hosted confirmation that grouped batch persistence is atomic and idempotent
- hosted confirmation that the LLM function still fails closed without auth and still returns a real proposal when authenticated
