-- Schema 55: effective-dated five/six-person permanent establishment.
-- No account, absence, overtime, allocation, history or published-until rows are rewritten.
-- Existing periods retain their six-person interpretation; new periods are append-only.
begin;

alter table public.rotation_versions add column if not exists base_size integer not null default 6;
alter table public.rotation_versions alter column reliever drop not null;
alter table public.rotation_versions enable row level security;
revoke insert,update,delete on public.rotation_versions from public,anon,authenticated;

create or replace function public.rotation_establishment_valid_v55(p_size integer,p_names text[],p_reliever text,p_cycle jsonb,p_anchor text)
returns boolean language sql immutable set search_path='' as $$
  select coalesce(p_size in (5,6)
    and cardinality(p_names)=p_size
    and not exists(select 1 from unnest(p_names) n where nullif(trim(n),'') is null or length(n)>80 or n='OT Nurse' or n ~ '[<>[:cntrl:]]')
    and (select count(distinct lower(trim(n))) from unnest(p_names) n)=p_size
    and ((p_size=5 and p_reliever is null) or (p_size=6 and nullif(trim(p_reliever),'') is not null))
    and jsonb_typeof(p_cycle)='array'
    and jsonb_array_length(p_cycle)=p_size+1
    and (select count(distinct lower(trim(n))) from jsonb_array_elements_text(p_cycle) n)=p_size+1
    and p_cycle ? 'OT Nurse'
    and not exists(select 1 from unnest(p_names) n where not(p_cycle ? n))
    and p_cycle ? p_anchor, false)
$$;
revoke all on function public.rotation_establishment_valid_v55(integer,text[],text,jsonb,text) from public,anon,authenticated;
-- CHECK expressions need execution permission, but this immutable helper exposes no data.
grant execute on function public.rotation_establishment_valid_v55(integer,text[],text,jsonb,text) to authenticated;

alter table public.rotation_versions add constraint rotation_establishment_v55_check check (
  public.rotation_establishment_valid_v55(base_size,
    case when base_size=5 then array[first1,first2,second1,second2,pager]
         else array[first1,first2,second1,second2,pager,reliever] end,
    reliever,seventh_cycle,seventh_anchor));

create or replace function public.guard_rotation_period_v55()
returns trigger language plpgsql security invoker set search_path='' as $$
begin
  if tg_op <> 'INSERT' then raise exception 'ROTATION_PERIOD_IMMUTABLE'; end if;
  if new.effective_from <= (now() at time zone 'Europe/Malta')::date
     or mod(new.effective_from-date '2026-06-30',4)<>0
     or exists(select 1 from public.rotation_versions where effective_from>=new.effective_from) then
    raise exception 'INVALID_FUTURE_ROSTER_DATE';
  end if;
  return new;
end
$$;
revoke all on function public.guard_rotation_period_v55() from public,anon,authenticated;
create trigger guard_rotation_period_v55 before insert or update or delete on public.rotation_versions
for each row execute function public.guard_rotation_period_v55();

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
  v_size integer:=case when p_reliever is null then 5 else 6 end;
begin
  if auth.uid() is null or not public.is_roster_admin() then
    raise exception 'PERMISSION_DENIED';
  end if;
  if p_effective_from is null or p_effective_from<date '2026-06-30'
     or mod((p_effective_from-date '2026-06-30'),4)<>0 then
    raise exception 'INVALID_ROSTER_DATE';
  end if;

  v_names:=array[p_first1,p_first2,p_second1,p_second2,p_pager];
  if v_size=6 then v_names:=v_names||p_reliever; end if;
  if not public.rotation_establishment_valid_v55(v_size,v_names,p_reliever,p_seventh_cycle,p_seventh_anchor) then
    raise exception 'INVALID_ROTATION';
  end if;
  if length(coalesce(trim(p_notes),'')) not between 1 and 240 then raise exception 'INVALID_ROTATION_REASON'; end if;

  if not public.claim_roster_operation_v48(p_operation_id,'rotation-version',p_effective_from,p_expected_sync_revision) then return; end if;
  perform public.assert_roster_fresh_v48(p_expected_sync_revision);

  if exists(select 1 from public.rotation_versions where effective_from=p_effective_from) then
    raise exception 'ROTATION_VERSION_EXISTS';
  end if;

  insert into public.rotation_versions(
    effective_from,base_size,first1,first2,second1,second2,pager,reliever,
    seventh_anchor,seventh_cycle,notes,updated_by,updated_at
  )
  values(
    p_effective_from,v_size,trim(p_first1),trim(p_first2),trim(p_second1),trim(p_second2),trim(p_pager),trim(p_reliever),
    trim(p_seventh_anchor),p_seventh_cycle,coalesce(p_notes,''),p_changed_by,now()
  );
