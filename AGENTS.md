# Agent instructions (Codex & other tools)

Project context and how to work in this repo. **`aiDocs/context.md`** is the short index; **`aiDocs/prd.md`** and **`aiDocs/mvp.md`** define product scope.

## Source of truth

- **Context index:** `aiDocs/context.md`
- **Product:** `aiDocs/prd.md`, `aiDocs/mvp.md`
- **Architecture:** `aiDocs/architecture.md`
- **Research:** `aiDocs/externalresearch/`
- **`ai/`** is **tracked** in this repo (the `ai/` line in `.gitignore` is commented) so professors can see roadmaps and related class artifacts. **Product canon** remains `aiDocs/` (PRD, MVP, architecture).

## Behavior

- Ask before large refactors, dependency changes, or irreversible steps; propose a brief plan first.
- Prefer the smallest change that satisfies the request; avoid extra abstractions and scope creep.
- Say when something is uncertain instead of inventing APIs, paths, or requirements.
- Match existing code style, naming, and structure in this repo.

## Stack

React PWA, **Supabase** (Postgres + Auth), voice ASR + LLM for stat events — see **`aiDocs/architecture.md`**.

## Frontend design system

Use this section as the default visual direction for future UI work. Keep behavior the same unless the user explicitly asks for product changes. Prefer evolving existing screens toward this system in small passes instead of large redesigns.

### Visual direction

- Aim for **clean, athletic, high-contrast dashboards**: bright surfaces, bold data hierarchy, and energetic accent color.
- The app should feel **confident and fast**, not soft, generic, or overly enterprise.
- Preserve the current **blue + orange** personality, but push it to be more saturated and memorable.
- Use accent color intentionally. Most surfaces should stay neutral so the loud colors have impact.

### Color system

- **Canvas / background**
  - `--bg-base: #F4F7FB`
  - `--bg-muted: #EAF0F7`
  - `--bg-elevated: rgba(255, 255, 255, 0.9)`
- **Text**
  - `--text-strong: #0F172A`
  - `--text-default: #1E293B`
  - `--text-muted: #64748B`
  - `--text-on-dark: #F8FAFC`
- **Core brand accents**
  - `--blue-primary: #1273FF`
  - `--blue-bright: #39A0FF`
  - `--orange-primary: #FF6B2C`
  - `--orange-bright: #FF9A1F`
- **Support accents**
  - `--lime-highlight: #D9F247`
  - `--success: #16A34A`
  - `--warning: #D97706`
  - `--danger: #DC2626`
- **Lines / surfaces**
  - `--line-subtle: rgba(15, 23, 42, 0.08)`
  - `--line-strong: rgba(15, 23, 42, 0.16)`
  - `--shadow-color: rgba(37, 99, 235, 0.14)`

### Color usage rules

- Blue should carry the product’s primary identity: navigation focus, primary actions, selected states, charts, and active filters.
- Orange should signal momentum: live capture, important CTA moments, streaks, highlights, and key stat callouts.
- Lime is a **small-dose accent** for badges, positive status chips, and scoreboard-style emphasis. Do not let it replace blue or orange as the main brand voice.
- Avoid large areas where blue, orange, lime, and black all compete equally. Pick one dominant accent per surface.
- Use gradients only when they help establish hierarchy. Preferred accent gradient:
  - `linear-gradient(135deg, #1273FF 0%, #39A0FF 52%, #FF9A1F 100%)`
- Ensure text on accent fills stays readable. Default to dark text on lime, white text on blue/orange only when contrast is strong enough.

### Typography

- Headings: prefer **Space Grotesk** for future UI refresh work. Fallback: `"Avenir Next", "Segoe UI", sans-serif`.
- Body/UI text: prefer **Manrope** for future UI refresh work. Fallback: `"Avenir Next", "Segoe UI", sans-serif`.
- Data-heavy numerals may use `font-variant-numeric: tabular-nums`.
- Keep type compact and assertive. Avoid oversized marketing-style hero text in core workflow screens.

### Type scale

- `label-xs`: 12px / 16px, medium
- `label-sm`: 13px / 18px, medium
- `body`: 15px / 22px, regular
- `body-strong`: 15px / 22px, semibold
- `section-title`: 20px / 26px, semibold
- `card-title`: 24px / 30px, bold
- `metric-lg`: 32px / 36px, bold
- `metric-xl`: 40px / 44px, bold

### Spacing system

- Use a 4px base grid.
- Preferred spacing scale:
  - `4, 8, 12, 16, 20, 24, 32, 40, 48, 64`
- Default component padding:
  - small controls: `12px 14px`
  - cards: `20px to 24px`
  - page sections: `24px to 32px`
- Maintain generous whitespace around major data cards. Tight internal spacing is fine for labels, chips, and controls; not for major layout blocks.

### Shape, border, and shadow rules

- Standard radius: `16px`
- Large card radius: `20px to 24px`
- Pills/chips: `999px`
- Use subtle borders before increasing shadow depth.
- Preferred elevation:
  - base cards: `0 12px 30px rgba(15, 23, 42, 0.08)`
  - interactive/featured cards: `0 18px 40px rgba(37, 99, 235, 0.14)`
- Avoid muddy glassmorphism. If blur is used, keep it light and pair it with crisp borders.

### Layout rules

- Design for **mobile sideline use first**, then scale up for desktop dashboards.
- Keep the primary action visible without hunting. Capture, confirm, undo, and score context should stay near the thumb zone on mobile.
- Favor strong card grouping and clear column rhythm over decorative dividers everywhere.
- One screen should have one obvious focal point: current game state, next action, or top stats.

### Component guidance

- Buttons:
  - primary = blue
  - momentum/live = orange
  - secondary = white or very light neutral with visible border
- Chips and tags should be short, bright, and high-contrast. Avoid washed-out pastel chips unless they are intentionally de-emphasized.
- Icon-only controls must have visible hit area, clear hover/focus state, and text label or accessible name.
- Charts should prioritize readability over decoration: blue for baseline series, orange for current/highlighted series, lime only for success moments or thresholds.

### Interaction and motion

- Motion should reinforce speed and confidence: quick fades, slight lifts, and directional transitions.
- Standard timing:
  - hover/focus: `120ms to 160ms`
  - panel/card transitions: `180ms to 240ms`
- Respect `prefers-reduced-motion`.
- Avoid bouncy or playful motion that makes stat entry feel less trustworthy.

### Screenshot critique to remember

- The reference screenshot succeeds at **card rhythm, visual energy, and quick scanability**.
- Its weaker areas are **color discipline, hierarchy consistency, and accessibility predictability**:
  - too many accent hues fight for attention at once
  - some cards rely on color more than structure
  - black elements feel visually detached from the softer card language
  - spacing is attractive but slightly inconsistent between dense and spacious cards
- When borrowing from this direction, keep the boldness, but make hierarchy clearer through a tighter token system rather than more visual novelty.
