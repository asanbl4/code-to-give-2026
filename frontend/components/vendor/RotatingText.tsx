"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
 * word now animates inside an `overflow: hidden` slot sized by hidden copies of
 * the words. Before that the exiting characters flew up over the headline and
 * the box collapsed between words.
 *
 * ## Why this component knows about Google Translate
 *
 * The animation needs one `<span>` per character, and Google's page translator
 * treats every one of those as a standalone word to translate. Measured: `o`
 * became `這` / `Die` / `the`, `i` became `我` / `ich` / `in`, `e` became `和` /
 * `Und` / `and`. So "play" rendered as "plaand" and "thrive" as "thr我在和",
 * and the wider mangled text then overflowed the slot and got clipped.
 *
 * The animated characters and the sizer are therefore marked `translate="no"`,
 * which puts them out of the translator's reach entirely. To keep the word
 * translated anyway, the list is read back out of the screen-reader copy below,
 * which is a single ordinary text node and so translates cleanly.
 */

/**
 * Comma, ideographic comma (CJK), and fullwidth comma — the separators Google
 * returns for a comma-joined list depending on the target language. zh-TW comes
 * back as "玩耍、烹飪、茁壯、貢獻", German as "spielen, kochen, gedeihen, beitragen".
 */
const LIST_SEPARATOR = /[,、，]\s*/;

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

  // The words actually shown. Normally `texts`; once Google Translate has
  // rewritten the screen-reader copy, the translated equivalents read back out
  // of it. Null means "nothing usable yet", not "no words".
  const [translated, setTranslated] = useState<string[] | null>(null);
  const source = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const node = source.current;
    if (!node) return;

    const read = () => {
      const parts = (node.textContent ?? "")
        .split(LIST_SEPARATOR)
        .map((part) => part.trim())
        .filter(Boolean);

      // A different count means the translation merged or split entries and the
      // words can no longer be matched up positionally. Falling back to English
      // is worse than a translated word but far better than a wrong one.
      const next = parts.length === texts.length ? parts : null;

      setTranslated((previous) => {
        if (previous === null && next === null) return previous;
        if (
          previous !== null &&
          next !== null &&
          previous.length === next.length &&
          previous.every((word, position) => word === next[position])
        ) {
          // Same words: bail out rather than hand React a new array every time
          // the translator touches the subtree.
          return previous;
        }
        return next;
      });
    };

    read();
    const observer = new MutationObserver(read);
    observer.observe(node, { characterData: true, childList: true, subtree: true });
    return () => observer.disconnect();
  }, [texts]);

  const words = translated ?? texts;

  const characters = useMemo(() => splitIntoCharacters(words[index] ?? ""), [words, index]);

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
      <span ref={source} className="text-rotate-sr-only">
        {texts.join(", ")}
      </span>

      {/*
        Reserves the slot. Every word is rendered, stacked in one grid cell, so
        the slot is as wide as the widest word *as actually rendered* — a
        translated word can be far wider than the longest English one (zh-TW
        needed 303px where the English sizer reserved 180px), and picking a
        single word by character count cannot see that. `translate="no"` because
        this now holds words this component already translated.
      */}
      <span aria-hidden="true" translate="no" className="notranslate text-rotate-sizer">
        {words.map((word, position) => (
          <span key={position}>{word}</span>
        ))}
      </span>

      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={index}
          className="notranslate text-rotate-group"
          aria-hidden="true"
          translate="no"
        >
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
