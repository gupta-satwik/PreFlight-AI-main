# Preflight — Project Overview

## What Is Preflight

**Preflight** is an AI-powered npm supply chain security agent that runs as a GitHub Action.
It intercepts dependency upgrades on pull requests and detects malicious packages
*before* they run — catching novel attacks that CVE-based tools like `npm audit`,
Snyk, and Dependabot completely miss.

**The real-world anchor**: On March 31, 2026, a North Korean state actor (Sapphire Sleet)
hijacked the `axios` npm account (70M+ weekly downloads) and shipped a RAT via a
legitimate-looking version bump. `npm audit` missed it. Snyk missed it. Dependabot missed it.
Because the package was legitimately signed and had no CVE. Preflight would have caught it
in under 30 seconds through behavioral analysis.

---

## Hackathon Context

- **Event**: NMIT Hacks, May 8–10, 2026 (48 hours)
- **Track**: AI & ML
- **Team**: 2 — Rafi (backend, this repo), teammate (frontend dashboard)
- **Judge pitch**: 3 minutes + live demo
- **Winning criteria**: Real incident anchor, live demo, one-line install

---

## Repo Structure

```
preflight/
├── preflight-action/              # GitHub Action (TypeScript)
│   ├── src/
│   │   ├── index.ts               # Entrypoint: inputs → API → PR comment
│   │   ├── config/env.ts          # Zod-validated env vars
│   │   ├── adapters/
│   │   │   ├── analysis-api.ts    # POST /analyze client
│   │   │   └── github.ts          # Post PR comment, set status check
│   │   ├── services/lockfile.ts   # Parse package-lock.json diff
│   │   └── errors/index.ts
│   ├── action.yml
│   └── package.json
│
├── preflight-api/                 # FastAPI analysis service (Python)
│   ├── app/
│   │   ├── main.py                # App init, lifespan, /health
│   │   ├── config/settings.py     # pydantic-settings (all env vars)
│   │   ├── routers/
│   │   │   ├── analyze.py         # POST /analyze
│   │   │   ├── scans.py           # GET /scans, GET /scans/:id
│   │   │   └── packages.py        # GET /packages/:name/threat, GET /packages/top-threats
│   │   ├── services/
│   │   │   ├── script_diff.py     # Signal 1 — tarball fetch + hook diff
│   │   │   ├── ast_scanner.py     # Signal 2 — shell regex + acorn subprocess
│   │   │   ├── maintainer.py      # Signal 3 — npm registry, provenance check
│   │   │   └── gemini.py          # Signal 4 — Gemini API, structured JSON
│   │   ├── db/
│   │   │   ├── client.py          # MongoDB motor async client (lifespan managed)
│   │   │   ├── scans.py           # Scans collection CRUD
│   │   │   └── packages.py        # Packages collection upsert
│   │   ├── schemas/analysis.py    # Pydantic models for all request/response shapes
│   │   └── errors.py
│   ├── requirements.txt
│   └── render.yaml
│
├── preflight-web/                 # Next.js dashboard (frontend)
│   ├── app/
│   │   ├── page.tsx               # / landing
│   │   ├── dashboard/page.tsx     # /dashboard live feed
│   │   ├── demo/page.tsx          # /demo interactive ← most important for hackathon
│   │   └── scans/[id]/page.tsx    # /scans/:id drill-down
│   ├── components/
│   └── lib/api.ts                 # API client
│
├── preflight-mcp/                 # MCP server for Claude Code (planned)
│
├── demo/
│   ├── verdaccio/config.yaml      # Local npm registry config
│   └── mock-axios-malicious/      # Fake axios 1.7.10 with postinstall RAT stub
│
└── docs/                          # This directory
```

---

## Tech Stack — Final Locked

| Layer | Technology | Sponsor |
|---|---|---|
| Action runtime | GitHub Actions (TypeScript) | GitHub |
| Analysis API | Python FastAPI | — |
| API hosting | Render | Render |
| LLM reasoning | **Gemini 2.5 Flash** (primary) + **Pro** (BLOCK confirm) | Google Cloud + Gemini |
| Database | MongoDB Atlas | MongoDB |
| Frontend | Next.js (App Router) | — |
| Frontend hosting | Vercel (free) | — |
| AST parsing | acorn (via Node.js subprocess from Python) | — |
| npm data | npm Registry REST API | — |
| GitHub data | GitHub REST API + Actions toolkit | GitHub |
| Demo registry | Verdaccio (local) | — |

**CRITICAL NOTE on acorn**: `acorn-py` does NOT exist on PyPI. Use a Node.js subprocess:
```python
import subprocess, json
result = subprocess.run(
    ["node", "-e", f"const acorn=require('acorn');console.log(JSON.stringify(acorn.parse({json.dumps(js_code)},{{ecmaVersion:2022,sourceType:'module'}})))"],
    capture_output=True, text=True, timeout=30
)
```

---

## Sponsor Integrations (required for prizes)

| Sponsor | How we use it | Tier |
|---|---|---|
| GitHub | Core distribution — GitHub Action IS the product | 1 |
| Google Cloud + Gemini | LLM reasoning layer — `gemini-2.5-flash` + `gemini-2.5-pro` | 1 |
| MongoDB Atlas | Community threat intelligence — `preflight_db` | 1 |
| Render | FastAPI deployment hosting | 1 |
| ElevenLabs | Voice BLOCK alert on demo page (stretch) | 2 |
| Snowflake | Analytics pipeline (stretch) | 2 |
| Solana | Immutable audit log (stretch) | 3 |

---

## Design Philosophy

> "Existing tools scan for known bad packages. Preflight reasons about *unknown* bad packages — the ones that slipped through because nobody had seen them yet."

Every system design choice reinforces this: the 4-signal funnel exists because no single signal is sufficient. Behavioral analysis + identity signals + AI synthesis = confidence that individual heuristics can't achieve.

### Pitch risks

| # | Risk | Resolution |
|---|---|---|
| P1 | "npm audit/Snyk missed it" needs a source | Rephrase: "CVE-based tools require a CVE; the axios attack had none because the account was legitimately compromised" |
| P2 | Socket.dev does similar behavioral analysis | Differentiators: open-source MIT, zero signup, one-line YAML, no org permissions, free forever |
| P3 | "Gets smarter" implies ML | Use: "aggregates community threat signal — every scan contributes to a shared intelligence layer" |
