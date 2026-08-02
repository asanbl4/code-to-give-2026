"use client";

// A small donut chart that fills from 0 to `percent` the moment it scrolls
// into view, with the center label counting up in lockstep. Built on the
// existing useCountUp hook (components/ui/useCountUp.ts) rather than a new
// animation loop: that hook already handles the scroll-triggered
// IntersectionObserver, the easing, and prefers-reduced-motion (jumps
// straight to the final value instead of animating) — reusing it here means
// the arc and the number can never drift out of sync, since both are
// derived from the same animated string on every render.
import type { Ref } from "react";
import { useCountUp } from "@/components/ui/useCountUp";

const RADIUS = 54;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

interface ImpactDonutProps {
  percent: number;
  label: string;
}

export function ImpactDonut({ percent, label }: ImpactDonutProps) {
  const { ref, display } = useCountUp(`${percent}%`);
  const current = Number.parseInt(display, 10) || 0;
  const offset = CIRCUMFERENCE * (1 - current / 100);

  return (
    <div ref={ref as Ref<HTMLDivElement>} className="flex shrink-0 flex-col items-center gap-2">
      <div className="relative h-40 w-40 sm:h-48 sm:w-48">
        <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90" role="presentation">
          <circle cx="60" cy="60" r={RADIUS} fill="none" stroke="var(--color-surface-deep)" strokeWidth="12" />
          <circle
            cx="60"
            cy="60"
            r={RADIUS}
            fill="none"
            stroke="var(--color-signal)"
            strokeWidth="12"
            strokeLinecap="round"
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={offset}
            style={{ transition: "stroke-dashoffset 100ms linear" }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span
            aria-hidden="true"
            className="font-display text-3xl font-bold text-ink sm:text-4xl"
          >
            {display}
          </span>
        </div>
      </div>
      <p className="max-w-[12rem] text-center text-sm font-bold text-ink-soft">{label}</p>
    </div>
  );
}
