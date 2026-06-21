# preflight-web — Frontend Fix Tasks

## Task 1: Wire landing page StatCounters to real API
**File:** `app/page.tsx`
**Problem:** Values hardcoded: 2847 repos, 142039 scans, 1247 blocked. Judges will notice.
**Fix:** Fetch `getScans(1, 20)` on mount. Seed with hardcoded values, update with real counts.
- [x] Add `getScans` import
- [x] Add state: `scanCount`, `blockCount` initialized to seeded values
- [x] useEffect → fetch and update from API response
- Status: DONE

---

## Task 2: Dashboard starts with hardcoded mock data
**File:** `app/dashboard/page.tsx`
**Problem:** `useState(SCAN_FEED)` — 7 stale mock scans visible before API responds.
**Fix:** Init to empty array, show skeletons until first fetch resolves.
- [x] Change `useState<any[]>(SCAN_FEED)` → `useState<any[]>([])`
- [x] Add `feedLoading` state
- [x] Render skeleton rows while `feedLoading && feed.length === 0`
- [x] On API failure, fall back to SCAN_FEED and stop loading
- Status: DONE

---

## Task 3: API failures silently show fake results on demo page
**File:** `app/demo/page.tsx`
**Problem:** `.catch(() => {})` — if API is down, demo shows hardcoded BLOCK 94% with no indication.
**Fix:** Track API error state, show "offline mode" badge on verdict card.
- [x] Add `apiError` state (boolean)
- [x] On catch, set `apiError = true`
- [x] Show "offline mode · using cached result" chip on verdict card when `apiError && !apiResult`
- Status: DONE

---

## Task 4: Real scan detail reuses demo signal structure
**File:** `app/scans/[id]/page.tsx`
**Problem:** Real scans reuse `SCAN_DETAIL_AXIOS.signals` template — only `flagged` is real, everything else (kv, diff, explanation) is demo data.
**Fix:** Build signals array from raw API data.
- [x] Add `buildLiveSignals(signals: SignalsResponse)` function
- [x] Returns proper kv pairs from real API fields for all 4 signals
- [x] Replace `SCAN_DETAIL_AXIOS.signals.map(...)` with `buildLiveSignals(rawScan.signals)`
- [x] Fix signal flagged count display to be dynamic
- Status: DONE
