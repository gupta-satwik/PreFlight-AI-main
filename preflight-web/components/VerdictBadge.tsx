import React from "react";

export function VerdictBadge({ verdict, large }: { verdict?: string, large?: boolean }) {
  const v = (verdict || 'PASS').toLowerCase();
  return <span className={`verdict-badge ${v}${large ? ' large' : ''}`}>{verdict || 'PASS'}</span>;
}
