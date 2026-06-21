from __future__ import annotations
"""Signal 4: Gemini AI synthesis — Flash primary, Pro confirmation for BLOCK."""

import asyncio
import json
import logging
from dataclasses import dataclass
from typing import Any

import google.generativeai as genai

from app.config.settings import settings

log = logging.getLogger(__name__)

_FLASH_MODEL = "gemini-2.5-flash"
_PRO_MODEL = "gemini-2.5-pro"

genai.configure(api_key=settings.gemini_api_key)

_PROMPT_TEMPLATE = """You are a senior supply chain security researcher. Analyze the following npm package upgrade signals and output a verdict.

Package: {package_name} {old_version} → {new_version}

Signals:
{signals_json}

Output ONLY valid JSON with this exact schema, no preamble, no explanation outside the JSON:
{{
  "verdict": "PASS" | "WARN" | "BLOCK",
  "confidence": 0.0-1.0,
  "summary": "max 2 sentences explaining the verdict",
  "attack_pattern": "snake_case_identifier or null"
}}

Rules:
- BLOCK: confidence >= 0.85 AND 2+ signals flagged
- WARN: confidence >= 0.60 AND 1+ signal flagged
- PASS: otherwise

Examples:
BLOCK case: {{"verdict":"BLOCK","confidence":0.94,"summary":"New postinstall hook opens outbound connection combined with provenance attestation removal after 8 months inactivity. Pattern matches known supply chain hijack.","attack_pattern":"npm_account_hijack_rat_deployment"}}
WARN case: {{"verdict":"WARN","confidence":0.65,"summary":"Postinstall hook modified but no network activity detected. Recommend manual review before merging.","attack_pattern":null}}
PASS case: {{"verdict":"PASS","confidence":0.97,"summary":"No suspicious behavior detected in this upgrade.","attack_pattern":null}}"""


@dataclass
class LlmResult:
    verdict: str
    confidence: float
    summary: str
    attack_pattern: str | None = None


def _rule_based_fallback(signals: dict[str, Any]) -> LlmResult:
    flagged_count = sum([
        signals.get("script_diff", {}).get("flagged", False),
        signals.get("ast_scan", {}).get("flagged", False),
        signals.get("maintainer", {}).get("flagged", False),
    ])
    if flagged_count >= 3:
        return LlmResult("BLOCK", 0.90, "All three behavioral signals flagged — rule-based BLOCK verdict.")
    elif flagged_count == 2:
        return LlmResult("WARN", 0.65, "Two signals flagged — recommend manual review before merging.")
    elif flagged_count == 1:
        return LlmResult("WARN", 0.40, "One signal flagged — low confidence, review recommended.")
    return LlmResult("PASS", 0.95, "No signals flagged.")


def _parse_gemini_response(text: str) -> LlmResult:
    text = text.strip()
    if text.startswith("```"):
        text = "\n".join(text.split("\n")[1:])
    if text.endswith("```"):
        text = "\n".join(text.split("\n")[:-1])
    data = json.loads(text.strip())

    verdict = data.get("verdict", "WARN")
    if verdict not in ("PASS", "WARN", "BLOCK"):
        verdict = "WARN"
    confidence = max(0.0, min(1.0, float(data.get("confidence", 0.5))))

    return LlmResult(
        verdict=verdict,
        confidence=confidence,
        summary=data.get("summary", "No summary provided."),
        attack_pattern=data.get("attack_pattern"),
    )


async def _call_gemini(model_name: str, prompt: str) -> LlmResult:
    model = genai.GenerativeModel(model_name)

    loop = asyncio.get_running_loop()
    response = await loop.run_in_executor(
        None,
        lambda: model.generate_content(
            prompt,
            generation_config=genai.GenerationConfig(
                temperature=0.1,
                max_output_tokens=512,
            ),
        ),
    )
    return _parse_gemini_response(response.text)


async def run(
    package_name: str,
    old_version: str | None,
    new_version: str,
    signals: dict[str, Any],
) -> LlmResult:
    old_label = old_version or "none (new dependency)"
    prompt = _PROMPT_TEMPLATE.format(
        package_name=package_name,
        old_version=old_label,
        new_version=new_version,
        signals_json=json.dumps(signals, indent=2),
    )

    try:
        flash_result = await asyncio.wait_for(
            _call_gemini(_FLASH_MODEL, prompt), timeout=45.0
        )
    except Exception as e:
        log.warning("Gemini Flash failed: %s — using rule-based fallback", e)
        return _rule_based_fallback(signals)

    # If Flash returns BLOCK with high confidence, confirm with Pro in parallel
    if flash_result.verdict == "BLOCK" and flash_result.confidence >= 0.85:
        try:
            pro_result = await asyncio.wait_for(
                _call_gemini(_PRO_MODEL, prompt), timeout=45.0
            )
            # Take the more conservative verdict
            if pro_result.verdict == "BLOCK":
                return pro_result
            # Flash said BLOCK, Pro disagreed — keep BLOCK but note disagreement
            return flash_result
        except Exception as e:
            log.warning("Gemini Pro confirmation failed: %s — using Flash result", e)
            return flash_result

    return flash_result
