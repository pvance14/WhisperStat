# Validation Backlog — WhisperStat

**Date:** 2026-04-01  
**Purpose:** Turn PRD §10 and the final-project alignment guidance into concrete evidence work with target result files.

These backlog items are intended to produce **executed** evidence under `aiDocs/evidence/`. They are not optional brainstorming tasks.

| ID | Hypothesis | What Would Falsify It | How To Run | Owner | Target Date | Evidence Output |
|---|---|---|---|---|---|---|
| VB-01 | Coaches or stat helpers can speak core volleyball events naturally enough for the system to capture them. | Natural utterances are too inconsistent or ambiguous to reach a usable parse rate even with confirmation. | Collect a phrase set from interviews or Wizard-of-Oz notes, then test deterministic parsing and any fallback approach against those phrases. | Team | Before Phase 4 exit | `aiDocs/evidence/validation/voice_phrase_capture_test.md` |
| VB-02 | Push-to-talk is less distracting than a tap-heavy workflow for the intended user. | Testers report that holding/tapping to speak is equally distracting or slower than tapping stats manually. | Run a small side-by-side comparison with a coach, assistant, or stat helper using the same short statting sequence. | Team | Before Phase 5 exit | `aiDocs/evidence/validation/push_to_talk_vs_tap.md` |
| VB-03 | Real or simulated gym noise still allows useful capture of player references and stat types. | Noise causes frequent misrecognition of names, jersey numbers, or event words, making the loop unreliable. | Record the planned PRD phrase set in a noisy setting and compare outputs across the chosen MVP speech path. | Team | Before Phase 3 exit | `aiDocs/evidence/validation/gym_noise_asr_test.md` |
| VB-04 | Confirmation, undo, and event-log correction are enough to preserve trust when the parser is wrong. | Users feel the correction path is too slow, confusing, or risky to use during a live set. | Usability test the correction path with intentionally wrong parses and measure whether users can recover quickly. | Team | Before Phase 4 exit | `aiDocs/evidence/validation/trust_and_correction_test.md` |
| VB-05 | The post-game narrative adds value beyond the live stat table alone. | Users say the summary is generic, redundant, or not useful for reflection or coaching decisions. | Show stored stats plus the generated summary to target users and ask what decisions it actually supports. | Team | Before Phase 6 exit | `aiDocs/evidence/validation/post_game_summary_value_test.md` |
| VB-06 | The class-final demo should emphasize the full live loop instead of a narrower fallback flow. | Early testing shows the live voice path is too risky or unstable for a dependable classroom demo. | Rehearse the full golden path on deployed hardware and compare reliability with a safer fallback path. | Team | Before Phase 7 exit | `aiDocs/evidence/demo/demo_rehearsal_and_scope_decision.md` |
| VB-07 | The intended buyer/user still sees value at the current MVP boundary. | Interviews indicate the reduced class-final scope misses the real reason users would adopt or pay. | Conduct stakeholder interviews outside friends/family and document what changed in scope or messaging. | Team | Rolling during Phases 2-7 | `aiDocs/evidence/interviews/stakeholder_interview_summary.md` |

## Backlog Rules

- Every finished item must include:
  - hypothesis
  - falsifier
  - method
  - actual outcome
  - decision or change made because of the result
- If a test fails, the result is still valuable evidence and should remain tracked.
- A backlog item may close with "defer" only when the evidence clearly supports narrowing the demo path.
