from __future__ import annotations

import re
from typing import Optional
from pydantic import BaseModel, field_validator

# npm package name regex (covers scoped + unscoped)
NPM_NAME_RE = re.compile(r"^(@[a-z0-9\-~][a-z0-9\-._~]*/)?[a-z0-9\-~][a-z0-9\-._~]*$")


class AnalyzeRequest(BaseModel):
    package_name: str
    old_version: Optional[str] = None
    new_version: str
    repo: Optional[str] = None
    pr_number: Optional[int] = None
    demo: bool = False

    @field_validator("package_name")
    @classmethod
    def validate_package_name(cls, v: str) -> str:
        if not NPM_NAME_RE.match(v):
            raise ValueError(f"Invalid npm package name: {v}")
        return v


class ScriptDiffSignal(BaseModel):
    flagged: bool
    new_hooks: list[str] = []
    changed_hooks: list[str] = []
    reason: str


class AstScanSignal(BaseModel):
    flagged: bool
    patterns: list[str] = []
    severity: str = "none"
    reason: str


class MaintainerSignal(BaseModel):
    flagged: bool
    risk_score: int = 0
    key_changed: bool = False
    inactive_days: int = 0
    reason: str


class LlmReasoningSignal(BaseModel):
    verdict: str
    confidence: float
    summary: str
    attack_pattern: Optional[str] = None


class SignalsResponse(BaseModel):
    script_diff: ScriptDiffSignal
    ast_scan: AstScanSignal
    maintainer: MaintainerSignal
    llm_reasoning: LlmReasoningSignal


class AnalyzeResponse(BaseModel):
    scan_id: str
    verdict: str
    confidence: float
    duration_ms: int
    signals: SignalsResponse


class HealthChecks(BaseModel):
    mongodb: str
    npm_registry: str
    gemini_api: str


class HealthResponse(BaseModel):
    status: str
    checks: HealthChecks
    version: str = "1.0.0"


class ScanSummary(BaseModel):
    scan_id: str
    package_name: str
    old_version: Optional[str]
    new_version: str
    verdict: str
    confidence: float
    duration_ms: int
    scanned_at: str


class ScansListResponse(BaseModel):
    scans: list[ScanSummary]
    page: int
    limit: int


class PackageThreatResponse(BaseModel):
    package_name: str
    total_scans: int
    block_count: int = 0
    warn_count: int = 0
    pass_count: int = 0
    community_threat_score: Optional[int] = None
    last_flagged_at: Optional[str] = None
    flagged_versions: list[str] = []
    safe_versions: list[str] = []
    reason: Optional[str] = None
