import Image from "next/image";

export interface VerifiedDonationPhoto {
  src: string;
  alt: string;
  width: number;
  height: number;
}

interface DonationHeroVisualProps {
  photo: VerifiedDonationPhoto | null;
}

function HeartCommunityIllustration() {
  return (
    <div className="relative min-h-64 overflow-hidden rounded-[2rem] border border-edge bg-gradient-to-br from-signal-soft via-highlight-soft to-positive-soft p-5 shadow-inner">
      <style>
        {`
          @keyframes donation-heart-float {
            0%, 100% { transform: translateY(0) scale(1); }
            50% { transform: translateY(-4px) scale(1.025); }
          }

          @keyframes donation-node-pulse {
            0%, 100% { opacity: 0.9; transform: scale(1); }
            50% { opacity: 1; transform: scale(1.035); }
          }

          @keyframes donation-line-drift {
            0%, 100% { stroke-dashoffset: 0; opacity: 0.52; }
            50% { stroke-dashoffset: -10; opacity: 0.72; }
          }

          @media (prefers-reduced-motion: reduce) {
            .donation-heart-motion,
            .donation-node-motion,
            .donation-line-motion {
              animation: none !important;
            }
          }
        `}
      </style>
      <svg
        aria-hidden="true"
        viewBox="0 0 360 280"
        className="h-full min-h-56 w-full"
      >
        <defs>
          <linearGradient id="donation-heart-gradient" x1="0" x2="1" y1="0" y2="1">
            <stop offset="0%" stopColor="var(--color-signal)" />
            <stop offset="100%" stopColor="var(--color-signal-deep)" />
          </linearGradient>
          <linearGradient id="donation-teal-gradient" x1="0" x2="1" y1="0" y2="1">
            <stop offset="0%" stopColor="var(--color-positive-soft)" />
            <stop offset="100%" stopColor="var(--color-positive)" />
          </linearGradient>
        </defs>

        <circle cx="62" cy="58" r="46" fill="var(--color-signal-soft)" opacity="0.55" />
        <circle cx="292" cy="84" r="38" fill="var(--color-positive-soft)" opacity="0.8" />
        <circle cx="268" cy="216" r="58" fill="var(--color-highlight-soft)" opacity="0.9" />
        <circle cx="96" cy="222" r="34" fill="var(--color-surface-deep)" opacity="0.65" />

        <g
          className="donation-line-motion origin-center"
          style={{ animation: "donation-line-drift 5.5s ease-in-out infinite" }}
          fill="none"
          strokeLinecap="round"
          strokeWidth="9"
          strokeDasharray="18 18"
        >
          <path d="M92 94 C126 127, 173 123, 202 86" stroke="var(--color-positive)" />
          <path d="M105 177 C145 214, 208 220, 254 184" stroke="var(--color-signal)" />
          <path d="M246 100 C262 126, 266 153, 254 184" stroke="var(--color-ink-soft)" opacity="0.5" />
        </g>

        <g
          className="donation-node-motion origin-center"
          style={{ animation: "donation-node-pulse 4.5s ease-in-out infinite" }}
        >
          <circle cx="86" cy="88" r="28" fill="var(--color-paper)" stroke="var(--color-ink)" strokeWidth="4" />
          <circle cx="236" cy="76" r="28" fill="var(--color-paper)" stroke="var(--color-ink)" strokeWidth="4" />
          <circle cx="262" cy="184" r="28" fill="var(--color-paper)" stroke="var(--color-ink)" strokeWidth="4" />
          <circle cx="96" cy="184" r="28" fill="var(--color-paper)" stroke="var(--color-ink)" strokeWidth="4" />
          <path d="M74 89h24M86 77v24" stroke="var(--color-signal)" strokeLinecap="round" strokeWidth="5" />
          <path d="M226 82c4-10 17-10 21 0" stroke="var(--color-positive)" strokeLinecap="round" strokeWidth="5" />
          <path d="M250 180h24M262 168v24" stroke="var(--color-ink-soft)" strokeLinecap="round" strokeWidth="5" />
          <path d="M84 188c4 7 19 7 24 0" stroke="var(--color-positive)" strokeLinecap="round" strokeWidth="5" />
        </g>

        <g
          className="donation-heart-motion origin-center"
          style={{ animation: "donation-heart-float 4s ease-in-out infinite" }}
        >
          <path
            d="M180 113c12-22 48-15 48 13 0 31-48 54-48 54s-48-23-48-54c0-28 36-35 48-13Z"
            fill="url(#donation-heart-gradient)"
            stroke="var(--color-signal-deep)"
            strokeWidth="4"
          />
          <path
            d="M169 126c4-8 18-8 22 0"
            fill="none"
            stroke="var(--color-paper)"
            strokeLinecap="round"
            strokeWidth="5"
            opacity="0.9"
          />
        </g>
      </svg>

      <div className="absolute bottom-5 left-5 right-5 rounded-2xl border border-white/70 bg-white/88 px-4 py-3 text-sm leading-6 text-ink shadow-sm backdrop-blur">
        <p className="font-semibold text-ink">A gift begins with a choice.</p>
        <p className="mt-1 text-ink-soft">
          Select an amount, choose an area of interest, and review before confirming.
        </p>
      </div>
    </div>
  );
}

export function DonationHeroVisual({ photo }: DonationHeroVisualProps) {
  if (!photo) {
    return <HeartCommunityIllustration />;
  }

  return (
    <figure className="overflow-hidden rounded-[2rem] border border-edge bg-white shadow-sm">
      <Image
        src={photo.src}
        alt={photo.alt}
        width={photo.width}
        height={photo.height}
        className="h-full min-h-64 w-full object-cover"
        priority
      />
      <figcaption className="border-t border-edge bg-signal-soft px-4 py-3 text-sm leading-6 text-ink-soft">
        Verified Love 21 activity photograph.
      </figcaption>
    </figure>
  );
}
