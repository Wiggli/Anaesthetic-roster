begin;

create table public.night_shared_pager_order (
  roster_date date primary key,
  nurse_order text[] not null,
  updated_by text not null,
  updated_by_user_id uuid not null,
  updated_at timestamptz not null default now(),
  constraint night_shared_pager_order_four_names check (cardinality(nurse_order)=4),
  constraint night_shared_pager_order_plain_names check (array_to_string(nurse_order,'') !~ '[[:cntrl:]]')
);

create table public.night_shared_pager_order_history (
  id uuid primary key default gen_random_uuid(),
  roster_date date not null,
  nurse_order text[] not null,
  changed_by text not null,
  changed_by_user_id uuid not null,
  changed_at timestamptz not null default now()
);

alter table public.night_shared_pager_order enable row level security;
alter table public.night_shared_pager_order_history enable row level security;

revoke all privileges on table public.night_shared_pager_order from public, anon, authenticated;
revoke all privileges on table public.night_shared_pager_order_history from public, anon, authenticated;
grant select on table public.night_shared_pager_order to authenticated;
grant select on table public.night_shared_pager_order_history to authenticated;

create policy "Active shift members can view shared pager order"
on public.night_shared_pager_order
for select
to authenticated
using ((select public.is_shift_member()));

create policy "Active shift members can view shared pager history"
on public.night_shared_pager_order_history
for select
to authenticated
using ((select public.is_shift_member()));

create or replace function public.set_night_shared_pager_order_v56(
  p_roster_date date,
  p_nurse_order text[],
  p_client_version text
)
returns jsonb
language plpgsql
security definer
set search_path=''
as $$
declare
  v_base jsonb;
  v_mode text;
  v_expected text[];
  v_full_lw text;
  v_absent text;
  v_absence_count integer;
  v_actor text;
  v_existing public.night_shared_pager_order%rowtype;
  v_row public.night_shared_pager_order%rowtype;
  v_match_count integer;
  v_unique_count integer;
