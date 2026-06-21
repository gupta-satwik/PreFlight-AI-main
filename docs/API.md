# Preflight — API Contract & Data Models

**All code must conform to this. Never deviate without updating this file.**

**Base URL (production):** `https://preflight-api.onrender.com`

---

## Endpoints

### POST /analyze

```json
// Request
{
  "package_name": "axios",
  "old_version": "1.7.9",      // null if new dependency
  "new_version": "1.7.10",
  "repo": "org/repo-name",     // optional
  "pr_number": 42,             // optional
  "demo": false                // true → return pre-seeded demo result, skip real analysis
}

// Response
{
  "scan_id": "64a7f3e2b1c4d5e6f7a8b9c0",
  "verdict": "BLOCK",
  "confidence": 0.94,
  "duration_ms": 2840,
  "signals": {
    "script_diff": {
      "flagged": true,
      "new_hooks": ["postinstall"],
      "changed_hooks": [],
      "reason": "New postinstall hook added in 1.7.10"
    },
    "ast_scan": {
      "flagged": true,
      "patterns": ["outbound_https", "process_spawn"],
      "severity": "high",
      "reason": "Postinstall script opens outbound connection and spawns child process"
    },
    "maintainer": {
      "flagged": true,
      "risk_score": 92,
      "key_changed": true,
      "inactive_days": 238,
      "reason": "Provenance attestation removed after 8 months of inactivity"
    },
    "llm_reasoning": {
      "verdict": "BLOCK",
      "confidence": 0.94,
      "summary": "Pattern matches known supply chain attack: new postinstall hook with outbound network call combined with provenance removal after inactivity is high-confidence malicious.",
      "attack_pattern": "npm_account_hijack_rat_deployment"
    }
  }
}
```

### GET /health

```json
{
  "status": "ok",
  "checks": {
    "mongodb": "connected",
    "npm_registry": "reachable",
    "gemini_api": "reachable"
  },
  "version": "1.0.0"
}
```

### GET /scans?page=1&limit=20

Returns paginated scans sorted by `scanned_at DESC`. Excludes `is_demo: true` scans.

### GET /scans/:scan_id

Full scan object. `scan_id` is MongoDB ObjectId as hex string. Used by PR comment links.

### GET /packages/:name/threat

```json
{
  "package_name": "axios",
  "total_scans": 423,
  "block_count": 1,
  "warn_count": 3,
  "pass_count": 419,
  "community_threat_score": 72,
  "last_flagged_at": "2026-05-08T14:23:00Z",
  "flagged_versions": ["1.7.10"],
  "safe_versions": ["1.7.9", "1.7.8"]
}
// If total_scans < 5:
// { "package_name": "axios", "total_scans": 3, "score": null, "reason": "insufficient_data", "minimum_scans": 5 }
```

### GET /packages/top-threats?limit=10

Top packages by community_threat_score. Minimum 5 scans to appear.

---

## MongoDB Data Models

**Database:** `preflight_db`

### Collection: scans

```
_id (ObjectId), package_name (string), old_version (string|null), new_version (string),
verdict ("PASS"|"WARN"|"BLOCK"), confidence (float 0.0-1.0),
repo (string|null), pr_number (int|null),
is_demo (bool, default false),          ← exclude from community scores
signals {
  script_diff { flagged, new_hooks[], changed_hooks[], reason },
  ast_scan    { flagged, patterns[], severity, reason },
  maintainer  { flagged, risk_score, key_changed, inactive_days, reason },
  llm_reasoning { verdict, confidence, summary, attack_pattern }
},
duration_ms (int), scanned_at (datetime, indexed DESC), created_at (datetime)

Indexes:
  scanned_at DESC              (feed queries)
  package_name + new_version   (threat lookup)
  verdict                      (filter by verdict)
  package_name + verdict        (compound — "all BLOCKs for package X")
  scanned_at TTL 30 days        (expireAfterSeconds: 2592000 — Atlas free tier limit)
```

### Collection: packages

```
_id (ObjectId), package_name (string, unique index),
total_scans (int), block_count (int), warn_count (int), pass_count (int),
community_threat_score (int 0-100, indexed DESC),
last_flagged_at (datetime|null), flagged_versions[] (string array),
safe_versions[] (string array, capped 20, newest first — $push with $slice: -20),
updated_at (datetime)

Community threat score formula:
  score = (block_count * 100 + warn_count * 40) / total_scans
  Capped at 100. Requires minimum 5 total_scans to be shown publicly.
  Excludes scans where is_demo=true.
```

