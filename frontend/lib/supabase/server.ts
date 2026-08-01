import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { cache } from "react";

/**
 * Supabase client for Server Components, Server Actions and Route Handlers.
 *
 * `cookies()` is async in Next 16, so this is too. The session lives in
 * httpOnly cookies written by @supabase/ssr; nothing reads a token from
 * localStorage, so a page can be rendered on the server for a signed-in user.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Server Components cannot set cookies. That is fine: `proxy.ts`
            // refreshes the session on every request, so the write it could not
            // make here has already happened there.
          }
        },
      },
    },
  );
}

/**
 * The signed-in user, or null.
 *
 * Always `getUser()`, never `getSession()`, on the server: `getSession` reads
 * the cookie and trusts it, while `getUser` revalidates the token with Supabase.
 * A cookie is attacker-editable; only the verified answer is safe to gate on.
 *
 * Wrapped in React `cache()` so it runs at most once per request no matter how
 * many components ask. Without it, rendering /admin/stories called the auth API
 * four times over — layout, isStaff(), and the page each asked independently,
 * on top of the proxy. That is a network round trip each, and it is what filled
 * the auth log with `GET /user`.
 */
export const getUser = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
});
