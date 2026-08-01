"use client";

import { useSyncExternalStore } from "react";
import { TokenGate } from "@/features/admin/components/TokenGate";
import { Workspace } from "@/features/admin/components/Workspace";
import { readToken, readTokenOnServer, subscribeToToken } from "@/lib/admin";

/**
 * The staff tool.
 *
 * The whole point is that adding a group photo should cost one upload and a few
 * clicks. Detection draws the boxes and the matcher fills in the names; the
 * staff member's job is to agree or correct, which is also the safeguard —
 * nothing published here was decided by a model alone.
 *
 * No PageShell: this is an internal tool, not part of the public site, and it
 * should not offer a "Donate" button to someone doing consent admin.
 */
export default function AdminStoriesPage() {
  const token = useSyncExternalStore(subscribeToToken, readToken, readTokenOnServer);

  return <main className="flex-1">{token ? <Workspace /> : <TokenGate />}</main>;
}
