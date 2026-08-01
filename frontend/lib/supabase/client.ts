"use client";

import { createBrowserClient } from "@supabase/ssr";

/**
 * Supabase client for Client Components.
 *
 * Both values are `NEXT_PUBLIC_` on purpose: the publishable key is designed to
 * ship in a browser bundle, and RLS is what protects the data behind it. Never
 * put the secret key here — see `backend/app/db.py`.
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
  );
}
