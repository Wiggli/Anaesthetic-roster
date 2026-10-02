-- Recovery and longevity v50.
-- Adds durable audit events, bounded/keyset history, operation-log retention,
-- non-mutating health canaries and database invariant checks without changing
-- the schema-49 clinical mutation contract used by current clients.

begin;

alter table public.night_change_history
  add column if not exists event_id uuid not null default gen_random_uuid();
alter table public.night_overtime_history
  add column if not exists event_id uuid not null default gen_random_uuid();
alter table public.night_role_override_history
  add column if not exists event_id uuid not null default gen_random_uuid();

create unique index if not exists night_change_history_event_id_uq
  on public.night_change_history(event_id);
create unique index if not exists night_overtime_history_event_id_uq
  on public.night_overtime_history(event_id);
create unique index if not exists night_role_override_history_event_id_uq
  on public.night_role_override_history(event_id);

create table if not exists public.roster_audit_events (
  event_id uuid primary key default gen_random_uuid(),
  operation_id uuid,
  source_table text not null,
  action text not null,
  roster_date date,
  actor_user_id uuid,
  actor_display_name text not null default 'System',
  before_value jsonb,
  after_value jsonb,
  created_at timestamptz not null default now(),
  constraint roster_audit_source_length check (char_length(source_table) between 1 and 80),
  constraint roster_audit_action_length check (char_length(action) between 1 and 20)
);

create index if not exists roster_audit_events_created_idx
  on public.roster_audit_events(created_at desc,event_id desc);
create index if not exists roster_audit_events_date_idx
  on public.roster_audit_events(roster_date,created_at desc,event_id desc);
create index if not exists roster_audit_events_operation_idx
  on public.roster_audit_events(operation_id)
  where operation_id is not null;
create index if not exists roster_operation_log_created_idx
  on public.roster_operation_log(created_at);

alter table public.roster_audit_events enable row level security;
revoke all privileges on table public.roster_audit_events from public,anon,authenticated;

create or replace function public.capture_roster_audit_v50()
returns trigger
language plpgsql
security definer
set search_path=''
as $$
declare
  v_before jsonb;
  v_after jsonb;
  v_row jsonb;
  v_actor text;
  v_operation_text text;
  v_operation_id uuid;
  v_roster_date date;
begin
  v_before:=case when tg_op='INSERT' then null else to_jsonb(old) end;
  v_after:=case when tg_op='DELETE' then null else to_jsonb(new) end;
  v_row:=coalesce(v_after,v_before,'{}'::jsonb);

  if coalesce(v_row->>'roster_date','') ~ '^\d{4}-\d{2}-\d{2}$' then
    v_roster_date:=(v_row->>'roster_date')::date;
  elsif coalesce(v_row->>'effective_from','') ~ '^\d{4}-\d{2}-\d{2}$' then
    v_roster_date:=(v_row->>'effective_from')::date;
  elsif tg_table_name='roster_settings'
        and coalesce(v_row->>'published_until','') ~ '^\d{4}-\d{2}-\d{2}$' then
    v_roster_date:=(v_row->>'published_until')::date;
  end if;

  v_operation_text:=current_setting('app.operation_id',true);
  if coalesce(v_operation_text,'') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' then
    v_operation_id:=v_operation_text::uuid;
  end if;

  if auth.uid() is not null then
    select nullif(trim(account.display_name),'')
    into v_actor
    from public.allowed_users account
    where lower(account.email)=lower(coalesce(auth.jwt()->>'email',''))
    limit 1;
  end if;

  insert into public.roster_audit_events(
    operation_id,source_table,action,roster_date,actor_user_id,actor_display_name,
    before_value,after_value
  )
  values(
    v_operation_id,tg_table_name,lower(tg_op),v_roster_date,auth.uid(),
    coalesce(v_actor,'System'),v_before,v_after
  );

  if tg_op='DELETE' then
    return old;
  end if;
  return new;
end
$;

revoke all on function public.capture_roster_audit_v50() from public,anon,authenticated;