begin
  perform public.assert_app_write_compatible_v49(p_client_version);

  if p_roster_date is null then raise exception 'INVALID_ROSTER_DATE'; end if;
  if p_nurse_order is null or cardinality(p_nurse_order)<>4 then raise exception 'INVALID_SHARED_PAGER_ORDER'; end if;

  v_base:=public.calculated_roster_v55(p_roster_date);
  v_mode:=coalesce(v_base->>'mode','');
  if v_mode not in ('5','6') then raise exception 'SHARED_PAGER_NOT_AVAILABLE'; end if;

  if exists (
    select 1 from public.night_overtime o where o.roster_date=p_roster_date
  ) then raise exception 'SHARED_PAGER_NOT_AVAILABLE_WITH_OVERTIME'; end if;

  if exists (
    select 1 from public.night_changes c
    where c.roster_date=p_roster_date
      and coalesce(trim(c.replacement_name),'')<>''
  ) then raise exception 'SHARED_PAGER_NOT_AVAILABLE_WITH_REPLACEMENT'; end if;

  v_expected:=array[
    v_base->>'first1',
    v_base->>'first2',
    v_base->>'second1',
    v_base->>'second2'
  ];

  if v_mode='5' then
    v_full_lw:=coalesce(v_base->>'fullLW',v_base->>'pager');

    select count(*), min(c.absent_name)
    into v_absence_count, v_absent
    from public.night_changes c
    where c.roster_date=p_roster_date
      and lower(trim(c.absent_name)) in (
        lower(trim(v_base->>'first1')), lower(trim(v_base->>'first2')),
        lower(trim(v_base->>'second1')), lower(trim(v_base->>'second2')),
        lower(trim(v_full_lw))
      );

    if v_absence_count<>1 then
      raise exception 'SHARED_PAGER_REQUIRES_ONE_FIVE_PERSON_ABSENCE';
    end if;

    if lower(trim(v_absent))=lower(trim(v_base->>'first1')) then v_expected[1]:=v_full_lw;
    elsif lower(trim(v_absent))=lower(trim(v_base->>'first2')) then v_expected[2]:=v_full_lw;
    elsif lower(trim(v_absent))=lower(trim(v_base->>'second1')) then v_expected[3]:=v_full_lw;
    elsif lower(trim(v_absent))=lower(trim(v_base->>'second2')) then v_expected[4]:=v_full_lw;
    elsif lower(trim(v_absent))<>lower(trim(v_full_lw)) then
      raise exception 'SHARED_PAGER_REQUIRES_FIVE_PERSON_TEAM_MEMBER';
    end if;
  else
    if not exists (
      select 1 from public.night_changes c
      where c.roster_date=p_roster_date
        and lower(trim(c.absent_name))=lower(trim(v_base->>'pager'))
    ) or not exists (
      select 1 from public.night_changes c
      where c.roster_date=p_roster_date
        and lower(trim(c.absent_name))=lower(trim(v_base->>'reliever'))
    ) then raise exception 'SHARED_PAGER_REQUIRES_PAGER_RELIEVER_ABSENCE'; end if;

    if exists (
      select 1 from public.night_changes c
      where c.roster_date=p_roster_date
        and lower(trim(c.absent_name)) in (
          lower(trim(v_base->>'first1')), lower(trim(v_base->>'first2')),
          lower(trim(v_base->>'second1')), lower(trim(v_base->>'second2'))
        )
    ) then raise exception 'SHARED_PAGER_REQUIRES_FOUR_THEATRE_NURSES'; end if;
  end if;

  select count(distinct lower(trim(name))) into v_unique_count
  from unnest(v_expected) name
  where trim(coalesce(name,''))<>'';
  if v_unique_count<>4 then raise exception 'SHARED_PAGER_REQUIRES_FOUR_DISTINCT_THEATRE_NURSES'; end if;

  select count(distinct lower(trim(name))) into v_unique_count
  from unnest(p_nurse_order) name
  where trim(coalesce(name,''))<>'' and char_length(trim(name))<=80;
  if v_unique_count<>4 then raise exception 'INVALID_SHARED_PAGER_ORDER'; end if;

  select count(*) into v_match_count
  from unnest(p_nurse_order) supplied
  where exists (
    select 1 from unnest(v_expected) expected
    where lower(trim(expected))=lower(trim(supplied))
  );
  if v_match_count<>4 then raise exception 'SHARED_PAGER_ORDER_MUST_USE_EFFECTIVE_THEATRE_TEAM'; end if;

  select * into v_existing from public.night_shared_pager_order where roster_date=p_roster_date;
  if v_existing.roster_date is not null and v_existing.nurse_order=p_nurse_order then
    return to_jsonb(v_existing);
  end if;

  v_actor:=public.current_roster_actor_name_v49();

  insert into public.night_shared_pager_order_history(
    roster_date,nurse_order,changed_by,changed_by_user_id,changed_at
  ) values (
    p_roster_date,p_nurse_order,v_actor,auth.uid(),now()
  );

  insert into public.night_shared_pager_order(
    roster_date,nurse_order,updated_by,updated_by_user_id,updated_at
  ) values (
    p_roster_date,p_nurse_order,v_actor,auth.uid(),now()
  )
  on conflict (roster_date) do update
  set nurse_order=excluded.nurse_order,
      updated_by=excluded.updated_by,
      updated_by_user_id=excluded.updated_by_user_id,
      updated_at=excluded.updated_at
  returning * into v_row;

  return to_jsonb(v_row);
end
$$;

revoke all on function public.set_night_shared_pager_order_v56(date,text[],text)
from public, anon, authenticated;
grant execute on function public.set_night_shared_pager_order_v56(date,text[],text)
to authenticated;

drop trigger if exists bump_app_sync_state_shared_pager on public.night_shared_pager_order;
create trigger bump_app_sync_state_shared_pager
after insert or update or delete on public.night_shared_pager_order
for each statement execute function public.bump_app_sync_state_v33();

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname='supabase_realtime'
      and schemaname='public'
      and tablename='night_shared_pager_order'
  ) then
    alter publication supabase_realtime add table public.night_shared_pager_order;
  end if;
end
$$;

commit;
