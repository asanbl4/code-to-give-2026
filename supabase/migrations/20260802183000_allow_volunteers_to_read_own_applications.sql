-- A signed-in volunteer may see their own onboarding progress, but never the
-- private staff note or another person's application. Staff continue to use
-- the service-role API and are unaffected by these grants and policies.

create index volunteer_applications_auth_user_updated_idx
  on public.volunteer_applications (auth_user_id, updated_at desc)
  where auth_user_id is not null;

grant select (
  id,
  reference,
  session_id,
  full_name,
  email,
  phone,
  age_group,
  volunteer_role,
  interest,
  status,
  receipt_status,
  terms_acknowledged,
  scrc_status,
  identity_verified,
  guardian_documents_verified,
  trial_status,
  reviewed_at,
  account_invited_at,
  approved_at,
  created_at,
  updated_at
) on public.volunteer_applications to authenticated;

create policy "volunteer_applications_select_own"
  on public.volunteer_applications
  for select
  to authenticated
  using ((select auth.uid()) = auth_user_id);
