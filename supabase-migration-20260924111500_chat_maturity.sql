-- Chat maturity improvements: message deletion, notification muting, realtime directory sync,
-- one-call chat overview, device removal and privacy-safe admin health metrics.

begin;

alter table public.chat_messages
  add column if not exists deleted_at timestamptz;

grant update (body,deleted_at) on table public.chat_messages to authenticated;

drop policy if exists "Senders can delete recent own messages" on public.chat_messages;
create policy "Senders can delete recent own messages"
on public.chat_messages
for update
to authenticated
using (
  sender_id=(select auth.uid())
  and (select public.is_shift_member())
  and deleted_at is null
  and created_at >= now() - interval '10 minutes'
)
with check (
  sender_id=(select auth.uid())
  and (select public.is_shift_member())
  and body='Message deleted'
  and deleted_at is not null
  and deleted_at <= now() + interval '10 seconds'
);

alter table public.push_preferences
  add column if not exists team_muted_until timestamptz;

grant update (team_muted_until) on table public.push_preferences to authenticated;

create or replace function public.chat_overview_v2()
returns jsonb
language sql
stable
security invoker
set search_path=''
as $$
  select jsonb_build_object(
    'members',
      coalesce((
        select jsonb_agg(jsonb_build_object(
          'user_id',m.user_id,
          'display_name',m.display_name,
          'person_key',m.person_key,
          'active',m.active
        ) order by m.display_name)
        from public.chat_members m
        where m.active=true
      ),'[]'::jsonb),
    'directory',
      coalesce((
        select jsonb_agg(jsonb_build_object(
          'person_key',d.person_key,
          'display_name',d.display_name,
          'preferred_user_id',d.preferred_user_id,
          'registered',d.registered,
          'active',d.active
        ) order by d.display_name)
        from public.chat_directory d
        where d.active=true
      ),'[]'::jsonb),
    'conversations',
      coalesce((
        select jsonb_agg(jsonb_build_object(
          'id',c.id,
          'kind',c.kind,
          'title',c.title,
          'user_a',c.user_a,
          'user_b',c.user_b,
          'created_by',c.created_by,
          'created_at',c.created_at
        ) order by c.created_at)
        from public.chat_conversations c
      ),'[]'::jsonb),
    'latest',
      coalesce((
        select jsonb_agg(jsonb_build_object(
          'conversation_id',c.id,
          'message',case when lm.id is null then null else jsonb_build_object(
            'id',lm.id,
            'conversation_id',lm.conversation_id,
            'sender_id',lm.sender_id,
            'sender_display_name',lm.sender_display_name,
            'body',lm.body,
            'created_at',lm.created_at,
            'deleted_at',lm.deleted_at
          ) end
        ))
        from public.chat_conversations c
        left join lateral (
          select m.id,m.conversation_id,m.sender_id,m.sender_display_name,m.body,m.created_at,m.deleted_at
          from public.chat_messages m
          where m.conversation_id=c.id
          order by m.id desc
          limit 1
        ) lm on true
      ),'[]'::jsonb),
    'unread',
      coalesce((
        select jsonb_agg(jsonb_build_object(
          'conversation_id',u.conversation_id,
          'unread_count',u.unread_count
        ))
        from public.chat_unread_counts() u
      ),'[]'::jsonb),
    'read_state',
      coalesce((
        select jsonb_agg(jsonb_build_object(
          'conversation_id',r.conversation_id,
          'last_read_message_id',r.last_read_message_id
        ))
        from public.chat_read_state r
      ),'[]'::jsonb)
  );
$$;

revoke all on function public.chat_overview_v2() from public,anon;
grant execute on function public.chat_overview_v2() to authenticated;

create or replace function public.remove_my_push_device(p_id uuid)
returns boolean
language plpgsql
security definer
set search_path=''
as $$
declare
  v_user uuid := auth.uid();
  v_count integer;
begin
  if v_user is null or not public.is_shift_member() then
    raise exception 'Active roster membership required';
  end if;

  delete from public.push_subscriptions
  where id=p_id and user_id=v_user;

  get diagnostics v_count = row_count;
  return v_count>0;
end
$$;

revoke all on function public.remove_my_push_device(uuid) from public,anon;
grant execute on function public.remove_my_push_device(uuid) to authenticated;

create or replace function public.admin_app_health()
returns jsonb
language plpgsql
security definer
set search_path=''
as $$
begin
  if auth.uid() is null or not public.is_roster_admin() then
    raise exception 'Administrator access required';
  end if;

  return jsonb_build_object(
    'active_authorised_users',(select count(*) from public.allowed_users where active=true),
    'registered_chat_users',(select count(*) from public.chat_members where active=true),
    'push_devices',(select count(*) from public.push_subscriptions where enabled=true),
    'failed_push_24h',(select count(*) from public.push_dispatches where status='failed' and created_at>=now()-interval '24 hours'),
    'partial_push_24h',(select count(*) from public.push_dispatches where status='partial' and created_at>=now()-interval '24 hours'),
    'last_push_at',(select max(completed_at) from public.push_dispatches),
    'last_chat_message_at',(select max(created_at) from public.chat_messages),
    'last_roster_sync_at',(select max(updated_at) from public.app_sync_state),
    'schema_version',(select version from public.app_schema_version order by version desc limit 1)
  );
end
$$;

revoke all on function public.admin_app_health() from public,anon;
grant execute on function public.admin_app_health() to authenticated;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname='supabase_realtime'
      and schemaname='public'
      and tablename='chat_members'
  ) then
    alter publication supabase_realtime add table public.chat_members;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname='supabase_realtime'
      and schemaname='public'
      and tablename='chat_directory'
  ) then
    alter publication supabase_realtime add table public.chat_directory;
  end if;
end
$$;

update public.app_schema_version set version=44,updated_at=now() where id=1;

commit;
