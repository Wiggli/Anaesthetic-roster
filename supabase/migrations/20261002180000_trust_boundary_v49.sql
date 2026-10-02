-- Trust Boundary v49.
-- Enforces client compatibility for consequential roster writes, derives audit
-- identity on the server, and provides a privacy-safe access revision signal.

begin;

create table if not exists public.app_compatibility (
  id integer primary key default 1,
  minimum_read_version text not null default '37.0',
  minimum_write_version text not null default '41.0',
  recommended_version text not null default '41.0',
  maintenance_mode boolean not null default false,
  maintenance_message text not null default 'Shared roster editing has been temporarily paused.',
  blocked_write_versions text[] not null default '{}'::text[],
  updated_at timestamptz not null default now(),
  updated_by uuid,
  constraint app_compatibility_singleton check (id=1),
  constraint app_compatibility_min_read_format check (minimum_read_version ~ '^[0-9]+(\.[0-9]+)+$'),
  constraint app_compatibility_min_write_format check (minimum_write_version ~ '^[0-9]+(\.[0-9]+)+$'),
  constraint app_compatibility_recommended_format check (recommended_version ~ '^[0-9]+(\.[0-9]+)+$'),
  constraint app_compatibility_message_length check (char_length(maintenance_message) between 1 and 240)
);

alter table public.app_compatibility enable row level security;
revoke all privileges on table public.app_compatibility from public,anon,authenticated;

insert into public.app_compatibility(
  id,minimum_read_version,minimum_write_version,recommended_version,
  maintenance_mode,maintenance_message,blocked_write_versions,updated_at
)
values(
  1,'37.0','41.0','41.0',false,
  'Shared roster editing has been temporarily paused.',
  '{}'::text[],now()
)
on conflict (id) do update
set minimum_write_version='41.0',
    recommended_version='41.0',
    updated_at=now();

create table if not exists public.app_access_signal (
  id integer primary key default 1,
  access_epoch bigint not null default 0,
  updated_at timestamptz not null default now(),
  constraint app_access_signal_singleton check (id=1)
);

alter table public.app_access_signal enable row level security;
revoke all privileges on table public.app_access_signal from public,anon,authenticated;
grant select on table public.app_access_signal to authenticated;

drop policy if exists "Authenticated sessions can view access epoch" on public.app_access_signal;
create policy "Authenticated sessions can view access epoch"
on public.app_access_signal
for select
to authenticated
using ((select auth.uid()) is not null);

insert into public.app_access_signal(id,access_epoch,updated_at)
values(1,0,now())
on conflict (id) do nothing;

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname='supabase_realtime'
      and schemaname='public'
      and tablename='app_access_signal'
  ) then
    alter publication supabase_realtime add table public.app_access_signal;
  end if;
end
$$;

create or replace function public.app_version_at_least_v49(
  p_version text,
  p_minimum text
)
returns boolean
language plpgsql
immutable
security invoker
set search_path=''
as $$
declare
  v_left text[];
  v_right text[];
  v_length integer;
  v_index integer;
  v_left_part integer;
  v_right_part integer;
begin
  if trim(coalesce(p_version,'')) !~ '^[0-9]+(\.[0-9]+)+$'
     or trim(coalesce(p_minimum,'')) !~ '^[0-9]+(\.[0-9]+)+$' then
    return false;
  end if;

  v_left:=string_to_array(trim(p_version),'.');
  v_right:=string_to_array(trim(p_minimum),'.');
  v_length:=greatest(array_length(v_left,1),array_length(v_right,1));

  for v_index in 1..v_length loop
    v_left_part:=coalesce(v_left[v_index]::integer,0);
    v_right_part:=coalesce(v_right[v_index]::integer,0);
    if v_left_part>v_right_part then return true; end if;
    if v_left_part<v_right_part then return false; end if;
  end loop;

  return true;
end
$$;

create or replace function public.current_roster_actor_name_v49()
returns text
language plpgsql
stable
security definer
set search_path=''
as $$
declare
  v_name text;
begin
  if auth.uid() is null then
    raise exception 'PERMISSION_DENIED';
  end if;

  select account.display_name
  into v_name
  from public.allowed_users account
  where lower(account.email)=lower(coalesce(auth.jwt()->>'email',''))
    and account.active=true
  limit 1;

  if nullif(trim(coalesce(v_name,'')),'') is null then
    raise exception 'PERMISSION_DENIED';
  end if;

  return trim(v_name);
