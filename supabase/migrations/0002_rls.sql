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
