"use client";

import { useId } from "react";
import { Button, Card, Tag, TextField } from "@/components/ui";
import { cn } from "@/lib/cn";
import { admin, type AdminFace, type AdminParticipant, type AdminPhoto } from "@/lib/admin";
import { useAsyncAction } from "../useAsyncAction";
import { AdminError } from "./AdminError";

interface PhotosSectionProps {
  photos: AdminPhoto[];
  participants: AdminParticipant[];
  onChanged: () => Promise<void>;
}

export function PhotosSection({ photos, participants, onChanged }: PhotosSectionProps) {
  return (
    <section className="mt-16" aria-labelledby="admin-photos">
      <h2 id="admin-photos" className="font-display text-2xl font-bold text-ink">
        Group photos
      </h2>

      <UploadForm onUploaded={onChanged} />

      {photos.length === 0 && <p className="mt-4 text-ink-soft">No photos yet. Upload one above.</p>}

      <ul className="mt-8 space-y-10">
        {photos.map((photo) => (
          <li key={photo.id}>
            <PhotoReview photo={photo} participants={participants} onChanged={onChanged} />
          </li>
        ))}
      </ul>
    </section>
  );
}

function UploadForm({ onUploaded }: { onUploaded: () => Promise<void> }) {
  const id = useId();
  const { busy, error, run } = useAsyncAction();

  return (
    <Card
      as="form"
      tone="surface"
      padding="lg"
      className="mt-4 grid gap-3"
      onSubmit={async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const form = event.currentTarget;
        const data = new FormData(form);
        const file = data.get("file");
        if (!(file instanceof File) || !file.size) {
          await run(() => Promise.reject(new Error("Choose a photo first.")));
          return;
        }
        const ok = await run(() =>
          admin.uploadPhoto(file, String(data.get("alt_text")), String(data.get("caption"))),
        );
        if (ok) {
          form.reset();
          await onUploaded();
        }
      }}
    >
      <div>
        <label htmlFor={`${id}-file`} className="block font-bold text-ink">
          Photo
        </label>
        <input
          id={`${id}-file`}
          name="file"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="mt-2 w-full rounded-card border-2 border-edge bg-paper p-3"
        />
      </div>
      <TextField
        id={`${id}-alt`}
        name="alt_text"
        label="Describe the photo for people who cannot see it"
        placeholder="Six members of the Thursday cooking group around a table"
        required
      />
      <TextField id={`${id}-caption`} name="caption" label="Caption (optional)" />
      <AdminError message={error} />
      <Button type="submit" disabled={busy} block>
        {busy ? "Finding faces…" : "Upload and find faces"}
      </Button>
    </Card>
  );
}

/** Detection boxes drawn over the photo, numbered to match the review list. */
function FaceBox({ face, index }: { face: AdminFace; index: number }) {
  return (
    <span
      className={cn(
        "absolute flex items-start justify-end border-[3px] text-xs font-bold",
        face.status === "confirmed" && "border-positive",
        face.status === "rejected" && "border-ink-soft/40",
        face.status === "suggested" && "border-highlight",
      )}
      style={{
        left: `${face.box_x * 100}%`,
        top: `${face.box_y * 100}%`,
        width: `${face.box_w * 100}%`,
        height: `${face.box_h * 100}%`,
      }}
    >
      <span className="bg-ink px-1 text-paper">{index + 1}</span>
    </span>
  );
}

function PhotoReview({
  photo,
  participants,
  onChanged,
}: {
  photo: AdminPhoto;
  participants: AdminParticipant[];
  onChanged: () => Promise<void>;
}) {
  const { error, run } = useAsyncAction();
  const byId = new Map(participants.map((person) => [person.id, person]));
  const pending = photo.faces.filter((face) => face.status === "suggested").length;

  const act = async (action: () => Promise<unknown>) => {
    if (await run(action)) await onChanged();
  };

  return (
    <Card as="article" tone="surface" padding="lg">
      <div className="grid gap-6 lg:grid-cols-2">
        <div
          className="relative overflow-hidden rounded-card bg-edge"
          style={{ aspectRatio: `${photo.width} / ${photo.height}` }}
        >
          {photo.image_url && (
            /* eslint-disable-next-line @next/next/no-img-element -- expiring signed URL */
            <img
              src={photo.image_url}
              alt={photo.alt_text}
              className="h-full w-full object-cover"
            />
          )}
          {photo.faces.map((face, index) => (
            <FaceBox key={face.id} face={face} index={index} />
          ))}
        </div>

        <div>
          <div className="flex flex-wrap items-center gap-2">
            <Tag tone={photo.is_published ? "positive" : "quiet"}>
              {photo.is_published ? "On the website" : "Not published"}
            </Tag>
            {pending > 0 && <Tag tone="warn">{pending} to review</Tag>}
          </div>
          <p className="mt-2 text-sm text-ink-soft">{photo.alt_text}</p>

          {photo.faces.length === 0 && (
            <p className="mt-4 text-ink-soft">
              No faces found in this photo. It can still be published as a photo without tags.
            </p>
          )}

          <ol className="mt-4 space-y-3">
            {photo.faces.map((face, index) => (
              <li key={face.id} className="rounded-card bg-paper p-3 ring-1 ring-edge">
                <div className="flex items-center gap-2">
                  <span className="rounded bg-ink px-1.5 font-bold text-paper">{index + 1}</span>
                  <label className="sr-only" htmlFor={`face-${face.id}`}>
                    Who is in box {index + 1}?
                  </label>
                  <select
                    id={`face-${face.id}`}
                    value={face.participant_id ?? ""}
                    onChange={(event) =>
                      act(() =>
                        admin.updateFace(face.id, { participant_id: event.target.value || null }),
                      )
                    }
                    className="min-w-0 flex-1 rounded-card border-2 border-edge bg-paper px-2 py-1.5"
                  >
                    <option value="">Who is this?</option>
                    {participants.map((person) => (
                      <option key={person.id} value={person.id}>
                        {person.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Recognition only ever suggests; a human confirms. That is the
                    safeguard, not a UI nicety. */}
                {face.match_score !== null && face.participant_id && (
                  <p className="mt-2 text-sm text-ink-soft">
                    Suggested {byId.get(face.participant_id)?.name ?? "someone"} —{" "}
                    <strong>{Math.round(face.match_score * 100)}% match</strong>. Check it yourself.
                  </p>
                )}

                <div className="mt-3 flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    disabled={!face.participant_id || face.status === "confirmed"}
                    onClick={() => act(() => admin.updateFace(face.id, { status: "confirmed" }))}
                  >
                    {face.status === "confirmed" ? "Confirmed" : "That's them"}
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={face.status === "rejected"}
                    onClick={() => act(() => admin.updateFace(face.id, { status: "rejected" }))}
                  >
                    {face.status === "rejected" ? "Removed" : "Not a member"}
                  </Button>
                </div>
              </li>
            ))}
          </ol>

          <div className="mt-5 flex flex-wrap gap-3">
            <Button
              onClick={() =>
                act(() => admin.updatePhoto(photo.id, { is_published: !photo.is_published }))
              }
            >
              {photo.is_published ? "Take off the website" : "Publish this photo"}
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                if (window.confirm("Delete this photo and its tags? This cannot be undone.")) {
                  void act(() => admin.deletePhoto(photo.id));
                }
              }}
            >
              Delete
            </Button>
          </div>

          <AdminError message={error} className="mt-3" />
        </div>
      </div>
    </Card>
  );
}
