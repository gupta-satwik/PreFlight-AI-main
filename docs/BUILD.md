# Preflight — Build Tooling & Rules

## Build Tooling Requirements

### preflight-action (TypeScript)

Required `package.json` dependencies:
```json
{
  "dependencies": {
    "@actions/core": "^1.10.0",
    "@actions/github": "^6.0.0",
    "zod": "^3.22.0",
    "node-fetch": "^3.3.0"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "typescript": "^5.0.0",
    "@vercel/ncc": "^0.38.0"
  },
  "scripts": {
    "build": "tsc && ncc build dist/index.js -o dist --license licenses.txt",
    "package": "npm run build"
  }
}
```

Required `tsconfig.json` (at `preflight-action/tsconfig.json`):
```json
{ "compilerOptions": { "target": "ES2022", "module": "commonjs", "outDir": "dist", "strict": true } }
```

### preflight-api (Python)

`requirements.txt` — confirmed working on Python 3.11 (Render) and Python 3.13 (local):
```
fastapi==0.115.0
uvicorn[standard]==0.30.0
pydantic==2.10.6
pydantic-settings==2.7.0
motor==3.7.0
google-generativeai==0.8.3
requests==2.32.3
httpx==0.27.0
python-multipart==0.0.9
```

**Why these versions:**
- `pydantic 2.7.0` had no Python 3.13 wheel — needed source build with Rust/MSVC which fails on most setups. `2.10.6` ships prebuilt wheels for 3.13.
- `motor 3.4.0` tried to import `_QUERY_OPTIONS` from `pymongo.cursor` — removed in pymongo 4.10. `motor 3.7.0` is explicitly compatible with pymongo 4.9+.

Python version pinned to `3.11.0` via `.python-version` — pydantic-core has no wheel for Python 3.14.

**acorn** is managed via `preflight-api/package.json` (committed). `npm install acorn` runs as part of `render.yaml` buildCommand. Locally, run `npm install acorn` from `preflight-api/` before starting the server.

### preflight-web (Next.js)

Required `next.config.js` (standard App Router config, nothing custom needed).

---

## Environment Variables

### preflight-action (TypeScript)

```
PREFLIGHT_API_URL=https://preflight-api.onrender.com
GITHUB_TOKEN=                              # auto-injected by GitHub Actions
```

### preflight-api (Python)

```
GEMINI_API_KEY=                            # Google AI Studio key
MONGODB_URI=mongodb+srv://...              # Atlas connection string
MONGODB_DB_NAME=preflight_db
NPM_REGISTRY_URL=https://registry.npmjs.org
ANALYSIS_TIMEOUT_MS=45000
LOG_LEVEL=INFO
HOST=0.0.0.0
PORT=8000
```

### preflight-web (Next.js)

```
NEXT_PUBLIC_API_URL=https://preflight-api.onrender.com
NEXT_PUBLIC_POLL_INTERVAL_MS=10000
```

### Credentials (confirmed working in production)

- `GEMINI_API_KEY` — set in Render dashboard, Gemini calls working in prod
- `MONGODB_URI` — Atlas cluster, `smrafi405_db_user`, `preflight_db` database, set in Render dashboard

---

## Critical Rules — Never Break These

1. **Stateless per-request** — no state stored between requests; MongoDB writes are OK
2. **Timeout everything** — npm registry calls: 10s, AST scan: 30s, Gemini API: 45s
3. **Never run postinstall hooks** — analyze scripts, never execute them
4. **Fail open, not closed** — if API unreachable, action warns but does not hard-block
5. **Confidence thresholds** — BLOCK ≥0.85; WARN 0.60–0.84; PASS below
6. **One verdict per package** — no transitive deps (scope creep)
7. **Sequential multi-package processing** — not parallel; 1s delay between calls; cap at 3 per PR
8. **Demo mode isolation** — `is_demo: true` scans excluded from all community score calculations
9. **CORS required** — FastAPI must allow the Vercel frontend origin
10. **ObjectId serialization** — always serialize MongoDB `_id` as `str()` in JSON responses
11. **Input validation** — package_name must match npm name regex `^(@[a-z0-9-~][a-z0-9-._~]*/)?[a-z0-9-~][a-z0-9-._~]*$`
