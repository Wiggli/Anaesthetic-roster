-- Schema 37: return one authorised, internally consistent startup snapshot.

create or replace function public.get_roster_startup_v37()
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $function$
declare
  v_email text := lower(trim(coalesce(auth.jwt() ->> 'email', '')));
  v_profile jsonb;
begin
  select jsonb_build_object(
    'email', account.email,
    'display_name', account.display_name,
    'user_role', account.user_role,
    'active', account.active
  )
  into v_profile
  from public.allowed_users account
  where lower(account.email) = v_email
    and account.active
  limit 1;

  if v_profile is null then
    raise exception 'This account is not an active Night Roster member.'
      using errcode = '42501';
  end if;

  return jsonb_build_object(
    'profile', v_profile,
    'night_changes', coalesce((
      select jsonb_agg(to_jsonb(item) order by item.updated_at)
      from public.night_changes item
    ), '[]'::jsonb),
    'night_overtime', coalesce((
      select jsonb_agg(to_jsonb(item) order by item.updated_at)
      from public.night_overtime item
    ), '[]'::jsonb),
    'night_five_cover', coalesce((
      select jsonb_agg(to_jsonb(item) order by item.roster_date)
      from public.night_five_cover item
    ), '[]'::jsonb),
    'roster_settings', (
      select to_jsonb(item)
      from public.roster_settings item
      where item.id = 1
    ),
    'rotation_versions', coalesce((
      select jsonb_agg(to_jsonb(item) order by item.effective_from)
      from public.rotation_versions item
    ), '[]'::jsonb),
    'night_labour_order', coalesce((
      select jsonb_agg(to_jsonb(item) order by item.roster_date)
      from public.night_labour_order item
    ), '[]'::jsonb),
    'night_plan_status', coalesce((
      select jsonb_agg(to_jsonb(item) order by item.roster_date)
      from public.night_plan_status item
    ), '[]'::jsonb),
    'night_role_overrides', coalesce((
      select jsonb_agg(to_jsonb(item) order by item.roster_date)
      from public.night_role_overrides item
    ), '[]'::jsonb),
    'app_settings', (
      select to_jsonb(item)
      from public.app_settings item
      where item.id = 1
    ),
    'schema_version', coalesce((
      select item.version
      from public.app_schema_version item
      where item.id = 1
    ), 0),
    'sync_revision', coalesce((
      select item.revision
      from public.app_sync_state item
      where item.id = 1
    ), 0)
  );
end
$function$;

revoke all on function public.get_roster_startup_v37()
from public, anon;

grant execute on function public.get_roster_startup_v37()
to authenticated;

update public.app_schema_version
set version = 37
where id = 1;
