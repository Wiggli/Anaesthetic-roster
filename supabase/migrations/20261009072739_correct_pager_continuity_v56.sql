-- Schema 56: correct only the known, not-yet-effective transition seed.
-- Preserve the original Pager queue with Yentl removed. No engine change.
begin;
lock table public.rotation_versions in access exclusive mode;
do $$
declare
  v public.rotation_versions%rowtype;
  before_periods jsonb;
  after_periods jsonb;
  clinical_before jsonb := '{}'::jsonb;
  clinical_after jsonb := '{}'::jsonb;
  snapshot jsonb;
  table_name text;
  expected text[] := array['Andre','Michael G','James','Shaun','Michael D','Andre'];
  i integer;
begin
  if (now() at time zone 'Europe/Malta')::date >= date '2026-10-12' then
    raise exception 'TRANSITION_CORRECTION_NO_LONGER_FUTURE';
  end if;
  if (select version from public.app_schema_version where id=1) is distinct from 55 then
    raise exception 'TRANSITION_CORRECTION_SCHEMA_MISMATCH';
  end if;
  select * into strict v from public.rotation_versions where effective_from=date '2026-10-12';
  if v.base_size<>5 or array[v.first1,v.first2,v.second1,v.second2,v.pager]
       is distinct from array['Shaun','James','Michael G','Michael D','Andre']
     or v.reliever is not null or v.seventh_anchor<>'Andre'
     or v.seventh_cycle is distinct from '["James","Michael G","Andre","Michael D","Shaun","OT Nurse"]'::jsonb
     or v.notes is distinct from 'Five permanent nurses from 12 October 2026; Yentl leaves future rostering. Historical nights preserved.'
     or v.updated_by is distinct from 'System migration · establishment approved'
     or public.calculated_roster_v55(date '2026-10-08')->>'pager'<>'Michael D' then
    raise exception 'TRANSITION_CORRECTION_UNEXPECTED_SEED';
  end if;
  select jsonb_agg(to_jsonb(r) order by effective_from) into before_periods
    from public.rotation_versions r where effective_from<>date '2026-10-12';
  foreach table_name in array array['night_changes','night_change_history','night_overtime','night_overtime_history',
      'night_role_overrides','night_role_override_history','night_plan_status','night_labour_order','night_five_cover','roster_settings'] loop
    execute format('select coalesce(jsonb_agg(to_jsonb(t) order by to_jsonb(t)::text),''[]''::jsonb) from public.%I t',table_name) into snapshot;
    clinical_before:=clinical_before||jsonb_build_object(table_name,snapshot);
  end loop;
  -- Transactional, owner-only exception. Keep audit, sync and RLS enabled.
  alter table public.rotation_versions disable trigger guard_rotation_period_v55;
  update public.rotation_versions set first1='Michael D',first2='Shaun',second1='James',second2='Michael G'
    where id=v.id;
  alter table public.rotation_versions enable trigger guard_rotation_period_v55;
  if (select to_jsonb(r)-array['first1','first2','second1','second2'] from public.rotation_versions r where id=v.id)
       is distinct from (to_jsonb(v)-array['first1','first2','second1','second2']) then
    raise exception 'TRANSITION_CORRECTION_METADATA_CHANGED';
  end if;
  select jsonb_agg(to_jsonb(r) order by effective_from) into after_periods
    from public.rotation_versions r where effective_from<>date '2026-10-12';
  foreach table_name in array array['night_changes','night_change_history','night_overtime','night_overtime_history',
      'night_role_overrides','night_role_override_history','night_plan_status','night_labour_order','night_five_cover','roster_settings'] loop
    execute format('select coalesce(jsonb_agg(to_jsonb(t) order by to_jsonb(t)::text),''[]''::jsonb) from public.%I t',table_name) into snapshot;
    clinical_after:=clinical_after||jsonb_build_object(table_name,snapshot);
  end loop;
  if before_periods is distinct from after_periods or clinical_before is distinct from clinical_after
     or not exists(select 1 from pg_catalog.pg_trigger where tgrelid='public.rotation_versions'::regclass
       and tgname='guard_rotation_period_v55' and tgenabled='O') then
    raise exception 'TRANSITION_CORRECTION_PRESERVATION_FAILED';
  end if;
  for i in 1..6 loop
    if public.calculated_roster_v55(date '2026-10-12'+(i-1)*4)->>'pager' is distinct from expected[i] then
      raise exception 'TRANSITION_CORRECTION_QUEUE_FAILED';
    end if;
  end loop;
end
$$;
update public.app_compatibility set recommended_version='54.1',updated_at=now() where id=1;
update public.app_schema_version set version=56,updated_at=now() where id=1;
commit;