end
$$;

create or replace function public.get_app_compatibility_v49(
  p_client_version text
)
returns jsonb
language plpgsql
stable
security definer
set search_path=''
as $$
declare
  v_control public.app_compatibility%rowtype;
  v_version text:=trim(coalesce(p_client_version,''));
  v_read_allowed boolean;
  v_write_allowed boolean;
  v_blocked boolean;
  v_active boolean;
  v_status text;
begin
  if auth.uid() is null then
    raise exception 'PERMISSION_DENIED';
  end if;

  select * into v_control
  from public.app_compatibility
  where id=1;

  if not found then
    raise exception 'COMPATIBILITY_CONFIG_MISSING';
  end if;

  v_read_allowed:=public.app_version_at_least_v49(v_version,v_control.minimum_read_version);
  v_blocked:=v_version=any(v_control.blocked_write_versions);
  v_active:=public.is_shift_member();

  if not v_active then
    v_status:='permission_denied';
  elsif v_control.maintenance_mode then
    v_status:='maintenance';
  elsif v_blocked then
    v_status:='version_blocked';
  elsif not public.app_version_at_least_v49(v_version,v_control.minimum_write_version) then
    v_status:='update_required';
  else
    v_status:='allowed';
  end if;

  v_write_allowed:=v_status='allowed';

  return jsonb_build_object(
    'minimum_read_version',v_control.minimum_read_version,
    'minimum_write_version',v_control.minimum_write_version,
    'recommended_version',v_control.recommended_version,
    'maintenance_mode',v_control.maintenance_mode,
    'maintenance_message',v_control.maintenance_message,
    'client_version',v_version,
    'read_allowed',v_read_allowed,
    'write_allowed',v_write_allowed,
    'write_status',v_status
  );
end
$$;

create or replace function public.assert_app_write_compatible_v49(
  p_client_version text
)
returns void
language plpgsql
stable
security definer
set search_path=''
as $$
declare
  v_status jsonb;
begin
  if auth.uid() is null or not public.is_shift_member() then
    raise exception 'PERMISSION_DENIED';
  end if;

  v_status:=public.get_app_compatibility_v49(p_client_version);

  case v_status->>'write_status'
    when 'allowed' then return;
    when 'maintenance' then raise exception 'APP_MAINTENANCE';
    when 'version_blocked' then raise exception 'CLIENT_VERSION_BLOCKED';
    when 'update_required' then raise exception 'CLIENT_UPDATE_REQUIRED';
    else raise exception 'PERMISSION_DENIED';
  end case;
end
$$;

create or replace function public.my_access_status_v49()
returns jsonb
language plpgsql
stable
security definer
set search_path=''
as $$
declare
  v_account public.allowed_users%rowtype;
  v_epoch bigint;
begin
  if auth.uid() is null then
    raise exception 'PERMISSION_DENIED';
  end if;

  select * into v_account
  from public.allowed_users account
  where lower(account.email)=lower(coalesce(auth.jwt()->>'email',''))
  limit 1;

  select access_epoch into v_epoch
  from public.app_access_signal
  where id=1;

  return jsonb_build_object(
    'user_id',auth.uid(),
    'active',coalesce(v_account.active,false),
    'display_name',case when v_account.email is null then null else v_account.display_name end,
    'user_role',case when v_account.email is null then null else v_account.user_role end,
    'access_epoch',coalesce(v_epoch,0)
  );
end
$$;

create or replace function public.bump_app_sync_state_v33()
returns trigger
language plpgsql
security definer
set search_path='public'
as $$
begin
  update public.app_sync_state
  set revision=revision+1,
      updated_at=now()
  where id=1;

  if tg_table_schema='public' and tg_table_name='allowed_users' then
    update public.app_access_signal
    set access_epoch=access_epoch+1,
        updated_at=now()
    where id=1;
  end if;

  return null;
end
$$;

drop trigger if exists bump_app_sync_state_v49 on public.app_compatibility;
create trigger bump_app_sync_state_v49
after insert or update or delete on public.app_compatibility
for each statement execute function public.bump_app_sync_state_v33();

alter table public.night_change_history
  add column if not exists actor_user_id uuid;
