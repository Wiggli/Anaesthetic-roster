-- Schema 36: allow the reviewed five-nurse night-only assignment shape.
-- Schema 35 added validated RPC support for this shape, but the pre-existing
-- table constraint still accepted only the original six-role JSON object.

create or replace function public.night_role_assignments_valid_v36(
  p_assignments jsonb
)
returns boolean
language sql
immutable
set search_path = public
as $function$
  select case
    when p_assignments is null
      or jsonb_typeof(p_assignments) <> 'object'
      then false
    when p_assignments ->> 'mode' = '5'
      then p_assignments ?& array[
             'mode', 'first1', 'first2', 'second1', 'second2', 'fullLW'
           ]
        and p_assignments - array[
              'mode', 'first1', 'first2', 'second1', 'second2', 'fullLW'
            ] = '{}'::jsonb
        and jsonb_typeof(p_assignments -> 'mode') = 'string'
        and jsonb_typeof(p_assignments -> 'first1') = 'string'
        and jsonb_typeof(p_assignments -> 'first2') = 'string'
        and jsonb_typeof(p_assignments -> 'second1') = 'string'
        and jsonb_typeof(p_assignments -> 'second2') = 'string'
        and jsonb_typeof(p_assignments -> 'fullLW') = 'string'
        and (
          select count(*) = 5
            and count(distinct lower(trim(value))) = 5
            and bool_and(length(trim(value)) > 0)
          from jsonb_each_text(p_assignments)
          where key <> 'mode'
        )
    else p_assignments ?& array[
           'first1', 'first2', 'second1', 'second2', 'pager', 'reliever'
         ]
      and p_assignments - array[
            'first1', 'first2', 'second1', 'second2', 'pager', 'reliever'
          ] = '{}'::jsonb
      and jsonb_typeof(p_assignments -> 'first1') = 'string'
      and jsonb_typeof(p_assignments -> 'first2') = 'string'
      and jsonb_typeof(p_assignments -> 'second1') = 'string'
      and jsonb_typeof(p_assignments -> 'second2') = 'string'
      and jsonb_typeof(p_assignments -> 'pager') = 'string'
      and jsonb_typeof(p_assignments -> 'reliever') = 'string'
      and (
        select count(*) = 6
          and count(distinct lower(trim(value))) = 6
          and bool_and(length(trim(value)) > 0)
        from jsonb_each_text(p_assignments)
      )
  end;
$function$;

revoke all on function public.night_role_assignments_valid_v36(jsonb)
from public, anon;

grant execute on function public.night_role_assignments_valid_v36(jsonb)
to authenticated;

alter table public.night_role_overrides
drop constraint if exists night_role_overrides_valid;

alter table public.night_role_overrides
add constraint night_role_overrides_valid
check (public.night_role_assignments_valid_v36(assignments))
not valid;

alter table public.night_role_overrides
validate constraint night_role_overrides_valid;

update public.app_schema_version
set version = 36
where id = 1;