drop trigger if exists audit_night_changes_v50 on public.night_changes;
create trigger audit_night_changes_v50
after insert or update or delete on public.night_changes
for each row execute function public.capture_roster_audit_v50();

drop trigger if exists audit_night_overtime_v50 on public.night_overtime;
create trigger audit_night_overtime_v50
after insert or update or delete on public.night_overtime
for each row execute function public.capture_roster_audit_v50();

drop trigger if exists audit_night_five_cover_v50 on public.night_five_cover;
create trigger audit_night_five_cover_v50
after insert or update or delete on public.night_five_cover
for each row execute function public.capture_roster_audit_v50();

drop trigger if exists audit_night_plan_status_v50 on public.night_plan_status;
create trigger audit_night_plan_status_v50
after insert or update or delete on public.night_plan_status
for each row execute function public.capture_roster_audit_v50();

drop trigger if exists audit_roster_settings_v50 on public.roster_settings;
create trigger audit_roster_settings_v50
after insert or update or delete on public.roster_settings
for each row execute function public.capture_roster_audit_v50();

drop trigger if exists audit_rotation_versions_v50 on public.rotation_versions;
create trigger audit_rotation_versions_v50
after insert or update or delete on public.rotation_versions
for each row execute function public.capture_roster_audit_v50();

drop trigger if exists audit_app_compatibility_v50 on public.app_compatibility;
create trigger audit_app_compatibility_v50
after insert or update or delete on public.app_compatibility
for each row execute function public.capture_roster_audit_v50();

do $$
begin
  if to_regclass('public.night_labour_order') is not null then
    execute 'drop trigger if exists audit_night_labour_order_v50 on public.night_labour_order';
    execute 'create trigger audit_night_labour_order_v50 after insert or update or delete on public.night_labour_order for each row execute function public.capture_roster_audit_v50()';
  end if;
  if to_regclass('public.night_role_overrides') is not null then
    execute 'drop trigger if exists audit_night_role_overrides_v50 on public.night_role_overrides';
    execute 'create trigger audit_night_role_overrides_v50 after insert or update or delete on public.night_role_overrides for each row execute function public.capture_roster_audit_v50()';
  end if;
end
$$;

-- Preserve the existing v48 idempotency contract while exposing the operation
-- identifier to audit triggers for the duration of the transaction.
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

  perform set_config('app.operation_id',p_operation_id::text,true);
  perform set_config('app.operation_type',left(trim(p_operation_type),80),true);

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

revoke all on function public.claim_roster_operation_v48(uuid,text,date,bigint)
  from public,anon;
grant execute on function public.claim_roster_operation_v48(uuid,text,date,bigint)
  to authenticated;

-- v49 wrappers call this helper internally. It only claims an idempotency key and
-- does not mutate clinical roster state on its own.

create or replace function public.prune_roster_operation_log_v50()
returns bigint
language plpgsql
security definer
set search_path=''
as $$
declare
  v_count bigint;
begin
  if auth.uid() is null or not public.is_roster_admin() then
    raise exception 'PERMISSION_DENIED';
  end if;

  delete from public.roster_operation_log
  where created_at < now()-interval '90 days';

  get diagnostics v_count=row_count;
  return v_count;
end
$$;

revoke all on function public.prune_roster_operation_log_v50()
  from public,anon,authenticated;
grant execute on function public.prune_roster_operation_log_v50()
  to authenticated;

create or replace function public.night_history_page_v50(
  p_roster_date date,
  p_before_at timestamptz default null,
  p_before_id uuid default null,
  p_limit integer default 50
)
returns jsonb
language plpgsql
stable
security definer
set search_path=''
as $$
declare
  v_limit integer:=greatest(1,least(coalesce(p_limit,50),100));
  v_items jsonb;
  v_has_more boolean;
  v_next jsonb;
