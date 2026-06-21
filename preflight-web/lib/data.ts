export const HOW_STEPS = [
  { num: '01', icon: '◇', name: 'PR opens', elapsed: '+0.0s', detail: 'Webhook fires the moment a developer pushes a dependency change.' },
  { num: '02', icon: '⌗', name: 'Lockfile diff', elapsed: '+0.4s', detail: 'We extract the exact set of new and bumped packages from the lockfile — not the manifest.' },
  { num: '03', icon: '⊟', name: 'Script analysis', elapsed: '+1.1s', detail: 'Every install hook diffed against its previous version. New postinstall = instant flag.' },
  { num: '04', icon: '◈', name: 'AI reasoning', elapsed: '+2.4s', detail: 'Gemini correlates four signals, weighs precedent, writes a plain-English verdict.' },
  { num: '05', icon: '✎', name: 'Verdict posted', elapsed: '+2.8s', detail: 'A structured PR comment lands within seconds. Confidence, signals, rationale.' },
  { num: '06', icon: '⊘', name: 'PR blocked', elapsed: '+3.0s', detail: 'On BLOCK we set required-status to failing. Merge impossible until override — and we log who.' },
];

export const SIGNAL_INFO = [
  { num:'SIGNAL 01', icon: 'SD', name: 'Script Diff',
    desc: 'Diffs every install hook (preinstall, install, postinstall) against the previous version. New scripts in patch releases are nearly always malicious.',
    flags: ['NEW HOOK', 'CHANGED HOOK', 'REMOVED HOOK'],
    example: '+ "postinstall": "node ./_postinstall.js"\n- (no postinstall in 1.7.9)\n→ NEW HOOK ADDED · severity HIGH' },
  { num:'SIGNAL 02', icon: 'AS', name: 'AST Scan',
    desc: 'Static analysis on every JS file with acorn. Catches process.spawn, child_process, dynamic require, base64-decoded payloads, and outbound network calls.',
    flags: ['EVAL', 'SPAWN', 'OUTBOUND HTTPS', 'OBFUSCATED'],
    example: 'pattern: child_process.spawn → outbound https\nseverity: critical\n→ matches 4 known IOCs' },
  { num:'SIGNAL 03', icon: 'MT', name: 'Maintainer',
    desc: 'Tracks the npm publisher of every release. Detects key rotations, account-age, recent inactivity, and 2FA status — the supply-chain weak link.',
    flags: ['KEY CHANGE', 'INACTIVE 90D+', 'NEW MAINTAINER', '2FA OFF'],
    example: 'publisher_key: rotated 6h ago\nlast_release: 238d inactive\n2fa: disabled\n→ HIJACK PATTERN' },
  { num:'SIGNAL 04', icon: 'AI', name: 'Gemini AI',
    desc: 'Correlates the three deterministic signals plus 50+ contextual features. Returns a verdict, a confidence score, and an attack-pattern label.',
    flags: ['GEMINI 2.5 PRO', 'ATTACK PATTERN', 'CONFIDENCE'],
    example: 'pattern: npm_account_hijack\nclass: rat_deployment\nconfidence: 0.94\n→ BLOCK' },
];

export const INSTALL_YAML = `# .github/workflows/preflight.yml
name: Preflight
on:
  pull_request:
    paths:
      - 'package-lock.json'
      - 'pnpm-lock.yaml'
      - 'yarn.lock'
permissions:
  pull-requests: write
  statuses: write
  contents: read
jobs:
  scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: Javeria-taj/preflight-ai/preflight-action@v1.0.0
        with:
          lockfile: package-lock.json
          fail_on_block: true
        env:
          GITHUB_TOKEN: \${{ secrets.GITHUB_TOKEN }}`;

export const DEMO_SIGNALS = [
  { num: '01', icon: 'SD', name: 'Script Diff', reason: 'New postinstall hook added: ./_postinstall.js' },
  { num: '02', icon: 'AS', name: 'AST Scan', reason: 'Outbound HTTPS + child_process.spawn detected' },
  { num: '03', icon: 'MT', name: 'Maintainer', reason: 'Publisher key rotated, 238 days inactive prior' },
  { num: '04', icon: 'AI', name: 'Gemini AI', reason: 'Pattern: npm_account_hijack_rat_deployment' },
];

export const TRACE_LINES = [
  { ts: '00:00.04', lvl: 'info', msg: 'lockfile_delta computed · 1 package changed: axios' },
  { ts: '00:00.18', lvl: 'run',  msg: 'GET registry.npmjs.org/axios/-/axios-1.7.9.tgz' },
  { ts: '00:00.41', lvl: 'run',  msg: 'GET registry.npmjs.org/axios/-/axios-1.7.10.tgz' },
  { ts: '00:00.62', lvl: 'info', msg: 'tarballs extracted · diffing scripts' },
  { ts: '00:00.71', lvl: 'flag', msg: 'script_diff: postinstall hook added — not present in 1.7.9' },
  { ts: '00:01.05', lvl: 'run',  msg: 'acorn AST · ./_postinstall.js' },
  { ts: '00:01.32', lvl: 'flag', msg: 'ast_scan: child_process.spawn → outbound https.request' },
  { ts: '00:01.34', lvl: 'flag', msg: 'ast_scan: Buffer.from(.., "base64") · 4 IOC matches' },
  { ts: '00:01.61', lvl: 'run',  msg: 'GET registry.npmjs.org/-/v1/security/advisories' },
  { ts: '00:01.84', lvl: 'flag', msg: 'maintainer: signing_key fingerprint changed (6h ago)' },
  { ts: '00:01.88', lvl: 'flag', msg: 'maintainer: 238d inactive prior to release · 2fa=disabled' },
  { ts: '00:02.15', lvl: 'run',  msg: 'gemini-2.5-pro · synthesizing 3 signals + 47 features' },
  { ts: '00:02.71', lvl: 'flag', msg: 'gemini: pattern=npm_account_hijack_rat_deployment c=0.94' },
  { ts: '00:02.84', lvl: 'ok',   msg: 'verdict=BLOCK · confidence=0.94 · written to MongoDB' },
];

export const DEMO_SCAN_ID = '64a7f3e2b1c4d5e6f7a8b9c0';
