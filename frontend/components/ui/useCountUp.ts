import { useEffect, useRef, useState } from "react";

const DURATION_MS = 1000;

/** Matches "500+", "HK$7,500", "1,000+", "90" — leading non-digits (prefix),
 *  the digits/commas (the part that gets animated), trailing non-digits
 *  (suffix, usually "+"). */
const NUMERIC_PATTERN = /^(\D*)([\d,]+)(\D*)$/;

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

interface ParsedValue {
  prefix: string;
  target: number;
  suffix: string;
}

function parseValue(raw: string): ParsedValue | null {
  const match = raw.match(NUMERIC_PATTERN);
  if (!match) return null;
  const [, prefix, digits, suffix] = match;
  const target = Number(digits.replace(/,/g, ""));
  if (!Number.isFinite(target)) return null;
  return { prefix, target, suffix };
}

/**
 * Animates a numeric-looking string ("500+", "HK$7,500") from 0 up to its
 * target value over ~1s, starting the moment the returned `ref` scrolls into
 * view. Runs once per mount. Values that aren't a plain "prefix + number +
 * suffix" string (JSX, or text with no digits) are returned unchanged and
 * un-animated — this is a progressive enhancement, not a requirement.
 *
 * Respects prefers-reduced-motion by jumping straight to the target instead
 * of counting up.
 */
export function useCountUp(value: string) {
  const parsed = parseValue(value);
  const elementRef = useRef<HTMLElement | null>(null);
  const [display, setDisplay] = useState(parsed ? `${parsed.prefix}0${parsed.suffix}` : value);

  useEffect(() => {
    if (!parsed) {
      setDisplay(value);
      return;
    }

    const node = elementRef.current;
    if (!node) return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reducedMotion) {
      setDisplay(value);
      return;
    }

    let frame: number;
    const animate = () => {
      const start = performance.now();
      const step = (now: number) => {
        const progress = Math.min(1, (now - start) / DURATION_MS);
        const current = Math.round(easeOutCubic(progress) * parsed.target);
        setDisplay(`${parsed.prefix}${current.toLocaleString()}${parsed.suffix}`);
        if (progress < 1) frame = requestAnimationFrame(step);
      };
      frame = requestAnimationFrame(step);
    };

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          animate();
          observer.disconnect();
        }
      },
      { threshold: 0.4 },
    );
    observer.observe(node);

    return () => {
      observer.disconnect();
      if (frame) cancelAnimationFrame(frame);
    };
    // `value` is intentionally the only dependency: re-running on every
    // render would restart the animation whenever the parent re-renders.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return { ref: elementRef, display };
}
