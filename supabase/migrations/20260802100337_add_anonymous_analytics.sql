-- Anonymous traffic analytics: what people read, for how long, and which
-- calls to action they press.
--
-- Nothing here identifies a visitor. `session_id` is a random uuid the browser
-- keeps in sessionStorage, so it dies when the tab closes; no IP address, no
-- user id, no cookie, no fingerprint. That is a deliberate limit, not an
-- oversight -- this is a charity whose visitors are families of people with
-- Down syndrome, and Hong Kong's PDPO treats anything that identifies one of
-- them as personal data with obligations attached. Aggregate counts answer
-- "which page do people read" without ever holding a person.
--
-- Two tables and a function: raw events for 90 days, a daily rollup kept
-- forever, and an idempotent function that folds one into the other.

create table public.analytics_events (
  id          bigint generated always as identity primary key,
  session_id  uuid not null,
  -- 'page_view', 'page_leave', or a curated interaction name. The allowlist
  -- lives in the API (app/features/analytics/events.py) rather than in a check
  -- constraint here: adding an event should be a code change and a test, not a
  -- migration against a live database.
  name        text not null check (char_length(name) between 1 and 80),
  path        text not null check (char_length(path) between 1 and 200),
  -- Milliseconds the page was actually visible. Only 'page_leave' carries one;
  -- a tab left open overnight contributes the minutes someone read, not eight
  -- hours of it sitting behind another window.
  visible_ms  integer check (visible_ms >= 0 and visible_ms <= 86400000),
  device      text check (device in ('mobile', 'tablet', 'desktop')),
  language    text check (char_length(language) <= 12),
  occurred_at timestamptz not null default now()
);

comment on table public.analytics_events is
  'Raw anonymous events, pruned at 90 days. No personal data by construction: '
  'session_id is a per-tab random uuid, and no IP address is stored.';

-- The rollup scans a day at a time; the dashboard never scans this table.
create index analytics_events_occurred_at_idx
  on public.analytics_events (occurred_at desc);
create index analytics_events_name_occurred_at_idx
  on public.analytics_events (name, occurred_at desc);

-- RLS on, and deliberately *no policies at all*.
--
-- Not an omission. The publishable key ships inside the browser bundle, so any
-- table it can reach is a public table; a permissive insert policy for `anon`
-- would let anyone forge or flood rows, and a select policy would hand out the
-- whole traffic log. Ingest and reporting both go through the API with the
-- service role, which bypasses RLS. Deny-all is the correct posture for a
-- table no client should touch directly.
alter table public.analytics_events enable row level security;


-- The rollup. One narrow table rather than three, keyed by dimension.
--
--   dimension  key                sessions / events / visible_ms_*
--   ---------  -----------------  --------------------------------
--   total      ''                 distinct sessions that day
--   path       '/donate'          per page
--   event      'donate_clicked'   per named interaction
--   device     'mobile'           per device class
--
-- `total` has to be its own row because unique visitors cannot be recovered by
-- summing the per-path session counts -- anyone who read two pages would be
-- counted twice.
create table public.analytics_daily (
  day              date not null,
  dimension        text not null check (dimension in ('total', 'path', 'event', 'device')),
  key              text not null default '',
  sessions         integer not null default 0,
  events           integer not null default 0,
  -- Sum and count kept apart so averages stay correct when rows are combined:
  -- an average of averages is not an average.
  visible_ms_total bigint not null default 0,
  visible_ms_count integer not null default 0,
  primary key (day, dimension, key)
);

comment on table public.analytics_daily is
  'Daily aggregates of analytics_events, kept indefinitely. The only table the '
  'dashboard reads, so reporting stays fast as raw events grow and are pruned.';

create index analytics_daily_dimension_day_idx
  on public.analytics_daily (dimension, day desc);

alter table public.analytics_daily enable row level security;


-- Fold one day of raw events into analytics_daily.
--
-- Idempotent by delete-then-insert, so it is safe to re-run: the API calls it
-- for *today* on every dashboard load (today's rows are not rolled up yet), and
-- pg_cron calls it for yesterday overnight. Running it twice produces the same
-- table as running it once.
--
-- plpgsql, with the delete as its own statement, rather than one SQL statement
-- with a data-modifying CTE. Both would be one transaction, but in a single
-- statement the INSERT is checked against a unique index that still contains
-- the rows the CTE's DELETE removed, and the second run dies on a duplicate key.
create or replace function public.analytics_rollup(target_day date)
returns void
language plpgsql
as $$
begin
  delete from public.analytics_daily where day = target_day;

  with day_events as (
    select *
    from public.analytics_events
    where occurred_at >= target_day::timestamptz
      and occurred_at <  (target_day + 1)::timestamptz
  )
  insert into public.analytics_daily
    (day, dimension, key, sessions, events, visible_ms_total, visible_ms_count)

  -- One row: the day itself. `events` counts page views rather than every row,
  -- so a page_leave is not double-counted as traffic.
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

comment on function public.analytics_rollup(date) is
  'Recompute analytics_daily for one day. Idempotent; safe to re-run.';

-- Not callable over /rest/v1/rpc/. Only the service role reaches this, which
-- is what keeps a write-shaped function off the public API surface.
revoke execute on function public.analytics_rollup(date) from anon, authenticated;
