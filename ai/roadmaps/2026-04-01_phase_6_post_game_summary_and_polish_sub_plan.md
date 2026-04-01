# 2026-04-01 Phase 6 Sub-Plan: Post-Game Summary And Polish

## Summary

This sub-plan expands Phase 6 of the main MVP implementation plan into the post-game completion slice. Its purpose is to define how the stored match record becomes a useful post-game output and how limited polish should strengthen the MVP path rather than broaden it.

This document is a local planning artifact in `ai/roadmaps`. If grader-facing or shared evidence is needed later, the important outcomes should also be reflected in tracked docs.

We need to avoid over-engineering, cruft, and legacy-compatibility features in this clean code project. This phase should finish the MVP loop with focused polish, not feature creep.

## Phase Intent

- Turn the recorded match into a usable post-game takeaway.
- Tighten the end-to-end experience across capture, review, and summary output.
- Apply only the polish needed to improve comprehension, trust, and demo quality.

## In Scope

- Post-game summary generation from stored match data.
- End-of-match flow improvements that help connect the MVP loop.
- Limited product polish focused on reliability, clarity, and presentation of the MVP path.

## Out Of Scope

- Broad historical analysis or season trends.
- Share/export packaging beyond MVP needs.
- Nonessential visual refinement that does not improve the MVP path.

## Planned Outcomes

- A usable post-game summary tied to the recorded match.
- A cleaner transition from live use into post-game review.
- A more complete and compelling MVP story without broadening product scope.
- A better demo narrative built on a full product loop rather than an isolated feature set.

## Implementation Approach

- Keep the summary grounded in the data the MVP already produces.
- Limit polish to improvements that reduce confusion, strengthen trust, or improve the demo path.
- Avoid adding broad historical or sharing features unless they are already supported by MVP data and priorities.
- Preserve the narrow MVP framing even while improving the end-to-end experience.

## Dependencies And Decisions

- Earlier phases must already produce trustworthy event and match data.
- The summary must stay consistent with the MVP scope and available data quality.
- Polish work should be constrained by reliability and clarity goals, not visual ambition alone.

## Verification And Evidence

- Confirm the summary output aligns with the MVP promise of post-game narrative value.
- Confirm the phase improves the completeness of the MVP loop without adding V1 features.
- Confirm the product is easier to explain and demonstrate after this phase than before it.

## Assumptions

- The MVP’s post-game value can be delivered without full historical or export capabilities.
- Small polish improvements can have outsized impact if they target the core loop.
- This phase is complete when the product can move from live capture to meaningful post-game output in a clean, understandable way.

## Concrete deliverables

- **Summary input:** aggregated `stat_events` + roster names + set breakdown; for comparison, load the **most recent other completed game for the same `team_id`** (by `game_date`, then `created_at`), per `aiDocs/evidence/mvp_implementation_decisions.md`. If no prior game exists, narrative states that comparison is not available (consistent copy).
- **Summary output:** store in `game_summaries` (`narrative_text`, `generated_at`, optional `model`); show in UI after **complete game**.
- **Generation strategy (cost posture per `architecture.md` §2):** ship **deterministic template** first (sorted leaders, error themes); add **single batched Edge + small LLM** call when/ if prose quality is required for demo—keep keys server-side.
- **End-of-match UX:** clear path from live → review log → summary (avoid dead-ends).
- **Polish (bounded):** loading/error states on summary; readable typography on dashboard; iOS Safari quirks for mic if not already done.

## Acceptance criteria

- For a seeded game, narrative mentions top kill/error contributors when those stats exist.
- With **two+** completed games for the team, summary includes at least one **comparative** sentence vs the **defined** prior game (`aiDocs/evidence/mvp_implementation_decisions.md`); with **only one** completed game, summary uses the agreed **no-comparison** copy.
- No new scope: PDF/export/share remain stretch per `mvp.md`.

## Technical anchors

- RLS on `game_summaries` consistent with parent `game_id` / team ownership.
- Avoid storing full raw transcripts in DB unless PRD/privacy review says otherwise (`architecture.md` §10).
