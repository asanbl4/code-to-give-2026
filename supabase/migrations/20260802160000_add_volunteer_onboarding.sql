-- Hackathon MVP for Love 21's in-house volunteer onboarding workflow.
-- Applications are public-write-only: visitors may submit the documented form,
-- but only the service role behind the authenticated staff API can read or edit it.

create table public.volunteer_applications (
  id                            uuid primary key,
  reference                     text not null unique
                                    check (reference ~ '^VOL-[A-F0-9]{8}$'),
  session_id                    text not null
                                    check (session_id in (
                                      'football-friends', 'creative-club', 'family-wellbeing'
                                    )),
  full_name                     text not null check (char_length(full_name) between 2 and 160),
  email                         text not null
                                    check (email = lower(email)
                                      and position('@' in email) > 1
                                      and char_length(email) between 3 and 320),
  phone                         text not null check (char_length(phone) between 5 and 40),
  age_group                     text not null check (age_group in ('14-15', '16-17', '18-plus')),
  volunteer_role                text not null check (volunteer_role in ('assistant', 'coach')),
  interest                      text not null
                                    check (interest in ('sports', 'creative', 'family', 'nutrition', 'general')),
  note                          text not null default '' check (char_length(note) <= 2000),
  process_acknowledged          boolean not null check (process_acknowledged),

  status                        text not null default 'submitted'
                                    check (status in (
                                      'submitted', 'under_review', 'account_pending', 'onboarding',
                                      'assistant_approved', 'coach_assessment', 'trial_pending',
                                      'coach_approved', 'rejected', 'withdrawn'
                                    )),
  receipt_status                text not null default 'queued'
                                    check (receipt_status in ('queued', 'sent', 'failed')),
  terms_acknowledged            boolean not null default false,
  scrc_status                   text not null
                                    check (scrc_status in ('not_required', 'pending', 'verified', 'rejected')),
  identity_verified             boolean not null default false,
  guardian_documents_verified   boolean not null default false,
  trial_status                  text not null default 'not_required'
                                    check (trial_status in ('not_required', 'pending', 'passed', 'not_suitable')),
  staff_notes                   text not null default '' check (char_length(staff_notes) <= 5000),
  auth_user_id                  uuid references auth.users (id) on delete set null,
  reviewed_at                   timestamptz,
  account_invited_at            timestamptz,
  approved_at                   timestamptz,
  created_at                    timestamptz not null default now(),
  updated_at                    timestamptz not null default now(),

  constraint volunteer_applications_14_15_assistant_only
    check (age_group <> '14-15' or volunteer_role = 'assistant'),
  constraint volunteer_applications_14_15_session_limit
    check (age_group <> '14-15' or session_id in ('creative-club', 'family-wellbeing')),
  constraint volunteer_applications_under_18_no_scrc
    check (age_group = '18-plus' or scrc_status = 'not_required')
);

create index volunteer_applications_status_created_idx
  on public.volunteer_applications (status, created_at desc);
create index volunteer_applications_email_idx
  on public.volunteer_applications (email);

alter table public.volunteer_applications enable row level security;

-- Supabase grants broad table privileges through default privileges. Narrow
-- public callers to the intake fields only; workflow fields must take defaults.
revoke all on table public.volunteer_applications from anon, authenticated;
grant insert (
  id, reference, session_id, full_name, email, phone, age_group,
  volunteer_role, interest, note, process_acknowledged, scrc_status
) on public.volunteer_applications to anon, authenticated;

create policy "volunteer_applications_public_insert"
  on public.volunteer_applications for insert
  to anon, authenticated
  with check (
    process_acknowledged
    and status = 'submitted'
    and receipt_status = 'queued'
    and terms_acknowledged = false
    and identity_verified = false
    and guardian_documents_verified = false
    and trial_status = 'not_required'
  );

comment on table public.volunteer_applications is
  'Private volunteer intake and onboarding workflow. No public SELECT policy by design.';
comment on column public.volunteer_applications.auth_user_id is
  'Volunteer identity after staff invites or links a Supabase account; not a staff role.';
