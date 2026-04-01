# Product Requirements Document
## WhisperStat — Voice-First Volleyball Stat Tracking App

**Version:** 0.1 (Pre-validation)
**Date:** April 2026
**Status:** Draft

---

## 1. Overview

### Problem

High school and club volleyball coaches have no practical way to capture detailed in-game stats hands-free. Existing apps require a dedicated screen-focused statistician tapping through complex interfaces during matches. The only voice-input competitor (SoloStats Voice) requires coaches to memorize a rigid command syntax — it is not natural language. The result: most teams track stats poorly, on paper, or not at all.

### Solution

A Progressive Web App that lets coaches, assistants, or parent volunteers track volleyball stats by speaking naturally — exactly how they'd describe a play out loud. An AI layer converts speech into structured stat events in real time. Post-game, an AI-generated narrative summary surfaces the insights a coach needs for in-game adjustments and season planning.

### Target Users

**Primary:** High school varsity volleyball head coaches and assistant coaches
**Secondary:** Club coaches, team managers, and engaged parents acting as stat helpers

---

## 2. Goals

| Goal | Success Metric |
|---|---|
| Prove voice input is faster and less disruptive than tapping | Coach can stat a full set without looking at the screen |
| Achieve reliable stat capture in a real gym | ≥90% accuracy on core stat events in gym noise conditions |
| Validate willingness to pay | 10+ coaches pay before full build |
| Differentiate from SoloStats Voice | Users describe input as "natural" vs. "scripted" |

---

## 3. Non-Goals (MVP)

- Native iOS or Android apps (PWA first)
- Native Android app
- Rotation tracking
- Opponent scouting profiles
- Video sync or highlight reels
- Fan-facing live score views
- Multi-sport support (volleyball only at launch)

---

## 4. User Stories

### Core (MVP Blockers)

- As a coach, I want to say "12 got a kill" during a rally so I can keep my eyes on the court instead of my phone.
- As a coach, I want to say "undo that, it was an error" so I can correct a misheard stat without interrupting the game.
- As a coach, I want to see a live per-player stat table (kills, aces, blocks, digs, errors) by set so I can make substitution decisions.
- As a coach, I want to enter my roster (name + jersey number) before a game so the app knows who "number 12" or "Julie" refers to.
- As a coach, I want to see an AI-written post-game summary so I understand what the numbers mean without building a spreadsheet.

### Strong V1 (Post-MVP)

- As an assistant coach, I want to log stats simultaneously with the head coach so we can cover more events without double-counting.
- As a coach, I want to see season-long trends per player so I can identify improvement or regression over time.
- As a coach, I want to export stats to MaxPreps or CSV so I don't have to re-enter data anywhere else.
- As a parent helper, I want a simple "stat helper" role that guides me through just the events I'm responsible for tracking.

---

## 5. Feature Requirements

### 5.1 Voice Input Engine

**Must Have:**
- Continuous microphone listening with push-to-talk activation (reduces false positives in noisy gym)
- Natural language parsing — no command syntax required
- Player recognition by jersey number ("12"), first name ("Julie"), or last name ("Stevens")
- Core stat event detection: kill, ace, serve error, reception error, block, dig, attack error, set assist
- Immediate visual confirmation of the parsed event before committing (e.g., "Kill — #12 Stevens ✓")
- One-tap undo from the confirmation card
- Verbal correction support: "actually that was an error" reverses the prior event

**Should Have:**
- Confidence scoring — low-confidence parses surface for manual review rather than auto-commit
- Between-rally review queue: ambiguous events flag for confirmation during natural pauses

**Won't Have (MVP):**
- Wake word detection ("Hey Stat")
- Background audio processing without push-to-talk

### 5.2 Roster Management

**Must Have:**
- Create a team with player names and jersey numbers
- Edit roster mid-season (additions, number changes)
- Fuzzy name matching for NLP (nicknames, partial names)

**Should Have:**
- Import from CSV

### 5.3 Live Stat Dashboard

**Must Have:**
- Real-time stat table: kills, aces, blocks, digs, errors, attack errors — per player, per set
- Set-by-set score tracking
- Current set indicator

**Should Have:**
- Per-rotation efficiency summary
- Visual flag when a player reaches a threshold (e.g., 5 errors)

### 5.4 Post-Game AI Summary

**Must Have:**
- Auto-generated narrative paragraph after match end
- Covers: top performers, problem rotations, serve receive performance, comparison to prior match if data exists

**Should Have:**
- Editable before sharing
- Exportable as PDF or shareable link

### 5.5 Correction & Undo Flow

**Must Have:**
- Undo last event (voice or tap)
- Event log view with manual edit capability (after each set or at game end)
- Delete or reclassify any event in the log

### 5.6 Multi-User Input *(V1)*

- Two or more users can join the same game session
- Each user is assigned a role (e.g., "serve stats," "attack stats")
- Deduplication logic prevents double-counting

### 5.7 Export *(V1)*

- CSV export of full game stat log
- MaxPreps-compatible format
- Post-game summary PDF

---

## 6. Technical Architecture

```
Voice input (push-to-talk via Web Speech API or Deepgram SDK)
        ↓
NLP parser (LLM prompt — maps natural language to structured stat event)
        ↓
Confirmation UI (coach approves or corrects)
        ↓
Structured event: { player_id, action, result, set, timestamp }
        ↓
Supabase (Postgres — event store, roster, game sessions; Auth; optional Edge Functions)
        ↓
React dashboard (live stats view, Supabase Realtime or polling)
        ↓
Post-game: LLM generates narrative summary from aggregated event data
```

