# WhisperStat — class and validation evidence

This folder holds **tracked, grader-visible** artifacts that support the final-project loop: scope decisions, validation results, demo checklists, and rubric traceability.

In this repo, **`ai/` is tracked** (not gitignored) so roadmaps under `ai/roadmaps/` are commit-visible. Use **`aiDocs/evidence/`** for validation results, checklists, and rubric-ready summaries so they sit next to `aiDocs/` canon.

## What belongs here

- **Locked decisions** (stack, auth, scoring model, correction rules)—see `mvp_implementation_decisions.md`.
- **Phase gates** that later implementation phases inherit:
  - `final_project_success_criteria.md`
  - `validation_backlog.md`
  - `demo_narrative_and_risks.md`
- **Validation / falsification** write-ups: hypothesis, what would falsify, how you ran the test, outcome, what changed (per PRD §10 and `final_project_alignment.md`).
- **Demo evidence**: preflight checklists, golden-path screenshots or notes, fallback scenarios (offline / ASR failure).
- **Traceability**: short maps from rubric or alignment-doc requirements to a file in this folder or a PR.

## What stays elsewhere

- Product canon: `aiDocs/prd.md`, `mvp.md`, `architecture.md`.
- Working roadmaps: `ai/roadmaps/` (update decision snapshots here when phases close).
