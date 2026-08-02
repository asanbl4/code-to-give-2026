"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { track } from "@/features/analytics";
import { cn } from "@/lib/cn";
import { formatHkd } from "@/lib/format";
import { RECENT_DONATIONS } from "../data";

const ROTATE_EVERY = 8000;
const FADE_OUT = 400;

export function DonationToast() {
  const [index, setIndex] = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => {
      setVisible(false);
      setTimeout(() => {
        setIndex((current) => (current + 1) % RECENT_DONATIONS.length);
        setVisible(true);
      }, FADE_OUT);
    }, ROTATE_EVERY);
    return () => clearInterval(interval);
  }, []);

  const donation = RECENT_DONATIONS[index];

  return (
    <div
      // Not aria-live: this rotates on a timer with no user action behind it,
      // and announcing it every eight seconds would talk over the page.
      className={cn(
        "fixed bottom-4 left-4 z-40 flex max-w-xs items-start gap-3 rounded-card bg-paper p-4 shadow-lift ring-1 ring-edge transition-opacity",
        visible ? "opacity-100" : "opacity-0",
      )}
    >
      <span aria-hidden="true" className="text-2xl leading-none">
        {donation.emoji}
      </span>
      <div>
        <p className="font-bold text-ink">
          {donation.name} from {donation.area} just donated {formatHkd(donation.amount)}
        </p>
        <Link
          href="/donate"
          onClick={() => track("donate_clicked")}
          className="mt-1 inline-block font-bold text-signal hover:text-signal-deep"
        >
          Donate now →
        </Link>
      </div>
    </div>
  );
}
