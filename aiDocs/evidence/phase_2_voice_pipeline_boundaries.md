# Phase 2 Voice / Parse Pipeline Boundaries

**Date:** 2026-04-01  
**Purpose:** Lock the implementation boundary for capture-related work before Phase 3 starts adding live stat entry behavior.

## Baseline Direction

- **ASR default:** browser **Web Speech API**.
- **Capture posture:** push-to-talk or equivalent explicit user gesture only.
- **Parser posture:** deterministic rules and roster-aware matching first.
- **LLM posture:** deferred until ambiguity genuinely needs it; when added, it should sit behind a **Supabase Edge Function** or other server-side proxy so provider keys stay out of the client bundle.
- **Persistence posture:** confirmed structured events only; no silent commit.
- **Transcript posture:** do **not** store long raw transcripts in the database for MVP.

## What Phase 2 Establishes

- Routing and UI surfaces for the flows that capture will eventually feed:
  - authenticated coach session
  - selected team context
  - roster data
  - created game context
  - live dashboard route
  - in-app current-game report route
- Structured client logging around auth, data loading, and PWA lifecycle so Phase 3 capture work has observable hooks.
- Database foundations that match the architecture document:
  - `teams`
  - `players`
  - `games`
  - `stat_events`
  - `game_summaries`

## Deterministic Parser Scope For Early MVP

When capture implementation begins, the first deterministic path should aim to cover:

- jersey number + event phrase:
  - "12 got a kill"
  - "24 ace"
- first/last name + event phrase:
  - "Julie dig"
  - "Stevens block"
- MVP event vocabulary only:
  - kill
  - ace
  - serve error
  - reception error
  - block
  - dig
  - attack error
  - set assist

## Deferred On Purpose

- Always-on listening.
- Cloud ASR vendor integration.
- LLM parsing on every utterance.
- Low-confidence review queue UX.
- Pronoun-heavy or broad conversational disambiguation.

## Why This Boundary Matters

Phase 2 should make Phase 3 easier, not larger. The point of this boundary is to keep the first capture implementation focused on a narrow, cheap, explainable path that aligns with `architecture.md` and the final-demo reliability goals.
