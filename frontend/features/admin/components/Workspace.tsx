"use client";

import { useCallback, useEffect, useState } from "react";
import { Button, Card } from "@/components/ui";
import { admin, AdminError as AdminRequestError, writeToken } from "@/lib/admin";
import type { AdminParticipant, AdminPhoto } from "@/lib/admin";
import { AdminError } from "./AdminError";
import { MembersSection } from "./MembersSection";
import { PhotosSection } from "./PhotosSection";

interface WorkspaceData {
  participants: AdminParticipant[];
  photos: AdminPhoto[];
  modelsAvailable: boolean;
}

async function loadWorkspace(): Promise<WorkspaceData> {
  const [participants, photos, status] = await Promise.all([
    admin.listParticipants(),
    admin.listPhotos(),
    admin.status(),
  ]);
  return { participants, photos, modelsAvailable: status.face_models_available };
}

export function Workspace() {
  const [data, setData] = useState<WorkspaceData>({
    participants: [],
    photos: [],
    modelsAvailable: true,
  });
  const [error, setError] = useState<string | null>(null);

  const handleFailure = useCallback((cause: unknown) => {
    // An expired or wrong token should drop us back to the sign-in screen
    // rather than showing an error we cannot act on.
    if (cause instanceof AdminRequestError && cause.status === 401) {
      writeToken("");
      return;
    }
    setError(cause instanceof Error ? cause.message : String(cause));
  }, []);

  const refresh = useCallback(
    () =>
      loadWorkspace().then((next) => {
        setData(next);
        setError(null);
      }, handleFailure),
    [handleFailure],
  );

  useEffect(() => {
    // Guarded so a response arriving after unmount does not set state.
    let cancelled = false;
    loadWorkspace().then(
      (next) => {
        if (cancelled) return;
        setData(next);
        setError(null);
      },
      (cause) => {
        if (!cancelled) handleFailure(cause);
      },
    );
    return () => {
      cancelled = true;
    };
  }, [handleFailure]);

  const { participants, photos, modelsAvailable } = data;

  return (
    <div className="mx-auto w-full max-w-5xl px-5 py-12 sm:px-8">
      <div className="flex flex-wrap items-baseline justify-between gap-4">
        <h1 className="font-display text-4xl font-bold text-ink">Stories admin</h1>
        <Button variant="quiet" size="sm" onClick={() => writeToken("")}>
          Sign out
        </Button>
      </div>

      {!modelsAvailable && (
        <Card tone="highlight" className="mt-6">
          <strong>Face detection is off.</strong> The model files are missing. Run{" "}
          <code className="font-mono">uv run python scripts/fetch_models.py</code> in{" "}
          <code className="font-mono">backend/</code>. You can still upload photos; they just
          arrive without suggested tags.
        </Card>
      )}

      <AdminError message={error} className="mt-6" />

      <MembersSection participants={participants} onChanged={refresh} />
      <PhotosSection photos={photos} participants={participants} onChanged={refresh} />
    </div>
  );
}
