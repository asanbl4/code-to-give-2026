/**
 * Landing page content.
 *
 * It used to live as a `const` at the top of whichever component rendered it,
 * which is why the same four Love 21 photographs were pasted into three
 * different files. When these become live endpoints, this is the only file that
 * has to change.
 */

const MEDIA = "https://love21foundation.com/wp-content/uploads";

export interface RoleRoute {
  value: string;
  label: string;
  href: string;
}

/** WARNING: `/what-we-do` and `/member-portal` do not exist yet. See components/layout/navigation.ts. */
export const ROLE_ROUTES: readonly RoleRoute[] = [
  { value: "family", label: "Family / Parent", href: "/what-we-do" },
  { value: "supporter", label: "Supporter / Donor", href: "/get-involved" },
  { value: "corporate", label: "Corporate Partner", href: "/get-involved#csr" },
  { value: "member", label: "Alum / Member", href: "/member-portal" },
];

export type HeroSlide =
  | { id: number; type: "image"; image: string; caption: string; href: string }
  | { id: number; type: "video"; youtubeId: string; caption: string; href: string };

export const HERO_SLIDES: readonly HeroSlide[] = [
  {
    id: 1,
    type: "image",
    image: `${MEDIA}/2021/08/IMG_1641-scaled.jpg`,
    caption: "#SoMuchAbility",
    href: "/what-we-do",
  },
  {
    id: 2,
    type: "video",
    youtubeId: "3U7jO4o3iAE",
    caption: "Watch our story",
    href: "/who-we-are",
  },
  {
    id: 3,
    type: "image",
    image: `${MEDIA}/2021/08/a19c3f56-b90d-4a19-b5b6-1f90b68bb103.jpg`,
    caption: "Sport without limitations",
    href: "/what-we-do#sports",
  },
  {
    id: 4,
    type: "image",
    image: `${MEDIA}/2021/08/44548051-c7d1-4248-a0b5-a6243deb3644.jpg`,
    caption: "Family is at the heart of everything we do",
    href: "/what-we-do#family",
  },
  {
    id: 5,
    type: "image",
    image: `${MEDIA}/2021/08/bc61bfd9-bdf8-4117-8394-9269df16c04d.jpg`,
    caption: "Corporate teams making a real difference",
    href: "/what-we-do#csr",
  },
];

export const ROTATING_WORDS = ["play", "cook", "thrive", "contribute"] as const;

export interface LandingStat {
  value: string;
  label: string;
}

export const STATS: readonly LandingStat[] = [
  { value: "500+", label: "Families served" },
  { value: "800+", label: "Sessions of classes and activities each month" },
  { value: "90+", label: "Types of activities" },
  { value: "1000+", label: "Volunteer hours per month" },
];

export interface Programme {
  name: string;
  tags: string;
  href: string;
  image: string;
}

export const PROGRAMMES: readonly Programme[] = [
  {
    name: "Sports",
    tags: "strength, mental health",
    href: "/what-we-do#sports",
    image: `${MEDIA}/2021/08/a19c3f56-b90d-4a19-b5b6-1f90b68bb103.jpg`,
  },
  {
    name: "Nutrition",
    tags: "gut health, cooking",
    href: "/what-we-do#nutrition",
    image: `${MEDIA}/2021/08/WhatsApp-Image-2021-08-22-at-11.11.56-AM.jpeg`,
  },
  {
    name: "Family",
    tags: "parent support",
    href: "/what-we-do#family",
    image: `${MEDIA}/2021/08/44548051-c7d1-4248-a0b5-a6243deb3644.jpg`,
  },
  {
    name: "CSR",
    tags: "corporate volunteering",
    href: "/what-we-do#csr",
    image: `${MEDIA}/2021/08/bc61bfd9-bdf8-4117-8394-9269df16c04d.jpg`,
  },
];

export interface StoryItem {
  image: string;
  text: string;
}

/**
 * Real photos and titles from Love 21's existing news/stories carousel.
 * TODO: replace with live data from GET /api/participants, for member-consented
 * individual stories rather than press coverage.
 */
export const STORIES: readonly StoryItem[] = [
  { image: `${MEDIA}/2026/05/bey0nd-limit_sz-1-1024x604.png`, text: "Beyond Limits Banquet" },
  { image: `${MEDIA}/2025/11/raffleinstagram_nologo-1024x1024.png`, text: "Charity Raffle 2025" },
  {
    image: `${MEDIA}/2022/06/Screenshot-2022-06-06-at-11.59.49-1024x684.png`,
    text: "Love 21's Open Secret to a Long, Happy Life",
  },
  {
    image: `${MEDIA}/2022/06/Screenshot-2022-06-06-at-11.42.30-1024x638.png`,
    text: "Ready for Purposeful Employment",
  },
];

export interface RecentEvent {
  id: number;
  caption: string;
  image: string;
}

/** TODO: replace with the live Instagram feed — `features/instagram` already fetches it. */
export const RECENT_EVENTS: readonly RecentEvent[] = [
  {
    id: 1,
    caption: "Beyond Limits Banquet — tables now open",
    image: `${MEDIA}/2026/05/bey0nd-limit_sz-1-1024x604.png`,
  },
  {
    id: 2,
    caption: "Charity Raffle 2025 — support the community",
    image: `${MEDIA}/2025/11/raffleinstagram_nologo-1024x1024.png`,
  },
  {
    id: 3,
    caption: "Health interview feature",
    image: `${MEDIA}/2022/06/Screenshot-2022-06-06-at-12.05.49-1024x575.png`,
  },
];

export interface RecentDonation {
  name: string;
  area: string;
  amount: number;
  emoji: string;
}

/** TODO: replace with a real feed once the donation backend is wired up. */
export const RECENT_DONATIONS: readonly RecentDonation[] = [
  { name: "Janet", area: "Kowloon", amount: 500, emoji: "💛" },
  { name: "Marcus", area: "Central", amount: 200, emoji: "🙌" },
  { name: "Priya", area: "Sha Tin", amount: 1000, emoji: "✨" },
];
