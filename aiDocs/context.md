# Stat Side — Project context

## Canonical docs

- **PRD:** [prd.md](./prd.md) — problem, users, full requirements, validation roadmap, risks.
- **MVP:** [mvp.md](./mvp.md) — what the first shippable scope includes and excludes.
- **Market research:** [externalresearch/](./externalresearch/) — competitive landscape, pricing notes, technical risks.
- **Agents (tracked):** [AGENTS.md](../AGENTS.md) — Codex / shared agent defaults; Cursor uses `.cursor/rules/`.
- **Claude (local, gitignored):** `ai/claude.md` — personal instructions; not committed.

## Tech stack (target)

- **Client:** React **PWA** (installable; no native MVP).
- **Voice:** Web Speech API and/or **Deepgram** / **Whisper** (prototype before locking one path).
- **NLP:** LLM with structured output (e.g. Claude / GPT-4 class) + roster context.
- **Backend:** **AWS** — API Gateway + Lambda; **DynamoDB** for events, rosters, sessions.
- **Realtime UI:** polling or WebSocket for live stats.

## Current focus

- Finalize repo layout (`aiDocs/` shared, `ai/` local + gitignored).
- Run PRD **validation** steps (coach interviews, gym ASR test, waitlist, Wizard of Oz) before heavy build.
- Scaffold app when ready: voice capture → parse → confirm → persist → live dashboard → post-game summary.
