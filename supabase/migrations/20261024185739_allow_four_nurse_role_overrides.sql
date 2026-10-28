create or replace function public.night_role_assignments_valid_v57(p_assignments jsonb)
returns boolean
language sql
immutable
set search_path to 'public'
as $function$
  select case
    when p_assignments is null or jsonb_typeof(p_assignments) <> 'object' then false
    when p_assignments ->> 'mode' = '4' then
      p_assignments ?& array['mode','first1','first2','second1','second2']
      and p_assignments - array['mode','first1','first2','second1','second2'] = '{}'::jsonb
      and (
        select count(*) = 4
          and count(distinct lower(trim(value))) = 4
          and bool_and(length(trim(value)) > 0)
        from jsonb_each_text(p_assignments)
        where key <> 'mode'
      )
    else public.night_role_assignments_valid_v38(p_assignments)
  end;
$function$;

alter table public.night_role_overrides
  drop constraint if exists night_role_overrides_valid;

alter table public.night_role_overrides
  add constraint night_role_overrides_valid
  check (public.night_role_assignments_valid_v57(assignments));