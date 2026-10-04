-- Personalisation Studio v53.
-- Adds private per-user presentation preferences, one shared shift identity card,
-- and a private team-only image bucket without changing clinical colour semantics.

begin;

alter table public.user_profiles
  add column if not exists accent_key text not null default 'teal',
  add column if not exists text_scale text not null default 'standard',
  add column if not exists motion_pref text not null default 'system',
  add column if not exists avatar_style text not null default 'photo',
  add column if not exists greeting_enabled boolean not null default true;

alter table public.user_profiles drop constraint if exists user_profiles_accent_key_check;
alter table public.user_profiles add constraint user_profiles_accent_key_check
  check (accent_key in ('teal','blue','violet','rose','amber','graphite'));
alter table public.user_profiles drop constraint if exists user_profiles_text_scale_check;
alter table public.user_profiles add constraint user_profiles_text_scale_check
  check (text_scale in ('standard','large','xlarge'));
alter table public.user_profiles drop constraint if exists user_profiles_motion_pref_check;
alter table public.user_profiles add constraint user_profiles_motion_pref_check
  check (motion_pref in ('system','reduced'));
alter table public.user_profiles drop constraint if exists user_profiles_avatar_style_check;
alter table public.user_profiles add constraint user_profiles_avatar_style_check
  check (avatar_style in ('photo','monogram','spark'));

alter table public.night_team_identity
  add column if not exists tagline text,
  add column if not exists avatar_path text,
  add column if not exists accent_key text not null default 'teal',
  add column if not exists symbol text not null default 'spark';

alter table public.night_team_identity drop constraint if exists night_team_identity_tagline_check;
alter table public.night_team_identity add constraint night_team_identity_tagline_check
  check (tagline is null or (char_length(tagline) <= 56 and tagline !~ '[[:cntrl:]]'));
alter table public.night_team_identity drop constraint if exists night_team_identity_accent_key_check;
alter table public.night_team_identity add constraint night_team_identity_accent_key_check
  check (accent_key in ('teal','blue','violet','rose','amber','graphite'));
alter table public.night_team_identity drop constraint if exists night_team_identity_symbol_check;
alter table public.night_team_identity add constraint night_team_identity_symbol_check
  check (symbol in ('spark','moon','cross','diamond','dot','star'));
alter table public.night_team_identity drop constraint if exists night_team_identity_avatar_path_check;
alter table public.night_team_identity add constraint night_team_identity_avatar_path_check
  check (avatar_path is null or avatar_path = 'shift/avatar.jpg');

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values(
  'shift-identity',
  'shift-identity',
  false,
  4194304,
  array['image/jpeg','image/png','image/webp']
)
on conflict (id) do update
set public=false,
    file_size_limit=excluded.file_size_limit,
    allowed_mime_types=excluded.allowed_mime_types;

drop policy if exists "Shift members can view shift identity image" on storage.objects;
create policy "Shift members can view shift identity image"
on storage.objects for select
to authenticated
using (
  bucket_id='shift-identity'
  and name='shift/avatar.jpg'
  and public.is_shift_member()
);

drop policy if exists "Shift members can add shift identity image" on storage.objects;
create policy "Shift members can add shift identity image"
on storage.objects for insert
to authenticated
with check (
  bucket_id='shift-identity'
  and name='shift/avatar.jpg'
  and public.is_shift_member()
);

drop policy if exists "Shift members can update shift identity image" on storage.objects;
create policy "Shift members can update shift identity image"
on storage.objects for update
to authenticated
using (
  bucket_id='shift-identity'
  and name='shift/avatar.jpg'
  and public.is_shift_member()
)
with check (
  bucket_id='shift-identity'
  and name='shift/avatar.jpg'
  and public.is_shift_member()
);

drop policy if exists "Shift members can remove shift identity image" on storage.objects;
create policy "Shift members can remove shift identity image"
on storage.objects for delete
to authenticated
using (
  bucket_id='shift-identity'
  and name='shift/avatar.jpg'
  and public.is_shift_member()
);

