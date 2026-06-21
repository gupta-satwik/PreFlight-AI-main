# Preflight — Signal Hardening History

Decisions and bug fixes made during development sessions. Read this before touching any signal service.

---

## script_diff.py — hardened (session 2, May 9 2026)

| # | Gap | Fix |
|---|---|---|
| 1 | `data["dist"]["tarball"]` unguarded — KeyError on malformed registry response | `data.get("dist", {}).get("tarball")` + explicit `PackageNotFoundError` |
| 2 | Non-404 HTTP errors from registry not caught (5xx) | `HTTPStatusError` caught → `RegistryTimeoutError` on metadata call |
| 3 | Non-404 HTTP errors from tarball CDN not caught | Same — wrapped on tarball download call |
| 4 | Single `_REGISTRY_TIMEOUT = 10s` for both metadata AND tarball | Split: `_METADATA_TIMEOUT = 10s`, `_TARBALL_TIMEOUT = 30s` |
| 5 | `r.content` loads entire tarball into memory — OOM risk on Render free tier (512MB) | 50MB hard cap (`_MAX_TARBALL_BYTES`); oversized packages return empty hooks |
| 6 | `tarfile.open()` and `json.loads()` unguarded | `TarError`, `JSONDecodeError`, `UnicodeDecodeError` all caught — treated as no hooks |
| 7 | `scripts[key]` value not type-checked — would store dicts if package.json is malformed | `isinstance(val, str)` guard before storing |
| 8 | Old and new tarballs fetched sequentially | `asyncio.gather()` when both versions present — cuts ~50% wall time |
| 9 | Tarball bytes discarded after parsing — ast_scanner had to re-download | `_extract_hooks()` now returns `(hooks, tarball_url, raw_bytes)` as 3-tuple; `ScriptDiffResult` carries `tarball_bytes: bytes \| None`; analyze.py passes it to ast_scanner |

---

## ast_scanner.py — hardened (session 3, May 9 2026)

| # | Gap | Fix |
|---|---|---|
| 1 | `new Function()` detection checked `CallExpression` only — `new Function(...)` is a `NewExpression` in AST, not caught | Added parallel `NewExpression` handler in walk() |
| 2 | `_REGISTRY_TIMEOUT = 10.0` used for tarball download — too short | Renamed to `_TARBALL_TIMEOUT = 30.0` |
| 3 | `r.raise_for_status()` in `_fetch_file_from_tarball` unguarded — CDN 4xx/5xx raises `httpx.HTTPStatusError` uncaught | Refactored into `_fetch_tarball_bytes()` with try/except → `RegistryTimeoutError` |
| 4 | `tarfile.open()` in `_fetch_file_from_tarball` unguarded — malformed tarball raises `TarError` uncaught | Extracted to `_extract_js_from_tarball()` (sync) with try/except |
| 5 | `_fetch_file_from_tarball` re-downloaded the tarball already fetched by script_diff — double CDN fetch | `run()` accepts `tarball_bytes: bytes \| None`; only falls back to `_fetch_tarball_bytes()` if bytes not provided |
| 6 | Inline JS regex `^node\s+-e\s+["\'](.+)["\']$` too strict — fails on mixed quotes | More permissive: search for trailing arg, strip outer quotes only if matched pair |
| 7 | `FileNotFoundError` (node not installed) silently returned empty list | Now logs `log.warning("acorn scan failed: %s", e)` |
| 8 | Unused `settings` import | Removed |

---

## maintainer.py — hardened (session 3, May 9 2026)

| # | Gap | Fix |
|---|---|---|
| 1 | `r.raise_for_status()` unguarded — registry 5xx raises `httpx.HTTPStatusError` uncaught | Wrapped in try/except → `RegistryTimeoutError` |
| 2 | `versions.get(new_version, {})` silently returned `{}` when version absent — masking the error | Now raises `PackageNotFoundError` if `new_version` not in `versions` |
| 3 | `weekly_downloads` read from full package endpoint — field does not exist there, always 0 | Accepted as known limitation: missing data makes score slightly higher (safer direction) |

---

## gemini.py — hardened (session 3, May 9 2026)

| # | Gap | Fix |
|---|---|---|
| 1 | `genai.configure(api_key=...)` called inside `_call_gemini` on every request — ~100ms overhead per call | Moved to module level (executed once at import time) |
| 2 | `asyncio.get_event_loop()` deprecated in Python 3.10+, removed in 3.12 async contexts | Changed to `asyncio.get_running_loop()` |
| 3 | `_parse_gemini_response` had no schema validation — Gemini could return `verdict: "MAYBE"` or `confidence: 42.0` | Added: verdict enum check (falls back to `"WARN"`), confidence clamped to `[0.0, 1.0]`, summary falls back to default string |
| 4 | Unused `GeminiError` import | Removed |

---

## analyze.py — fixed (session 3, May 9 2026)

| # | Gap | Fix |
|---|---|---|
| 1 | Demo condition `req.demo or (... and req.demo)` — second clause always subsumed by first | Simplified to `if req.demo:` |
| 2 | `ast_scanner.run()` called with `tarball_url` only — bytes not passed, causing re-download | Now passes `sd_result.tarball_bytes` as fifth argument |
| 3 | `axios@1.7.10` doesn't exist on real npm — action sent real analyze request, got 502 | Added `_DEMO_AUTO_TRIGGER = {("axios", "1.7.9", "1.7.10")}` — returns pre-seeded demo result regardless of `demo` flag |
