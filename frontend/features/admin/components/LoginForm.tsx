"use client";

import { useId, useState, type FormEvent } from "react";
import { Button, Card, TextField } from "@/components/ui";
import { createClient } from "@/lib/supabase/client";

type Status =
  | { kind: "idle" }
  | { kind: "sending" }
  | { kind: "sent"; email: string }
  | { kind: "error"; message: string };

export function LoginForm({ initialError }: { initialError?: string }) {
  const id = useId();
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<Status>(
    initialError ? { kind: "error", message: initialError } : { kind: "idle" },
  );

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const address = email.trim().toLowerCase();
    if (!address) return;

    setStatus({ kind: "sending" });
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email: address,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
        // Staff accounts are created by being added to role_allowlist, not by
        // anyone who can type an address into this box.
        shouldCreateUser: false,
      },
    });

    if (error) {
      setStatus({
        kind: "error",
        message:
          error.status === 429
            ? "Too many sign-in emails just now. Wait a minute and try again."
            : error.message,
      });
      return;
    }

    setStatus({ kind: "sent", email: address });
  }

  if (status.kind === "sent") {
    return (
      <Card tone="positive" padding="lg">
        <h2 className="font-display text-2xl font-bold text-ink">Check your email</h2>
        <p className="mt-3 text-ink-soft">
          If <span className="font-bold text-ink">{status.email}</span> belongs to a Love 21 staff
          account, a sign-in link is on its way. It expires shortly and works once.
        </p>
        <Button variant="secondary" className="mt-5" onClick={() => setStatus({ kind: "idle" })}>
          Use a different address
        </Button>
      </Card>
    );
  }

  return (
    <Card padding="lg">
      <form onSubmit={handleSubmit}>
        <TextField
          id={id}
          label="Work email"
          type="email"
          autoComplete="email"
          required
          value={email}
          disabled={status.kind === "sending"}
          onChange={(event) => setEmail(event.target.value)}
          help="We email a link that signs you in. There is no password to remember."
          error={status.kind === "error" ? status.message : null}
        />
        <Button type="submit" block className="mt-5" disabled={status.kind === "sending"}>
          {status.kind === "sending" ? "Sending…" : "Email me a sign-in link"}
        </Button>
      </form>
    </Card>
  );
}
