import React from "react";

export function SignalRow({ num, name, icon, status, reason, delay = 0 }: any) {
  const cls = `signal-row ${status}`;
  const statusText: Record<string, string> = {
    pending: 'PENDING',
    analyzing: 'ANALYZING',
    flagged: '✕ FLAGGED',
    clear: '✓ CLEAR'
  };
  return (
    <div className={cls} style={{ animationDelay: `${delay}ms` }}>
      <span className="num">{num}</span>
      <span className="icon-box">{icon}</span>
      <span className="name">{name}</span>
      <span className="reason">
        {status === 'pending' && '— awaiting input —'}
        {status === 'analyzing' && 'Running…'}
        {(status === 'flagged' || status === 'clear') && reason}
      </span>
      <span className="status">{statusText[status]}</span>
    </div>
  );
}
