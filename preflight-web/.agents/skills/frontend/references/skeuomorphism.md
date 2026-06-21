# Skeuomorphism — Design Reference

## Philosophy
Digital surfaces that remember the physical world. Textures are real: leather, brushed metal, paper, felt, wood. Light sources are consistent. Shadows have direction. Buttons depress. Knobs turn. The interface communicates through material metaphor. Modern skeuomorphism is not the flat-then-textured pastiche of iOS 6 — it's considered use of physicality to communicate affordance and warmth.

Skeuomorphism is the right aesthetic for: IoT companion apps, audio/instrument interfaces, note-taking apps, premium consumer products, calendar/planner apps, anything where tactile warmth builds trust.

---

## Canonical Token Set

```css
:root {
  /* Material base — choose ONE material direction */

  /* --- Option A: Brushed Aluminum / Premium Metal --- */
  --bg-base: #2a2a2a;
  --bg-surface: linear-gradient(145deg, #3a3a3a 0%, #222222 100%);
  --bg-inset: linear-gradient(145deg, #1e1e1e 0%, #2e2e2e 100%);

  /* --- Option B: Warm Paper / Leather --- */
  /* --bg-base: #f5f0e8; */
  /* --bg-surface: linear-gradient(145deg, #fdf8f0 0%, #ede8dc 100%); */
  /* --bg-inset: linear-gradient(145deg, #d9d3c7 0%, #e8e3d8 100%); */

  /* Accent */
  --accent: #d4831a;           /* warm amber/gold — works with both metal and paper */
  --accent-highlight: #f0a840;
  --accent-shadow: #9a5a0a;

  /* Typography */
  --text-primary: #f0ece4;
  --text-secondary: #a09a8e;
  --text-inverse: #1a1a1a;

  /* Spacing */
  --space-1: 4px; --space-2: 8px; --space-3: 12px; --space-4: 16px;
  --space-6: 24px; --space-8: 32px; --space-12: 48px; --space-16: 64px;

  /* Typography */
  --font-display: 'Playfair Display', 'Lora', serif;
  --font-body: 'Source Serif 4', 'Georgia', serif;
  --font-label: 'DM Serif Display', serif;
  --font-mono: 'Courier Prime', 'Courier New', monospace;

  /* Skeuo shadows — always directional; light source top-left */
  --shadow-raised: 
    inset 0 1px 0 rgba(255,255,255,0.15),
    0 4px 8px rgba(0,0,0,0.4),
    0 1px 2px rgba(0,0,0,0.6);
  --shadow-inset: 
    inset 0 2px 6px rgba(0,0,0,0.5),
    inset 0 1px 2px rgba(0,0,0,0.6),
    0 1px 0 rgba(255,255,255,0.08);
  --shadow-pressed:
    inset 0 3px 8px rgba(0,0,0,0.6),
    inset 0 1px 3px rgba(0,0,0,0.5);

  /* Motion — physical, weight-aware */
  --ease-physical: cubic-bezier(0.4, 1.6, 0.6, 1);  /* slight bounce */
  --ease-press: cubic-bezier(0.4, 0, 0.6, 1);
  --duration-fast: 80ms;
  --duration-base: 200ms;
}
```

---

## Typography Rules

- **Headings**: Playfair Display or Lora — classical serif, warm authority
- **Body**: Source Serif 4 — highly legible serif, works at all sizes
- **Labels/UI text**: DM Serif Display — elegant, not fussy
- Avoid sans-serif entirely unless it's a hybrid product
- Google Fonts: `@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700&family=Source+Serif+4:wght@400;600&display=swap');`

---

## Layout Rules

- **Consistent light source** — top-left, always. All shadows and highlights follow this.
- **Inset wells for input areas** — form fields, text areas look pressed into the surface
- **Raised surfaces for buttons** — using layered box-shadows, not flat color
- **Subtle textures** — noise, grain, or SVG texture on surfaces; not photographic
- **Generous border-radius** — matches physical objects (8–16px for cards, 4–8px for buttons)
- **Borders follow material** — lighter than surface on top-left, darker on bottom-right

```css
/* Metal knurling texture */
.metal-surface {
  background: var(--bg-surface);
  background-image: repeating-linear-gradient(
    0deg,
    transparent,
    transparent 2px,
    rgba(255,255,255,0.02) 2px,
    rgba(255,255,255,0.02) 4px
  );
}

/* Paper texture via SVG noise */
.paper-surface {
  background: #f5f0e8;
  background-image: url("data:image/svg+xml,...");  /* SVG noise filter */
}
```

---

## Component Patterns

### Raised Button
```css
.btn {
  font-family: var(--font-label);
  background: linear-gradient(145deg, #4a4a4a 0%, #2a2a2a 100%);
  border: 1px solid rgba(0,0,0,0.5);
  border-radius: 8px;
  color: var(--text-primary);
  padding: var(--space-3) var(--space-6);
  box-shadow: var(--shadow-raised);
  cursor: pointer;
  transition: box-shadow var(--duration-fast) var(--ease-press),
              transform var(--duration-fast) var(--ease-press);
  letter-spacing: 0.04em;
}
.btn:hover {
  box-shadow: var(--shadow-raised), 0 0 12px rgba(212,131,26,0.2);
}
.btn:active {
  box-shadow: var(--shadow-pressed);
  transform: translateY(1px);
}
```

### Inset Input Field
```css
.input {
  font-family: var(--font-mono);
  background: linear-gradient(145deg, #1e1e1e 0%, #2a2a2a 100%);
  border: 1px solid rgba(0,0,0,0.6);
  border-radius: 6px;
  color: var(--text-primary);
  padding: var(--space-3) var(--space-4);
  box-shadow: var(--shadow-inset);
  font-size: 0.875rem;
  outline: none;
  transition: box-shadow var(--duration-fast);
}
.input:focus {
  box-shadow: var(--shadow-inset), 0 0 0 2px var(--accent);
}
```

### Indicator LED
```css
.led {
  width: 10px; height: 10px;
  border-radius: 50%;
  background: radial-gradient(circle at 35% 35%, #6fef6f, #1a8c1a);
  box-shadow: 0 0 6px rgba(100,220,100,0.8), inset 0 1px 0 rgba(255,255,255,0.3);
}
.led.off {
  background: radial-gradient(circle at 35% 35%, #4a4a4a, #1e1e1e);
  box-shadow: inset 0 1px 2px rgba(0,0,0,0.5);
}
```

---

## Do / Don't

| ✅ DO | ❌ DON'T |
|---|---|
| Consistent top-left light source | Mixed shadow directions |
| Layered directional shadows | Flat drop shadows |
| Inset wells for inputs | Flat-bordered inputs |
| Serif typography throughout | Sans-serif fonts |
| Material texture on surfaces | Flat solid color surfaces |
| Physical affordance (buttons depress) | Hover-only feedback |
| Gradients that follow 3D form | Flat gradient strips |
| Subtle — not photorealistic | Photographs as UI surfaces |
