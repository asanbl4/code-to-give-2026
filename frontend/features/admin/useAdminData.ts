"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AdminError as AdminRequestError } from "@/lib/admin";

/**
 * Load something from the admin API, and reload it after a change.
 *
 * Split out of the old single-page workspace when the tool became two pages.
 * The session-expiry branch is the reason this is shared rather than copied:
 * both pages have to send an expired session back to sign-in, and a page that
 * forgot to would sit there showing an error nobody can act on.
 */
export function useAdminData<T>(load: () => Promise<T>, initial: T) {
  const router = useRouter();
  const [data, setData] = useState<T>(initial);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const handleFailure = useCallback(
    (cause: unknown) => {
      // A session that expired mid-session should send us back to sign in
      // rather than showing an error nobody can act on. refresh() re-runs the
      // layout guard, which owns the redirect.
      if (cause instanceof AdminRequestError && cause.status === 401) {
        router.refresh();
        return;
      }
      setError(cause instanceof Error ? cause.message : String(cause));
    },
    [router],
  );

  const refresh = useCallback(
    () =>
      load().then((next) => {
        setData(next);
        setError(null);
        setLoading(false);
      }, handleFailure),
    [handleFailure, load],
  );

  useEffect(() => {
    // Guarded so a response arriving after unmount does not set state.
    let cancelled = false;
    load().then(
      (next) => {
        if (cancelled) return;
        setData(next);
        setError(null);
        setLoading(false);
      },
      (cause) => {
        if (!cancelled) handleFailure(cause);
      },
    );
    return () => {
      cancelled = true;
    };
  }, [handleFailure, load]);

  return { data, error, loading, refresh };
}
