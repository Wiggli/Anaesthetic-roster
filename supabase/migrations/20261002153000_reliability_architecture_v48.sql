-- Reliability architecture v48.
-- Adds idempotent clinical command wrappers, freshness barriers and a final-plan
-- server validator while preserving the existing v25/v26/v35 clinical RPCs.

begin;

create table if not exists public.roster_operation_log (
  operation_id uuid primary key,
  user_id uuid not null default auth.uid(),
  operation_type text not null,
  roster_date date,
  expected_sync_revision bigint,
  completed_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  constraint roster_operation_type_length check (char_length(operation_type) between 1 and 80)
);

alter table public.roster_operation_log enable row level security;
revoke all privileges on table public.roster_operation_log from public, anon, authenticated;
grant select (operation_id,user_id,operation_type,roster_date,expected_sync_revision,completed_at,created_at)
  on table public.roster_operation_log to authenticated;
grant insert (operation_id,user_id,operation_type,roster_date,expected_sync_revision)
  on table public.roster_operation_log to authenticated;

drop policy if exists "Users can view own roster operations" on public.roster_operation_log;
create policy "Users can view own roster operations"
on public.roster_operation_log
for select
to authenticated
using (user_id=(select auth.uid()));

drop policy if exists "Users can claim own roster operations" on public.roster_operation_log;
create policy "Users can claim own roster operations"
on public.roster_operation_log
for insert
to authenticated
with check (user_id=(select auth.uid()));

create or replace function public.assert_roster_fresh_v48(
  p_expected_sync_revision bigint
)
returns bigint
language plpgsql
security invoker
set search_path=''
as $$
declare
  v_current bigint;
begin
  if auth.uid() is null then
    raise exception 'PERMISSION_DENIED';
  end if;

  select revision into v_current
  from public.app_sync_state
  where id=1;

  if p_expected_sync_revision is null then
    raise exception 'STALE_CLIENT';
  end if;

  if v_current is distinct from p_expected_sync_revision then
    raise exception 'ROSTER_REVISION_CONFLICT';
  end if;

  return v_current;
end
$$;

revoke all on function public.assert_roster_fresh_v48(bigint) from public,anon;
grant execute on function public.assert_roster_fresh_v48(bigint) to authenticated;

create or replace function public.claim_roster_operation_v48(
  p_operation_id uuid,
  p_operation_type text,
  p_roster_date date,
  p_expected_sync_revision bigint
)
returns boolean
language plpgsql
security invoker
set search_path=''
as $$
declare
  v_inserted boolean;
  v_existing public.roster_operation_log%rowtype;
begin
  if auth.uid() is null then
    raise exception 'PERMISSION_DENIED';
  end if;
  if p_operation_id is null then
    raise exception 'OPERATION_ID_REQUIRED';
  end if;
  if coalesce(trim(p_operation_type),'')='' then
    raise exception 'OPERATION_TYPE_REQUIRED';
  end if;

  insert into public.roster_operation_log(
    operation_id,user_id,operation_type,roster_date,expected_sync_revision
  )
  values(
    p_operation_id,auth.uid(),left(trim(p_operation_type),80),p_roster_date,p_expected_sync_revision
  )
  on conflict (operation_id) do nothing
  returning true into v_inserted;

  if coalesce(v_inserted,false) then
    return true;
  end if;

  select * into v_existing
  from public.roster_operation_log
  where operation_id=p_operation_id;

  if v_existing.user_id is distinct from auth.uid()
     or v_existing.operation_type is distinct from left(trim(p_operation_type),80)
     or v_existing.roster_date is distinct from p_roster_date then
    raise exception 'OPERATION_ID_CONFLICT';
  end if;

  return false;
end
$$;

revoke all on function public.claim_roster_operation_v48(uuid,text,date,bigint) from public,anon;
grant execute on function public.claim_roster_operation_v48(uuid,text,date,bigint) to authenticated;

create or replace function public.validate_night_plan_v48(
  p_roster_date date,
  p_assignments jsonb
)
returns boolean
language plpgsql
security invoker
set search_path=''
as $$
declare
  v_count integer;
  v_distinct integer;
  v_found integer;
  v_names integer;
