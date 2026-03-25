# Volleyball Stat Tracking App — Market Research Findings

**Project:** Voice-driven volleyball stat tracking app (MVP)
**Date:** March 2026
**Status:** Pre-validation / pre-build

---

## 1. The Concept

A mobile app that lets coaches, assistant coaches, or team managers track player stats using natural language voice input during games. Instead of tapping buttons, a user says something like:

- *"12 just got a kill"*
- *"Successful serve by Julie"*
- *"That was an error on number 5"*

An AI layer transcribes and parses the speech into structured stat events stored in a database. Coaches can review stats in real time and post-game, with AI-generated trend summaries to support in-game adjustments and season planning.

**Target sport (MVP):** Volleyball
**Target user:** High school head coaches, assistant coaches, team managers
**Intended scope:** Side project / MVP to validate

---

## 2. Market Size & Demand

| Metric | Data |
|---|---|
| High school volleyball players (US, 2023–24) | 564,000+ |
| Estimated high school teams (US) | ~45,000+ (est. ~12 players/team) |
| Volleyball — #1 girls' high school sport by participation | Yes (NFHS, 2023) |
| Sports coaching platform market (2023) | $8B |
| Sports coaching platform market (2030 est.) | $17.7B |
| Sports coaching platform CAGR | ~12% |
| Sports analytics market (2025) | $5.8B |
| Sports analytics market (2032 est.) | $24B |
| Sports analytics CAGR | ~22.5% |

**Key takeaway:** Volleyball has massive grassroots participation — more than basketball for girls at the high school level — yet is dramatically underserved by technology relative to sports like baseball or basketball. The macro trend in sports tech is strongly toward AI-powered, data-driven coaching tools.

---

## 3. Competitive Landscape

### Primary Competitors

#### SoloStats / Rotate123 LLC ⚠️ Main Competitor
- **Overview:** A suite of volleyball-specific coaching tools built by two Silicon Valley engineers who coach part-time. Products include SoloStats123, SoloStats Live, SoloStats Voice, SoloStats Clipboard, SoloStats Touch, WebReports, and Rotate123.
- **Size:** Self-reported "50,000+ coaches." Android download data shows ~39,000 downloads after 13 years of operation — modest for a product with AVCA endorsement and no direct competition.
- **Business model:** Freemium. Core stat tracking is free; WebReports analytics and advanced features require a paid "Starter Bundle."
- **Voice product:** SoloStats Voice (iOS only, launched 2024). Uses scripted command syntax — coaches must learn a specific vocabulary of voice commands before games. Android version listed as "coming soon."
- **Endorsements:** Recommended by AVCA (American Volleyball Coaches Association) and USA Volleyball. Trained 500+ coaches.
- **Weakness:** Not true natural language. Their own onboarding requires coaches to "familiarize yourself with voice commands" before matches. No AI narrative summaries. iOS only.

#### iStatVball 3
- **Overview:** Long-standing iOS volleyball stat app, marketed as "#1 volleyball stats app for over a decade."
- **Input method:** Button/tap based. Uses a court diagram as the input interface.
- **Strengths:** Heat maps, shot charts, MaxPreps direct upload, video sync.
- **Weakness:** No voice input. iOS only. Paid per season model.

#### Stat Together
- **Overview:** Collaborative stat tracking app with live streaming integration.
- **Price:** $6/team flat fee.
- **Strengths:** Real-time score overlay for live streams, multi-statistician support.
- **Weakness:** No voice input. No AI analysis. More focused on fan-facing streaming than coaching depth.

#### GameChanger (Dick's Sporting Goods / CBS)
- **Overview:** Multi-sport stat and team management platform. 200,000+ teams, 9M+ active users.
- **Voice input:** No.
- **Strengths:** Huge install base, free for coaches, real-time streaming, highlight reels.
- **Weakness:** Multi-sport generalist — not volleyball-specific. Tap-heavy input. No NLP.

#### VB Live Stats
- **Overview:** Live stat updates focused on fan-facing experiences.
- **Weakness:** Limited coaching depth, subscription-based, no voice or AI.