**Platform:** React PWA
- No App Store approval required
- Installs to home screen on iOS and Android
- Backend: **Supabase** (Postgres + Auth); implementation detail in `aiDocs/architecture.md`

**Voice-to-Text Options (prototype both before committing):**
- Deepgram (streaming, better noise robustness, paid per minute)
- OpenAI Whisper (open source, batch processing, higher latency)

**NLP:** Claude or GPT-4o with a structured system prompt that includes roster context and stat vocabulary. Output is always a JSON stat event or a clarification request.

---

## 7. Technical Risks

| Risk | Severity | Mitigation |
|---|---|---|
| Voice accuracy in noisy gyms | High | Gym noise test before building (record 30 phrases in a real gym, run through Deepgram + Whisper) |
| NLP ambiguity ("she got one") | High | Roster context in LLM prompt; confirmation step for low-confidence parses |
| Latency — stat entry must feel instant | Medium | Push-to-talk with streaming ASR; NLP call fires immediately on utterance end |
| Gym Wi-Fi unreliability | Medium | Offline-first event queue; sync when connection restores |
| Coach trust — incorrect stats cause distrust fast | High | Confirmation UX is mandatory; never auto-commit without visual feedback |

---

## 8. Competitive Positioning

| Product | Natural language voice | AI summaries | Cross-platform | Price |
|---|---|---|---|---|
| **SoloStats Voice** | ✗ (scripted commands) | ✗ | iOS only | ~$8–17/mo |
| **iStatVball 3** | ✗ | ✗ | iOS only | Paid/season |
| **Stat Together** | ✗ | ✗ | iOS | $6/team |
| **GameChanger** | ✗ | ~ (highlights) | iOS + Android | Free |
| **Hooper AI** (basketball) | ✓ (push-to-talk) | ✗ | iOS | ~$5/mo |
| **Impressive Play** (soccer) | ✓ (post-game) | ✗ | iOS | Subscription |
| **WhisperStat (this app)** | ✓ (real-time NL) | ✓ | PWA (all) | TBD |

**Primary wedge:** The only volleyball stat tool with true natural language voice input that works on any device.

---

## 9. Monetization

### Pricing Model: Freemium

**Free tier:**
- Unlimited games
- Core voice stat entry
- Live stat dashboard
- Basic box score export

**Paid tier — ~$10/month per team or $69/season:**
- AI post-game narrative summary
- Season trend charts
- MaxPreps / CSV export
- Multi-user simultaneous input
- Priority support

**Future:**
- Club/district license: $300–600/year for 5–10 teams + director dashboard
- Parent tier: $3–5/month for single-athlete tracking and summaries

### Rationale
- $10/month is below the threshold most coaches pay out of pocket without school approval
- Avoid fully free (monetization trap) and per-player (confusing for coaches)

---

## 10. Validation Roadmap (Before Significant Development)

These steps de-risk the build before meaningful time is invested.

### Step 1 — Coach Interviews (2 weeks)
Talk to 5 high school volleyball coaches. Key questions:
- What is your current stat workflow during games?
- What is the most painful part?
- Would you use voice input, or would it distract you?
- Would you pay $10/month? Who approves that — you or the athletic department?
- How did you find SoloStats?

**Signal:** 3 of 5 say they'd try a voice-first app.

### Step 2 — Gym Noise Test (1 day)
Record 30 natural stat phrases in a real gym with crowd noise. Run through Deepgram and Whisper. Measure accuracy on player names, numbers, and stat terms.

**Signal:** ≥85% accuracy on structured phrases before investing in an NLP layer.

### Step 3 — Landing Page / Fake Door (1 week)
One-page site with a "Join the waitlist" CTA. Share in volleyball coaching Facebook groups, AVCA forums, r/volleyball, local coach networks.

**Signal:** 50+ waitlist signups.

### Step 4 — Wizard of Oz (1–2 games)
Manually track stats for a local team using voice memos + a spreadsheet. Observe: what phrases coaches use naturally, what's ambiguous, what they care about post-game. Produces real NLP training data before any code.

**Signal:** Clear vocabulary patterns emerge; coaches find manual summary useful.

---

## 11. Open Questions

- [ ] Do high school coaches pay for tools out of pocket, or does it go through school athletics budgets? (Affects pricing tier and sales cycle)
- [ ] What is SoloStats Voice's actual command vocabulary? Can it be tested to understand the exact UX gap?
- [ ] What volleyball coaching communities (Facebook groups, subreddits, Discord) are reachable for launch?
- [ ] Is there a meaningful parent use case, or is this strictly a coach tool at MVP?
- [ ] Post-game summary — do coaches want it immediately after the game, or is next-morning delivery acceptable?
- [ ] What are the most common NLP failure patterns for volleyball-specific phrases? (Answered by Wizard of Oz test)

---

## 12. Success Metrics (MVP)

| Metric | Target |
|---|---|
| Voice stat accuracy (core events in gym) | ≥90% |
| Time to stat a single event (voice) vs. tap | Voice ≤ tap |
| Coaches completing a full game with voice only | ≥70% of beta sessions |
| Post-beta conversion to paid | ≥20% |
| Waitlist signups before launch | 50+ |

---

## 13. Out of Scope for PRD Review

- Specific UI wireframes and component design
- Backend infrastructure sizing
- ASR vendor contract terms
- Legal / FERPA considerations for storing student athlete data