begin
  if auth.uid() is null or not public.is_shift_member() then
    raise exception 'PERMISSION_DENIED';
  end if;

  with combined as (
    select h.event_id,'absence'::text as source,h.changed_at,to_jsonb(h) as payload
    from public.night_change_history h
    where h.roster_date=p_roster_date
    union all
    select h.event_id,'overtime'::text,h.changed_at,to_jsonb(h)
    from public.night_overtime_history h
    where h.roster_date=p_roster_date
    union all
    select h.event_id,'roles'::text,h.changed_at,to_jsonb(h)
    from public.night_role_override_history h
    where h.roster_date=p_roster_date
  ),
  page as (
    select *
    from combined
    where p_before_at is null
       or (changed_at,event_id)<(p_before_at,coalesce(p_before_id,'ffffffff-ffff-ffff-ffff-ffffffffffff'::uuid))
    order by changed_at desc,event_id desc
    limit v_limit+1
  )
  select coalesce(jsonb_agg(jsonb_build_object(
      'event_id',event_id,
      'source',source,
      'changed_at',changed_at,
      'payload',payload
    ) order by changed_at desc,event_id desc),'[]'::jsonb)
  into v_items
  from page;

  v_has_more:=jsonb_array_length(v_items)>v_limit;
  if v_has_more then
    v_items:=v_items-v_limit;
  end if;
  if jsonb_array_length(v_items)>0 then
    v_next:=v_items->(jsonb_array_length(v_items)-1);
  end if;

  return jsonb_build_object(
    'items',v_items,
    'has_more',v_has_more,
    'next_before_at',case when v_has_more then v_next->>'changed_at' else null end,
    'next_before_id',case when v_has_more then v_next->>'event_id' else null end
  );
end
$$;

revoke all on function public.night_history_page_v50(date,timestamptz,uuid,integer)
  from public,anon,authenticated;
grant execute on function public.night_history_page_v50(date,timestamptz,uuid,integer)
  to authenticated;

create or replace function public.admin_audit_timeline_v50(
  p_before_at timestamptz default null,
  p_before_id uuid default null,
  p_limit integer default 30,
  p_roster_date date default null
)
returns jsonb
language plpgsql
stable
security definer
set search_path=''
as $$
declare
  v_limit integer:=greatest(1,least(coalesce(p_limit,30),100));
  v_items jsonb;
  v_has_more boolean;
  v_next jsonb;
begin
  if auth.uid() is null or not public.is_roster_admin() then
    raise exception 'PERMISSION_DENIED';
  end if;

  with page as (
    select event_id,operation_id,source_table,action,roster_date,
           actor_user_id,actor_display_name,before_value,after_value,created_at
    from public.roster_audit_events
    where (p_roster_date is null or roster_date=p_roster_date)
      and (
        p_before_at is null
        or (created_at,event_id)<(p_before_at,coalesce(p_before_id,'ffffffff-ffff-ffff-ffff-ffffffffffff'::uuid))
      )
    order by created_at desc,event_id desc
    limit v_limit+1
  )
  select coalesce(jsonb_agg(to_jsonb(page) order by created_at desc,event_id desc),'[]'::jsonb)
  into v_items
  from page;

  v_has_more:=jsonb_array_length(v_items)>v_limit;
  if v_has_more then
    v_items:=v_items-v_limit;
  end if;
  if jsonb_array_length(v_items)>0 then
    v_next:=v_items->(jsonb_array_length(v_items)-1);
  end if;

  return jsonb_build_object(
    'items',v_items,
    'has_more',v_has_more,
    'next_before_at',case when v_has_more then v_next->>'created_at' else null end,
    'next_before_id',case when v_has_more then v_next->>'event_id' else null end
  );
end
$$;

revoke all on function public.admin_audit_timeline_v50(timestamptz,uuid,integer,date)
  from public,anon,authenticated;
grant execute on function public.admin_audit_timeline_v50(timestamptz,uuid,integer,date)
  to authenticated;

create or replace function public.check_roster_invariants_v50()
returns jsonb
language plpgsql
stable
security definer
set search_path=''
as $$
declare
  v_invalid_rotation bigint;
  v_invalid_plan bigint;
  v_missing_operation_actor bigint;
  v_missing_audit_actor bigint;
