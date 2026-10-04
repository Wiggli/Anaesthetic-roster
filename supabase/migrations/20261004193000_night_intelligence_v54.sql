-- Night intelligence v54.
-- Separates personal roster notifications from general roster updates and records
-- the roster identities affected by a push event without exposing server-only event rows.

begin;

alter table public.push_preferences
  add column if not exists personal_changes_enabled boolean not null default true;

grant update (personal_changes_enabled)
  on table public.push_preferences to authenticated;

alter table public.roster_push_events
  add column if not exists affected_roster_names text[] not null default '{}'::text[];

alter table public.roster_push_events
  drop constraint if exists roster_push_events_affected_names_count;
alter table public.roster_push_events
  add constraint roster_push_events_affected_names_count
  check (cardinality(affected_roster_names) <= 20);

create or replace function public.queue_roster_push_event_v54(
  p_roster_date date,
  p_event_type text,
  p_affected_roster_names text[]
)
returns uuid
language plpgsql
security definer
set search_path=''
as $$
declare
  v_user uuid := auth.uid();
  v_revision bigint;
  v_id uuid;
  v_names text[];
begin
  if v_user is null or not public.is_shift_member() then
    raise exception 'Active roster membership required';
  end if;

  if p_roster_date is null then
    raise exception 'Roster date is required';
  end if;

  if p_event_type not in ('staffing','allocation','roles') then
    raise exception 'Unsupported roster notification type';
  end if;

  select coalesce(array_agg(name order by name),'{}'::text[])
  into v_names
  from (
    select distinct regexp_replace(trim(raw_name), '[[:space:]]+', ' ', 'g') as name
    from unnest(coalesce(p_affected_roster_names,'{}'::text[])) raw_name
    where trim(raw_name) <> ''
      and char_length(trim(raw_name)) <= 80
  ) cleaned;

  if cardinality(v_names) > 20 then
    raise exception 'Too many affected roster identities';
  end if;

  select revision into v_revision
  from public.app_sync_state
  where id=1;

  if v_revision is null then
    raise exception 'Roster revision is unavailable';
  end if;

  insert into public.roster_push_events(
    roster_date,event_type,revision,created_by,affected_roster_names
  )
  values(
    p_roster_date,p_event_type,v_revision,v_user,v_names
  )
  on conflict (created_by,roster_date,revision,event_type)
  do update set affected_roster_names=excluded.affected_roster_names
  returning id into v_id;

  return v_id;
end
$$;

revoke all on function public.queue_roster_push_event_v54(date,text,text[])
from public,anon,authenticated;
grant execute on function public.queue_roster_push_event_v54(date,text,text[])
to authenticated;

update public.app_schema_version
set version=54,updated_at=now()
where id=1;

commit;
