import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Refreshes the Supabase session on every matched request.
 *
 * Named `proxy.ts`, not `middleware.ts`: Next 16 renamed the convention and
 * deprecated the old name.
 *
 * Access tokens are short-lived. Without this, a staff member who leaves the
 * admin tab open comes back to a dead session and an unexplained 401. Here the
 * token is refreshed and the new cookies are written to the response before the
 * page renders.
 *
 * Authorization is NOT done here. This only establishes *who* the caller is;
 * whether they are staff is decided by Postgres, in the layout and again in the
 * API. A proxy check alone would be a client-trust boundary.
 */
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // Do not remove: this call is what performs the refresh. It must run between
  // creating the client and returning the response.
  await supabase.auth.getUser();

  return response;
}

export const config = {
  // Skip static assets and image files — refreshing a session to serve a .svg
  // is wasted work on every request.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
