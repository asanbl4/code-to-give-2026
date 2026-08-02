"use client";

// UI-only for now: there's no newsletter backend/email-service endpoint in
// this repo yet (checked backend/ and supabase/ — nothing named "newsletter"
// anywhere), so submitting here just shows a success state locally. Wire
// `handleSubmit` up to a real endpoint before this goes live. id="newsletter"
// is load-bearing — the mascot's "sign me up for the newsletter" FAQ links to
// /#newsletter and scrolls here.
import { useState, type FormEvent } from "react";
import { Button, Section, TextField } from "@/components/ui";

export function NewsletterSignup() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    // TODO: wire to a real newsletter endpoint once one exists.
    setSubmitted(true);
  }

  return (
    <Section
      id="newsletter"
      eyebrow="Stay in the loop"
      title="Get Love 21 news in your inbox"
      description="Occasional updates on events, stories, and ways to help — nothing else."
      card
      className="mx-auto w-full max-w-6xl px-5 pb-14 sm:px-8"
    >
      {submitted ? (
        <p role="status" className="font-bold text-positive">
          You&apos;re on the list! Thanks for signing up.
        </p>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-4 sm:flex-row sm:items-end">
          <TextField
            id="newsletter-email"
            label="Email address"
            type="email"
            name="email"
            required
            placeholder="you@example.com"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            fieldClassName="flex-1"
          />
          <Button type="submit" size="md">
            Sign up
          </Button>
        </form>
      )}
    </Section>
  );
}