begin
  if auth.uid() is null then
    raise exception 'PERMISSION_DENIED';
  end if;
  if p_roster_date is null then
    raise exception 'PLAN_INCOMPLETE';
  end if;
  if p_assignments is null then
    p_assignments='{}'::jsonb;
  end if;
  if jsonb_typeof(p_assignments)<>'object' then
    raise exception 'PLAN_INCOMPLETE';
  end if;

  if exists (
    select 1
    from jsonb_object_keys(p_assignments) key
    where key not in ('first1','first2','second1','second2','pager','reliever','seventh')
  ) then
    raise exception 'PLAN_INCOMPLETE';
  end if;

  select count(*),count(distinct value)
  into v_count,v_distinct
  from jsonb_each_text(p_assignments);

  if v_count<>v_distinct then
    raise exception 'PLAN_INCOMPLETE';
  end if;

  if v_count>0 then
    select count(*),count(distinct lower(trim(o.nurse_name)))
    into v_found,v_names
    from public.night_overtime o
    where o.roster_date=p_roster_date
      and o.id::text in (select value from jsonb_each_text(p_assignments));

    if v_found<>v_count or v_names<>v_count then
      raise exception 'STAFF_NOT_EFFECTIVE';
    end if;
  end if;

  return true;
end
$$;

revoke all on function public.validate_night_plan_v48(date,jsonb) from public,anon;
grant execute on function public.validate_night_plan_v48(date,jsonb) to authenticated;

create or replace function public.record_night_absence_v48(
  p_roster_date date,
  p_absent_name text,
  p_reason text,
  p_changed_by text,
  p_operation_id uuid,
  p_expected_sync_revision bigint
)
returns void
language plpgsql
security invoker
set search_path=''
as $$
begin
  if not public.claim_roster_operation_v48(p_operation_id,'absence-add',p_roster_date,p_expected_sync_revision) then return; end if;
  perform public.assert_roster_fresh_v48(p_expected_sync_revision);
  perform public.record_night_absence_v25(p_roster_date,p_absent_name,p_reason,p_changed_by);
end
$$;

create or replace function public.remove_night_absence_v48(
  p_change_id uuid,
  p_allocation_key text,
  p_changed_by text,
  p_operation_id uuid,
  p_expected_sync_revision bigint
)
returns void
language plpgsql
security invoker
set search_path=''
as $$
declare v_date date;
begin
  select roster_date into v_date from public.night_changes where id=p_change_id;
  if v_date is null then
    select roster_date into v_date
    from public.roster_operation_log
    where operation_id=p_operation_id
      and user_id=auth.uid()
      and operation_type='absence-remove';
  end if;
  if v_date is null then raise exception 'RECORD_NOT_FOUND'; end if;
  if not public.claim_roster_operation_v48(p_operation_id,'absence-remove',v_date,p_expected_sync_revision) then return; end if;
  perform public.assert_roster_fresh_v48(p_expected_sync_revision);
  perform public.remove_night_absence_v25(p_change_id,p_allocation_key,p_changed_by);
end
$$;

create or replace function public.add_night_overtime_v48(
  p_roster_date date,
  p_nurse_name text,
  p_changed_by text,
  p_operation_id uuid,
  p_expected_sync_revision bigint
)
returns void
language plpgsql
security invoker
set search_path=''
as $$
begin
  if not public.claim_roster_operation_v48(p_operation_id,'overtime-add',p_roster_date,p_expected_sync_revision) then return; end if;
  perform public.assert_roster_fresh_v48(p_expected_sync_revision);
  perform public.add_night_overtime_v25(p_roster_date,p_nurse_name,p_changed_by);
end
$$;

create or replace function public.remove_night_overtime_v48(
  p_overtime_id uuid,
  p_changed_by text,
  p_operation_id uuid,
  p_expected_sync_revision bigint
)
returns void
language plpgsql
security invoker
set search_path=''
as $$
declare v_date date;
begin
  select roster_date into v_date from public.night_overtime where id=p_overtime_id;
  if v_date is null then
    select roster_date into v_date
    from public.roster_operation_log
    where operation_id=p_operation_id
      and user_id=auth.uid()
      and operation_type='overtime-remove';
  end if;
  if v_date is null then raise exception 'RECORD_NOT_FOUND'; end if;
  if not public.claim_roster_operation_v48(p_operation_id,'overtime-remove',v_date,p_expected_sync_revision) then return; end if;
  perform public.assert_roster_fresh_v48(p_expected_sync_revision);
  perform public.remove_night_overtime_v25(p_overtime_id,p_changed_by);
