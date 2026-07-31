import type { Metadata } from 'next'

import './globals.css'

export const metadata: Metadata = {
  title: 'FastAPI + Supabase Auth',
  description: 'Magic-link authentication template',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
