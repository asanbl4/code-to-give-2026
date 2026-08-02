# Anonymous analytics — design

*2026-08-02. Implemented the same day; this is the design as built.*

Staff can see which pages people read, for how long, and which calls to action
get pressed — without the site holding anything that identifies a visitor.

## The constraint that shaped everything

This is a Hong Kong charity whose visitors are largely families of people with
Down syndrome. Hong Kong's PDPO attaches real obligations to anything that
identifies a person, and the ethical bar here is higher than the legal one: a
family reading about disability services should not be building a profile they
did not ask for.

So the design starts from what is *not* collected:

- No IP address. Never read, never stored, not even transiently for geolocation.
- No user id. Signed-in staff and supporters are as anonymous as anyone else.
- No cookie, no `localStorage`, nothing that survives the tab closing.
- No chatbot message text, no donation amounts. Only that the thing happened.

What remains is a `session_id` — a random uuid in `sessionStorage` — plus a
path, a viewport class, and the interface language. A new tab is a new person as
far as this system is concerned. That limit is why the dashboard says **visits**
rather than "unique visitors": summing daily sessions counts visits, and the
honest number is the one the data supports.

## Data model

Three objects, in `supabase/migrations/20260802100337_add_anonymous_analytics.sql`
and two follow-ups.

**`analytics_events`** — raw, pruned at 90 days. One row per event:
`session_id`, `name`, `path`, `visible_ms`, `device`, `language`, `occurred_at`.

RLS enabled with **no policies at all**. Not an oversight: the publishable key
ships in the browser bundle, so any table it reaches is public. A permissive
insert policy for `anon` would let anyone forge rows; a select policy would hand
out the whole traffic log. Both doors go through the API instead.

**`analytics_daily`** — the rollup, kept for ever, keyed `(day, dimension, key)`
with `dimension` in `total` / `path` / `event` / `device`. `total` must be its
own row because unique sessions per day cannot be recovered by summing the
per-path counts — anyone who read two pages would count twice.

`visible_ms_total` and `visible_ms_count` are stored separately so averages stay
correct when rows combine. An average of averages is not an average.

**`analytics_rollup(day)`** — idempotent (delete-then-insert), `SECURITY
INVOKER`, `search_path` pinned, `EXECUTE` revoked from `PUBLIC`. `pg_cron` runs
it nightly for yesterday and prunes; the dashboard also runs it for today on
every load, because the nightly job has not yet settled the day staff are most
likely asking about.

Days are **Hong Kong days**. `current_date` on Supabase is UTC, which would have
made a "day" run 08:00–08:00 local and split a busy Hong Kong evening across two
of them.

## Collection

`frontend/features/analytics/`, mounted as `<AnalyticsTracker />` inside
`PageShell`. That placement *is* the staff-traffic exclusion: `/admin/*` and the
auth screens deliberately don't use the shell, so there is no path list to
maintain, the same trick the mascot already relies on.

A page view is **two** events. `page_view` on arrival counts the visit even if
the tab is killed; `page_leave` follows with the duration. Recording only on
exit would silently undercount every visit ending in a crash.

Time accumulates **only while the tab is visible**, so a tab left open overnight
contributes the two minutes someone actually read. Flushed on
`visibilitychange` (the reliable moment — `pagehide` never fires on mobile when
the browser is swiped away) and again on `pagehide` via `sendBeacon`.

Interactions are a **closed allowlist**, duplicated in `events.ts` and
`events.py`. Every entry has exactly one `track()` call site; an event with no
caller would sit at zero for ever and read as "nobody does this" rather than
"nobody wired this up".

## API

- `POST /api/analytics/events` — public, unauthenticated, 202. Validates every
  name against the allowlist, caps the batch at 50, bounds every field. Writes
  with the service role.
- `GET /api/admin/analytics/summary?days=` — behind `require_staff`, the same
  gate as Members and Group photos.

`occurred_at` is always the database clock. A client-settable timestamp could be
backdated into a day already rolled up, silently changing a number staff read.

**Known gap:** no rate limit on ingest. The caps bound one request; they do not
stop a determined caller repeating it. Closing that needs shared state the app
does not have — the right place is a reverse-proxy rate limit at deploy.

## Dashboard

`/admin/analytics`, a third tab in `AdminNav`.

Four stat tiles (visits, page views, average time, busiest day) with change
against the preceding window of equal length; two per-day charts; ranked tables
for pages and interactions; a screen-size breakdown.

**Two single-series charts, not one with two lines.** Page views always exceed
visits, often several times over, so a shared axis flattens the visits line into
the baseline. And two series would need two hues — this palette's only
candidates, `signal` (#c81e3d) and `positive` (#1e7a46), measure ΔE 5.4 apart
under deuteranopia against a floor of 6. That is the red/green problem in its
textbook form, confirmed by running the validator rather than by eye. Small
multiples avoid both problems and need no legend.

Charts are inline SVG. Every charting library arrives with a palette of its own,
and this codebase's rule is that colour comes from `globals.css` and nowhere
else.

## Testing

15 backend tests in `tests/test_analytics.py` cover validation, the shape of
what gets written, and the summary arithmetic — including that the average is
volume-weighted and that quiet days appear as zeros rather than gaps.

The frontend has no test runner, so the tracker has typecheck and manual
verification only. Adding Vitest is separate work and was not smuggled in here.

Neither suite exercises RLS; `FakeDb` has no policy engine. For these two tables
the thing to verify against a real project is that there are no policies, which
the security advisor reports.