create or replace function public.set_shift_identity_v53(
  p_nickname text,
  p_tagline text,
  p_accent_key text,
  p_symbol text,
  p_avatar_path text,
  p_client_version text
)
returns jsonb
language plpgsql
security definer
set search_path=''
as $$
declare
  v_nickname text;
  v_tagline text;
  v_accent text;
  v_symbol text;
  v_avatar_path text;
  v_actor text;
  v_anchor date;
  v_row public.night_team_identity%rowtype;
begin
  perform public.assert_app_write_compatible_v49(p_client_version);

  if auth.uid() is null or not public.is_shift_member() then
    raise exception 'PERMISSION_DENIED';
  end if;

  select min(v.effective_from)::date into v_anchor
  from public.rotation_versions v;

  if v_anchor is null then
    raise exception 'INVALID_ROSTER_DATE';
  end if;

  v_nickname:=regexp_replace(trim(coalesce(p_nickname,'')), '[[:space:]]+', ' ', 'g');
  v_tagline:=nullif(regexp_replace(trim(coalesce(p_tagline,'')), '[[:space:]]+', ' ', 'g'),'');
  v_accent:=lower(trim(coalesce(p_accent_key,'teal')));
  v_symbol:=lower(trim(coalesce(p_symbol,'spark')));
  v_avatar_path:=nullif(trim(coalesce(p_avatar_path,'')),'');

  if v_nickname='' or char_length(v_nickname)>28 or v_nickname ~ '[[:cntrl:]]' then
    raise exception 'INVALID_SHIFT_NICKNAME';
  end if;
  if v_tagline is not null and (char_length(v_tagline)>56 or v_tagline ~ '[[:cntrl:]]') then
    raise exception 'INVALID_SHIFT_TAGLINE';
  end if;
  if v_accent not in ('teal','blue','violet','rose','amber','graphite') then
    raise exception 'INVALID_SHIFT_ACCENT';
  end if;
  if v_symbol not in ('spark','moon','cross','diamond','dot','star') then
    raise exception 'INVALID_SHIFT_SYMBOL';
  end if;
  if v_avatar_path is not null and v_avatar_path <> 'shift/avatar.jpg' then
    raise exception 'INVALID_SHIFT_AVATAR';
  end if;

  v_actor:=public.current_roster_actor_name_v49();

  insert into public.night_team_identity(
    roster_date,nickname,tagline,avatar_path,accent_key,symbol,
    updated_by,updated_by_user_id,updated_at
  )
  values(
    v_anchor,v_nickname,v_tagline,v_avatar_path,v_accent,v_symbol,
    v_actor,auth.uid(),now()
  )
  on conflict (roster_date) do update
  set nickname=excluded.nickname,
      tagline=excluded.tagline,
      avatar_path=excluded.avatar_path,
      accent_key=excluded.accent_key,
      symbol=excluded.symbol,
      updated_by=excluded.updated_by,
      updated_by_user_id=excluded.updated_by_user_id,
      updated_at=excluded.updated_at
  returning * into v_row;

  return jsonb_build_object(
    'roster_date',v_row.roster_date,
    'nickname',v_row.nickname,
    'tagline',v_row.tagline,
    'avatar_path',v_row.avatar_path,
    'accent_key',v_row.accent_key,
    'symbol',v_row.symbol,
    'updated_by',v_row.updated_by,
    'updated_at',v_row.updated_at,
    'scope','shift'
  );
end
$$;

revoke all on function public.set_shift_identity_v53(text,text,text,text,text,text)
from public, anon, authenticated;
grant execute on function public.set_shift_identity_v53(text,text,text,text,text,text)
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

revoke all on function public.get_roster_startup_v49(text)
from public, anon, authenticated;
grant execute on function public.get_roster_startup_v49(text)
to authenticated;

update public.app_schema_version
set version=53,updated_at=now()
where id=1;

commit;