end
$$;

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
  v_permanent_names text[];
  v_active_names text[];
  v_active_count integer;
  v_role_assignments jsonb;
  v_labour_first text;
  v_labour_second text;
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

  select array_remove(array[first1,first2,second1,second2,pager,reliever],null)
  into v_permanent_names
  from public.rotation_versions
  where effective_from<=p_roster_date
  order by effective_from desc
  limit 1;

  if v_permanent_names is null then
    raise exception 'PLAN_INCOMPLETE';
  end if;

  with candidate_names(name) as (
    select trim(permanent_name)
    from unnest(v_permanent_names) permanent(permanent_name)
    where not exists (
      select 1 from public.night_changes c
      where c.roster_date=p_roster_date
        and lower(trim(c.absent_name))=lower(trim(permanent_name))
    )
    union all
    select trim(c.replacement_name)
    from public.night_changes c
    where c.roster_date=p_roster_date
      and length(trim(coalesce(c.replacement_name,'')))>0
    union all
    select trim(o.nurse_name)
    from public.night_overtime o
    where o.roster_date=p_roster_date
      and length(trim(coalesce(o.nurse_name,'')))>0
  ), distinct_names as (
    select min(name) as name
    from candidate_names
    where length(name)>0
    group by lower(name)
  )
  select array_agg(name order by lower(name)),count(*)
  into v_active_names,v_active_count
  from distinct_names;

  if coalesce(v_active_count,0)<5 then
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

  select assignments into v_role_assignments
  from public.night_role_overrides
  where roster_date=p_roster_date;

  if v_role_assignments is not null then
    if exists (
      select 1
      from jsonb_each_text(v_role_assignments) assignment(key,value)
      where key<>'mode'
        and not exists (
          select 1 from unnest(v_active_names) active(active_name)
          where lower(trim(active_name))=lower(trim(value))
        )
    ) then
      raise exception 'STAFF_NOT_EFFECTIVE';
    end if;
    if (
      select count(distinct lower(trim(value)))
      from jsonb_each_text(v_role_assignments)
      where key<>'mode'
    ) <> (
      select count(*)
      from jsonb_each_text(v_role_assignments)
      where key<>'mode'
    ) then
      raise exception 'PLAN_INCOMPLETE';
    end if;
  end if;

  select first_part_name,second_part_name
  into v_labour_first,v_labour_second
  from public.night_labour_order
  where roster_date=p_roster_date;

  if v_labour_first is not null or v_labour_second is not null then
    if nullif(trim(v_labour_first),'') is null
       or nullif(trim(v_labour_second),'') is null
       or lower(trim(v_labour_first))=lower(trim(v_labour_second))
       or not exists (
         select 1 from unnest(v_active_names) active(active_name)
         where lower(trim(active_name))=lower(trim(v_labour_first))
       )
       or not exists (
         select 1 from unnest(v_active_names) active(active_name)
         where lower(trim(active_name))=lower(trim(v_labour_second))
       ) then
      raise exception 'STAFF_NOT_EFFECTIVE';
    end if;
  end if;

  return true;
end
$$;

create or replace function public.apply_night_role_override_v35(
  p_roster_date date, p_action text, p_assignments jsonb,
  p_override_reason text, p_history_reason text, p_changed_by text
)
returns void language plpgsql security definer set search_path = ''
as $function$
declare
  v_action text := lower(trim(coalesce(p_action, '')));
  v_changed_by text := trim(coalesce(p_changed_by, ''));
  v_override_reason text := trim(coalesce(p_override_reason, ''));
  v_previous_assignments jsonb := '{}'::jsonb;
  v_mode text := coalesce(nullif(trim(p_assignments ->> 'mode'), ''), '6');
  v_permanent_names text[];
  v_active_names text[];
  v_required_keys text[];
  v_expected_key_count integer;
  v_key text;
