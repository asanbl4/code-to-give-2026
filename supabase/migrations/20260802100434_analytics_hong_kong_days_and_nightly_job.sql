-- Two corrections to analytics_rollup, plus the nightly job.
--
-- 1. `set search_path = ''`. Without it the security advisor flags the function
--    as having a role-mutable search_path: a caller could point `public` at
--    their own schema and have the function write somewhere else. Every name
--    inside is already schema-qualified, so pinning it changes nothing else.
--
-- 2. Day boundaries in Hong Kong time, not UTC. `target_day::timestamptz` reads
--    the session's TimeZone, which on Supabase is UTC -- so "today" on the
--    dashboard would have run 08:00 to 08:00 local, and a busy Hong Kong
--    evening would land half in one day and half in the next. This charity and
--    its visitors are in Hong Kong; the days it reports should be theirs.
create or replace function public.analytics_rollup(target_day date)
returns void
language plpgsql
set search_path = ''
as $$
begin
  delete from public.analytics_daily where day = target_day;

  with day_events as (
    select *
    from public.analytics_events
    where occurred_at >= (target_day::timestamp at time zone 'Asia/Hong_Kong')
      and occurred_at <  ((target_day + 1)::timestamp at time zone 'Asia/Hong_Kong')
  )
  insert into public.analytics_daily
    (day, dimension, key, sessions, events, visible_ms_total, visible_ms_count)

  select target_day, 'total', '',
         count(distinct session_id),
         count(*) filter (where name = 'page_view'),
         coalesce(sum(visible_ms), 0),
         count(visible_ms)
  from day_events
  having count(*) > 0

  union all

  select target_day, 'path', path,
         count(distinct session_id),
         count(*) filter (where name = 'page_view'),
         coalesce(sum(visible_ms), 0),
         count(visible_ms)
  from day_events
  where name in ('page_view', 'page_leave')
  group by path

  union all

  select target_day, 'event', name,
         count(distinct session_id),
         count(*),
         0,
         0
  from day_events
  where name not in ('page_view', 'page_leave')
  group by name

  union all

  select target_day, 'device', device,
         count(distinct session_id),
         count(*) filter (where name = 'page_view'),
         0,
         0
  from day_events
  where device is not null
  group by device;
end;
$$;

revoke execute on function public.analytics_rollup(date) from anon, authenticated;


-- Which Hong Kong day is it now. Used by the nightly job and available to the
-- API, so "today" means the same thing in both places.
create or replace function public.analytics_today()
returns date
language sql
stable
set search_path = ''
as $$
  select (now() at time zone 'Asia/Hong_Kong')::date;
$$;


-- The nightly job: settle yesterday, then drop raw events past 90 days.
--
-- 16:30 UTC is 00:30 the next morning in Hong Kong, so "yesterday in Hong Kong"
-- is a day that has just finished rather than one still in progress. The
-- dashboard does not depend on this job -- it rolls up today on every load, and
-- the function is idempotent -- so a missed run costs nothing but a retry.
create extension if not exists pg_cron;

select cron.schedule(
  'analytics-nightly',
  '30 16 * * *',
  $job$
    select public.analytics_rollup(public.analytics_today() - 1);
    delete from public.analytics_events where occurred_at < now() - interval '90 days';
  $job$
);
