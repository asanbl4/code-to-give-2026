import type { Metadata } from "next";
import { Workspace } from "@/features/admin/components/Workspace";
import { getUser } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Stories admin",
  robots: { index: false, follow: false },
};

/**
 * The staff tool.
 *
 * The whole point is that adding a group photo should cost one upload and a few
 * clicks. Detection draws the boxes and the matcher fills in the names; the
 * staff member's job is to agree or correct, which is also the safeguard —
 * nothing published here was decided by a model alone.
 *
 * Access is gated in `layout.tsx`, which redirects anyone who is not staff, so
 * by the time this renders the caller has a verified session and a staff role.
 * No PageShell: this is an internal tool, not part of the public site, and it
 * should not offer a "Donate" button to someone doing consent admin.
 */
export default async function AdminStoriesPage() {
  const user = await getUser();

  return (
    <main className="flex-1">
      <Workspace signedInAs={user?.email ?? null} />
    </main>
  );
}