begin
  if not public.is_shift_member() then raise exception 'Only active shift members can change night roles.'; end if;
  if p_roster_date is null then raise exception 'A roster date is required.'; end if;
  if length(v_changed_by) = 0 then raise exception 'The person making the change is required.'; end if;
  if v_action not in ('save', 'reset') then raise exception 'Unsupported night-role action.'; end if;

  select assignments into v_previous_assignments
  from public.night_role_overrides where roster_date = p_roster_date;
  v_previous_assignments := coalesce(v_previous_assignments, '{}'::jsonb);

  if v_action = 'save' then
    if p_assignments is null or jsonb_typeof(p_assignments) <> 'object' then
      raise exception 'Role assignments must be an object.';
    end if;

    select array_remove(array[first1, first2, second1, second2, pager, reliever],null)
    into v_permanent_names
    from public.rotation_versions
    where effective_from <= p_roster_date
    order by effective_from desc limit 1;
    if v_permanent_names is null then raise exception 'The permanent roster for this night is unavailable.'; end if;

    if v_mode = '5' then
      v_required_keys := array['first1', 'first2', 'second1', 'second2', 'fullLW'];
      v_expected_key_count := 6;
      with candidate_names(name) as (
        select trim(permanent_name) from unnest(v_permanent_names) as permanent(permanent_name)
        where not exists (select 1 from public.night_changes c where c.roster_date=p_roster_date and lower(trim(c.absent_name))=lower(trim(permanent_name)))
        union all select trim(c.replacement_name) from public.night_changes c where c.roster_date=p_roster_date and length(trim(coalesce(c.replacement_name,'')))>0
        union all select trim(o.nurse_name) from public.night_overtime o where o.roster_date=p_roster_date and length(trim(coalesce(o.nurse_name,'')))>0
      ), distinct_names as (select min(name) as name from candidate_names where length(name)>0 group by lower(name))
      select array_agg(name order by lower(name)) into v_active_names from distinct_names;
      if coalesce(array_length(v_active_names,1),0)<>5 then raise exception 'A custom five-nurse arrangement requires exactly five nurses working tonight.'; end if;
    elsif v_mode = '6' then
      v_required_keys := array['first1', 'first2', 'second1', 'second2', 'pager', 'reliever'];
      v_expected_key_count := 6;
      with candidate_names(name) as (
        select trim(permanent_name) from unnest(v_permanent_names) as permanent(permanent_name)
        where not exists (select 1 from public.night_changes c where c.roster_date=p_roster_date and lower(trim(c.absent_name))=lower(trim(permanent_name)))
        union all select trim(c.replacement_name) from public.night_changes c where c.roster_date=p_roster_date and length(trim(coalesce(c.replacement_name,'')))>0
        union all select trim(o.nurse_name) from public.night_overtime o where o.roster_date=p_roster_date and length(trim(coalesce(o.nurse_name,'')))>0
      ), distinct_names as (select min(name) as name from candidate_names where length(name)>0 group by lower(name))
      select array_agg(name order by lower(name)) into v_active_names from distinct_names;
      if coalesce(array_length(v_active_names,1),0)<>6 then raise exception 'A six-nurse arrangement requires exactly six nurses working tonight.'; end if;
    elsif v_mode = '7' then
      v_required_keys := array['first1', 'first2', 'second1', 'second2', 'pager', 'reliever', 'seventh'];
      v_expected_key_count := 8;
      with candidate_names(name) as (
        select trim(permanent_name) from unnest(v_permanent_names) as permanent(permanent_name)
        where not exists (select 1 from public.night_changes c where c.roster_date=p_roster_date and lower(trim(c.absent_name))=lower(trim(permanent_name)))
        union all select trim(c.replacement_name) from public.night_changes c where c.roster_date=p_roster_date and length(trim(coalesce(c.replacement_name,'')))>0
        union all select trim(o.nurse_name) from public.night_overtime o where o.roster_date=p_roster_date and length(trim(coalesce(o.nurse_name,'')))>0
      ), distinct_names as (select min(name) as name from candidate_names where length(name)>0 group by lower(name))
      select array_agg(name order by lower(name)) into v_active_names from distinct_names;
      if coalesce(array_length(v_active_names,1),0)<>7 then raise exception 'A custom seven-nurse arrangement requires exactly seven nurses working tonight.'; end if;
    else
      raise exception 'Unsupported night-role arrangement.';
    end if;

    if (select count(*) from jsonb_object_keys(p_assignments)) <> v_expected_key_count
       or exists (select 1 from jsonb_object_keys(p_assignments) as supplied(supplied_key) where supplied_key <> 'mode' and not (supplied_key = any(v_required_keys)))
       or (v_mode in ('5','7') and p_assignments ->> 'mode' <> v_mode)
       or (v_mode = '6' and p_assignments ? 'mode') then raise exception 'The role assignment structure is invalid.'; end if;
    foreach v_key in array v_required_keys loop
      if length(trim(coalesce(p_assignments ->> v_key, ''))) = 0 then raise exception 'Every role must have a nurse.'; end if;
    end loop;
    if exists (select 1 from jsonb_each_text(p_assignments) as assignment(key,value) where key <> 'mode' and not exists (select 1 from unnest(v_active_names) as active(active_name) where lower(trim(active_name))=lower(trim(value)))) then raise exception 'Assignments must use only the nurses working this night.'; end if;
    if (select count(distinct lower(trim(value))) from jsonb_each_text(p_assignments) where key <> 'mode') <> array_length(v_required_keys,1) then raise exception 'Each role must have a different nurse.'; end if;
    if length(v_override_reason)=0 or length(v_override_reason)>120 then raise exception 'A reason of 1 to 120 characters is required.'; end if;

    insert into public.night_role_overrides (roster_date, assignments, reason, updated_by, updated_at)
    values (p_roster_date,p_assignments,v_override_reason,v_changed_by,now())
    on conflict (roster_date) do update set assignments=excluded.assignments,reason=excluded.reason,updated_by=excluded.updated_by,updated_at=excluded.updated_at;
    insert into public.night_role_override_history (roster_date,action,assignments,reason,changed_by,changed_at)
    values (p_roster_date,'saved',p_assignments,coalesce(nullif(trim(p_history_reason),''),v_override_reason),v_changed_by,now());
  else
    delete from public.night_role_overrides where roster_date=p_roster_date;
    insert into public.night_role_override_history (roster_date,action,assignments,reason,changed_by,changed_at)
    values (p_roster_date,'reset',v_previous_assignments,coalesce(nullif(trim(p_history_reason),''),'Reset to calculated roster'),v_changed_by,now());
  end if;
