-- ===================================================================
-- University Prayer Timings — complete setup
-- Paste this whole file into the Supabase SQL Editor and press Run.
-- Safe to re-run. NOTICE messages about 'does not exist, skipping'
-- are expected and harmless.
-- ===================================================================


-- ###################################################################
-- ##  supabase/migrations/0001_schema.sql
-- ###################################################################

-- =====================================================================
-- University Prayer Timings Management System
-- 0001_schema.sql — tables, enums, triggers, audit logging
-- =====================================================================
-- NOTHING in this schema is hard-coded to a fixed number of hostels,
-- mosques or authorities. Locations live in one generic table and the
-- application renders whatever rows exist.
-- =====================================================================

create extension if not exists "pgcrypto";

-- ------------------------- enums -------------------------------------
do $$ begin
  create type public.user_role as enum ('super_admin', 'mosque_authority', 'hostel_authority');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.location_type as enum ('mosque', 'hostel');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.special_prayer_type as enum ('eid_fitr', 'eid_adha', 'taraweeh');
exception when duplicate_object then null; end $$;

-- ------------------------- profiles ----------------------------------
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  full_name   text not null default '',
  email       text not null default '',
  phone       text,
  role        public.user_role not null default 'hostel_authority',
  active      boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ------------------------- locations ---------------------------------
create table if not exists public.locations (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  type         public.location_type not null,
  description  text,
  building     text,
  contact      text,
  active       boolean not null default true,
  sort_order   integer not null default 0,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  deleted_at   timestamptz
);

create index if not exists locations_type_idx on public.locations (type) where deleted_at is null;
create index if not exists locations_active_idx on public.locations (active) where deleted_at is null;

-- --------------------- location_managers ------------------------------
-- Many-to-many: a location may have unlimited authorities, and one
-- authority may be assigned to unlimited locations.
create table if not exists public.location_managers (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  location_id uuid not null references public.locations(id) on delete cascade,
  created_at  timestamptz not null default now(),
  unique (user_id, location_id)
);

create index if not exists location_managers_user_idx on public.location_managers (user_id);
create index if not exists location_managers_location_idx on public.location_managers (location_id);

-- ---------------------- prayer_timings --------------------------------
create table if not exists public.prayer_timings (
  id             uuid primary key default gen_random_uuid(),
  location_id    uuid not null references public.locations(id) on delete cascade,
  date           date not null,
  fajr_adhan     time,
  fajr_jamaat    time,
  zuhr_adhan     time,
  zuhr_jamaat    time,
  asr_adhan      time,
  asr_jamaat     time,
  maghrib_adhan  time,
  maghrib_jamaat time,
  isha_adhan     time,
  isha_jamaat    time,
  jumma_1        time,
  jumma_2        time,
  jumma_3        time,
  notes          text,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  updated_by     uuid references public.profiles(id) on delete set null,
  unique (location_id, date)
);

create index if not exists prayer_timings_lookup_idx on public.prayer_timings (location_id, date desc);

-- ---------------------- special_prayers -------------------------------
create table if not exists public.special_prayers (
  id           uuid primary key default gen_random_uuid(),
  location_id  uuid not null references public.locations(id) on delete cascade,
  type         public.special_prayer_type not null,
  date         date not null,
  end_date     date,                 -- Taraweeh season end
  prayer_time  time,
  rakah        text,                 -- e.g. "20 Rakah"
  announcement text,
  active       boolean not null default true,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  updated_by   uuid references public.profiles(id) on delete set null
);

create index if not exists special_prayers_lookup_idx on public.special_prayers (location_id, date);

-- ----------------------- announcements --------------------------------
create table if not exists public.announcements (
  id          uuid primary key default gen_random_uuid(),
  location_id uuid not null references public.locations(id) on delete cascade,
  title       text not null,
  message     text not null,
  active      boolean not null default true,
  expires_at  timestamptz,
  created_at  timestamptz not null default now(),
  created_by  uuid references public.profiles(id) on delete set null
);