alter table public.night_change_history
  alter column actor_user_id set default auth.uid();

alter table public.night_overtime_history
  add column if not exists actor_user_id uuid;
alter table public.night_overtime_history
  alter column actor_user_id set default auth.uid();

alter table public.night_role_override_history
  add column if not exists actor_user_id uuid;
alter table public.night_role_override_history
  alter column actor_user_id set default auth.uid();

create index if not exists night_change_history_actor_user_idx
  on public.night_change_history(actor_user_id,changed_at desc);
create index if not exists night_overtime_history_actor_user_idx
  on public.night_overtime_history(actor_user_id,changed_at desc);
create index if not exists night_role_override_history_actor_user_idx
  on public.night_role_override_history(actor_user_id,changed_at desc);

create or replace function public.get_roster_startup_v49(
  p_client_version text
)
returns jsonb
language plpgsql
stable
security definer
set search_path=''
as $$
declare
  v_snapshot jsonb;
  v_epoch bigint;
begin
  if auth.uid() is null then
    raise exception 'PERMISSION_DENIED';
  end if;

  v_snapshot:=public.get_roster_startup_v37();

  select access_epoch into v_epoch
  from public.app_access_signal
  where id=1;

  return v_snapshot || jsonb_build_object(
    'access_epoch',coalesce(v_epoch,0),
    'compatibility',public.get_app_compatibility_v49(p_client_version)
  );
end
$$;

create or replace function public.record_night_absence_v49(
  p_roster_date date,
  p_absent_name text,
  p_reason text,
  p_operation_id uuid,
  p_expected_sync_revision bigint,
  p_client_version text
)
returns void
language plpgsql
security definer
set search_path=''
as $$
declare v_actor text;
begin
  perform public.assert_app_write_compatible_v49(p_client_version);
  v_actor:=public.current_roster_actor_name_v49();
  perform public.record_night_absence_v48(
    p_roster_date,p_absent_name,p_reason,v_actor,p_operation_id,p_expected_sync_revision
  );
end
$$;

create or replace function public.remove_night_absence_v49(
  p_change_id uuid,
  p_allocation_key text,
  p_operation_id uuid,
  p_expected_sync_revision bigint,
  p_client_version text
)
returns void
language plpgsql
security definer
set search_path=''
as $$
declare v_actor text;
begin
  perform public.assert_app_write_compatible_v49(p_client_version);
  v_actor:=public.current_roster_actor_name_v49();
  perform public.remove_night_absence_v48(
    p_change_id,p_allocation_key,v_actor,p_operation_id,p_expected_sync_revision
  );
end
$$;

create or replace function public.add_night_overtime_v49(
  p_roster_date date,
  p_nurse_name text,
  p_operation_id uuid,
  p_expected_sync_revision bigint,
  p_client_version text
)
returns void
language plpgsql
security definer
set search_path=''
as $$
declare v_actor text;
begin
  perform public.assert_app_write_compatible_v49(p_client_version);
  v_actor:=public.current_roster_actor_name_v49();
  perform public.add_night_overtime_v48(
    p_roster_date,p_nurse_name,v_actor,p_operation_id,p_expected_sync_revision
  );
end
$$;

create or replace function public.remove_night_overtime_v49(
  p_overtime_id uuid,
  p_operation_id uuid,
  p_expected_sync_revision bigint,
  p_client_version text
)
returns void
language plpgsql
security definer
set search_path=''
as $$
declare v_actor text;
begin
  perform public.assert_app_write_compatible_v49(p_client_version);
  v_actor:=public.current_roster_actor_name_v49();
  perform public.remove_night_overtime_v48(
    p_overtime_id,v_actor,p_operation_id,p_expected_sync_revision
  );
end
$$;

create or replace function public.apply_staffing_allocations_v49(
  p_roster_date date,
  p_action text,
  p_coverage_key text,
  p_assignments jsonb,
  p_reliever_name text,
  p_operation_id uuid,
  p_expected_sync_revision bigint,
  p_client_version text
)
returns void
language plpgsql
security definer
set search_path=''
as $$
declare v_actor text;
begin
  perform public.assert_app_write_compatible_v49(p_client_version);
  v_actor:=public.current_roster_actor_name_v49();
  perform public.apply_staffing_allocations_v48(
    p_roster_date,p_action,p_coverage_key,p_assignments,v_actor,p_reliever_name,
    p_operation_id,p_expected_sync_revision
  );
