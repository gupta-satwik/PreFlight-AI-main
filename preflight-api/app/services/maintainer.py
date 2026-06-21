from __future__ import annotations
"""Signal 3: npm maintainer scoring — provenance attestation, inactivity, key rotation."""

from dataclasses import dataclass
from datetime import datetime, timezone

import httpx

from app.config.settings import settings
from app.errors import PackageNotFoundError, RegistryTimeoutError

_REGISTRY_TIMEOUT = 10.0


@dataclass
class MaintainerResult:
    flagged: bool
    risk_score: int = 0
    key_changed: bool = False
    inactive_days: int = 0
    reason: str = ""


def _days_since(iso_date: str) -> int:
    try:
        dt = datetime.fromisoformat(iso_date.replace("Z", "+00:00"))
        return (datetime.now(timezone.utc) - dt).days
    except (ValueError, TypeError):
        return 0


def _has_provenance(version_data: dict) -> bool:
    """Check if a version has Sigstore provenance attestation."""
    dist = version_data.get("dist", {})
    # npm publishes provenance as dist.attestations or dist.signatures
    if dist.get("attestations"):
        return True
    if dist.get("signatures"):
        return True
    return False


def _compute_risk_score(
    provenance_removed: bool,
    inactive_days: int,
    new_maintainer: bool,
    package_age_days: int,
    weekly_downloads: int,
) -> int:
    score = 0
    if provenance_removed:
        score += 50
    if inactive_days > 180:
        score += 35
    elif inactive_days > 90:
        score += 25
    if new_maintainer:
        weight = 20
        # Downweight for large established packages
        if weekly_downloads > 1_000_000 and package_age_days > 365:
            weight -= 10
        score += weight
    if package_age_days < 30 and weekly_downloads > 10_000:
        score += 15
    return min(100, score)


async def run(package_name: str, old_version: str | None, new_version: str) -> MaintainerResult:
    url = f"{settings.npm_registry_url}/{package_name}"
    async with httpx.AsyncClient(timeout=_REGISTRY_TIMEOUT) as client:
        try:
            r = await client.get(url)
        except httpx.TimeoutException:
            raise RegistryTimeoutError(f"Registry timed out for {package_name}")

    if r.status_code == 404:
        raise PackageNotFoundError(f"Package {package_name} not found")
    try:
        r.raise_for_status()
    except httpx.HTTPStatusError as e:
        raise RegistryTimeoutError(
            f"Registry returned {e.response.status_code} for {package_name}"
        )
    data = r.json()

    versions = data.get("versions", {})
    time_map = data.get("time", {})

    new_version_data = versions.get(new_version)
    if new_version_data is None:
        raise PackageNotFoundError(f"Version {new_version} not found in registry for {package_name}")
    old_version_data = versions.get(old_version, {}) if old_version else {}

    # Provenance check
    new_has_provenance = _has_provenance(new_version_data)
    old_has_provenance = _has_provenance(old_version_data) if old_version else True
    provenance_removed = old_has_provenance and not new_has_provenance

    # Inactivity: gap between old version publish date and new version publish date
    inactive_days = 0
    if old_version and old_version in time_map and new_version in time_map:
        try:
            old_dt = datetime.fromisoformat(time_map[old_version].replace("Z", "+00:00"))
            new_dt = datetime.fromisoformat(time_map[new_version].replace("Z", "+00:00"))
            inactive_days = max(0, (new_dt - old_dt).days)
        except (ValueError, TypeError):
            inactive_days = 0

    # New maintainer check
    old_maintainers = {m.get("name") for m in old_version_data.get("maintainers", [])}
    new_maintainers = {m.get("name") for m in new_version_data.get("maintainers", [])}
    new_maintainer_added = bool(new_maintainers - old_maintainers) if old_version else False

    # Package age
    created_str = time_map.get("created", "")
    package_age_days = _days_since(created_str) if created_str else 9999

    # Weekly downloads (best effort — not always in registry response)
    weekly_downloads = data.get("weeklyDownloads", 0)

    risk_score = _compute_risk_score(
        provenance_removed=provenance_removed,
        inactive_days=inactive_days,
        new_maintainer=new_maintainer_added,
        package_age_days=package_age_days,
        weekly_downloads=weekly_downloads,
    )

    flagged = risk_score >= 40
    reasons = []
    if provenance_removed:
        reasons.append(f"Provenance attestation removed after {inactive_days} days of inactivity")
    if inactive_days > 90 and not provenance_removed:
        reasons.append(f"{inactive_days} days since last publish")
    if new_maintainer_added:
        reasons.append("New maintainer added")

    return MaintainerResult(
        flagged=flagged,
        risk_score=risk_score,
        key_changed=provenance_removed,
        inactive_days=inactive_days,
        reason="; ".join(reasons) if reasons else "No maintainer anomalies detected",
    )
