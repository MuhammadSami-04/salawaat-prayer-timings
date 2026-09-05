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
