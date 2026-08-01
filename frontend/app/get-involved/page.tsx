import type { Metadata } from "next";
import { PageShell } from "@/components/layout";
import { Button, Card, PageIntro } from "@/components/ui";

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
  cta: string;
  href: string;
  variant: "primary" | "secondary";
}

const ROUTES: readonly InvolvementRoute[] = [
  {
    emoji: "❤️",
    title: "Make a Donation",
    description:
      "Your financial contributions directly fund our sports classes, nutritional guidance programs, and counseling for our community members and their families.",
    cta: "Donate Now",
    href: "/donate",
    variant: "primary",
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
    href: "/donate",
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

export default function GetInvolvedPage() {
  return (
    <PageShell>
      <PageIntro
        eyebrow="Get involved"
        title="Get Involved with Love 21"
        lede="Empowering the Down syndrome and autism community in Hong Kong through sports, nutrition, and holistic support. Join us in making a lasting impact."
      />

      <ul className="mt-12 grid gap-6 md:grid-cols-3">
        {ROUTES.map((route) => (
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
              {/* mt-auto pins the buttons to a common baseline across cards of
                  different heights. */}
              <div className="mt-auto pt-6">
                <Button href={route.href} variant={route.variant} block>
                  {route.cta}
                </Button>
              </div>
            </Card>
          </li>
        ))}
      </ul>
    </PageShell>
  );
}
