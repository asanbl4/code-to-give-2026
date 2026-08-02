"use client";

import { useState } from "react";
import { Button, Section } from "@/components/ui";
import { CORPORATE_PARTNERS } from "../data";
import "../landing.css";

/**
 * Each partner points at an expected file under public/images/partners/
 * (see ../data.ts). Drop the PNG in with that exact filename and it shows up
 * here automatically on the next reload — no code change needed. Until a
 * given file exists, that one badge falls back to a plain text wordmark
 * (the <img>'s onError below catches the 404 and swaps it out).
 */
function PartnerBadge({ name, logo }: { name: string; logo: string }) {
  const [failed, setFailed] = useState(false);

  return (
    <div
      className="mx-3 flex h-20 w-40 shrink-0 items-center justify-center rounded-card border border-edge bg-white px-4 shadow-card"
      role="listitem"
    >
      {failed ? (
        <span className="text-center text-sm font-bold text-ink-soft">{name}</span>
      ) : (
        // eslint-disable-next-line @next/next/no-img-element -- decorative logo strip, not worth next/image's overhead here
        <img
          src={logo}
          alt={name}
          className="max-h-12 max-w-full object-contain"
          onError={() => setFailed(true)}
        />
      )}
    </div>
  );
}

export function CorporatePartners() {
  return (
    <div className="mx-auto w-full max-w-6xl px-5 pb-14 sm:px-8">
      <Section title="Our corporate partners" description="Companies who've partnered with us through CSR days, fundraising, and volunteering.">
        <div
          className="overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_5%,black_95%,transparent)]"
          role="list"
          aria-label="Corporate partners"
        >
          <div className="partners-track">
            {/* Rendered twice, back to back — see the .partners-track comment in landing.css. */}
            {[...CORPORATE_PARTNERS, ...CORPORATE_PARTNERS].map((partner, index) => (
              <PartnerBadge key={`${partner.name}-${index}`} name={partner.name} logo={partner.logo} />
            ))}
          </div>
        </div>

        <div className="mt-6 flex justify-center">
          <Button href="/get-involved" variant="secondary">
            Corporate? Sign up for volunteer →
          </Button>
        </div>
      </Section>
    </div>
  );
}
