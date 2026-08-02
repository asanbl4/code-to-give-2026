// How a mascot overlay presents itself, shared by the two that exist:
// MascotIntroOverlay (first-visit welcome) and MascotFaqOverlay (tap to ask).
// Both dim the page the same way and both glide the trio to/from the header
// corner, so those decisions live here rather than being retyped — and kept in
// sync by hand — in each component.

// A fallback for the rare frame where the real badge isn't measurable yet
// (see computeFlyTransform below) — approximately the header badge's on-screen
// position, top-left ~110px in from each edge. Not used in the normal case
// any more; real measurement replaced it, this is just the "something went
// wrong" backstop.
const CORNER_OFFSET_FALLBACK = 'calc(-50vw + 110px), calc(-50vh + 110px)';
export const FLY_TO_CORNER_TRANSFORM_FALLBACK = `translate(${CORNER_OFFSET_FALLBACK}) scale(0.25)`;
export const SLIDE_FROM_CORNER_TRANSFORM_FALLBACK = `translate(${CORNER_OFFSET_FALLBACK})`;

/**
 * Translate + scale `fromEl` so it exactly overlaps `toEl` (same center,
 * same size) — the real "fly to the header badge" trajectory, measured live
 * instead of approximated. Returns the fallback transforms above if either
 * element isn't in the DOM/laid out yet (e.g. mid-hydration).
 *
 * Safe to apply to a box that has already mounted and rendered at full size
 * at least once — e.g. the intro overlay's exit, or the FAQ overlay's close
 * (both start this transition from an already-settled, full-size, already-
 * rendering canvas).
 *
 * NOT safe to apply on a box's very first render before its
 * <ChromosomeTrio>/R3F Canvas has ever measured itself: R3F sizes its
 * canvas from the container's rendered bounding box on mount, and a
 * `scale()` transform shrinks that bounding box the same way an actual
 * smaller width/height would — except the container's real CSS width/height
 * never changed, so no resize event ever fires afterward to correct it. The
 * canvas silently locks onto that tiny size forever, even once the
 * transform animates away. Use computeSlideOffset for that case instead.
 */
export function computeFlyTransform(fromEl: HTMLElement | null, toEl: HTMLElement | null): string {
  if (!fromEl || !toEl) return FLY_TO_CORNER_TRANSFORM_FALLBACK;
  const from = fromEl.getBoundingClientRect();
  const to = toEl.getBoundingClientRect();
  if (from.width === 0 || to.width === 0) return FLY_TO_CORNER_TRANSFORM_FALLBACK;

  const dx = to.left + to.width / 2 - (from.left + from.width / 2);
  const dy = to.top + to.height / 2 - (from.top + from.height / 2);
  const scale = to.width / from.width;
  return `translate(${dx}px, ${dy}px) scale(${scale})`;
}

/**
 * Translate-only version of computeFlyTransform (no scale) — safe to apply
 * before first mount, since a pure translate never changes the element's
 * own content-box size (see the R3F caveat above). Used for the FAQ
 * overlay's opening glide, where the canvas is mounting fresh: the box
 * still renders at its own full size, just positioned to start roughly
 * where the badge is, since shrinking it to the badge's actual (smaller)
 * size isn't safe pre-mount.
 */
export function computeSlideOffset(fromEl: HTMLElement | null, toEl: HTMLElement | null): string {
  if (!fromEl || !toEl) return SLIDE_FROM_CORNER_TRANSFORM_FALLBACK;
  const from = fromEl.getBoundingClientRect();
  const to = toEl.getBoundingClientRect();
  if (from.width === 0 || to.width === 0) return SLIDE_FROM_CORNER_TRANSFORM_FALLBACK;

  const dx = to.left + to.width / 2 - (from.left + from.width / 2);
  const dy = to.top + to.height / 2 - (from.top + from.height / 2);
  return `translate(${dx}px, ${dy}px)`;
}

export const FLY_DURATION_MS = 700;

/**
 * The full-screen stage both overlays sit on.
 *
 * `dimmed` is false while the trio is mid-glide between the corner and the
 * centre: the backdrop fades out and stops catching clicks, so the page
 * underneath is usable again before the animation has finished. Callers add
 * their own flex direction, gap and padding.
 */
export function mascotStageClass(dimmed: boolean): string {
  return [
    'fixed inset-0 z-[100] flex items-center justify-center transition-colors duration-700',
    dimmed ? 'bg-ink/45 backdrop-blur-sm' : 'pointer-events-none bg-transparent backdrop-blur-none',
  ].join(' ');
}
