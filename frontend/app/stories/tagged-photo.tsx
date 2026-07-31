"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import type { Participant, Photo } from "@/lib/api";

type Props = {
  photo: Photo;
  participantsById: Map<string, Participant>;
};

/**
 * A group photo whose faces can be tapped to meet the person.
 *
 * Click, not hover. Hover does not exist on a phone, which is where most of
 * this community and their families will see the page, and a hover card cannot
 * hold a button — it disappears the moment you move towards it.
 *
 * Every marker is a real <button>, so tab and enter work and a screen reader
 * announces a name rather than "clickable group".
 */
export function TaggedPhoto({ photo, participantsById }: Props) {
  const [openFaceId, setOpenFaceId] = useState<string | null>(null);
  const [showFullStory, setShowFullStory] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const panelId = useId();

  const close = useCallback(() => {
    setOpenFaceId(null);
    setShowFullStory(false);
  }, []);

  useEffect(() => {
    if (!openFaceId) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        close();
        // Send focus back to the face they opened, not to the top of the page.
        containerRef.current
          ?.querySelector<HTMLButtonElement>(`[data-face="${openFaceId}"]`)
          ?.focus();
      }
    };
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (!cardRef.current?.contains(target) && !containerRef.current?.contains(target)) {
        close();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("pointerdown", onPointerDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("pointerdown", onPointerDown);
    };
  }, [openFaceId, close]);

  const openFace = photo.faces.find((face) => face.id === openFaceId) ?? null;
  const openPerson = openFace ? participantsById.get(openFace.participant_id) : undefined;

  // Anchor the card to the middle of the face, and put it on whichever side has
  // room. Clamped so a face near the edge cannot push the card off-screen.
  const anchorX = openFace ? clamp(openFace.box_x + openFace.box_w / 2, 0.18, 0.82) : 0.5;
  const faceMidY = openFace ? openFace.box_y + openFace.box_h / 2 : 0.5;
  const below = faceMidY < 0.55;
  const anchorY = openFace ? (below ? openFace.box_y + openFace.box_h : openFace.box_y) : 0.5;

  return (
    <figure>
      {/* Positioning anchor. Wraps only the image, so the card's percentage
          offsets map to the photo's box rather than the photo plus caption --
          and so the card is not clipped by the image's own overflow-hidden. */}
      <div className="relative">
      <div
        ref={containerRef}
        className="relative overflow-hidden rounded-2xl bg-surface ring-1 ring-edge"
        style={{ aspectRatio: `${photo.width} / ${photo.height}` }}
      >
        {photo.image_url ? (
          /* eslint-disable-next-line @next/next/no-img-element --
             The URL is a short-lived signed one with a token in the query, which
             the Next image optimizer would cache past its expiry. Width and
             height come from the database, so there is no layout shift to fix. */
          <img
            src={photo.image_url}
            alt={photo.alt_text}
            width={photo.width}
            height={photo.height}
            className="h-full w-full object-cover"
          />
        ) : (
          <p className="flex h-full items-center justify-center p-6 text-center text-ink-soft">
            This photo could not be loaded.
          </p>
        )}

        {photo.faces.map((face) => {
          const person = participantsById.get(face.participant_id);
          if (!person) return null;
          const isOpen = face.id === openFaceId;

          return (
            <button
              key={face.id}
              type="button"
              data-face={face.id}
              aria-expanded={isOpen}
              aria-controls={isOpen ? panelId : undefined}
              aria-label={`Meet ${person.name}`}
              onClick={() => {
                setShowFullStory(false);
                setOpenFaceId(isOpen ? null : face.id);
              }}
              className={`absolute rounded-xl border-[3px] transition-colors duration-150 ${
                isOpen
                  ? "border-highlight bg-highlight/20"
                  : "border-white/85 bg-white/5 hover:border-highlight hover:bg-highlight/15"
              }`}
              style={{
                // Positioned from the centre of the face and pulled back by
                // half its size, so that when the 44px minimum below kicks in
                // the marker grows evenly around the face instead of sliding
                // down and to the right of it.
                left: `${(face.box_x + face.box_w / 2) * 100}%`,
                top: `${(face.box_y + face.box_h / 2) * 100}%`,
                transform: "translate(-50%, -50%)",
                width: `${face.box_w * 100}%`,
                height: `${face.box_h * 100}%`,
                // A detected face can be small on screen; a tap target should
                // not be. 44px is the WCAG target-size minimum.
                minWidth: "44px",
                minHeight: "44px",
              }}
            >
              <span className="sr-only">{person.name}</span>
            </button>
          );
        })}
      </div>

        {openFace && openPerson && (
          <div
            ref={cardRef}
            id={panelId}
            role="dialog"
            aria-label={openPerson.name}
            className={`tag-card ${below ? "tag-card--below" : "tag-card--above"}`}
            style={
              {
                "--anchor-x": `${anchorX * 100}%`,
                "--anchor-y": `${anchorY * 100}%`,
              } as React.CSSProperties
            }
          >
            <PersonCard
              person={openPerson}
              showFullStory={showFullStory}
              onToggleStory={() => setShowFullStory((open) => !open)}
              onClose={close}
            />
          </div>
        )}
      </div>

      {photo.caption && (
        <figcaption className="mt-3 text-ink-soft">{photo.caption}</figcaption>
      )}
      {photo.faces.length > 0 && (
        <p className="mt-1 text-sm text-ink-soft">
          {photo.faces.length === 1
            ? "Tap the highlighted face to meet them."
            : `Tap any of the ${photo.faces.length} highlighted faces.`}
        </p>
      )}
    </figure>
  );
}

function PersonCard({
  person,
  showFullStory,
  onToggleStory,
  onClose,
}: {
  person: Participant;
  showFullStory: boolean;
  onToggleStory: () => void;
  onClose: () => void;
}) {
  return (
    <div className="rounded-2xl bg-paper p-5 shadow-[0_18px_45px_-12px_rgba(16,32,58,0.45)] ring-1 ring-edge">
      <div className="flex items-start gap-3">
        {person.avatar_url && (
          /* eslint-disable-next-line @next/next/no-img-element -- signed URL, see above */
          <img
            src={person.avatar_url}
            alt=""
            className="h-14 w-14 shrink-0 rounded-full object-cover ring-2 ring-highlight"
          />
        )}
        <div className="min-w-0 flex-1">
          <h3 className="font-display text-2xl font-bold leading-tight">{person.name}</h3>
          {person.headline && <p className="mt-1 text-ink">{person.headline}</p>}
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="-mr-1 -mt-1 rounded-lg px-2 py-1 text-2xl leading-none text-ink-soft hover:bg-surface hover:text-ink"
        >
          ×
        </button>
      </div>

      {person.progress_summary && (
        <p className="mt-4 border-l-4 border-signal bg-surface py-2 pl-3 pr-2 font-bold">
          {person.progress_summary}
        </p>
      )}

      {showFullStory && person.story && (
        <div className="mt-4 max-h-64 overflow-y-auto whitespace-pre-line border-t border-edge pt-4">
          {person.story}
        </div>
      )}

      {person.story && (
        <button
          type="button"
          onClick={onToggleStory}
          className="mt-4 w-full rounded-xl bg-signal px-4 py-3 font-bold text-white transition-colors hover:bg-signal-deep"
        >
          {showFullStory ? "Show less" : `Read ${person.first_name}'s full story`}
        </button>
      )}
    </div>
  );
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}
