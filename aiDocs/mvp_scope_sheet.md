# MVP Scope Sheet — WhisperStat

**Date:** 2026-04-01  
**Purpose:** Lock the class-final MVP boundary so later implementation phases can move quickly without quietly expanding scope.

This sheet translates [mvp.md](./mvp.md), [prd.md](./prd.md), [architecture.md](./architecture.md), and [final_project_alignment.md](./final_project_alignment.md) into a build-time scope guardrail. It favors a narrow, reliable final-project demo over the broader startup vision.

## In Scope For The Class-Final MVP

- **Volleyball-only React PWA** with a deploy path aligned to the locked team choice of **Vercel**.
- **Supabase Auth** with **magic-link** sign-in.
- **Multiple teams per coach** when the schema allows, so school and club teams do not require deleting data.
- **Roster setup and editing** for one team at a time: player names, jersey numbers, and basic roster updates.
- **Match setup** for one active game with opponent, set context, and persisted game state.
- **Push-to-talk voice capture** for the core MVP stat vocabulary:
  - kill
  - ace
  - serve error
  - reception error
  - block
  - dig
  - attack error
  - set assist
- **Roster-aware event parsing** using simple deterministic handling first and LLM fallback only when needed.
- **Mandatory confirmation before persistence** so stats never silently commit.
- **Trust behaviors** required for live use:
  - one-tap undo
  - verbal correction for the **last event only**
  - event log edit / delete / reclassify for older events
- **Manual score controls** as the MVP source of truth for set score.
- **Live stats dashboard** with per-player, per-set stats and current-set context.
- **In-app visual stats report** for the **current game**:
  - on-screen only
  - same underlying aggregates as the dashboard
  - table and simple visual presentation is enough
- **Persisted event log** with audit-friendly correction behavior.
- **Post-game summary** generated from stored match data.
- **Prior-match comparison** only when there is another completed game for the same team; otherwise the summary clearly omits or notes the missing history.
- **Phase-by-phase process evidence** in tracked docs and `aiDocs/evidence/`.

## Explicitly Out Of Scope For MVP

These stay out unless the MVP itself is intentionally redefined:

- Rotation tracking engine.
- Opponent scouting profiles.
- Video sync or highlight workflows.
- Fan-facing live views.
- Multi-sport support.
- Native App Store or Play Store apps.
- Multi-statistician simultaneous collaboration.
- Required CSV, MaxPreps, PDF, or file export support at launch.
- Wake word or always-on listening.
- Advanced ambiguity queue beyond what is necessary for a reliable core loop.
- Long-term raw transcript storage in the database.
- Automatic voice-owned scoring without confirmation and manual override.

## Stretch Only If The Core Loop Is Stable

- CSV roster import.
- Confidence scoring UI for low-confidence parses.
- Between-rally ambiguity review queue.
- Prior-match comparison polish beyond a simple recent-game comparison.
- PDF or shareable export for the post-game summary.
- Threshold alerts or richer visual summaries.
- More sophisticated offline queue behavior than the minimum needed for a safe demo.

## Scope Guardrails

- If a feature does not improve the setup -> capture -> confirm -> live stats -> post-game summary loop, it is probably not Phase 2-6 work.
- Reliability and trust beat breadth; when a choice increases demo risk without protecting the core loop, defer it.
- Evidence and verification are part of the MVP build, not a separate later effort.
