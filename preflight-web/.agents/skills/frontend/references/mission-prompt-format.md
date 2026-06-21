# Antigravity Mission Prompt Format

Antigravity agents respond to high-level task descriptions, not line-by-line instructions.
A well-formed mission prompt gives the agent: context, constraints, exact visual spec, file structure, and verification criteria.

Use **Plan mode** for complex multi-file tasks. Use **Fast mode** for isolated components.

---

## Template

```
MODE: [Plan | Fast]

## Mission
[One sentence: what you're building and for whom]

## Stack
- Framework: [React 18 + Vite | Next.js 14 | Vanilla HTML/CSS/JS]
- Styling: [Tailwind CSS | CSS Modules | plain CSS custom properties]
- Fonts: [Google Fonts URLs or self-hosted paths]
- Icons: [Lucide | Heroicons | none]
- State: [useState only | Zustand | none]

## Aesthetic
[Aesthetic name + 1-2 sentence execution brief]

## Design Tokens
[Paste the full token block here — CSS custom properties]

## Screens / Components to Build
1. [Component/screen name] — [brief description]
2. ...

## File Structure
src/
  components/
    [ComponentName].jsx
  styles/
    tokens.css
    [component].module.css (if CSS Modules)
  pages/ (if applicable)
    [page].jsx

## Detailed Spec Per Component

### [ComponentName]
- Layout: [describe grid/flex structure]
- States: [default, hover, active, disabled, loading, empty, error]
- Interactions: [click, hover, focus, scroll triggers]
- Responsive: [mobile breakpoint behavior]
- Animations: [describe transitions and timing]
- Data: [static mockup | props interface | API endpoint]

## Typography
- Heading: [font name, weight, size scale]
- Body: [font name, weight, size]
- Mono (if applicable): [font name]

## Color Usage
- Background: [token name] — [hex]
- Surface: [token name] — [hex]
- Accent: [token name] — [hex] — used for [CTA buttons, active states, etc.]
- Text primary: [token name] — [hex]
- Text secondary: [token name] — [hex]
- Border: [token name] — [hex]

## Motion
- Easing: [e.g., cubic-bezier(0.16, 1, 0.3, 1)]
- Duration scale: fast 100ms / base 200ms / slow 400ms
- Key transitions: [hover scale, modal open, page load stagger]

## Accessibility
- Minimum contrast: 4.5:1 on all body text
- Focus rings: visible, 2px offset, accent color
- Keyboard navigation: [tab order notes if non-obvious]

## VERIFY IN BROWSER
- [ ] [specific visual check 1]
- [ ] [specific visual check 2]
- [ ] [mobile layout check]
- [ ] [interaction / hover check]
- [ ] [empty or loading state visible]
```

---

## Example — Compact Single Component

```
MODE: Fast

## Mission
Build a data metric card component for an analytics dashboard.

## Stack
- Framework: React 18 + Vite
- Styling: CSS custom properties (inline in component)
- Fonts: Already loaded globally

## Aesthetic
Neo-Brutalism — hard 2px black border, no border-radius, Bebas Neue heading, 
chartreuse accent on dark surface.

## Design Tokens
(paste token block)

## Component: MetricCard
Props: { label: string, value: string, delta: string, trend: 'up'|'down'|'flat' }
States: default, hover (slight translateY(-2px)), loading (skeleton)
Interactions: hover lifts card, delta text color changes by trend
Responsive: full width on mobile

## VERIFY IN BROWSER
- [ ] Card renders with hard border and zero radius
- [ ] Hover state triggers translateY
- [ ] Trend 'up' shows green delta, 'down' shows red
- [ ] Loading skeleton uses same border style
```

---

## Notes on Writing Good Mission Prompts

- **Specificity beats brevity.** The agent will hallucinate font choices, spacing, and colors if you don't specify them. Every ambiguity costs a browser iteration.
- **Always include the token block.** Don't say "use the project's tokens" — paste them inline. The agent's context window resets per task.
- **Name every state.** If you don't specify an empty state, the agent will skip it. Antigravity agents are literal.
- **Verification checklist = the agent's quality bar.** Make it precise. "Looks good" is not a checkable criterion.
