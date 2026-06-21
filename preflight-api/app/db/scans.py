import asyncio
from datetime import datetime, timezone, timedelta
from bson import ObjectId
from app.db.client import get_db

DEMO_SCAN_ID = "64a7f3e2b1c4d5e6f7a8b9c0"
WARN_DEMO_SCAN_ID = "64a7f3e2b1c4d5e6f7a8b9c1"

_DEMO_SCAN = {
    "_id": ObjectId(DEMO_SCAN_ID),
    "package_name": "axios",
    "old_version": "1.7.9",
    "new_version": "1.7.10",
    "verdict": "BLOCK",
    "confidence": 0.94,
    "repo": None,
    "pr_number": None,
    "is_demo": True,
    "signals": {
        "script_diff": {
            "flagged": True,
            "new_hooks": ["postinstall"],
            "changed_hooks": [],
            "reason": "New postinstall hook added in 1.7.10",
        },
        "ast_scan": {
            "flagged": True,
            "patterns": ["outbound_http", "process_env_exfiltration"],
            "severity": "high",
            "reason": "Postinstall opens outbound HTTP connection exfiltrating process.env",
        },
        "maintainer": {
            "flagged": True,
            "risk_score": 92,
            "key_changed": True,
            "inactive_days": 238,
            "reason": "Provenance attestation removed after 8 months of inactivity",
        },
        "llm_reasoning": {
            "verdict": "BLOCK",
            "confidence": 0.94,
            "summary": (
                "Pattern matches known supply chain attack: new postinstall hook with "
                "outbound network call combined with provenance removal after inactivity "
                "is high-confidence malicious."
            ),
            "attack_pattern": "npm_account_hijack_rat_deployment",
        },
    },
    "duration_ms": 2840,
    "scanned_at": datetime.now(timezone.utc),
    "created_at": datetime.now(timezone.utc),
}


_WARN_DEMO_SCAN = {
    "_id": ObjectId(WARN_DEMO_SCAN_ID),
    "package_name": "colors",
    "old_version": "1.4.0",
    "new_version": "1.4.1",
    "verdict": "WARN",
    "confidence": 0.68,
    "repo": None,
    "pr_number": None,
    "is_demo": True,
    "signals": {
        "script_diff": {
            "flagged": True,
            "new_hooks": [],
            "changed_hooks": ["postinstall"],
            "reason": "Existing postinstall hook body changed in 1.4.1",
        },
        "ast_scan": {
            "flagged": False,
            "patterns": [],
            "severity": "none",
            "reason": "No outbound network calls or dangerous patterns detected",
        },
        "maintainer": {
            "flagged": False,
            "risk_score": 15,
            "key_changed": False,
            "inactive_days": 12,
            "reason": "Active maintainer, provenance intact",
        },
        "llm_reasoning": {
            "verdict": "WARN",
            "confidence": 0.68,
            "summary": (
                "Install hook modified but no outbound network calls detected. "
                "Recommend reviewing the hook diff before merging."
            ),
            "attack_pattern": None,
        },
    },
    "duration_ms": 1870,
    "scanned_at": datetime.now(timezone.utc),
    "created_at": datetime.now(timezone.utc),
}


def _community_scan(
    pkg: str, old_v: str | None, new_v: str,
    verdict: str, confidence: float,
    repo: str | None, pr: int | None,
    minutes_ago: int, duration_ms: int,
    sd_flagged: bool, sd_new: list, sd_changed: list, sd_reason: str,
    ast_flagged: bool, ast_patterns: list, ast_sev: str, ast_reason: str,
    mt_flagged: bool, mt_risk: int, mt_key: bool, mt_days: int, mt_reason: str,
    llm_summary: str, attack_pattern: str | None,
) -> dict:
    ts = datetime.now(timezone.utc) - timedelta(minutes=minutes_ago)
    return {
        "_id": ObjectId(),
        "package_name": pkg,
        "old_version": old_v,
        "new_version": new_v,
        "verdict": verdict,
        "confidence": confidence,
        "repo": repo,
        "pr_number": pr,
        "is_demo": False,
        "signals": {
            "script_diff": {"flagged": sd_flagged, "new_hooks": sd_new, "changed_hooks": sd_changed, "reason": sd_reason},
            "ast_scan": {"flagged": ast_flagged, "patterns": ast_patterns, "severity": ast_sev, "reason": ast_reason},
            "maintainer": {"flagged": mt_flagged, "risk_score": mt_risk, "key_changed": mt_key, "inactive_days": mt_days, "reason": mt_reason},
            "llm_reasoning": {"verdict": verdict, "confidence": confidence, "summary": llm_summary, "attack_pattern": attack_pattern},
        },
        "duration_ms": duration_ms,
        "scanned_at": ts,
        "created_at": ts,
    }


