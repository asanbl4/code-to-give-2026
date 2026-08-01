-- BACKFILLED HISTORY -- applied 2026-07-30, committed 2026-08-01.
-- Reconstructed from the live schema; see the note in
-- 20260730032507_init_profiles_and_notes.sql. Do not re-run.
--
-- `notes` existed to prove RLS end-to-end while the auth template was being
-- built, and was dropped once that was demonstrated, so the template shipped
-- auth and database wiring with no demo domain features. See
-- docs/superpowers/specs/2026-07-30-fastapi-supabase-auth-design.md.

drop table if exists public.notes;
