create extension if not exists vector with schema extensions;

-- Consent bookkeeping. Love21 already collects signed paper media-release forms;
-- these columns record a staff member's attestation against one, so the database
-- can say who confirmed consent and when, not merely that someone ticked a box.
alter table public.participants
  add column consent_face_recognition boolean not null default false,
  add column consent_form_reference text check (char_length(consent_form_reference) <= 200),
  add column consent_recorded_by text check (char_length(consent_recorded_by) <= 120),
  -- Storage key for an avatar held in the private bucket. avatar_url stays for
  -- externally hosted images; the API returns whichever is set.
  add column avatar_path text check (char_length(avatar_path) <= 500);


create table public.photos (
  id            uuid primary key default gen_random_uuid(),
  storage_path  text not null unique check (char_length(storage_path) between 1 and 500),

  -- Needed to lay out normalised face boxes before the image loads.
  width         integer not null check (width > 0),
  height        integer not null check (height > 0),

  -- Not nullable on purpose: a screen reader user gets a described photo, or we
  -- do not publish the photo.
  alt_text      text not null check (char_length(alt_text) between 1 and 500),
  caption       text check (char_length(caption) <= 1000),

  taken_on      date,
  sort_order    integer not null default 0,
  is_published  boolean not null default false,

  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index photos_published_idx
  on public.photos (sort_order, created_at desc)
  where is_published;


-- One face box in one photo. participant_id is null while a face is detected but
-- not yet identified -- a first-class state, not an error.
create table public.photo_faces (
  id             uuid primary key default gen_random_uuid(),
  photo_id       uuid not null references public.photos (id) on delete cascade,
  participant_id uuid references public.participants (id) on delete cascade,

  -- Normalised 0..1 so the frontend can scale the image freely.
  box_x  real not null check (box_x >= 0 and box_x <= 1),
  box_y  real not null check (box_y >= 0 and box_y <= 1),
  box_w  real not null check (box_w > 0 and box_w <= 1),
  box_h  real not null check (box_h > 0 and box_h <= 1),

  -- Cosine similarity from the matcher. Null when a human placed the box.
  match_score  real check (match_score >= -1 and match_score <= 1),

  status       text not null default 'suggested'
                 check (status in ('suggested', 'confirmed', 'rejected')),
  confirmed_at timestamptz,
  confirmed_by text check (char_length(confirmed_by) <= 120),

  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),

  -- Nothing reaches the public page without naming someone.
  constraint photo_faces_confirmed_needs_participant
    check (status <> 'confirmed' or participant_id is not null)
);

create index photo_faces_photo_id_idx on public.photo_faces (photo_id);
create index photo_faces_participant_id_idx on public.photo_faces (participant_id);

-- The same person cannot be confirmed twice in one photo.
create unique index photo_faces_one_confirmed_per_person_idx
  on public.photo_faces (photo_id, participant_id)
  where status = 'confirmed';


-- Biometric data. Locked down harder than anything else in this database.
create table public.participant_face_signatures (
  id              uuid primary key default gen_random_uuid(),
  participant_id  uuid not null references public.participants (id) on delete cascade,
  -- SFace emits a 128-dimensional feature vector.
  embedding       extensions.vector(128) not null,
  source_photo_id uuid references public.photos (id) on delete set null,
  created_at      timestamptz not null default now()
);

create index participant_face_signatures_participant_idx
  on public.participant_face_signatures (participant_id);

create index participant_face_signatures_embedding_idx
  on public.participant_face_signatures
  using hnsw (embedding extensions.vector_cosine_ops);


alter table public.photos enable row level security;
alter table public.photo_faces enable row level security;
alter table public.participant_face_signatures enable row level security;

create policy "photos_select_published" on public.photos for select
  to anon, authenticated
  using (is_published);

-- A tag is visible only if it is confirmed, its photo is published, and the
-- person it names is published and consented. Unpublish either end and the tag
-- disappears from the page.
create policy "photo_faces_select_confirmed" on public.photo_faces for select
  to anon, authenticated
  using (
    status = 'confirmed'
    and exists (
      select 1 from public.photos p
      where p.id = photo_id and p.is_published
    )
    and exists (
      select 1 from public.participants pa
      where pa.id = participant_id and pa.is_published and pa.consent_given
    )
  );

-- participant_face_signatures deliberately has NO policies. RLS is enabled and
-- nothing is granted, so anon and authenticated cannot read a single row. Only
-- the service role, which bypasses RLS, ever touches face embeddings.


-- Refuse to store a face signature for someone who has not consented to face
-- recognition specifically. Consent to publish a story is not consent to be
-- biometrically enrolled.
create or replace function public.enforce_face_recognition_consent()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if not exists (
    select 1 from public.participants p
    where p.id = new.participant_id and p.consent_face_recognition
  ) then
    raise exception 'participant % has not consented to face recognition', new.participant_id
      using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

revoke all on function public.enforce_face_recognition_consent() from public, anon, authenticated;

create trigger participant_face_signatures_require_consent
  before insert or update on public.participant_face_signatures
  for each row execute function public.enforce_face_recognition_consent();


-- Withdrawing consent erases the biometric data rather than merely flagging it.
create or replace function public.erase_face_signatures_on_consent_withdrawal()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if old.consent_face_recognition and not new.consent_face_recognition then
    delete from public.participant_face_signatures where participant_id = new.id;
  end if;
  return new;
end;
$$;

revoke all on function public.erase_face_signatures_on_consent_withdrawal()
  from public, anon, authenticated;

create trigger participants_erase_face_signatures
  after update of consent_face_recognition on public.participants
  for each row execute function public.erase_face_signatures_on_consent_withdrawal();


create trigger photos_set_updated_at
  before update on public.photos
  for each row execute function public.set_updated_at();

create trigger photo_faces_set_updated_at
  before update on public.photo_faces
  for each row execute function public.set_updated_at();


-- Private bucket: no storage.objects policies for anon, so every public read
-- goes through a short-lived URL the backend signs with the service role.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('photos', 'photos', false, 15728640,
        array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;
