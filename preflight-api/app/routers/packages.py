from fastapi import APIRouter, HTTPException, Query

from app.db import packages as packages_db

router = APIRouter()


@router.get("/packages/top-threats")
async def top_threats(limit: int = Query(10, ge=1, le=50)):
    return await packages_db.get_top_threats(limit=limit)


@router.get("/packages/{package_name}/threat")
async def package_threat(package_name: str):
    doc = await packages_db.get_package_threat(package_name)
    if not doc:
        raise HTTPException(status_code=404, detail="Package not found")
    return doc
