import { redirect } from "next/navigation";
import { AdminNav } from "@/features/admin/components/AdminNav";
import { SignOutButton } from "@/features/admin/components/SignOutButton";
import { getUser } from "@/lib/supabase/server";
import { isStaff } from "@/lib/roles";

/**
 * The gate on the staff tool, and its chrome.
 *
 * A route group rather than `app/admin/layout.tsx`: `/admin/login` and
 * `/admin/no-access` are siblings of this group, not descendants, so the
 * redirect below cannot reach them. Gating them would bounce a signed-out
 * person from the sign-in form to the sign-in form forever.
 *
 * `proxy.ts` refreshes the session but deliberately does not authorize — the
 * check has to happen where the answer comes from Postgres.
 *
 * This is a usability gate, not the security boundary. The real one is the API:
 * every /api/admin/* route independently verifies the token and re-reads the
 * role from the database, so a forged cookie gets someone a rendered shell and
 * a wall of 403s.
 *
 * No PageShell: this is an internal tool, not part of the public site, and it
 * should not offer a "Donate" button to someone doing consent admin.
 */
export default async function StaffLayout({ children }: { children: React.ReactNode }) {
  const user = await getUser();
  if (!user) redirect("/admin/login");

  if (!(await isStaff())) {
    // Signed in, but not staff. Say so rather than bouncing them back to a
    // sign-in form they have already completed.
    redirect("/admin/no-access");
  }

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-5 py-12 sm:px-8">
      <div className="flex flex-wrap items-baseline justify-between gap-4">
        {/* Not "Stories admin" any more: the tool now also reports site
            traffic, which is not a story about anybody. */}
        <h1 className="font-display text-4xl font-bold text-ink">Love 21 admin</h1>
        <div className="flex items-center gap-3">
          {user.email && <span className="text-sm text-ink-soft">{user.email}</span>}
          <SignOutButton />
        </div>
      </div>

      <AdminNav />

      {children}
    </main>
  );
}
