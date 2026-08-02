// Small, dependency-free easing/interpolation helpers shared by the
// character idle/action logic and the trio's moveTo() tween.

export const clamp01 = (v: number): number => Math.min(1, Math.max(0, v));

export const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;

/** Classic Hermite smoothstep, clamped to [0, 1]. */
export const smoothstep = (x: number): number => {
  const t = clamp01(x);
  return t * t * (3 - 2 * t);
};

export const easeOutCubic = (t: number): number => 1 - Math.pow(1 - t, 3);

export const easeInOutCubic = (t: number): number =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
