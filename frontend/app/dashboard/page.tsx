import { redirect } from 'next/navigation'

import { createClient } from '@/lib/supabase/server'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://127.0.0.1:8000'

type Me = {
  id: string
  email: string | null
  role: string
  profile: { id: string; email: string | null; created_at: string | null } | null
}

/** Calls the FastAPI backend as the signed-in user. */
async function fetchMe(accessToken: string): Promise<{ me?: Me; error?: string }> {
  try {
    const response = await fetch(`${API_URL}/api/me`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: 'no-store',
    })
    if (!response.ok) {
      return { error: `${response.status} ${response.statusText} — ${await response.text()}` }
    }
    return { me: await response.json() }
  } catch (cause) {
    return { error: `Could not reach the API at ${API_URL}. Is uvicorn running? (${cause})` }
  }
}

async function signOut() {
  'use server'
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/login')
}

export default async function DashboardPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const {
    data: { session },
  } = await supabase.auth.getSession()
  if (!session) redirect('/login')

  const { me, error } = await fetchMe(session.access_token)

  return (
    <main className="card">
      <h1>Signed in</h1>
      <p className="muted">
        Session established by Supabase Auth. The block below came from FastAPI, which verified
        this token against your project&apos;s JWKS.
      </p>

      <h2>Supabase session</h2>
      <dl>
        <dt>User ID</dt>
        <dd>{user.id}</dd>
        <dt>Email</dt>
        <dd>{user.email}</dd>
      </dl>

      <h2>GET {API_URL}/api/me</h2>
      {error ? <p className="error">{error}</p> : <pre>{JSON.stringify(me, null, 2)}</pre>}

      <form action={signOut}>
        <button className="button" type="submit">
          Sign out
        </button>
      </form>
    </main>
  )
}
