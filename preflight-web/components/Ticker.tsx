"use client";
import React, { useState, useEffect } from "react";
import { LivePulse } from "./LivePulse";
import { getScans, getAdvisoryFeed } from "../lib/api";

type TickerItem = { v: string; pkg: string; repo: string; t: string };

export function Ticker() {
  const [items, setItems] = useState<TickerItem[]>([]);

  useEffect(() => {
    Promise.allSettled([
      getScans(1, 12),
      getAdvisoryFeed(),
    ]).then(([scansRes, advisoryRes]) => {
      const scanItems: TickerItem[] =
        scansRes.status === 'fulfilled' && scansRes.value.scans.length > 0
          ? scansRes.value.scans.map(s => ({
              v:    s.verdict,
              pkg:  `${s.package_name}@${s.new_version}`,
              repo: s.repo ?? 'community',
              t:    new Date(s.scanned_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            }))
          : [];

      const advisoryItems: TickerItem[] =
        advisoryRes.status === 'fulfilled'
          ? advisoryRes.value.map(a => ({
              v:    a.verdict,
              pkg:  `${a.package}@${a.to}`,
              repo: 'advisory',
              t:    a.time,
            }))
          : [];

      // Interleave scan items and advisory items for variety
      const combined: TickerItem[] = [];
      const len = Math.max(scanItems.length, advisoryItems.length);
      for (let i = 0; i < len; i++) {
        if (scanItems[i])    combined.push(scanItems[i]);
        if (advisoryItems[i]) combined.push(advisoryItems[i]);
      }

      if (combined.length > 0) {
        setItems([...combined, ...combined]); // duplicate for seamless infinite scroll
      }
    });
  }, []);

  return (
    <div className="ticker">
      <div className="ticker-label">
        <LivePulse />LIVE INTERCEPTS
      </div>
      <div className="ticker-track">
        {items.map((it, i) => (
          <div key={i} className="ticker-item">
            <span className={`verdict-dot ${it.v.toLowerCase()}`} style={{ width:6, height:6, display:'inline-block' }}></span>
            <span style={{ color: 'var(--text-muted)' }}>{it.t}</span>
            <strong>{it.v}</strong>
            <span>{it.pkg}</span>
            <span style={{ color: 'var(--text-muted)' }}>· {it.repo}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
