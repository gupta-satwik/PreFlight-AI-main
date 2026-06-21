"use client";
import React, { useState, useEffect } from "react";
import { LivePulse } from "./LivePulse";
import Link from "next/link";
import { usePathname } from "next/navigation";

const GITHUB_REPO = "Javeria-taj/preflight-ai";
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "https://preflight-api.onrender.com";

function fmtStars(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(n);
}

export function Topbar() {
  const [time, setTime] = useState('');
  const [stars, setStars] = useState<string | null>(null);
  const [apiOk, setApiOk] = useState<boolean | null>(null);
  const pathname = usePathname() || "";
  const active = pathname === '/' ? 'home' : pathname.startsWith('/dashboard') ? 'dashboard' : pathname.startsWith('/demo') ? 'demo' : pathname.startsWith('/scans') ? 'scan' : '';

  // UTC clock
  useEffect(() => {
    const upd = () => setTime(new Date().toUTCString().slice(17, 25));
    upd();
    const t = setInterval(upd, 1000);
    return () => clearInterval(t);
  }, []);

  // GitHub stars
  useEffect(() => {
    fetch(`https://api.github.com/repos/${GITHUB_REPO}`)
      .then(r => r.json())
      .then(d => { if (typeof d.stargazers_count === 'number') setStars(fmtStars(d.stargazers_count)); })
      .catch(() => {});
  }, []);

  // API health status
  useEffect(() => {
    const check = () =>
      fetch(`${API_URL}/health`)
        .then(r => r.json())
        .then(d => setApiOk(d.status === 'ok'))
        .catch(() => setApiOk(false));
    check();
    const t = setInterval(check, 30000);
    return () => clearInterval(t);
  }, []);

  const apiLabel = apiOk === null ? 'API · …' : apiOk ? 'API · OK' : 'API · DOWN';
  const apiColor = apiOk === null ? 'var(--accent-warn)' : apiOk ? 'var(--accent-pass)' : 'var(--accent-block)';

  return (
    <div className="topbar">
      <div className="topbar-left">
        <Link className="logo" href="/">
          <span className="logo-mark">P</span>
          <span>Preflight</span>
          <span className="ver">v1.0.0</span>
        </Link>
        <div className="nav-links">
          {[
            { id: 'home',      label: '_INDEX', num: '01', href: '/' },
            { id: 'dashboard', label: '_FEED',  num: '02', href: '/dashboard' },
            { id: 'demo',      label: '_DEMO',  num: '03', href: '/demo' },
            { id: 'scan',      label: '_SCAN',  num: '04', href: '/scans/64a7f3e2b1c4d5e6f7a8b9c0' },
          ].map(n => (
            <Link key={n.id} className={`nav-link ${active === n.id ? 'active' : ''}`} href={n.href}>
              <span className="nav-num">{n.num}</span>
              <span>{n.label}</span>
            </Link>
          ))}
        </div>
      </div>
      <div className="topbar-right">
        <div className="status-dot" style={{ color: apiColor }}>
          <LivePulse />
          <span>{apiLabel}</span>
        </div>
        <div className="utc-clock"><span className="lbl">UTC</span>{time}</div>
        <a
          className="gh-link"
          href={`https://github.com/${GITHUB_REPO}`}
          target="_blank"
          rel="noopener noreferrer"
        >
          <span>★</span>
          <span>{stars ?? '—'}</span>
          <span className="text-muted">github</span>
        </a>
      </div>
    </div>
  );
}
