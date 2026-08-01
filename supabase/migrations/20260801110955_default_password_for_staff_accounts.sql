-- Every allowlisted staff account exists up front, with a known default
-- password: 'changeme'.
--
-- Why: `role_allowlist` only says who *may* be staff. The auth.users row still
-- had to be created by the person clicking a magic link, and Supabase's built-in
-- sender allows a couple of emails an hour -- so "add an admin" was really "add
-- an admin, then hope an email arrives". This makes the account real the moment
-- the allowlist row is written, reachable with a password that needs no inbox.
--
-- The cost is explicit: 'changeme' is a published default shared by every staff
-- account. Anyone who knows a staff email address and has read this repository
-- can sign in as them until they change it. That is acceptable for a demo
-- project; before this holds anything private, each account needs its own
-- password (Supabase Studio -> Authentication -> Users, or a reset email).

-- Creates the auth user if they do not exist yet, and sets their password to
-- the default either way.
--
-- SECURITY DEFINER because it writes to the auth schema, which no application
-- role may touch. EXECUTE is revoked below: left callable, /rest/v1/rpc/ would
-- hand anyone holding the publishable key the ability to reset a staff
-- password to a value printed in this file.
--
-- Writing auth.users directly rather than calling the Admin API is deliberate
-- -- there is no API to call from inside Postgres -- so the insert mirrors,
-- column for column, what GoTrue writes for an email/password signup: the
-- 'email' identity row it looks up on sign-in, the empty (not null) token
-- columns it expects to read back as strings, and a confirmed email so the
-- first sign-in is not blocked on verification.
create or replace function public.ensure_staff_account(p_email text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_email    text := lower(trim(p_email));
  v_id       uuid;
  v_password text := 'changeme';
begin
  select id into v_id from auth.users where lower(email) = v_email;

  if v_id is not null then
    update auth.users
       set encrypted_password = extensions.crypt(v_password, extensions.gen_salt('bf')),
           email_confirmed_at = coalesce(email_confirmed_at, now()),
           updated_at         = now()
     where id = v_id;

    return v_id;
  end if;

  v_id := gen_random_uuid();

  insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, created_at, updated_at,
    raw_app_meta_data, raw_user_meta_data,
    confirmation_token, recovery_token, email_change_token_new, email_change
  ) values (
    '00000000-0000-0000-0000-000000000000', v_id, 'authenticated', 'authenticated',
    v_email, extensions.crypt(v_password, extensions.gen_salt('bf')),
    now(), now(), now(),
    '{"provider": "email", "providers": ["email"]}'::jsonb,
    jsonb_build_object('sub', v_id::text, 'email', v_email,
                       'email_verified', true, 'phone_verified', false),
    '', '', '', ''
  );

  -- No identity row means no email/password login: GoTrue resolves the address
  -- through this table, not through auth.users.email alone.
  insert into auth.identities (
    provider, provider_id, user_id, identity_data, created_at, updated_at
  ) values (
    'email', v_id::text, v_id,
    jsonb_build_object('sub', v_id::text, 'email', v_email,
                       'email_verified', true, 'phone_verified', false),
    now(), now()
  );

  return v_id;
end;
$$;

revoke all on function public.ensure_staff_account(text) from public, anon, authenticated;


-- Adding a row to role_allowlist is now the whole of "create a staff member":
-- the account and its password follow from it.
--
-- AFTER INSERT, so the allowlist row is already visible when the auth.users
-- insert fires `assign_role_on_signup` -- that trigger reads role_allowlist to
-- decide between the named role and the 'supporter' default, and would hand a
-- new admin the supporter role if it ran first.
--
-- Insert only, on purpose. On UPDATE this would silently reset the password of
-- anyone who has since chosen their own, every time someone edited a note.
create or replace function public.provision_allowlisted_account()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.ensure_staff_account(new.email);
  return new;
end;
$$;

revoke all on function public.provision_allowlisted_account() from public, anon, authenticated;

create trigger role_allowlist_provision_account
  after insert on public.role_allowlist
  for each row execute function public.provision_allowlisted_account();


-- The trigger only covers allowlist rows written from now on. Bring the two
-- already there in line: one has an account with a password of its own, the
-- other has never signed in and has no auth.users row at all.
select public.ensure_staff_account(email) from public.role_allowlist;
