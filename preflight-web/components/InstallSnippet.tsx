"use client";
import React, { useState } from "react";

export function InstallSnippet({ code, language = 'yaml', filePath }: { code: string, language?: string, filePath?: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard?.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };
  const renderLine = (line: string, i: number) => {
    const m = line.match(/^(\s*)(#.*)$/);
    if (m) return <div key={i}><span className="tk-com">{m[2]}</span></div>;
    const kv = line.match(/^(\s*-?\s*)([\w\-]+)(:)(\s*)(.*)$/);
    if (kv) {
      return (
        <div key={i}>
          {kv[1]}
          <span className="tk-key">{kv[2]}</span>
          <span className="tk-pun">{kv[3]}</span>
          {kv[4]}
          <span className="tk-str">{kv[5]}</span>
        </div>
      );
    }
    return <div key={i}>{line || '\u00A0'}</div>;
  };
  const lines = code.split('\n');
  return (
    <div className="code-block">
      <div className="code-block-header">
        <div className="left">
          <span className="lang-tag">{language}</span>
          {filePath && <span className="file-path">{filePath}</span>}
        </div>
        <button className={`copy-btn ${copied ? 'copied' : ''}`} onClick={handleCopy}>
          {copied ? '✓ Copied' : '⎘ Copy'}
        </button>
      </div>
      <div className="code-body">
        <div className="gutter">
          {lines.map((_, i) => <div key={i}>{i + 1}</div>)}
        </div>
        <div className="lines">{lines.map(renderLine)}</div>
      </div>
      {copied && <div className="toast">Copied to clipboard</div>}
    </div>
  );
}
