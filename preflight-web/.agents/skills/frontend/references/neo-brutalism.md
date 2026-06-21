# Neo-Brutalism — Design Reference

## Philosophy
Raw, honest, anti-polish. Structure is the decoration. Borders are borders — not shadows, not gradients, not blur. Typography is bold and unapologetic. Color is used as a weapon: one blazing accent against a dark or off-white field. Nothing is rounded. Nothing is soft. Everything has mass.

Neo-Brutalism is the right aesthetic for: developer tools, hackathon platforms, underground brands, data explorers, portfolio sites with a POV, edtech platforms that want to feel electric.

---

## Canonical Token Set

```css
:root {
  /* Backgrounds */
  --bg-base: #0a0a0a;
  --bg-surface: #111111;
  --bg-elevated: #1a1a1a;

  /* Accent — pick ONE, use it everywhere interactive */
  --accent: #c8ff00;          /* chartreuse — electric, high contrast */
  /* Alternatives: #ff3b00 (red-orange), #00e5ff (cyan), #ff006e (hot pink) */
  --accent-muted: #9abf00;

  /* Typography */
  --text-primary: #f0f0f0;
  --text-secondary: #888888;
  --text-inverse: #0a0a0a;

  /* Borders */
  --border: #f0f0f0;
  --border-heavy: 3px solid var(--border);
  --border-light: 1px solid var(--border);
  --border-accent: 3px solid var(--accent);

  /* Spacing (4px base) */
  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-6: 24px;
  --space-8: 32px;
  --space-12: 48px;
  --space-16: 64px;

  /* Typography scale */
  --font-display: 'Bebas Neue', 'Impact', sans-serif;
  --font-mono: 'Space Mono', 'Courier New', monospace;
  --font-body: 'Space Grotesk', 'IBM Plex Sans', sans-serif;

  --text-xs: 0.75rem;
  --text-sm: 0.875rem;
  --text-base: 1rem;
  --text-lg: 1.25rem;
  --text-xl: 1.5rem;
  --text-2xl: 2rem;
  --text-4xl: 3.5rem;
  --text-6xl: 6rem;

  /* Motion */
  --ease-snap: cubic-bezier(0.16, 1, 0.3, 1);
  --duration-fast: 80ms;
  --duration-base: 150ms;
  --duration-slow: 300ms;

  /* Shadows — Neo-Brutalism uses hard offset shadows, not blurred */
  --shadow-sm: 2px 2px 0px var(--border);
  --shadow-md: 4px 4px 0px var(--border);
  --shadow-lg: 6px 6px 0px var(--border);
  --shadow-accent: 4px 4px 0px var(--accent);
}
```

---

## Typography Rules

- **Headings**: Bebas Neue (display) — all caps, wide tracking, large sizes
- **Body / Labels**: Space Mono or IBM Plex Mono — monospace body text is a Neo-Brutalism signature
- **Numbers / Data**: Space Mono — tabular numerals
- Google Fonts import: `@import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Space+Mono:wght@400;700&display=swap');`

---

## Layout Rules

- **No border-radius** — `border-radius: 0` on everything
- **Thick borders** — 2px minimum, 3px standard
- **Hard offset shadows** — `box-shadow: 4px 4px 0 #f0f0f0` — no blur radius ever
- **Grid over flex** — CSS Grid for all layout containers
- **Visible structure** — borders on cards, sections, inputs — structure is visible
- **Diagonal / hatching textures** — use SVG background patterns as surface texture

```css
/* Diagonal hatch texture */
.hatch-bg {
  background-image: repeating-linear-gradient(
    45deg,
    transparent,
    transparent 4px,
    rgba(240,240,240,0.05) 4px,
    rgba(240,240,240,0.05) 5px
  );
}
```

---

## Component Patterns

### Button
```css
.btn {
  font-family: var(--font-mono);
  font-size: var(--text-sm);
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  padding: var(--space-3) var(--space-6);
  background: var(--accent);
  color: var(--text-inverse);
  border: 3px solid var(--border);
  border-radius: 0;
  box-shadow: var(--shadow-md);
  cursor: pointer;
  transition: transform var(--duration-fast) var(--ease-snap),
              box-shadow var(--duration-fast) var(--ease-snap);
}
.btn:hover {
  transform: translate(-2px, -2px);
  box-shadow: 6px 6px 0px var(--border);
}
.btn:active {
  transform: translate(2px, 2px);
  box-shadow: 2px 2px 0px var(--border);
}
```

### Card
```css
.card {
  background: var(--bg-surface);
  border: var(--border-heavy);
  box-shadow: var(--shadow-md);
  padding: var(--space-6);
  border-radius: 0;
  transition: transform var(--duration-base) var(--ease-snap),
              box-shadow var(--duration-base) var(--ease-snap);
}
.card:hover {
  transform: translate(-3px, -3px);
  box-shadow: 7px 7px 0px var(--border);
}
```

### Input
```css
.input {
  font-family: var(--font-mono);
  background: var(--bg-base);
  border: var(--border-heavy);
  border-radius: 0;
  padding: var(--space-3) var(--space-4);
  color: var(--text-primary);
  font-size: var(--text-sm);
  outline: none;
  transition: border-color var(--duration-fast);
}
.input:focus {
  border-color: var(--accent);
  box-shadow: 3px 3px 0 var(--accent);
}
```

### Tag / Badge
```css
.tag {
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  padding: 2px var(--space-2);
  border: 2px solid var(--accent);
  color: var(--accent);
  border-radius: 0;
  display: inline-block;
}
```

---

## Do / Don't

| ✅ DO | ❌ DON'T |
|---|---|
| Hard offset shadows (no blur) | Drop shadows with blur |
| All-caps headings in Bebas | Sentence case in rounded fonts |
| Monospace body text | Inter, Roboto, system fonts |
| One blazing accent color | Multiple saturated colors |
| Zero border-radius everywhere | Any rounding, anywhere |
| Visible grid structure | Floating cards with no borders |
| Diagonal hatch textures | Gradient meshes or glassmorphism |
| Bold, wide letter-spacing | Tight tracking on display type |

---

## Accent Color Variants

| Mood | Accent |
|---|---|
| Electric / dev tool | `#c8ff00` chartreuse |
| Danger / urgent | `#ff3b00` red-orange |
| Cyber / futuristic | `#00e5ff` electric cyan |
| Hype / nightclub | `#ff006e` hot pink |
| Terminal / matrix | `#00ff41` matrix green |
