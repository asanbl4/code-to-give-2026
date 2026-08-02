// How a mascot overlay presents itself, shared by the two that exist:
// MascotIntroOverlay (first-visit welcome) and MascotFaqOverlay (tap to ask).
// Both dim the page the same way and both glide the trio to/from the header
// corner, so those decisions live here rather than being retyped — and kept in
// sync by hand — in each component.

// Approximates the header badge's on-screen position (top-left, ~110px in from
// each edge) rather than measuring it exactly — close enough for a smooth
// visual handoff without needing to plumb a ref across two independent
// fixed-position overlays.
const CORNER_OFFSET = 'calc(-50vw + 110px), calc(-50vh + 110px)';

/**
 * Translate + shrink toward the corner. Safe to apply to a box that has
 * already mounted and rendered at full size at least once — e.g. the intro
 * overlay's exit, or the FAQ overlay's close (both start this transition
 * from an already-settled, full-size, already-rendering canvas).
 *
 * NOT safe to apply on a box's very first render before its
 * <ChromosomeTrio>/R3F Canvas has ever measured itself: R3F sizes its
 * canvas from the container's rendered bounding box on mount, and a
 * `scale()` transform shrinks that bounding box the same way an actual
 * smaller width/height would — except the container's real CSS width/height
 * never changed, so no resize event ever fires afterward to correct it. The
 * canvas silently locks onto that tiny size forever, even once the
 * transform animates away. Use SLIDE_FROM_CORNER_TRANSFORM for that case.
 */
export const FLY_TO_CORNER_TRANSFORM = `translate(${CORNER_OFFSET}) scale(0.25)`;

/** Translate-only (no scale) — safe to apply before first mount, since a
 *  pure translate never changes the element's own content-box size. Used
 *  for the FAQ overlay's opening glide, where the canvas is mounting fresh. */
export const SLIDE_FROM_CORNER_TRANSFORM = `translate(${CORNER_OFFSET})`;

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