end
$$;

create or replace function public.apply_staffing_allocations_v48(
  p_roster_date date,
  p_action text,
  p_coverage_key text,
  p_assignments jsonb,
  p_changed_by text,
  p_reliever_name text,
  p_operation_id uuid,
  p_expected_sync_revision bigint
)
returns void
language plpgsql
security invoker
set search_path=''
as $$
begin
  if not public.claim_roster_operation_v48(p_operation_id,'staffing-'+coalesce(p_action,'unknown'),p_roster_date,p_expected_sync_revision) then return; end if;
  perform public.assert_roster_fresh_v48(p_expected_sync_revision);
  if p_action='allocations' then perform public.validate_night_plan_v48(p_roster_date,coalesce(p_assignments,'{}'::jsonb)); end if;
  perform public.apply_staffing_allocations_v25(p_roster_date,p_action,p_coverage_key,p_assignments,p_changed_by,p_reliever_name);
end
$$;

create or replace function public.finalise_night_plan_v48(
  p_roster_date date,
  p_assignments jsonb,
  p_labour_first text,
  p_labour_second text,
  p_changed_by text,
  p_expected_revision bigint,
  p_operation_id uuid,
  p_expected_sync_revision bigint
)
returns bigint
language plpgsql
security invoker
set search_path=''
as $$
declare
  v_revision bigint;
begin
  if not public.claim_roster_operation_v48(p_operation_id,'plan-finalise',p_roster_date,p_expected_sync_revision) then
    select revision into v_revision from public.night_plan_status where roster_date=p_roster_date;
    return coalesce(v_revision,p_expected_revision);
  end if;
  perform public.assert_roster_fresh_v48(p_expected_sync_revision);
  perform public.validate_night_plan_v48(p_roster_date,coalesce(p_assignments,'{}'::jsonb));
  select public.finalise_night_plan_v26(p_roster_date,p_assignments,p_labour_first,p_labour_second,p_changed_by,p_expected_revision)
  into v_revision;
  return v_revision;
end
$$;

create or replace function public.apply_night_role_override_v48(
  p_roster_date date,
  p_action text,
  p_assignments jsonb,
  p_override_reason text,
  p_history_reason text,
  p_changed_by text,
  p_operation_id uuid,
  p_expected_sync_revision bigint
)
returns void
language plpgsql
security invoker
set search_path=''
as $$
begin
  if not public.claim_roster_operation_v48(p_operation_id,'roles-'+coalesce(p_action,'unknown'),p_roster_date,p_expected_sync_revision) then return; end if;
  perform public.assert_roster_fresh_v48(p_expected_sync_revision);
  perform public.apply_night_role_override_v35(p_roster_date,p_action,p_assignments,p_override_reason,p_history_reason,p_changed_by);
end
$$;

create or replace function public.publish_roster_v48(
  p_published_until date,
  p_changed_by text,
  p_operation_id uuid,
  p_expected_sync_revision bigint
)
returns void
language plpgsql
security invoker
set search_path=''
as $$
declare
  v_current date;
begin
  if auth.uid() is null or not public.is_roster_admin() then
    raise exception 'PERMISSION_DENIED';
  end if;
  if p_published_until is null or mod((p_published_until-date '2026-06-30'),4)<>0 then
    raise exception 'INVALID_ROSTER_DATE';
  end if;
  if not public.claim_roster_operation_v48(p_operation_id,'roster-publish',p_published_until,p_expected_sync_revision) then return; end if;
  perform public.assert_roster_fresh_v48(p_expected_sync_revision);
  select published_until into v_current from public.roster_settings where id=1 for update;
  if v_current is null then raise exception 'ROSTER_SETTINGS_MISSING'; end if;
  if p_published_until<v_current then raise exception 'PUBLISH_REGRESSION'; end if;
  update public.roster_settings
  set published_until=p_published_until,updated_by=p_changed_by,updated_at=now()
  where id=1;
end
$$;

