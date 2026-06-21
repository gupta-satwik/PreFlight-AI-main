"use client";
import React, { useState, useEffect } from "react";

export function ConfidenceBar({ confidence, animate = true }: { confidence: number, animate?: boolean }) {
  const [w, setW] = useState(animate ? 0 : confidence * 100);
  useEffect(() => {
    if (!animate) return;
    const t = setTimeout(() => setW(confidence * 100), 50);
    return () => clearTimeout(t);
  }, [confidence, animate]);
  
  const tier = confidence < 0.6 ? 'low' : confidence < 0.85 ? 'medium' : 'high';
  return (
    <div className={`confidence-bar ${tier}`}>
      <div className="fill" style={{ width: `${w}%` }}></div>
    </div>
  );
}
