-- Repair validation of a stored draw superseded by staffing changes.
begin;

create or replace function public.validate_night_plan_v58(
  p_roster_date date,
  p_assignments jsonb,
  p_labour_first text,
  p_labour_second text,
  p_finalising boolean
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

  -- The client ignores a seven-person override when its team no longer matches.
  -- Retain that historical record while validating the proposed current cover.
  if p_roster_date >= date '2026-11-21'
     and v_role_assignments->>'mode' = '7'
     and (
       v_active_count <> 7
       or exists (
         select 1 from jsonb_each_text(v_role_assignments) assignment(key,value)
         where key <> 'mode'
           and not exists (
             select 1 from unnest(v_active_names) active(active_name)
             where lower(trim(active_name)) = lower(trim(value))
           )
       )
     ) then
    v_role_assignments := null;
  end if;

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

  if (p_labour_first is null) <> (p_labour_second is null) then
    raise exception 'PLAN_INCOMPLETE';
  end if;

  if p_labour_first is not null then
    if p_roster_date >= date '2026-11-21' and v_active_count <> 6 then
      raise exception 'PLAN_INCOMPLETE';
    end if;
    v_labour_first := p_labour_first;
    v_labour_second := p_labour_second;
  elsif p_roster_date < date '2026-11-21'
        or (p_finalising and v_active_count = 6) then
    select first_part_name,second_part_name
    into v_labour_first,v_labour_second
    from public.night_labour_order
    where roster_date=p_roster_date;

    if p_roster_date >= date '2026-11-21'
       and (v_labour_first is null or v_labour_second is null) then
      raise exception 'PLAN_INCOMPLETE';
    end if;
  end if;

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

revoke all on function public.validate_night_plan_v58(date,jsonb,text,text,boolean)
from public,anon,authenticated;


commit;
