-- Global shift identity v52.
-- Reinterprets the schema-51 night nickname as one shared team identity while
-- keeping the existing table and RPC name compatible with installed clients.
-- Startup snapshots expand the single stored identity across every roster night,
-- so 43.4 clients also stop losing the name when a different date is selected.

begin;

-- Keep only the most recently edited legacy row, then move it to the stable
-- rotation anchor. The roster_date column remains as a compatibility storage key.
with latest as (
  select roster_date
  from public.night_team_identity
  order by updated_at desc, roster_date desc
  limit 1
)
delete from public.night_team_identity item
where exists (select 1 from latest)
  and item.roster_date <> (select roster_date from latest);

update public.night_team_identity
set roster_date=(select min(v.effective_from)::date from public.rotation_versions v)
where (select min(v.effective_from)::date from public.rotation_versions v) is not null
  and roster_date is distinct from (select min(v.effective_from)::date from public.rotation_versions v);

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
    delete from public.night_team_identity;

    return jsonb_build_object(
      'roster_date',p_roster_date,
      'nickname',null,
      'cleared',true,
      'scope','shift'
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
    v_anchor,v_nickname,v_actor,auth.uid(),now()
  )
  on conflict (roster_date) do update
  set nickname=excluded.nickname,
      updated_by=excluded.updated_by,
      updated_by_user_id=excluded.updated_by_user_id,
      updated_at=excluded.updated_at
  returning * into v_row;

  return jsonb_build_object(
    'roster_date',p_roster_date,
    'nickname',v_row.nickname,
    'updated_by',v_row.updated_by,
    'updated_by_user_id',v_row.updated_by_user_id,
    'updated_at',v_row.updated_at,
    'cleared',false,
    'scope','shift'
  );
end
$$;

revoke all on function public.set_night_team_identity_v51(date,text,text)
from public, anon, authenticated;
grant execute on function public.set_night_team_identity_v51(date,text,text)
to authenticated;

-- Preserve the startup RPC contract used by installed clients, but project the
-- single shift identity onto every valid roster date. This makes the global
-- semantics backward-compatible with 43.4 without duplicating stored rows.
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
      with identity as (
        select item.nickname,item.updated_by,item.updated_by_user_id,item.updated_at
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

revoke all on function public.get_roster_startup_v49(text)
from public, anon, authenticated;
grant execute on function public.get_roster_startup_v49(text)
to authenticated;

update public.app_schema_version
set version=52,updated_at=now()
where id=1;

commit;
