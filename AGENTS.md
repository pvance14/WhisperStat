# Agent instructions (Codex & other tools)

Project context and how to work in this repo. **`aiDocs/context.md`** is the short index; **`aiDocs/prd.md`** and **`aiDocs/mvp.md`** define product scope.

## Source of truth

- **Context index:** `aiDocs/context.md`
- **Product:** `aiDocs/prd.md`, `aiDocs/mvp.md`
- **Architecture:** `aiDocs/architecture.md`
- **Research:** `aiDocs/externalresearch/`
- **`ai/`** is **tracked** in this repo (the `ai/` line in `.gitignore` is commented) so professors can see roadmaps and related class artifacts. **Product canon** remains `aiDocs/` (PRD, MVP, architecture).

## Behavior

- Ask before large refactors, dependency changes, or irreversible steps; propose a brief plan first.
- Prefer the smallest change that satisfies the request; avoid extra abstractions and scope creep.
- Say when something is uncertain instead of inventing APIs, paths, or requirements.
- Match existing code style, naming, and structure in this repo.

## Stack

React PWA, **Supabase** (Postgres + Auth), voice ASR + LLM for stat events — see **`aiDocs/architecture.md`**.