### Competitive Matrix

| Product | Natural language voice | AI summaries | Cross-platform | Cost | AVCA endorsed |
|---|---|---|---|---|---|
| **SoloStats Voice** | ✗ (scripted commands) | ✗ | iOS only | Freemium | ✓ |
| **iStatVball 3** | ✗ | ✗ | iOS only | Paid/season | ✗ |
| **Stat Together** | ✗ | ✗ | iOS | $6/team | ✗ |
| **GameChanger** | ✗ | ~ (highlights) | iOS + Android | Free | ✗ |
| **Your app (concept)** | ✓ | ✓ (planned) | PWA (all platforms) | TBD | ✗ |

---

## 4. Differentiation Analysis

### Genuine Differentiators
- **True natural language voice input** — coaches speak how they naturally think, not in command syntax. Nobody in this space has this.
- **AI-generated post-game narrative summaries** — "Julie led with 8 kills, rotation 3 is your weakest point, serve receive improved 12% vs. last week." SoloStats has raw WebReports; no one has narrative AI summaries.
- **Cross-platform from day one** — SoloStats Voice is iOS only. A PWA covers iOS and Android immediately.
- **Multi-role simultaneous input** — head coach, assistant, and manager can all log at the same time.

### Risks & Weaknesses
- **Gym noise** — crowds, squeaky shoes, whistles create a hostile environment for speech recognition. Biggest technical risk to validate.
- **SoloStats' moat** — AVCA endorsement + 13-year install base = significant coach inertia. Switching costs are real.
- **NLP ambiguity** — phrases like "she got one" require context. Need robust fallback UX for unclear inputs.
- **Trust threshold** — incorrect stats could undermine coach trust quickly. Accuracy is non-negotiable.
- **Response window** — SoloStats could add LLM-based NLP to their voice app within a year if they see traction from a competitor.

---

## 5. Why Volleyball Over Other Sports

| Sport | Incumbent strength | Voice gap | Stat complexity for NLP | Verdict |
|---|---|---|---|---|
| **Volleyball** | Weak (small bootstrapped co.) | Real — scripted commands only | Medium — discrete events, natural pace | ✓ Best beachhead |
| **Basketball** | Strong (GameChanger + many others) | Partial | High — fast pace, continuous action | ✗ Too crowded |
| **Baseball** | Strong (GameChanger dominant) | Partial | High — complex scoring conventions | ✗ Too crowded |
| **Football** | Strong (GameChanger + Hudl) | None | Very high | ✗ Skip |
| **Soccer** | Moderate | Partial | Medium | ~ Future expansion |

Volleyball is uniquely positioned: massive participation, weak incumbent, and stat events (kill, serve, block, dig, error) that map naturally to short spoken phrases with a clear pause between rallies to capture them.

---

## 6. Monetization Options

### Recommended for MVP: Team Subscription
- **Price:** ~$8–15/month per team
- **Model:** Coach pays, whole team and staff get access
- **Why:** Low enough to pay out of pocket. Seasonal discount ($49–79/season) as an alternative for budget-conscious coaches.

### Scale Play: District / Club License
- **Price:** $300–800/year for 5–10 teams
- **Why:** Athletic directors can buy for a whole program. Requires track record first — longer sales cycle.

### What to avoid early
- Going fully free (the SoloStats trap — hard to monetize later)
- Charging per player (confusing and scales badly for coaches)

### Freemium structure suggestion
- **Free tier:** Unlimited games, basic live stats, voice input
- **Paid tier (~$10/mo):** AI post-game summaries, season trends, export to MaxPreps/CSV, multi-device sync

---

## 7. Feature Priority

### Must Have (MVP blockers)
- Natural language voice input with player name + number recognition
- Real-time stat dashboard (kills, aces, blocks, digs, errors — per player, per set)
- Roster management (name + jersey number mapping for NLP)
- Correction / undo flow ("actually that was an error, not a kill")

