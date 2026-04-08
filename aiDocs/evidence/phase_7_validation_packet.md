# 2026-04-07 Phase 7 Validation Packet

## Purpose

This note converts the PRD validation roadmap and the earlier validation backlog into executed outcomes or explicit scope decisions for the class final. It focuses on evidence the repo can actually defend today.

## Validation Summary

| Backlog / PRD theme | Result | Evidence | Decision |
|---|---|---|---|
| VB-01 / natural volleyball phrasing is usable | Supported | `ai/roadmaps/complete/2026-04-01_phase_3_core_match_workflow_roadmap.md`, `aiDocs/evidence/phase_6_serve_receive_and_flexible_parsing_verification.md`, `aiDocs/evidence/phase_6_multi_event_llm_hardening_verification.md` | Keep deterministic natural-language parsing for the core vocabulary and preserve clarification when confidence is weak. |
| VB-02 / push-to-talk is less distracting than tap-heavy entry | Directionally supported | `aiDocs/mvp.md`, `aiDocs/evidence/2026-04-06_deepgram_realtime_stt_replacement_verification.md`, `ai/changelog.md` | Keep push-to-talk as the primary capture path because it preserves the eyes-up positioning, but retain manual text entry as the visible fallback. |
| VB-03 / noisy or imperfect speech still yields usable capture | Supported with trust safeguards | `aiDocs/evidence/2026-04-06_deepgram_realtime_stt_replacement_verification.md`, `ai/changelog.md` Phase 3 and Phase 4 entries | Do not remove confirmation. Accuracy claims remain tied to the explicit review step rather than silent auto-commit. |
| VB-04 / correction flows preserve trust | Supported | `ai/changelog.md` Phase 4 closeout, `ai/changelog.md` 2026-04-04 hardening fixes | Treat undo, last-event correction, and event-log edits as non-negotiable MVP behavior. |
| VB-05 / post-game summary adds value | Supported for class-final scope | `ai/changelog.md` Phase 6 closeout, `README.md`, `src/lib/postGameSummary.ts` | Keep the summary because it completes the end-to-end story, but keep it deterministic and narrow instead of expanding into export/share features. |
| VB-06 / full live demo should stay the primary story | Supported, with explicit fallback | `aiDocs/evidence/phase_7_end_to_end_verification.md`, `aiDocs/evidence/phase_7_demo_hardening.md` | Keep the golden path live-first, but make the fallback honest and ready rather than pretending the room cannot fail. |
| VB-07 / current MVP boundary is still the right final scope | Supported | `aiDocs/final_project_alignment.md`, `aiDocs/mvp_scope_sheet.md`, `ai/changelog.md` | Freeze scope. No late additions unless they fix a demo blocker or evidence gap. |

## PRD Section 10 Translation

### Coach interviews and broader customer evidence

- This repo has strong scope and implementation evidence, but not a fresh tracked interview packet in `aiDocs/evidence/` yet.
- For the class final, the repo should therefore present customer-validation claims conservatively.
- Decision: keep the final story focused on executed product verification, disciplined scope cuts, and the implemented trust loop rather than overstating market validation.

### Gym-noise / speech-path feasibility

- The project did not stop at a hypothetical ASR plan.
- The repo now contains an implemented Deepgram realtime path, hosted token minting, and a localhost full-flow verification record in `aiDocs/evidence/2026-04-06_deepgram_realtime_stt_replacement_verification.md`.
- Decision: the feasibility claim has moved from speculative to prototype-backed, but the repo still frames transcript-quality gains qualitatively rather than as a formal benchmark study.

### Wizard-of-Oz style phrase realism

- The deterministic parser was hardened with messy single-event inputs, serve-receive support, multi-event clause splitting, skipped-context handling, and narrow LLM recovery only where needed.
- Decision: prefer natural but bounded phrase coverage over pretending the MVP solves unconstrained volleyball language.

### Waitlist / willingness-to-pay

- No executed waitlist or paid-demand proof is tracked in this repo.
- Decision: do not use the PRD's early business-metric targets as a claim that has already been proven. Treat them as future validation rather than final-project evidence.

## What Changed Because Of Validation

- The speech path moved from browser Web Speech assumptions to a more controllable Deepgram realtime flow.
- The parser stayed deterministic-first and only added narrow LLM fallback behind review instead of broad AI-first parsing.
- The product kept explicit confirm, undo, and edit flows because trust evidence mattered more than raw automation.
- The MVP stayed narrow and demoable instead of reopening scope for exports, multi-user sync, or native apps.

## Honest Gaps

- There is still no tracked non-friends-and-family interview summary in `aiDocs/evidence/`.
- There is still no formal side-by-side tap-vs-voice timing study.
- Those gaps do not block the MVP implementation from being complete, but they should be presented as evidence limits rather than hidden.
