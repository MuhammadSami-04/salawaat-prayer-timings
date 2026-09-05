# Salawaat — University Prayer Timings

<p align="center">
  <img src="public/logo.png" alt="Salawaat" width="110">
</p>

<p align="center">
  <a href="https://nextjs.org"><img alt="Next.js" src="https://img.shields.io/badge/Next.js-16-195743?style=flat-square"></a>
  <a href="https://www.typescriptlang.org"><img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-5-195743?style=flat-square"></a>
  <a href="https://tailwindcss.com"><img alt="Tailwind" src="https://img.shields.io/badge/Tailwind-4-195743?style=flat-square"></a>
  <a href="https://supabase.com"><img alt="Supabase" src="https://img.shields.io/badge/Supabase-Postgres%20%2B%20RLS-195743?style=flat-square"></a>
</p>


A prayer-timing board for a university campus. Students open it and see the
next prayer for their mosque or hostel; each location's own Qari Sahab or
hostel representative keeps the times up to date; the Super Admin runs the
whole structure from an admin console.

Built with **Next.js 16** (App Router, Server Actions), **TypeScript**,
**Tailwind CSS 4** and **Supabase** (Postgres, Auth, Row Level Security).

## Nothing is hard-coded

Locations are rows in one generic `locations` table, not files or constants.
From **Admin → Locations** the Super Admin can:

- add **Hostel 18** — it appears in every list immediately;
- rename **Hostel 7 → New Boys Hostel** — the new name appears everywhere;
- add **Central Mosque** — no code change;
- deactivate a mosque — it disappears from the public board while its history
  is kept.

The same holds for authorities: a mosque may have four Qari Sahabs or forty,
and one person may manage several locations. There is no ceiling in the schema
or the interface.

## Getting started

```bash
npm install
cp .env.example .env.local     # then fill in your Supabase keys
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Signing in

Accounts use a **username**, not an email address. Supabase Auth needs an
address, so each username maps deterministically onto one inside a namespace
the app owns (`Zakaria Authority` → `zakaria.authority@salawaat.app`). Nothing
is ever sent there, and because the mapping needs no lookup, the user list is
never exposed to anonymous visitors.

Usernames are forgiving: `Zakaria Authority`, `zakaria authority` and
`zakaria.authority` all reach the same account.

There is no public sign-up. The Super Admin creates every account, sets its
first password, and assigns its locations. Anyone can then change their own
password under **My Account**.

## Deploying

The app runs on Vercel with three environment variables:

| Variable | Where it is used |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | browser and server |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | browser and server — safe to expose, RLS is the guard |
| `SUPABASE_SERVICE_ROLE_KEY` | **server only**, solely to provision accounts |

Run the migrations in `supabase/migrations` against your project first; see
[`supabase/README.md`](supabase/README.md).

Database setup — migrations, the first Super Admin, the security model — is in
**[`supabase/README.md`](supabase/README.md)**.

Until `.env.local` is filled in, the app runs and shows setup instructions
instead of crashing.

## Roles

| Role | Can do |
|---|---|
| **Public** | Browse locations, view timings for any date, Jumma, special prayers, announcements. No login. |
| **Mosque Authority / Qari Sahab** | Edit timings, Jumma, Eid, Taraweeh and announcements **for assigned mosques only**. |
| **Hostel Authority** | The same, for assigned hostels only. |
| **Super Admin** | Everything, plus locations, accounts, assignments and all audit logs. |

## Routes

**Public** — `/` dashboard · `/locations` all locations · `/location/[id]` one location

**Auth** — `/login`

**Authority** — `/dashboard` · `/dashboard/timings` · `/dashboard/special-prayers` · `/dashboard/announcements` · `/dashboard/history`

**Super Admin** — `/admin` · `/admin/locations` · `/admin/authorities` · `/admin/logs`

## What the public board shows

- **Next prayer** with a live countdown (`Asr · 05:00 PM · 01h 24m remaining`),
  recomputed every second and rolling over to tomorrow's Fajr after Isha.
- **Today's timings** with separate Adhan and Jamaat columns, the next prayer
  highlighted.
- **Jumma**, kept separate from Zuhr, with up to three congregations. On a
  Friday the countdown targets Jumma rather than Zuhr.
- **Special prayers** — Eid-ul-Fitr, Eid-ul-Adha, Taraweeh. The section is
  hidden entirely when nothing is configured.
- **Announcements** scoped to that location.
- **Last updated**, with the name of the person who set the times.
- **Date navigation** — previous/next day or a date picker. If a day has no
  board yet, the most recent one is shown with a note saying so.

## Project layout

```
src/
  app/
    page.tsx                    public dashboard
    locations/                  all locations
    location/[id]/              one location's timings
    login/
    dashboard/                  authority area (timings, special prayers,
                                announcements, history)
    admin/                      super admin (locations, authorities, logs)
    actions/                    server actions — every write goes through here
  components/
    ui/                         Button, Card, Field, Modal, Badge, Alert…
    public/                     board, countdown, picker, date nav
    dashboard/                  editors, managers, audit list
  lib/
    supabase/                   browser, server and admin clients
    prayer.ts                   prayer definitions, next-prayer, formatting
    date.ts                     timezone-safe calendar helpers
    auth.ts                     session, guards, permission assertions
    queries.ts                  server-side reads
supabase/
  migrations/                   0001 schema · 0002 RLS · 0003 seed
  bootstrap_super_admin.sql     one-time first-admin promotion
```

## Security

Permission checks live in Postgres, so the database rejects an unauthorised
write regardless of what the client sends. Server actions check permission too,
but only to produce a readable error before the round trip.

Audit logging is done by database triggers rather than application code, so it
cannot be bypassed, and `audit_logs` has no update or delete policy — history
is append-only for everyone.

The service-role key is never exposed to the browser: it is read only in
`src/lib/supabase/admin.ts`, which imports `server-only` so the build fails if
that module is ever pulled into a client bundle.

Details and the verified permission matrix are in
[`supabase/README.md`](supabase/README.md).

## Theming

The palette is drawn from the Salawat logo — deep green `#174C38`, gold
`#B89048`, on the `#FCF6F0` background. Every colour resolves through CSS
variables defined once at the top of `src/app/globals.css`; changing the theme
means editing that block, not the components.
