# Preflight — Frontend API Contract

**Base URL:** `https://preflight-api.onrender.com`  
**Local dev:** `http://localhost:8000`  
**CORS:** Open (`*`) — no special headers needed  
**Auth:** None  
**Content-Type:** `application/json`

---

## TypeScript Types

Paste these into `lib/types.ts` or directly into `lib/api.ts`.

```typescript
// ─── Shared ────────────────────────────────────────────────────────────────

export type Verdict = "PASS" | "WARN" | "BLOCK";

// ─── POST /analyze ──────────────────────────────────────────────────────────

export interface AnalyzeRequest {
  package_name: string;
  old_version: string | null;  // null = brand-new dependency
  new_version: string;
  repo?: string;               // "owner/repo-name"
  pr_number?: number;
  demo?: boolean;              // true = return pre-seeded demo result instantly
}

export interface ScriptDiffSignal {
  flagged: boolean;
  new_hooks: string[];         // e.g. ["postinstall"]
  changed_hooks: string[];
  reason: string;
}

export interface AstScanSignal {
  flagged: boolean;
  patterns: string[];          // e.g. ["outbound_http", "process_env_exfiltration"]
  severity: "none" | "medium" | "high";
  reason: string;
}

export interface MaintainerSignal {
  flagged: boolean;
  risk_score: number;          // 0–100
  key_changed: boolean;        // true = provenance attestation removed
  inactive_days: number;       // gap between old and new version publish dates
  reason: string;
}

export interface LlmReasoningSignal {
  verdict: Verdict;
  confidence: number;          // 0.0–1.0
  summary: string;             // max 2 sentences, human-readable
  attack_pattern: string | null; // e.g. "npm_account_hijack_rat_deployment"
  // NOTE: no `flagged` field in the API response.
  // Derive it in the frontend: flagged = verdict !== "PASS"
}

export interface SignalsResponse {
  script_diff: ScriptDiffSignal;
  ast_scan: AstScanSignal;
  maintainer: MaintainerSignal;
  llm_reasoning: LlmReasoningSignal;
}

export interface AnalyzeResponse {
  scan_id: string;             // MongoDB ObjectId as hex string
  verdict: Verdict;
  confidence: number;          // 0.0–1.0
  duration_ms: number;
  signals: SignalsResponse;
}

// ─── GET /scans + GET /scans/:id ────────────────────────────────────────────
// IMPORTANT: the API returns the *full* document for both endpoints.
// There is no projection — both list items and detail have identical shapes.

export interface ScanDetail {
  scan_id: string;             // MongoDB ObjectId hex, e.g. "64a7f3e2b1c4d5e6f7a8b9c0"
  package_name: string;
  old_version: string | null;
  new_version: string;
  verdict: Verdict;
  confidence: number;
  duration_ms: number;
  scanned_at: string;          // ISO 8601 UTC
  created_at: string;          // ISO 8601 UTC
  repo: string | null;
  pr_number: number | null;
  is_demo: boolean;
  signals: SignalsResponse;
}

export interface ScansListResponse {
  scans: ScanDetail[];         // full scan objects, not a trimmed summary
  page: number;
  limit: number;
}

// ScanSummary alias kept for compatibility
export type ScanSummary = ScanDetail;

// ─── GET /packages/:name/threat ─────────────────────────────────────────────

export interface PackageThreatResponse {
  package_name: string;
  total_scans: number;
  block_count: number;
  warn_count: number;
  pass_count: number;
  community_threat_score: number | null; // null = fewer than 5 scans
  last_flagged_at: string | null;
  flagged_versions: string[];
  safe_versions: string[];
  // Present when score is null:
  reason?: "insufficient_data";
  minimum_scans?: number;
}

// ─── GET /health ─────────────────────────────────────────────────────────────

export interface HealthResponse {
  status: "ok" | "degraded";
  checks: {
    mongodb: "connected" | "error";
    npm_registry: "reachable" | "error";
    gemini_api: "reachable" | "missing_key";
  };
  version: string;
}
```

---

