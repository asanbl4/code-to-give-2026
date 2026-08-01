import type { Metadata } from "next";
import { PageShell } from "@/components/layout";
import { Button, Card, PageIntro } from "@/components/ui";
import { MemberCard } from "@/features/stories/components/MemberCard";
import { TaggedPhoto } from "@/features/stories/components/TaggedPhoto";
import { loadStories } from "@/lib/api";

export const metadata: Metadata = {
  title: "Stories",
  description:
    "Members of the Love 21 Foundation community in Hong Kong, in their own words.",
};

export default async function StoriesPage() {
  const { photos, participants, error } = await loadStories();
  const participantsById = new Map(participants.map((person) => [person.id, person]));

  const taggedIds = new Set(photos.flatMap((photo) => photo.faces.map((face) => face.participant_id)));
  const untagged = participants.filter((person) => !taggedIds.has(person.id));

  return (
    <PageShell>
      <PageIntro
        eyebrow="Love 21 Foundation · Hong Kong"
        title={
          <>
            Tap a face.
            <br />
            Meet the person.
          </>
        }
        lede="Our members train, cook and compete together in San Po Kong. These are some of them — in their own words, and with their permission."
      />

      {error && (
        <Card tone="danger" padding="lg" className="mt-10">
          <strong className="font-display text-lg">The stories are not loading right now.</strong>
          <p className="mt-1 text-ink-soft">{error}</p>
        </Card>
      )}

      {photos.length > 0 && (
        <section className="mt-16 space-y-16" aria-label="Group photos">
          {photos.map((photo) => (
            <TaggedPhoto key={photo.id} photo={photo} participantsById={participantsById} />
          ))}
        </section>
      )}

      {untagged.length > 0 && (
        <section className="mt-20" aria-labelledby="more-members">
          <h2 id="more-members" className="font-display text-3xl font-bold text-ink">
            {photos.length > 0 ? "More members" : "Our members"}
          </h2>
          <ul className="mt-8 grid gap-6 sm:grid-cols-2">
            {untagged.map((person) => (
              <li key={person.id}>
                <MemberCard person={person} />
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* A page with nothing in it still has to look finished, and say what to do next. */}
      {!error && photos.length === 0 && participants.length === 0 && (
        <Card
          padding="lg"
          className="mt-16 border-2 border-dashed border-edge text-center ring-0"
        >
          <h2 className="font-display text-3xl font-bold text-ink">No stories published yet</h2>
          <p className="mx-auto mt-3 max-w-md text-ink-soft">
            Staff can add members and group photos from the admin tool. Nothing appears here until a
            member has consented and someone has confirmed their tag.
          </p>
          <Button href="/admin/members" className="mt-6">
            Open the admin tool
          </Button>
        </Card>
      )}

      {participants.length > 0 && (
        <p className="mt-20 border-t border-edge pt-6 text-sm text-ink-soft">
          Every member on this page has given written consent for their photo and story to be
          shared. Consent can be withdrawn at any time, and their story comes down.
        </p>
      )}
    </PageShell>
  );
}
