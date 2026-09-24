-- Fix reply validation without recursively querying chat_messages from its own RLS policy.
-- Also advances the schema contract for the chat-send hotfix.

begin;

create or replace function chat_private.reply_belongs_to_conversation(
  p_reply_id bigint,
  p_conversation_id uuid
)
returns boolean
language sql
stable
security definer
set search_path=''
as $$
  select
    p_reply_id is null
    or exists (
      select 1
      from public.chat_messages m
      where m.id=p_reply_id
        and m.conversation_id=p_conversation_id
    );
$$;

revoke all on function chat_private.reply_belongs_to_conversation(bigint,uuid)
from public,anon,authenticated;
grant execute on function chat_private.reply_belongs_to_conversation(bigint,uuid)
to authenticated;

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
            select 1
            from public.chat_members a
            where a.user_id = c.user_a
              and a.active = true
          )
          and exists (
            select 1
            from public.chat_members b
            where b.user_id = c.user_b
              and b.active = true
          )
        )
      )
  )
  and chat_private.reply_belongs_to_conversation(
    reply_to_message_id,
    conversation_id
  )
);

update public.app_schema_version
set version=46,updated_at=now()
where id=1;

commit;