create or replace function public.upsert_rotation_version_v48(
  p_effective_from date,
  p_first1 text,
  p_first2 text,
  p_second1 text,
  p_second2 text,
  p_pager text,
  p_reliever text,
  p_seventh_anchor text,
  p_seventh_cycle jsonb,
  p_notes text,
  p_changed_by text,
  p_operation_id uuid,
  p_expected_sync_revision bigint
)
returns void
language plpgsql
security invoker
set search_path=''
as $$
declare
  v_names text[];
begin
  if auth.uid() is null or not public.is_roster_admin() then
    raise exception 'PERMISSION_DENIED';
  end if;
  if p_effective_from is null or p_effective_from<date '2026-06-30'
     or mod((p_effective_from-date '2026-06-30'),4)<>0 then
    raise exception 'INVALID_ROSTER_DATE';
  end if;

  v_names:=array[p_first1,p_first2,p_second1,p_second2,p_pager,p_reliever];
  if exists(select 1 from unnest(v_names) n where nullif(trim(n),'') is null)
     or (select count(distinct lower(trim(n))) from unnest(v_names) n)<>6 then
    raise exception 'INVALID_ROTATION';
  end if;

  if jsonb_typeof(p_seventh_cycle)<>'array'
     or jsonb_array_length(p_seventh_cycle)<>7
     or not (p_seventh_cycle ? 'OT Nurse') then
    raise exception 'INVALID_SEVENTH_CYCLE';
  end if;

  if exists(select 1 from public.rotation_versions where effective_from=p_effective_from) then
    raise exception 'ROTATION_VERSION_EXISTS';
  end if;

  if not public.claim_roster_operation_v48(p_operation_id,'rotation-version',p_effective_from,p_expected_sync_revision) then return; end if;
  perform public.assert_roster_fresh_v48(p_expected_sync_revision);

  insert into public.rotation_versions(
    effective_from,first1,first2,second1,second2,pager,reliever,
    seventh_anchor,seventh_cycle,notes,updated_by,updated_at
  )
  values(
    p_effective_from,trim(p_first1),trim(p_first2),trim(p_second1),trim(p_second2),trim(p_pager),trim(p_reliever),
    trim(p_seventh_anchor),p_seventh_cycle,coalesce(p_notes,''),p_changed_by,now()
  );
end
$$;

revoke all on function public.publish_roster_v48(date,text,uuid,bigint) from public,anon;
revoke all on function public.upsert_rotation_version_v48(date,text,text,text,text,text,text,text,jsonb,text,text,uuid,bigint) from public,anon;
grant execute on function public.publish_roster_v48(date,text,uuid,bigint) to authenticated;
grant execute on function public.upsert_rotation_version_v48(date,text,text,text,text,text,text,text,jsonb,text,text,uuid,bigint) to authenticated;

revoke all on function public.record_night_absence_v48(date,text,text,text,uuid,bigint) from public,anon;
revoke all on function public.remove_night_absence_v48(uuid,text,text,uuid,bigint) from public,anon;
revoke all on function public.add_night_overtime_v48(date,text,text,uuid,bigint) from public,anon;
revoke all on function public.remove_night_overtime_v48(uuid,text,uuid,bigint) from public,anon;
revoke all on function public.apply_staffing_allocations_v48(date,text,text,jsonb,text,text,uuid,bigint) from public,anon;
revoke all on function public.finalise_night_plan_v48(date,jsonb,text,text,text,bigint,uuid,bigint) from public,anon;
revoke all on function public.apply_night_role_override_v48(date,text,jsonb,text,text,text,uuid,bigint) from public,anon;

grant execute on function public.record_night_absence_v48(date,text,text,text,uuid,bigint) to authenticated;
grant execute on function public.remove_night_absence_v48(uuid,text,text,uuid,bigint) to authenticated;
grant execute on function public.add_night_overtime_v48(date,text,text,uuid,bigint) to authenticated;
grant execute on function public.remove_night_overtime_v48(uuid,text,uuid,bigint) to authenticated;
grant execute on function public.apply_staffing_allocations_v48(date,text,text,jsonb,text,text,uuid,bigint) to authenticated;
grant execute on function public.finalise_night_plan_v48(date,jsonb,text,text,text,bigint,uuid,bigint) to authenticated;
grant execute on function public.apply_night_role_override_v48(date,text,jsonb,text,text,text,uuid,bigint) to authenticated;

update public.app_schema_version
set version=48,updated_at=now()
where id=1;

commit;
