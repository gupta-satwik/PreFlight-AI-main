# Preflight — Demo & Frontend

## Demo Mode Implementation

The demo on `preflight.dev` must be resilient regardless of Verdaccio, Render cold start, or Gemini rate limits.

**Strategy**: Pre-seed a fixed demo scan in MongoDB at startup. When `POST /analyze` receives `demo: true`
(or the package is `axios` + versions `1.7.9 → 1.7.10`), return the seeded result with artificial per-signal
delays (500ms, 700ms, 600ms, 900ms) to make the UI animation feel real. Gemini is NOT called during demo mode.

**Demo seed document**: Fixed scan_id `64a7f3e2b1c4d5e6f7a8b9c0`, BLOCK verdict, confidence 0.94, all 4 signals
flagged, attack_pattern `npm_account_hijack_rat_deployment`. Seeded via `seed_demo_data()` in the FastAPI lifespan startup.

**Render cold start**: Keep-alive cron pings `GET /health` every 14 minutes (cron-job.org, free tier).

**Gemini rate limits**: Gemini 2.5 Flash: 15 RPM free. Use Flash for all real scans. Pro only for BLOCK confirmation (parallel call).

---

## Demo Scenario — The Axios Attack

```
Package:      axios
Old version:  1.7.9  (clean)
New version:  1.7.10 (malicious — served from Verdaccio mock OR demo mode)

Expected signals:
  script_diff.flagged   = true  (new postinstall hook)
  ast_scan.flagged      = true  (outbound http call in postinstall)
  maintainer.flagged    = true  (provenance attestation removed)
  llm_reasoning.flagged = true  (BLOCK)

Expected verdict: BLOCK, confidence >= 0.90, attack_pattern: npm_account_hijack_rat_deployment

Demo flow:
  1. Open /demo page on preflight.dev
  2. Click "Run Preflight analysis" (axios 1.7.9 → 1.7.10 pre-filled)
  3. 4 SignalRows animate in sequentially with staggered timing
  4. Verdict card drops: BLOCK 94%
  5. PR comment preview shown below
  6. [Optional] Show real GitHub PR with the action comment
```

---

## Frontend Spec

### Aesthetic: Neo-Brutalist Terminal

Security tool for developers. High contrast. Hard corners. No soft shadows. No gradients. War room aesthetic.

### Design Tokens

```css
--bg-primary:     #0A0A0A
--bg-surface:     #111111
--bg-elevated:    #1A1A1A
--border:         #2A2A2A
--border-strong:  #404040
--text-primary:   #F0F0F0
--text-secondary: #888888
--text-muted:     #555555
--accent-pass:    #00FF88
--accent-warn:    #FFB800
--accent-block:   #FF3B30
--accent-blue:    #4A9EFF
--font-mono:    'JetBrains Mono', monospace
--font-sans:    'Inter', sans-serif
--font-display: 'Space Grotesk', sans-serif
```

### Pages

**`/` Landing**
- Hero: "The axios attack lasted 3 hours." / "70M weekly downloads. Zero tools caught it." / "Preflight would have blocked it in 30 seconds."
- CTA: "See it live" → /demo
- Install snippet with copy button (`uses: Javeria-taj/preflight-ai/preflight-action@v1.0.0`)
- Live community stats — 3 StatCounters computed from `getScans(1, 100)`: repos protected (unique), scans completed, threats blocked
- 4-signal grid

**`/dashboard`**
- 70% live scan feed / 30% sidebar
- Feed = backend scans (polled every 10s via `getScans`) **merged** with GitHub Security Advisory data (fetched once on mount via `getAdvisoryFeed`), combined via `React.useMemo`, sorted by `scannedAt` descending
- Advisory source: `https://api.github.com/advisories?type=reviewed&ecosystem=npm&per_page=25` — public, CORS-enabled, 60 req/hr unauthenticated; severity maps to BLOCK (critical/high) or WARN (medium/low)
- ScanCard: collapsed 72px, click to expand → signal pills + confidence bar; advisory items show "View advisory ↗" external link; real scans show "View full scan →" internal link
- New backend cards slide in at top in real time
- Sidebar: Top Threats (live), Verdict Distribution histogram, Today's Stats (real counts — SCANS from backend feed, BLOCKED count, IN FEED total, P50 latency computed from actual `duration_ms`), Try demo link

**`/demo` ← Most important for hackathon**
- Pre-filled locked form: axios 1.7.9 → 1.7.10 + label "The exact attack from March 31, 2026"
- "Run Preflight analysis" button → calls POST /analyze with `demo: true`
- 4 SignalRows animate in sequentially (150ms stagger): pending → analyzing → flagged/clear
- Verdict card drops: BLOCK, 94%, Gemini summary, attack_pattern
- PR comment preview below
- No GitHub account required

**`/scans/:id`**
- Full drill-down. PR comments link here. Shareable.
- Verdict header + Gemini summary + confidence bar
- 4 expandable signal cards with full detail including actual script code block

### Component Library

| Component | Key Props | Notes |
|---|---|---|
| VerdictBadge | verdict: "PASS"\|"WARN"\|"BLOCK" | Monospace, all-caps, 1px border, bg tint |
| ScanCard | scan object | 72px collapsed, click to expand |
| SignalPill | name, flagged: bool | Green dot (clear) / red dot (flagged) |
| ConfidenceBar | confidence: 0-1 | 4px height, color by threshold |
| InstallSnippet | code, language | Dark block, copy button |
| StatCounter | value, label | Large mono number, count-up animation |
| SignalRow | name, status, reason | pending→analyzing→flagged/clear states |
| LivePulse | — | CSS only, green pulse dot, 2s loop |
