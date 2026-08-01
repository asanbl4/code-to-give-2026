import { loadStories, type Participant } from "@/lib/api";
import { TaggedPhoto } from "./tagged-photo";

export const metadata = {
  title: "Stories — Love 21 Foundation",
  description:
    "Members of the Love 21 Foundation community in Hong Kong, in their own words.",
};

export default async function StoriesPage() {
  const { photos, participants, error } = await loadStories();
  const participantsById = new Map(participants.map((person) => [person.id, person]));

  const taggedIds = new Set(photos.flatMap((photo) => photo.faces.map((f) => f.participant_id)));
  const untagged = participants.filter((person) => !taggedIds.has(person.id));

  return (
    <main className="mx-auto w-full max-w-5xl px-5 py-12 sm:px-8 sm:py-20">
      <header className="max-w-2xl">
        <p className="font-display text-sm font-bold uppercase tracking-[0.18em] text-signal">
          Love 21 Foundation · Hong Kong
        </p>
        <h1 className="mt-4 font-display text-5xl font-bold leading-[1.05] sm:text-7xl">
          Tap a face.
          <br />
          Meet the person.
        </h1>
        <p className="mt-6 text-xl text-ink-soft">
          Our members train, cook and compete together in San Po Kong. These are some of
          them — in their own words, and with their permission.
        </p>
      </header>

      {error && (
        <p className="mt-10 rounded-xl border-2 border-signal bg-surface p-5">
          <strong className="font-display">The stories are not loading right now.</strong>
          <br />
          <span className="text-ink-soft">{error}</span>
        </p>
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
          <h2 id="more-members" className="font-display text-3xl font-bold">
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

      {!error && photos.length === 0 && participants.length === 0 && <EmptyState />}

      {participants.length > 0 && (
        <p className="mt-20 border-t border-edge pt-6 text-sm text-ink-soft">
          Every member on this page has given written consent for their photo and story to
          be shared. Consent can be withdrawn at any time, and their story comes down.
        </p>
      )}
    </main>
  );
}

function MemberCard({ person }: { person: Participant }) {
  return (
    <article className="h-full rounded-2xl bg-surface p-6 ring-1 ring-edge">
      <div className="flex items-center gap-4">
        {person.avatar_url && (
          /* eslint-disable-next-line @next/next/no-img-element -- signed URL with an
             expiring token; the image optimizer would cache it past its life. */
          <img
            src={person.avatar_url}
            alt=""
            className="h-16 w-16 shrink-0 rounded-full object-cover ring-2 ring-highlight"
          />
        )}
        <h3 className="font-display text-2xl font-bold leading-tight">{person.name}</h3>
      </div>
      {person.headline && <p className="mt-4">{person.headline}</p>}
      {person.progress_summary && (
        <p className="mt-3 border-l-4 border-signal pl-3 font-bold">{person.progress_summary}</p>
      )}
    </article>
  );
}

/**
 * A page with nothing in it still has to look finished, and say what to do next.
 */
function EmptyState() {
  return (
    <section className="mt-16 rounded-2xl border-2 border-dashed border-edge p-10 text-center">
      <h2 className="font-display text-3xl font-bold">No stories published yet</h2>
      <p className="mx-auto mt-3 max-w-md text-ink-soft">
        Staff can add members and group photos from the admin tool. Nothing appears here
        until a member has consented and someone has confirmed their tag.
      </p>
      <a
        href="/admin/stories"
        className="mt-6 inline-block rounded-xl bg-signal px-5 py-3 font-bold text-white transition-colors hover:bg-signal-deep"
      >
        Open the admin tool
      </a>
    </section>
  );
}
