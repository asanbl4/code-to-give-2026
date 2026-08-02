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
  /**
   * Smoothly animates the whole trio group to a new position (and optional
   * scale) over `duration` seconds. Useful for scroll-linked or scripted
   * movement driven from outside the component.
   */
  moveTo: (position: [number, number, number], duration?: number, scale?: number) => void;
  /** Swaps the face of a character between a few simple expression states. */
  setExpression: (characterIndex: ChromosomeIndex, expression: ChromosomeExpression) => void;
  /** Freezes the built-in idle loop (bob/sway/blink/breathe) in place. */
  pauseIdle: () => void;
  /** Resumes the built-in idle loop from where it left off. */
  resumeIdle: () => void;
}

export interface ChromosomeTrioProps {
  /** Uniform scale applied to the whole trio group. Default: 1. */
  scale?: number;
  /** World-space position of the whole trio group. Default: [0, 0, 0]. */
  position?: [number, number, number];
  /** Whether the built-in idle loop autoplays on mount. Default: true. */
  autoIdle?: boolean;
  /** Optional className passed to the outer wrapper div (for sizing/layout). */
  className?: string;
}

// ---------------------------------------------------------------------------
// Internal wiring types, shared between ChromosomeTrio (orchestrator) and
// ChromosomeCharacter (per-character mesh/logic). Not part of the public
// props/ref surface, but kept here to avoid a circular import between the
// two component files.
// ---------------------------------------------------------------------------

/** Mutable, read-each-frame flags a character consults during its idle loop. */
export interface ChromosomeRuntimeState {
  idleEnabled: boolean;
  reducedMotion: boolean;
}

/** Imperative API a single ChromosomeCharacter exposes to ChromosomeTrio. */
export interface ChromosomeCharacterHandle {
  playAction: (actionName: ChromosomeActionName) => void;
  setExpression: (expression: ChromosomeExpression) => void;
}
