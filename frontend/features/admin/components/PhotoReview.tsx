"use client";

import { Button, Card, Tag } from "@/components/ui";
import { cn } from "@/lib/cn";
import { admin, type AdminFace, type AdminParticipant, type AdminPhoto } from "@/lib/admin";
import { useAsyncAction } from "../useAsyncAction";
import { AdminError } from "./AdminError";
import { FaceRow } from "./FaceRow";

interface PhotoReviewProps {
  photo: AdminPhoto;
  participants: AdminParticipant[];
  onCreateMember: (faceId: string, query: string) => void;
  onChanged: () => Promise<void>;
}

/** Detection boxes drawn over the photo, numbered to match the review list. */
function FaceBox({ face, index }: { face: AdminFace; index: number }) {
  return (
    <span
      className={cn(
        "absolute flex items-start justify-end border-[3px] text-xs font-bold",
        face.status === "confirmed" && "border-positive",
        // Dashed and dimmed, not nearly invisible. A rejected face is still a
        // face someone reviewed, and staff have to be able to find it to change
        // their mind. Never colour alone.
        face.status === "rejected" && "border-dashed border-ink-soft opacity-60",
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

export function PhotoReview({
  photo,
  participants,
  onCreateMember,
  onChanged,
}: PhotoReviewProps) {
  const { busy, error, run } = useAsyncAction();
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
              <FaceRow
                key={face.id}
                face={face}
                index={index}
                participants={participants}
                onCreateMember={(query) => onCreateMember(face.id, query)}
                onChanged={onChanged}
              />
            ))}
          </ol>

          <div className="mt-5 flex flex-wrap gap-3">
            <Button
              disabled={busy}
              onClick={() =>
                act(() => admin.updatePhoto(photo.id, { is_published: !photo.is_published }))
              }
            >
              {photo.is_published ? "Take off the website" : "Publish this photo"}
            </Button>
            <Button
              variant="danger"
              disabled={busy}
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
