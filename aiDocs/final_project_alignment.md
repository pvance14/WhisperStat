# Final Project Alignment Guide

## Purpose

This document translates the class **final project rubric** and the **class slides** into a concrete plan for WhisperStat.

It is especially important because this team is **starting fresh after midterm** rather than iterating on a previous build. That is acceptable because the professors have already approved the reset, but the repo and presentation need to make that context explicit so graders understand how to evaluate the project fairly.

---

## Current Assessment

### What is already strong

- The product idea is clear and differentiated in [prd.md](./prd.md).
- [mvp.md](./mvp.md) has a reasonably scoped first version.
- [architecture.md](./architecture.md) shows thoughtful tradeoffs and technical risk awareness.
- The repo already has the right high-level class pattern: `aiDocs/`, tracked agent instructions, and a concise `context.md`.

### Where alignment is currently weak

- The docs read more like **startup validation docs** than **final-project process evidence**.
- The repo does **not yet show the PRD -> plan -> roadmap -> implementation -> verification loop** emphasized in class.
- There is not yet an explicit artifact that explains the **post-midterm reset**, professor approval, and how the team will still show growth by final.
- Customer research and falsification are framed as future work, but the rubric requires **executed tests with results**.
- The technical docs do not yet define the **logging, CLI testing, and debug evidence** expected by the rubric and Unit 4 slides.
- The MVP still contains a few items that are useful product ideas but risky for a class-final demo if time gets tight.

---

## Core Framing For The Final

The final should not be presented as:

- "Here is our startup plan."
- "Here is what we hope to validate later."
- "Here is our full future product vision."

The final should be presented as:

- "We reset after midterm with professor approval because we found a stronger problem."
- "We used the class process from scratch: research, PRD, MVP scoping, architecture, phased implementation, testing, logging, and iteration."
- "Because we started over, our story is about disciplined execution and evidence gathering in a compressed timeline."
- "We deliberately chose a smaller working prototype so we could demonstrate the required process and a reliable live demo."

That framing matters because the rubric explicitly says the class is grading **process**, not polish.

---

## Highest-Priority Gaps To Fix

### 1. Make the reset legible

Why this is necessary:
The graders will otherwise compare you against teams that iterated from midterm and may assume missing continuity is a process failure.

What to do:

- Add a short tracked artifact explaining:
  - the team pivoted after midterm,
  - professors approved the reset,
  - the final will be evaluated on a compressed but complete process loop,
  - the team is preserving evidence of that restart in the repo.

Recommended home:

- Keep this explanation in the presentation and also in a tracked doc, either here or in a future presentation-outline doc.

### 2. Show the full document-driven pipeline

Why this is necessary:
The rubric and Unit 2 / Unit 5 slides repeatedly emphasize **PRD -> plan -> roadmap -> implementation -> verification**. Right now the repo has PRD/MVP/architecture, but not the later stages.

What to do:

- Create tracked phase documents for the actual build.
- For each major milestone, maintain:
  - a plan doc,
  - a roadmap checklist by phase,
  - verification notes after implementation,
  - a changelog entry.

Important tradeoff:

- Class slides often use `ai/roadmaps/`; this repo **tracks `ai/` in git** (professor-facing), while **product canon** lives in `aiDocs/`.
- Use **`aiDocs/evidence/`** for validation packets and rubric-ready summaries; roadmaps and phase notes remain in **`ai/roadmaps/`** (also tracked here).

### 3. Convert "validation roadmap" into executed falsification evidence

Why this is necessary:
The rubric is explicit that falsification tests must be **run**, not just proposed.

What to do:

- Turn PRD section 10 into a results-backed evidence packet.
- For each test, capture:
  - hypothesis,
  - what would falsify it,
  - how you ran the test,
  - what happened,
  - what changed because of the result.

Minimum high-value tests for this project:

- Can someone in a real or simulated noisy environment speak volleyball events naturally enough for the parser to capture them?
- Is push-to-talk actually less distracting than tapping for a coach or stat helper?
- Do target users care more about live capture, correction trust, or post-game narrative?
- Is a fully live in-game workflow realistic for the final, or should the demo emphasize a narrower but more reliable loop?

### 4. Tighten customer research to rubric standards

Why this is necessary:
The rubric requires interviews beyond friends and family.

What to do:

- Capture interviews with real volleyball stakeholders outside your immediate circle.
- Prefer a mix of:
  - high school coaches,
  - club coaches,
  - assistant coaches,
  - parent stat helpers or team managers.
- Track what changed in the product because of each conversation.

What graders will want to hear:

- "We heard X."
- "That invalidated or refined assumption Y."
- "We changed scope / workflow / UI because of it."

### 5. Re-scope the MVP for a dependable final demo

Why this is necessary:
The rubric requires a **working live demo**, and the slides push phase-by-phase implementation over ambitious scope.

Recommended class-final MVP:

- Roster setup for one team.
- Push-to-talk capture for a small set of core volleyball events.
- Deterministic or hybrid parsing for the most common utterances.
- Confirmation UI plus undo/edit.
- Persisted event log.
- Live stat table for one match or set.
- Post-game summary generated from stored events.

Recommended stretch-only items:

- comparison to prior match,
- fuzzy pronoun resolution,
- offline queue sophistication,
- advanced ambiguity review queue,
- multi-user collaboration,
- exports.

