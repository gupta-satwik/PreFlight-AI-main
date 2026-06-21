"use client";
import React, { useState, useEffect, useRef } from "react";

export function StatCounter({ value, label, accent, unit, sparkData, delta }: { value: number, label: string, accent?: string, unit?: string, sparkData?: number[], delta?: string }) {
  const [display, setDisplay] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const startedRef = useRef(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (e.isIntersecting && !startedRef.current) {
          startedRef.current = true;
          const start = performance.now();
          const dur = 1600;
          const tick = (t: number) => {
            const p = Math.min(1, (t - start) / dur);
            const eased = 1 - Math.pow(1 - p, 3);
            setDisplay(Math.floor(value * eased));
            if (p < 1) requestAnimationFrame(tick); else setDisplay(value);
          };
          requestAnimationFrame(tick);
        }
      });
    }, { threshold: 0.3 });
    io.observe(el);
    return () => io.disconnect();
  }, [value]);
  return (
    <div className={`stat-counter ${accent || ''}`} ref={ref}>
      <div className="stat-key">
        <span>● {label.split(' ')[0].toUpperCase()}</span>
        <span style={{ marginLeft: 'auto' }}>LIVE</span>
      </div>
      <div className="stat-value">
        {display.toLocaleString()}{unit && <span className="unit">{unit}</span>}
      </div>
      <div className="stat-label">
        <span>{label}</span>
        {delta && <span className="stat-delta">▲ {delta}</span>}
      </div>
      {sparkData && (
        <div className={`sparkline ${accent || ''}`}>
          {sparkData.map((v, i) => (
            <div key={i} className="bar" style={{ height: `${v}%` }}></div>
          ))}
        </div>
      )}
    </div>
  );
}
