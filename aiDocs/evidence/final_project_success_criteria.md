# Final Project Success Criteria — WhisperStat MVP

**Date:** 2026-04-01  
**Purpose:** Define what Phase 2-7 must verify so the project can be judged as a disciplined class-final build, not just a product idea.

## Success Criteria Table

| Area | Success Criteria | Why This Matters |
|---|---|---|
| Scope discipline | The shipped MVP matches [`mvp_scope_sheet.md`](../mvp_scope_sheet.md) with no unplanned expansion into V1+ features. | Protects demo reliability and keeps the team aligned with the class-final framing. |
| Core capture loop | A user can move through roster setup, match setup, push-to-talk capture, confirmation, persistence, live stats, and post-game summary in one connected flow. | This is the smallest complete product loop promised by the MVP. |
| Trust behavior | Every persisted stat goes through explicit confirmation; last-event voice correction works; older events can be edited in the event log. | Coach trust is a product requirement and a major demo risk if missing. |
| Live match usefulness | The app shows current-set context, manual score, per-player/per-set live stats, and an in-app visual stats report for the current match. | Confirms the product is useful during the game, not just after it. |
| Post-game output | The app generates a useful post-game summary from stored match data and uses the most recent prior completed game only when history exists. | Completes the differentiation story without forcing broader analytics scope. |
| Accuracy target | Real-world or simulated testing supports the PRD/MVP target of at least **90% core-event accuracy**, with confirmation catching the rest. | This is the main feasibility claim behind voice-first stat capture. |
| Eyes-up workflow | Validation evidence supports that a user can complete meaningful statting with voice while staying more eyes-up than a tap-heavy alternative. | This is the core behavioral wedge against existing tools. |
| Differentiation | User feedback or tests show the workflow feels **natural** rather than **scripted**. | This is the clearest competitive claim in the PRD and MVP. |
| Process visibility | The repo clearly shows **PRD -> plan -> roadmap -> implementation -> verification** through tracked docs, roadmap updates, and changelog entries. | This is required by the class framing and rubric. |
| Executed falsification | Validation tests are run and written up with hypothesis, falsifier, method, outcome, and decision in `aiDocs/evidence/`. | The class expects executed evidence, not plans-only validation. |
| Technical discipline | The project includes CLI-checkable workflows, structured logging direction, and verification notes as implementation deepens. | Supports the technical-process side of the rubric and later demo hardening. |
| Demo reliability | The final demo has a narrow golden path plus explicit fallback handling for mic, Wi-Fi, and ASR risk. | A fragile live demo would undermine otherwise good implementation work. |

## Exit Standard For Phase 1

Phase 1 is successful when later phase plans can inherit these criteria without reopening what the MVP is, what counts as proof, or what the final demo must show.

## Non-Success Signals

These are warning signs that the project has drifted from the class-final plan:

- New feature work appears that is not in [`mvp_scope_sheet.md`](../mvp_scope_sheet.md) and is not justified by evidence.
- Validation remains phrased as future work rather than executed tests with results.
- The build optimizes for breadth over a dependable demo path.
- Trust behaviors or manual score control are deferred even though they are part of the MVP loop.
