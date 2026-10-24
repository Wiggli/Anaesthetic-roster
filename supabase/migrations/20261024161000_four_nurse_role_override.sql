begin;

create or replace function public.apply_night_role_override_v57(
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
declare
  v_actor text;
  v_action text := lower(trim(coalesce(p_action,'')));
  v_reason text := trim(coalesce(p_override_reason,''));
  v_base jsonb;
  v_required_keys text[] := array['first1','first2','second1','second2'];
  v_active_names text[];
  v_key text;
  v_unique_count integer;
begin
  perform public.assert_app_write_compatible_v49(p_client_version);
  v_actor:=public.current_roster_actor_name_v49();

  if v_action='save' and coalesce(p_assignments->>'mode','')='4' then
    if not public.claim_roster_operation_v48(p_operation_id,'roles-save',p_roster_date,p_expected_sync_revision) then return; end if;
    perform public.assert_roster_fresh_v48(p_expected_sync_revision);

    if p_roster_date is null then raise exception 'A roster date is required.'; end if;
    if p_assignments is null or jsonb_typeof(p_assignments)<>'object' then raise exception 'Role assignments must be an object.'; end if;
    if length(v_reason)=0 or length(v_reason)>120 then raise exception 'A reason of 1 to 120 characters is required.'; end if;

    v_base:=public.calculated_roster_v55(p_roster_date);
    if coalesce(v_base->>'mode','')<>'5' then raise exception 'A four-nurse arrangement is only available from the five-person establishment.'; end if;

    if exists (select 1 from public.night_overtime o where o.roster_date=p_roster_date) then
      raise exception 'Four-nurse reassignment is unavailable while overtime cover is recorded.';
    end if;
    if exists (
      select 1 from public.night_changes c
      where c.roster_date=p_roster_date and length(trim(coalesce(c.replacement_name,'')))>0
    ) then raise exception 'Four-nurse reassignment is unavailable while replacement cover is recorded.'; end if;

    if (
      select count(*) from public.night_changes c
      where c.roster_date=p_roster_date
        and lower(trim(c.absent_name)) in (
          lower(trim(v_base->>'first1')),lower(trim(v_base->>'first2')),
          lower(trim(v_base->>'second1')),lower(trim(v_base->>'second2')),
          lower(trim(coalesce(v_base->>'fullLW',v_base->>'pager')))
        )
    )<>1 then raise exception 'A four-nurse arrangement requires exactly one absence from the five-person team.'; end if;

    if (select count(*) from jsonb_object_keys(p_assignments))<>5
      or not (p_assignments ? 'mode')
      or exists (
        select 1 from jsonb_object_keys(p_assignments) supplied(key)
        where key<>'mode' and not (key=any(v_required_keys))
      ) then raise exception 'The four-nurse role assignment structure is invalid.'; end if;

    foreach v_key in array v_required_keys loop
      if length(trim(coalesce(p_assignments->>v_key,'')))=0 then raise exception 'Every theatre position must have a nurse.'; end if;
    end loop;

    with candidate_names(name) as (
      select value from jsonb_array_elements_text(jsonb_build_array(
        v_base->>'first1',v_base->>'first2',v_base->>'second1',v_base->>'second2',coalesce(v_base->>'fullLW',v_base->>'pager')
      )) value
      where not exists (
        select 1 from public.night_changes c
        where c.roster_date=p_roster_date and lower(trim(c.absent_name))=lower(trim(value))
      )
    ), distinct_names as (
      select min(trim(name)) name from candidate_names where length(trim(coalesce(name,'')))>0 group by lower(trim(name))
    )
    select array_agg(name order by lower(name)) into v_active_names from distinct_names;

    if coalesce(array_length(v_active_names,1),0)<>4 then raise exception 'Exactly four nurses must be working for this arrangement.'; end if;

    select count(distinct lower(trim(value))) into v_unique_count
    from jsonb_each_text(p_assignments)
    where key<>'mode';
    if v_unique_count<>4 then raise exception 'Each theatre position must have a different nurse.'; end if;

    if exists (
      select 1 from jsonb_each_text(p_assignments) assignment(key,value)
      where key<>'mode' and not exists (
        select 1 from unnest(v_active_names) active(name)
        where lower(trim(active.name))=lower(trim(assignment.value))
      )
    ) then raise exception 'Assignments must use only the four nurses working this night.'; end if;

    insert into public.night_role_overrides(roster_date,assignments,reason,updated_by,updated_at)
    values(p_roster_date,p_assignments,v_reason,v_actor,now())
    on conflict(roster_date) do update set assignments=excluded.assignments,reason=excluded.reason,updated_by=excluded.updated_by,updated_at=excluded.updated_at;

    insert into public.night_role_override_history(roster_date,action,assignments,reason,changed_by,changed_at)
    values(p_roster_date,'saved',p_assignments,coalesce(nullif(trim(p_history_reason),''),v_reason),v_actor,now());
    return;
  end if;

  perform public.apply_night_role_override_v49(
    p_roster_date,p_action,p_assignments,p_override_reason,p_history_reason,
    p_operation_id,p_expected_sync_revision,p_client_version
  );
end
$$;

revoke all on function public.apply_night_role_override_v57(date,text,jsonb,text,text,uuid,bigint,text)
from public,anon,authenticated;
grant execute on function public.apply_night_role_override_v57(date,text,jsonb,text,text,uuid,bigint,text)
to authenticated;

commit;
