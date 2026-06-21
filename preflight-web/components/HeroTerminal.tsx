"use client";
import React, { useState, useEffect } from "react";

export function HeroTerminal() {
  const lines = [
    { c: <><span className="prompt">$</span> <span className="val">git push origin pr/482</span></> },
    { c: <><span className="comment"># GitHub Actions: Preflight v0.4.1 triggered</span></> },
    { c: <><span className="prompt">›</span> <span className="val">scanning</span> <span className="key">axios</span> <span className="comment">→</span> <span className="warn">1.7.9 → 1.7.10</span></> },
    { c: <><span className="comment">  [01/04] script_diff …………… </span><span className="block">FLAGGED</span></> },
    { c: <><span className="comment">  [02/04] ast_scan …………………… </span><span className="block">FLAGGED</span></> },
    { c: <><span className="comment">  [03/04] maintainer ………………… </span><span className="block">FLAGGED</span></> },
    { c: <><span className="comment">  [04/04] gemini-2.5-pro ……… </span><span className="block">FLAGGED</span></> },
    { c: <><span className="prompt">›</span> <span className="val">verdict computed in</span> <span className="num">2.84s</span></> },
  ];
  const [step, setStep] = useState(0);
  useEffect(() => {
    if (step < lines.length) {
      const t = setTimeout(() => setStep(step + 1), step === 0 ? 600 : 280 + Math.random() * 180);
      return () => clearTimeout(t);
    }
  }, [step]);

  return (
    <div className="term">
      <div className="term-head">
        <div className="dots"><i className="live"></i><i></i><i></i></div>
        <div className="ttl">github.com/acme-corp/payments-api · pull/482 · checks</div>
        <div className="ttl">📡 live</div>
      </div>
      <div className="term-body">
        {lines.slice(0, step).map((l, i) => (
          <div key={i} className="term-line" style={{ marginBottom: 4 }}>{l.c}</div>
        ))}
        {step >= lines.length && (
          <div style={{ marginTop: 16 }}>
            <div className="pr-comment" style={{ animation: 'signalIn 400ms var(--ease-out)' }}>
              <div className="pr-comment-head">
                <div className="gh-avatar">P</div>
                <span className="who">preflight-ai</span>
                <span>commented · just now</span>
                <span style={{ marginLeft: 'auto', color: 'var(--accent-block)', fontWeight: 700 }}>● BLOCK</span>
              </div>
              <div className="pr-comment-body">
                <h4>🔴 Preflight: BLOCK — Dependency Update Intercepted</h4>
                <div><strong style={{color: 'var(--text-primary)'}}>axios</strong> <span className="text-muted">1.7.9 → 1.7.10</span> · Confidence: <span style={{color:'var(--accent-block)', fontWeight: 700}}>94%</span> · <span className="text-muted">2.84s</span></div>
                <div className="quote">
                  This matches the pattern of a supply-chain hijack. New postinstall hook with outbound network call combined with signing-key rotation after 8 months of inactivity is high-confidence malicious activity.
                </div>
                <table>
                  <thead><tr><th>Signal</th><th>Status</th><th>Detail</th></tr></thead>
                  <tbody>
                    <tr><td>Script diff</td><td className="flagged">🚨 Flagged</td><td>New postinstall hook added</td></tr>
                    <tr><td>AST scan</td><td className="flagged">🚨 Flagged</td><td>Outbound HTTPS + process.spawn</td></tr>
                    <tr><td>Maintainer</td><td className="flagged">🚨 Flagged</td><td>Signing key changed, 238d inactive</td></tr>
                    <tr><td>Gemini AI</td><td className="flagged">🚨 Flagged</td><td>npm account hijack + RAT deployment</td></tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
        {step < lines.length && <span className="term-cursor"></span>}
      </div>
    </div>
  );
}
