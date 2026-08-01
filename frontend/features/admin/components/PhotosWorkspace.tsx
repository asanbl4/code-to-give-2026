"use client";

import { useState } from "react";
import { Card } from "@/components/ui";
import { admin, type AdminParticipant, type AdminPhoto } from "@/lib/admin";
import { useAdminData } from "../useAdminData";
import { AdminError } from "./AdminError";
import { MemberDialog } from "./MemberDialog";
import { PhotoReview } from "./PhotoReview";
import { UploadForm } from "./UploadForm";

interface PhotosData {
  photos: AdminPhoto[];
  participants: AdminParticipant[];
  modelsAvailable: boolean;
}

async function loadPhotos(): Promise<PhotosData> {
  const [photos, participants, status] = await Promise.all([
    admin.listPhotos(),
    admin.listParticipants(),
    admin.status(),
  ]);
  return { photos, participants, modelsAvailable: status.face_models_available };
}

/** Upload group photos and review the faces found in them. */
export function PhotosWorkspace() {
  const { data, error, loading, refresh } = useAdminData<PhotosData>(loadPhotos, {
    photos: [],
    participants: [],
    modelsAvailable: true,
  });
  /**
   * Which face the add-member dialog was opened from, and what was typed.
   * `member` fills in once they exist, so a portrait the detector refuses
   * leaves the dialog editing a real person instead of offering to create a
   * second one.
   */
  const [newMemberFor, setNewMemberFor] = useState<{
    faceId: string;
    query: string;
    member: AdminParticipant | null;
  } | null>(null);

  const { photos, participants, modelsAvailable } = data;

  return (
    <section className="mt-8" aria-labelledby="admin-photos">
      <h2 id="admin-photos" className="sr-only">
        Group photos
      </h2>

      {!modelsAvailable && (
        <Card tone="highlight">
          <strong>Face detection is off.</strong> The model files are missing. Run{" "}
          <code className="font-mono">uv run python scripts/fetch_models.py</code> in{" "}
          <code className="font-mono">backend/</code>. You can still upload photos; they just
          arrive without suggested tags.
        </Card>
      )}

      <AdminError message={error} className="mt-4" />

      <UploadForm onUploaded={refresh} />

      {loading && <p className="mt-4 text-ink-soft">Loading photos…</p>}
      {!loading && photos.length === 0 && (
        <p className="mt-4 text-ink-soft">No photos yet. Upload one above.</p>
      )}

      <ul className="mt-8 space-y-10">
        {photos.map((photo) => (
          <li key={photo.id}>
            <PhotoReview
              photo={photo}
              participants={participants}
              onCreateMember={(faceId, query) => setNewMemberFor({ faceId, query, member: null })}
              onChanged={refresh}
            />
          </li>
        ))}
      </ul>

      {newMemberFor && (
        <MemberDialog
          open
          member={newMemberFor.member}
          initialFirstName={newMemberFor.query}
          onClose={() => setNewMemberFor(null)}
          onSaved={async (saved) => {
            // Tag them where they were spotted. Suggested, not confirmed: the
            // person who just typed the name still has to look at the box.
            await admin.updateFace(newMemberFor.faceId, {
              participant_id: saved.id,
              status: "suggested",
            });
            // The dialog closes itself when it is done. Holding the member here
            // keeps it open and editable if only the photo was rejected.
            setNewMemberFor((current) => (current ? { ...current, member: saved } : null));
            await refresh();
          }}
        />
      )}
    </section>
  );
}
