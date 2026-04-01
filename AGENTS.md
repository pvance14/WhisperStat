# Agent instructions (Codex & other tools)

Project context and how to work in this repo. **`aiDocs/context.md`** is the short index; **`aiDocs/prd.md`** and **`aiDocs/mvp.md`** define product scope.

## Source of truth

- **Context index:** `aiDocs/context.md`
- **Product:** `aiDocs/prd.md`, `aiDocs/mvp.md`
- **Research:** `aiDocs/externalresearch/`
- **`ai/`** is gitignored — local notes, guides, roadmaps only; not shared canon.

## Behavior

- Ask before large refactors, dependency changes, or irreversible steps; propose a brief plan first.
- Prefer the smallest change that satisfies the request; avoid extra abstractions and scope creep.
- Say when something is uncertain instead of inventing APIs, paths, or requirements.
- Match existing code style, naming, and structure in this repo.

## Stack (see context)

React PWA, AWS (API Gateway + Lambda + DynamoDB), voice ASR + LLM for stat events — details in `aiDocs/context.md`.
