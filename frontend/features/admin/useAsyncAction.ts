"use client";

import { useCallback, useState } from "react";

/**
 * The busy-flag / try-catch / error-string dance every admin control needs.
 *
 * Five components each wrote their own copy, and two of them forgot the
 * `finally`, so a failed request left the control disabled for good.
 */
export function useAsyncAction() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = useCallback(async (action: () => Promise<unknown>): Promise<boolean> => {
    setBusy(true);
    try {
      await action();
      setError(null);
      return true;
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
      return false;
    } finally {
      setBusy(false);
    }
  }, []);

  return { busy, error, run };
}
