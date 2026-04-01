# 2026-04-01 Phase 5 Sub-Plan: Live Stats And Game Management

## Summary

This sub-plan expands Phase 5 of the main MVP implementation plan into the live match value slice. Its purpose is to turn captured events into a coherent active-game experience through live stats, match context, and set-level management.

This document is a local planning artifact in `ai/roadmaps`. If grader-facing or shared evidence is needed later, the important outcomes should also be reflected in tracked docs.

We need to avoid over-engineering, cruft, and legacy-compatibility features in this clean code project. This phase should focus on the MVP views and match-state handling needed for real use and a strong demo.

## Phase Intent

- Convert captured events into usable live match information.
- Support the MVP dashboard expectations for per-player, per-set, and current match context.
- Keep the live experience coherent without expanding into advanced analytics.

## In Scope

- Live per-player and per-set stat presentation.
- Match and set context management, including current-set and score-state support.
- Persisted event and game data behavior needed for active match use.

## Out Of Scope

- Advanced analytics or rotation intelligence.
- Broader admin or season-management tooling.
- V1 reporting and export workflows.

## Planned Outcomes

- A live dashboard that reflects the MVP stat views.
- A consistent active-game experience from setup through current match tracking.
- Match-state handling that supports both in-game use and later summary generation.
- A clear demo story built around live value, not just event logging.

## Implementation Approach

- Keep dashboard scope centered on the MVP stat categories and match-state needs already defined in `aiDocs/mvp.md`.
- Treat current-set and score-state support as part of match usability, not optional extras.
- Prefer straightforward live views over deeper analytics or decorative reporting.
- Make sure persisted match data is sufficient for later verification and post-game use.

## Dependencies And Decisions

- Phases 3 and 4 must already produce trustworthy event records.
- The phase should prioritize live usefulness and demo clarity over advanced metrics.
- Any analytics work that does not directly improve MVP match use should be deferred.

## Verification And Evidence

- Confirm the live views satisfy the MVP dashboard expectations.
- Confirm match-state handling is sufficient for both in-game use and later summary work.
- Confirm the phase strengthens the end-to-end product loop rather than creating isolated views.

## Assumptions

- The most important live value is clarity around players, sets, and current match state.
- Coaches do not need advanced analysis in the MVP if the core live dashboard is trustworthy and usable.
- This phase is complete when a coach can see match value emerge from the captured event stream during active use.

## Concrete deliverables

- **Aggregate queries** for live dashboard (examples in `architecture.md` §7): kills, aces, blocks, digs, errors, attack errors **per player** and **filterable by `set_number`**.
- **Current set indicator:** bind UI to `games.current_set`; flow to **advance set** (and reset live slice) when the coach moves to set 2+.
- **Set-by-set score:** `mvp.md` requires team score tracking per set—architecture sketch is light here; implement the **smallest** representation (e.g. JSON on `games` for `{set: {us, them}}` or dedicated columns) and document in migrations. Manual +/- controls are acceptable for MVP if auto-scoring is out of scope.
- **Live updates:** start with **polling** (`architecture.md` §8); upgrade to Realtime only if needed.
- **Game lifecycle:** mark game `completed` when match ends (feeds Phase 6 summary triggers).

## Acceptance criteria

- Totals on dashboard match raw `stat_events` counts for a test game (SQL cross-check).
- Switching sets updates numbers without stale blurbs; current set obvious during capture.
- Score + set state survive refresh (persisted), not only React state.

## Technical anchors

- All aggregates exclude `deleted_at` rows.
- Index usage: `(game_id, set_number)` per architecture for performance sanity checks on beta-sized data.
