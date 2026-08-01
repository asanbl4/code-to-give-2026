"use client";

import { useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import { Button } from "@/components/ui";
import { createClient } from "@/lib/supabase/client";

export function SignOutButton({
  children = "Sign out",
  variant = "quiet",
}: {
  children?: ReactNode;
  variant?: "primary" | "secondary" | "quiet";
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  return (
    <Button
      variant={variant}
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        await createClient().auth.signOut();
        // refresh() so the Server Components re-run and the layout guard sees
        // the cleared session; push() alone could serve a cached signed-in page.
        router.push("/admin/login");
        router.refresh();
      }}
    >
      {busy ? "Signing out…" : children}
    </Button>
  );
}
