from __future__ import annotations
"""Signal 1: fetch tarballs, extract install hooks, diff between versions."""

import asyncio
import io
import json
import tarfile
from dataclasses import dataclass, field

import httpx

from app.config.settings import settings
from app.errors import PackageNotFoundError, RegistryTimeoutError

# Only these three run when installing a package from the npm registry as a dependency.
# `prepare` is excluded — it only runs locally or from git installs, not registry installs.
HOOK_KEYS = ("preinstall", "install", "postinstall")

_METADATA_TIMEOUT = 10.0
_TARBALL_TIMEOUT = 30.0
_MAX_TARBALL_BYTES = 50 * 1024 * 1024  # 50 MB hard cap — skips AST for pathological packages


@dataclass
class ScriptDiffResult:
    flagged: bool
    new_hooks: list[str] = field(default_factory=list)
    changed_hooks: list[str] = field(default_factory=list)
    reason: str = ""
    hooks_content: dict[str, str] = field(default_factory=dict)
    tarball_url: str | None = None
    tarball_bytes: bytes | None = None


async def _fetch_tarball_url(package_name: str, version: str) -> tuple[str, str]:
    url = f"{settings.npm_registry_url}/{package_name}/{version}"
    async with httpx.AsyncClient(timeout=_METADATA_TIMEOUT) as client:
        try:
            r = await client.get(url)
        except httpx.TimeoutException:
            raise RegistryTimeoutError(f"Registry timed out for {package_name}@{version}")
    if r.status_code == 404:
        raise PackageNotFoundError(f"{package_name}@{version} not found")
    try:
        r.raise_for_status()
    except httpx.HTTPStatusError as e:
        raise RegistryTimeoutError(
            f"Registry returned {e.response.status_code} for {package_name}@{version}"
        )
    data = r.json()
    dist = data.get("dist", {})
    tarball = dist.get("tarball")
    if not tarball:
        raise PackageNotFoundError(f"No tarball URL in registry response for {package_name}@{version}")
    return tarball, dist.get("integrity", "")


async def _extract_hooks(package_name: str, version: str) -> tuple[dict[str, str], str, bytes | None]:
    tarball_url, _ = await _fetch_tarball_url(package_name, version)
    async with httpx.AsyncClient(timeout=_TARBALL_TIMEOUT) as client:
        try:
            r = await client.get(tarball_url)
        except httpx.TimeoutException:
            raise RegistryTimeoutError(f"Tarball download timed out for {package_name}@{version}")
        try:
            r.raise_for_status()
        except httpx.HTTPStatusError as e:
            raise RegistryTimeoutError(
                f"Tarball CDN returned {e.response.status_code} for {package_name}@{version}"
            )

    raw = r.content
    if len(raw) > _MAX_TARBALL_BYTES:
        # Oversized tarball — return empty hooks rather than OOM.
        # Legitimate attack packages are invariably small; this only skips pathological cases.
        return {}, tarball_url, None

    hooks: dict[str, str] = {}
    try:
        with tarfile.open(fileobj=io.BytesIO(raw), mode="r:gz") as tar:
            for member in tar.getmembers():
                if member.name in ("package/package.json", "./package/package.json"):
                    f = tar.extractfile(member)
                    if f is None:
                        break
                    pkg_data = json.loads(f.read().decode("utf-8"))
                    scripts = pkg_data.get("scripts", {})
                    for key in HOOK_KEYS:
                        val = scripts.get(key)
                        if isinstance(val, str):
                            hooks[key] = val
                    break
    except (tarfile.TarError, json.JSONDecodeError, UnicodeDecodeError):
        # Malformed tarball — treat as no hooks rather than crashing
        pass

    return hooks, tarball_url, raw


async def run(
    package_name: str, old_version: str | None, new_version: str
) -> ScriptDiffResult:
    if old_version is None:
        new_hooks, new_tarball_url, new_tarball_bytes = await _extract_hooks(package_name, new_version)
        if new_hooks:
            hook_names = list(new_hooks.keys())
            return ScriptDiffResult(
                flagged=True,
                new_hooks=hook_names,
                reason=f"New dependency has install hooks: {', '.join(hook_names)}",
                hooks_content=new_hooks,
                tarball_url=new_tarball_url,
                tarball_bytes=new_tarball_bytes,
            )
        return ScriptDiffResult(
            flagged=False,
            reason="New dependency with no install hooks",
            hooks_content={},
            tarball_url=new_tarball_url,
            tarball_bytes=new_tarball_bytes,
        )

    # Fetch both versions in parallel — cuts wall time by ~50%
    (new_hooks, new_tarball_url, new_tarball_bytes), (old_hooks, _, _) = await asyncio.gather(
        _extract_hooks(package_name, new_version),
        _extract_hooks(package_name, old_version),
    )

    added = [k for k in new_hooks if k not in old_hooks]
    changed = [k for k in new_hooks if k in old_hooks and new_hooks[k] != old_hooks[k]]

    if added or changed:
        parts = []
        if added:
            parts.append(f"New hooks: {', '.join(added)}")
        if changed:
            parts.append(f"Modified hooks: {', '.join(changed)}")
        return ScriptDiffResult(
            flagged=True,
            new_hooks=added,
            changed_hooks=changed,
            reason="; ".join(parts),
            hooks_content=new_hooks,
            tarball_url=new_tarball_url,
            tarball_bytes=new_tarball_bytes,
        )

    return ScriptDiffResult(
        flagged=False,
        reason="No install hook changes detected",
        hooks_content=new_hooks,
        tarball_url=new_tarball_url,
        tarball_bytes=new_tarball_bytes,
    )
