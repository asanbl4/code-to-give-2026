"use client";

import { useEffect, useRef, type ReactNode, type RefObject } from "react";

interface ChatPanelProps {
  open: boolean;
  onClose: () => void;
  /** Focus returns here on close — a keyboard user must not be dumped at the top. */
  launcherRef: RefObject<HTMLButtonElement | null>;
  title: string;
  closeLabel: string;
  children: ReactNode;
}

/**
 * The panel shell. Owns focus, Escape, and the full-screen breakpoint; knows
 * nothing about chat.
 *
 * Accessibility decisions worth not undoing:
 *
 * - **Full-screen below 37.5em, floating above it.** An `em` breakpoint keys off
 *   the user's font size, so one rule covers both a 600px phone and a 1200px
 *   desktop at 200% zoom. A `px` breakpoint would leave the zoomed desktop with
 *   a cramped floating card, which is the usual failure of this pattern.
 * - **Non-modal when floating.** The page stays usable and focus is not trapped.
 *   Trapping is only correct once the panel covers everything.
 * - **No transitions.** Nothing here animates, so `prefers-reduced-motion`
 *   needs no special case (#2).
 */
export function ChatPanel({
  open,
  onClose,
  launcherRef,
  title,
  closeLabel,
  children,
}: ChatPanelProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  // Escape closes from anywhere inside the panel.
  useEffect(() => {
    if (!open) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.stopPropagation();
        onClose();
        launcherRef.current?.focus();
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onClose, launcherRef]);

  // Move focus into the panel on open so the next Tab lands inside it.
  useEffect(() => {
    if (open) panelRef.current?.focus();
  }, [open]);

  if (!open) return null;

  return (
    <div
      ref={panelRef}
      role="dialog"
      aria-label={title}
      tabIndex={-1}
      className={[
        "fixed z-50 flex flex-col overflow-hidden bg-white text-zinc-900",
        "border border-zinc-300 shadow-lg outline-none",
        // Full-screen by default; a floating card only once there is room.
        "inset-0 rounded-none",
        "min-[37.5em]:inset-auto min-[37.5em]:bottom-24 min-[37.5em]:right-6",
        "min-[37.5em]:h-[32rem] min-[37.5em]:w-[24rem] min-[37.5em]:rounded-xl",
      ].join(" ")}
    >
      <header className="flex items-center justify-between border-b border-zinc-200 px-4 py-3">
        <h2 className="text-base font-semibold">{title}</h2>
        <button
          type="button"
          onClick={() => {
            onClose();
            launcherRef.current?.focus();
          }}
          className="rounded px-3 py-2 text-sm font-medium text-zinc-700 underline underline-offset-2 hover:text-zinc-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900"
        >
          {/* Text, not an X glyph: non-negotiable #4 forbids icon-only controls. */}
          {closeLabel}
        </button>
      </header>

      <div className="flex-1 overflow-y-auto px-4 py-4">{children}</div>
    </div>
  );
}
