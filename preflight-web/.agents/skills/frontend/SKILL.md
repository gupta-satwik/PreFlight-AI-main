---
name: frontend
description: >
  Use this skill whenever the user wants to build, design, or ship frontend interfaces, UI components,
  dashboards, landing pages, or complete platform experiences inside Antigravity. Triggers on any
  request involving: visual design, component creation, design systems, UI aesthetics, dashboard layout,
  platform UX, or "make it look good." Specialises in five high-craft aesthetics: Neo-Brutalism,
  Glassmorphism, Skeuomorphism, Stark Black & White, and Intelligent Dashboard Design. Outputs
  Antigravity-optimised mission prompts, production-grade code, and design token systems — or all three
  as appropriate. Always use this skill when the user is building anything visual in Antigravity,
  even if they only say "build a component" or "style the page."
---

# Antigravity Frontend Design Skill

You are designing and shipping high-craft frontend interfaces inside **Google Antigravity** — an agent-first IDE where agents autonomously plan, code, test in the browser, and verify via Artifacts. Your job is to produce outputs that make the Antigravity agent succeed on the first attempt: precise, opinionated, executable.

---

## Antigravity-Specific Context

Antigravity agents work across three surfaces simultaneously:
- **Editor** — writes and edits files
- **Terminal** — installs packages, runs dev server
- **Browser** — live-tests the UI, takes screenshots, verifies visuals

This means your output must be **browser-verifiable**. Designs that are ambiguous or underspecified cause the agent to loop or ask for review. The solution: be extremely specific about visual intent, tokens, and component structure upfront.

**Two execution modes to consider:**
- **Plan mode** — agent produces an Implementation Plan Artifact before coding. Best for full platform experiences, dashboard systems, multi-screen flows.
- **Fast mode** — agent executes immediately. Best for isolated components, quick style fixes, single-screen UIs.

When generating an Antigravity mission prompt, always specify which mode to use.

---

## When to Produce What

| Request type | Output |
|---|---|
| "Build me a dashboard / platform / full UI" | Mission Prompt + Design Tokens + Code scaffold |
| "Create a component / card / nav / form" | Mission Prompt + Full component code |
| "Style / redesign / make it look good" | Aesthetic decision + Design tokens + Targeted code |
| "Give me a design system / tokens" | Token file + Usage guide |
| "What should this look like?" | Aesthetic recommendation + rationale |
| Any combination | All three as needed |

---

## Aesthetic Intelligence

When the user specifies an aesthetic, execute it with precision from the reference files below. When they don't specify, **read the context**: the product's purpose, audience, and data density signal the right aesthetic. Use the selector logic in `references/aesthetic-selector.md`.

The five supported aesthetics and their reference files:

| Aesthetic | Reference |
|---|---|
| Neo-Brutalism | `references/neo-brutalism.md` |
| Glassmorphism | `references/glassmorphism.md` |
| Skeuomorphism | `references/skeuomorphism.md` |
| Stark Black & White | `references/stark-bw.md` |
| Intelligent Dashboards | `references/dashboard.md` |

**Load the relevant reference file(s) before generating any design output.** Do not guess at tokens or patterns from memory — each reference file is the source of truth for that aesthetic.

---

## Core Workflow

### Step 1 — Understand the task
Extract from the user's request:
- **What**: component, page, feature, platform, dashboard
- **Who**: target audience (developers, consumers, ops teams, students, executives)
- **Stack**: React/Next.js? Vanilla HTML/CSS? Tailwind? Existing codebase?
- **Aesthetic**: explicit or inferred
- **Data**: static, dynamic, real-time, dense vs sparse

Ask if critical info is missing. Do not design blindly.

### Step 2 — Make an aesthetic decision
Commit to one clear direction. State it explicitly:
> "Going with Neo-Brutalism here — the raw structure reflects the dev-tool nature of the product and will contrast sharply against the data."

Never hedge with "I'll use a modern, clean design." That produces generic output and gives the agent nothing to work with.

### Step 3 — Output (all three as needed)

**A) Mission Prompt** — the instruction you pass to the Antigravity agent. See format in `references/mission-prompt-format.md`.

**B) Design Tokens** — the CSS/JS variables that govern the entire UI. Every aesthetic has a canonical token set in its reference file.

**C) Component / Page Code** — production-ready HTML+CSS+JS or React. Written to be browser-testable by the Antigravity agent without modification.

### Step 4 — Verification hints
End every mission prompt with a **Verification Checklist** — a short list of things the Antigravity agent should check in the built-in browser:
```
VERIFY IN BROWSER:
- [ ] Cards render with correct border weight and no border-radius
- [ ] Hover states trigger on all interactive elements
- [ ] Mobile breakpoint collapses grid to single column
- [ ] No overflow on 375px viewport
```

---

## Code Standards

All code output must meet these non-negotiables:

**Structure**
- Component-first: every UI piece is an isolated, reusable component
- CSS custom properties for all design tokens — never hardcoded values
- Mobile-first responsive by default

**Typography**
- Always specify font + fallback + loading strategy
- Never use system-ui, Arial, or Inter as primary typefaces
- Use Google Fonts or self-hosted; always include the @import or link tag

**Accessibility**
- Semantic HTML (button, nav, main, section — not divs for everything)
- ARIA labels on interactive elements without visible text
- Minimum 4.5:1 contrast ratio — use a high-contrast accent in dark UIs

**Performance**
- CSS-only animations preferred; JS only for complex interactions
- No external dependencies beyond what's stated in the stack
- Images: use aspect-ratio boxes + lazy loading

**Antigravity-specific**
- File names use kebab-case: `dashboard-card.jsx`, `tokens.css`
- Always include a `/* ANTIGRAVITY: verified */` comment block at the top of each file with intended browser test URL (e.g., `localhost:3000/dashboard`)
- Exports must be named clearly so the agent's file tree is readable

---

## Design System Principles

Regardless of aesthetic, every interface must have:

1. **One dominant typeface** — display or heading; distinctive, not generic
2. **One supporting typeface** — body; high legibility at small sizes
3. **One accent color** — used sparingly, maximum impact
4. **A spatial scale** — 4px base unit, multiples of 4 or 8 for all spacing
5. **A motion vocabulary** — define easing curves and durations upfront; use them consistently

---

## Platform Experience Guidelines

When building multi-screen platform flows (auth → onboarding → dashboard → settings → empty states), always produce:

1. **Screen inventory** — list every screen before writing code
2. **Shared layout shell** — sidebar/navbar/footer that wraps all screens
3. **Design tokens first** — single `tokens.css` imported everywhere
4. **State variations** — empty state, loading state, error state for every data-bearing component
5. **Transition logic** — how screens connect; route names if using React Router/Next.js

---

## Reference Files

Read these before generating output for the matching aesthetic or task:

- `references/neo-brutalism.md` — tokens, rules, do/don't, component patterns
- `references/glassmorphism.md` — tokens, rules, do/don't, component patterns
- `references/skeuomorphism.md` — tokens, rules, do/don't, component patterns
- `references/stark-bw.md` — tokens, rules, do/don't, component patterns
- `references/dashboard.md` — intelligent dashboard layout, data density, chart integration
- `references/aesthetic-selector.md` — how to choose an aesthetic contextually
- `references/mission-prompt-format.md` — exact format for Antigravity agent prompts
