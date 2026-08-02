"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Tag } from "@/components/ui";
import { cn } from "@/lib/cn";
import { HERO_FACE_TAGS } from "../data";

type Props = {
  /** False while this slide is off-screen: its markers must leave the tab
      order with the rest of it, exactly like the slide's "Learn more" button. */
  active: boolean;
  openId: string | null;
  /** Lifted to `Hero`, which pauses the carousel while a story is open —
      being slid away mid-sentence is the one unforgivable thing here. */
  onOpen: (id: string | null) => void;
};

/**
 * The hardcoded face-tagging demo painted over the first hero slide.
 *
 * This is a shop window, not the feature. `features/stories/TaggedPhoto` is the
 * real one: same interaction, but reading consented members out of the API.
 * The people and stories here are invented — see the warning on
 * `HERO_FACE_TAGS`, and note the "Sample" label on every card.
 *
 * Click, not hover: hover does not exist on a phone, and a hover card cannot
 * hold a "read more" button because it vanishes as you reach for it.
 */
export function HeroFaceTags({ active, openId, onOpen }: Props) {
  const [showFullStory, setShowFullStory] = useState(false);
  const layerRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const panelId = useId();

  const open = active ? (HERO_FACE_TAGS.find((face) => face.id === openId) ?? null) : null;

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      onOpen(null);
      // Back to the face they opened, not to the top of the page.
      layerRef.current?.querySelector<HTMLButtonElement>(`[data-face="${open.id}"]`)?.focus();
    };
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (!cardRef.current?.contains(target) && !layerRef.current?.contains(target)) {
        onOpen(null);
      }
    };

    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("pointerdown", onPointerDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("pointerdown", onPointerDown);
    };
  }, [open, onOpen]);

  return (
    <>
      <div className="hero-face-layer" ref={layerRef}>
        {HERO_FACE_TAGS.map((face) => {
          const isOpen = face.id === open?.id;
          return (
            <button
              key={face.id}
              type="button"
              data-face={face.id}
              tabIndex={active ? undefined : -1}
              aria-expanded={isOpen}
              aria-controls={isOpen ? panelId : undefined}
              aria-label={`Meet ${face.name}`}
              onClick={() => {
                setShowFullStory(false);
                onOpen(isOpen ? null : face.id);
              }}
              className={cn("hero-face-marker", isOpen && "hero-face-marker--open")}
              style={{
                // Placed from the centre of the face and pulled back by half
                // its size, so that when the 44px minimum kicks in the marker
                // grows evenly around the face instead of sliding off it.
                left: `${(face.box_x + face.box_w / 2) * 100}%`,
                top: `${(face.box_y + face.box_h / 2) * 100}%`,
                width: `${face.box_w * 100}%`,
                height: `${face.box_h * 100}%`,
              }}
            />
          );
        })}
      </div>

      {active && !open && (
        <p className="hero-face-hint" aria-hidden="true">
          Tap a highlighted face
        </p>
      )}

      {open && (
        <div
          ref={cardRef}
          id={panelId}
          role="dialog"
          aria-label={open.name}
          className="hero-face-card"
          style={
            {
              // Read by the clamp/offset maths in landing.css. Fractions of the
              // photograph: the face's horizontal centre, and its bottom edge.
              "--face-cx": open.box_x + open.box_w / 2,
              "--face-cy": open.box_y + open.box_h,
            } as React.CSSProperties
          }
        >
          <div className="rounded-card bg-paper p-5 text-left shadow-lift ring-1 ring-edge">
            <div className="flex items-start gap-3">
              <div className="min-w-0 flex-1">
                <h3 className="font-display text-2xl font-bold leading-tight text-ink">
                  {open.name}
                </h3>
                <p className="mt-1 text-ink">{open.headline}</p>
              </div>
              <button
                type="button"
                onClick={() => onOpen(null)}
                aria-label="Close"
                className="-mr-1 -mt-1 rounded-lg px-2 py-1 text-2xl leading-none text-ink-soft hover:bg-surface hover:text-ink"
              >
                ×
              </button>
            </div>

            {showFullStory && (
              <div className="mt-4 max-h-48 overflow-y-auto whitespace-pre-line border-t border-edge pt-4 text-ink-soft">
                {open.story}
              </div>
            )}

            <button
              type="button"
              onClick={() => setShowFullStory((shown) => !shown)}
              className="mt-4 w-full rounded-xl bg-signal px-4 py-3 font-bold text-white transition-colors hover:bg-signal-deep"
            >
              {showFullStory ? "Show less" : `Read ${open.name.split(" ")[0]}'s full story`}
            </button>

            {/* Do not remove. These are invented stories over a photograph of
                real people; the label is what keeps that honest. */}
            <p className="mt-3 flex items-center gap-2 text-sm text-ink-soft">
              An example, not a real member.
            </p>
          </div>
        </div>
      )}
    </>
  );
}
