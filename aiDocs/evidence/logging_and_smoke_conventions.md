# Logging And Smoke Conventions

**Date:** 2026-04-01  
**Purpose:** Define the app-level logging and CLI-checkable workflow expected by the class-final alignment docs.

## Client Logging

Structured logs live in two places:

- the browser console
- `window.__WHISPERSTAT_LOGS__` in the active session for quick inspection during development

Each log entry includes:

- timestamp
- scope
- environment
- level
- event name
- structured context object

## Current Logged Areas

- auth bootstrap and auth state changes
- PWA lifecycle events (offline-ready and update-available)
- team, player, and game data operations
- async success/failure timing for the basic Supabase queries

## Debug Controls

- `VITE_ENABLE_DEBUG_LOGS=true` enables verbose info/debug style output in development.
- Warnings and errors always log.
- Production should avoid noisy info logs unless explicitly enabled.

## CLI Smoke Workflow

Available scripts:

- `npm run smoke`
- `npm run typecheck`
- `npm run build`
- `npm run preview`

`npm run smoke` is intentionally low-cost. It verifies that the repository foundation exists:

- core app scaffold
- router and Supabase client files
- SQL migration
- key Phase 2 evidence docs

It does **not** require a live Supabase project, which keeps it useful in clean clones and classroom review contexts.

## Recommended Verification Order

1. `npm install`
2. `npm run smoke`
3. `npm run typecheck`
4. `npm run build`
5. `npm run dev`

## Why This Was Necessary

`final_project_alignment.md` calls out logging and CLI-checkable workflows as a rubric gap. Adding these conventions in Phase 2 gives later implementation phases a consistent debug and verification path instead of leaving observability as cleanup work.
