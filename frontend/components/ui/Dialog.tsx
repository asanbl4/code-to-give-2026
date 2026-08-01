"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";
import { cn } from "@/lib/cn";
import { Button } from "./Button";

interface DialogProps {
  open: boolean;
  onClose: () => void;
  /** Names the dialog for screen readers and heads it visually. */
  title: string;
  description?: string;
  /** While true, Escape and the close button do nothing — a submit is in flight. */
  busy?: boolean;
  className?: string;
  children: ReactNode;
}

/**
 * A modal built on the native `<dialog>` element.
 *
 * `showModal()` already gives us the focus trap, Escape, `inert` on the rest of
 * the document, focus restored to whatever opened it, and rendering in the top
 * layer — which is why the tag popup's `z-30` cannot fight with this. Writing
 * those by hand is where hand-rolled modals go wrong, and this codebase has no
 * dependency to reach for instead.
 *
 * Two deliberate departures from the platform default:
 *
 * - Clicking the backdrop does not close. These dialogs hold prose someone has
 *   typed, and losing a member's story to a stray tap is not a fair trade for
 *   the convenience.
 * - `children` only render while open, so the form inside starts empty every
 *   time rather than carrying the last person's details into the next one.
 */
export function Dialog({
  open,
  onClose,
  title,
  description,
  busy,
  className,
  children,
}: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const id = useId();

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    // Guarded both ways: showModal() on an open dialog throws, and close() on a
    // shut one fires a spurious `close` event.
    if (open && !element.open) element.showModal();
    if (!open && element.open) element.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-labelledby={`${id}-title`}
      aria-describedby={description ? `${id}-description` : undefined}
      onCancel={(event) => {
        // Always prevent: React state decides whether this dialog is open, and
        // letting the browser close it behind React's back desynchronises them.
        event.preventDefault();
        if (!busy) onClose();
      }}
      className={cn(
        // p-0 resets the user-agent padding so the header can be padded here.
        "m-auto w-[min(38rem,calc(100vw-2rem))] max-h-[85vh] overflow-y-auto p-0",
        "rounded-panel bg-paper text-ink shadow-card ring-1 ring-edge",
        className,
      )}
    >
      {open && (
        <div className="p-6 sm:p-8">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 id={`${id}-title`} className="font-display text-2xl font-bold text-ink">
                {title}
              </h2>
              {description && (
                <p id={`${id}-description`} className="mt-1 text-sm text-ink-soft">
                  {description}
                </p>
              )}
            </div>
            <Button variant="quiet" size="sm" aria-label="Close" disabled={busy} onClick={onClose}>
              Close
            </Button>
          </div>

          <div className="mt-6">{children}</div>
        </div>
      )}
    </dialog>
  );
}
