"use client";

import { useId } from "react";
import { Button, Card, TextField } from "@/components/ui";
import { admin } from "@/lib/admin";
import { useAsyncAction } from "../useAsyncAction";
import { AdminError } from "./AdminError";

/** Add a group photo. Detection runs on upload and comes back with boxes. */
export function UploadForm({ onUploaded }: { onUploaded: () => Promise<void> }) {
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
