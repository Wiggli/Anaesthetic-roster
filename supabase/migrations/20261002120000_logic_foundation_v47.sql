-- Logic foundation v47: authoritative server clock plus idempotent chat delivery
-- and monotonic read state. Existing roster calculations and staffing RPCs are unchanged.

begin;

create or replace function public.app_server_clock_v47()
returns timestamptz
language sql
volatile
security invoker
set search_path=''
as $$
  select clock_timestamp();
$$;

revoke all on function public.app_server_clock_v47() from public,anon;
grant execute on function public.app_server_clock_v47() to authenticated;

alter table public.chat_messages
  add column if not exists client_message_id uuid;

update public.chat_messages
set client_message_id=gen_random_uuid()
where client_message_id is null;

alter table public.chat_messages
  alter column client_message_id set default gen_random_uuid(),
  alter column client_message_id set not null;

create unique index if not exists chat_messages_sender_client_message_uq
  on public.chat_messages(sender_id,client_message_id);

grant insert (client_message_id) on table public.chat_messages to authenticated;

create or replace function public.chat_send_message_v47(
  p_conversation_id uuid,
  p_body text,
  p_reply_to_message_id bigint default null,
  p_client_message_id uuid default null
)
returns setof public.chat_messages
language plpgsql
security invoker
set search_path=''
as $$
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;
  if p_client_message_id is null then
    raise exception 'Client message id is required';
  end if;
  if length(trim(coalesce(p_body,''))) not between 1 and 2000 then
    raise exception 'Message body is invalid';
  end if;

  return query
  select m.*
  from public.chat_messages m
  where m.sender_id=auth.uid()
    and m.client_message_id=p_client_message_id
  limit 1;
  if found then
    return;
  end if;

  begin
    return query
    insert into public.chat_messages(
      conversation_id,body,reply_to_message_id,client_message_id
    )
    values(
      p_conversation_id,trim(p_body),p_reply_to_message_id,p_client_message_id
    )
    returning *;
  exception when unique_violation then
    return query
    select m.*
    from public.chat_messages m
    where m.sender_id=auth.uid()
      and m.client_message_id=p_client_message_id
    limit 1;
  end;
end
$$;

revoke all on function public.chat_send_message_v47(uuid,text,bigint,uuid)
from public,anon;
grant execute on function public.chat_send_message_v47(uuid,text,bigint,uuid)
to authenticated;

create or replace function public.chat_mark_read_v47(
  p_conversation_id uuid,
  p_message_id bigint
)
returns bigint
language plpgsql
security invoker
set search_path=''
as $$
declare
  v_last bigint;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;
  if p_message_id is null or not exists (
    select 1
    from public.chat_messages m
    where m.id=p_message_id
      and m.conversation_id=p_conversation_id
  ) then
    raise exception 'Message does not belong to this conversation';
  end if;

  insert into public.chat_read_state(user_id,conversation_id,last_read_message_id)
  values(auth.uid(),p_conversation_id,p_message_id)
  on conflict (user_id,conversation_id)
  do update
  set last_read_message_id=greatest(
    coalesce(public.chat_read_state.last_read_message_id,0),
    excluded.last_read_message_id
  )
  returning last_read_message_id into v_last;

  return v_last;
end
$$;

revoke all on function public.chat_mark_read_v47(uuid,bigint)
from public,anon;
grant execute on function public.chat_mark_read_v47(uuid,bigint)
to authenticated;

update public.app_schema_version
set version=47,updated_at=now()
where id=1;

commit;
