# Supabase setup

Run these three files **in order** in the Supabase SQL Editor
(Dashboard → SQL Editor → New query → paste → Run).

| # | File | What it creates |
|---|------|-----------------|
| 1 | `migrations/0001_schema.sql` | Tables, enums, helper functions, `updated_at` triggers, automatic audit logging |
| 2 | `migrations/0002_rls.sql` | Row Level Security policies for every table |
| 3 | `migrations/0003_seed.sql` | Demo data: 4 mosques, 17 hostels, 9 days of timings |

Each file is safe to re-run — they use `if not exists`, `drop … if exists`
and `where not exists` throughout.

## 1. Create the project

1. Create a project at [supabase.com](https://supabase.com).
2. Copy `.env.example` to `.env.local` in the project root.
3. Fill in the three values from **Settings → API**.

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

The service-role key is read only by server code (`src/lib/supabase/admin.ts`,
which imports `server-only`). It is used for exactly one thing: creating and
deleting authority logins in Supabase Auth.

## 2. Run the migrations

Paste each file into the SQL Editor and run it, `0001` first.

## 3. Create the first Super Admin

Only a Super Admin can create authority accounts, so the first one is made by
hand:

1. **Authentication → Users → Add user.** Enter an email and password and tick
   **Auto Confirm User**.
2. Open `bootstrap_super_admin.sql`, change the email on the marked line, and
   run it in the SQL Editor.
3. Sign in at `/login`. You will land on `/admin`.

Everything after this — mosques, hostels, Qari Sahabs, hostel representatives —
is created through the UI.

## 4. Start the app

```bash
npm install
npm run dev
```

---

## How the security model works

Authorisation lives in the database, not in the interface. Hiding a button
changes nothing about what a request is allowed to do; the policies in
`0002_rls.sql` are what actually decide.

Two `SECURITY DEFINER` helpers do the work:

- `public.is_super_admin()` — is the caller an active Super Admin?
- `public.can_manage_location(uuid)` — is the caller a Super Admin, **or**
  an active user listed in `location_managers` for that location?

Every write policy on `prayer_timings`, `special_prayers` and `announcements`
is `can_manage_location(location_id)`. So a Qari assigned to Mosque 2 who
sends a hand-crafted request for Hostel 10 is rejected by Postgres itself.

These behaviours are enforced by the policies, and were each verified against
a real PostgreSQL instance:

| Attempt | Result |
|---|---|
| Qari updates his own mosque | allowed |
| Qari updates another mosque or any hostel | 0 rows changed |
| Qari inserts timings for an unassigned location | `violates row-level security policy` |
| Qari creates a location | `violates row-level security policy` |
| Qari promotes himself to `super_admin` | `violates row-level security policy` |
| Qari assigns himself to another location | `violates row-level security policy` |
| Qari edits or deletes an audit log | 0 rows — logs are append-only |
| Qari reads audit logs | only his own locations |
| Super Admin does any of the above | allowed everywhere |
| Anonymous visitor reads active locations and timings | allowed |
| Anonymous visitor writes anything | `permission denied` |
| Anonymous visitor reads `profiles` | 0 rows |

## Audit logging

`audit_logs` is written by database triggers, not by application code, so no
client can skip it. `audit_prayer_timings()` compares every timing column
before and after an update and writes one row per changed field:

```
fajr_jamaat   05:30:00 → 05:15:00   by Qari Ahmed
```

There is no `UPDATE` or `DELETE` policy on `audit_logs`, which makes history
append-only for everyone, Super Admin included.

## Schema at a glance

```
profiles ─────────┐
                  ├──< location_managers >──┐
auth.users ───────┘                         │
                                            │
locations <─────────────────────────────────┤
    │                                       │
    ├──< prayer_timings    (one row per location per date)
    ├──< special_prayers   (eid_fitr | eid_adha | taraweeh)
    ├──< announcements
    └──< audit_logs
```

`location_managers` is a plain many-to-many join, which is what allows a
mosque to have four Qari Sahabs and one person to cover several hostels.
Nothing in the schema caps how many locations or authorities may exist.

## Removing a location

Deletion is soft by default: `softDeleteLocation` sets `deleted_at` and
`active = false`, so prayer history and audit records survive and the
location can be restored from **Admin → Locations**.
