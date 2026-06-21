from __future__ import annotations
from datetime import datetime, timezone
from app.db.client import get_db


async def upsert_package(package_name: str, verdict: str, version: str) -> None:
    db = get_db()
    now = datetime.now(timezone.utc)

    inc_fields: dict = {"total_scans": 1}
    if verdict == "BLOCK":
        inc_fields["block_count"] = 1
    elif verdict == "WARN":
        inc_fields["warn_count"] = 1
    else:
        inc_fields["pass_count"] = 1

    await db.packages.update_one(
        {"package_name": package_name},
        {
            "$inc": inc_fields,
            "$set": {"updated_at": now},
            "$setOnInsert": {
                "package_name": package_name,
                "community_threat_score": 0,
                "block_count": 0,
                "warn_count": 0,
                "pass_count": 0,
                "total_scans": 0,
                "last_flagged_at": None,
                "flagged_versions": [],
                "safe_versions": [],
                "created_at": now,
            },
        },
        upsert=True,
    )

    if verdict == "BLOCK":
        await db.packages.update_one(
            {"package_name": package_name},
            {
                "$addToSet": {"flagged_versions": version},
                "$set": {"last_flagged_at": now},
            },
        )
    else:
        await db.packages.update_one(
            {"package_name": package_name},
            {"$push": {"safe_versions": {"$each": [version], "$slice": -20}}},
        )

    pkg = await db.packages.find_one({"package_name": package_name})
    if pkg and pkg.get("total_scans", 0) >= 5:
        score = min(
            100,
            int(
                (pkg.get("block_count", 0) * 100 + pkg.get("warn_count", 0) * 40)
                / pkg["total_scans"]
            ),
        )
        await db.packages.update_one(
            {"package_name": package_name},
            {"$set": {"community_threat_score": score, "updated_at": now}},
        )


async def get_package_threat(package_name: str) -> dict | None:
    db = get_db()
    doc = await db.packages.find_one({"package_name": package_name}, {"_id": 0})
    if not doc:
        return None
    if doc.get("total_scans", 0) < 5:
        return {
            "package_name": package_name,
            "total_scans": doc.get("total_scans", 0),
            "score": None,
            "reason": "insufficient_data",
            "minimum_scans": 5,
        }
    if isinstance(doc.get("last_flagged_at"), datetime):
        doc["last_flagged_at"] = doc["last_flagged_at"].isoformat()
    return doc


async def get_top_threats(limit: int = 10) -> list[dict]:
    db = get_db()
    cursor = db.packages.find(
        {"total_scans": {"$gte": 5}},
        sort=[("community_threat_score", -1)],
        limit=limit,
        projection={"_id": 0},
    )
    docs = await cursor.to_list(length=limit)
    for doc in docs:
        if isinstance(doc.get("last_flagged_at"), datetime):
            doc["last_flagged_at"] = doc["last_flagged_at"].isoformat()
    return docs
