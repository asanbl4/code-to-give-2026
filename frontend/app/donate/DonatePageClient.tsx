"use client";

import Image from "next/image";
import Link from "next/link";
import { useRef, useState } from "react";
import { DonationExperience } from "@/features/donation/components/DonationExperience";
import type { VerifiedDonationPhoto } from "@/features/donation/components/DonationHeroVisual";

interface DonatePageClientProps {
  photo: VerifiedDonationPhoto;
}

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
    <main className="relative min-h-screen overflow-hidden bg-zinc-950 font-sans text-white">
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
      <div
        aria-hidden="true"
        className={`absolute inset-0 transition duration-700 motion-reduce:transition-none ${
          hasStarted
            ? "bg-zinc-950/55 backdrop-blur-[2px]"
            : "bg-gradient-to-b from-zinc-950/45 via-zinc-950/25 to-zinc-950/70"
        }`}
      />

      <header className="relative z-20 px-5 py-4 sm:px-8">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4">
          <Link
            href="/"
            className="text-base font-semibold text-white drop-shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"
          >
            Love 21 Foundation
          </Link>
          <Link
            href="/"
            className="rounded-full border border-white/45 bg-white/15 px-4 py-2 text-sm font-semibold text-white shadow-sm backdrop-blur transition hover:bg-white/25 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white motion-reduce:transition-none"
          >
            Back to home
          </Link>
        </div>
      </header>

      <div className="relative z-10 flex min-h-[calc(100vh-5rem)] items-center px-5 py-10 sm:px-8">
        {!hasStarted ? (
          <section
            aria-labelledby="donation-landing-heading"
            className="mx-auto flex w-full max-w-4xl flex-col items-center text-center"
          >
            <p className="rounded-full border border-white/35 bg-white/15 px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-white shadow-sm backdrop-blur">
              Donation journey
            </p>
            <h1
              id="donation-landing-heading"
              className="mt-6 max-w-3xl text-5xl font-semibold tracking-tight text-white drop-shadow-lg sm:text-7xl"
            >
              Help Love 21 members thrive through sport and community.
            </h1>
            <button
              type="button"
              onClick={startDonationFlow}
              className="mt-10 rounded-full bg-white px-8 py-4 text-base font-semibold text-zinc-950 shadow-xl transition hover:-translate-y-0.5 hover:bg-orange-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white motion-reduce:transition-none motion-reduce:hover:translate-y-0"
            >
              Make a gift!
            </button>
          </section>
        ) : (
          <section
            aria-labelledby="donation-flow-heading"
            className="mx-auto w-full max-w-5xl"
          >
            <div
              ref={flowRef}
              tabIndex={-1}
              className="rounded-[2rem] border border-white/30 bg-white/88 p-4 text-zinc-950 shadow-2xl shadow-zinc-950/30 backdrop-blur-xl outline-none focus-visible:ring-2 focus-visible:ring-white sm:p-6 lg:p-8"
            >
              <div className="mb-6 flex flex-col gap-3 border-b border-orange-100 pb-5 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.2em] text-orange-800">
                    Donation flow
                  </p>
                  <h1
                    id="donation-flow-heading"
                    className="mt-2 text-3xl font-semibold tracking-tight text-zinc-950 sm:text-4xl"
                  >
                    Make a gift
                  </h1>
                </div>
                <p className="max-w-xl text-sm leading-6 text-zinc-600">
                  This prototype shows selection, review, and confirmation
                  without collecting payment or personal information.
                </p>
              </div>
              <DonationExperience />
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
