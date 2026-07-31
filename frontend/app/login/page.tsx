'use client'

import { useState } from 'react'

import { createClient } from '@/lib/supabase/client'

type Status = 'idle' | 'sending' | 'sent' | 'error'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<Status>('idle')
  const [message, setMessage] = useState('')

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setStatus('sending')

    const supabase = createClient()
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        // Must be on the redirect allow-list in the Supabase dashboard.
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    })

    if (error) {
      setStatus('error')
      setMessage(error.message)
      return
    }

    setStatus('sent')
    setMessage(`Check ${email} for a sign-in link.`)
  }

  if (status === 'sent') {
    return (
      <main className="card">
        <h1>Check your email</h1>
        <p className="muted">{message}</p>
        <p className="muted">
          Open the link in <strong>this browser</strong> &mdash; the sign-in flow stores a verifier
          cookie here.
        </p>
      </main>
    )
  }

  return (
    <main className="card">
      <h1>Sign in</h1>
      <p className="muted">We&apos;ll email you a magic link. No password needed.</p>

      <form onSubmit={handleSubmit}>
        <label htmlFor="email">Email</label>
        <input
          id="email"
          type="email"
          value={email}
          required
          autoComplete="email"
          placeholder="you@example.com"
          onChange={(event) => setEmail(event.target.value)}
        />
        <button className="button" type="submit" disabled={status === 'sending'}>
          {status === 'sending' ? 'Sending…' : 'Send magic link'}
        </button>
      </form>

      {status === 'error' && <p className="error">{message}</p>}
    </main>
  )
}
