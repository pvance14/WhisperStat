# WhisperStat — Project context

## Canonical docs

- **PRD:** [prd.md](./prd.md) — problem, users, full requirements, validation roadmap, risks.
- **MVP:** [mvp.md](./mvp.md) — what the first shippable scope includes and excludes.
- **Architecture:** [architecture.md](./architecture.md) — Supabase, data sketch, voice/NLP boundaries.
- **Final project alignment:** [final_project_alignment.md](./final_project_alignment.md) — rubric and class-slide translation into repo/process expectations.
- **Evidence (class / validation):** [evidence/](./evidence/) — tracked validation results, locked build decisions, demo and rubric traceability.
- **Market research:** [externalresearch/](./externalresearch/) — competitive landscape, pricing notes, technical risks.
- **Agents (tracked):** [AGENTS.md](../AGENTS.md) — Codex / shared agent defaults; Cursor uses `.cursor/rules/`.
- **Planning workspace (tracked):** [`ai/`](../ai/) — roadmaps, changelog, notes. This repo keeps **`ai/` in git** so coursework is visible (see root `.gitignore`). Optional: `ai/claude.md` for personal prompts (still avoid secrets if committed).

## Current focus

- Align the product docs and execution plan to the **final project rubric** and class workflow.
- Run PRD **validation** steps as falsification tests with documented results, not just proposed plans.
- Build a narrow, reliable **class-final demo** before expanding toward the broader startup vision.
- **Scaffold the app** with phased implementation, test scripts, and logging expectations from the class materials.

## Behavior
- Whenever creating plan does and roadmap docs, always save them in ai/roadmaps. Prefix the name with the date. Add a note that we need to avoid over-engineering, cruft, and legacy-compatibility features in this clean code project.
- Whenever finishing with implementing a plan / roadmap doc pair, make sure the roadmap is up to date (tasks checked off, etc). Then move the docs to ai/roadmaps/complete. Then update ai/changelog.md accordingly.