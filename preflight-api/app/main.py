from contextlib import asynccontextmanager

import httpx
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config.settings import settings
from app.db import client as db_client
from app.db.scans import seed_demo_data, seed_community_scans, seed_warn_demo_data
from app.routers import analyze, scans, packages
from app.schemas.analysis import HealthResponse, HealthChecks


@asynccontextmanager
async def lifespan(app: FastAPI):
    await db_client.connect()
    await seed_demo_data()
    await seed_warn_demo_data()
    await seed_community_scans()
    yield
    await db_client.disconnect()


app = FastAPI(title="Preflight API", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)

app.include_router(analyze.router)
app.include_router(scans.router)
app.include_router(packages.router)


@app.get("/health", response_model=HealthResponse)
async def health():
    checks: dict[str, str] = {}

    try:
        await db_client.get_db().command("ping")
        checks["mongodb"] = "connected"
    except Exception:
        checks["mongodb"] = "error"

    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            r = await client.get(f"{settings.npm_registry_url}/axios/latest")
            checks["npm_registry"] = "reachable" if r.status_code == 200 else "error"
    except Exception:
        checks["npm_registry"] = "error"

    checks["gemini_api"] = "reachable" if settings.gemini_api_key else "missing_key"

    all_ok = checks["mongodb"] == "connected" and checks["npm_registry"] == "reachable"
    status = "ok" if all_ok else "degraded"

    return HealthResponse(status=status, checks=HealthChecks(**checks))
