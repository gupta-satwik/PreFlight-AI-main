"use client";
import React, { useRef, useCallback } from "react";
import { VerdictBadge } from "./VerdictBadge";
import { SignalPill } from "./SignalPill";
import { ConfidenceBar } from "./ConfidenceBar";
import Link from "next/link";

export function ScanCard({ scan, expanded, onToggle, isNew }: any) {
  const verdictClass = `verdict-${scan.verdict.toLowerCase()}`;
  const cardRef = useRef<HTMLDivElement>(null);

  // Spotlight border: track mouse using CSS vars only — no useState, no re-render
  const onMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const el = cardRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    el.style.setProperty("--mouse-x", `${e.clientX - rect.left}px`);
    el.style.setProperty("--mouse-y", `${e.clientY - rect.top}px`);
  }, []);

  const onMouseLeave = useCallback(() => {
    const el = cardRef.current;
    if (!el) return;
    // Reset to off-screen so the gradient is hidden
    el.style.setProperty("--mouse-x", "-200px");
    el.style.setProperty("--mouse-y", "-200px");
  }, []);

  return (
    <div
      ref={cardRef}
      className={`scan-card ${verdictClass} ${expanded ? "expanded" : ""} ${isNew ? "new-arrival" : ""}`}
      data-glow-target={scan.verdict.toLowerCase()}
      onMouseMove={onMouseMove}
      onMouseLeave={onMouseLeave}
      onClick={onToggle}
      style={{ ["--mouse-x" as any]: "-200px", ["--mouse-y" as any]: "-200px" }}
    >
      <div className="scan-card-head">
        <VerdictBadge verdict={scan.verdict} />
        <div className="pkg-meta">
          <div className="pkg-name">
            {scan.package}<span className="ver"> @{scan.from ?? "[new]"}</span>
            <span className="arrow">→</span>
            <span className="new">{scan.to}</span>
          </div>
          <div className="repo-name">
            <span>{scan.repo}</span>
            {scan.pr && <span className="pr">#{scan.pr}</span>}
          </div>
        </div>
        <div className="signals-row" style={{ display: "flex", justifySelf: "end", gap: 6 }}>
          {scan.signals.map((s: any) => <SignalPill key={s.name} name={s.name.split(" ")[0]} flagged={s.flagged} />)}
        </div>
        <span className="confidence-pct">{Math.round(scan.confidence * 100)}%</span>
        <span className="timestamp">{scan.time}</span>
      </div>
      <div className="scan-card-conf">
        <span className="text-muted">conf</span>
        <div className="conf-wrap"><ConfidenceBar confidence={scan.confidence} animate={false} /></div>
        <span>{scan.duration}ms</span>
      </div>
      {expanded && (
        <div className="scan-card-expanded">
          <p>{scan.summary}</p>
          <div className="row">
            {scan.advisoryUrl ? (
              <a className="btn ghost" href={scan.advisoryUrl} target="_blank" rel="noopener noreferrer"
                 onClick={(e) => e.stopPropagation()}>
                View advisory ↗
              </a>
            ) : (
              <Link className="btn ghost" href={`/scans?id=${scan.id}`} onClick={(e) => e.stopPropagation()}>
                View full scan →
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
