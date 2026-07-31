import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

/** Routes reachable without a session. */
const PUBLIC_PATHS = ['/login', '/auth']

/**
 * Refreshes the Supabase session on every request and gates private routes.
 *
 * Without this the access token silently expires and Server Components start
 * seeing a logged-out user.
 */
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Do not put code between createServerClient and getClaims(). Anything that
  // touches cookies in between can log users out at random.
  const { data } = await supabase.auth.getClaims()
  const user = data?.claims

  const isPublic = PUBLIC_PATHS.some((path) => request.nextUrl.pathname.startsWith(path))

  if (!user && !isPublic) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  // Must be returned as-is so the refreshed cookies reach the browser.
  return supabaseResponse
}
