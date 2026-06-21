"use client";
import { useEffect, useRef } from "react";

/**
 * GridGlow — global radial-gradient grid that tracks the mouse.
 * - Glow mask (--gx, --gy) updates instantly so the spotlight feels crisp.
 * - Grid background-position (--bx, --by) lerps toward the cursor at 0.04
 *   for a soft parallax drift — the lines themselves gently follow the mouse.
 * - Context-aware --glow-color shifts based on data-glow-target elements.
 * - Uses CSS variables only (no useState) for 60fps, zero re-renders.
 */

const LERP = 0.04;          // grid drift smoothness (lower = silkier)
const PARALLAX = 0.12;      // how much the grid shifts relative to cursor (0–1)

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

export function GridGlow() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    let mouseX = window.innerWidth / 2;
    let mouseY = window.innerHeight / 2;
    let bx = 0;
    let by = 0;
    let rafId = 0;

    // Instant glow mask + color update on mousemove
    const onMove = (e: MouseEvent) => {
      mouseX = e.clientX;
      mouseY = e.clientY;

      // Snap the spotlight mask immediately (feels crisp)
      el.style.setProperty("--gx", `${mouseX}px`);
      el.style.setProperty("--gy", `${mouseY}px`);

      // Context-aware glow color and grid opacity
      const target = (e.target as Element).closest?.("[data-glow-target]");
      const ctx = target?.getAttribute("data-glow-target");
      if (ctx === "block") {
        el.style.setProperty("--glow-color", "rgba(239, 68, 68, 0.4)"); // var(--accent-block) brighter
        el.style.setProperty("--grid-opacity", "0.7");
      } else if (ctx === "pass") {
        el.style.setProperty("--glow-color", "rgba(34, 197, 94, 0.4)"); // var(--accent-pass) brighter
        el.style.setProperty("--grid-opacity", "0.7");
      } else if (ctx === "warn") {
        el.style.setProperty("--glow-color", "rgba(234, 179, 8, 0.4)"); // var(--accent-warn) brighter
        el.style.setProperty("--grid-opacity", "0.7");
      } else {
        el.style.setProperty("--glow-color", "rgba(120,180,255,0.15)");
        el.style.setProperty("--grid-opacity", "0.4");
      }
    };

    // rAF loop: grid lines drift softly toward the cursor
    const tick = () => {
      // Target offset: cursor position scaled by PARALLAX, centered around 0
      const targetBx = (mouseX / window.innerWidth  - 0.5) * 48 * PARALLAX;
      const targetBy = (mouseY / window.innerHeight - 0.5) * 48 * PARALLAX;

      bx = lerp(bx, targetBx, LERP);
      by = lerp(by, targetBy, LERP);

      el.style.setProperty("--bx", `${bx.toFixed(3)}px`);
      el.style.setProperty("--by", `${by.toFixed(3)}px`);

      rafId = requestAnimationFrame(tick);
    };

    window.addEventListener("mousemove", onMove, { passive: true });
    rafId = requestAnimationFrame(tick);

    return () => {
      window.removeEventListener("mousemove", onMove);
      cancelAnimationFrame(rafId);
    };
  }, []);

  return (
    <div
      ref={ref}
      className="grid-glow"
      aria-hidden="true"
      style={{
        ["--gx" as any]: "50vw",
        ["--gy" as any]: "50vh",
        ["--bx" as any]: "0px",
        ["--by" as any]: "0px",
        ["--glow-color" as any]: "rgba(120,180,255,0.15)",
        ["--grid-opacity" as any]: "0.4",
      }}
    />
  );
}