## Endpoints

### `POST /analyze`

Run a full security analysis on a package upgrade.

```typescript
const res = await fetch(`${API_URL}/analyze`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    package_name: "axios",
    old_version: "1.7.9",
    new_version: "1.7.10",
  } satisfies AnalyzeRequest),
});
const data: AnalyzeResponse = await res.json();
```

**Demo mode** — for the `/demo` page, pass `demo: true`. The API skips all real analysis and returns the pre-seeded axios BLOCK result with staggered artificial delays (~2.7s total). Gemini is NOT called.

```typescript
// /demo page usage
body: JSON.stringify({ package_name: "axios", old_version: "1.7.9", new_version: "1.7.10", demo: true })
```

**Error responses:**

| Status | When | `detail` |
|--------|------|---------|
| 422 | Invalid package name format | Pydantic validation error |
| 502 | npm registry unreachable / package not found | Error message string |
| 504 | Script diff timed out | `"Script diff timed out"` |
| 500 | Demo data not in DB | `"Demo data not seeded"` |

---

### `GET /scans`

Paginated feed of recent scans, sorted newest first. Demo scans excluded.

```typescript
const res = await fetch(`${API_URL}/scans?page=1&limit=20`);
const data: ScansListResponse = await res.json();
```

| Param | Type | Default | Range |
|-------|------|---------|-------|
| `page` | number | `1` | ≥ 1 |
| `limit` | number | `20` | 1–100 |

**Polling for the dashboard live feed:**
```typescript
// Poll every 10 seconds — use NEXT_PUBLIC_POLL_INTERVAL_MS=10000
useEffect(() => {
  const interval = setInterval(() => fetchScans(), 10_000);
  return () => clearInterval(interval);
}, []);
```

---

### `GET /scans/:scan_id`

Full detail for one scan. Used by `/scans/[id]` page. PR comments link here.

```typescript
const res = await fetch(`${API_URL}/scans/${scanId}`);
if (res.status === 404) { /* not found */ }
const data: ScanDetail = await res.json();
```

| Status | When |
|--------|------|
| 200 | Found |
| 404 | `scan_id` not in DB or invalid ObjectId |

---

### `GET /packages/top-threats`

Top packages by community threat score. Minimum 5 scans to appear.

```typescript
const res = await fetch(`${API_URL}/packages/top-threats?limit=10`);
const data: PackageThreatResponse[] = await res.json();
```

| Param | Type | Default | Range |
|-------|------|---------|-------|
| `limit` | number | `10` | 1–50 |

---

### `GET /packages/:name/threat`

Threat profile for a specific package.

```typescript
const res = await fetch(`${API_URL}/packages/axios/threat`);
if (res.status === 404) { /* never scanned */ }
const data: PackageThreatResponse = await res.json();
```

When `total_scans < 5`, the score is `null`:
```json
{ "package_name": "axios", "total_scans": 3, "score": null, "reason": "insufficient_data", "minimum_scans": 5 }
```

| Status | When |
|--------|------|
| 200 | Package exists in DB |
| 404 | Package never scanned |

---

### `GET /health`

Health check. Use to verify the API is up before your demo.

```typescript
const res = await fetch(`${API_URL}/health`);
const data: HealthResponse = await res.json();
// data.status === "ok" means everything is green
```

---

## Verdict → UI Mapping

```typescript
export const VERDICT_COLOR: Record<Verdict, string> = {
  BLOCK: "#FF3B30",  // --accent-block
  WARN:  "#FFB800",  // --accent-warn
  PASS:  "#00FF88",  // --accent-pass
};

export const VERDICT_EMOJI: Record<Verdict, string> = {
  BLOCK: "🔴",
  WARN:  "🟡",
  PASS:  "🟢",
};
```

---

## `lib/api.ts` — Suggested client structure

