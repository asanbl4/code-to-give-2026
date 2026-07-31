---
name: adding-an-rls-table
description: Use when adding any table, column, or database-backed endpoint to this template - covers the migration, RLS policies, advisor check, router, and test in the order that avoids leaking data
---

# Adding an RLS-Backed Table

## The rule this template runs on

**Authorization lives in Postgres, not in Python.** `get_db` hands PostgREST the
caller's JWT, so `auth.uid()` resolves and RLS policies filter every query. A
route that queries through `get_db` needs no `WHERE user_id = ...` clause.

That only holds if you enable RLS and write policies. A table without RLS is
readable by anyone with the publishable key, which is in the browser bundle.
This is the single most common way to leak an entire table.

## Order of operations

Do these in order. Steps 2 and 3 are not optional.

### 1. Write the migration

Add a file to `supabase/migrations/` named `<timestamp>_<description>.sql`.

```sql
create table public.items (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users (id) on delete cascade,
  title      text not null check (char_length(title) between 1 and 200),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Every RLS policy filters on user_id, so it belongs in an index.
create index items_user_id_created_at_idx on public.items (user_id, created_at desc);
```

### 2. Enable RLS and write policies

```sql
alter table public.items enable row level security;

create policy "items_select_own" on public.items for select
  to authenticated using ((select auth.uid()) = user_id);

create policy "items_insert_own" on public.items for insert
  to authenticated with check ((select auth.uid()) = user_id);

create policy "items_update_own" on public.items for update
  to authenticated using ((select auth.uid()) = user_id)
              with check ((select auth.uid()) = user_id);

create policy "items_delete_own" on public.items for delete
  to authenticated using ((select auth.uid()) = user_id);
```

Two details that matter:

- **`(select auth.uid())`, not bare `auth.uid()`.** The subquery form is
  evaluated once per statement instead of once per row. On a large table the
  difference is dramatic.
- **`using` vs `with check`.** `using` filters which existing rows are visible
  to the operation; `with check` validates rows being written. `insert` needs
  only `with check`; `update` needs both, or a user can move a row to another
  owner.

### 3. Apply it, then run the security advisor

```
apply_migration(project_id, name, query)
get_advisors(project_id, type="security")
```

**Always run the advisor after DDL.** It catches missing RLS, and it catches
`SECURITY DEFINER` functions exposed over `/rest/v1/rpc/`. Both have already
happened in this repo.

### 4. Add schema and router

Schemas go in `app/schemas/`, routers in `app/routers/`, and the router must be
registered in `app/main.py`.

```python
@router.get("", response_model=list[Item])
def list_items(user: CurrentUser, db: Db) -> list[dict]:
    with postgrest_errors():
        # No user filter: RLS does it.
        return db.table("items").select("*").order("created_at", desc=True).execute().data
```

Always wrap PostgREST calls in `postgrest_errors()` — without it an RLS denial
surfaces as an unhandled `APIError` and a 500.

For writes, set `user_id` explicitly from the verified token. The `with check`
policy will reject anything else, but being explicit makes the intent legible:

```python
db.table("items").insert({"user_id": user.id, "title": payload.title}).execute()
```

### 5. Return 404, not 403, for rows you cannot see

An update or delete filtered away by RLS returns an empty result rather than an
error. Treat that as 404 — a 403 would confirm the row exists and belongs to
someone else.

```python
if not result.data:
    raise HTTPException(status.HTTP_404_NOT_FOUND, "Item not found")
```

### 6. Test

Tests in `tests/` run offline. Extend `FakeDb` in `conftest.py` if your query
uses builder methods it does not implement yet, and override `get_db` through
`dependency_overrides`. Never point a test at the live project.

Note what these tests do and do not prove: they cover routing, auth, and
serialization. **They do not exercise your RLS policies** — `FakeDb` has no
policy engine. Verify policies against a real project, or with `supabase start`
locally.

## Trigger functions

If you add one, revoke `EXECUTE`:

```sql
revoke all on function public.your_function() from public, anon, authenticated;
```

A `SECURITY DEFINER` function in the `public` schema is callable at
`/rest/v1/rpc/<name>` by anyone holding the publishable key. It runs as its
owner, so it bypasses RLS entirely.

## Checklist

- [ ] Migration file in `supabase/migrations/`
- [ ] `enable row level security`
- [ ] Policies for every operation used, with `(select auth.uid())`
- [ ] `EXECUTE` revoked on any new function
- [ ] `get_advisors` returns no findings
- [ ] Router wrapped in `postgrest_errors()` and registered in `main.py`
- [ ] Empty write results map to 404
- [ ] `uv run pytest` and `uv run ruff check .` pass
