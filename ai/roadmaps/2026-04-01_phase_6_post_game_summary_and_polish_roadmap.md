# 2026-04-01 Phase 6 Roadmap: Post-Game Summary And Polish

## Purpose

This roadmap maps the implementation planning milestones for the post-game summary and polish phase. It keeps the team focused on closing the MVP loop and improving clarity without drifting into broader feature work.

This document is a local planning artifact in `ai/roadmaps`. If grader-facing roadmap evidence is needed later, the relevant milestones should also be reflected in tracked documentation.

We need to avoid over-engineering, cruft, and legacy-compatibility features in this clean code project. Polish should stay limited to what strengthens the MVP loop.

## Current Status

- Planning status: Ready for implementation planning.
- Implementation status: Not started.
- Scope status: Focused on post-game summary behavior and targeted MVP-path polish.

## Document Status

- [x] Phase sub-plan drafted.
- [x] Companion roadmap drafted.
- [x] Alignment checked against the main high-level plan docs and `aiDocs/context.md`.
- [x] Ready to archive in `ai/roadmaps/complete` as a finished planning pair.

## Milestones

- [ ] Implement **aggregate → narrative** pipeline (template + optional LLM via Edge).
- [ ] Persist and display **`game_summaries`** for completed games.
- [ ] Implement **prior-match comparison** vs **most recent other completed game** for the team when one exists (`mvp.md` + `aiDocs/evidence/mvp_implementation_decisions.md`).
- [ ] Smooth **end-of-match** UX (complete game → summary screen).
- [ ] Targeted **polish**: errors, loading, mobile layout for capture + board + **visual stats report**.
- [ ] Re-read scope: no exports, no season trends, no shareable links unless stretch time permits.

## Readiness Checks

- [ ] The summary work remains grounded in MVP data and scope.
- [ ] Polish decisions improve reliability and clarity rather than adding surface area.
- [ ] No roadmap work expands into V1 exports, trends, or nonessential packaging.
- [ ] The resulting experience supports a complete MVP demo path.

## Completion Signal

This phase is ready to close when the product can move from match capture to a clear post-game takeaway and the MVP path feels complete enough to demonstrate confidently.
