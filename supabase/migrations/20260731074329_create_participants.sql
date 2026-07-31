-- Participants: featured member stories shown on the public /stories page.
--
-- Authorization model differs from the owner-scoped tables in this repo. These
-- rows are public editorial content, not user-owned data:
--   * read  -> anon + authenticated, but only published AND consented rows
--   * write -> no policy at all, so only the service role (the staff admin
--              tool, which bypasses RLS) can insert/update/delete
create table public.participants (
  id               uuid primary key default gen_random_uuid(),

  -- Stable public identifier for /stories/<slug> deep links.
  slug             text not null unique
                     check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'
                            and char_length(slug) between 2 and 80),

  first_name       text not null check (char_length(first_name) between 1 and 80),
  last_name        text check (char_length(last_name) between 1 and 80),
  -- Overrides the composed name when someone consents to, say, "Maria K."
  -- rather than their full name.
  display_name     text check (char_length(display_name) between 1 and 160),

  avatar_url       text check (char_length(avatar_url) <= 2048),

  -- The one-liner in the click-on-face popup.
  headline         text check (char_length(headline) <= 200),
  -- Their progress, shown alongside the headline in the popup.
  progress_summary text check (char_length(progress_summary) <= 500),
  -- The full text behind "SHOW MORE".
  story            text check (char_length(story) <= 20000),

  joined_on        date,
  sort_order       integer not null default 0,

  consent_given    boolean not null default false,
  consented_at     timestamptz,
  is_published     boolean not null default false,

  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),

  -- Consent is a promise to a real person, so the database keeps it rather
  -- than trusting every future caller to remember.
  constraint participants_consent_needs_timestamp
    check (not consent_given or consented_at is not null),
  constraint participants_publish_needs_consent
    check (not is_published or consent_given)
);

-- Partial index matching the only query the public read path makes.
create index participants_published_idx
  on public.participants (sort_order, created_at desc)
  where is_published and consent_given;

alter table public.participants enable row level security;

create policy "participants_select_published" on public.participants for select
  to anon, authenticated
  using (is_published and consent_given);

-- security invoker (the default) + a pinned empty search_path: this function is
-- never a privilege-escalation path, unlike a SECURITY DEFINER one.
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

revoke all on function public.set_updated_at() from public, anon, authenticated;

create trigger participants_set_updated_at
  before update on public.participants
  for each row execute function public.set_updated_at();
