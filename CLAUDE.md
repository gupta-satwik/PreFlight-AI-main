# Preflight — Claude Code Index

Preflight is an AI-powered npm supply chain security GitHub Action.
It detects malicious packages *before* they run — behavioral analysis, not CVE lookups.

---

## Documentation

@docs/PROJECT.md
@docs/STATUS.md
@docs/API.md
@docs/DETECTION.md
@docs/BUILD.md
@docs/DEMO.md
@docs/HARDENING.md
@docs/AGENTIC.md

---

## Quick Reference

| What | Where |
|---|---|
| What is Preflight, tech stack, repo map | `docs/PROJECT.md` |
| Build status, remaining tasks, smoke tests, risk tables | `docs/STATUS.md` |
| API endpoints, MongoDB models, PR comment format | `docs/API.md` |
| 4-signal pipeline, Gemini prompt, thresholds, overrides | `docs/DETECTION.md` |
| Build deps, env vars, 11 critical rules | `docs/BUILD.md` |
| Demo mode, axios attack scenario, frontend spec | `docs/DEMO.md` |
| Signal hardening history (script_diff, ast, maintainer, gemini) | `docs/HARDENING.md` |
| MCP server + Agent PR badge (next phase, not yet built) | `docs/AGENTIC.md` |

---

## Deployments

- **API**: `https://preflight-api.onrender.com`
- **Frontend**: Vercel (NEXT_PUBLIC_API_URL set)
- **Action**: `uses: Javeria-taj/preflight-ai/preflight-action@v1.0.0`
- **Demo scan**: `https://preflight-api.onrender.com/scans/64a7f3e2b1c4d5e6f7a8b9c0`
