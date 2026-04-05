# 2026-04-04 Sub-Plan: Serve Receive + Flexible Parsing

## Summary

Implement one focused follow-up slice that:

1. Adds **`serve_receive`** to the persisted stat-event vocabulary.
2. Extends deterministic parsing so more realistic volleyball phrasing can resolve into supported events without requiring coaches to speak in short command fragments.
3. Keeps the recent multi-event + clause-level AI architecture intact: deterministic first, AI only for unresolved eligible clauses, and explicit confirmation before write.

This document is a local planning artifact in `ai/roadmaps`. See [`aiDocs/context.md`](../../aiDocs/context.md) for canonical product pointers.

We need to avoid over-engineering, cruft, and legacy-compatibility features in this clean code project. This sub-plan intentionally focuses on volleyball-specific parsing improvements that materially help the demo and field workflow.

## Problem This Slice Solves

Right now the app has two related limitations:

- **Positive serve receive is not representable** in the stat schema, even though it is common volleyball language.
- The parser still expects phrasing that is often too short or too command-like for real spoken rally summaries.

That creates awkward failures for phrases like:

- “Chuck got the serve receive”
- “Chuck serve receive, Shane set, Cosmo kill”
- “Chuck got the serve receive, passed it to Shane, Shane set Cosmo for the kill”

These are exactly the kinds of phrases a coach or stat helper is likely to say in the gym.

## In Scope

- Add **`serve_receive`** as a supported persisted event type throughout the stack.
- Update stat aggregation/reporting/UI surfaces so serve receive behaves like the other tracked event types.
- Expand deterministic parser support for:
  - serve receive aliases
  - positive passing/receive wording
  - more natural setter phrasing
  - longer spoken rally clauses and connector patterns
- Preserve grouped multi-event review behavior.
- Preserve clause-level AI fallback for unresolved eligible clauses only.
- Add verification notes for schema, parser behavior, and grouped confirm behavior.

## Out Of Scope

- Broad free-form volleyball understanding beyond the supported stat vocabulary.
- Rotation modeling, opponent possession modeling, or narrative possession graphs.
- AI taking over whole-rally interpretation.
- Silent or automatic writes.

## Recommended Data/Schema Change

Add **`serve_receive`** to the stat event enum and all related typed surfaces.

That includes:

- Supabase enum / migration path
- [`src/lib/database.types.ts`](../../src/lib/database.types.ts)
- parser event aliases
- stats aggregation and any UI totals/tables
- post-game summary/stat-language helpers that assume the current fixed vocabulary

This is necessary because positive serve receive needs to be persisted as a real event, not treated as unsupported context.

## Recommended Parsing Direction

### 1. Expand supported event aliases

Add narrow deterministic alias coverage for positive serve receive phrasing, for example:

- `serve receive`
- `service receive`
- `got the serve receive`
- `received serve`
- `good receive`
- `good pass`

Also broaden existing natural volleyball verb forms where they are still too rigid, especially around set phrasing:

- `set`
- `sets`
- `set to`
- `set for`
- `fed`
- `sent`

Important constraint:

- Only map phrases to **supported persisted events**.
- If “pass” or similar wording is being used in a way that clearly means serve receive, map it to `serve_receive`.
- If the clause is just generic rally movement with no safe stat interpretation, keep it as skipped context.

### 2. Add safer relation-pattern parsing

Support narrow relation patterns that coaches naturally say, such as:

- `X got the serve receive`
- `X passed it to Y`
- `Y set X`
- `Y set it to X`
- `Y set X for the kill`
- `kill by X`

Recommended interpretation:

- `X got the serve receive` → `X serve_receive`
- `X passed it to Y` by itself:
  - if clearly part of a serve-receive phrase, allow it to help resolve `serve_receive`
  - otherwise treat as context only
- `Y set X` / `Y set it to X` → `Y set`
- `kill by X` / `for the kill` with a matched player → `X kill`

### 3. Broaden clause splitting for spoken sentences

The current parser is better than before, but spoken recaps still use longer constructions like:

- `X got the serve receive, passed it to Y, who set Z for the kill`

Add a narrow next step in segmentation for phrase boundaries such as:

- `who`
- `for the`
- `for a`
- `passed it to`
- `set ... for`

Important constraint:

- Only split where the resulting clause is likely to map to a supported event or clearly skipped context.
- Do not add broad NLP sentence parsing heuristics that become fragile and opaque.

## Multi-Event + AI Integration

The recent hardening work should remain the architecture for this slice.

Desired flow:

1. Split the rally deterministically.
2. Resolve as many clauses as possible with deterministic rules and the expanded schema.
3. Keep unsupported context visible but uncommitted.
4. Use clause-level AI fallback only for unresolved eligible clauses:
   - `missing_event_type`
   - `missing_player`
5. Do **not** use AI for:
   - `ambiguous_player`
   - clearly unsupported rally context

This is necessary so the broader parsing pass improves real-world coverage without undoing the trust guarantees we just added.

## UI / Reporting Implications

Serve receive must appear consistently anywhere the app currently assumes the fixed eight-stat vocabulary.

That likely includes:

- live player stat rows
- report tables / leader views
- any summary chips or totals
- post-game summary generation inputs and phrasing

The review queue itself should not need a new interaction pattern. It should just show `Serve Receive` as another supported event label in single-event and batch proposals.

## Verification

Create a short evidence note once implemented. It should cover:

- schema migration applied successfully
- serve receive event persists and reads back correctly
- serve receive appears in live/report aggregates
- deterministic parser examples like:
  - `Chuck serve receive`
  - `Chuck got the serve receive`
  - `Chuck serve receive, Shane set, Cosmo kill`
  - `Chuck got the serve receive, passed it to Shane, Shane set Cosmo for the kill`
- a mixed deterministic/AI example if clause-level AI is needed after the parser expansion
- at least one negative example showing ambiguous player still fails safely

Implementation closeout:

- Completed repo-local verification is recorded in [`aiDocs/evidence/phase_6_serve_receive_and_flexible_parsing_verification.md`](../../aiDocs/evidence/phase_6_serve_receive_and_flexible_parsing_verification.md).
- This slice kept the existing clause-level AI eligibility rules unchanged; repo-local verification focused on the deterministic parser expansion plus shared stat-vocabulary consistency.

## Implementation Checklist

| # | Task |
|---|------|
| 1 | Done: added `serve_receive` to schema, types, stats aggregation, and UI/report vocabulary |
| 2 | Done: expanded deterministic parser aliases and relation patterns for serve receive + more natural set/kill phrasing |
| 3 | Done: broadened clause splitting for longer spoken rally sentences without making parsing opaque |
| 4 | Done: verified mixed multi-event behavior still works with clause-level AI fallback rules unchanged |
| 5 | Done: added evidence notes and updated roadmap/changelog for closeout |

When this pair is fully implemented, update the roadmap checkboxes, move both files to `ai/roadmaps/complete`, and add a line to [`ai/changelog.md`](../changelog.md) per [`aiDocs/context.md`](../../aiDocs/context.md).
