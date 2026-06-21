"""POST /analyze — wire all 4 signals, handle demo mode, write to MongoDB."""

import asyncio
import logging
import time
from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException

from app.db import scans as scans_db, packages as packages_db
from app.db.scans import DEMO_SCAN_ID, WARN_DEMO_SCAN_ID
from app.errors import PackageNotFoundError, RegistryTimeoutError
from app.schemas.analysis import (
    AnalyzeRequest,
    AnalyzeResponse,
    AstScanSignal,
    LlmReasoningSignal,
    MaintainerSignal,
    ScriptDiffSignal,
    SignalsResponse,
)
from app.services import ast_scanner, gemini, maintainer, script_diff

log = logging.getLogger(__name__)
router = APIRouter()

# Artificial per-signal delays for demo mode (ms) — makes UI animation feel real
_DEMO_SIGNAL_DELAYS = [0.5, 0.7, 0.6, 0.9]

# Auto-trigger demo for the axios attack scenario — 1.7.10 doesn't exist on real npm
_DEMO_AUTO_TRIGGER = {("axios", "1.7.9", "1.7.10")}
# Auto-trigger WARN demo — colors & node-ipc are real sabotage incidents
_WARN_AUTO_TRIGGER = {
    ("colors", "1.4.0", "1.4.1"),
    ("node-ipc", None, "10.1.1"),
}


