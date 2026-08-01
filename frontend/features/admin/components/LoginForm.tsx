"use client";

import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, TextField } from "@/components/ui";
import { createClient } from "@/lib/supabase/client";

/**
 * Two ways in, both landing on the same authorization check.
 *
 * **Password** is the default because it sends no email, so it cannot be rate
 * limited — Supabase's built-in sender allows only a couple of messages an
 * hour, which is fine for real use and a liability during a demo.
 *
 * **Magic link** stays for staff who would rather not keep a password.
 *
 * Neither grants anything by itself. Both produce a session, and
 * `public.user_roles` still decides whether that session may open the staff
 * tool — checked in the layout and independently again in the API.
 */
const RESEND_COOLDOWN_SECONDS = 60;

type Mode = "password" | "link";

type Status =
  | { kind: "idle" }
  | { kind: "working" }
  | { kind: "sent"; email: string }
  | { kind: "error"; message: string };

export function LoginForm({ initialError }: { initialError?: string }) {
  const id = useId();
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("password");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<Status>(
    initialError ? { kind: "error", message: initialError } : { kind: "idle" },
  );
  const [cooldown, setCooldown] = useState(0);
  // Guards against a double submit landing before React re-renders the button.
  const inFlight = useRef(false);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((n) => n - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  async function signInWithPassword(address: string) {
    const { error } = await createClient().auth.signInWithPassword({
      email: address,
      password,
    });

    if (error) {
      setStatus({
        kind: "error",
        // Supabase returns one generic message whether the address is unknown
        // or the password is wrong, which is what you want: distinguishing them
        // tells an attacker which staff emails exist.
        message:
          error.status === 400
            ? "That email and password do not match an account. If you have never set a password, use the sign-in link instead."
            : error.message,
      });
      return;
    }

    // refresh() so the Server Components re-run and the layout guard sees the
    // new session; push() alone could serve a cached signed-out page.
    router.push("/admin/stories");
    router.refresh();
  }

  async function sendMagicLink(address: string) {
    const { error } = await createClient().auth.signInWithOtp({
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
            ? "Too many sign-in emails have been sent recently. Use a password instead, or wait a few minutes — the limit resets on its own."
            : error.message,
      });
      // A refused send still consumed an attempt upstream; hold the button.
      setCooldown(RESEND_COOLDOWN_SECONDS);
      return;
    }

    setCooldown(RESEND_COOLDOWN_SECONDS);
    setStatus({ kind: "sent", email: address });
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const address = email.trim().toLowerCase();
    if (!address || inFlight.current) return;
    if (mode === "link" && cooldown > 0) return;

    inFlight.current = true;
    setStatus({ kind: "working" });
    try {
      await (mode === "password" ? signInWithPassword(address) : sendMagicLink(address));
    } finally {
      inFlight.current = false;
    }
  }

  if (status.kind === "sent") {
    return (
      <Card tone="positive" padding="lg">
        <h2 className="font-display text-2xl font-bold text-ink">Check your email</h2>
        <p className="mt-3 text-ink-soft">
          If <span className="font-bold text-ink">{status.email}</span> belongs to a Love 21 staff
          account, a sign-in link is on its way. It expires shortly and works once.
        </p>
        <p className="mt-3 text-sm text-ink-soft">
          Open it in this browser — the link is tied to the device that asked for it.
        </p>
        <Button
          variant="secondary"
          className="mt-5"
          onClick={() => {
            setMode("password");
            setStatus({ kind: "idle" });
          }}
        >
          Use a password instead
        </Button>
      </Card>
    );
  }

  const working = status.kind === "working";
  const linkBlocked = mode === "link" && cooldown > 0;

  return (
    <Card padding="lg">
      <form onSubmit={handleSubmit}>
        <TextField
          id={`${id}-email`}
          label="Work email"
          type="email"
          autoComplete="email"
          required
          value={email}
          disabled={working}
          onChange={(event) => setEmail(event.target.value)}
          error={status.kind === "error" ? status.message : null}
        />

        {mode === "password" && (
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
        )}

        <Button type="submit" block className="mt-5" disabled={working || linkBlocked}>
          {working
            ? mode === "password"
              ? "Signing in…"
              : "Sending…"
            : linkBlocked
              ? `Wait ${cooldown}s`
              : mode === "password"
                ? "Sign in"
                : "Email me a sign-in link"}
        </Button>
      </form>

      <div className="mt-6 border-t border-edge pt-5 text-center">
        <Button
          variant="quiet"
          size="sm"
          disabled={working}
          onClick={() => {
            setMode(mode === "password" ? "link" : "password");
            setStatus({ kind: "idle" });
          }}
        >
          {mode === "password"
            ? "No password? Email me a sign-in link"
            : "Sign in with a password instead"}
        </Button>
      </div>
    </Card>
  );
}
