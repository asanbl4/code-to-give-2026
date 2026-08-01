"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import {
  admin,
  AdminError,
  readToken,
  readTokenOnServer,
  subscribeToToken,
  writeToken,
  type AdminParticipant,
  type AdminPhoto,
} from "@/lib/admin";

/**
 * The staff tool.
 *
 * The whole point is that adding a group photo should cost one upload and a few
 * clicks. Detection draws the boxes and the matcher fills in the names; the
 * staff member's job is to agree or correct, which is also the safeguard —
 * nothing published here was decided by a model alone.
 */
export default function AdminStoriesPage() {
  const token = useSyncExternalStore(subscribeToToken, readToken, readTokenOnServer);

  if (!token) return <TokenGate />;
  return <Workspace />;
}

function TokenGate() {
  const [value, setValue] = useState("");

  return (
    <main className="mx-auto w-full max-w-md px-5 py-24">
      <h1 className="font-display text-4xl font-bold">Staff sign in</h1>
      <p className="mt-3 text-ink-soft">
        Enter the admin token from <code className="font-mono">backend/.env</code>. It stays
        in this tab only.
      </p>
      <form
        className="mt-8"
        onSubmit={(event) => {
          event.preventDefault();
          if (!value.trim()) return;
          writeToken(value.trim());
        }}
      >
        <label className="block font-bold" htmlFor="token">
          Admin token
        </label>
        <input
          id="token"
          type="password"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          className="mt-2 w-full rounded-xl border-2 border-edge bg-paper px-4 py-3"
          autoComplete="off"
        />
        <button
          type="submit"
          className="mt-4 w-full rounded-xl bg-signal px-4 py-3 font-bold text-white hover:bg-signal-deep"
        >
          Sign in
        </button>
      </form>
    </main>
  );
}

type WorkspaceData = {
  participants: AdminParticipant[];
  photos: AdminPhoto[];
  modelsAvailable: boolean;
};

async function loadWorkspace(): Promise<WorkspaceData> {
  const [participants, photos, status] = await Promise.all([
    admin.listParticipants(),
    admin.listPhotos(),
    admin.status(),
  ]);
  return { participants, photos, modelsAvailable: status.face_models_available };
}