### Should Have (Strong V1)
- AI-generated post-game narrative summary
- Multi-user simultaneous stat entry
- Season trend charts (player performance over time)
- Export to MaxPreps / CSV

### Nice to Have (Future)
- Live parent/fan read-only view
- Rotation tracking and sub alerts
- Opponent scouting profiles
- Video timestamp sync

---

## 8. Platform Recommendation

**Start with:** React PWA (Progressive Web App)
- Works on iOS and Android without App Store approval
- Fastest path to an MVP
- Directly leverages existing React + AWS stack
- Can install to home screen like a native app

**After validation:** Native iOS
- Better microphone access for noisy gym environments
- App Store discoverability
- Build only after PMF signal

**Skip for now:** Native Android
- High school coaches skew iOS
- PWA covers Android adequately in the short term

---

## 9. Technical Architecture (Sketch)

```
Voice input (browser Web Speech API or Deepgram)
        ↓
NLP parser (LLM prompt — maps natural language to stat events)
        ↓
Structured stat event { player_id, action, result, timestamp }
        ↓
AWS backend (API Gateway + Lambda)
        ↓
DynamoDB (stat storage)
        ↓
React dashboard (live stats view)
        ↓
Post-game: LLM generates narrative summary from stat data
```

**Key technical risks to prototype first:**
1. Voice-to-text accuracy in a noisy gym (test with Whisper or Deepgram before writing app code)
2. NLP parsing reliability for ambiguous phrases
3. Latency — stat entry needs to feel instant

---

## 10. Validation Roadmap (Before Building)

These steps should happen before significant development investment:

### Step 1 — Talk to 5 coaches (2 weeks)
High school VB coaches are accessible. 30-minute Zoom or sideline conversation.
Key questions:
- What's your current stat workflow?
- What's the most annoying part of tracking stats during a game?
- Would voice input help or distract you?
- Would you pay $10/month? Who controls that budget — you or the school?
- How did you find out about SoloStats?

### Step 2 — Gym noise test (1 day)
Record 20–30 natural phrases in a real gym with crowd noise. Run through Whisper and Deepgram. Measure accuracy on player names, numbers, and stat terms. This is the #1 technical risk and can be tested in an afternoon.

### Step 3 — Landing page / fake door test (1 week)
One-page site describing the concept with a "Join the waitlist" CTA. Share in volleyball coaching Facebook groups, r/volleyball, and local coach networks. 50 signups = real signal.

### Step 4 — Wizard of Oz test (1–2 games)
Offer to manually track stats for a local team for free. Use voice memos + a spreadsheet. Observe: what phrases coaches naturally use, what's ambiguous, what they care about most post-game. This gives real NLP training data before a line of code is written.

---

## 11. Open Questions

- [ ] Do high school coaches pay for tools out of pocket, or does it go through a school/athletics budget?
- [ ] How do coaches currently discover new tools — word of mouth, AVCA, social media, Google?
- [ ] Is $10/mo a price a part-time volunteer coach would pay, or does it need to be free?
- [ ] What are the most common NLP parsing failures for volleyball-specific phrases?
- [ ] Can SoloStats Voice be tested hands-on to understand exactly what "scripted commands" means in practice?
- [ ] Is there a volleyball coaching community (subreddit, Facebook group, Discord) that could be a launch channel?

---

## 12. Summary Verdict

**Should you build this?** The market gap is real and the differentiation is genuine. The competitor is small and the NLP moat is defensible in the short term. However, nothing is validated yet — all of this is desk research.

**The single most important next action:** Talk to 3–5 real coaches before writing a line of code. Everything else is a guess until you do that.

**Green lights:** Real participation market, weak incumbent, genuine feature gap, fits your existing stack (React + AWS), reasonable monetization path.

**Yellow lights:** Gym noise technical risk, AVCA-endorsed competitor with 13-year head start, coach inertia and switching costs.

**Red flags (would kill the idea):** Coaches don't find NLP input compelling vs. tapping, or voice accuracy in gyms is too low to be reliable.

---

*Research compiled: March 2026*
*Next review: After coach interview phase*
