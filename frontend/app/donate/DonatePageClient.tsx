"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import { PageShell } from "@/components/layout";
import { Button } from "@/components/ui";
import { DonationExperience } from "@/features/donation/components/DonationExperience";
import type { VerifiedDonationPhoto } from "@/features/donation/components/DonationHeroVisual";

interface DonatePageClientProps {
  photo: VerifiedDonationPhoto;
}

/**
 * The donation journey.
 *
 * The header comes from `PageShell`, not from a `<SiteHeader />` dropped in
 * here: the header renders `MascotHeaderBadge`, whose `useMascot()` throws
 * outside the `MascotProvider` that `PageShell` sets up. `PageShell` also
 * brings the footer, so the page ends the way every other page ends.
 *
 * `width="full"` because the photograph runs edge to edge; the sections inside
 * manage their own width.
 */
export function DonatePageClient({ photo }: DonatePageClientProps) {
  const [hasStarted, setHasStarted] = useState(false);
  const flowRef = useRef<HTMLDivElement>(null);

  function startDonationFlow() {
    setHasStarted(true);
    window.requestAnimationFrame(() => {
      flowRef.current?.focus();
    });
  }

  return (
    <PageShell width="full">
      <div className="relative isolate overflow-hidden bg-ink">
        <Image
          src={photo.src}
          alt=""
          fill
          priority
          aria-hidden="true"
          sizes="100vw"
          className={`object-cover transition duration-700 motion-reduce:transition-none ${
            hasStarted ? "scale-110 blur-sm" : "scale-100 blur-0"
          }`}
        />
        {/* Readability scrim. White type sits on a photograph here, so this is
            load-bearing rather than decorative. */}
        <div
          aria-hidden="true"
          className={`absolute inset-0 transition duration-700 motion-reduce:transition-none ${
            hasStarted
              ? "bg-ink/60 backdrop-blur-[2px]"
              : "bg-gradient-to-b from-ink/50 via-ink/30 to-ink/70"
          }`}
        />

        <div className="relative z-10 flex min-h-[34rem] items-center px-5 py-14 sm:min-h-[38rem] sm:px-8">
          {!hasStarted ? (
            <section
              aria-labelledby="donation-landing-heading"
              className="mx-auto flex w-full max-w-4xl flex-col items-center text-center"
            >
              <p className="rounded-full border border-white/35 bg-white/15 px-4 py-2 font-display text-xs font-bold uppercase tracking-[0.18em] text-white backdrop-blur">
                Donation journey
              </p>
              <h1
                id="donation-landing-heading"
                className="mt-6 max-w-3xl font-display text-4xl font-bold leading-[1.1] text-white drop-shadow-lg sm:text-6xl"
              >
                Help Love 21 members thrive through sport and community.
              </h1>
              <Button variant="donate" size="lg" onClick={startDonationFlow} className="mt-10">
                Make a gift
              </Button>
            </section>
          ) : (
            <section aria-labelledby="donation-flow-heading" className="mx-auto w-full max-w-5xl">
              <div
                ref={flowRef}
                tabIndex={-1}
                className="rounded-panel bg-paper/95 p-4 text-ink shadow-lift ring-1 ring-white/40 backdrop-blur-xl sm:p-6 lg:p-8"
              >
                <div className="mb-6 flex flex-col gap-3 border-b border-edge pb-5 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <p className="font-display text-sm font-bold uppercase tracking-[0.18em] text-signal-deep">
                      Donation flow
                    </p>
                    <h1
                      id="donation-flow-heading"
                      className="mt-2 font-display text-3xl font-bold leading-tight text-ink sm:text-4xl"
                    >
                      Make a gift
                    </h1>
                  </div>
                  <p className="max-w-xl text-ink-soft">
                    This prototype shows selection, review, and confirmation without collecting
                    payment or personal information.
                  </p>
                </div>
                <DonationExperience />
              </div>
            </section>
          )}
        </div>
      </div>
    </PageShell>
  );
}
