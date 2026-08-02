-- Actually take analytics_rollup off the public RPC surface.
--
-- The previous migration revoked EXECUTE from `anon` and `authenticated`, which
-- did nothing: Postgres grants EXECUTE on every new function to PUBLIC, and
-- both roles inherit from it. `\df+` showed `=X/postgres` -- the PUBLIC grant --
-- still in place, so /rest/v1/rpc/analytics_rollup was callable by anyone
-- holding the publishable key.
--
-- It is SECURITY INVOKER, so an anonymous caller would have run it as `anon`
-- and RLS (enabled, no policies) would have made both its statements affect
-- zero rows. The exposure was therefore harmless in practice. Revoking anyway:
-- a function that deletes and rewrites a table should not be reachable from the
-- browser at all, and the next person to add SECURITY DEFINER to it would turn
-- a harmless mistake into a live one.
--
-- The lesson generalises: `revoke ... from anon, authenticated` is not how you
-- close a function. `revoke ... from public` is.
revoke execute on function public.analytics_rollup(date) from public;
grant execute on function public.analytics_rollup(date) to service_role;
