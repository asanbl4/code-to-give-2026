"use client";

import { useId, useState } from "react";
import { Button, TextField } from "@/components/ui";
import { writeToken } from "@/lib/admin";

export function TokenGate() {
  const id = useId();
  const [value, setValue] = useState("");

  return (
    <div className="mx-auto w-full max-w-md px-5 py-24">
      <h1 className="font-display text-4xl font-bold text-ink">Staff sign in</h1>
      <p className="mt-3 text-ink-soft">
        Enter the admin token from <code className="font-mono">backend/.env</code>. It stays in this
        tab only.
      </p>
      <form
        className="mt-8"
        onSubmit={(event) => {
          event.preventDefault();
          if (value.trim()) writeToken(value.trim());
        }}
      >
        <TextField
          id={id}
          label="Admin token"
          type="password"
          autoComplete="off"
          value={value}
          onChange={(event) => setValue(event.target.value)}
        />
        <Button type="submit" block className="mt-4">
          Sign in
        </Button>
      </form>
    </div>
  );
}
