import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Where the magic link lands.
 *
 * Supabase's `/auth/v1/verify` redirects here with a one-time `code`. Exchanging
 * it sets the session cookies; the code itself is single-use and never becomes a
 * session on its own, which is what makes it safe to put in an email.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  // Where to go afterwards. Relative paths only: an absolute URL here would be
  // an open redirect, letting a crafted link bounce someone to another site
  // carrying the trust of our domain.
  const nextParam = searchParams.get("next") ?? "/admin/members";
  const next = nextParam.startsWith("/") && !nextParam.startsWith("//") ? nextParam : "/admin/members";
  const loginPath = next.startsWith("/volunteer") ? "/volunteer/login" : "/admin/login";

  // Supabase reports a refused or expired link this way.
  const error = searchParams.get("error_description") ?? searchParams.get("error");
  if (error) {
    return NextResponse.redirect(`${origin}${loginPath}?error=${encodeURIComponent(error)}`);
  }

  if (!code) {
    return NextResponse.redirect(`${origin}${loginPath}?error=${encodeURIComponent("That link is missing its sign-in code.")}`);
  }

  const supabase = await createClient();
  const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

  if (exchangeError) {
    return NextResponse.redirect(
      `${origin}${loginPath}?error=${encodeURIComponent(
        "That sign-in link has expired or was already used. Please request a new one.",
      )}`,
    );
  }

  return NextResponse.redirect(`${origin}${next}`);
}
