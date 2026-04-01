# Minimum Viable Product — WhisperStat

**Version:** 0.1  
**Date:** April 2026  
**Sources:** [Product Requirements Document](./prd.md), market research in `AI/externalresearch/`

---

## What “MVP” Means Here

The MVP is the smallest product that **proves** three things in the field:

1. **Voice-first stat entry** is usable in real gyms (no memorized command syntax).
2. **Trust** — coaches accept the numbers because confirmation, undo, and edits are obvious.
3. **Differentiation** — natural language plus an **AI post-game narrative** feels meaningfully better than tap-only or scripted-voice competitors (notably SoloStats Voice).

The MVP is **volleyball-only**, delivered as a **React PWA** (no native App Store builds). Scope explicitly excludes rotation tracking, scouting, video sync, fan live views, and multi-sport support — see [PRD §3](./prd.md).

---

## Strategic Context (Research + PRD)

| Insight | Implication for MVP |
|--------|---------------------|
| Large HS/club volleyball base; many teams still use paper or screen-heavy apps | MVP must beat “good enough” on **speed and eyes-up coaching**, not match every analytics feature |
| SoloStats Voice: **scripted commands**, iOS-only, no narrative AI | Wedge: **true NL voice** + **cross-platform PWA** + **AI summary** |
| Youth sports: appetite for “pro” stats, but **low adoption** when workflows are complex | **Low setup** (roster + push-to-talk), **small core stat set**, **clear correction path** |
| Gym noise and unreliable Wi-Fi are top risks | **Push-to-talk**, **confirmation before commit**, design for **offline or queued sync** as architecture allows |
| Incorrect stats erode trust fast | **Never silent auto-commit**; visual confirmation + undo + log edits are non-negotiable |

---

## MVP Feature Set

### 1. Voice input (core differentiator)

- **Push-to-talk** (and/or equivalent explicit capture) to limit false triggers in noisy gyms.
- **Natural language** — no required command vocabulary; phrasing like “12 got a kill” or “Julie ace” should work.
- **Player resolution** via roster: jersey number, first name, last name (with **fuzzy / nickname tolerance** where feasible).
- **Core events** only: kill, ace, serve error, reception error, block, dig, attack error, set assist.
- **Immediate visual confirmation** of the parsed event (e.g. “Kill — #12 Stevens ✓”) with **one-tap undo** on that card.
- **Verbal correction** path (e.g. “actually that was an error”) in addition to tap undo.

**Stretch / nice for MVP if time permits (PRD “Should Have”):** confidence scoring with review for low-confidence parses; between-rally review queue for ambiguous items.

**Explicitly out of MVP:** wake word (“Hey Stat”), unconstrained always-on listening without user activation.

### 2. Roster management

- Create teams with **player name + jersey number**.
- **Edit roster** mid-season (adds, number changes).
- Roster context feeds the NLP layer so “she” / partial names resolve when possible.

**Stretch:** CSV import (PRD “Should Have”).

### 3. Live stat dashboard

- **Real-time** table: kills, aces, blocks, digs, errors, attack errors — **per player, per set**.
- **Set-by-set score** tracking and **current set** indicator.

**Stretch:** per-rotation summaries; threshold alerts (e.g. error count) (PRD “Should Have”).

### 4. Corrections and auditability

- **Undo last event** (voice or tap).
- **Event log** with ability to **delete or reclassify** entries (per set or end of game is acceptable UX as long as the capability exists).

### 5. Post-game AI summary

- **Auto-generated narrative** after match end from aggregated events.
- **Must cover** (when data exists): standouts, weak spots (e.g. rotation / serve-receive themes), and **comparison to a prior match** if historical data is available.

**Stretch:** editable before share; PDF or shareable link (PRD “Should Have”).

**Monetization note:** The PRD positions AI summary on the **paid** tier alongside exports and multi-user features. For MVP you can still **build** the summary to validate demand; packaging as paid vs free is a GTM choice documented in the PRD.

---

## Post-MVP (Not Required for First Shippable Learning Loop)

Aligned with the PRD and research “strong V1” items:

- **Multi-user** simultaneous input on one game session with roles and deduplication.
- **Exports:** full CSV, MaxPreps-oriented format, summary PDF.
- **Season-long trends** per player.
- **Simplified “stat helper”** mode for parents/volunteers.

Native iOS/Android apps remain **after validation**, not part of MVP.

---

## Technical Direction (MVP)

- **Client:** React PWA.
- Pipeline: **ASR** (e.g. Web Speech API, Deepgram, and/or Whisper per prototyping) → **LLM structured output** (JSON stat event or clarification) with **roster in context** → **confirmation UI** → **persisted rows in Supabase (Postgres)** — see [architecture.md](./architecture.md).
- **Prioritize** low perceived latency after utterance ends (streaming ASR where possible).

---

## Success Criteria for MVP (“Did We Learn What We Needed?”)

| Area | Target (from PRD) |
|------|-------------------|
| Core event accuracy in real gym conditions | ≥90% (with confirmation catching the rest) |
| Coach can stat a full set **eyes-up** | Qualitative + “full game voice-only” session rate ≥70% in beta |
| Post-beta conversion to paid (if charging) | ≥20% (directional) |
| Differentiation | Users describe input as **natural** vs **scripted** relative to alternatives |

Pre-build **de-risking** (coach interviews, gym noise ASR test, waitlist, Wizard of Oz) remains the gating work summarized in [PRD §10](./prd.md) — the MVP assumes those signals justify engineering investment.

---

## Summary Checklist

**MVP ships with:** NL voice (push-to-talk), roster, core stat vocabulary, confirmation + undo + verbal correction, live per-set dashboard, event log edits, post-game AI narrative, volleyball-only PWA.

**MVP does not ship with:** rotation engine, opponent scouting, video sync, fan-facing live score, multi-sport, native store apps, multi-statistician sync, or MaxPreps/CSV as a **required** launch feature (those are V1+ per PRD).