end
$function$;

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
  where not public.rotation_establishment_valid_v55(r.base_size,
    case when r.base_size=5 then array[r.first1,r.first2,r.second1,r.second2,r.pager]
      else array[r.first1,r.first2,r.second1,r.second2,r.pager,r.reliever] end,
    r.reliever,r.seventh_cycle,r.seventh_anchor);

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
  v_boundary date;
begin
  if auth.uid() is null then
    raise exception 'PERMISSION_DENIED';
  end if;

  v_snapshot:=public.get_roster_startup_v37();
  if not public.app_version_at_least_v49(p_client_version,'54.0') then
    select min(effective_from) into v_boundary from public.rotation_versions where base_size=5;
    if v_boundary is not null then
      v_snapshot:=jsonb_set(v_snapshot,'{rotation_versions}',
        (select coalesce(jsonb_agg(item order by item->>'effective_from'),'[]'::jsonb)
         from jsonb_array_elements(v_snapshot->'rotation_versions') item
         where (item->>'effective_from')::date<v_boundary));
      v_snapshot:=jsonb_set(v_snapshot,'{roster_settings,published_until}',to_jsonb(least(
        (v_snapshot#>>'{roster_settings,published_until}')::date,v_boundary-4)));
    end if;
  end if;

  select access_epoch into v_epoch
  from public.app_access_signal
  where id=1;

  return v_snapshot || jsonb_build_object(
    'night_team_identity',coalesce((
      with identity as (
        select
          item.nickname,item.tagline,item.avatar_path,item.accent_key,item.symbol,
          item.updated_by,item.updated_by_user_id,item.updated_at
        from public.night_team_identity item
        order by item.updated_at desc,item.roster_date desc
        limit 1
      ),
      bounds as (
        select
          min(v.effective_from)::date as anchor_date,
          (select s.published_until::date from public.roster_settings s where s.id=1) as published_until
        from public.rotation_versions v
      ),
      roster_dates as (
        select generated::date as roster_date
        from bounds b
        cross join lateral generate_series(
          b.anchor_date::timestamp,
          b.published_until::timestamp,
          interval '4 days'
        ) generated
      )
      select jsonb_agg(
        jsonb_build_object(
          'roster_date',d.roster_date,
          'nickname',i.nickname,
          'tagline',i.tagline,
          'avatar_path',i.avatar_path,
          'accent_key',i.accent_key,
          'symbol',i.symbol,
          'updated_by',i.updated_by,
          'updated_by_user_id',i.updated_by_user_id,
          'updated_at',i.updated_at
        )
        order by d.roster_date
      )
      from identity i
      cross join roster_dates d
    ),'[]'::jsonb),
    'access_epoch',coalesce(v_epoch,0),
    'compatibility',public.get_app_compatibility_v49(p_client_version)
  );
end
$$;

create or replace function public.calculated_roster_v55(p_date date)
returns jsonb language plpgsql stable security invoker set search_path='' as $$
declare v public.rotation_versions; names text[]; slots text[]; step integer; shift integer; i integer; cycle text[]; anchor integer;
begin
  select * into v from public.rotation_versions where effective_from<=p_date order by effective_from desc limit 1;
  if v.id is null or mod(p_date-date '2026-06-30',4)<>0 then raise exception 'INVALID_ROSTER_DATE'; end if;
  names:=array_remove(array[v.first1,v.first2,v.second1,v.second2,v.pager,v.reliever],null);
  step:=(p_date-v.effective_from)/4; shift:=mod(step,v.base_size);
  for i in 0..v.base_size-1 loop slots:=array_append(slots,names[1+mod(i-shift+v.base_size,v.base_size)]); end loop;
  select array_agg(n order by ord) into cycle from jsonb_array_elements_text(v.seventh_cycle) with ordinality t(n,ord);
  anchor:=array_position(cycle,v.seventh_anchor)-1;
  return jsonb_build_object('date',p_date,'first1',slots[1],'first2',slots[2],'second1',slots[3],'second2',slots[4],
    'pager',slots[5],'reliever',case when v.base_size=6 then slots[6] else null end,
    'fullLW',slots[5],'mode',v.base_size::text,'seventh',cycle[1+mod(mod(anchor-step,cardinality(cycle))+cardinality(cycle),cardinality(cycle))]);
end
$$;
revoke all on function public.calculated_roster_v55(date) from public,anon,authenticated;

-- Fail closed if the verified production source changed before this migration.
do $$
declare before_rows jsonb; after_rows jsonb;
begin
  select jsonb_agg(to_jsonb(r) order by effective_from) into before_rows from public.rotation_versions r;
  if jsonb_array_length(before_rows)<>1
     or before_rows->0->>'effective_from'<>'2026-06-30'
     or before_rows->0->>'first1'<>'James' or before_rows->0->>'first2'<>'Michael G'
     or before_rows->0->>'second1'<>'Andre' or before_rows->0->>'second2'<>'Michael D'
     or before_rows->0->>'pager'<>'Yentl' or before_rows->0->>'reliever'<>'Shaun'
     or public.calculated_roster_v55(date '2026-10-08')->>'pager'<>'Michael D' then
    raise exception 'VERIFIED_ESTABLISHMENT_SOURCE_CHANGED';
  end if;
  insert into public.rotation_versions(effective_from,base_size,first1,first2,second1,second2,pager,reliever,seventh_anchor,seventh_cycle,notes,updated_by)
  values(date '2026-10-12',5,'Shaun','James','Michael G','Michael D','Andre',null,'Andre',
    '["James","Michael G","Andre","Michael D","Shaun","OT Nurse"]'::jsonb,
    'Five permanent nurses from 12 October 2026; Yentl leaves future rostering. Historical nights preserved.','System migration · establishment approved');
  select jsonb_agg(to_jsonb(r) order by effective_from) into after_rows from public.rotation_versions r where effective_from<date '2026-10-12';
  if before_rows is distinct from after_rows or public.calculated_roster_v55(date '2026-10-12')->>'pager'<>'Andre' then
    raise exception 'ESTABLISHMENT_PRESERVATION_FAILED';
  end if;
end
$$;

update public.app_compatibility set minimum_write_version='54.0',recommended_version='54.0',updated_at=now() where id=1;
update public.app_schema_version set version=55,updated_at=now() where id=1;
commit;
