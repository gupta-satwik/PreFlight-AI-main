# Stark Black & White — Design Reference

## Philosophy
Maximum contrast. Zero decoration. Every element earns its place. Stark B&W is editorial minimalism taken to its logical extreme — a UI that could be printed in a newspaper or projected on a wall and be equally at home. It requires extreme typographic precision because type IS the design. One accent color (optional) is permitted as a surgical tool only.

Stark B&W is the right aesthetic for: luxury brands, premium editorial content, financial/legal products, portfolio sites with authority, healthcare interfaces, anything where trust and legibility are the entire brief.

---

## Canonical Token Set

```css
:root {
  /* Core — two values only */
  --black: #0a0a0a;
  --white: #fafafa;

  /* Grays — used sparingly */
  --gray-100: #f0f0f0;
  --gray-200: #e0e0e0;
  --gray-400: #999999;
  --gray-600: #555555;
  --gray-800: #222222;

  /* Accent — optional; used max twice per screen if present */
  --accent: #d4001a;          /* editorial red — only option for stark B&W */
  /* Alternative: none. If the brand needs color, this isn't the right aesthetic. */

  /* Surfaces — light mode default; dark mode variant below */
  --bg-base: var(--white);
  --bg-surface: var(--white);
  --bg-invert: var(--black);
  --text-primary: var(--black);
  --text-secondary: var(--gray-600);
  --border-color: var(--black);
  --border-light: var(--gray-200);

  /* Dark mode variant */
  /* --bg-base: var(--black); --text-primary: var(--white); --border-color: var(--white); */

  /* Spacing — generous; whitespace IS the design */
  --space-1: 4px; --space-2: 8px; --space-3: 12px; --space-4: 16px;
  --space-6: 24px; --space-8: 32px; --space-12: 48px; --space-16: 64px;
  --space-24: 96px; --space-32: 128px;

  /* Typography */
  --font-display: 'Cormorant Garamond', 'Playfair Display', serif;
  --font-serif: 'Libre Baskerville', 'Georgia', serif;
  --font-sans: 'Epilogue', 'Barlow', sans-serif;
  --font-mono: 'Courier Prime', monospace;

  /* Type scale — stark B&W uses extreme size contrasts */
  --text-xs: 0.6875rem;
  --text-sm: 0.8125rem;
  --text-base: 1rem;
  --text-lg: 1.125rem;
  --text-xl: 1.5rem;
  --text-2xl: 2rem;
  --text-4xl: 4rem;
  --text-6xl: 7rem;
  --text-8xl: 11rem;

  /* Motion — restrained; nothing cute */
  --ease-stark: cubic-bezier(0.4, 0, 0.2, 1);
  --duration-fast: 100ms;
  --duration-base: 200ms;
  --duration-slow: 400ms;
}
```

---

## Typography Rules

- **Display**: Cormorant Garamond — high contrast stroke, elegant, extreme sizes (4rem–11rem)
- **Body**: Libre Baskerville — authoritative, highly legible serif
- **UI labels**: Epilogue or Barlow — geometric sans for captions, labels, navigation
- **Code**: Courier Prime — if needed; fits the editorial tone
- Type size CONTRAST is the primary compositional tool — pair 11rem display with 0.8rem caption
- Tracking: display type at `letter-spacing: -0.04em` (tight); labels at `0.12em` (airy)
- Line height: `1.0–1.1` for display, `1.55–1.65` for body
- Google Fonts: `@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@300;400;600;700&family=Libre+Baskerville:wght@400;700&family=Epilogue:wght@400;500;700&display=swap');`

---

## Layout Rules

- **Grid lines are sacred** — use a strict 12-column grid; align everything
- **Asymmetry with discipline** — unequal columns (1/3 + 2/3) over equal halves
- **Horizontal rules** — `border-top: 1px solid var(--black)` is a primary compositional element
- **No rounded corners** — `border-radius: 0` everywhere
- **No drop shadows** — none. Not soft, not hard. Nothing.
- **Generous whitespace** — 96px+ vertical rhythm between sections
- **Inverted blocks** — `background: var(--black); color: var(--white)` for high-impact sections

```css
/* Rule line — core layout primitive */
.rule { border: none; border-top: 1px solid var(--black); margin: 0; }
.rule-heavy { border-top: 3px solid var(--black); }

/* Inverted section */
.invert { background: var(--black); color: var(--white); }
.invert .rule { border-color: var(--white); }
```

---

## Component Patterns

### Button
```css
.btn {
  font-family: var(--font-sans);
  font-size: var(--text-xs);
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.15em;
  padding: var(--space-3) var(--space-8);
  background: var(--black);
  color: var(--white);
  border: 2px solid var(--black);
  border-radius: 0;
  cursor: pointer;
  transition: background var(--duration-fast) var(--ease-stark),
              color var(--duration-fast) var(--ease-stark);
}
.btn:hover {
  background: var(--white);
  color: var(--black);
}

/* Ghost variant */
.btn-ghost {
  background: transparent;
  color: var(--black);
}
.btn-ghost:hover { background: var(--black); color: var(--white); }
```

### Card (no chrome — content only)
```css
.card {
  border-top: 2px solid var(--black);
  padding-top: var(--space-6);
  /* No background, no border around sides, no shadow */
}
```

### Input
```css
.input {
  font-family: var(--font-sans);
  font-size: var(--text-sm);
  background: transparent;
  border: none;
  border-bottom: 2px solid var(--black);
  border-radius: 0;
  padding: var(--space-3) 0;
  color: var(--text-primary);
  width: 100%;
  outline: none;
  transition: border-color var(--duration-fast);
}
.input:focus { border-bottom-color: var(--accent, var(--black)); }
```

### Table (editorial data grid)
```css
.table { width: 100%; border-collapse: collapse; }
.table th {
  font-family: var(--font-sans);
  font-size: var(--text-xs);
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  border-bottom: 2px solid var(--black);
  padding: var(--space-3) var(--space-4);
  text-align: left;
}
.table td {
  font-family: var(--font-serif);
  font-size: var(--text-sm);
  border-bottom: 1px solid var(--gray-200);
  padding: var(--space-4);
}
.table tr:hover td { background: var(--gray-100); }
```

---

## Do / Don't

| ✅ DO | ❌ DON'T |
|---|---|
| Extreme type size contrast | Uniform type sizes |
| Strict grid alignment | Fluid, "organic" layouts |
| Horizontal rules as composition | Decorative ornaments |
| Inverted (black) sections | Color backgrounds |
| Generous whitespace | Crowded layouts |
| Bottom-border inputs | Boxed or rounded inputs |
| Editorial red accent (sparingly) | Multiple accent colors |
| `border-radius: 0` everywhere | Any rounding |
| `font-weight: 300` or `700` — extremes | Mid-weights (400/500 only) |
