from __future__ import annotations
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
from app.config.settings import settings

_client: AsyncIOMotorClient | None = None


def get_db() -> AsyncIOMotorDatabase:
    if _client is None:
        raise RuntimeError("Database not connected — call connect() first")
    return _client[settings.mongodb_db_name]


async def connect() -> None:
    global _client
    _client = AsyncIOMotorClient(settings.mongodb_uri)
    db = get_db()

    await db.scans.create_index([("scanned_at", -1)])
    await db.scans.create_index([("package_name", 1), ("new_version", 1)])
    await db.scans.create_index([("verdict", 1)])
    await db.scans.create_index([("package_name", 1), ("verdict", 1)])
    await db.scans.create_index(
        [("scanned_at", 1)], expireAfterSeconds=2592000
    )
    await db.packages.create_index([("package_name", 1)], unique=True)
    await db.packages.create_index([("community_threat_score", -1)])


async def disconnect() -> None:
    global _client
    if _client is not None:
        _client.close()
        _client = None
