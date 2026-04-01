# MVP implementation decisions (locked for build)

**Date:** 2026-04-01  
**Status:** Team-agreed defaults for WhisperStat MVP implementation. Roadmaps in `ai/roadmaps/` should match this file; if something changes, update this doc and the affected phase docs.

## 1. Auth

- **Magic link (email)** via Supabase Auth.

## 2. Scorekeeping

- **Manual score** is the source of truth for MVP: coach adjusts per-set score with simple controls (exact control pattern TBD in UI).
- **Voice / LLM auto-scoring (future):** You *can* later teach the system to react to explicit phrases (“point us,” “sideout,” “they scored”) or to structured JSON from the LLM that *proposes* a score change—but volleyball scoring context is easy to get wrong (serving order, libero, replays). For MVP, **do not** let the model silently own the score. If you experiment after the core loop ships, treat voice score lines like stat events: **parse → confirmation → apply**, and keep manual override always available.

## 3. Prior-match comparison (post-game)

- Compare to the **most recent other completed game for the same `team_id`**, ordered by `game_date`, then `created_at` if needed.
- If only one completed game exists, the summary should state clearly that there is not enough history to compare (or omit comparison—pick one and keep it consistent).

## 4. Verbal correction

- **Voice** may correct **only the last event** (e.g. follow-up utterance after a mistaken confirm).
- **Older events:** fix via **event log** UI (tap/edit/reclassify/soft-delete), not voice.

## 5. Database

- **SQL migrations** in the repo (Supabase CLI or tracked migrations), not schema-only-in-dashboard for anything production-facing.

## 6. PWA hosting

- **Vercel** for the static frontend (aligned with team tooling).

## 7. Device testing

- Test **Web Speech** on a **real phone** (e.g. iPhone Safari) once the app is deployed to the web, not only on desktop.

## 8. Transcripts

- **Do not persist** full raw ASR transcripts in the database for MVP. Structured, confirmed stats and optional short UI-only transcript are acceptable; long-term transcript storage needs an explicit privacy review.

## 9. Evidence for class

- **Primary** grader-facing evidence packets live under `aiDocs/evidence/`; roadmaps and process notes also live in tracked **`ai/`** in this repo.

## 10. Teams per coach

- **Multiple teams per coach** when the data model allows (many `teams` rows per owner), so club + school (or demos) do not require deleting data.

## 11. Stretch vs core

- PRD/MVP “Should Have” items (CSV import, PDF, confidence UI, etc.) stay **behind** a working core loop.
- **In scope for MVP:** an **in-app visual stats report** for the **current** game—read-only or live-updating full-screen (or dedicated view) of the same aggregates as the dashboard (tables and simple visuals). **Not** a PDF export or shareable file unless time permits as stretch.
