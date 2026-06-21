# Aesthetic Selector — Contextual Decision Logic

When the user gives no explicit style direction, use this decision tree to pick the right aesthetic. State your choice and reasoning before generating output.

---

## Decision Tree

### 1. What is the product category?

| Product | Strong signal toward |
|---|---|
| Developer tool, CLI wrapper, code editor, API explorer | Neo-Brutalism |
| Creative platform, portfolio, music/media app | Glassmorphism or Stark B&W |
| Finance app, banking, insurance, legal | Stark B&W or Intelligent Dashboard |
| Productivity tool, SaaS, internal ops tool | Intelligent Dashboard |
| IoT device interface, physical product companion app | Skeuomorphism |
| Luxury/fashion/editorial | Stark B&W |
| Data-heavy analytics, metrics platform | Intelligent Dashboard |
| Gaming, entertainment | Neo-Brutalism or Glassmorphism |
| Edtech, learning platform | Glassmorphism (friendly) or Neo-Brutalism (bold/engaging) |
| Healthcare, medical | Stark B&W (clinical trust) |

### 2. Who is the audience?

| Audience | Modifier |
|---|---|
| Developers / technical users | +Neo-Brutalism |
| General consumers | -Skeuomorphism, +Glassmorphism |
| Enterprise / executives | +Intelligent Dashboard, +Stark B&W |
| Creatives / designers | Any, but Glassmorphism or Stark B&W |
| Students | +Glassmorphism, +Neo-Brutalism |

### 3. What is the data density?

| Density | Modifier |
|---|---|
| High (tables, charts, metrics, real-time) | +Intelligent Dashboard; avoid Skeuomorphism |
| Medium (cards, lists, forms) | Any |
| Low (landing pages, marketing, editorial) | Glassmorphism, Stark B&W, or Neo-Brutalism |

### 4. What is the brand tone?

| Tone | Modifier |
|---|---|
| Raw, unpolished, anti-corporate | +Neo-Brutalism |
| Futuristic, translucent, ethereal | +Glassmorphism |
| Warm, tactile, analog | +Skeuomorphism |
| Authoritative, premium, minimal | +Stark B&W |
| Intelligent, structured, data-driven | +Intelligent Dashboard |

---

## Combination Rules

Some tasks warrant blending:
- **Neo-Brutalism + Intelligent Dashboard** — dev-tool dashboards; raw grid + data density
- **Glassmorphism + Stark B&W** — premium dark UI with frosted overlays
- **Stark B&W + Intelligent Dashboard** — executive analytics; monochrome + data hierarchy

Never blend Skeuomorphism with Neo-Brutalism — they conflict at a fundamental philosophy level.

---

## Output format for aesthetic decision

Always state your choice like this before generating code:

```
AESTHETIC DECISION: Neo-Brutalism
REASON: Developer-facing API explorer tool — technical audience, raw data output, 
anti-polish bias signals Neo-Brutalism. Hard borders, monospace type, 
chartreuse or red accent on dark background.
```
