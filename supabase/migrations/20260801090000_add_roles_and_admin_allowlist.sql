-- Roles, so the app can tell staff from supporters, and an email allowlist that
-- decides who becomes what on first sign-in.
--
-- This replaces ADMIN_TOKEN: a single shared secret that granted service-role
-- access to anyone who learned it, with no record of who used it. After this,
-- reaching the admin panel requires a verified identity that Postgres can name.

create type public.app_role as enum ('admin', 'editor', 'supporter');

comment on type public.app_role is
  'admin: full staff access including granting roles. '
  'editor: the staff tool -- participants, photos, face tags. '
  'supporter: a donor or volunteer with their own impact profile.';


-- Roles live in their own table, NOT in a column on public.profiles.
--
-- That is the whole point. `profiles_update_own` lets a user update their own
-- profile row, so a `profiles.role` column would let any signed-in user issue
-- one PATCH and make themselves an admin. Here there is no insert, update or
-- delete policy at all, so only the service role can grant a role.
--
-- Composite primary key rather than one row per user: staff who also donate can
-- hold both 'editor' and 'supporter' without either overwriting the other.
create table public.user_roles (
  user_id    uuid not null references auth.users (id) on delete cascade,
  role       public.app_role not null,
  granted_at timestamptz not null default now(),
  primary key (user_id, role)
);

-- "Who are the admins?" is a question staff tooling asks.
create index user_roles_role_idx on public.user_roles (role);

alter table public.user_roles enable row level security;

-- Read your own roles, nothing else. The helper functions below depend on this
-- policy, and so does the frontend deciding whether to show the admin link.
create policy "user_roles_select_own" on public.user_roles for select
  to authenticated using ((select auth.uid()) = user_id);


-- Who gets which role, keyed by email rather than user id, because the people
-- who should be admins have usually not signed in yet -- Supabase creates the
-- auth.users row on first magic-link click. Seeding by email means the grant is
-- waiting for them when they arrive.
create table public.role_allowlist (
  email      text primary key
               check (email = lower(email) and position('@' in email) > 1
                      and char_length(email) between 3 and 320),
  role       public.app_role not null,
  note       text check (char_length(note) <= 200),
  created_at timestamptz not null default now()
);

-- RLS on, no policies whatsoever. anon and authenticated cannot read a single
-- row: the list of people who can administer this site is not public.
alter table public.role_allowlist enable row level security;


-- Runs alongside handle_new_user on every new auth user.
--
-- SECURITY DEFINER because it writes to tables the brand-new user has no
-- policy for, at a moment when they hold no session. EXECUTE is revoked below;
-- without that revoke it is callable at /rest/v1/rpc/ by anyone holding the
-- publishable key, which ships in the browser bundle.
create or replace function public.assign_role_on_signup()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- Named in the allowlist: take the role it specifies.
  insert into public.user_roles (user_id, role)
  select new.id, a.role
  from public.role_allowlist a
  where a.email = lower(new.email)
  on conflict do nothing;

  -- Everyone else is a supporter. A signed-in stranger gets the donor profile,
  -- never the staff tool -- the default has to be the harmless one.
  insert into public.user_roles (user_id, role)
  select new.id, 'supporter'::public.app_role
  where not exists (
    select 1 from public.role_allowlist a where a.email = lower(new.email)
  )
  on conflict do nothing;

  return new;
end;
$$;

revoke all on function public.assign_role_on_signup() from public, anon, authenticated;

create trigger on_auth_user_created_assign_role
  after insert on auth.users
  for each row execute function public.assign_role_on_signup();


-- Role predicates, for RLS policies and for answering "what am I?".
--
-- Both are SECURITY INVOKER, so they see exactly what the caller sees: the
-- `user_roles_select_own` policy limits them to the caller's own rows. That is
-- why -- unlike every other function in this schema -- EXECUTE stays granted to
-- `authenticated`. An RLS policy cannot call a function the querying role may
-- not execute, and these leak nothing: they answer only about the caller.
create or replace function public.has_role(target public.app_role)
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  select exists (
    select 1 from public.user_roles ur
    where ur.user_id = (select auth.uid()) and ur.role = target
  );
$$;

create or replace function public.is_staff()
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  select exists (
    select 1 from public.user_roles ur
    where ur.user_id = (select auth.uid())
      and ur.role in ('admin', 'editor')
  );
$$;

revoke all on function public.has_role(public.app_role) from public, anon;
revoke all on function public.is_staff() from public, anon;
grant execute on function public.has_role(public.app_role) to authenticated;
grant execute on function public.is_staff() to authenticated;


-- Seed the two project owners.
insert into public.role_allowlist (email, role, note) values
  ('assanalibatyrkhan@gmail.com', 'admin', 'Project owner'),
  ('batyshka123@gmail.com',       'admin', 'Project owner')
on conflict (email) do update set role = excluded.role, note = excluded.note;


-- The trigger only fires for users created from now on, and at least one
-- allowlisted address already has an auth.users row from the earlier auth work.
-- Backfill so the allowlist is true for everyone, not only new arrivals.
insert into public.user_roles (user_id, role)
select u.id, a.role
from auth.users u
join public.role_allowlist a on a.email = lower(u.email)
on conflict do nothing;

insert into public.user_roles (user_id, role)
select u.id, 'supporter'::public.app_role
from auth.users u
where not exists (
  select 1 from public.role_allowlist a where a.email = lower(u.email)
)
on conflict do nothing;
