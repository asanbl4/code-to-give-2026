// Script + destinations for the Love 21 mascot. Kept separate from the
// components so copy/timing/links can be tweaked without touching the
// animation-orchestration logic.
import type { ChromosomeActionName, ChromosomeExpression, ChromosomeIndex } from '@/components/chromosome-trio';

export interface IntroBeatAction {
  character: ChromosomeIndex;
  action?: ChromosomeActionName;
  expression?: ChromosomeExpression;
}

export interface IntroBeat {
  /** Seconds from the start of the intro when this beat becomes active. */
  at: number;
  /** Caption shown under the trio for this beat. */
  text: string;
  /** Zero or more characters performing an action/expression for this beat. */
  actions?: IntroBeatAction[];
  /** Only one beat sets this — renders a real CTA button under the caption. */
  cta?: { label: string; href: string };
}

/**
 * Total runtime is the last beat's `at` plus its dwell time (see
 * MascotContext's OUTRO_DWELL_SECONDS), landing in the ~10-11s range.
 */
export const INTRO_BEATS: readonly IntroBeat[] = [
  {
    at: 0,
    text: "Hi! Welcome to Love 21 Foundation — I'm Trio 21, your personal companion 💛",
    actions: [
      { character: 0, action: 'wave', expression: 'happy' },
      { character: 1, action: 'wave', expression: 'happy' },
      { character: 2, action: 'wave', expression: 'happy' },
    ],
  },
  {
    at: 3,
    text: 'At Love 21, we celebrate what neurodivergent individuals CAN do.',
    actions: [
      { character: 0, action: 'spin' },
      { character: 2, action: 'point', expression: 'excited' },
    ],
  },
  {
    at: 6,
    text: 'Send them a gift to power their abilities.',
    actions: [{ character: 1, action: 'jump' }],
    cta: { label: 'Donate now', href: '/donate' },
  },
  {
    at: 8.5,
    text: "I'll be in a corner if you need me :))",
    actions: [
      { character: 0, action: 'wave' },
      { character: 1, action: 'wave' },
      { character: 2, action: 'wave' },
    ],
  },
];

// `kind: 'link'` navigates and closes the assistant; `kind: 'answer'`
// expands inline, right there in the list — for questions that don't map to
// a page, like "why is a chromosome your mascot". A literal `kind` field
// rather than just checking whether `href`/`answer` is present, because
// TypeScript's control-flow narrowing after an early `return` inside an
// `if` doesn't reliably hold up for a union discriminated only by an
// optional property.
export type MascotFaq =
  | { kind: 'link'; question: string; href: string }
  | { kind: 'answer'; question: string; answer: string };

// Only routes that actually exist today — see components/layout/navigation.ts
// in the main repo for the full list of routes still pending (/who-we-are,
// /what-we-do, /news-stories all 404 as of this writing). The donation quiz
// mentioned in the "not sure which cause" line doesn't exist yet either —
// this links straight to /donate until that's built.
export const MASCOT_FAQS: readonly MascotFaq[] = [
  {
    kind: 'answer',
    question: 'What is Trio 21?',
    answer:
      "I'm Trio 21 — three chromosomes, because Down syndrome (trisomy 21) happens when someone has an extra, third copy of chromosome 21. That's also where \"Love 21\" gets its name!",
  },
  { kind: 'link', question: "I'm from a corporate — how can I contribute?", href: '/get-involved' },
  { kind: 'link', question: "I want to donate but I'm not sure which cause", href: '/donate' },
  { kind: 'link', question: 'I have some free time to volunteer', href: '/get-involved' },
  { kind: 'link', question: 'Sign me up for the newsletter', href: '/#newsletter' },
  { kind: 'link', question: 'Show me inspiring community stories', href: '/stories' },
  { kind: 'link', question: 'What events are coming up?', href: '/events' },
];

/** sessionStorage key: once set, the full-screen welcome sequence is skipped
 *  for the rest of the browser session and the mascot starts straight in the
 *  corner. */
export const MASCOT_SESSION_KEY = 'love21-mascot-intro-seen';

/**
 * Ambient "still alive" chatter for the header badge (see
 * MascotHeaderBadge.tsx): every IDLE_CHATTER_INTERVAL_MS, it shows the next
 * phrase here and plays the paired action, so the mascot keeps a little
 * personality even when nobody's tapped it.
 */
export interface IdleChatterLine {
  text: string;
  action: ChromosomeActionName;
}

export const IDLE_CHATTER: readonly IdleChatterLine[] = [
  { text: 'Hey! 👋', action: 'wave' },
  { text: 'Need any help?', action: 'jump' },
  { text: 'Tap me!', action: 'spin' },
  // Down syndrome (trisomy 21) is caused by an extra copy of chromosome 21 —
  // three copies instead of the usual two, giving 47 chromosomes instead of
  // 46. That's also where "Love 21" gets its name.
  { text: 'Did you know? Down syndrome = an extra 3rd copy of chromosome 21!', action: 'point' },
  { text: 'Tap me to find your way around!', action: 'wave' },
];

export const IDLE_CHATTER_INTERVAL_MS = 5000;
