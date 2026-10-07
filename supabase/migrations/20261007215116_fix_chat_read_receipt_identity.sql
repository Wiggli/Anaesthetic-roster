-- Repair the existing read receipt within schema-53 column grants.
-- user_id defaults to auth.uid(); callers cannot supply or change another identity.
-- Preserve SECURITY INVOKER, all RLS policies, and monotonic read progress.
begin;

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

  insert into public.chat_read_state(conversation_id,last_read_message_id)
  values(p_conversation_id,p_message_id)
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

commit;
