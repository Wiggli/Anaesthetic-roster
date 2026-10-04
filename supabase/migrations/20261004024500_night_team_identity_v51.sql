begin;

create table public.night_team_identity (
  roster_date date primary key,
  nickname text not null,
  updated_by text not null,
  updated_by_user_id uuid not null,
  updated_at timestamptz not null default now(),
  constraint night_team_identity_nickname_length
    check (char_length(trim(nickname)) between 1 and 28),
  constraint night_team_identity_nickname_trimmed
    check (nickname = trim(nickname)),
  constraint night_team_identity_nickname_plain_text
    check (nickname !~ '[[:cntrl:]]')
);

alter table public.night_team_identity enable row level security;

revoke all privileges on table public.night_team_identity from public, anon, authenticated;
grant select on table public.night_team_identity to authenticated;

create policy "Active shift members can view night team identity"
on public.night_team_identity
for select
to authenticated
using ((select public.is_shift_member()));

create or replace function public.set_night_team_identity_v51(
  p_roster_date date,
  p_nickname text,
  p_client_version text
)
returns jsonb
language plpgsql
security definer
set search_path=''
as $$
declare
  v_nickname text;
  v_actor text;
  v_anchor date;
  v_published_until date;
  v_row public.night_team_identity%rowtype;
begin
  perform public.assert_app_write_compatible_v49(p_client_version);

  if p_roster_date is null then
    raise exception 'INVALID_ROSTER_DATE';
  end if;

  select min(v.effective_from) into v_anchor
  from public.rotation_versions v;

  select s.published_until into v_published_until
  from public.roster_settings s
  where s.id=1;

  if v_anchor is null
     or v_published_until is null
     or p_roster_date < v_anchor
     or p_roster_date > v_published_until
     or mod(p_roster_date-v_anchor,4) <> 0 then
    raise exception 'INVALID_ROSTER_DATE';
  end if;

  v_nickname:=regexp_replace(trim(coalesce(p_nickname,'')), '[[:space:]]+', ' ', 'g');

  if v_nickname='' then
    delete from public.night_team_identity
    where roster_date=p_roster_date;

    return jsonb_build_object(
      'roster_date',p_roster_date,
      'nickname',null,
      'cleared',true
    );
  end if;

  if char_length(v_nickname)>28 or v_nickname ~ '[[:cntrl:]]' then
    raise exception 'INVALID_SHIFT_NICKNAME';
  end if;

  v_actor:=public.current_roster_actor_name_v49();

  insert into public.night_team_identity(
    roster_date,nickname,updated_by,updated_by_user_id,updated_at
  )
  values(
    p_roster_date,v_nickname,v_actor,auth.uid(),now()
  )
  on conflict (roster_date) do update
  set nickname=excluded.nickname,
      updated_by=excluded.updated_by,
      updated_by_user_id=excluded.updated_by_user_id,
      updated_at=excluded.updated_at
  returning * into v_row;

  return jsonb_build_object(
    'roster_date',v_row.roster_date,
    'nickname',v_row.nickname,
    'updated_by',v_row.updated_by,
    'updated_by_user_id',v_row.updated_by_user_id,
    'updated_at',v_row.updated_at,
    'cleared',false
  );
end
$$;

revoke all on function public.set_night_team_identity_v51(date,text,text)
from public, anon, authenticated;
grant execute on function public.set_night_team_identity_v51(date,text,text)
to authenticated;

drop trigger if exists bump_app_sync_state_v51 on public.night_team_identity;
create trigger bump_app_sync_state_v51
after insert or update or delete on public.night_team_identity
for each statement execute function public.bump_app_sync_state_v33();

drop trigger if exists audit_night_team_identity_v51 on public.night_team_identity;
create trigger audit_night_team_identity_v51
after insert or update or delete on public.night_team_identity
for each row execute function public.capture_roster_audit_v50();

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname='supabase_realtime'
      and schemaname='public'
      and tablename='night_team_identity'
  ) then
    alter publication supabase_realtime add table public.night_team_identity;
  end if;
end
$$;

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
    'night_team_identity',coalesce((
      select jsonb_agg(to_jsonb(item) order by item.roster_date)
      from public.night_team_identity item
    ),'[]'::jsonb),
    'access_epoch',coalesce(v_epoch,0),
    'compatibility',public.get_app_compatibility_v49(p_client_version)
  );
end
$$;

revoke all on function public.get_roster_startup_v49(text)
from public, anon, authenticated;
grant execute on function public.get_roster_startup_v49(text)
to authenticated;

update public.app_schema_version
set version=51,updated_at=now()
where id=1;

commit;
