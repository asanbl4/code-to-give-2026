import { redirect } from "next/navigation";
import { getUser } from "@/lib/supabase/server";
import { isStaff } from "@/lib/roles";

/**
 * The gate on the staff tool.
 *
 * A layout, not the page, so it also covers anything added under this route
 * later. `proxy.ts` refreshes the session but deliberately does not authorize —
 * the check has to happen where the answer comes from Postgres.
 *
 * This is a usability gate, not the security boundary. The real one is the API:
 * every /api/admin/* route independently verifies the token and re-reads the
 * role from the database, so a forged cookie gets someone a rendered shell and
 * a wall of 403s.
 */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getUser();
  if (!user) redirect("/admin/login");

  if (!(await isStaff())) {
    // Signed in, but not staff. Say so rather than bouncing them back to a
    // sign-in form they have already completed.
    redirect("/admin/no-access");
  }

  return <>{children}</>;
}
