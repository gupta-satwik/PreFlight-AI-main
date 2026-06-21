"use client";

import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";

export function Terminal({ lines, autoScroll = true }: { lines: any[]; autoScroll?: boolean }) {
  const [visibleLines, setVisibleLines] = useState<any[]>([]);

  useEffect(() => {
    if (!autoScroll) {
      setVisibleLines(lines);
      return;
    }
    
    // Simulate typing/streaming effect
    let currentIndex = 0;
    setVisibleLines([]);
    
    const interval = setInterval(() => {
      if (currentIndex < lines.length) {
        setVisibleLines(prev => [...prev, lines[currentIndex]]);
        currentIndex++;
      } else {
        clearInterval(interval);
      }
    }, 150);

    return () => clearInterval(interval);
  }, [lines, autoScroll]);

  return (
    <div className="border border-brutal bg-[#050505] font-mono text-xs overflow-hidden flex flex-col h-full shadow-2xl relative">
      <div className="bg-[var(--bg-surface)] border-b border-brutal px-4 py-2 flex justify-between items-center text-[var(--text-muted)]">
        <span>sys_log_stream</span>
        <span className="text-[var(--accent-pass)] animate-pulse-fast">●</span>
      </div>
      <div className="p-4 flex-1 overflow-y-auto space-y-1">
        {visibleLines.map((line, i) => {
          if (!line) return null;
          let colorClass = "text-[var(--text-secondary)]";
          if (line.lvl === "flag") colorClass = "text-[var(--accent-block)]";
          if (line.lvl === "ok") colorClass = "text-[var(--accent-pass)]";
          if (line.lvl === "run") colorClass = "text-[var(--accent-blue)]";

          return (
            <motion.div 
              initial={{ opacity: 0, x: -5 }}
              animate={{ opacity: 1, x: 0 }}
              key={i} 
              className="flex gap-4"
            >
              <span className="text-[var(--text-muted)] w-16 shrink-0">{line.ts}</span>
              <span className={`uppercase w-12 shrink-0 ${colorClass}`}>{line.lvl}</span>
              <span className="text-[var(--text-primary)]">{line.msg}</span>
            </motion.div>
          );
        })}
        {visibleLines.length < lines.length && (
          <div className="animate-pulse text-[var(--text-muted)] mt-2">_</div>
        )}
      </div>
      <div className="scanline-effect"></div>
    </div>
  );
}