create index if not exists announcements_lookup_idx on public.announcements (location_id, created_at desc);

-- ------------------------- audit_logs ---------------------------------
create table if not exists public.audit_logs (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid references public.profiles(id) on delete set null,
  location_id   uuid references public.locations(id) on delete set null,
  entity        text not null,          -- prayer_timings | locations | ...
  record_id     uuid,
  action        text not null,          -- create | update | delete
  field_changed text,
  old_value     text,
  new_value     text,
  created_at    timestamptz not null default now()
);

create index if not exists audit_logs_location_idx on public.audit_logs (location_id, created_at desc);
create index if not exists audit_logs_created_idx on public.audit_logs (created_at desc);

-- =====================================================================
-- Helper functions (SECURITY DEFINER so RLS policies do not recurse)
-- =====================================================================

create or replace function public.is_super_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'super_admin' and active
  );
$$;

create or replace function public.can_manage_location(target_location uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    public.is_super_admin()
    or exists (
      select 1
      from public.location_managers lm
      join public.profiles p on p.id = lm.user_id
      where lm.user_id = auth.uid()
        and lm.location_id = target_location
        and p.active
    );
$$;

-- =====================================================================
-- Auto-create a profile row whenever an auth user is created
-- =====================================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    coalesce((new.raw_user_meta_data ->> 'role')::public.user_role, 'hostel_authority')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- =====================================================================
-- updated_at maintenance
-- =====================================================================
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end; $$;

drop trigger if exists locations_touch on public.locations;
create trigger locations_touch before update on public.locations
  for each row execute function public.touch_updated_at();

drop trigger if exists profiles_touch on public.profiles;
create trigger profiles_touch before update on public.profiles
  for each row execute function public.touch_updated_at();

drop trigger if exists prayer_timings_touch on public.prayer_timings;
create trigger prayer_timings_touch before update on public.prayer_timings
  for each row execute function public.touch_updated_at();

drop trigger if exists special_prayers_touch on public.special_prayers;
create trigger special_prayers_touch before update on public.special_prayers
  for each row execute function public.touch_updated_at();

-- =====================================================================
-- Audit logging for prayer timings — enforced in the database so no
-- client can bypass it, recording old -> new per changed field.
-- =====================================================================
create or replace function public.audit_prayer_timings()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  cols text[] := array[
    'fajr_adhan','fajr_jamaat','zuhr_adhan','zuhr_jamaat','asr_adhan','asr_jamaat',
    'maghrib_adhan','maghrib_jamaat','isha_adhan','isha_jamaat',
    'jumma_1','jumma_2','jumma_3','notes'
  ];
  col       text;
  old_json  jsonb;
  new_json  jsonb;
  old_val   text;
  new_val   text;
begin
  if TG_OP = 'INSERT' then
    new_json := to_jsonb(new);
    foreach col in array cols loop
      new_val := new_json ->> col;
      if new_val is not null then
        insert into public.audit_logs (user_id, location_id, entity, record_id, action, field_changed, old_value, new_value)
        values (auth.uid(), new.location_id, 'prayer_timings', new.id, 'create', col, null, new_val);
      end if;
    end loop;
    return new;
  end if;

  old_json := to_jsonb(old);
  new_json := to_jsonb(new);
  foreach col in array cols loop
    old_val := old_json ->> col;
    new_val := new_json ->> col;
    if old_val is distinct from new_val then
      insert into public.audit_logs (user_id, location_id, entity, record_id, action, field_changed, old_value, new_value)
      values (auth.uid(), new.location_id, 'prayer_timings', new.id, 'update', col, old_val, new_val);
    end if;
  end loop;
  return new;
end;
$$;

drop trigger if exists prayer_timings_audit on public.prayer_timings;
create trigger prayer_timings_audit
  after insert or update on public.prayer_timings
  for each row execute function public.audit_prayer_timings();

-- Audit special prayers + announcements + locations at a coarser level
create or replace function public.audit_generic()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  loc uuid;
  label text;
begin
  if TG_OP = 'DELETE' then
    loc := case when TG_TABLE_NAME = 'locations' then old.id else (to_jsonb(old) ->> 'location_id')::uuid end;
    label := coalesce(to_jsonb(old) ->> 'title', to_jsonb(old) ->> 'name', to_jsonb(old) ->> 'type', '');
    insert into public.audit_logs (user_id, location_id, entity, record_id, action, field_changed, old_value, new_value)
    values (auth.uid(), loc, TG_TABLE_NAME, old.id, 'delete', null, label, null);
    return old;
  end if;

  loc := case when TG_TABLE_NAME = 'locations' then new.id else (to_jsonb(new) ->> 'location_id')::uuid end;
  label := coalesce(to_jsonb(new) ->> 'title', to_jsonb(new) ->> 'name', to_jsonb(new) ->> 'type', '');

  insert into public.audit_logs (user_id, location_id, entity, record_id, action, field_changed, old_value, new_value)
  values (
    auth.uid(), loc, TG_TABLE_NAME, new.id,
    case when TG_OP = 'INSERT' then 'create' else 'update' end,
    null,
    case when TG_OP = 'UPDATE' then coalesce(to_jsonb(old) ->> 'title', to_jsonb(old) ->> 'name', to_jsonb(old) ->> 'type', '') else null end,
    label
  );
  return new;
end;
$$;

drop trigger if exists locations_audit on public.locations;
create trigger locations_audit after insert or update or delete on public.locations
  for each row execute function public.audit_generic();

drop trigger if exists special_prayers_audit on public.special_prayers;
create trigger special_prayers_audit after insert or update or delete on public.special_prayers
  for each row execute function public.audit_generic();

drop trigger if exists announcements_audit on public.announcements;
create trigger announcements_audit after insert or update or delete on public.announcements
  for each row execute function public.audit_generic();

-- ###################################################################
-- ##  supabase/migrations/0002_rls.sql
-- ###################################################################

-- =====================================================================
-- 0002_rls.sql — Row Level Security
-- =====================================================================
-- The database, not the UI, is the security boundary. A Qari assigned to
-- Mosque 2 is rejected by Postgres itself if they attempt to write to
-- Mosque 1 or Hostel 10, no matter what request the client sends.
-- =====================================================================

alter table public.profiles          enable row level security;
alter table public.locations         enable row level security;
alter table public.location_managers enable row level security;
alter table public.prayer_timings    enable row level security;
alter table public.special_prayers   enable row level security;
alter table public.announcements     enable row level security;
alter table public.audit_logs        enable row level security;

-- --------------------------- profiles --------------------------------
drop policy if exists profiles_select_self on public.profiles;
create policy profiles_select_self on public.profiles
  for select to authenticated
  using (id = auth.uid() or public.is_super_admin());

drop policy if exists profiles_update_self on public.profiles;
create policy profiles_update_self on public.profiles
  for update to authenticated
  using (id = auth.uid() or public.is_super_admin())
  with check (
    -- an authority may edit their own name/phone but never their own role
    public.is_super_admin()
    or (id = auth.uid() and role = (select role from public.profiles where id = auth.uid()))
  );

drop policy if exists profiles_admin_insert on public.profiles;
create policy profiles_admin_insert on public.profiles
  for insert to authenticated
  with check (public.is_super_admin());

drop policy if exists profiles_admin_delete on public.profiles;
create policy profiles_admin_delete on public.profiles
  for delete to authenticated
  using (public.is_super_admin());

-- --------------------------- locations -------------------------------
-- Anyone (including logged-out students) may read active locations.
drop policy if exists locations_public_read on public.locations;
create policy locations_public_read on public.locations
  for select to anon, authenticated
  using (deleted_at is null and active);

-- Authorities can also see their own assigned locations while deactivated.
drop policy if exists locations_manager_read on public.locations;
create policy locations_manager_read on public.locations
  for select to authenticated
  using (public.can_manage_location(id));

-- Only the Super Admin creates / edits / removes locations.
drop policy if exists locations_admin_insert on public.locations;
create policy locations_admin_insert on public.locations
  for insert to authenticated with check (public.is_super_admin());

drop policy if exists locations_admin_update on public.locations;
create policy locations_admin_update on public.locations
  for update to authenticated
  using (public.is_super_admin()) with check (public.is_super_admin());

drop policy if exists locations_admin_delete on public.locations;
create policy locations_admin_delete on public.locations
  for delete to authenticated using (public.is_super_admin());

-- ----------------------- location_managers ---------------------------
drop policy if exists location_managers_read on public.location_managers;
create policy location_managers_read on public.location_managers
  for select to authenticated
  using (user_id = auth.uid() or public.is_super_admin());

drop policy if exists location_managers_admin_write on public.location_managers;
create policy location_managers_admin_write on public.location_managers
  for all to authenticated
  using (public.is_super_admin()) with check (public.is_super_admin());

-- ------------------------ prayer_timings -----------------------------
drop policy if exists prayer_timings_public_read on public.prayer_timings;
create policy prayer_timings_public_read on public.prayer_timings
  for select to anon, authenticated
  using (
    exists (
      select 1 from public.locations l
      where l.id = location_id and l.deleted_at is null and l.active
    )
    or public.can_manage_location(location_id)
  );

drop policy if exists prayer_timings_manager_insert on public.prayer_timings;
create policy prayer_timings_manager_insert on public.prayer_timings
  for insert to authenticated
  with check (public.can_manage_location(location_id));

drop policy if exists prayer_timings_manager_update on public.prayer_timings;
create policy prayer_timings_manager_update on public.prayer_timings
  for update to authenticated
  using (public.can_manage_location(location_id))
  with check (public.can_manage_location(location_id));

drop policy if exists prayer_timings_admin_delete on public.prayer_timings;
create policy prayer_timings_admin_delete on public.prayer_timings
  for delete to authenticated using (public.is_super_admin());

-- ------------------------ special_prayers ----------------------------
drop policy if exists special_prayers_public_read on public.special_prayers;
create policy special_prayers_public_read on public.special_prayers
  for select to anon, authenticated
  using (
    (active and exists (
      select 1 from public.locations l
      where l.id = location_id and l.deleted_at is null and l.active
    ))
    or public.can_manage_location(location_id)
  );

drop policy if exists special_prayers_manager_write on public.special_prayers;
create policy special_prayers_manager_write on public.special_prayers
  for all to authenticated
  using (public.can_manage_location(location_id))
  with check (public.can_manage_location(location_id));

-- ------------------------- announcements -----------------------------
drop policy if exists announcements_public_read on public.announcements;
create policy announcements_public_read on public.announcements
  for select to anon, authenticated
  using (
    (active
      and (expires_at is null or expires_at > now())
      and exists (
        select 1 from public.locations l
        where l.id = location_id and l.deleted_at is null and l.active
      ))
    or public.can_manage_location(location_id)
  );

drop policy if exists announcements_manager_write on public.announcements;
create policy announcements_manager_write on public.announcements
  for all to authenticated
  using (public.can_manage_location(location_id))
  with check (public.can_manage_location(location_id));

-- --------------------------- audit_logs ------------------------------
-- Read: Super Admin sees everything; an authority sees only the logs of
-- the locations they are assigned to.
drop policy if exists audit_logs_read on public.audit_logs;
create policy audit_logs_read on public.audit_logs
  for select to authenticated
  using (public.is_super_admin() or public.can_manage_location(location_id));

-- Logs are written by SECURITY DEFINER triggers, and are immutable:
-- no UPDATE or DELETE policy exists, so nobody can rewrite history.
drop policy if exists audit_logs_insert on public.audit_logs;
create policy audit_logs_insert on public.audit_logs
  for insert to authenticated
  with check (public.can_manage_location(location_id) or public.is_super_admin());

-- ###################################################################
-- ##  supabase/migrations/0003_seed.sql
-- ###################################################################

-- =====================================================================
-- 0003_seed.sql — INITIAL DEMO RECORDS ONLY
-- =====================================================================
-- These are ordinary rows, not configuration. The Super Admin can add
-- Hostel 18, rename Hostel 7, or create a fifth mosque from the Admin
-- Dashboard and the whole application follows automatically.
-- Re-running this file is safe; it will not duplicate rows.
-- =====================================================================

-- ---------------- 4 mosques (placeholder names) ----------------------
insert into public.locations (name, type, description, building, sort_order)
select v.name, 'mosque'::public.location_type, v.description, v.building, v.ord
from (values
  ('Main University Mosque', 'The central congregational mosque of the university campus.', 'Academic Block A', 1),
  ('Central Mosque',         'Serves the central residential area and administration block.', 'Central Plaza', 2),
  ('East Campus Mosque',     'Serves the east campus faculties and hostels.', 'East Campus', 3),
  ('West Campus Mosque',     'Serves the west campus faculties and hostels.', 'West Campus', 4)
) as v(name, description, building, ord)
where not exists (select 1 from public.locations l where l.name = v.name);

-- ---------------- 17 hostels (generated, not hard-coded) -------------
insert into public.locations (name, type, description, building, sort_order)
select
  'Hostel ' || n,
  'hostel'::public.location_type,
  'Prayer hall of Hostel ' || n || '.',
  'Residential Block ' || chr(64 + ((n - 1) / 4 + 1)),
  100 + n
from generate_series(1, 17) as n
where not exists (select 1 from public.locations l where l.name = 'Hostel ' || n);

-- ---------------- realistic sample timings ---------------------------
-- One row per active location for yesterday .. +7 days, with a small
-- per-location offset so the demo does not look artificially identical.
insert into public.prayer_timings (
  location_id, date,
  fajr_adhan, fajr_jamaat, zuhr_adhan, zuhr_jamaat, asr_adhan, asr_jamaat,
  maghrib_adhan, maghrib_jamaat, isha_adhan, isha_jamaat,
  jumma_1, jumma_2
)
select
  l.id,
  d::date,
  t.base_fajr + off,                      t.base_fajr + off + interval '30 min',
  t.base_zuhr + off,                      t.base_zuhr + off + interval '15 min',
  t.base_asr  + off,                      t.base_asr  + off + interval '15 min',
  t.base_mag  + off,                      t.base_mag  + off + interval '5 min',
  t.base_isha + off,                      t.base_isha + off + interval '15 min',
  case when extract(dow from d) = 5 then time '13:30' + off else null end,
  case when extract(dow from d) = 5 and l.type = 'mosque' then time '14:30' + off else null end
from public.locations l
cross join generate_series(current_date - 1, current_date + 7, interval '1 day') as d
cross join lateral (
  select
    time '04:45' as base_fajr,
    time '13:15' as base_zuhr,
    time '17:00' as base_asr,
    time '18:30' as base_mag,
    time '20:15' as base_isha
) t
cross join lateral (
  select ((abs(hashtext(l.id::text)) % 4) * 5) * interval '1 min' as off
) o
where l.deleted_at is null
  and not exists (
    select 1 from public.prayer_timings pt
    where pt.location_id = l.id and pt.date = d::date
  );

-- ---------------- a couple of demo announcements ---------------------
insert into public.announcements (location_id, title, message)
select l.id, 'Jumma Timing', 'Jumma prayer will be held at 1:30 PM. Please arrive ten minutes early.'
from public.locations l
where l.name = 'Main University Mosque'
  and not exists (select 1 from public.announcements a where a.location_id = l.id);

insert into public.announcements (location_id, title, message)
select l.id, 'Fajr Jamaat Changed', 'Fajr Jamaat timing has been moved to 5:15 AM from this week.'
from public.locations l
where l.name = 'Hostel 7'
  and not exists (select 1 from public.announcements a where a.location_id = l.id);