Rejected alternative:

- Trying to ship the full product vision from the PRD before the final.

Why reject it:

- It increases demo risk and makes it harder to show disciplined iteration.

### 6. Add technical-process evidence before coding accelerates

Why this is necessary:
Casey’s side of the rubric heavily rewards infrastructure and debug discipline.

What to add before implementation gets deep:

- A tracked plan and roadmap for the first build phase.
- A `scripts/` workflow for at least build and test.
- Structured logging integrated into the app itself, not just planned.
- A documented log location and how to run with debug logging.
- A simple test-log-fix loop you can show in git history or presentation.

Class-slide alignment:

- Unit 4 emphasized structured logging over ad-hoc debugging.
- Unit 4 and the implementation lab emphasized CLI-testable workflows with machine-readable output.
- Unit 5 emphasized multi-session discipline and roadmap verification.

---

## Recommended Changes To Existing Docs

### PRD

Keep the current PRD as the original product intent, but treat it as **Version 0.1** and avoid silently rewriting its assumptions.

Recommended next step:

- Add a future PRD addendum or versioned successor that reflects what was learned during final-project execution.

Most important PRD issues to revisit later:

- "10+ coaches pay before full build" is a startup metric, not a strong class-final metric.
- Some success metrics should be reframed around **demoable learning** and **prototype performance**.
- The validation roadmap should eventually point to actual results, not only proposed steps.

### MVP

The current MVP is directionally good, but for the class final it should be interpreted as:

- the smallest product that proves the **core interaction loop**,
- not the smallest product that proves the long-term business.

Most important MVP cuts if time gets tight:

- prior-match comparison,
- advanced roster resolution,
- threshold alerts,
- PDF/share flows.

### Architecture

The architecture is thoughtful, but for class alignment it should eventually include:

- where structured logs live,
- how tests are run from CLI,
- what the deterministic parser covers before LLM fallback,
- what the safe demo fallback is if live ASR is unreliable.

### Context

`context.md` should stay short, but it should point future sessions to the final-project alignment and evidence expectations. That keeps it consistent with the bookshelf pattern from Unit 3.

---

## Evidence You Should Build From Now On

To align with both the rubric and the slide deck, the repo should accumulate evidence in these categories:

### Product and customer evidence

- Interview notes or summaries from non-friends-and-family users
- Falsification tests with actual outcomes
- Updated system diagram showing what changed from the original understanding
- Problem statement refinement based on evidence
- Specific feature or scope changes caused by customer feedback

### Technical process evidence

- Versioned PRD or addenda
- Plan docs
- Roadmap docs with checkboxes and completion notes
- Meaningful commits across multiple sessions
- PR review notes or review-style findings
- Updated changelog entries tied back to planned work

### Debugging and implementation evidence

- CLI scripts for build/test flows
- Structured logs in the application
- At least one documented test-log-fix cycle
- Roadmap verification after implementation

### Presentation evidence

- A live demo path with backup steps
- Visuals that show the product throughout, not only at the end
- A narrative that includes what you got wrong, what changed, and what you would do differently

---

## Suggested Build Phases For The Class Final

### Phase 0. Alignment and evidence setup

- Freeze the current product docs as the starting point.
- Create tracked plan/roadmap docs for the final-project build.
- Decide the exact demo scope.
- Set up changelog, scripts, and logging expectations early.

### Phase 1. Core stat-capture loop

- Roster input
- push-to-talk capture
- parse a narrow stat vocabulary
- confirmation card
- undo/edit
- persisted event log

### Phase 2. Coach-facing value

- live stat table
- set-level aggregation
- post-game summary from stored events

### Phase 3. Reliability and evidence

- run falsification tests
- do user walkthroughs
- measure error patterns
- improve wording, correction flow, and trust cues

### Phase 4. Final presentation preparation

- update docs to reflect reality
- finalize system diagram evolution
- prepare demo script and fallback plan
- collect examples of process artifacts and git checkpoints

---

## Presentation Guidance

Your presentation should explicitly tell this story:

1. We restarted after midterm with professor approval because this was a stronger problem.
2. Since we were starting from zero, we optimized for process discipline and a working prototype.
3. Here was our original hypothesis.
4. Here is how customer research and falsification tested it.
5. Here is what changed in the product and system understanding.
6. Here is the phased build process we followed.
7. Here is the working demo.
8. Here is what we learned, what still failed, and what we would do next.

That narrative directly matches the rubric better than a feature tour.

---

## Immediate Next Actions

- Create a tracked phase plan and roadmap for the final-project build.
- Define the exact demo contract: what must work live, what can be stretch, and what fallback is acceptable.
- Run at least one real falsification test this week and write down the result.
- Schedule and document non-friends-and-family interviews immediately.
- Add structured logging and CLI build/test scripts as soon as code scaffolding begins.
- Update docs after each phase so the repo shows evolution, not just intent.

---

## Bottom Line

WhisperStat is already a plausible class project, but right now it is better aligned to **"interesting startup concept"** than **"high-scoring final project repo."**

The biggest improvement is not changing the idea. It is changing the **evidence trail**:

- make the reset explicit,
- make the roadmap process visible,
- execute falsification and customer research,
- narrow the demo scope to something reliable,
- and leave a clear paper trail showing how each document changed because reality pushed back.

