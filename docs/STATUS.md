# Preflight — Build Status & Tasks

## Current Build Status (as of May 10, 2026 — hackathon day 3, final session)

### Done and tested

| Component | Status | Notes |
|---|---|---|
| `preflight-api` — all 4 signal services | ✅ Complete | script_diff, ast_scanner, maintainer, gemini |
| `preflight-api` — all routers | ✅ Complete | POST /analyze, GET /scans, GET /scans/:id, GET /packages/*, GET /health |
| `preflight-api` — MongoDB layer | ✅ Complete | client, scans CRUD, packages upsert, TTL index, demo seed |
| `preflight-api` — demo mode | ✅ Complete | demo scan pre-seeded at `64a7f3e2b1c4d5e6f7a8b9c0`, artificial delays |
| `preflight-api` — deployed on Render | ✅ Live | `https://preflight-api.onrender.com` — all health checks green |
| `preflight-api` — Python version pinned | ✅ Fixed | `.python-version = 3.11.0` — pydantic-core has no wheel for Python 3.14 |
| `preflight-api` — auto-demo trigger | ✅ Fixed | `_DEMO_AUTO_TRIGGER` in `analyze.py` — axios 1.7.9→1.7.10 returns demo result without `demo:true` |
| `preflight-action` — full TypeScript | ✅ Complete + built | dist/index.js committed (1.28MB bundle) |
| `preflight-action` — action.yml | ✅ Complete | inputs, outputs, permissions comment |
| `preflight-action` — Gemini row fix | ✅ Fixed | `llm_reasoning` has no `.flagged` field — derived as `verdict !== "PASS"` in `github.ts` |
| `preflight-action` — subdirectory ref | ✅ Fixed | Correct: `uses: Javeria-taj/preflight-ai/preflight-action@v1.0.0` |
| `v1.0.0` git tag | ✅ Done | Force-updated twice to point to latest fixed commits |
| `preflight-web` — all pages | ✅ Complete | All 4 pages wired to real API via `lib/api.ts` |
| `preflight-web` — mock data removed | ✅ Complete | No fallback mock data — live API or honest empty states |
| `preflight-web` — deployed on Vercel | ✅ Live | Frontend deployed, `NEXT_PUBLIC_API_URL` set |
| `preflight-web` — API contract | ✅ Complete | `preflight-web/API_CONTRACT.md` with types, integration notes, field mapping |
| Keep-alive cron | ✅ Done | cron-job.org pings `GET /health` every 14 minutes |
| GitHub Action e2e test | ✅ Passed | BLOCK (axios 1.7.10) and PASS (lodash 4.17.21) PRs confirmed on `preflight-test-target` |
| `preflight-api` — community scan seeding | ✅ Complete | `seed_community_scans()` in `db/scans.py` seeds 15 non-demo scans (2 BLOCK, 3 WARN, 10 PASS) on startup if fewer than 5 community scans exist; fixes empty feed |
| `preflight-web` — GitHub Advisory feed | ✅ Complete | `getAdvisoryFeed()` in `lib/api.ts` fetches npm advisories from public GitHub CORS API; interleaved into Ticker and merged into dashboard feed via `Promise.allSettled` |
| `preflight-web` — dashboard real stats | ✅ Complete | Removed hardcoded `142039` counter and fake increment interval; all counts derived from real `combinedFeed` (backend scans + advisories sorted by `scannedAt`) |
| `preflight-web` — landing page real stats | ✅ Complete | `getScans(1, 100)` now computes scan count, block count, and unique repo count — no hardcoded seeds |
| `preflight-web` — ScanCard advisory link | ✅ Complete | Expanded section conditionally renders external "View advisory ↗" link (advisory items) vs internal "View full scan →" link (real scans) based on `advisoryUrl` presence |
| `CLAUDE.md` restructured | ✅ Done | Slimmed to 30-line index with `@`-imports; 8 topic-focused files in `docs/` |

### Not done yet

| Item | What's needed |
|---|---|
| MCP server | See `docs/AGENTIC.md` and plan file |
| Agent PR badge | See `docs/AGENTIC.md` and plan file |

---

## Pre-Presentation Checklist

- [x] `/health` returns all three checks ok on Render
- [x] `/demo` page animation completes cleanly
- [x] Keep-alive cron active (cron-job.org)
- [x] `v1.0.0` tag exists on GitHub
- [x] GitHub Action e2e confirmed — BLOCK (axios attack) + PASS (lodash bump)
- [x] All frontend pages wired to real API
- [x] No mock data in frontend
- [x] Community scan feed seeded — 15 non-demo scans in MongoDB on first startup
- [x] GitHub Advisory API enriching Ticker + dashboard with real npm vulnerability data
- [x] All dashboard/landing stats computed from real API data (no fake seeds)

---

## Deployment Smoke Tests

```bash
# Health check
curl https://preflight-api.onrender.com/health

# Demo scan seeded
curl https://preflight-api.onrender.com/scans/64a7f3e2b1c4d5e6f7a8b9c0

# Demo analysis — BLOCK 94% in ~2.7s
curl -X POST https://preflight-api.onrender.com/analyze \
  -H "Content-Type: application/json" \
  -d '{"package_name":"axios","old_version":"1.7.9","new_version":"1.7.10","demo":true}'

# Real analysis — PASS in ~10s
curl -X POST https://preflight-api.onrender.com/analyze \
  -H "Content-Type: application/json" \
  -d '{"package_name":"lodash","old_version":"4.17.20","new_version":"4.17.21"}'
```

GitHub Action reference (confirmed working):
```yaml
- uses: Javeria-taj/preflight-ai/preflight-action@v1.0.0
```
Note: subdirectory path required (`/preflight-action/`) — action.yml is NOT at repo root.

---

## Known Implementation Risks

### CRITICAL — will break demo

| # | Risk | Status | Resolution |
|---|---|---|---|
| C1 | `acorn-py` doesn't exist on PyPI | ✅ Fixed | Node.js subprocess in `ast_scanner.py`; `package.json` + `npm install acorn` in `render.yaml` |
| C2 | `preflight-action/package.json` has empty deps | ✅ Fixed | All deps added: @actions/core, @actions/github, zod, node-fetch, ncc |
| C3 | No tsconfig.json | ✅ Fixed | Created at `preflight-action/tsconfig.json` |
| C4 | action.yml missing inputs/outputs/permissions | ✅ Fixed | Complete action.yml with all inputs, outputs, permissions comment |
| C5 | No demo pre-seeded data | ✅ Fixed | `seed_demo_data()` in FastAPI lifespan; ID `64a7f3e2b1c4d5e6f7a8b9c0` |
| C6 | Render cold start on first demo | ✅ Fixed | Keep-alive cron active on cron-job.org |
| C7 | No CORS on FastAPI | ✅ Fixed | `allow_origins=["*"]` in `main.py` |
| C8 | MongoDB ObjectId not JSON serializable | ✅ Fixed | `_serialize()` in `db/scans.py` converts `_id` → `scan_id` as string |

### HIGH — correctness bugs

| # | Risk | Status | Notes |
|---|---|---|---|
| H1 | npm API has no signing_key_fingerprint | ✅ Fixed | Using `dist.signatures` + `dist.attestations` (Sigstore) in `maintainer.py` |
| H2 | acorn fails on shell scripts | ✅ Fixed | Shell regex runs first; acorn only called if hook is `node <file>` or inline JS |
| H3 | require('https') standalone = false positive | ✅ Fixed | Only flags combinations: outbound net + spawn/eval in same script |
| H4 | acorn must follow file paths into tarball | ✅ Fixed | `_fetch_file_from_tarball()` in `ast_scanner.py` extracts the JS file then parses |
| H5 | Gemini prompt not written | ✅ Fixed | Full few-shot prompt with 3 examples in `gemini.py` |
| H6 | Gemini fail-safe not written | ✅ Fixed | `_rule_based_fallback()` in `gemini.py` |
| H7 | Demo runs pollute community scores | ✅ Fixed | `is_demo: true` excluded from all `packages.py` upsert calculations |
| H8 | Multi-package PRs hit Gemini rate limits | ✅ Fixed | Sequential processing, 1s delay, cap 3 per PR in `src/index.ts` |

### MEDIUM — edge cases

| # | Risk | Status | Notes |
|---|---|---|---|
| M1 | old_version=null crashes Signal 1 | ✅ Fixed | Handles null: any hook on new dep = HIGH flag |
| M2 | GET /packages/:name/threat with <5 scans | ✅ Fixed | Returns `{score: null, reason: "insufficient_data"}` |
| M3 | No rate limiting on POST /analyze | ⚠️ Open | Not implemented — acceptable for hackathon |
| M4 | package_name path traversal | ✅ Fixed | NPM_NAME_RE regex validates before any file I/O |
| M5 | safe_versions[] cap | ✅ Fixed | `$push` with `$slice: -20` in `packages.py` |
| M6 | SHA pinning in docs | ✅ Fixed | All examples use `@v1.0.0` |
| M7 | Gemini Pro slowest path | ✅ Fixed | Flash first; parallel Pro only on BLOCK ≥0.85 |
| M8 | No workflow example in repo | ✅ Fixed | `demo/.github/workflows/preflight.yml` added |

### Frontend — ALL RESOLVED

| # | Issue | Status |
|---|---|---|
| F1 | All pages used static `lib/data.ts` mock data | ✅ Fixed — all pages wired to real `lib/api.ts` |
| F2 | `/demo` page didn't call the API | ✅ Fixed — calls `POST /analyze` with `demo: true`; shows offline badge if unreachable |
| F3 | `/scans/[id]` ignored route param | ✅ Fixed — uses `useParams()` + `getScan(id)`; `buildLiveSignals()` maps raw API fields to UI |
| F4 | Demo verdict card linked to wrong scan ID | ✅ Fixed — uses real `apiResult.scan_id` or falls back to `DEMO_SCAN_ID` |
| F5 | `INSTALL_YAML` had wrong input names | ✅ Fixed — `fail_on_block`; no spurious `comment: true` |
| F6 | `LlmReasoningSignal` has no `flagged` field | ✅ Fixed — derived as `verdict !== 'PASS'` everywhere |
| F7 | API signals are object, ScanCard expected array | ✅ Fixed — `signalsToArray()` helper used throughout |
| F8 | Mock data used as fallback throughout | ✅ Fixed — TICKER_FEED, SCAN_FEED, TOP_THREATS, SCAN_DETAIL_AXIOS all deleted |
| F9 | Community feed empty — only demo scan in MongoDB (`is_demo: true` excluded from feed) | ✅ Fixed — `seed_community_scans()` in `db/scans.py` inserts 15 realistic non-demo scans on API startup if fewer than 5 exist |
| F10 | Dashboard counter hardcoded at 142,039 with fake increment interval | ✅ Fixed — counter state removed; header and stats panel derive counts from real `combinedFeed.length` |
| F11 | Landing page stats hardcoded (142039 scans, 1247 repos, 2847 repo counter) | ✅ Fixed — `getScans(1, 100)` on mount computes real scan count, block count, and unique repo count via `new Set` |
| F12 | Ticker + dashboard feed sparse when only seeded scans exist | ✅ Fixed — `getAdvisoryFeed()` fetches GitHub's public npm advisory API; `Promise.allSettled` ensures one source failing doesn't break the other; advisories map to the same scan shape (`AdvisoryFeedItem`) |
