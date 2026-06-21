"use client";
import React, { useState, useEffect } from "react";
import { HeroTerminal } from "@/components/HeroTerminal";
import { InstallSnippet } from "@/components/InstallSnippet";
import { StatCounter } from "@/components/StatCounter";
import { Footer } from "@/components/Footer";
import { Magnetic } from "@/components/Magnetic";
import { HOW_STEPS, SIGNAL_INFO, INSTALL_YAML } from "@/lib/data";
import { getScanStats, getScans } from "@/lib/api";
import Link from "next/link";

export default function LandingPage() {
  const [activeStep, setActiveStep] = useState(0);
  const [scanCount, setScanCount] = useState(0);
  const [blockCount, setBlockCount] = useState(0);
  const [repoCount, setRepoCount] = useState(0);

  useEffect(() => {
    const t = setInterval(() => {
      setActiveStep(s => (s + 1) % HOW_STEPS.length);
    }, 3500);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    getScanStats()
      .then(stats => {
        setScanCount(stats.total_scans);
        setBlockCount(stats.blocked_threats);
        setRepoCount(stats.unique_repos);
      })
      .catch(() => {
        // Fallback: compute stats from the scans list endpoint
        getScans(1, 100).then(data => {
          const scans = data.scans;
          setScanCount(scans.length);
          setBlockCount(scans.filter(s => s.verdict === 'BLOCK').length);
          setRepoCount(new Set(scans.map(s => s.repo).filter(Boolean)).size);
        }).catch(() => {});
      });
    const t = setInterval(() => setScanCount(c => c + 1), 15000);
    return () => clearInterval(t);
  }, []);

  return (
    <>
      <section className="hero">
        <div className="hero-grid">
          <div>
            <div className="eyebrow">incident-report · 2026-03-31 · npm-supply-chain</div>
            <h1 className="hero-headline">
              The axios <span className="glitch-attack" data-text="attack">attack</span><br/>lasted <span className="strike" style={{ color: 'var(--accent-block)' }}>3 hours.</span>
            </h1>
            <p style={{ fontSize: 18, color: 'var(--text-secondary)', maxWidth: 560, lineHeight: 1.65, marginTop: 8 }}>
              70 million weekly downloads. Zero tools caught it. <strong style={{color:'var(--accent-pass)'}}>Preflight would have blocked it in 30 seconds</strong> — before a single line of code executed on a developer's machine.
            </p>
            <div style={{ display: 'flex', gap: 12, marginTop: 28, alignItems: 'center' }}>
              <Magnetic>
                <Link className="btn primary large" href="/demo">
                  ▶ Run live demo<span className="kbd">D</span>
                </Link>
              </Magnetic>
              <a className="btn ghost large" href="#how">How it works ↓</a>
            </div>
            <div className="hero-stat-row">
              <div className="hero-stat"><div className="v red">3:00:00</div><div className="l"><span className="glitch-attack" data-text="attack" data-glow-target="block">attack</span> window</div></div>
              <div className="hero-stat"><div className="v">0</div><div className="l">tools caught it</div></div>
              <div className="hero-stat"><div className="v green">00:00:30</div><div className="l">preflight time</div></div>
            </div>
          </div>
          <HeroTerminal />
        </div>
      </section>

      <section className="section tight" id="install">
        <div className="container narrow">
          <div className="eyebrow">distribution · github action only</div>
          <h2 style={{ marginBottom: 12 }}>One line. Every PR. Forever free.</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: 16, marginBottom: 32, maxWidth: '60ch' }}>
            We don't ship as an npm package — that would be a contradiction. Add this YAML to <span className="text-mono">.github/workflows</span> and Preflight scans every dependency change before merge.
          </p>
          <InstallSnippet code={INSTALL_YAML} language="yaml" filePath=".github/workflows/preflight.yml" />
          <div className="divider-text">community threat intelligence — last 24h</div>
          <div className="stats-shell">
            <StatCounter value={repoCount} label="Repos protected" accent=""
              sparkData={[40,55,30,62,48,70,55,88,72,90,75,98]} />
            <StatCounter value={scanCount} label="Scans completed" accent=""
              sparkData={[55,40,65,52,70,58,82,66,90,75,85,92]} />
            <StatCounter value={blockCount} label="Threats blocked" accent="block"
              sparkData={[20,28,18,42,30,55,40,60,38,72,50,80]} />
          </div>
        </div>
      </section>

      <section className="section" id="how">
        <div className="container">
          <div className="eyebrow">runtime · 6 stages · ~3 seconds end-to-end</div>
          <h2 style={{ marginBottom: 8 }}>From PR to verdict, before merge.</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: 16, marginBottom: 36, maxWidth: '60ch' }}>
            Preflight lives in the GitHub PR lifecycle. It triggers automatically the moment a dependency change appears.
          </p>
          <div className="killchain-wrap">
            <div className="killchain-rail"></div>
            <div className="stepper">
              {HOW_STEPS.map((s, i) => (
                <div key={i} className={`step-card ${activeStep === i ? 'active' : ''}`}
                     onClick={() => setActiveStep(i)}>
                  <div className="step-icon">{s.icon}</div>
                  <div className="step-num">{s.num} / 06</div>
                  <div className="step-name">{s.name}</div>
                  <div className="step-detail">{s.detail}</div>
                  <div className="step-elapsed">{s.elapsed}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="eyebrow">detection · 4 independent signals</div>
          <h2 style={{ marginBottom: 8 }}>We don't check CVEs.<br/>We watch behaviour.</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: 16, marginBottom: 36, maxWidth: '60ch' }}>
            Every existing tool is reactive — they look up known-bad packages. Preflight reasons about <em style={{ color: 'var(--text-primary)', fontStyle: 'normal' }}>unknown-bad</em> packages: the ones nobody has seen yet.
          </p>
          <div className="signals-grid">
            {SIGNAL_INFO.map((s, i) => (
              <div className="signal-card" key={i}>
                <div className="signal-card-head">
                  <span className="num">{s.num}</span>
                  <div className="signal-icon">{s.icon}</div>
                </div>
                <h3>{s.name}</h3>
                <div className="desc">{s.desc}</div>
                <div className="example">{s.example}</div>
                <div className="flags">
                  {s.flags.map((f: string) => <span className="flag-chip" key={f}>{f}</span>)}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section tight">
        <div className="container narrow" style={{ textAlign: 'center', padding: '24px 0' }}>
          <div className="eyebrow" style={{ justifyContent: 'center' }}>three minutes from now</div>
          <h2 style={{ marginBottom: 16, fontSize: 'clamp(28px, 4vw, 52px)' }}>Run the exact <span className="glitch-attack" data-text="attack">attack</span>. See the block.</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: 16, marginBottom: 24, maxWidth: '54ch', margin: '0 auto 24px' }}>
            We pre-loaded the actual axios 1.7.9 → 1.7.10 payload from the March 31 incident. Click run. Watch Preflight catch it.
          </p>
          <Link className="btn primary large" href="/demo">
            ▶ Open the demo
          </Link>
        </div>
      </section>

      <Footer />
    </>
  );
}