### ObjectId serialization

Python motor returns ObjectId objects. Serialize as `str(_id)` in all JSON responses.
Use `json_encoders = {ObjectId: str}` in Pydantic config or a custom serializer.

---

## GitHub Action — action.yml

```yaml
name: 'Preflight Supply Chain Scan'
description: 'Behavioral pre-execution interceptor for npm packages'

inputs:
  lockfile:
    description: 'Path to package-lock.json'
    required: false
    default: 'package-lock.json'
  api_url:
    description: 'Preflight API URL'
    required: false
    default: 'https://preflight-api.onrender.com'

outputs:
  verdict:
    description: 'PASS, WARN, or BLOCK'
  scan_id:
    description: 'MongoDB scan ID for the full report'

runs:
  using: 'node20'
  main: 'dist/index.js'

# Required permissions (must be in the workflow file that uses this action):
# permissions:
#   pull-requests: write   # post PR comment
#   statuses: write        # set commit status check
#   contents: read         # read package-lock.json
```

Every public YAML snippet must show `@v1.0.0` (immutable tag), NOT `@v1` (mutable).
Using a mutable tag on a supply chain security tool is a credibility hole.

---

## PR Comment Format

```markdown
## 🔴 Preflight: BLOCK — Dependency Update Intercepted

**`axios`** `1.7.9 → 1.7.10` · Confidence: **94%** · 2.84s

> This matches the pattern of a supply chain hijack. New postinstall hook
> with outbound network call combined with provenance removal after 8
> months of inactivity is high-confidence malicious activity.

| Signal      | Status     | Detail                                      |
|-------------|------------|---------------------------------------------|
| Script diff | 🚨 Flagged | New postinstall hook added                  |
| AST scan    | 🚨 Flagged | Outbound HTTPS + process.spawn detected     |
| Maintainer  | 🚨 Flagged | Provenance removed, 238 days inactive       |
| Gemini AI   | 🚨 Flagged | npm account hijack + RAT deployment pattern |

Attack pattern: npm_account_hijack_rat_deployment

❌ Do NOT merge · 🔍 Review manually · 📢 Report to npm security

[Preflight](https://preflight.dev) · [View full analysis →](https://preflight.dev/scans/64a7...)
```

Verdict headers: 🔴 BLOCK | 🟡 WARN | 🟢 PASS

---

## GitHub Security Advisory Feed (frontend only)

Used by `Ticker` and `/dashboard` to enrich the community feed with real npm vulnerability data.
This is a **client-side only** call — it never goes through the Preflight API.

```
GET https://api.github.com/advisories?type=reviewed&ecosystem=npm&per_page=25
Headers: Accept: application/vnd.github+json

Rate limit: 60 requests/hour unauthenticated (called once on mount, not polled)
CORS: enabled — safe to call from browser
```

Response items are mapped to `AdvisoryFeedItem` (defined in `lib/api.ts`), which shares the
same shape as `normalizeScan()` output so both can be rendered by `ScanCard` without adaptation:

| Field | Source | Notes |
|---|---|---|
| `id` | `a.ghsa_id` | e.g. `GHSA-xxxx-xxxx-xxxx` |
| `package` | `a.affected[0].package.name` | npm package name |
| `from` | `a.affected[0].vulnerable_version_range` | parsed via regex |
| `to` | `a.affected[0].patched_versions` | parsed via regex, fallback `"patched"` |
| `verdict` | `a.severity` | critical/high → BLOCK; medium/low → WARN |
| `confidence` | derived | critical: 0.95, high: 0.88, medium: 0.71, low: 0.62 |
| `duration` | `_deterministicDuration(ghsa_id)` | stable across renders — avoids hydration mismatch |
| `scannedAt` | `a.updated_at` | used for feed sort order |
| `advisoryUrl` | `a.html_url` | triggers "View advisory ↗" link in ScanCard expansion |
| `repo` | `"community"` | static label |

Severity → signal flag count: critical = 4 flags, high = 3, medium/low = 2.
