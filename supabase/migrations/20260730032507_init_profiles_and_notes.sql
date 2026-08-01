-- BACKFILLED HISTORY -- applied 2026-07-30, committed 2026-08-01.
--
-- This migration ran against the project before anyone was saving migration
-- files to git, so the text below is reconstructed from the live schema rather
-- than copied from the original. It is accurate for everything that still
-- exists. It omits the `notes` demo table, which this migration created and
-- which `20260730032835_drop_notes_demo_table` removed three minutes later --
-- nothing of it survives to reconstruct, and nothing depends on it.
--
-- Do not re-run. `supabase_migrations.schema_migrations` already records
-- version 20260730032507; this file exists so the schema has a history in git,
-- per the rule in AGENTS.md.

-- The standard Supabase auth companion table: one row per auth user, created
-- automatically on sign-up. Holds the profile fields auth.users does not.
create table public.profiles (
  id         uuid primary key references auth.users (id) on delete cascade,
  email      text,
  full_name  text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- Owner-only. `(select auth.uid())` rather than bare `auth.uid()` so the
-- subquery is evaluated once per statement instead of once per row.
create policy "profiles_select_own" on public.profiles for select
  to authenticated using ((select auth.uid()) = id);

create policy "profiles_update_own" on public.profiles for update
  to authenticated using ((select auth.uid()) = id)
              with check ((select auth.uid()) = id);

-- No insert policy: rows arrive only through the trigger below, which runs as
-- SECURITY DEFINER. No delete policy: profiles die with their auth.users row.

create or replace function public.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- SECURITY DEFINER because it writes to public.profiles on behalf of a user who
-- does not exist yet and holds no session. See the next migration for why that
-- makes revoking EXECUTE mandatory.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data ->> 'full_name',
    new.raw_user_meta_data ->> 'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