function Workspace() {
  const [data, setData] = useState<WorkspaceData>({
    participants: [],
    photos: [],
    modelsAvailable: true,
  });
  const [error, setError] = useState<string | null>(null);

  const handleFailure = useCallback((cause: unknown) => {
    // An expired or wrong token should drop us back to the sign-in screen
    // rather than showing an error we cannot act on.
    if (cause instanceof AdminError && cause.status === 401) {
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
    // Guarded so a response arriving after unmount does not set state, and so
    // the state updates happen in a callback rather than in the effect body.
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
    <main className="mx-auto w-full max-w-5xl px-5 py-12 sm:px-8">
      <div className="flex flex-wrap items-baseline justify-between gap-4">
        <h1 className="font-display text-4xl font-bold">Stories admin</h1>
        <button
          type="button"
          onClick={() => writeToken("")}
          className="font-bold text-signal underline"
        >
          Sign out
        </button>
      </div>

      {!modelsAvailable && (
        <p className="mt-6 rounded-xl border-2 border-highlight bg-highlight/15 p-4">
          <strong>Face detection is off.</strong> The model files are missing. Run{" "}
          <code className="font-mono">uv run python scripts/fetch_models.py</code> in{" "}
          <code className="font-mono">backend/</code>. You can still upload photos; they
          just arrive without suggested tags.
        </p>
      )}

      {error && (
        <p className="mt-6 rounded-xl border-2 border-signal bg-surface p-4">{error}</p>
      )}

      <MembersSection participants={participants} onChanged={refresh} />
      <PhotosSection photos={photos} participants={participants} onChanged={refresh} />
    </main>
  );
}

// ---------------------------------------------------------------------------
// Members
// ---------------------------------------------------------------------------

function MembersSection({
  participants,
  onChanged,
}: {
  participants: AdminParticipant[];
  onChanged: () => Promise<void>;
}) {
  const [adding, setAdding] = useState(false);

  return (
    <section className="mt-14">
      <div className="flex items-baseline justify-between gap-4">
        <h2 className="font-display text-2xl font-bold">Members</h2>
        <button
          type="button"
          onClick={() => setAdding((open) => !open)}
          className="font-bold text-signal underline"
        >
          {adding ? "Cancel" : "Add a member"}
        </button>
      </div>

      {adding && (
        <AddMemberForm
          onCreated={async () => {
            setAdding(false);
            await onChanged();
          }}
        />
      )}

      {participants.length === 0 && !adding && (
        <p className="mt-4 text-ink-soft">No members yet. Add the first one.</p>
      )}

      <ul className="mt-6 space-y-4">
        {participants.map((person) => (
          <li key={person.id}>
            <MemberRow person={person} onChanged={onChanged} />
          </li>
        ))}
      </ul>
    </section>
  );
}

function AddMemberForm({ onCreated }: { onCreated: () => Promise<void> }) {
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  return (
    <form
      className="mt-4 grid gap-3 rounded-2xl bg-surface p-5 sm:grid-cols-2"
      onSubmit={async (event) => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        setBusy(true);
        try {
          await admin.createParticipant({
            slug: String(data.get("slug")),
            first_name: String(data.get("first_name")),
            last_name: String(data.get("last_name")) || null,
            headline: String(data.get("headline")) || null,
            progress_summary: String(data.get("progress_summary")) || null,
            story: String(data.get("story")) || null,
          });
          setError(null);
          await onCreated();
        } catch (cause) {
          setError(cause instanceof Error ? cause.message : String(cause));
        } finally {
          setBusy(false);
        }
      }}
    >
      <Field name="first_name" label="First name" required />
      <Field name="last_name" label="Last name" />
      <Field name="slug" label="Web address (lowercase, dashes)" required placeholder="maria-k" />
      <Field name="headline" label="One line for the photo popup" />
      <Field name="progress_summary" label="Their progress" className="sm:col-span-2" />
      <Field name="story" label="Full story" textarea className="sm:col-span-2" />
      {error && <p className="text-signal sm:col-span-2">{error}</p>}
      <button
        type="submit"
        disabled={busy}
        className="rounded-xl bg-signal px-4 py-3 font-bold text-white hover:bg-signal-deep disabled:opacity-50 sm:col-span-2"
      >
        {busy ? "Saving…" : "Add member"}
      </button>
    </form>
  );
}

function MemberRow({
  person,
  onChanged,
}: {
  person: AdminParticipant;
  onChanged: () => Promise<void>;
}) {
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const patch = async (body: Record<string, unknown>) => {
    setBusy(true);
    try {
      await admin.updateParticipant(person.id, body);
      setError(null);
      await onChanged();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setBusy(false);
    }
  };

  return (
    <article className="rounded-2xl bg-surface p-5 ring-1 ring-edge">
      <div className="flex flex-wrap items-center gap-3">
        {person.avatar_url && (
          /* eslint-disable-next-line @next/next/no-img-element -- expiring signed URL */
          <img src={person.avatar_url} alt="" className="h-12 w-12 rounded-full object-cover" />
        )}
        <h3 className="font-display text-xl font-bold">{person.name}</h3>
        {person.is_published ? (
          <Tag tone="live">On the website</Tag>
        ) : (
          <Tag tone="quiet">Not published</Tag>
        )}
        <Tag tone={person.enrolled_faces > 0 ? "live" : "quiet"}>
          {person.enrolled_faces > 0
            ? `${person.enrolled_faces} face${person.enrolled_faces > 1 ? "s" : ""} enrolled`
            : "No face enrolled"}
        </Tag>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <Toggle
          checked={person.consent_given}
          disabled={busy}
          onChange={(checked) => patch({ consent_given: checked })}
          label="Consent to publish their story"
          hint={
            person.consented_at
              ? `Recorded ${new Date(person.consented_at).toLocaleDateString()}`
              : "From their signed media-release form"
          }
        />
        <Toggle
          checked={person.consent_face_recognition}
          disabled={busy}
          onChange={(checked) => patch({ consent_face_recognition: checked })}
          label="Consent to face recognition"
          hint="Turning this off deletes their stored face data"
        />
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <InlineText
          label="Consent form reference"
          value={person.consent_form_reference}
          disabled={busy}
          onSave={(value) => patch({ consent_form_reference: value })}
        />
        <InlineText
          label="Confirmed by (your name)"
          value={person.consent_recorded_by}
          disabled={busy}
          onSave={(value) => patch({ consent_recorded_by: value })}
        />
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button
          type="button"
          disabled={busy || !person.consent_given}
          onClick={() => patch({ is_published: !person.is_published })}
          className="rounded-xl bg-signal px-4 py-2 font-bold text-white hover:bg-signal-deep disabled:opacity-40"
        >
          {person.is_published ? "Take off the website" : "Publish to the website"}
        </button>
        {!person.consent_given && (
          <span className="text-sm text-ink-soft">Record consent before publishing.</span>
        )}
        <EnrollButton person={person} onChanged={onChanged} />
      </div>

      {error && <p className="mt-3 text-signal">{error}</p>}
    </article>
  );
}

function EnrollButton({
  person,
  onChanged,
}: {
  person: AdminParticipant;
  onChanged: () => Promise<void>;
}) {
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  return (
    <span>
      <label
        className={`inline-block rounded-xl border-2 border-signal px-4 py-2 font-bold text-signal ${
          person.consent_face_recognition ? "cursor-pointer hover:bg-surface" : "opacity-40"
        }`}
      >
        {busy ? "Reading photo…" : "Add a photo of them"}
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="sr-only"
          disabled={!person.consent_face_recognition || busy}
          onChange={async (event) => {
            const file = event.target.files?.[0];
            event.target.value = "";
            if (!file) return;
            setBusy(true);
            try {
              await admin.enrollFace(person.id, file);
              setError(null);
              await onChanged();
            } catch (cause) {
              setError(cause instanceof Error ? cause.message : String(cause));
            } finally {
              setBusy(false);
            }
          }}
        />
      </label>
      {error && <span className="ml-2 text-sm text-signal">{error}</span>}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Photos
// ---------------------------------------------------------------------------

function PhotosSection({
  photos,
  participants,
  onChanged,
}: {
  photos: AdminPhoto[];
  participants: AdminParticipant[];
  onChanged: () => Promise<void>;
}) {
  return (
    <section className="mt-16">
      <h2 className="font-display text-2xl font-bold">Group photos</h2>
      <UploadForm onUploaded={onChanged} />
      {photos.length === 0 && (
        <p className="mt-4 text-ink-soft">No photos yet. Upload one above.</p>
      )}
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
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <form
      className="mt-4 grid gap-3 rounded-2xl bg-surface p-5"
      onSubmit={async (event) => {
        event.preventDefault();
        const form = event.currentTarget;
        const data = new FormData(form);
        const file = data.get("file");
        if (!(file instanceof File) || !file.size) {
          setError("Choose a photo first.");
          return;
        }
        setBusy(true);
        try {
          await admin.uploadPhoto(file, String(data.get("alt_text")), String(data.get("caption")));
          setError(null);
          form.reset();
          await onUploaded();
        } catch (cause) {
          setError(cause instanceof Error ? cause.message : String(cause));
        } finally {
          setBusy(false);
        }
      }}
    >
      <label className="font-bold" htmlFor="file">
        Photo
      </label>
      <input
        id="file"
        name="file"
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="rounded-xl border-2 border-edge bg-paper p-3"
      />
      <Field
        name="alt_text"
        label="Describe the photo for people who cannot see it"
        required
        placeholder="Six members of the Thursday cooking group around a table"
      />
      <Field name="caption" label="Caption (optional)" />
      {error && <p className="text-signal">{error}</p>}
      <button
        type="submit"
        disabled={busy}
        className="rounded-xl bg-signal px-4 py-3 font-bold text-white hover:bg-signal-deep disabled:opacity-50"
      >
        {busy ? "Finding faces…" : "Upload and find faces"}
      </button>
    </form>
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
  const [error, setError] = useState<string | null>(null);
  const byId = new Map(participants.map((person) => [person.id, person]));
  const pending = photo.faces.filter((face) => face.status === "suggested").length;

  const act = async (run: () => Promise<unknown>) => {
    try {
      await run();
      setError(null);
      await onChanged();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    }
  };

  return (
    <article className="rounded-2xl bg-surface p-5 ring-1 ring-edge">
      <div className="grid gap-6 lg:grid-cols-2">
        <div
          className="relative overflow-hidden rounded-xl bg-edge"
          style={{ aspectRatio: `${photo.width} / ${photo.height}` }}
        >
          {photo.image_url && (
            /* eslint-disable-next-line @next/next/no-img-element -- expiring signed URL */
            <img src={photo.image_url} alt={photo.alt_text} className="h-full w-full object-cover" />
          )}
          {photo.faces.map((face, index) => (
            <span
              key={face.id}
              className={`absolute flex items-start justify-end border-[3px] text-xs font-bold ${
                face.status === "confirmed"
                  ? "border-signal"
                  : face.status === "rejected"
                    ? "border-ink-soft/40"
                    : "border-highlight"
              }`}
              style={{
                left: `${face.box_x * 100}%`,
                top: `${face.box_y * 100}%`,
                width: `${face.box_w * 100}%`,
                height: `${face.box_h * 100}%`,
              }}
            >
              <span className="bg-ink px-1 text-paper">{index + 1}</span>
            </span>
          ))}
        </div>

        <div>
          <div className="flex flex-wrap items-center gap-2">
            {photo.is_published ? (
              <Tag tone="live">On the website</Tag>
            ) : (
              <Tag tone="quiet">Not published</Tag>
            )}
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
              <li key={face.id} className="rounded-xl bg-paper p-3 ring-1 ring-edge">
                <div className="flex items-center gap-2">
                  <span className="rounded bg-ink px-1.5 text-sm font-bold text-paper">
                    {index + 1}
                  </span>
                  <select
                    value={face.participant_id ?? ""}
                    onChange={(event) =>
                      act(() =>
                        admin.updateFace(face.id, {
                          participant_id: event.target.value || null,
                        }),
                      )
                    }
                    className="min-w-0 flex-1 rounded-lg border-2 border-edge bg-paper px-2 py-1.5"
                  >
                    <option value="">Who is this?</option>
                    {participants.map((person) => (
                      <option key={person.id} value={person.id}>
                        {person.name}
                      </option>
                    ))}
                  </select>
                </div>

                {face.match_score !== null && face.participant_id && (
                  <p className="mt-2 text-sm text-ink-soft">
                    Suggested {byId.get(face.participant_id)?.name ?? "someone"} —{" "}
                    <strong>{Math.round(face.match_score * 100)}% match</strong>. Check it
                    yourself.
                  </p>
                )}

                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={!face.participant_id || face.status === "confirmed"}
                    onClick={() =>
                      act(() => admin.updateFace(face.id, { status: "confirmed" }))
                    }
                    className="rounded-lg bg-signal px-3 py-1.5 font-bold text-white hover:bg-signal-deep disabled:opacity-40"
                  >
                    {face.status === "confirmed" ? "Confirmed" : "That's them"}
                  </button>
                  <button
                    type="button"
                    disabled={face.status === "rejected"}
                    onClick={() => act(() => admin.updateFace(face.id, { status: "rejected" }))}
                    className="rounded-lg border-2 border-edge px-3 py-1.5 font-bold disabled:opacity-40"
                  >
                    {face.status === "rejected" ? "Removed" : "Not a member"}
                  </button>
                </div>
              </li>
            ))}
          </ol>

          <div className="mt-5 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => act(() => admin.updatePhoto(photo.id, { is_published: !photo.is_published }))}
              className="rounded-xl bg-signal px-4 py-2 font-bold text-white hover:bg-signal-deep"
            >
              {photo.is_published ? "Take off the website" : "Publish this photo"}
            </button>
            <button
              type="button"
              onClick={() => {
                if (window.confirm("Delete this photo and its tags? This cannot be undone.")) {
                  void act(() => admin.deletePhoto(photo.id));
                }
              }}
              className="rounded-xl border-2 border-edge px-4 py-2 font-bold"
            >
              Delete
            </button>
          </div>

          {error && <p className="mt-3 text-signal">{error}</p>}
        </div>
      </div>
    </article>
  );
}

// ---------------------------------------------------------------------------
// Small shared pieces
// ---------------------------------------------------------------------------

function Field({
  name,
  label,
  required,
  placeholder,
  textarea,
  className = "",
}: {
  name: string;
  label: string;
  required?: boolean;
  placeholder?: string;
  textarea?: boolean;
  className?: string;
}) {
  const shared = "mt-1 w-full rounded-xl border-2 border-edge bg-paper px-3 py-2";
  return (
    <div className={className}>
      <label className="font-bold" htmlFor={name}>
        {label}
      </label>
      {textarea ? (
        <textarea id={name} name={name} rows={5} placeholder={placeholder} className={shared} />
      ) : (
        <input
          id={name}
          name={name}
          required={required}
          placeholder={placeholder}
          className={shared}
        />
      )}
    </div>
  );
}

function Toggle({
  checked,
  onChange,
  label,
  hint,
  disabled,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  hint: string;
  disabled?: boolean;
}) {
  return (
    <label className="flex gap-3 rounded-xl bg-paper p-3 ring-1 ring-edge">
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
        className="mt-1 h-5 w-5 shrink-0 accent-[#1d5cff]"
      />
      <span>
        <span className="font-bold">{label}</span>
        <span className="block text-sm text-ink-soft">{hint}</span>
      </span>
    </label>
  );
}

function InlineText({
  label,
  value,
  onSave,
  disabled,
}: {
  label: string;
  value: string | null;
  onSave: (value: string) => void;
  disabled?: boolean;
}) {
  // Uncontrolled, keyed on the saved value: typing stays local, and when the
  // server value changes the input remounts with it. That avoids mirroring a
  // prop into state, which is where this kind of field usually goes wrong.
  return (
    <div>
      <label className="text-sm font-bold" htmlFor={`${label}-input`}>
        {label}
      </label>
      <input
        id={`${label}-input`}
        key={value ?? ""}
        defaultValue={value ?? ""}
        disabled={disabled}
        onBlur={(event) => {
          if (event.target.value !== (value ?? "")) onSave(event.target.value);
        }}
        className="mt-1 w-full rounded-xl border-2 border-edge bg-paper px-3 py-2"
      />
    </div>
  );
}

function Tag({ tone, children }: { tone: "live" | "quiet" | "warn"; children: React.ReactNode }) {
  const tones = {
    live: "bg-signal text-white",
    quiet: "bg-edge text-ink",
    warn: "bg-highlight text-ink",
  };
  return (
    <span className={`rounded-full px-3 py-1 text-sm font-bold ${tones[tone]}`}>{children}</span>
  );
}
