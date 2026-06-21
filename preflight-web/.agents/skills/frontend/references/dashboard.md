# Intelligent Dashboard Design — Reference

## Philosophy
Data should tell a story, not just appear. Intelligent dashboards are architected around information hierarchy: the most important insight is the biggest, first, most visible thing. Supporting data radiates outward from that anchor. Every pixel has a job. Whitespace is used intentionally — not generously, but precisely.

Intelligent dashboards are the right aesthetic for: analytics platforms, SaaS ops tools, business intelligence products, admin panels, real-time monitoring interfaces, executive reporting surfaces.

---

## Canonical Token Set

```css
:root {
  /* Dark dashboard base — industry standard; trust + focus */
  --bg-base: #0f1117;
  --bg-surface: #1a1d27;
  --bg-elevated: #232736;
  --bg-highlight: #2d3148;

  /* Accent system — dashboards CAN use a multi-color system for data encoding */
  --accent-primary: #4f8ef7;    /* primary interactive: links, active states, CTAs */
  --accent-success: #34d399;    /* positive delta, success states */
  --accent-warning: #fbbf24;    /* caution, mid-range alerts */
  --accent-danger:  #f87171;    /* negative delta, critical alerts */
  --accent-purple:  #a78bfa;    /* secondary data series */
  --accent-cyan:    #22d3ee;    /* tertiary data series */

  /* Typography */
  --text-primary: #e8eaf0;
  --text-secondary: #8b90a8;
  --text-tertiary: #555a72;
  --text-label: #6b7280;

  /* Borders */
  --border: rgba(255,255,255,0.08);
  --border-strong: rgba(255,255,255,0.15);

  /* Spacing — dashboard spacing is tighter than other aesthetics */
  --space-1: 4px; --space-2: 8px; --space-3: 12px; --space-4: 16px;
  --space-6: 24px; --space-8: 32px; --space-12: 48px;

  /* Typography */
  --font-display: 'Inter', 'DM Sans', sans-serif;   /* exception: Inter IS right for dashboards */
  --font-mono: 'JetBrains Mono', 'Fira Code', monospace;  /* for numbers/code */
  --font-label: 'DM Sans', sans-serif;

  /* Numeric rendering — always tabular for dashboards */
  --num-features: 'tnum' 1, 'kern' 0;

  /* Motion — data updates should feel instant but not jarring */
  --ease-data: cubic-bezier(0.4, 0, 0.2, 1);
  --duration-fast: 100ms;
  --duration-base: 200ms;
  --duration-chart: 600ms;

  /* Border radius — slight softness is acceptable in dashboards */
  --radius-sm: 6px;
  --radius: 10px;
  --radius-lg: 16px;

  /* Shadows */
  --shadow-card: 0 1px 3px rgba(0,0,0,0.4), 0 1px 2px rgba(0,0,0,0.3);
  --shadow-elevated: 0 4px 16px rgba(0,0,0,0.5);
}
```

---

## Typography Rules

- **Numbers**: Always monospace (`--font-mono`), tabular numeral rendering — data integrity depends on alignment
- **Labels / axis text**: `--font-label` at 0.6875rem–0.75rem, `--text-label` color
- **Headings / KPI values**: Large, bold — KPI values at 2rem–3.5rem using `--font-display`
- **Body text**: Rare in dashboards — keep prose minimal
- Inter is the correct choice here (exception to the general rule) — its number rendering at small sizes is unmatched for dense dashboards

---

## Layout Architecture

### The Dashboard Grid System

```
┌─────────────────────────────────────────────────────┐
│  SIDEBAR (240px fixed)  │  MAIN CONTENT AREA         │
│                         │  ┌───┬───┬───┬───┐        │
│  Nav                    │  │KPI│KPI│KPI│KPI│        │
│  filters                │  └───┴───┴───┴───┘        │
│  user profile           │  ┌─────────┬─────┐        │
│                         │  │ CHART   │TABLE│        │
│                         │  │ (large) │     │        │
│                         │  └─────────┴─────┘        │
│                         │  ┌──────────────────┐     │
│                         │  │  SECONDARY ROW    │     │
│                         │  └──────────────────┘     │
└─────────────────────────────────────────────────────┘
```

