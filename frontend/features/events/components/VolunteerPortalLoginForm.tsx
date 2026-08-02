"use client";

import { useId, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, TextField } from "@/components/ui";
import { createClient } from "@/lib/supabase/client";

type Status =
  | { kind: "idle" }
  | { kind: "working" }
  | { kind: "error"; message: string };

export function VolunteerPortalLoginForm({ initialError }: { initialError?: string }) {
  const id = useId();
  const router = useRouter();
  const inFlight = useRef(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<Status>(
    initialError ? { kind: "error", message: initialError } : { kind: "idle" },
  );

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const address = email.trim().toLowerCase();
    if (!address || !password || inFlight.current) return;

    inFlight.current = true;
    setStatus({ kind: "working" });
    try {
      const { error } = await createClient().auth.signInWithPassword({
        email: address,
        password,
      });
      if (error) {
        setStatus({
          kind: "error",
          message:
            error.status === 400
              ? "That email and password do not match a volunteer account."
              : error.message,
        });
        return;
      }
      router.push("/volunteer");
      router.refresh();
    } catch {
      setStatus({
        kind: "error",
        message: "Could not reach the sign-in service. Check your connection and try again.",
      });
    } finally {
      inFlight.current = false;
    }
  }

  const working = status.kind === "working";

  return (
    <Card padding="lg">
      <form onSubmit={handleSubmit}>
        <TextField
          id={`${id}-email`}
          label="Application email"
          type="email"
          autoComplete="email"
          required
          value={email}
          disabled={working}
          onChange={(event) => setEmail(event.target.value)}
          error={status.kind === "error" ? status.message : null}
        />
        <TextField
          id={`${id}-password`}
          label="Password"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          disabled={working}
          fieldClassName="mt-4"
          onChange={(event) => setPassword(event.target.value)}
        />
        <Button type="submit" block className="mt-5" disabled={working}>
          {working ? "Signing in…" : "Sign in"}
        </Button>
      </form>
      <div className="mt-6 border-t border-edge pt-5 text-center">
        <p className="text-sm text-ink-soft">No volunteer account yet?</p>
        <Button href="/events" variant="quiet" size="sm" className="mt-2">
          Create one with an application
        </Button>
      </div>
    </Card>
  );
}
