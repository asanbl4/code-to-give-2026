import { NextResponse } from 'next/server'

import { createClient } from '@/lib/supabase/server'

/**
 * Where the magic link lands.
 *
 * Supabase redirects here with `?code=...` after verifying the emailed link.
 * Exchanging that code sets the session cookies.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')

  let next = searchParams.get('next') ?? '/dashboard'
  if (!next.startsWith('/')) {
    // Never redirect off-site based on a query parameter.
    next = '/dashboard'
  }

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      const forwardedHost = request.headers.get('x-forwarded-host')
      const isLocalEnv = process.env.NODE_ENV === 'development'
      if (isLocalEnv) {
        return NextResponse.redirect(`${origin}${next}`)
      }
      if (forwardedHost) {
        return NextResponse.redirect(`https://${forwardedHost}${next}`)
      }
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  return NextResponse.redirect(`${origin}/auth/auth-code-error`)
}
