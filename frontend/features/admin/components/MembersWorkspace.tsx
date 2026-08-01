"use client";

import { useCallback, useId, useMemo, useState } from "react";
import { Button, Card, TextField } from "@/components/ui";
import { admin, type AdminParticipant, type AdminPhoto } from "@/lib/admin";
import { useAdminData } from "../useAdminData";
import { AdminError } from "./AdminError";
import { ConsentDialog } from "./ConsentDialog";
import { MemberDialog } from "./MemberDialog";
import { MemberRow } from "./MemberRow";

interface MembersData {
  participants: AdminParticipant[];
  photos: AdminPhoto[];
}

async function loadMembers(): Promise<MembersData> {
  const [participants, photos] = await Promise.all([
    admin.listParticipants(),
    // Only to count how many photos tag each person, so the delete
    // confirmation can say what deleting will actually take down with it.
    admin.listPhotos(),
  ]);
  return { participants, photos };
}

/** The member directory: everyone, searchable, with add and edit in dialogs. */
export function MembersWorkspace() {
  const searchId = useId();
  const { data, error, loading, refresh } = useAdminData<MembersData>(loadMembers, {
    participants: [],
    photos: [],
  });
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<AdminParticipant | null>(null);
  const [adding, setAdding] = useState(false);
  const [consentFor, setConsentFor] = useState<AdminParticipant | null>(null);

  const { participants, photos } = data;

  const taggedCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const photo of photos) {
      // A person tagged twice in one photo still only loses one photo.
      const seen = new Set(
        photo.faces.map((face) => face.participant_id).filter((id): id is string => Boolean(id)),
      );
      for (const id of seen) counts.set(id, (counts.get(id) ?? 0) + 1);
    }
    return counts;
  }, [photos]);

  const matches = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return participants;
    return participants.filter((person) =>
      [person.name, person.first_name, person.last_name, person.headline]
        .filter(Boolean)
        .some((field) => field!.toLowerCase().includes(needle)),
    );
  }, [participants, query]);

  // Stable, so the dialogs do not re-render the whole list on every keystroke.
  const closeEditing = useCallback(() => setEditing(null), []);

  return (
    <section className="mt-8" aria-labelledby="admin-members">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <TextField
          id={searchId}
          type="search"
          label="Search members"
          placeholder="Name or short story"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          fieldClassName="min-w-64 flex-1"
        />
        <Button onClick={() => setAdding(true)}>Add a member</Button>
      </div>

      <h2 id="admin-members" className="sr-only">
        Members
      </h2>

      <p aria-live="polite" className="mt-4 text-sm text-ink-soft">
        {loading
          ? "Loading members…"
          : query.trim()
            ? `${matches.length} of ${participants.length} members match “${query.trim()}”`
            : `${participants.length} member${participants.length === 1 ? "" : "s"}`}
      </p>

      <AdminError message={error} className="mt-4" />

      {!loading && participants.length === 0 && (
        <Card padding="lg" className="mt-4 border-2 border-dashed border-edge text-center ring-0">
          <p className="text-ink-soft">No members yet. Add the first one.</p>
        </Card>
      )}

      {!loading && participants.length > 0 && matches.length === 0 && (
        <p className="mt-4 text-ink-soft">Nobody matches that. Try part of a name.</p>
      )}

      <ul className="mt-4 space-y-4">
        {matches.map((person) => (
          <li key={person.id}>
            <MemberRow
              person={person}
              taggedPhotos={taggedCounts.get(person.id) ?? 0}
              onEdit={() => setEditing(person)}
              onEditConsent={() => setConsentFor(person)}
              onChanged={refresh}
            />
          </li>
        ))}
      </ul>

      <MemberDialog open={adding} onClose={() => setAdding(false)} onSaved={refresh} />

      {editing && (
        <MemberDialog
          open
          member={editing}
          onClose={closeEditing}
          onSaved={async (saved) => {
            // Keep the dialog pointed at fresh data: after a portrait is
            // refused, it stays open showing this member.
            setEditing(saved);
            await refresh();
          }}
        />
      )}

      {consentFor && (
        <ConsentDialog
          open
          member={consentFor}
          onClose={() => setConsentFor(null)}
          onSaved={refresh}
        />
      )}
    </section>
  );
}
