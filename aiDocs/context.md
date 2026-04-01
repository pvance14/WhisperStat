# Stat Side — Project context

## Canonical docs

- **PRD:** [prd.md](./prd.md) — problem, users, full requirements, validation roadmap, risks.
- **MVP:** [mvp.md](./mvp.md) — what the first shippable scope includes and excludes.
- **Architecture:** [architecture.md](./architecture.md) — system design, data sketch, AWS/voice/NLP boundaries.
- **Market research:** [externalresearch/](./externalresearch/) — competitive landscape, pricing notes, technical risks.
- **Agents (tracked):** [AGENTS.md](../AGENTS.md) — Codex / shared agent defaults; Cursor uses `.cursor/rules/`.
- **Claude (local, gitignored):** `ai/claude.md` — personal instructions; not committed.

## Current focus

- Run PRD **validation** steps (coach interviews, gym ASR test, waitlist, Wizard of Oz) before heavy build.
- **Scaffold the app** when validation clears — implementation details live in [architecture.md](./architecture.md).
