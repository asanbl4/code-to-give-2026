import Link from 'next/link'

export default function AuthCodeErrorPage() {
  return (
    <main className="card">
      <h1>Sign-in link didn&apos;t work</h1>
      <p className="muted">Magic links are single-use and short-lived. This usually means:</p>
      <ul className="muted">
        <li>the link was already used, or has expired</li>
        <li>
          it was opened in a different browser from the one that requested it &mdash; the PKCE
          verifier lives in a cookie on the original browser
        </li>
        <li>an email client prefetched the link and consumed it</li>
      </ul>
      <Link className="button" href="/login">
        Request a new link
      </Link>
    </main>
  )
}
