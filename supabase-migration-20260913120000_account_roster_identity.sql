-- Schema 34: administrator-reviewed account-to-roster identity binding.

alter table public.allowed_users
add column if not exists roster_name text;

create unique index if not exists allowed_users_roster_name_unique
on public.allowed_users (lower(roster_name))
where roster_name is not null and length(trim(roster_name)) > 0;

create or replace function public.set_roster_identity_v34(
  p_email text,
  p_roster_name text
)
returns void
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_email text := lower(trim(coalesce(p_email, '')));
  v_roster_name text := nullif(trim(coalesce(p_roster_name, '')), '');
begin
  if not exists (
    select 1
    from public.allowed_users
    where lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
      and active
      and user_role = 'admin'
  ) then
    raise exception 'Only an active roster administrator can bind roster identities.';
  end if;

  if length(v_email) = 0 then
    raise exception 'An authorised account email is required.';
  end if;

  if v_roster_name is not null and not exists (
    select 1
    from public.rotation_versions v
    where v_roster_name = any(array[
      v.first1, v.first2, v.second1, v.second2, v.pager, v.reliever
    ])
  ) then
    raise exception 'The roster identity must match a permanent internal roster name.';
  end if;

  update public.allowed_users
  set roster_name = v_roster_name
  where lower(email) = v_email;

  if not found then
    raise exception 'The authorised account was not found.';
  end if;
end
$function$;

revoke all on function public.set_roster_identity_v34(text, text)
from public, anon;

grant execute on function public.set_roster_identity_v34(text, text)
to authenticated;

do $sync_trigger$
begin
  if to_regprocedure('public.bump_app_sync_state_v33()') is not null then
    drop trigger if exists bump_app_sync_state_v33 on public.allowed_users;
    create trigger bump_app_sync_state_v33
    after insert or update or delete on public.allowed_users
    for each statement execute function public.bump_app_sync_state_v33();
  end if;
end
$sync_trigger$;

update public.app_schema_version
set version = 34
where id = 1;