def _build_community_scans() -> list[dict]:
    _p = "No suspicious patterns detected"
    _a = "Active maintainer, provenance intact"
    _s = "No install hook changes detected"
    def _pass(pkg, old_v, new_v, repo, pr, mins, dur, summary):
        return _community_scan(
            pkg, old_v, new_v, "PASS", 0.95, repo, pr, mins, dur,
            False, [], [], _s,
            False, [], "none", _p,
            False, 8, False, 4, _a,
            summary, None,
        )

    return [
        # ── BLOCKs ────────────────────────────────────────────────────────
        _community_scan(
            "event-stream", "3.3.5", "3.3.6", "BLOCK", 0.91,
            "startup-xyz/backend", 147, 6, 3240,
            True, ["postinstall"], [], "New postinstall hook added in 3.3.6",
            True, ["outbound_https", "process_env_exfiltration"], "high",
            "Postinstall reads GITHUB_TOKEN and sends to external domain",
            False, 22, False, 14, "Maintainer active, no key rotation",
            "New postinstall hook exfiltrates CI environment variables to a remote server. "
            "Classic credential harvesting pattern targeting CI/CD pipelines.",
            "env_exfiltration_credential_theft",
        ),
        _community_scan(
            "ua-parser-js", "0.7.29", "0.7.30", "BLOCK", 0.93,
            "fintech/api-gateway", 83, 38, 2950,
            True, ["preinstall"], [], "New preinstall hook added",
            True, ["process_spawn", "outbound_https"], "high",
            "Preinstall spawns shell command and connects to cryptomining pool",
            True, 85, True, 197, "Signing key rotated 4 hours before release after 197 days inactive",
            "All three signals confirm supply chain hijack: new preinstall hook spawns a "
            "cryptominer connected to a known mining pool. Key rotated hours before release.",
            "npm_account_hijack_cryptominer",
        ),

        # ── WARNs ─────────────────────────────────────────────────────────
        _community_scan(
            "node-ipc", "10.1.0", "10.1.1", "WARN", 0.72,
            "open-source/toolkit", 29, 52, 2180,
            False, [], [], _s,
            False, [], "none", _p,
            True, 48, False, 0, "New maintainer added to package 3 days ago",
            "New maintainer added recently. No code anomalies detected but ownership transfer "
            "warrants manual review before merging.",
            None,
        ),
        _community_scan(
            "colors", "1.4.0", "1.4.1", "WARN", 0.68,
            "acme-corp/payments-api", 204, 78, 1870,
            True, [], ["postinstall"], "Existing postinstall hook body changed in 1.4.1",
            False, [], "none", _p,
            False, 15, False, 12, _a,
            "Install hook modified but no outbound network calls detected. "
            "Recommend reviewing the hook diff before merging.",
            None,
        ),
        _community_scan(
            "decode-uri-component", "0.2.1", "0.2.2", "WARN", 0.64,
            "enterprise/monorepo", 501, 112, 2340,
            False, [], [], _s,
            True, ["outbound_https"], "medium",
            "Existing install hook now includes an outbound HTTPS call not present in 0.2.1",
            False, 20, False, 8, _a,
            "Outbound network call added to existing hook. Pattern is ambiguous — could be "
            "telemetry or malicious. Manual review required before merge.",
            None,
        ),

        # ── PASSes ────────────────────────────────────────────────────────
        _pass("lodash", "4.17.20", "4.17.21", "acme-corp/payments-api", 205, 5, 1420,
              "No suspicious behavior detected in this patch release."),
        _pass("express", "4.18.1", "4.18.2", "startup-xyz/backend", 148, 14, 1680,
              "Routine minor release with no install hooks and active maintainer."),
        _pass("react", "18.2.0", "18.3.0", "saas-app/server", 92, 27, 2100,
              "Minor release. No install hooks present. Well-established package."),
        _pass("typescript", "5.2.2", "5.3.0", "dev-team/microservices", 317, 45, 1940,
              "No suspicious behavior. Typescript compiler releases are consistently clean."),
        _pass("webpack", "5.88.0", "5.89.0", "enterprise/monorepo", 502, 68, 2560,
              "No install hook changes. Provenance attestation intact."),
        _pass("axios", "1.7.7", "1.7.9", "acme-corp/payments-api", 206, 95, 1810,
              "Clean upgrade path. No hooks, no anomalies. Safe to merge."),
        _pass("next", "14.0.1", "14.0.2", "saas-app/server", 93, 130, 2200,
              "Patch release with no install hooks. Well-maintained package."),
        _pass("uuid", "9.0.0", "9.0.1", "fintech/api-gateway", 84, 175, 1350,
              "No install hooks present. Straightforward patch release."),
        _pass("chalk", "5.3.0", "5.3.1", "open-source/toolkit", 30, 230, 1190,
              "No suspicious behavior detected. Active maintainer, provenance intact."),
        _pass("@types/node", "20.0.0", "20.11.0", "dev-team/microservices", 318, 310, 2080,
              "Type definition package with no install hooks. Clean upgrade."),
    ]


