"use client";

import { Button, Card, Tag } from "@/components/ui";
import { admin, type AdminParticipant } from "@/lib/admin";
import { useAsyncAction } from "../useAsyncAction";
import { AdminError } from "./AdminError";

interface MemberRowProps {
  person: AdminParticipant;
  /** How many group photos tag them, so deletion can say what it will do. */
  taggedPhotos: number;
  onEdit: () => void;
  onEditConsent: () => void;
  onChanged: () => Promise<void>;
}

/** One member in the directory, with everything staff can do to them. */
export function MemberRow({
  person,
  taggedPhotos,
  onEdit,
  onEditConsent,
  onChanged,
}: MemberRowProps) {
  const { busy, error, run } = useAsyncAction();

  const act = async (action: () => Promise<unknown>) => {
    if (await run(action)) await onChanged();
  };

  const remove = () => {
    const alsoRemoves =
      taggedPhotos > 0
        ? ` This also removes them from ${taggedPhotos} group photo${taggedPhotos > 1 ? "s" : ""}.`
        : "";
    if (
      window.confirm(
        `Delete ${person.name}? Their story, their photo, and their stored face data are ` +
          `permanently deleted.${alsoRemoves} This cannot be undone.`,
      )
    ) {
      void act(() => admin.deleteParticipant(person.id));
    }
  };

  return (
    <Card as="article" tone="surface" padding="lg">
      <div className="flex flex-wrap items-center gap-3">
        {person.avatar_url ? (
          /* eslint-disable-next-line @next/next/no-img-element -- expiring signed URL */
          <img src={person.avatar_url} alt="" className="h-12 w-12 rounded-full object-cover" />
        ) : (
          <span
            aria-hidden
            className="flex h-12 w-12 items-center justify-center rounded-full bg-edge font-bold text-ink-soft"
          >
            {person.first_name.slice(0, 1)}
          </span>
        )}
        <h3 className="font-display text-xl font-bold text-ink">{person.name}</h3>

        {/* Three separate facts, kept separate. "Not published" and "no consent
            recorded" have different fixes. */}
        <Tag tone={person.is_published ? "positive" : "quiet"}>
          {person.is_published ? "On the website" : "Not published"}
        </Tag>
        {!person.consent_given && <Tag tone="warn">No consent recorded</Tag>}
        <Tag tone={person.enrolled_faces > 0 ? "positive" : "quiet"}>
          {person.enrolled_faces > 0 ? "Face recognition on" : "No face enrolled"}
        </Tag>
      </div>

      {person.headline && <p className="mt-3 text-ink-soft">{person.headline}</p>}

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <Button size="sm" variant="secondary" disabled={busy} onClick={onEdit}>
          Edit details
        </Button>
        <Button size="sm" variant="secondary" disabled={busy} onClick={onEditConsent}>
          Consent
        </Button>
        {person.consent_given ? (
          <Button
            size="sm"
            disabled={busy}
            onClick={() => act(() => admin.updateParticipant(person.id, {
              is_published: !person.is_published,
            }))}
          >
            {person.is_published ? "Take off the website" : "Publish to the website"}
          </Button>
        ) : (
          // Publishing without consent is refused in Postgres too; this is the
          // explanation, and a way to fix it rather than a dead end.
          <Button size="sm" variant="quiet" disabled={busy} onClick={onEditConsent}>
            Record consent before publishing
          </Button>
        )}
        <Button size="sm" variant="danger" disabled={busy} onClick={remove}>
          Delete
        </Button>
      </div>

      <AdminError message={error} className="mt-3" />
    </Card>
  );
}