@router.post("/analyze", response_model=AnalyzeResponse)
async def analyze(req: AnalyzeRequest):
    # Demo mode — return pre-seeded result with staggered artificial delays
    trigger_key = (req.package_name, req.old_version, req.new_version)
    is_demo = req.demo or trigger_key in _DEMO_AUTO_TRIGGER
    if is_demo:
        for delay in _DEMO_SIGNAL_DELAYS:
            await asyncio.sleep(delay)
        scan = await scans_db.get_scan(DEMO_SCAN_ID)
        if not scan:
            raise HTTPException(status_code=500, detail="Demo data not seeded")
        sig = scan["signals"]
        return AnalyzeResponse(
            scan_id=DEMO_SCAN_ID,
            verdict=scan["verdict"],
            confidence=scan["confidence"],
            duration_ms=scan["duration_ms"],
            signals=SignalsResponse(
                script_diff=ScriptDiffSignal(**sig["script_diff"]),
                ast_scan=AstScanSignal(**sig["ast_scan"]),
                maintainer=MaintainerSignal(**sig["maintainer"]),
                llm_reasoning=LlmReasoningSignal(**sig["llm_reasoning"]),
            ),
        )

    if trigger_key in _WARN_AUTO_TRIGGER:
        for delay in _DEMO_SIGNAL_DELAYS[:3]:
            await asyncio.sleep(delay)
        scan = await scans_db.get_scan(WARN_DEMO_SCAN_ID)
        if not scan:
            raise HTTPException(status_code=500, detail="Warn demo data not seeded")
        sig = scan["signals"]
        return AnalyzeResponse(
            scan_id=WARN_DEMO_SCAN_ID,
            verdict=scan["verdict"],
            confidence=scan["confidence"],
            duration_ms=scan["duration_ms"],
            signals=SignalsResponse(
                script_diff=ScriptDiffSignal(**sig["script_diff"]),
                ast_scan=AstScanSignal(**sig["ast_scan"]),
                maintainer=MaintainerSignal(**sig["maintainer"]),
                llm_reasoning=LlmReasoningSignal(**sig["llm_reasoning"]),
            ),
        )

    start_ms = int(time.monotonic() * 1000)

    # Signal 1
    try:
        sd_result = await asyncio.wait_for(
            script_diff.run(req.package_name, req.old_version, req.new_version),
            timeout=15.0,
        )
    except (RegistryTimeoutError, PackageNotFoundError) as e:
        raise HTTPException(status_code=502, detail=str(e))
    except asyncio.TimeoutError:
        raise HTTPException(status_code=504, detail="Script diff timed out")

    # Signal 2 — re-use hook content + tarball bytes from Signal 1 to avoid re-fetching
    try:
        ast_result = await asyncio.wait_for(
            ast_scanner.run(
                req.package_name,
                req.new_version,
                sd_result.hooks_content,
                sd_result.tarball_url,
                sd_result.tarball_bytes,
            ),
            timeout=35.0,
        )
    except asyncio.TimeoutError:
        from app.services.ast_scanner import AstScanResult
        ast_result = AstScanResult(flagged=False, reason="AST scan timed out")

    # Signal 3
    try:
        maint_result = await asyncio.wait_for(
            maintainer.run(req.package_name, req.old_version, req.new_version),
            timeout=15.0,
        )
    except (RegistryTimeoutError, PackageNotFoundError) as e:
        from app.services.maintainer import MaintainerResult
        maint_result = MaintainerResult(flagged=False, reason=f"Maintainer check skipped: {e}")
    except asyncio.TimeoutError:
        from app.services.maintainer import MaintainerResult
        maint_result = MaintainerResult(flagged=False, reason="Maintainer check timed out")

    # Build signals dict for Gemini
    signals_dict = {
        "script_diff": {
            "flagged": sd_result.flagged,
            "new_hooks": sd_result.new_hooks,
            "changed_hooks": sd_result.changed_hooks,
            "reason": sd_result.reason,
        },
        "ast_scan": {
            "flagged": ast_result.flagged,
            "patterns": ast_result.patterns,
            "severity": ast_result.severity,
            "reason": ast_result.reason,
        },
        "maintainer": {
            "flagged": maint_result.flagged,
            "risk_score": maint_result.risk_score,
            "key_changed": maint_result.key_changed,
            "inactive_days": maint_result.inactive_days,
            "reason": maint_result.reason,
        },
    }

    # Hard override: 3 signals flagged → always BLOCK before calling Gemini
    flagged_count = sum([sd_result.flagged, ast_result.flagged, maint_result.flagged])
    if flagged_count >= 3 and maint_result.key_changed and ast_result.flagged:
        # provenance removed + new net call → always BLOCK, skip Gemini
        llm_result = gemini.LlmResult(
            verdict="BLOCK",
            confidence=0.95,
            summary="Hard override: provenance removed and network call detected — high-confidence supply chain attack.",
            attack_pattern="npm_account_hijack",
        )
    else:
        # Signal 4
        llm_result = await gemini.run(
            req.package_name, req.old_version, req.new_version, signals_dict
        )

    # Final hard override: 3+ signals → always BLOCK
    verdict = llm_result.verdict
    confidence = llm_result.confidence
    if flagged_count >= 3 and verdict != "BLOCK":
        verdict, confidence = "BLOCK", 0.90

    duration_ms = int(time.monotonic() * 1000) - start_ms
    now = datetime.now(timezone.utc)

    scan_doc = {
        "package_name": req.package_name,
        "old_version": req.old_version,
        "new_version": req.new_version,
        "verdict": verdict,
        "confidence": confidence,
        "repo": req.repo,
        "pr_number": req.pr_number,
        "is_demo": False,
        "signals": signals_dict | {
            "llm_reasoning": {
                "verdict": llm_result.verdict,
                "confidence": llm_result.confidence,
                "summary": llm_result.summary,
                "attack_pattern": llm_result.attack_pattern,
            }
        },
        "duration_ms": duration_ms,
        "scanned_at": now,
        "created_at": now,
    }

    scan_id = await scans_db.insert_scan(scan_doc)

    # Fire-and-forget package upsert
    asyncio.create_task(
        packages_db.upsert_package(req.package_name, verdict, req.new_version)
    )

    return AnalyzeResponse(
        scan_id=scan_id,
        verdict=verdict,
        confidence=confidence,
        duration_ms=duration_ms,
        signals=SignalsResponse(
            script_diff=ScriptDiffSignal(
                flagged=sd_result.flagged,
                new_hooks=sd_result.new_hooks,
                changed_hooks=sd_result.changed_hooks,
                reason=sd_result.reason,
            ),
            ast_scan=AstScanSignal(
                flagged=ast_result.flagged,
                patterns=ast_result.patterns,
                severity=ast_result.severity,
                reason=ast_result.reason,
            ),
            maintainer=MaintainerSignal(
                flagged=maint_result.flagged,
                risk_score=maint_result.risk_score,
                key_changed=maint_result.key_changed,
                inactive_days=maint_result.inactive_days,
                reason=maint_result.reason,
            ),
            llm_reasoning=LlmReasoningSignal(
                verdict=llm_result.verdict,
                confidence=llm_result.confidence,
                summary=llm_result.summary,
                attack_pattern=llm_result.attack_pattern,
            ),
        ),
    )
