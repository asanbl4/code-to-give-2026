// Shared types for the ChromosomeTrio component. Kept in their own file so
// consumers can import types without pulling in any Three.js/R3F code.

/** One-off actions that can be triggered on a single character. */
export type ChromosomeActionName = 'wave' | 'spin' | 'jump' | 'point';

/** Simple discrete expression states a character's face can be set to. */
export type ChromosomeExpression = 'happy' | 'excited' | 'wink';

/** Index of one of the three characters in the trio (left, center, right). */
export type ChromosomeIndex = 0 | 1 | 2;

/** Imperative API exposed on the ref passed to <ChromosomeTrio ref={...} />. */
export interface ChromosomeTrioHandle {
  /**
   * Plays a one-off animation on a specific character. The animation plays
   * once and the character then returns to the idle loop automatically.
   */
  playAction: (characterIndex: ChromosomeIndex, actionName: ChromosomeActionName) => void;
  /** Swaps the face of a character between a few simple expression states. */
  setExpression: (characterIndex: ChromosomeIndex, expression: ChromosomeExpression) => void;
}

export interface ChromosomeTrioProps {
  /**
   * Uniform scale applied to the whole trio group. Default: 1.
   *
   * The trio always fills its container and the camera's horizontal field of
   * view follows the container's aspect ratio, so this is how a caller trades
   * framing against clipping — a square box clips the outer two characters
   * above ~0.75. Size the container in CSS; use this to fit.
   */
  scale?: number;
}

// ---------------------------------------------------------------------------
// Internal wiring types, shared between ChromosomeTrio (orchestrator) and
// ChromosomeCharacter (per-character mesh/logic). Not part of the public
// props/ref surface, but kept here to avoid a circular import between the
// two component files.
// ---------------------------------------------------------------------------

/** Mutable, read-each-frame flags a character consults during its idle loop.
 *  A ref rather than props, so a change takes effect on the next frame instead
 *  of waiting on a React re-render. */
export interface ChromosomeRuntimeState {
  reducedMotion: boolean;
}

/** Imperative API a single ChromosomeCharacter exposes to ChromosomeTrio. */
export interface ChromosomeCharacterHandle {
  playAction: (actionName: ChromosomeActionName) => void;
  setExpression: (expression: ChromosomeExpression) => void;
}