```typescript
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "https://preflight-api.onrender.com";

export async function runAnalysis(req: AnalyzeRequest): Promise<AnalyzeResponse> {
  const res = await fetch(`${API_URL}/analyze`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(req),
  });
  if (!res.ok) throw new Error(`Analysis failed: ${res.status}`);
  return res.json();
}

export async function getScans(page = 1, limit = 20): Promise<ScansListResponse> {
  const res = await fetch(`${API_URL}/scans?page=${page}&limit=${limit}`);
  if (!res.ok) throw new Error(`Failed to fetch scans: ${res.status}`);
  return res.json();
}

export async function getScan(scanId: string): Promise<ScanDetail> {
  const res = await fetch(`${API_URL}/scans/${scanId}`);
  if (res.status === 404) throw new Error("Scan not found");
  if (!res.ok) throw new Error(`Failed to fetch scan: ${res.status}`);
  return res.json();
}

export async function getTopThreats(limit = 10): Promise<PackageThreatResponse[]> {
  const res = await fetch(`${API_URL}/packages/top-threats?limit=${limit}`);
  if (!res.ok) throw new Error(`Failed to fetch threats: ${res.status}`);
  return res.json();
}

export async function getPackageThreat(name: string): Promise<PackageThreatResponse> {
  const res = await fetch(`${API_URL}/packages/${encodeURIComponent(name)}/threat`);
  if (res.status === 404) throw new Error("Package not found");
  if (!res.ok) throw new Error(`Failed to fetch package threat: ${res.status}`);
  return res.json();
}

export async function getHealth(): Promise<HealthResponse> {
  const res = await fetch(`${API_URL}/health`);
  return res.json();
}
```

---

## Environment Variables (preflight-web)

```bash
NEXT_PUBLIC_API_URL=https://preflight-api.onrender.com
NEXT_PUBLIC_POLL_INTERVAL_MS=10000
```

Set these in Vercel dashboard under Settings → Environment Variables.

---

## Frontend Integration Notes

Findings from reading the current `preflight-web/` code against the live API. These are gaps that need to be closed when wiring static data to real API calls.

---

### 1. Field name mapping — API (snake_case) → frontend data shape

The current `lib/data.ts` uses camelCase and different field names than the API. When replacing mock data, apply this mapping:

| API field | Frontend `lib/data.ts` equivalent | Notes |
|---|---|---|
| `scan_id` | `id` | rename on receipt |
| `package_name` | `package` | rename on receipt |
| `old_version` | `from` | rename on receipt |
| `new_version` | `to` | rename on receipt |
| `duration_ms` | `duration` | rename on receipt |
| `scanned_at` | `time` (relative) / `scannedAt` | format as relative for ScanCard, ISO for ScanDetail |
| `signals.llm_reasoning.attack_pattern` | `attackPattern` | camelCase in ScanDetail |

Suggested normalizer for `ScanCard` / dashboard feed:

```typescript
function normalizeScan(raw: ScanDetail) {
  return {
    id: raw.scan_id,
    package: raw.package_name,
    from: raw.old_version,
    to: raw.new_version,
    verdict: raw.verdict,
    confidence: raw.confidence,
    duration: raw.duration_ms,
    time: formatRelative(raw.scanned_at), // your relative-time helper
    repo: raw.repo ?? "",
    pr: raw.pr_number,
    summary: raw.signals.llm_reasoning.summary,
    signals: signalsToArray(raw.signals),  // see §3 below
  };
}
```

---

### 2. `llm_reasoning` has no `flagged` field

The backend's `LlmReasoningSignal` does not include `flagged`. The `ScanCard` and `SignalPill` components require `flagged: boolean` on all four signals.

Derive it:
```typescript
const llmFlagged = raw.signals.llm_reasoning.verdict !== "PASS";
```

---

### 3. Signal object → array normalization for `ScanCard`

`ScanCard` expects `scan.signals` as `Array<{ name: string; flagged: boolean }>`. The API returns signals as a named object. Convert:

```typescript
function signalsToArray(signals: SignalsResponse) {
  return [
    { name: "Script Diff", flagged: signals.script_diff.flagged },
    { name: "AST Scan",    flagged: signals.ast_scan.flagged },
    { name: "Maintainer",  flagged: signals.maintainer.flagged },
    { name: "Gemini AI",   flagged: signals.llm_reasoning.verdict !== "PASS" },
  ];
}
```

