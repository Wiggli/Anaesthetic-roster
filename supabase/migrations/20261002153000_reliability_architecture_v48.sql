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
  p_change_id bigint,
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
  p_overtime_id bigint,
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
returns void
language plpgsql
security invoker
set search_path=''
as $$
begin
  if not public.claim_roster_operation_v48(p_operation_id,'plan-finalise',p_roster_date,p_expected_sync_revision) then return; end if;
  perform public.assert_roster_fresh_v48(p_expected_sync_revision);
  perform public.validate_night_plan_v48(p_roster_date,coalesce(p_assignments,'{}'::jsonb));
  perform public.finalise_night_plan_v26(p_roster_date,p_assignments,p_labour_first,p_labour_second,p_changed_by,p_expected_revision);
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

revoke all on function public.record_night_absence_v48(date,text,text,text,uuid,bigint) from public,anon;
revoke all on function public.remove_night_absence_v48(bigint,text,text,uuid,bigint) from public,anon;
revoke all on function public.add_night_overtime_v48(date,text,text,uuid,bigint) from public,anon;
revoke all on function public.remove_night_overtime_v48(bigint,text,uuid,bigint) from public,anon;
revoke all on function public.apply_staffing_allocations_v48(date,text,text,jsonb,text,text,uuid,bigint) from public,anon;
revoke all on function public.finalise_night_plan_v48(date,jsonb,text,text,text,bigint,uuid,bigint) from public,anon;
revoke all on function public.apply_night_role_override_v48(date,text,jsonb,text,text,text,uuid,bigint) from public,anon;

grant execute on function public.record_night_absence_v48(date,text,text,text,uuid,bigint) to authenticated;
grant execute on function public.remove_night_absence_v48(bigint,text,text,uuid,bigint) to authenticated;
grant execute on function public.add_night_overtime_v48(date,text,text,uuid,bigint) to authenticated;
grant execute on function public.remove_night_overtime_v48(bigint,text,uuid,bigint) to authenticated;
grant execute on function public.apply_staffing_allocations_v48(date,text,text,jsonb,text,text,uuid,bigint) to authenticated;
grant execute on function public.finalise_night_plan_v48(date,jsonb,text,text,text,bigint,uuid,bigint) to authenticated;
grant execute on function public.apply_night_role_override_v48(date,text,jsonb,text,text,text,uuid,bigint) to authenticated;

update public.app_schema_version
set version=48,updated_at=now()
where id=1;

commit;
