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

/**
 * WARNING: `/what-we-do` does not exist yet. See components/layout/navigation.ts.
 *
 * An `href` here may be off-site — members sign in on the main
 * love21foundation.com WordPress site, which this app does not host. The Hero's
 * "Go" button detects that from the scheme rather than from a flag on each
 * route, so adding another external destination needs nothing but the URL.
 */
export const ROLE_ROUTES: readonly RoleRoute[] = [
  { value: "family", label: "Family / Parent", href: "/what-we-do" },
  { value: "supporter", label: "Supporter / Donor", href: "/get-involved" },
  { value: "corporate", label: "Corporate Partner", href: "/get-involved#csr" },
  // Was `/member-portal`, which has never existed — picking this role and
  // pressing Go client-side-routed to a 404.
  { value: "member", label: "Alum / Member", href: "https://love21foundation.com/login/" },
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

/** The slide the face-tagging demo is painted onto. See `HERO_FACE_TAGS`. */
export const HERO_FACE_SLIDE_ID = 1;

export interface HeroFaceTag {
  id: string;
  name: string;
  /** The short story: the one line shown the moment you tap the face. */
  headline: string;
  /** The long story, behind "read the full story". */
  story: string;
  /**
   * Fractions of the *original* photograph, 0..1 — deliberately the same shape
   * `FaceTag` carries in `lib/api.ts`, so this demo and the live /stories data
   * describe a box the same way.
   */
  box_x: number;
  box_y: number;
  box_w: number;
  box_h: number;
}

/**
 * A hardcoded face-tagging demo for the hero.
 *
 * ⚠️ THESE ARE NOT REAL MEMBERS. The names and stories below are invented, and
 * they sit on top of a photograph of real people who did not write them. They
 * exist so a visitor on the landing page can see what the tagging feature does
 * without having to be walked through the staff tool, and every card says
 * "Sample" on it for exactly that reason. Do not remove that label, and do not
 * let these turn into half-true biographies of the people in the frame.
 *
 * The real thing is `/stories`, which renders consented members from the API.
 * When enough of them are published, delete this constant and the component
 * that reads it.
 *
 * Boxes were measured against the 2560x1920 original. The three faces are all
 * inside the middle band of the photo, which is the part that survives
 * `background-size: cover` at every viewport width the carousel has.
 */
export const HERO_FACE_TAGS: readonly HeroFaceTag[] = [
  {
    id: "demo-ka-ho",
    name: "Member A",
    headline: "Two years of ribbon dance — now he leads the warm-up.",
    story:
      "Member A joined the class reluctantly due to his mother and stayed at the back for a month. He now confidently counts the group in and teaches new members proper ribbon-holding techniques.",
    box_x: 0.4406,
    box_y: 0.4063,
    box_w: 0.0332,
    box_h: 0.0719,
  },
  {
    id: "demo-marco",
    name: "Member B",
    headline: "Swam his first 400 metres this spring.",
    story:
      "Eighteen months ago, Member B feared putting his face in water and trained in 5-metre increments. By April, he swam 400 metres nonstop and immediately asked to attempt 800 metres, showing incredible progress and motivation.",
    box_x: 0.677,
    box_y: 0.388,
    box_w: 0.0461,
    box_h: 0.0781,
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

export interface CorporatePartner {
  name: string;
  /** Expected path under public/images/partners/ — see CorporatePartners.tsx.
   *  Drop the PNG in with this exact filename and the strip picks it up
   *  automatically; until then it falls back to the text badge (the <img>
   *  has an onError handler for exactly this — see PartnerBadge). */
  logo: string;
}

// From "Our CSR Partners" (p.11) in the Love 21 2023-2024 Annual Report.
export const CORPORATE_PARTNERS: readonly CorporatePartner[] = [
  { name: "Bloomberg", logo: "/images/partners/bloomberg.png" },
  { name: "10x10 HK", logo: "/images/partners/10x10-hk.png" },
  { name: "Abrdn", logo: "/images/partners/abrdn.png" },
  { name: "BlackRock", logo: "/images/partners/blackrock.png" },
  { name: "Credit Suisse", logo: "/images/partners/credit-suisse.png" },
  { name: "Hang Seng Bank", logo: "/images/partners/hang-seng-bank.png" },
  { name: "Lululemon", logo: "/images/partners/lululemon.png" },
  { name: "Standard Chartered", logo: "/images/partners/standard-chartered.png" },
  { name: "EY", logo: "/images/partners/ey.png" },
  { name: "Segantii", logo: "/images/partners/segantii.png" },
  { name: "HSBC", logo: "/images/partners/hsbc.png" },
  { name: "Clifford Chance", logo: "/images/partners/clifford-chance.png" },
  { name: "Allegis", logo: "/images/partners/allegis.png" },
  { name: "Yale Club", logo: "/images/partners/yale-club.png" },
  { name: "Slaughter and May", logo: "/images/partners/slaughter-and-may.png" },
];