Rules:
- Sidebar: 240px (collapsed: 64px)
- KPI row: always first — 4 equal columns
- Primary chart: 60–66% width; supporting table: remainder
- Secondary row: 3 equal columns or 2 unequal (1/2 + 1/4 + 1/4)
- 16px gaps between all grid cells
- 24px padding inside cards

---

## Component Patterns

### KPI Metric Card
```jsx
// Props: { label, value, delta, trend, prefix, suffix }
// trend: 'up' | 'down' | 'flat'
.kpi-card {
  background: var(--bg-surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: var(--space-6);
  box-shadow: var(--shadow-card);
}
.kpi-value {
  font-family: var(--font-mono);
  font-size: 2rem;
  font-weight: 700;
  color: var(--text-primary);
  font-variant-numeric: tabular-nums;
  line-height: 1;
}
.kpi-delta[data-trend="up"]   { color: var(--accent-success); }
.kpi-delta[data-trend="down"] { color: var(--accent-danger); }
.kpi-delta[data-trend="flat"] { color: var(--text-secondary); }
.kpi-label {
  font-size: 0.6875rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--text-label);
  margin-bottom: var(--space-2);
}
```

### Data Table
```css
.data-table { width: 100%; border-collapse: collapse; }
.data-table th {
  font-size: 0.6875rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--text-label);
  border-bottom: 1px solid var(--border-strong);
  padding: var(--space-3) var(--space-4);
  text-align: left;
}
.data-table td {
  font-family: var(--font-mono);
  font-size: 0.8125rem;
  color: var(--text-primary);
  border-bottom: 1px solid var(--border);
  padding: var(--space-3) var(--space-4);
}
.data-table tr:hover td { background: var(--bg-elevated); }
```

### Sidebar Navigation
```css
.sidebar { width: 240px; background: var(--bg-surface); border-right: 1px solid var(--border); }
.nav-item {
  display: flex; align-items: center; gap: var(--space-3);
  padding: var(--space-3) var(--space-4);
  border-radius: var(--radius-sm);
  color: var(--text-secondary);
  font-size: 0.875rem;
  cursor: pointer;
  transition: background var(--duration-fast), color var(--duration-fast);
}
.nav-item:hover { background: var(--bg-elevated); color: var(--text-primary); }
.nav-item.active { background: rgba(79,142,247,0.15); color: var(--accent-primary); }
```

### Sparkline / Trend Line (Recharts config)
```jsx
<LineChart data={data} width="100%" height={48}>
  <Line 
    type="monotone" 
    dataKey="value" 
    stroke="var(--accent-primary)" 
    strokeWidth={2}
    dot={false}
    animationDuration={600}
    animationEasing="ease-out"
  />
</LineChart>
```

---

## Information Hierarchy Rules

1. **One hero number** — the most important KPI at the largest size on screen
2. **Delta always visible** — every metric must show change (%, abs, trend arrow)
3. **Trend before detail** — sparkline or mini-chart before full data table
4. **Status color = semantic** — green/yellow/red mean the same thing everywhere
5. **Empty states** — every chart must have a designed empty and loading state
6. **Time range control** — always provide: 1D / 7D / 30D / 90D / custom

---

## Chart Integration (Recharts / D3 / Chart.js)

Always specify:
- `animationDuration: 600` and `animationEasing: "ease-out"` for initial render
- Tooltip: dark background (`var(--bg-elevated)`), mono font, 1px border
- Axis: `tick: { fill: 'var(--text-label)', fontSize: 11 }`, no axis lines (use gridlines only)
- Gridlines: `stroke: 'var(--border)'`, `strokeDasharray: '4 4'`
- Colors: use the accent system above for consistent data encoding across charts

---

## Do / Don't

| ✅ DO | ❌ DON'T |
|---|---|
| Monospace numerals with tabular rendering | Proportional fonts for numbers |
| Semantic color (green/yellow/red) | Decorative color on data |
| KPI row first, always | Burying key metrics below fold |
| Delta on every metric | Metrics without context |
| Designed empty + loading states | Hiding components until data loads |
| Consistent 16px grid gaps | Variable gutter widths |
| Sidebar nav, not top nav | Top navigation for dense dashboards |
| Dark mode default | Light mode for data-dense UIs |
