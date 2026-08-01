"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion, type Target, type Transition } from "motion/react";
import { cn } from "@/lib/cn";
import "./RotatingText.css";

/**
 * Vendored from reactbits.dev, converted to TypeScript.
 *
 * The imperative handle (next/previous/jumpTo/reset) and the `splitBy` modes
 * beyond "characters" were dropped: nothing in this app used them, and they
 * were the bulk of the file. Add them back if a caller ever needs them.
 *
 * Two fixes to the original's motion, both explained in RotatingText.css: the
 * word now animates inside an `overflow: hidden` slot sized by a hidden copy of
 * the longest word. Before that the exiting characters flew up over the
 * headline and the box collapsed between words.
 */

type StaggerFrom = "first" | "last" | "center" | "random";

interface RotatingTextProps {
  texts: readonly string[];
  /** Milliseconds each word is held before the next one animates in. */
  rotationInterval?: number;
  staggerDuration?: number;
  staggerFrom?: StaggerFrom;
  transition?: Transition;
  initial?: Target;
  animate?: Target;
  exit?: Target;
  className?: string;
  elementClassName?: string;
}

/** Grapheme-aware split, so an emoji or combining mark is not torn in half. */
function splitIntoCharacters(text: string): string[] {
  if (typeof Intl !== "undefined" && "Segmenter" in Intl) {
    const segmenter = new Intl.Segmenter("en", { granularity: "grapheme" });
    return Array.from(segmenter.segment(text), (segment) => segment.segment);
  }
  return Array.from(text);
}

export function RotatingText({
  texts,
  rotationInterval = 2000,
  staggerDuration = 0,
  staggerFrom = "first",
  transition = { type: "spring", damping: 25, stiffness: 300 },
  initial = { y: "100%", opacity: 0 },
  animate = { y: 0, opacity: 1 },
  exit = { y: "-120%", opacity: 0 },
  className,
  elementClassName,
}: RotatingTextProps) {
  const [index, setIndex] = useState(0);

  const characters = useMemo(() => splitIntoCharacters(texts[index] ?? ""), [texts, index]);

  // Reserves the slot's width. Without it the box collapses to nothing in the
  // frame between the old word unmounting and the new one mounting, and the
  // whole headline shifts. Longest by character count is close enough — the
  // sizer only has to be no narrower than the widest word.
  const longest = useMemo(
    () => texts.reduce((widest, text) => (text.length > widest.length ? text : widest), ""),
    [texts],
  );

  const getStaggerDelay = useCallback(
    (position: number, total: number) => {
      if (staggerFrom === "last") return (total - 1 - position) * staggerDuration;
      if (staggerFrom === "center") {
        return Math.abs(Math.floor(total / 2) - position) * staggerDuration;
      }
      if (staggerFrom === "random") {
        return Math.abs(Math.floor(Math.random() * total) - position) * staggerDuration;
      }
      return position * staggerDuration;
    },
    [staggerFrom, staggerDuration],
  );

  useEffect(() => {
    if (texts.length < 2) return;
    // Functional update: the interval must not close over `index`, or it pins
    // itself to whichever word was showing when the effect last ran.
    const id = setInterval(() => setIndex((current) => (current + 1) % texts.length), rotationInterval);
    return () => clearInterval(id);
  }, [texts.length, rotationInterval]);

  return (
    <span className={cn("text-rotate", className)}>
      {/*
        The only copy a screen reader sees; the animated characters below are
        aria-hidden, or each rotation would be read out letter by letter.

        It lists every word rather than tracking the current one. Two reasons:
        a word that silently rewrites itself every couple of seconds under a
        screen-reader user is hostile, and AnimatePresence in "wait" mode keeps
        the outgoing word mounted while it exits, so a live label ran up to
        600ms ahead of what was actually on screen. "Ability to play, cook,
        thrive, contribute" is the sentence this heading means anyway.
      */}
      <span className="text-rotate-sr-only">{texts.join(", ")}</span>
      <span aria-hidden="true" className="text-rotate-sizer">
        {longest}
      </span>
      <AnimatePresence mode="wait" initial={false}>
        <motion.span key={index} className="text-rotate-group" aria-hidden="true">
          {characters.map((character, position) => (
            <motion.span
              key={position}
              initial={initial}
              animate={animate}
              exit={exit}
              transition={{
                ...transition,
                delay: getStaggerDelay(position, characters.length),
              }}
              className={cn("text-rotate-element", elementClassName)}
            >
              {character}
            </motion.span>
          ))}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}