end
$$;

create or replace function public.finalise_night_plan_v49(
  p_roster_date date,
  p_assignments jsonb,
  p_labour_first text,
  p_labour_second text,
  p_expected_revision bigint,
  p_operation_id uuid,
  p_expected_sync_revision bigint,
  p_client_version text
)
returns bigint
language plpgsql
security definer
set search_path=''
as $$
declare
  v_actor text;
  v_revision bigint;
begin
  perform public.assert_app_write_compatible_v49(p_client_version);
  v_actor:=public.current_roster_actor_name_v49();
  select public.finalise_night_plan_v48(
    p_roster_date,p_assignments,p_labour_first,p_labour_second,v_actor,
    p_expected_revision,p_operation_id,p_expected_sync_revision
  ) into v_revision;
  return v_revision;
end
$$;

create or replace function public.apply_night_role_override_v49(
  p_roster_date date,
  p_action text,
  p_assignments jsonb,
  p_override_reason text,
  p_history_reason text,
  p_operation_id uuid,
  p_expected_sync_revision bigint,
  p_client_version text
)
returns void
language plpgsql
security definer
set search_path=''
as $$
declare v_actor text;
begin
  perform public.assert_app_write_compatible_v49(p_client_version);
  v_actor:=public.current_roster_actor_name_v49();
  perform public.apply_night_role_override_v48(
    p_roster_date,p_action,p_assignments,p_override_reason,p_history_reason,v_actor,
    p_operation_id,p_expected_sync_revision
  );
end
$$;

create or replace function public.publish_roster_v49(
  p_published_until date,
  p_operation_id uuid,
  p_expected_sync_revision bigint,
  p_client_version text
)
returns void
language plpgsql
security definer
set search_path=''
as $$
declare v_actor text;
begin
  perform public.assert_app_write_compatible_v49(p_client_version);
  if not public.is_roster_admin() then raise exception 'PERMISSION_DENIED'; end if;
  v_actor:=public.current_roster_actor_name_v49();
  perform public.publish_roster_v48(
    p_published_until,v_actor,p_operation_id,p_expected_sync_revision
  );
end
$$;

create or replace function public.upsert_rotation_version_v49(
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
  p_operation_id uuid,
  p_expected_sync_revision bigint,
  p_client_version text
)
returns void
language plpgsql
security definer
set search_path=''
as $$
declare v_actor text;
begin
  perform public.assert_app_write_compatible_v49(p_client_version);
  if not public.is_roster_admin() then raise exception 'PERMISSION_DENIED'; end if;
  v_actor:=public.current_roster_actor_name_v49();
  perform public.upsert_rotation_version_v48(
    p_effective_from,p_first1,p_first2,p_second1,p_second2,p_pager,p_reliever,
    p_seventh_anchor,p_seventh_cycle,p_notes,v_actor,p_operation_id,p_expected_sync_revision
  );
end
$$;

-- New public functions default to executable by PUBLIC in PostgreSQL. Fail closed,
-- then re-grant only the v49 endpoints deliberately exposed to signed-in users.
revoke all on function public.app_version_at_least_v49(text,text) from public,anon,authenticated;
revoke all on function public.current_roster_actor_name_v49() from public,anon,authenticated;
revoke all on function public.get_app_compatibility_v49(text) from public,anon,authenticated;
revoke all on function public.assert_app_write_compatible_v49(text) from public,anon,authenticated;
revoke all on function public.my_access_status_v49() from public,anon,authenticated;
revoke all on function public.get_roster_startup_v49(text) from public,anon,authenticated;

revoke all on function public.record_night_absence_v49(date,text,text,uuid,bigint,text) from public,anon,authenticated;
revoke all on function public.remove_night_absence_v49(uuid,text,uuid,bigint,text) from public,anon,authenticated;
revoke all on function public.add_night_overtime_v49(date,text,uuid,bigint,text) from public,anon,authenticated;
revoke all on function public.remove_night_overtime_v49(uuid,uuid,bigint,text) from public,anon,authenticated;
revoke all on function public.apply_staffing_allocations_v49(date,text,text,jsonb,text,uuid,bigint,text) from public,anon,authenticated;
revoke all on function public.finalise_night_plan_v49(date,jsonb,text,text,bigint,uuid,bigint,text) from public,anon,authenticated;
revoke all on function public.apply_night_role_override_v49(date,text,jsonb,text,text,uuid,bigint,text) from public,anon,authenticated;
revoke all on function public.publish_roster_v49(date,uuid,bigint,text) from public,anon,authenticated;
revoke all on function public.upsert_rotation_version_v49(date,text,text,text,text,text,text,text,jsonb,text,uuid,bigint,text) from public,anon,authenticated;

