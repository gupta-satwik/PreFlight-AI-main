from __future__ import annotations
"""Signal 2: shell regex scanner + acorn AST analysis for install hooks."""

import io
import json
import logging
import re
import subprocess
import tarfile
from dataclasses import dataclass, field

import httpx

from app.errors import RegistryTimeoutError

log = logging.getLogger(__name__)

# Shell patterns that indicate malicious behaviour
_SHELL_PATTERNS: list[tuple[str, str]] = [
    (r"curl\s+", "curl_download"),
    (r"wget\s+", "wget_download"),
    (r"bash\s+-c", "bash_exec"),
    (r"sh\s+-c", "sh_exec"),
    (r"\|\s*bash", "pipe_to_bash"),
    (r"\|\s*sh", "pipe_to_sh"),
    (r"base64\s+-d", "base64_decode"),
    (r"eval\s*\$\(", "eval_subshell"),
    (r"eval\s*`", "eval_backtick"),
    (r"python\s+-c", "python_exec"),
    (r"nc\s+", "netcat"),
]

# Dangerous AST combinations — standalone require('https') is NOT flagged
_AST_SCRIPT = r"""
const acorn = require('acorn');
const code = process.argv[2];
let ast;
try { ast = acorn.parse(code, { ecmaVersion: 2022, sourceType: 'script' }); }
catch(e) { console.log(JSON.stringify({error: e.message})); process.exit(0); }

const patterns = new Set();
let hasNet = false;
let hasSpawn = false;

function walk(node) {
  if (!node || typeof node !== 'object') return;

  if (node.type === 'CallExpression') {
    const callee = node.callee;
    // eval(non-literal)
    if (callee.type === 'Identifier' && callee.name === 'eval') {
      const arg = node.arguments[0];
      if (arg && arg.type !== 'Literal') { patterns.add('eval_dynamic'); }
    }
    // Function('code') — call form
    if (callee.type === 'Identifier' && callee.name === 'Function') {
      patterns.add('new_function');
    }
    // process.spawn / exec / execSync / spawnSync with any arg
    if (callee.type === 'MemberExpression') {
      const prop = callee.property.name || '';
      if (['spawn','exec','execSync','execFileSync','spawnSync'].includes(prop)) {
        const arg = node.arguments[0];
        if (arg && arg.type !== 'Literal') { hasSpawn = true; patterns.add('spawn_dynamic_arg'); }
        else if (arg) { hasSpawn = true; patterns.add('process_spawn'); }
      }
    }
    // require('http') / require('https') — only flag in combination
    if (callee.type === 'Identifier' && callee.name === 'require') {
      const arg = node.arguments[0];
      if (arg && arg.type === 'Literal' && ['http','https','net'].includes(arg.value)) {
        hasNet = true;
      }
      if (arg && arg.type !== 'Literal') {
        patterns.add('dynamic_require');
      }
    }
    // Buffer.from(longBase64, 'base64')
    if (callee.type === 'MemberExpression' &&
        callee.object.name === 'Buffer' && callee.property.name === 'from') {
      const arg0 = node.arguments[0];
      const arg1 = node.arguments[1];
      if (arg0 && arg0.type === 'Literal' && typeof arg0.value === 'string' &&
          arg0.value.length > 30 && arg1 && arg1.value === 'base64') {
        patterns.add('base64_payload');
      }
    }
  }

  // new Function('code') — new-expression form (distinct from CallExpression)
  if (node.type === 'NewExpression') {
    if (node.callee.type === 'Identifier' && node.callee.name === 'Function') {
      patterns.add('new_function');
    }
  }

  for (const key of Object.keys(node)) {
    const child = node[key];
    if (Array.isArray(child)) child.forEach(walk);
    else if (child && typeof child === 'object' && child.type) walk(child);
  }
}
walk(ast);

// Only flag net if combined with spawn — standalone require('https') is not suspicious
if (hasNet && hasSpawn) patterns.add('outbound_https');

console.log(JSON.stringify({ patterns: Array.from(patterns) }));
"""

