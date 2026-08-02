// Shared CSS transform + timing for the "glide to/from the header corner"
// effect used by both the intro's sign-off (MascotIntroOverlay) and the FAQ
// assistant's open/close (MascotFaqOverlay). Approximates the header badge's
// on-screen position (top-left, ~110px in from each edge) rather than
// measuring it exactly — close enough for a smooth visual handoff without
// needing to plumb a ref across two independent fixed-position overlays.
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
