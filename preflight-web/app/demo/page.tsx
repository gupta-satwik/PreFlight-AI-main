"use client";
import React, { useState, useRef } from "react";
import { VerdictBadge } from "@/components/VerdictBadge";
import { SignalRow } from "@/components/SignalRow";
import { ConfidenceBar } from "@/components/ConfidenceBar";
import { DEMO_SIGNALS, TRACE_LINES, DEMO_SCAN_ID } from "@/lib/data";
import { runAnalysis, AnalyzeResponse } from "@/lib/api";
import Link from "next/link";

export default function DemoPage() {
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(false);
  const [statuses, setStatuses] = useState(['pending','pending','pending','pending']);
  const [traceShown, setTraceShown] = useState(0);
  const [progress, setProgress] = useState(0);
  const [apiResult, setApiResult] = useState<AnalyzeResponse | null>(null);
  const [apiError, setApiError] = useState(false);
  const traceRef = useRef<HTMLDivElement>(null);

  const reset = () => {
    setRunning(false); setDone(false);
    setStatuses(['pending','pending','pending','pending']);
    setTraceShown(0); setProgress(0); setApiResult(null);
  };

  const start = () => {
    if (running) return;
    setRunning(true); setDone(false); setApiResult(null); setApiError(false);
    setStatuses(['pending','pending','pending','pending']);
    setTraceShown(0); setProgress(0);

    // Fire real API call in parallel with animation
    runAnalysis({ package_name: 'axios', old_version: '1.7.9', new_version: '1.7.10', demo: true })
      .then(res => setApiResult(res))
      .catch(() => setApiError(true));

    const order = [0, 1, 2, 3];
    order.forEach((idx, i) => {
      setTimeout(() => {
        setStatuses(prev => prev.map((s, j) => j === idx ? 'analyzing' : s));
      }, 350 + i * 600);
      setTimeout(() => {
        setStatuses(prev => prev.map((s, j) => j === idx ? 'flagged' : s));
      }, 950 + i * 600);
    });

    const total = TRACE_LINES.length;
    let n = 0;
    const traceTick = setInterval(() => {
      n++;
      setTraceShown(n);
      setProgress(Math.min(100, (n / total) * 100));
      if (traceRef.current) traceRef.current.scrollTop = traceRef.current.scrollHeight;
      if (n >= total) {
        clearInterval(traceTick);
        setTimeout(() => { setRunning(false); setDone(true); }, 350);
      }
    }, 220);
  };

  return (
    <div className="demo-page">
      <div className="demo-attack-banner">
        <div className="glyph">⚠</div>
        <div className="meta">
          <strong>THE EXACT <span className="glitch-attack" data-text="ATTACK">ATTACK</span> FROM MARCH 31, 2026</strong>
          North Korean state actors hijacked the axios npm account. 70M weekly downloads.
          The malicious package was live for 3 hours — npm audit, Snyk, and Dependabot all missed it.
        </div>
        <div className="clock">
          <span className="glitch-attack" data-text="attack">attack</span> window<br/>
          <span className="v">03:00:00</span>
        </div>
      </div>

      <div>
        <div className="eyebrow">interactive demo · no account required</div>
        <h1 style={{ fontSize: 'clamp(36px,5vw,60px)', marginBottom: 12 }}>See Preflight catch it.</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: 16, maxWidth: '64ch', lineHeight: 1.7 }}>
          We've pre-loaded the actual payload from the incident. Click <strong style={{color:'var(--accent-pass)'}}>Run analysis</strong> and watch four independent signals fire in real time, ending in a Gemini-synthesised verdict.
        </p>
      </div>

      <div className="demo-form">
        <div className="demo-form-head">
          <span>POST /analyze</span>
          <span>preflight-api.onrender.com</span>
        </div>
        <div className="field-grid">
          <div className="field">
            <label>package_name <span style={{color:'var(--text-muted)'}}>· locked</span></label>
            <div className="field-wrap">
              <input value="axios" disabled />
              <span className="lock-suffix">🔒</span>
            </div>
          </div>
          <div className="field">
            <label>old_version</label>
            <div className="field-wrap"><input value="1.7.9" disabled /></div>
          </div>
          <div className="field">
            <label>new_version <span style={{color:'var(--accent-block)'}}>· hijacked</span></label>
            <div className="field-wrap"><input value="1.7.10" disabled style={{color:'var(--accent-block)'}} /></div>
          </div>
        </div>

        <div className="run-shell">
          <div className="lhs">
            <span className="prompt">$</span>
            <span className="cmd">preflight analyze --package axios --from 1.7.9 --to 1.7.10</span>
          </div>
          {!done ? (
            <button className="btn danger" onClick={start} disabled={running}>
              {running ? '◐ ANALYZING…' : '▶ RUN PREFLIGHT ANALYSIS'}
            </button>
          ) : (
            <button className="btn ghost" onClick={reset}>↺ RESET</button>
          )}
        </div>
      </div>

      {(running || done) && (
        <div className="trace-panel">
          <div className="trace-head">
            <span>● execution trace · {traceShown}/{TRACE_LINES.length} lines</span>
            <span>{done ? 'COMPLETE · 2.84s' : `${(progress/100*2.84).toFixed(2)}s`}</span>
          </div>
          <div className="trace-progress"><div className="fill" style={{ width: `${progress}%` }}></div></div>
          <div className="trace-body" ref={traceRef}>
            {TRACE_LINES.slice(0, traceShown).map((l, i) => (
              <div key={i} className="trace-line">
                <span className="ts">{l.ts}</span>
                <span className={`lvl ${l.lvl}`}>{l.lvl}</span>
                <span className="msg">{l.msg}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {(running || done) && (
        <div>
          <div className="eyebrow" style={{ marginBottom: 18 }}>signal traces · 4 of 4</div>
          <div className="signal-rows">
            {DEMO_SIGNALS.map((s, i) => (
              <SignalRow
                key={i}
                num={s.num}
                icon={s.icon}
                name={s.name}
                reason={s.reason}
                status={statuses[i]}
                delay={i * 120}
              />
            ))}
          </div>
        </div>
      )}

      {done && (
        <div className="verdict-card" style={{ animation: 'signalIn 500ms var(--ease-out)' }}>
          {apiError && !apiResult && (
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--accent-warn)', padding: '4px 10px', border: '1px solid var(--accent-warn)', display: 'inline-block', marginBottom: 12 }}>
              ⚠ offline mode · using cached result
            </div>
          )}
          <div className="verdict-head">
            <div className="badge-col">
              <VerdictBadge verdict={apiResult?.verdict ?? 'BLOCK'} large />
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginTop: 6 }}>
                {apiResult ? `ID ${apiResult.scan_id}` : `ID ${DEMO_SCAN_ID}`} · {((apiResult?.duration_ms ?? 2840)/1000).toFixed(2)}s · gemini-2.5-pro
              </div>
            </div>
            <div className="conf-wrap">
              <div className="conf-num"><span>CONFIDENCE</span><span>{apiResult ? `${Math.round(apiResult.confidence * 100)}%` : '94%'}</span></div>
              <ConfidenceBar confidence={apiResult?.confidence ?? 0.94} animate={true} />
              <div className="id-row">
                <span>{apiResult ? `scan_id: ${apiResult.scan_id}` : '4 / 4 signals flagged'}</span>
                <span>fail-safe rule: 3+ signals → always BLOCK</span>
              </div>
            </div>
          </div>
          <div className="verdict-body">
            <div className="verdict-summary">
              <strong>Do not merge.</strong> {apiResult?.signals.llm_reasoning.summary ?? 'The 1.7.10 release introduces a new postinstall hook that spawns a child process and opens an outbound HTTPS connection to a recently-registered domain. The publisher\'s signing key was rotated approximately six hours before this release, after 238 days of inactivity. The combined signal pattern is a near-perfect match for the npm account hijack + RAT deployment family.'}
            </div>
            <div className="attack-pattern">
              <span className="key">attack_pattern:</span>
              <span className="val">{apiResult?.signals.llm_reasoning.attack_pattern ?? 'npm_account_hijack_rat_deployment'}</span>
            </div>
          </div>
          <div className="verdict-ftr">
            <Link className="btn primary" href={`/scans/${apiResult?.scan_id ?? DEMO_SCAN_ID}`}>
              ↗ Full scan detail
            </Link>
            <button className="btn ghost" onClick={reset}>↺ Run again</button>
            <span style={{ marginLeft: 'auto', fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-muted)', alignSelf: 'center' }}>
              written to mongodb · published to community feed
            </span>
          </div>
        </div>
      )}

      {done && (
        <div>
          <div className="eyebrow" style={{ marginBottom: 14 }}>this is what lands on the PR</div>
          <div className="pr-comment">
            <div className="pr-comment-head">
              <div className="gh-avatar">P</div>
              <span className="who">preflight-ai</span>
              <span>commented · just now</span>
              <span style={{ marginLeft: 'auto', color: 'var(--accent-block)', fontWeight: 700 }}>● BLOCK</span>
            </div>
            <div className="pr-comment-body">
              <h4>🔴 Preflight: BLOCK — Dependency Update Intercepted</h4>
              <div><strong style={{color:'var(--text-primary)'}}>axios</strong> <span className="text-muted">1.7.9 → 1.7.10</span> · Confidence: <span style={{color:'var(--accent-block)', fontWeight: 700}}>94%</span> · <span className="text-muted">2.84s</span></div>
              <div className="quote">
                This matches the pattern of a supply-chain hijack. New postinstall hook with outbound network call combined with signing-key rotation after 8 months of inactivity is high-confidence malicious activity.
              </div>
              <table>
                <thead><tr><th>Signal</th><th>Status</th><th>Detail</th></tr></thead>
                <tbody>
                  <tr><td>Script diff</td><td className="flagged">🚨 Flagged</td><td>New postinstall hook added</td></tr>
                  <tr><td>AST scan</td><td className="flagged">🚨 Flagged</td><td>Outbound HTTPS + process.spawn detected</td></tr>
                  <tr><td>Maintainer</td><td className="flagged">🚨 Flagged</td><td>Signing key changed, 238 days inactive</td></tr>
                  <tr><td>Gemini AI</td><td className="flagged">🚨 Flagged</td><td>npm account hijack + RAT deployment pattern</td></tr>
                </tbody>
              </table>
              <div style={{ marginTop: 14 }}>
                <span className="glitch-attack" data-text="Attack">Attack</span><span style={{ color: 'var(--accent-block)' }}> pattern:</span> <code style={{ color: 'var(--accent-block)' }}>npm_account_hijack_rat_deployment</code>
              </div>
              <div style={{ marginTop: 12, color: 'var(--text-secondary)' }}>
                ❌ Do NOT merge · 🔍 Review manually · 📢 Report to npm security
              </div>
              <div style={{ marginTop: 14, paddingTop: 12, borderTop: '1px solid var(--border)', fontSize: 11, color: 'var(--text-muted)' }}>
                <a>Preflight</a> · <Link href={`/scans/${apiResult?.scan_id ?? DEMO_SCAN_ID}`}>View full analysis →</Link>
              </div>
            </div>
          </div>
        </div>
      )}

      {!running && !done && (
        <div style={{ padding: 32, border: '1px dashed var(--border-strong)', textAlign: 'center', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: 12 }}>
          ↑ click <span style={{ color: 'var(--accent-block)' }}>RUN PREFLIGHT ANALYSIS</span> to begin · execution takes ≈2.8 seconds · no GitHub account required
        </div>
      )}
    </div>
  );
}
