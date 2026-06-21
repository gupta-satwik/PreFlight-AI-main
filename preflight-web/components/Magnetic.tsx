"use client";
import { useRef, useEffect, useCallback } from "react";

/**
 * Magnetic — wraps any child button/link with a subtle magnetic pull.
 * Uses requestAnimationFrame + lerp for buttery 60fps motion.
 * No useState. Displacement capped at 18px.
 */

const THRESHOLD = 50; // px radius outside element that triggers pull
const MAX_SHIFT = 18; // max pixel displacement
const LERP_FACTOR = 0.12; // smoothing (lower = silkier)

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

export function Magnetic({ children, className }: { children: React.ReactNode; className?: string }) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number>(0);
  const targetX = useRef(0);
  const targetY = useRef(0);
  const currentX = useRef(0);
  const currentY = useRef(0);
  const isActive = useRef(false);

  const animate = useCallback(() => {
    if (!innerRef.current) return;
    currentX.current = lerp(currentX.current, targetX.current, LERP_FACTOR);
    currentY.current = lerp(currentY.current, targetY.current, LERP_FACTOR);
    innerRef.current.style.transform = `translate(${currentX.current}px, ${currentY.current}px)`;

    // Keep animating while active or while still not at rest
    if (isActive.current || Math.abs(currentX.current) > 0.05 || Math.abs(currentY.current) > 0.05) {
      rafRef.current = requestAnimationFrame(animate);
    } else {
      // Snap to zero once fully settled
      currentX.current = 0;
      currentY.current = 0;
      if (innerRef.current) innerRef.current.style.transform = "translate(0,0)";
    }
  }, []);

  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;

    const onMove = (e: MouseEvent) => {
      const rect = wrap.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const dx = e.clientX - cx;
      const dy = e.clientY - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const radius = Math.max(rect.width, rect.height) / 2 + THRESHOLD;

      if (dist < radius) {
        isActive.current = true;
        // Normalize and scale
        const factor = (1 - dist / radius) * MAX_SHIFT;
        targetX.current = (dx / dist) * factor;
        targetY.current = (dy / dist) * factor;
        cancelAnimationFrame(rafRef.current);
        rafRef.current = requestAnimationFrame(animate);
      }
    };

    const onLeave = () => {
      isActive.current = false;
      targetX.current = 0;
      targetY.current = 0;
      cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(animate);
    };

    window.addEventListener("mousemove", onMove, { passive: true });
    wrap.addEventListener("mouseleave", onLeave);
    return () => {
      window.removeEventListener("mousemove", onMove);
      wrap.removeEventListener("mouseleave", onLeave);
      cancelAnimationFrame(rafRef.current);
    };
  }, [animate]);

  return (
    <div ref={wrapRef} className={`magnetic-wrap ${className ?? ""}`}>
      <div ref={innerRef} className="magnetic-inner">
        {children}
      </div>
    </div>
  );
}
