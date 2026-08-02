-- Volunteer portal accounts use email + password instead of invitation or
-- magic-link emails. The password goes directly to Supabase Auth and is never
-- stored in public.volunteer_applications.

drop policy if exists "volunteer_applications_public_insert"
  on public.volunteer_applications;

revoke insert (
  id, reference, session_id, full_name, email, phone, age_group,
  volunteer_role, interest, note, process_acknowledged, scrc_status
) on public.volunteer_applications from anon;

grant insert (
  id, reference, session_id, full_name, email, phone, age_group,
  volunteer_role, interest, note, process_acknowledged, scrc_status,
  auth_user_id
) on public.volunteer_applications to authenticated;

create policy "volunteer_applications_insert_own"
  on public.volunteer_applications
  for insert
  to authenticated
  with check (
    (select auth.uid()) = auth_user_id
    and email = lower((select auth.jwt() ->> 'email'))
    and process_acknowledged
    and status = 'submitted'
    and receipt_status = 'queued'
    and terms_acknowledged = false
    and identity_verified = false
    and guardian_documents_verified = false
    and trial_status = 'not_required'
  );

comment on column public.volunteer_applications.auth_user_id is
  'Supabase password-account owner. Set at application submission and protected by RLS.';
