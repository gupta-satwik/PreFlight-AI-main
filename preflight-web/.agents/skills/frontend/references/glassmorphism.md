# Glassmorphism — Design Reference

## Philosophy
Light diffracts through glass. Surfaces are frosted, translucent, layered. The world bleeds through the UI — but controlled. Glassmorphism is not blur-everything; it's carefully stacked depth where background, frosted panel, and content form three distinct Z-layers. Used wrongly it's a cliché. Used well it's atmospheric and premium.

Glassmorphism is the right aesthetic for: creative platforms, music/audio apps, weather apps, premium SaaS, portfolio sites, mobile-first consumer apps, anything where "feel" matters as much as "function."

---

## Canonical Token Set

```css
:root {
  /* Base — rich dark gradient that bleeds through glass */
  --bg-base: #0d0d1a;
  --bg-gradient: linear-gradient(135deg, #0d0d1a 0%, #1a0a2e 50%, #0a1628 100%);

  /* Glass surfaces */
  --glass-bg: rgba(255, 255, 255, 0.06);
  --glass-bg-hover: rgba(255, 255, 255, 0.10);
  --glass-bg-strong: rgba(255, 255, 255, 0.14);
  --glass-border: rgba(255, 255, 255, 0.15);
  --glass-border-strong: rgba(255, 255, 255, 0.25);
  --glass-blur: 20px;
  --glass-blur-heavy: 40px;
  --glass-radius: 16px;
  --glass-radius-sm: 10px;
  --glass-radius-lg: 24px;

  /* Accent — always luminous, punches through the frosted layer */
  --accent: #a78bfa;          /* violet */
  --accent-glow: rgba(167, 139, 250, 0.4);
  --accent-alt: #38bdf8;      /* sky blue */
  /* Alternatives: #f472b6 (pink), #34d399 (emerald), #fb923c (amber) */

  /* Typography */
  --text-primary: rgba(255, 255, 255, 0.92);
  --text-secondary: rgba(255, 255, 255, 0.55);
  --text-tertiary: rgba(255, 255, 255, 0.30);

  /* Spacing */
  --space-1: 4px; --space-2: 8px; --space-3: 12px; --space-4: 16px;
  --space-6: 24px; --space-8: 32px; --space-12: 48px; --space-16: 64px;

  /* Typography */
  --font-display: 'Syne', 'Outfit', sans-serif;
  --font-body: 'DM Sans', 'Plus Jakarta Sans', sans-serif;
  --font-mono: 'JetBrains Mono', monospace;

  /* Motion — glass feels fluid, springy */
  --ease-glass: cubic-bezier(0.34, 1.56, 0.64, 1);   /* slight spring */
  --ease-smooth: cubic-bezier(0.4, 0, 0.2, 1);
  --duration-fast: 120ms;
  --duration-base: 250ms;
  --duration-slow: 500ms;
}
```

---

## Typography Rules

- **Display**: Syne or Outfit — modern, wide, geometric
- **Body**: DM Sans or Plus Jakarta Sans — clean, legible on translucent surfaces
- Slightly higher line-height than normal (`1.6` body, `1.2` headings) for readability on blurred backgrounds
- Google Fonts: `@import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Sans:wght@400;500;600&display=swap');`

---

## Layout Rules

- **Three Z-layers**: background gradient → ambient light orbs → frosted glass panels
- **Border-radius** — generous (16px default, 24px for prominent panels)
- **Borders** — subtle, white with low opacity (`rgba(255,255,255,0.15)`)
- **backdrop-filter: blur()** — the defining property; always on `.glass` containers
- **Noise texture overlay** — subtle grain prevents glass from looking flat:

```css
.glass {
  background: var(--glass-bg);
  backdrop-filter: blur(var(--glass-blur));
  -webkit-backdrop-filter: blur(var(--glass-blur));
  border: 1px solid var(--glass-border);
  border-radius: var(--glass-radius);
}

/* Ambient orbs — placed in the background layer, blurred to 120px+ */
.orb {
  position: absolute;
  border-radius: 50%;
  filter: blur(80px);
  opacity: 0.4;
  pointer-events: none;
  z-index: 0;
}
.orb-purple { background: #a78bfa; width: 400px; height: 400px; top: -100px; left: -100px; }
.orb-blue   { background: #38bdf8; width: 300px; height: 300px; bottom: 50px; right: 50px; }

/* Grain overlay */
.noise::after {
  content: '';
  position: absolute; inset: 0;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.03'/%3E%3C/svg%3E");
  border-radius: inherit; pointer-events: none;
}
```

---

## Component Patterns

### Glass Card
```css
.card {
  background: var(--glass-bg);
  backdrop-filter: blur(var(--glass-blur));
  border: 1px solid var(--glass-border);
  border-radius: var(--glass-radius);
  padding: var(--space-6);
  transition: background var(--duration-base) var(--ease-smooth),
              border-color var(--duration-base) var(--ease-smooth),
              transform var(--duration-base) var(--ease-glass);
}
.card:hover {
  background: var(--glass-bg-hover);
  border-color: var(--glass-border-strong);
  transform: translateY(-4px);
}
```

### Button (primary)
```css
.btn-primary {
  background: var(--accent);
  color: #fff;
  border: none;
  border-radius: 10px;
  padding: var(--space-3) var(--space-6);
  font-family: var(--font-body);
  font-weight: 600;
  box-shadow: 0 0 24px var(--accent-glow);
  transition: box-shadow var(--duration-base), transform var(--duration-fast) var(--ease-glass);
}
.btn-primary:hover {
  box-shadow: 0 0 40px var(--accent-glow);
  transform: scale(1.03);
}
```

### Button (ghost / glass)
```css
.btn-ghost {
  background: var(--glass-bg);
  backdrop-filter: blur(10px);
  border: 1px solid var(--glass-border);
  border-radius: 10px;
  color: var(--text-primary);
  padding: var(--space-3) var(--space-6);
  font-weight: 500;
  transition: background var(--duration-fast), border-color var(--duration-fast);
}
.btn-ghost:hover {
  background: var(--glass-bg-hover);
  border-color: var(--glass-border-strong);
}
```

---

## Do / Don't

| ✅ DO | ❌ DON'T |
|---|---|
| Rich dark gradient as base | White or solid flat backgrounds |
| Ambient colored orbs behind panels | No background — glass with no context |
| Subtle white border on glass surfaces | Thick or opaque borders |
| Luminous accent with glow effect | Muted, desaturated accents |
| Generous border-radius (16px+) | Sharp corners |
| Slight spring on hover transforms | Linear easing |
| Noise grain over glass | Perfectly smooth, fake-looking glass |
| 3 distinct Z-layers | Everything on one plane |

---

## Accent Palettes

| Mood | Accent | Glow |
|---|---|---|
| Violet / cosmic | `#a78bfa` | `rgba(167,139,250,0.4)` |
| Cyan / aqua | `#38bdf8` | `rgba(56,189,248,0.4)` |
| Rose / romantic | `#f472b6` | `rgba(244,114,182,0.4)` |
| Emerald / nature | `#34d399` | `rgba(52,211,153,0.35)` |
| Amber / warm | `#fb923c` | `rgba(251,146,60,0.35)` |
