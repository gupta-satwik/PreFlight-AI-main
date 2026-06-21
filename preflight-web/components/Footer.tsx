import React from "react";
import Link from "next/link";

const GITHUB = "https://github.com/Javeria-taj/preflight-ai";
const API_DOCS = "https://preflight-api.onrender.com/docs";
const DEMO_SCAN = "/scans/64a7f3e2b1c4d5e6f7a8b9c0";

export function Footer() {
  return (
    <footer className="footer">
      <div className="container">
        <div className="footer-grid">
          <div className="footer-col">
            <div style={{ display:'flex', alignItems:'center', gap: 10, marginBottom: 14 }}>
              <span className="logo-mark" style={{width:28, height:28}}>P</span>
              <span style={{ fontFamily: 'var(--font-display)', color: 'var(--text-primary)', fontSize: 18, fontWeight: 700 }}>Preflight</span>
            </div>
            <p style={{ color: 'var(--text-muted)', maxWidth: '38ch', lineHeight: 1.7 }}>
              Behavioral pre-execution interceptor for the npm supply chain. Lives in your PR. Free forever, MIT.
            </p>
          </div>

          <div className="footer-col">
            <h5>Product</h5>
            <ul>
              <li><Link href="/demo">Demo</Link></li>
              <li><Link href="/dashboard">Live feed</Link></li>
              <li><Link href={DEMO_SCAN}>Scan example</Link></li>
            </ul>
          </div>

          <div className="footer-col">
            <h5>Resources</h5>
            <ul>
              <li>
                <a href={`${GITHUB}#readme`} target="_blank" rel="noopener noreferrer">
                  Documentation
                </a>
              </li>
              <li>
                <a href={API_DOCS} target="_blank" rel="noopener noreferrer">
                  API reference
                </a>
              </li>
              <li>
                <Link href="/dashboard">Threat database</Link>
              </li>
            </ul>
          </div>

          <div className="footer-col">
            <h5>About</h5>
            <ul>
              <li>
                <Link href="/demo">The axios incident</Link>
              </li>
              <li>
                <a href={`${GITHUB}#how-it-works`} target="_blank" rel="noopener noreferrer">
                  Methodology
                </a>
              </li>
              <li>
                <a href={GITHUB} target="_blank" rel="noopener noreferrer">
                  GitHub ↗
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="footer-bottom">
          <span>
            preflight.dev · MIT ·{" "}
            <a href={GITHUB} target="_blank" rel="noopener noreferrer" style={{ color: 'inherit' }}>
              Javeria-taj/preflight-ai
            </a>{" "}
            · built for NMIT Hacks 2026
          </span>
          <span className="text-muted">no accounts · no tracking · no telemetry</span>
        </div>
      </div>
    </footer>
  );
}
