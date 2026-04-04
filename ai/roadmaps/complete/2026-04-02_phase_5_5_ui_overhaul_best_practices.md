# 2026-04-02 Phase 5.5 Plan: UI Overhaul Best Practices

## Purpose

Optional **between Phase 5 and Phase 6**: you already have live stats, manual score, and the in-app visual report; post-game narrative and late polish are not fully built yet. This note captures **practical habits** so a UI rehaul stays efficient and does not undermine trust flows or demo stability.

This document is a local planning artifact in `ai/roadmaps`. It complements `high_level_implementation_roadmap.md` and `high_level_mvp_implementation_plan.md`.

We should avoid over-engineering, cruft, and legacy-compatibility features: favor a **cohesive, readable** UI, not a design-system science project.

## When to run Phase 5.5

- **After** Phase 5 milestones feel “feature-complete enough” (dashboard, report, set/score, refresh).
- **Before** building Phase 6 post-game UX **onto** the old chrome—so you do not implement the summary flow twice.
- **Not** as a giant splash in Phase 7; reserve Phase 7 for verification, regression passes, and demo hardening.

## Best practices (checklist)

1. **Freeze behavior, restyle structure** — Treat the rehaul as **layout, typography, color, navigation, and component consistency** first. Avoid sneaking in new product behavior in the same pass (harder to debug).
2. **Protect the trust path** — Confirmation, undo, event log, and “no silent commit” must stay **obvious** after the rehaul: large tap targets, clear primary/secondary actions, visible last action / transcript area if you still show it pre-commit.
3. **Design tokens first** — Lock a small set: **colors (incl. focus/contrast), spacing scale, type sizes, radii, shadows**. Apply tokens before redrawing every bespoke screen so refactors are search-and-replace friendly.
4. **Mobile and sideline first** — One-hand use, bright gyms, and **Safari** matter: test **capture + confirm + quick undo** on a real phone early in the pass, not only desktop.
5. **One flow at a time** — Ship the rehaul in **vertical slices** (e.g. auth shell → roster → game → capture → dashboard → report) so the app stays runnable between commits.
6. **Keep loading and empty states honest** — Skeletons or short copy for “no events yet,” ASR spinners, and summary generation beat blank screens for demo credibility.
7. **Don’t break PWA expectations** — After visual changes, sanity-check **installability / offline shell** if you rely on them; cache busting can surface stale UI—note in demo checklist if needed.
8. **Snapshot for evidence** — Before/after screenshots (or short screen recording) in `aiDocs/evidence/` help the class story without extra prose.
9. **Accessibility baseline** — Semantic headings, labels on icon-only buttons, sufficient contrast, keyboard focus where applicable (desktop); respect `prefers-reduced-motion` if you add motion.
10. **Regression list** — After the pass, run a tight checklist: create roster → start game → PTT → **confirm** → see totals → **visual report** → **undo or log edit** → totals match; then continue into Phase 6.

## Stop signals (avoid scope creep)

- New charts libraries, animation frameworks, or multi-theme systems unless they unblock readability or demo clarity.
- Redesigning data models or auth to “match” the UI—keep UI and schema changes decoupled unless unavoidable.

## Handoff to Phase 6

- Post-game and end-of-match screens should use the **same** layout primitives and nav patterns established in 5.5 so the product feels like **one** app in the final demo.

## Progress update (2026-04-04)

- Applied the Phase 5.5 token pass plus a larger **dashboard/report hierarchy refresh** so the app now reads more clearly as one visual system.
- Reworked the live dashboard so the **trust path** is visually prioritized: hero match context, score/status summary, live capture and review, then recovery and audit sections.
- Reworked the report route to mirror the same hierarchy with clearer summary stats, stronger view controls, and more readable data sections.
- Kept the pass within the intended guardrails: **no behavior changes, no dependency additions, no schema/API changes**.