---

### 4. Demo scan ID — critical link fix

The demo page verdict card currently links to `/scans/scn_a1f7e2` (a fake ID). The real pre-seeded demo scan in MongoDB has ID:

```
64a7f3e2b1c4d5e6f7a8b9c0
```

The "Full scan detail" button on `/demo` and the `SCAN_DETAIL_AXIOS.id` in `lib/data.ts` should both use this ID. The `/scans/[id]` page validates it via `GET /scans/64a7f3e2b1c4d5e6f7a8b9c0`.

---

### 5. Wiring `/demo` page to the real API

The current `/demo` page (`app/demo/page.tsx`) uses only static data — it runs a CSS animation with hardcoded `TRACE_LINES` and never calls the API. To wire it:

```typescript
// In start():
const result = await runAnalysis({
  package_name: "axios",
  old_version: "1.7.9",
  new_version: "1.7.10",
  demo: true,  // returns pre-seeded result with artificial ~2.7s delay
});
// result is AnalyzeResponse — use result.signals for signal rows,
// result.confidence / result.verdict for the verdict card
```

The API stagger delays (~500ms per signal) mean the response arrives ~2.7s after the request — the existing animation timing (600ms per signal row) aligns well with this.

---

### 6. Wiring `/scans/[id]` page to the real API

The current `app/scans/[id]/page.tsx` ignores the route param and always renders `SCAN_DETAIL_AXIOS`. To wire it:

```typescript
"use client";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { getScan } from "@/lib/api";

export default function ScanDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [scan, setScan] = useState<ScanDetail | null>(null);

  useEffect(() => {
    getScan(id).then(setScan).catch(console.error);
  }, [id]);

  if (!scan) return <div>Loading…</div>;
  // render using real `scan` data
}
```

**Note:** The API response does not include `iocs[]`, `model` name, or kill-chain timeline — those are frontend-only display constructs in `lib/data.ts` (hardcoded for the demo). Keep them static for the demo scan; omit for real scans.

---

### 7. `GET /scans` — list returns full documents

`GET /scans` returns the complete scan object (same shape as `GET /scans/:id`) for each item — not a trimmed summary. The `ScanCard` expanded view can therefore read `signals` and `summary` directly from the list response without a separate per-scan fetch.

---

### 8. Stats counters — no dedicated endpoint

The landing page shows three `StatCounter` values: "Repos protected", "Scans completed", "Threats blocked". There is no `/stats` endpoint. Options:

- Keep them as realistic-looking static numbers for the hackathon demo (current approach — fine for presentation)
- Approximate from `GET /scans?limit=1` (the `page`/`limit` response gives no total count — backend would need a COUNT query)
- Derive "Threats blocked" from `GET /packages/top-threats` block counts

Recommended for hackathon: leave static. The counters animate convincingly and judges won't live-verify them.

---

### 9. Action YAML — input name correction

`lib/data.ts` `INSTALL_YAML` currently shows:

```yaml
uses: preflight-ai/action@v1
with:
  fail-on: BLOCK     # ← WRONG
  comment: true      # ← doesn't exist as an input
```

The actual `action.yml` inputs are:

```yaml
uses: preflight-ai/preflight@v1.0.0
with:
  lockfile: package-lock.json   # optional, default shown
  fail_on_block: true           # boolean — use this, not fail-on
  # api_url: https://preflight-api.onrender.com  # optional override
```

`comment` is not an input — PR comments are always posted automatically on BLOCK/WARN. Use `@v1.0.0` (pinned tag), never `@v1` (mutable).

---

### 10. Ticker component — wiring to live feed

`Ticker` (rendered in the global layout) uses static `TICKER_FEED` from `lib/data.ts`. To make it live, replace with `GET /scans?limit=10` polled every 10s and format `scanned_at` as a relative timestamp. Not required for hackathon — static ticker is indistinguishable during a 3-minute demo.
