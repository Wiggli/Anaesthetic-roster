-- Operational notifications, reply-to-message support, mentions and 14-day chat retention.
-- This migration preserves existing roster rules while extending notification and chat metadata.

begin;

alter table public.chat_messages
  add column if not exists reply_to_message_id bigint
  references public.chat_messages(id) on delete set null;

create index if not exists chat_messages_reply_to_idx
  on public.chat_messages(reply_to_message_id)
  where reply_to_message_id is not null;

grant insert (reply_to_message_id) on table public.chat_messages to authenticated;

drop policy if exists "Members can send as themselves" on public.chat_messages;
create policy "Members can send as themselves"
on public.chat_messages
for insert
to authenticated
with check (
  sender_id = (select auth.uid())
  and (select public.is_shift_member())
  and exists (
    select 1
    from public.chat_conversations c
    where c.id = chat_messages.conversation_id
      and (
        c.kind = 'group'
        or (
          c.kind = 'direct'
          and ((select auth.uid()) = c.user_a or (select auth.uid()) = c.user_b)
          and exists (
            select 1 from public.chat_members a
            where a.user_id = c.user_a and a.active = true
          )
          and exists (
            select 1 from public.chat_members b
            where b.user_id = c.user_b and b.active = true
          )
        )
      )
  )
  and (
    reply_to_message_id is null
    or exists (
      select 1
      from public.chat_messages replied
      where replied.id = chat_messages.reply_to_message_id
        and replied.conversation_id = chat_messages.conversation_id
    )
  )
);

alter table public.push_preferences
  add column if not exists roster_enabled boolean not null default true,
  add column if not exists mentions_enabled boolean not null default true,
  add column if not exists access_request_enabled boolean not null default true;

grant update (roster_enabled,mentions_enabled,access_request_enabled)
  on table public.push_preferences to authenticated;

create table if not exists public.roster_push_events (
  id uuid primary key default gen_random_uuid(),
  roster_date date not null,
  event_type text not null,
  revision bigint not null,
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint roster_push_events_type check (event_type in ('staffing','allocation','roles')),
  constraint roster_push_events_unique unique (created_by,roster_date,revision,event_type)
);

alter table public.roster_push_events enable row level security;
revoke all privileges on table public.roster_push_events from public,anon,authenticated;
grant select,insert,update,delete on table public.roster_push_events to service_role;

drop policy if exists "No browser access to roster push events" on public.roster_push_events;
create policy "No browser access to roster push events"
on public.roster_push_events
for all
to anon,authenticated
using (false)
with check (false);

create table if not exists public.push_event_dispatches (
  event_key text primary key,
  actor_id uuid references auth.users(id) on delete set null,
  status text not null default 'processing',
  attempted integer not null default 0,
  succeeded integer not null default 0,
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  constraint push_event_dispatches_status
    check (status in ('processing','complete','partial','failed'))
);

alter table public.push_event_dispatches enable row level security;
revoke all privileges on table public.push_event_dispatches from public,anon,authenticated;
grant select,insert,update,delete on table public.push_event_dispatches to service_role;

drop policy if exists "No browser access to push event dispatches" on public.push_event_dispatches;
create policy "No browser access to push event dispatches"
on public.push_event_dispatches
for all
to anon,authenticated
using (false)
with check (false);

create or replace function public.queue_roster_push_event(
  p_roster_date date,
  p_event_type text
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

  select revision into v_revision
  from public.app_sync_state
  where id=1;

  if v_revision is null then
    raise exception 'Roster revision is unavailable';
  end if;

  insert into public.roster_push_events(roster_date,event_type,revision,created_by)
  values(p_roster_date,p_event_type,v_revision,v_user)
  on conflict (created_by,roster_date,revision,event_type)
  do update set created_at=public.roster_push_events.created_at
  returning id into v_id;

  return v_id;
end
$$;

revoke all on function public.queue_roster_push_event(date,text) from public,anon;
grant execute on function public.queue_roster_push_event(date,text) to authenticated;

create extension if not exists pg_cron with schema pg_catalog;
grant usage on schema cron to postgres;
grant all privileges on all tables in schema cron to postgres;

create or replace function chat_private.prune_expired_chat_messages()
returns integer
language plpgsql
security definer
set search_path=''
as $$
declare
  v_deleted integer := 0;
begin
  delete from public.chat_messages
  where created_at < now() - interval '14 days';

  get diagnostics v_deleted = row_count;
  return v_deleted;
end
$$;

revoke all on function chat_private.prune_expired_chat_messages() from public,anon,authenticated;

select chat_private.prune_expired_chat_messages();

do $$
declare
  v_job bigint;
begin
  select jobid into v_job
  from cron.job
  where jobname='chat-retention-14-days'
  limit 1;

  if v_job is not null then
    perform cron.unschedule(v_job);
  end if;
end
$$;

select cron.schedule(
  'chat-retention-14-days',
  '17 3 * * *',
  $job$select chat_private.prune_expired_chat_messages();$job$
);

update public.app_schema_version
set version=45,updated_at=now()
where id=1;

commit;
