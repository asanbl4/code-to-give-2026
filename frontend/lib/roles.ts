import { createClient, getUser } from "./supabase/server";

export type AppRole = "admin" | "editor" | "supporter";

const STAFF_ROLES: readonly AppRole[] = ["admin", "editor"];

/**
 * The signed-in user's roles, read from `public.user_roles`.
 *
 * Through the user's own RLS-scoped client, so the `user_roles_select_own`
 * policy is what limits the answer — the same rule the database applies to
 * every other caller. Never read from a token claim: a JWT proves identity,
 * not permission.
 */
export async function getRoles(): Promise<AppRole[]> {
  const user = await getUser();
  if (!user) return [];

  const supabase = await createClient();
  const { data, error } = await supabase.from("user_roles").select("role");
  if (error || !data) return [];

  return data.map((row) => row.role as AppRole);
}

/** Whether the caller may open the staff tool. */
export async function isStaff(): Promise<boolean> {
  const roles = await getRoles();
  return roles.some((role) => STAFF_ROLES.includes(role));
}
