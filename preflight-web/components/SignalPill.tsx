import React from "react";

export function SignalPill({ name, flagged }: { name: string, flagged: boolean }) {
  return (
    <span className={`signal-pill ${flagged ? 'flagged' : 'clear'}`}>
      <span className="dot"></span>{name}
    </span>
  );
}
