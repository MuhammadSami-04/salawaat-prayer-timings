-- =====================================================================
-- 0004_fix_delete_audit.sql
-- =====================================================================
-- Fixes a foreign-key failure when a location is hard-deleted.
--
-- The DELETE branch of audit_generic() wrote an audit row whose
-- location_id pointed at the very location being removed. By the time the
-- AFTER DELETE trigger ran, that row was gone, so the insert failed with
--   23503  audit_logs_location_id_fkey
-- and the delete was impossible. The same applied to announcements and
-- special_prayers removed by cascade.
--
-- A delete now records the name in old_value and leaves location_id null,
-- so the history entry survives without a dangling reference.
-- =====================================================================

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