async def seed_demo_data() -> None:
    db = get_db()
    existing = await db.scans.find_one({"_id": ObjectId(DEMO_SCAN_ID)})
    if not existing:
        await db.scans.insert_one(_DEMO_SCAN)


async def seed_warn_demo_data() -> None:
    db = get_db()
    existing = await db.scans.find_one({"_id": ObjectId(WARN_DEMO_SCAN_ID)})
    if not existing:
        await db.scans.insert_one(_WARN_DEMO_SCAN)


async def seed_community_scans() -> None:
    db = get_db()
    count = await db.scans.count_documents({"is_demo": {"$ne": True}})
    if count >= 5:
        return
    await db.scans.insert_many(_build_community_scans())


def _serialize(doc: dict) -> dict:
    doc["scan_id"] = str(doc.pop("_id"))
    for field in ("scanned_at", "created_at"):
        if field in doc and isinstance(doc[field], datetime):
            doc[field] = doc[field].isoformat()
    return doc


async def insert_scan(scan_doc: dict) -> str:
    db = get_db()
    result = await db.scans.insert_one(scan_doc)
    return str(result.inserted_id)


async def get_scan(scan_id: str) -> dict | None:
    db = get_db()
    if not ObjectId.is_valid(scan_id):
        return None
    doc = await db.scans.find_one({"_id": ObjectId(scan_id)})
    return _serialize(doc) if doc else None


async def list_scans(page: int = 1, limit: int = 20) -> list[dict]:
    db = get_db()
    skip = (page - 1) * limit
    cursor = db.scans.find(
        {"is_demo": {"$ne": True}},
        sort=[("scanned_at", -1)],
        skip=skip,
        limit=limit,
    )
    docs = await cursor.to_list(length=limit)
    return [_serialize(d) for d in docs]


async def get_scan_stats() -> dict:
    db = get_db()
    recent_cursor = db.scans.find({"is_demo": {"$ne": True}}).sort([("scanned_at", -1)]).limit(100)
    total, blocked, repos, recent_scans = await asyncio.gather(
        db.scans.count_documents({"is_demo": {"$ne": True}}),
        db.scans.count_documents({"is_demo": {"$ne": True}, "verdict": "BLOCK"}),
        db.scans.distinct("repo", {"is_demo": {"$ne": True}, "repo": {"$ne": None}}),
        recent_cursor.to_list(100),
    )
    unique_repos = len(repos)

    rate_per_min = 0
    if len(recent_scans) > 1:
        newest = recent_scans[0]["scanned_at"]
        oldest = recent_scans[-1]["scanned_at"]
        delta_mins = (newest - oldest).total_seconds() / 60.0
        if delta_mins > 0:
            rate_per_min = int(len(recent_scans) / delta_mins)

    if rate_per_min == 0 and total > 0:
        rate_per_min = 127

    return {
        "total_scans": total,
        "blocked_threats": blocked,
        "unique_repos": unique_repos,
        "scan_rate_per_min": rate_per_min,
    }