grant execute on function public.get_app_compatibility_v49(text) to authenticated;
grant execute on function public.my_access_status_v49() to authenticated;
grant execute on function public.get_roster_startup_v49(text) to authenticated;
grant execute on function public.record_night_absence_v49(date,text,text,uuid,bigint,text) to authenticated;
grant execute on function public.remove_night_absence_v49(uuid,text,uuid,bigint,text) to authenticated;
grant execute on function public.add_night_overtime_v49(date,text,uuid,bigint,text) to authenticated;
grant execute on function public.remove_night_overtime_v49(uuid,uuid,bigint,text) to authenticated;
grant execute on function public.apply_staffing_allocations_v49(date,text,text,jsonb,text,uuid,bigint,text) to authenticated;
grant execute on function public.finalise_night_plan_v49(date,jsonb,text,text,bigint,uuid,bigint,text) to authenticated;
grant execute on function public.apply_night_role_override_v49(date,text,jsonb,text,text,uuid,bigint,text) to authenticated;
grant execute on function public.publish_roster_v49(date,uuid,bigint,text) to authenticated;
grant execute on function public.upsert_rotation_version_v49(date,text,text,text,text,text,text,text,jsonb,text,uuid,bigint,text) to authenticated;

-- Older clients may still read through the existing protected startup route, but
-- they can no longer call any legacy clinical mutation path directly.
revoke all on function public.record_night_absence_v25(date,text,text,text) from public,anon,authenticated;
revoke all on function public.remove_night_absence_v25(uuid,text,text) from public,anon,authenticated;
revoke all on function public.add_night_overtime_v25(date,text,text) from public,anon,authenticated;
revoke all on function public.remove_night_overtime_v25(uuid,text) from public,anon,authenticated;
revoke all on function public.apply_staffing_allocations_v25(date,text,text,jsonb,text,text) from public,anon,authenticated;
revoke all on function public.finalise_night_plan_v26(date,jsonb,text,text,text,bigint) from public,anon,authenticated;
revoke all on function public.apply_night_role_override_v35(date,text,jsonb,text,text,text) from public,anon,authenticated;
revoke all on function public.apply_night_role_override_v33(date,text,jsonb,text,text,text) from public,anon,authenticated;
revoke all on function public.set_roster_identity_v34(text,text) from public,anon,authenticated;

revoke all on function public.record_night_absence_v48(date,text,text,text,uuid,bigint) from public,anon,authenticated;
revoke all on function public.remove_night_absence_v48(uuid,text,text,uuid,bigint) from public,anon,authenticated;
revoke all on function public.add_night_overtime_v48(date,text,text,uuid,bigint) from public,anon,authenticated;
revoke all on function public.remove_night_overtime_v48(uuid,text,uuid,bigint) from public,anon,authenticated;
revoke all on function public.apply_staffing_allocations_v48(date,text,text,jsonb,text,text,uuid,bigint) from public,anon,authenticated;
revoke all on function public.finalise_night_plan_v48(date,jsonb,text,text,text,bigint,uuid,bigint) from public,anon,authenticated;
revoke all on function public.apply_night_role_override_v48(date,text,jsonb,text,text,text,uuid,bigint) from public,anon,authenticated;
revoke all on function public.publish_roster_v48(date,text,uuid,bigint) from public,anon,authenticated;
revoke all on function public.upsert_rotation_version_v48(date,text,text,text,text,text,text,text,jsonb,text,text,uuid,bigint) from public,anon,authenticated;
revoke all on function public.claim_roster_operation_v48(uuid,text,date,bigint) from public,anon,authenticated;
revoke all on function public.assert_roster_fresh_v48(bigint) from public,anon,authenticated;
revoke all on function public.validate_night_plan_v48(date,jsonb) from public,anon,authenticated;

update public.app_schema_version
set version=49,updated_at=now()
where id=1;

commit;
