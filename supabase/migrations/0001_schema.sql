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
    -- The row (or its parent location) is on its way out, and the audit_logs
    -- foreign key would have nothing left to point at. Record the name in
    -- old_value and leave location_id null so history survives the delete.
    label := coalesce(to_jsonb(old) ->> 'title', to_jsonb(old) ->> 'name', to_jsonb(old) ->> 'type', '');
    insert into public.audit_logs (user_id, location_id, entity, record_id, action, field_changed, old_value, new_value)
    values (auth.uid(), null, TG_TABLE_NAME, old.id, 'delete', null, label, null);
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
