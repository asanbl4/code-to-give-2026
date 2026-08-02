import type { Metadata } from "next";
import { PageShell } from "@/components/layout";
import { Button, Card, PageIntro, type ButtonVariant } from "@/components/ui";

export const metadata: Metadata = {
  title: "Get Involved",
  description:
    "Donate, give equipment, or volunteer with the Love 21 Foundation community in Hong Kong.",
};

interface InvolvementRoute {
  emoji: string;
  title: string;
  description: string;
  bullets?: string[];
  cta?: string;
  href?: string;
  variant?: ButtonVariant;
}

const PRIMARY_ROUTES: readonly InvolvementRoute[] = [
  {
    emoji: "❤️",
    title: "Make a Donation",
    description:
      "Your financial contributions directly fund our sports classes, nutritional guidance programs, and counseling for our community members and their families.",
    cta: "Donate Now",
    href: "/donate",
    variant: "donate",
  },
  {
    emoji: "🎁",
    title: "Donation Wishlist",
    description:
      "Prefer to give essential supplies? Check out our active wishlist of needed equipment and items:",
    bullets: [
      "Sports Equipment (Basketballs, Yoga mats)",
      "Nutritional ingredients & snacks",
      "Art & workshop craft supplies",
    ],
    cta: "View Item Wishlist",
    href: "/wishlist",
    variant: "secondary",
  },
  {
    emoji: "🤝",
    title: "Become a Volunteer",
    description:
      "Share your time and skills! Help coach sports activities, assist in nutrition classes, or support our community events and administration.",
    cta: "Sign Up to Volunteer",
    href: "/events",
    variant: "secondary",
  },
];

const ADDITIONAL_ROUTES: readonly InvolvementRoute[] = [
  {
    emoji: "🚀",
    title: "Raise Funds",
    description:
      "Take the initiative and start your own fundraising campaign to support our community members and expand our foundation's reach.",
  },
  {
    emoji: "🎓",
    title: "Education Programme",
    description:
      "Engage students and faculty through our school inclusion talks and workshops designed to foster awareness, empathy, and understanding.",
  },
];

export default function GetInvolvedPage() {
  return (
    <PageShell>
      <PageIntro
        eyebrow="Get involved"
        title="Get Involved with Love 21"
        lede="Empowering the Down syndrome and autism community in Hong Kong through sports, nutrition, and holistic support. Join us in making a lasting impact."
      />

      {/* Edge-to-Edge Full-Screen Bleed Banner */}
      <div className="relative left-[50%] right-[50%] -ml-[50vw] -mr-[50vw] w-screen my-12 h-80 sm:h-[420px] overflow-hidden bg-slate-900 shadow-inner">
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/60 via-slate-950/20 to-transparent z-10" />
        <img
          src="/get-involved.jpg"
          alt="Love 21 Community Banner"
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute bottom-8 left-8 sm:left-16 z-20 max-w-2xl">
          <span className="inline-flex items-center gap-1.5 rounded-xl bg-white/90 backdrop-blur-md px-4 py-2 text-xs font-bold text-slate-900 shadow-sm">
            Love 21 Foundation — Community Impact
          </span>
        </div>
      </div>

      {/* Top 3 Initial Cards */}
      <ul className="grid gap-6 md:grid-cols-3">
        {PRIMARY_ROUTES.map((route) => (
          <li key={route.title} className="flex">
            <Card as="article" panel padding="lg" className="flex w-full flex-col">
              <span
                aria-hidden="true"
                className="flex h-12 w-12 items-center justify-center rounded-card bg-surface text-2xl"
              >
                {route.emoji}
              </span>
              <h2 className="mt-6 font-display text-2xl font-bold text-ink">{route.title}</h2>
              <p className="mt-3 leading-relaxed text-ink-soft">{route.description}</p>
              {route.bullets && (
                <ul className="mt-4 list-inside list-disc space-y-2 text-ink-soft">
                  {route.bullets.map((bullet) => (
                    <li key={bullet}>{bullet}</li>
                  ))}
                </ul>
              )}
              {route.cta && route.href && route.variant && (
                <div className="mt-auto pt-6">
                  <Button href={route.href} variant={route.variant} block>
                    {route.cta}
                  </Button>
                </div>
              )}
            </Card>
          </li>
        ))}
      </ul>

      {/* Middle 2 Cards without Buttons */}
      <ul className="mt-6 grid gap-6 md:grid-cols-2">
        {ADDITIONAL_ROUTES.map((route) => (
          <li key={route.title} className="flex">
            <Card as="article" panel padding="lg" className="flex w-full flex-col">
              <span
                aria-hidden="true"
                className="flex h-12 w-12 items-center justify-center rounded-card bg-surface text-2xl"
              >
                {route.emoji}
              </span>
              <h2 className="mt-6 font-display text-2xl font-bold text-ink">{route.title}</h2>
              <p className="mt-3 leading-relaxed text-ink-soft">{route.description}</p>
            </Card>
          </li>
        ))}
      </ul>

      {/* Interactive Matching Quiz Section at the Bottom */}
      <section className="mt-16 rounded-3xl bg-gradient-to-br from-rose-50/70 via-white to-slate-50 border border-slate-200/80 p-8 sm:p-12 shadow-sm">
        <div className="max-w-2xl space-y-4">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-red-50 px-3.5 py-1 text-xs font-bold uppercase tracking-wider text-red-600 border border-red-200/60">
            ✨ Find Your Perfect Match
          </span>
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            Not sure how you can help? Take our short quiz!
          </h2>
          <p className="text-slate-600 text-base leading-relaxed">
            Answer a few quick questions about your skills, interests, and availability. Our matching tool will pair you with precise, high-impact roles across multiple foundation pathways tailored uniquely to you.
          </p>
          <div className="pt-2">
            <Button href="/quiz" variant="primary">
              Take the Matching Quiz
            </Button>
          </div>
        </div>
      </section>
    </PageShell>
  );
}
