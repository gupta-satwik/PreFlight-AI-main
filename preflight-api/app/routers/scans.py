from fastapi import APIRouter, HTTPException, Query

from app.db import scans as scans_db

router = APIRouter()


@router.get("/scans")
async def list_scans(page: int = Query(1, ge=1), limit: int = Query(20, ge=1, le=100)):
    docs = await scans_db.list_scans(page=page, limit=limit)
    return {"scans": docs, "page": page, "limit": limit}


@router.get("/scans/stats")
async def get_stats():
    return await scans_db.get_scan_stats()


@router.get("/scans/{scan_id}")
async def get_scan(scan_id: str):
    doc = await scans_db.get_scan(scan_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Scan not found")
    return doc
