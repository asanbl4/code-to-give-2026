interface AssistantFaceProps {
  /** Tailwind sizing, e.g. "h-6 w-6". Colour comes from `currentColor`. */
  className?: string;
}

/**
 * The assistant's face, in Love 21's hand-drawn marker style.
 *
 * Traced from `assistant-avatar-variants.svg` (the design contact sheet kept
 * beside this file), first variant: robot head with a heart antenna.
 *
 * Inlined as a component rather than referenced as an `<img>` on purpose — the
 * outline strokes use `currentColor`, so one file serves dark-on-light in the
 * avatar and light-on-dark on the launcher button. An `<img>` would need two
 * assets and would still not follow a contrast or Easy Read setting.
 *
 * The crimson (#E4245B) is fixed: it is the heart and the blush, the two marks
 * that carry the brand, and they read on both backgrounds.
 *
 * `aria-hidden` because it is decorative everywhere it is used — each site is
 * already labelled in text ("Ask for help", and the panel heading).
 */
export function AssistantFace({ className = "h-6 w-6" }: AssistantFaceProps) {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      viewBox="-58 -76 116 116"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth={5}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {/* antenna stem */}
      <path d="M0,-39 Q2,-46 1,-53" />
      {/* heart on the antenna */}
      <path
        d="M1,-52 C-9,-62 -9,-72 -2,-72 C1,-72 1,-69 1,-68 C1,-69 2,-72 5,-72 C12,-72 12,-62 1,-52 Z"
        stroke="#E4245B"
      />
      {/* ears */}
      <path d="M-44,-6 L-53,-5 L-54,10 L-44,9" />
      <path d="M45,-7 L54,-6 L54,9 L45,8" />
      {/* head */}
      <path d="M-44,-24 Q-45,-38 -30,-39 L30,-41 Q45,-40 45,-26 L46,20 Q46,35 31,35 L-30,36 Q-45,35 -44,21 Z" />
      {/* eyes */}
      <path d="M-22,-8 C-14,-9 -13,2 -20,2 C-27,2 -28,-7 -22,-8 Z" fill="currentColor" />
      <path d="M18,-10 C26,-11 27,0 20,0 C13,0 12,-9 18,-10 Z" fill="currentColor" />
      {/* smile */}
      <path d="M-16,13 Q0,26 18,12" />
      {/* blush */}
      <path d="M-33,9 Q-27,7 -26,12" stroke="#E4245B" strokeWidth={4} />
      <path d="M28,8 Q34,6 35,11" stroke="#E4245B" strokeWidth={4} />
    </svg>
  );
}
