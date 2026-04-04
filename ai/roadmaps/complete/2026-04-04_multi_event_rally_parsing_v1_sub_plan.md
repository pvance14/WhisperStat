# 2026-04-04 Sub-Plan: Multi-Event Rally Parsing V1

## Summary

Add a narrow **multi-event parsing** layer so one captured transcript can produce an **ordered batch of supported stat proposals** when the transcript describes a short rally sequence. This should reuse the existing deterministic parser ideas, preserve the explicit review queue, and avoid jumping straight to a full free-form rally intelligence system.

This document is a local planning artifact in `ai/roadmaps`. See [`aiDocs/context.md`](../../aiDocs/context.md) for canonical product pointers.

We need to avoid over-engineering, cruft, and legacy-compatibility features in this clean code project. This sub-plan intentionally focuses on a small but valuable v1: short, linear rally summaries, existing stat vocabulary, and grouped confirmation.

## Phase Intent

- Make the app feel more live by reducing the number of separate captures needed per point.
- Differentiate the product with a workflow that better matches how coaches naturally recap a rally.
- Preserve the current trust posture: no automatic writes, no opaque broad interpretation, no silent unsupported stats.

## In Scope

- One transcript producing **2-4 ordered supported proposals**.
- Deterministic transcript segmentation into short candidate clauses.
- Reuse of roster-aware player matching and existing `StatEventType` vocabulary.
- Grouped review-card UX for a proposal batch from one capture.
- Partial success handling: supported/clear clauses become proposals; unsupported/unclear clauses stay uncommitted.
- Structured logging for batch parse lifecycle and outcomes.

## Out Of Scope

- Always-on listening or continuous autonomous rally capture.
- Full conversational understanding of every volleyball action.
- Automatic commit of batch proposals without explicit human confirm.
- Schema expansion for positive pass / reception success stats in this v1.
- A full-LLM-on-every-rally design.

## Product Constraint To Respect

The current stat schema only supports these event types via [`StatEventType`](../../src/lib/database.types.ts):

- `kill`
- `ace`
- `serve_error`
- `reception_error`
- `block`
- `dig`
- `attack_error`
- `set`

That means a rally phrase can include volleyball context that is **useful for understanding the sequence** but still **not representable as a persisted event** in v1. Example:

- “Sally dig, pass to Kelly, Kelly set Mary, Mary kill”

V1 should be able to propose:

- Sally `dig`
- Kelly `set`
- Mary `kill`

And treat “pass to Kelly” as supporting context only, not a persisted event, unless the schema changes later.

## Proposed Result Shape

Keep the current single-event path working, but add a batch-capable result shape for multi-event captures. Directionally:

- `kind: "proposal_batch"`
- `proposals: ParsedStatProposal[]`
- preserve one capture-level `transcript`, `createdAt`, `setNumber`, and `clientCaptureId`
- each proposal gets a stable UI id so the review card can support per-row discard or correction later

Why this is necessary:

- The current parser returns only one `proposal` or one `clarification`.
- The current review queue expects one result per capture.
- Multi-event parsing should stay grouped by capture so rally order is visible and confirmation stays fast.

## Recommended Parsing Pipeline

### 1. Segment the transcript deterministically

Split short rally narration into candidate clauses using punctuation and common sequence connectors, for example:

- commas
- “and”
- “then”
- “to”
- short pause-style fragments already reflected in ASR text

Example:

- Input: “good dig by Sally, pass to Kelly, Kelly sets Mary, good kill by Mary”
- Candidate clauses:
  - “good dig by Sally”
  - “pass to Kelly”
  - “Kelly sets Mary”
  - “good kill by Mary”

This is necessary because the current parser assumes one event phrase competes to be the single best match for the whole transcript.

### 2. Parse each clause with deterministic rules first

For each clause:

- resolve a supported event phrase if one exists
- resolve the responsible player from jersey/name/alias matching
- allow a few narrow relation patterns where they are reliable:
  - “X sets Y” → `X` gets `set`
  - “kill by X” → `X` gets `kill`
  - “block by X” → `X` gets `block`
  - “dig by X” → `X` gets `dig`

Reject or skip clauses that:

- contain no supported stat event
- resolve to ambiguous players
- only express unsupported context such as a positive pass/reception success event

This is necessary to keep the system explainable and reduce hallucinated structure.

### 3. Optional later fallback, not required for the first cut

If we later extend this area, the safer path is a **narrow fallback on unresolved clauses or unresolved batches**, not an LLM owning the entire rally parse from the start.

For this v1 plan, deterministic batch parsing should be considered the main implementation target.

## Review Queue UX Direction

One capture should create **one grouped review item**, not several unrelated cards.

Recommended review card behavior:

- show the original transcript once
- show ordered proposed events as rows
- show clause-level status when one part was skipped or unsupported
- support **Confirm all supported events**
- support discarding the whole batch
- leave room for later per-row reject/edit without requiring it in the first version

Why this shape is necessary:

- separate cards would lose the rally sequence
- grouped review reduces tapping between points
- the coach thinks in rally summaries, not isolated database rows

## Suggested V1 Scope Boundaries

Start with examples like:

- “Sally dig, Kelly set, Mary kill”
- “12 dig, 4 set, 7 kill”
- “Julie block, Mary kill”
- “Mia ace”

Defer examples like:

- long conversational narration
- opponent actions mixed with team actions
- clauses that depend on pronouns
- multiple plausible players in one clause
- full libero/passing semantics beyond the current stat schema

## Implementation Approach

- Refactor parser internals carefully so single-event behavior keeps working.
- Add deterministic segmentation before changing any LLM behavior.
- Prefer extending the review queue with a grouped batch card instead of introducing a separate rally review screen.
- Preserve one capture-level `setNumber` and `createdAt` for the whole batch.
- Persist only confirmed supported proposals using the existing trust model.

## Dependencies And Decisions

- The team accepts that v1 multi-event parsing is **supported-stat-only**, not full volleyball semantics.
- The team prefers grouped confirmation over autonomous writes.
- The team accepts that unsupported rally context may help parsing but does not become a DB row.
- Any later LLM work should layer behind deterministic batch parsing, not replace it.

## Observability And Verification

- Add logging for:
  - transcript length
  - clause count
  - proposal count
  - skipped clause count
  - parse latency
  - confirm-all outcome
- Manual verification should include:
  - short three-event rally success
  - mixed supported + unsupported clause handling
  - ambiguous player in one clause does not silently commit anything
  - single-event captures still behave exactly as before

## Acceptance Criteria

- One short rally transcript can produce multiple ordered supported proposals in one grouped review item.
- Unsupported rally context does not become a fake persisted stat.
- Single-event capture remains stable and usable.
- The review flow is still explicit and trustworthy: nothing writes without confirm.
- The v1 path is fast enough to feel useful between points, even if it is not true continuous live capture.

## Concrete Deliverables

- Parser/result type update to support grouped proposal batches.
- Deterministic segmentation logic and clause-level parsing helpers.
- Review queue UI update for grouped batch review.
- Logging updates for batch parsing.
- Manual test notes for representative rally examples and failure cases.

## Main Tradeoff

This plan deliberately chooses a **narrow but real** differentiator over a broader but fragile interpretation layer. It will not capture every volleyball nuance in v1, but it can still produce a noticeably better live workflow if it handles short supported rally summaries reliably.
