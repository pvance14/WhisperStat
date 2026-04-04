# Full Hardening Plan: Multi-Event + LLM Fallback Integration

## Summary

Implement one integration slice that makes deterministic multi-event parsing and the narrow LLM fallback work together cleanly, removes the current eligibility bug around collapsed clarifications, upgrades multi-event confirm-all to an atomic server-side path, and brings roadmap/changelog verification wording back in line with actual evidence.

This slice keeps the trust model unchanged: deterministic parsing stays first, AI only assists unresolved eligible clauses, ambiguous-player cases remain deterministic-only, and nothing is written without one explicit confirm action.

## Key Changes

### 1. Make parser output clause-aware enough for correct fallback decisions
- Extend the multi-event parse result so clause-level outcomes are preserved even when zero deterministic proposals are found.
- Stop collapsing all-zero batch failures into a generic top-level `missing_event_type`.
- Preserve the strongest real clause reason for each unresolved clause:
  - `missing_event_type`
  - `missing_player`
  - `ambiguous_player`
  - `unsupported_event`
- Add common verb-form aliases to the deterministic parser (`sets`, `kills`, `digs`, `blocks`, `aces`) so the deterministic path covers normal rally phrasing before AI is considered.
- Expand deterministic segmentation to include the planned narrow connector support for `to`, but only where it improves short rally parsing without over-splitting unrelated phrases.

### 2. Add clause-level AI fallback for multi-event captures
- Change fallback orchestration in the dashboard so AI is triggered per unresolved clause, not per whole capture, once a transcript is treated as a multi-event batch.
- Eligibility rules:
  - allowed: clause `missing_event_type`, clause `missing_player`
  - disallowed: clause `ambiguous_player`, clause `unsupported_event`
  - bounded by clause length, not just full transcript length
- Preserve one review card per capture.
- Merge deterministic and LLM-recovered proposals back into one ordered batch item.
- Show row-level provenance in the batch card:
  - deterministic rows keep current `matchedPlayerBy`
  - AI rows include `llm`
  - unresolved rows remain visible with their skip reason
- Preserve capture-level metadata (`createdAt`, `setNumber`, `clientCaptureId`) across all clause outcomes.
- Keep late-result protection: if the review item is rejected or no longer waiting on that clause, ignore the returning AI result.

### 3. Move batch confirm-all to an atomic server path
- Add one dedicated server-side batch confirm interface for grouped proposal persistence.
- The server path should accept the final ordered proposal list plus capture metadata and persist all rows in one transaction.
- If any row fails validation or insert, the whole batch fails and no partial stat rows are left behind.
- Keep per-row stable `client_event_id` generation so retries remain idempotent.
- Reuse existing trust and validation behavior as much as possible rather than creating a second business logic path.
- The dashboard should switch from looping `confirmStatEvent` calls to one batch-confirm call for `proposal_batch`.
- Single-event confirms can keep the current path unless consolidating them into the same batch endpoint is simpler and does not add extra complexity.

### 4. Tighten UI state and observability around mixed batches
- Update the review-item shape so batch rows can represent:
  - deterministic proposal
  - AI-loading
  - AI-recovered proposal
  - skipped/unresolved
- Keep one confirm button for the whole batch, but disable it while any eligible clause is still loading.
- If AI fails on one clause, leave that row unresolved and allow confirm of the remaining supported rows only if that is explicitly represented in the UI; otherwise require the user to wait until loading completes, then confirm the final supported subset shown.
- Add logging for:
  - clause count
  - deterministic proposal count
  - AI-eligible skipped clause count
  - AI-attempted clause count
  - AI-recovered clause count
  - final confirmed proposal count
  - batch confirm success/failure
- Remove the current path where a zero-proposal multi-event transcript can become AI-eligible through an incorrect top-level `missing_event_type`.

### 5. Bring docs and evidence back into sync
- Update the LLM roadmap/changelog wording so “complete” and “verified” claims match what the repo can actually support.
- Add a short evidence note under `aiDocs/evidence/` covering:
  - deterministic multi-event phrases tested
  - mixed deterministic + AI clause recovery phrases tested
  - negative-path auth/access checks for the Edge function
  - confirm-all atomic failure/success behavior
- Keep the multi-event roadmap honest about what is newly verified in this pass, and close only the items actually demonstrated.

## Public Interfaces / Types

- `ParseMatchResult` should remain backward-compatible at the top level, but `proposal_batch` must carry enough clause-level status to drive per-clause AI fallback and final rendering.
- Introduce a batch row/result type for the review queue so grouped captures can mix deterministic proposals, AI-recovered proposals, loading rows, and skipped rows without losing order.
- Add one new server-side batch confirm interface for grouped event persistence. Inputs must include:
  - `gameId`
  - ordered proposal list (`playerId`, `eventType`, `uiId`/stable row id)
  - capture-level `createdAt`
  - capture-level `setNumber`
  - capture-level `clientCaptureId`
- Keep client-side LLM invocation narrow, but change it to accept a clause transcript and clause reason rather than assuming the whole capture is the fallback unit.

## Test Plan

### Parser and fallback behavior
- Single-event phrases still return the same proposal/clarification behavior as before.
- Short rally recap with all-supported deterministic clauses returns one ordered batch.
- Rally recap with supported + unsupported context skips only the unsupported clause and keeps valid proposals.
- Rally recap with one `missing_player` clause triggers AI only for that clause.
- Rally recap with one `missing_event_type` clause triggers AI only for that clause.
- Rally recap with one `ambiguous_player` clause does not trigger AI for that clause.
- Zero-proposal multi-event recap with only ambiguous-player failures does not get mislabeled as AI-eligible `missing_event_type`.
- Common inflected verbs like “Kelly sets” and “Mary kills” resolve deterministically.

### Confirm behavior
- Batch confirm success writes all rows in order.
- Batch confirm failure writes no rows.
- Retry after failure does not duplicate rows because `client_event_id` remains stable.
- Single-event confirm remains unchanged.

### UI behavior
- One capture still renders as one review card.
- Mixed deterministic + AI-assisted batch shows row-level provenance clearly.
- Rejecting a queued item while AI is in flight prevents late results from resurrecting it.
- Confirm is blocked while batch AI recovery is still loading, then enabled when final supported rows are known.

### Evidence / verification
- Record exact manual test phrases and outcomes in the new evidence doc.
- Rerun `npm run typecheck` and `npm run build`.
- If available in the validation environment, record one hosted Edge function auth-denied case and one successful clause recovery case.

## Assumptions and Defaults

- Use clause-level AI fallback only; do not allow the LLM to reinterpret the entire rally when deterministic parsing already recovered some structure.
- Keep `ambiguous_player` deterministic-only.
- Prefer one grouped review card and one grouped confirm action over splitting captures into separate cards.
- Use an atomic server batch-confirm path in this slice rather than a client-only recovery patch.
- Correct roadmap/changelog wording in the same pass instead of preserving overstated verification language.
