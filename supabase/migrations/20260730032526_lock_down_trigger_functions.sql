-- BACKFILLED HISTORY -- applied 2026-07-30, committed 2026-08-01.
-- Reconstructed from the live schema; see the note in
-- 20260730032507_init_profiles_and_notes.sql. Do not re-run.
--
-- Every function in the `public` schema is exposed at /rest/v1/rpc/<name> to
-- anyone holding the publishable key, and that key ships in the browser bundle.
-- `handle_new_user` is SECURITY DEFINER, so left alone it is an anonymous
-- write into public.profiles that bypasses RLS entirely.
--
-- The Supabase security advisor flagged this during the original build. Revoke
-- EXECUTE on every trigger function: a trigger fires as the table owner and
-- does not need the grant.

revoke all on function public.handle_new_user() from public, anon, authenticated;
revoke all on function public.set_updated_at() from public, anon, authenticated;
