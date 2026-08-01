"use client";

import { useMemo } from "react";
import { Button, Combobox, Tag, type ComboboxOption } from "@/components/ui";
import { admin, type AdminFace, type AdminParticipant } from "@/lib/admin";
import { useAsyncAction } from "../useAsyncAction";
import { AdminError } from "./AdminError";

interface FaceRowProps {
  face: AdminFace;
  index: number;
  participants: AdminParticipant[];
  /** Opens the add-member dialog for this face, prefilled with what was typed. */
  onCreateMember: (query: string) => void;
  onChanged: () => Promise<void>;
}

/**
 * One detected face: who it is, and what to do about it.
 *
 * Each action states its intent rather than patching a column, because the
 * three of them are transitions between states the database has opinions about.
 * Naming someone new sends `status: "suggested"` alongside, so a box that was
 * confirmed as one person is no longer confirmed as anyone.
 *
 * "Not a member" is reversible and deliberately still visible afterwards — it
 * used to grey the box almost to nothing and disable every button, which read
 * as "this person has been deleted from the photo" and could not be undone.
 * Deleting the box is now its own button, and says so.
 */
export function FaceRow({ face, index, participants, onCreateMember, onChanged }: FaceRowProps) {
  const { busy, error, run } = useAsyncAction();

  const act = async (action: () => Promise<unknown>) => {
    if (await run(action)) await onChanged();
  };

  const options: ComboboxOption[] = useMemo(
    () =>
      participants.map((person) => ({
        value: person.id,
        label: person.name,
        hint: person.headline ?? undefined,
      })),
    [participants],
  );

  const suggested = participants.find((person) => person.id === face.participant_id);
  const rejected = face.status === "rejected";
  const confirmed = face.status === "confirmed";

  return (
    <li className="rounded-card bg-paper p-3 ring-1 ring-edge">
      <div className="flex items-center gap-2">
        <span className="rounded bg-ink px-1.5 font-bold text-paper">{index + 1}</span>
        {confirmed && <Tag tone="positive">Confirmed</Tag>}
        {rejected && <Tag tone="quiet">Not shown on the website</Tag>}
      </div>

      <Combobox
        id={`face-${face.id}`}
        label={`Who is in box ${index + 1}?`}
        labelHidden
        className="mt-2"
        options={options}
        value={face.participant_id}
        disabled={busy}
        placeholder="Who is this?"
        clearLabel="No one yet"
        action={{ label: "+ Add a new member", onSelect: onCreateMember }}
        onChange={(value) =>
          // Never only the participant: a reassignment un-confirms the box, and
          // saying so here keeps the request honest about what it means.
          act(() => admin.updateFace(face.id, { participant_id: value, status: "suggested" }))
        }
      />

      {/* Recognition only ever suggests; a human confirms. That is the
          safeguard, not a UI nicety. */}
      {face.match_score !== null && suggested && !confirmed && (
        <p className="mt-2 text-sm text-ink-soft">
          Suggested {suggested.name} — <strong>{Math.round(face.match_score * 100)}% match</strong>.
          Check it yourself.
        </p>
      )}

      <div className="mt-3 flex flex-wrap gap-2">
        <Button
          size="sm"
          disabled={busy || !face.participant_id || confirmed}
          onClick={() => act(() => admin.updateFace(face.id, { status: "confirmed" }))}
        >
          {confirmed ? "Confirmed" : "That's them"}
        </Button>

        {rejected ? (
          <Button
            size="sm"
            variant="secondary"
            disabled={busy}
            onClick={() => act(() => admin.updateFace(face.id, { status: "suggested" }))}
          >
            Undo
          </Button>
        ) : (
          <Button
            size="sm"
            variant="secondary"
            disabled={busy}
            onClick={() => act(() => admin.updateFace(face.id, { status: "rejected" }))}
          >
            Not a member
          </Button>
        )}

        <Button
          size="sm"
          variant="danger"
          disabled={busy}
          onClick={() => {
            if (window.confirm("Delete this detection box? This cannot be undone.")) {
              void act(() => admin.deleteFace(face.id));
            }
          }}
        >
          Delete box
        </Button>
      </div>

      <AdminError message={error} className="mt-2" />
    </li>
  );
}
