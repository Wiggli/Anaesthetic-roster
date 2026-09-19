-- Schema 39: correct the schema-38 seven-nurse override key count.
-- A mode-7 payload contains seven role keys plus the required mode key.

create or replace function public.apply_night_role_override_v35(
  p_roster_date date, p_action text, p_assignments jsonb,
  p_override_reason text, p_history_reason text, p_changed_by text
)
returns void language plpgsql security definer set search_path = public
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

    select array[first1, first2, second1, second2, pager, reliever]
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
      v_active_names := v_permanent_names;
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

update public.app_schema_version set version=39 where id=1;
