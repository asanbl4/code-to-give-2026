import type { Metadata } from "next";
import Image from "next/image";
import { BookOpen, Hand, ScanFace, ShieldCheck, Sparkles, type LucideIcon } from "lucide-react";
import { PageShell } from "@/components/layout";
import { Button, Card, PageIntro } from "@/components/ui";
import { MemberCard } from "@/features/stories/components/MemberCard";
import { TaggedPhoto } from "@/features/stories/components/TaggedPhoto";
import { loadStories } from "@/lib/api";

export const metadata: Metadata = {
  title: "Our Members",
  description:
    "The people behind Love 21 Foundation in Hong Kong — their milestones, in their own words and shared with their permission.",
};

interface HowItWorksStep {
  /* `LucideIcon`, not `React.ElementType`: the latter widens the component's
     props to `never`, so `<Icon className="…" />` fails to type-check. */
  icon: LucideIcon;
  title: string;
  description: string;
}

const HOW_IT_WORKS: readonly HowItWorksStep[] = [
  {
    icon: ScanFace,
    title: "Look for the outline",
    description:
      "In every group photo below, the members who have chosen to share their story are marked with a highlighted box around their face.",
  },
  {
    icon: Hand,
    title: "Tap to meet them",
    description:
      "Tap or click a highlighted face and a card opens beside it, with their name and one line about what they have been working on.",
  },
  {
    icon: BookOpen,
    title: "Read the whole thing",
    description:
      "Open the longer version whenever a line makes you curious. Every story is written with the member, never about them.",
  },
];

export default async function StoriesPage() {
  const { photos, participants, error } = await loadStories();
  const participantsById = new Map(participants.map((person) => [person.id, person]));

  const taggedIds = new Set(
    photos.flatMap((photo) => photo.faces.map((face) => face.participant_id)),
  );
  const untagged = participants.filter((person) => !taggedIds.has(person.id));

  return (
    <PageShell>
      <PageIntro
        eyebrow="Our Community"
        title="Meet Our Members"
        lede="Behind every class, every training session and every shared meal are the people who make Love 21 what it is. These are their milestones — shared with their permission, and in their own words."
      />

      {/* Edge-to-edge banner, the same full-bleed treatment as /get-involved. */}
      {/* <div className="relative left-[50%] right-[50%] -ml-[50vw] -mr-[50vw] my-12 h-80 w-screen overflow-hidden bg-ink shadow-inner sm:h-[420px]">
        <div className="absolute inset-0 z-10 bg-gradient-to-t from-ink/70 via-ink/20 to-transparent" />
        <Image
          src="/stories.jpg"
          alt="Love 21 members together after a session in Hong Kong"
          fill
          priority
          sizes="100vw"
          className="object-cover"
        />
        <div className="absolute bottom-8 left-8 z-20 max-w-2xl sm:left-16">
          <span className="inline-flex items-center gap-1.5 rounded-xl bg-paper/90 px-4 py-2 text-xs font-bold text-ink shadow-card backdrop-blur-md">
            Love 21 Foundation — Our Community
          </span>
        </div>
      </div> */}

      {error && (
        <Card tone="danger" panel padding="lg" className="mb-12">
          <h2 className="font-display text-lg font-bold text-ink">
            The stories are not loading right now.
          </h2>
          <p className="mt-1 text-ink-soft">{error}</p>
        </Card>
      )}

      {/* What the page does, before it does it. The interaction is unusual
          enough that people miss it entirely without being told. */}
      <Card as="section" panel padding="lg" aria-labelledby="how-it-works">
        <div className="flex items-center gap-3">
          <span className="flex h-12 w-12 items-center justify-center rounded-card bg-signal-soft text-signal">
            <Sparkles className="h-6 w-6 stroke-[1.75]" />
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-signal/20 bg-signal-soft px-3.5 py-1 text-xs font-bold uppercase tracking-wider text-signal-deep">
            Interactive photos
          </span>
        </div>

        <h2
          id="how-it-works"
          className="mt-6 font-display text-2xl font-bold tracking-tight text-ink sm:text-3xl"
        >
          Tap a face, meet the person
        </h2>
        <p className="mt-3 max-w-3xl leading-relaxed text-ink-soft">
          Our group photos are not just pictures. Everyone in them who has agreed to appear here can
          be tapped, and their story opens right where they are standing.
        </p>

        
      </Card>

      {photos.length > 0 && (
        <section className="mt-16" aria-labelledby="group-photos">
          <h2
            id="group-photos"
            className="font-display text-2xl font-bold tracking-tight text-ink sm:text-3xl"
          >
            From our annual reports
          </h2>
          {/* Two per row, but only from `lg`. The tap-a-face card is 22rem wide
              and anchored inside the photo, so a column narrower than about
              30rem leaves it nowhere to sit — between 640px and 1024px a
              half-width column is exactly that. Below 640px the card is a
              full-width bottom sheet and the photos want the whole page anyway. */}
          <div className="mt-8 grid gap-8 lg:grid-cols-2">
            {photos.map((photo) => (
              <Card key={photo.id} panel padding="lg">
                <TaggedPhoto photo={photo} participantsById={participantsById} />
              </Card>
            ))}
          </div>
        </section>
      )}

      {untagged.length > 0 && (
        <section className="mt-16" aria-labelledby="more-members">
          <h2
            id="more-members"
            className="font-display text-2xl font-bold tracking-tight text-ink sm:text-3xl"
          >
            {photos.length > 0 ? "More of our members" : "Our members"}
          </h2>
          <p className="mt-3 max-w-3xl leading-relaxed text-ink-soft">
            {photos.length > 0
              ? "Not everyone is in a group photo yet. These members have shared their story all the same."
              : "Group photos are on their way. In the meantime, meet the members who have shared their story."}
          </p>
          <ul className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {untagged.map((person) => (
              <li key={person.id} className="flex">
                <MemberCard person={person} />
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* A page with nothing in it still has to look finished, and say what to
          do next. This is what visitors see between a fresh database and the
          first published member. */}
      {!error && photos.length === 0 && participants.length === 0 && (
        <Card
          panel
          padding="lg"
          className="mt-16 border-2 border-dashed border-edge text-center ring-0"
        >
          <h2 className="font-display text-2xl font-bold tracking-tight text-ink sm:text-3xl">
            No stories published yet
          </h2>
          <p className="mx-auto mt-3 max-w-lg leading-relaxed text-ink-soft">
            Staff add members and group photos from the admin tool. Nobody appears here until they
            have given their consent and someone has confirmed their tag by hand.
          </p>
          <Button href="/admin/members" className="mt-6">
            Open the admin tool
          </Button>
        </Card>
      )}

      {/* Consent is the whole basis on which this page is allowed to exist, so
          it is a section, not a footnote in grey 12px. */}
      <Card as="section" tone="signal" panel padding="lg" className="mt-16">
        <div className="flex flex-col items-start gap-4 sm:flex-row">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-card bg-signal text-white">
            <ShieldCheck className="h-5 w-5 stroke-[1.75]" />
          </span>
          <div>
            <h2 className="font-display text-lg font-bold uppercase tracking-wider text-signal-deep">
              Shared with permission
            </h2>
            <p className="mt-2 max-w-3xl leading-relaxed text-ink">
              Every member on this page has given written consent for their photo and their story to
              be shared. Consent can be withdrawn at any time, and when it is, their story, their
              tags and any face data we hold come down with it.
            </p>
          </div>
        </div>
      </Card>
    </PageShell>
  );
}