_TARBALL_TIMEOUT = 30.0


@dataclass
class AstScanResult:
    flagged: bool
    patterns: list[str] = field(default_factory=list)
    severity: str = "none"
    reason: str = ""


def _scan_shell(script: str) -> list[str]:
    found = []
    for pattern, label in _SHELL_PATTERNS:
        if re.search(pattern, script, re.IGNORECASE):
            found.append(label)
    return found


def _run_acorn(js_code: str) -> list[str]:
    try:
        result = subprocess.run(
            ["node", "-e", _AST_SCRIPT, "--", js_code],
            capture_output=True,
            text=True,
            timeout=30,
        )
        if result.returncode != 0 or not result.stdout.strip():
            return []
        data = json.loads(result.stdout.strip())
        return data.get("patterns", [])
    except (subprocess.TimeoutExpired, json.JSONDecodeError, FileNotFoundError) as e:
        log.warning("acorn scan failed: %s", e)
        return []


def _extract_js_from_tarball(raw: bytes, file_path: str) -> str | None:
    normalized = file_path.lstrip("./")
    candidate = f"package/{normalized}"
    try:
        with tarfile.open(fileobj=io.BytesIO(raw), mode="r:gz") as tar:
            try:
                member = tar.getmember(candidate)
                f = tar.extractfile(member)
                return f.read().decode("utf-8", errors="replace") if f else None
            except KeyError:
                return None
    except tarfile.TarError:
        return None


async def _fetch_tarball_bytes(tarball_url: str) -> bytes | None:
    async with httpx.AsyncClient(timeout=_TARBALL_TIMEOUT) as client:
        try:
            r = await client.get(tarball_url)
        except httpx.TimeoutException:
            raise RegistryTimeoutError("Tarball download timed out")
        try:
            r.raise_for_status()
        except httpx.HTTPStatusError as e:
            raise RegistryTimeoutError(
                f"Tarball CDN returned {e.response.status_code}"
            )
    return r.content


async def run(
    package_name: str,
    new_version: str,
    hooks: dict[str, str],
    tarball_url: str | None = None,
    tarball_bytes: bytes | None = None,
) -> AstScanResult:
    all_patterns: list[str] = []

    for hook_value in hooks.values():
        # Step 1: shell regex scan
        all_patterns.extend(_scan_shell(hook_value))

        # Step 2: AST scan — only if hook invokes a JS file or inline JS
        js_code: str | None = None

        node_file_match = re.match(r"^node\s+([^\s]+\.(?:js|mjs|cjs))", hook_value.strip())
        if node_file_match and tarball_url:
            raw = tarball_bytes or await _fetch_tarball_bytes(tarball_url)
            if raw:
                js_code = _extract_js_from_tarball(raw, node_file_match.group(1))
        elif re.match(r"^node\s+-e\s+", hook_value.strip()):
            # Extract inline JS: node -e "code" or node -e 'code' or node -e code
            m = re.search(r'node\s+-e\s+(.+)$', hook_value.strip(), re.DOTALL)
            if m:
                arg = m.group(1).strip()
                if len(arg) >= 2 and arg[0] in ('"', "'") and arg[-1] == arg[0]:
                    arg = arg[1:-1]
                js_code = arg

        if js_code:
            all_patterns.extend(_run_acorn(js_code))

    if not all_patterns:
        return AstScanResult(flagged=False, reason="No dangerous patterns detected")

    unique = list(dict.fromkeys(all_patterns))
    severity = "high" if any(p in unique for p in ("outbound_https", "eval_dynamic", "base64_payload")) else "medium"

    return AstScanResult(
        flagged=True,
        patterns=unique,
        severity=severity,
        reason=f"Detected: {', '.join(unique)}",
    )