begin
  if auth.uid() is null or not public.is_roster_admin() then
    raise exception 'PERMISSION_DENIED';
  end if;

  select count(*) into v_invalid_rotation
  from public.rotation_versions r
  where nullif(trim(r.first1),'') is null
     or nullif(trim(r.first2),'') is null
     or nullif(trim(r.second1),'') is null
     or nullif(trim(r.second2),'') is null
     or nullif(trim(r.pager),'') is null
     or nullif(trim(r.reliever),'') is null
     or cardinality(array[
       r.first1,r.first2,r.second1,r.second2,r.pager,r.reliever
     ])<>6
     or (
       select count(distinct lower(trim(x)))
       from unnest(array[r.first1,r.first2,r.second1,r.second2,r.pager,r.reliever]) x
     )<>6;

  select count(*) into v_invalid_plan
  from public.night_plan_status p
  where p.revision is null or p.revision<0;

  select count(*) into v_missing_operation_actor
  from public.roster_operation_log o
  where o.user_id is null;

  select count(*) into v_missing_audit_actor
  from public.roster_audit_events a
  where a.actor_display_name is null or trim(a.actor_display_name)='';

  return jsonb_build_object(
    'ok',v_invalid_rotation=0 and v_invalid_plan=0
         and v_missing_operation_actor=0 and v_missing_audit_actor=0,
    'invalid_rotation_versions',v_invalid_rotation,
    'invalid_plan_statuses',v_invalid_plan,
    'operation_rows_without_actor',v_missing_operation_actor,
    'audit_rows_without_actor_name',v_missing_audit_actor
  );
end
$$;

revoke all on function public.check_roster_invariants_v50()
  from public,anon,authenticated;
grant execute on function public.check_roster_invariants_v50()
  to authenticated;

create or replace function public.app_health_canary_v50()
returns jsonb
language sql
stable
security definer
set search_path=''
as $$
  select case
    when auth.uid() is null then
      jsonb_build_object('ok',false,'status','signed_out')
    else
      jsonb_build_object(
        'ok',true,
        'status','ready',
        'server_now',now(),
        'schema_version',(select version from public.app_schema_version where id=1),
        'sync_revision',(select revision from public.app_sync_state where id=1),
        'access_epoch',(select access_epoch from public.app_access_signal where id=1)
      )
  end;
$$;

revoke all on function public.app_health_canary_v50()
  from public,anon,authenticated;
grant execute on function public.app_health_canary_v50()
  to authenticated;

create or replace function public.admin_app_health()
returns jsonb
language plpgsql
security definer
set search_path=''
as $$
declare
  v_invariants jsonb;
begin
  if auth.uid() is null or not public.is_roster_admin() then
    raise exception 'Administrator access required';
  end if;

  v_invariants:=public.check_roster_invariants_v50();

  return jsonb_build_object(
    'active_authorised_users',(select count(*) from public.allowed_users where active=true),
    'registered_chat_users',(select count(*) from public.chat_members where active=true),
    'push_devices',(select count(*) from public.push_subscriptions where enabled=true),
    'failed_push_24h',(select count(*) from public.push_dispatches where status='failed' and created_at>=now()-interval '24 hours'),
    'partial_push_24h',(select count(*) from public.push_dispatches where status='partial' and created_at>=now()-interval '24 hours'),
    'last_push_at',(select max(completed_at) from public.push_dispatches),
    'last_chat_message_at',(select max(created_at) from public.chat_messages),
    'last_roster_sync_at',(select max(updated_at) from public.app_sync_state),
    'last_audit_event_at',(select max(created_at) from public.roster_audit_events),
    'operation_log_rows',(select count(*) from public.roster_operation_log),
    'audit_event_rows',(select count(*) from public.roster_audit_events),
    'schema_version',(select version from public.app_schema_version where id=1),
    'invariants',v_invariants
  );
end
$$;

revoke all on function public.admin_app_health() from public,anon;
grant execute on function public.admin_app_health() to authenticated;

update public.app_schema_version
set version=50,updated_at=now()
where id=1;

commit;
