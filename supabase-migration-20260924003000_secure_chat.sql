-- Secure isolated staff chat for Anaesthetic Night Roster.
-- Chat does not write to roster tables and is intentionally optional to roster startup.

begin;

create schema if not exists chat_private;
revoke all on schema chat_private from public;
revoke all on schema chat_private from anon;
revoke all on schema chat_private from authenticated;

create table if not exists public.chat_members (
  user_id uuid primary key,
  display_name text not null,
  active boolean not null default true,
  synced_at timestamptz not null default now(),
  constraint chat_members_display_name_length
    check (length(trim(display_name)) between 1 and 100)
);

create table if not exists public.chat_conversations (
  id uuid primary key default gen_random_uuid(),
  kind text not null,
  title text,
  user_a uuid references public.chat_members(user_id) on delete restrict,
  user_b uuid references public.chat_members(user_id) on delete restrict,
  created_by uuid references public.chat_members(user_id) on delete restrict,
  created_at timestamptz not null default now(),
  constraint chat_conversations_kind check (kind in ('group','direct')),
  constraint chat_conversations_shape check (
    (
      kind = 'group'
      and title = 'Anaesthetic Team'
      and user_a is null
      and user_b is null
      and created_by is null
    )
    or
    (
      kind = 'direct'
      and title is null
      and user_a is not null
      and user_b is not null
      and user_a <> user_b
      and user_a::text < user_b::text
      and (created_by = user_a or created_by = user_b)
    )
  )
);

create unique index if not exists chat_conversations_single_group_uq
  on public.chat_conversations(kind)
  where kind = 'group';

create unique index if not exists chat_conversations_direct_pair_uq
  on public.chat_conversations(user_a,user_b)
  where kind = 'direct';

create index if not exists chat_conversations_user_b_idx
  on public.chat_conversations(user_b);

create index if not exists chat_conversations_created_by_idx
  on public.chat_conversations(created_by);

create table if not exists public.chat_messages (
  id bigint generated always as identity primary key,
  conversation_id uuid not null references public.chat_conversations(id) on delete cascade,
  sender_id uuid not null default auth.uid(),
  sender_display_name text not null,
  body text not null,
  created_at timestamptz not null default now(),
  constraint chat_messages_sender_fk
    foreign key (sender_id) references public.chat_members(user_id) on delete restrict,
  constraint chat_messages_body_length
    check (length(trim(body)) between 1 and 2000),
  constraint chat_messages_sender_name_length
    check (length(trim(sender_display_name)) between 1 and 100)
);

create index if not exists chat_messages_conversation_id_id_idx
  on public.chat_messages(conversation_id,id desc);

create index if not exists chat_messages_sender_id_idx
  on public.chat_messages(sender_id);

create table if not exists public.chat_read_state (
  user_id uuid not null default auth.uid(),
  conversation_id uuid not null references public.chat_conversations(id) on delete cascade,
  last_read_message_id bigint references public.chat_messages(id) on delete set null,
  updated_at timestamptz not null default now(),
  primary key (user_id,conversation_id)
);

create index if not exists chat_read_state_conversation_idx
  on public.chat_read_state(conversation_id,user_id);

create index if not exists chat_read_state_last_read_message_id_idx
  on public.chat_read_state(last_read_message_id);

alter table public.chat_members enable row level security;
alter table public.chat_conversations enable row level security;
alter table public.chat_messages enable row level security;
alter table public.chat_read_state enable row level security;

revoke all privileges on table public.chat_members from public, anon, authenticated;
revoke all privileges on table public.chat_conversations from public, anon, authenticated;
revoke all privileges on table public.chat_messages from public, anon, authenticated;
revoke all privileges on table public.chat_read_state from public, anon, authenticated;

grant select on table public.chat_members to authenticated;
grant insert (display_name) on table public.chat_members to authenticated;

grant select on table public.chat_conversations to authenticated;
grant insert (kind,user_a,user_b,created_by) on table public.chat_conversations to authenticated;

grant select on table public.chat_messages to authenticated;
grant insert (conversation_id,body) on table public.chat_messages to authenticated;

grant select on table public.chat_read_state to authenticated;
grant insert (conversation_id,last_read_message_id) on table public.chat_read_state to authenticated;
grant update (last_read_message_id) on table public.chat_read_state to authenticated;

drop policy if exists "Active members can view chat directory" on public.chat_members;
create policy "Active members can view chat directory"
on public.chat_members
for select
to authenticated
using (
  (select public.is_shift_member())
  and active = true
);

drop policy if exists "Members can register own chat identity" on public.chat_members;
create policy "Members can register own chat identity"
on public.chat_members
for insert
to authenticated
with check (
  user_id = (select auth.uid())
  and active = true
  and (select public.is_shift_member())
  and exists (
    select 1
    from public.allowed_users a
    where lower(a.email) = lower(coalesce((select auth.jwt()) ->> 'email',''))
      and a.active = true
      and a.display_name = chat_members.display_name
  )
);

drop policy if exists "Members can view accessible conversations" on public.chat_conversations;
create policy "Members can view accessible conversations"
on public.chat_conversations
for select
to authenticated
using (
  (select public.is_shift_member())
  and (
    kind = 'group'
    or (select auth.uid()) = user_a
    or (select auth.uid()) = user_b
  )
);

drop policy if exists "Members can create direct conversations" on public.chat_conversations;
create policy "Members can create direct conversations"
on public.chat_conversations
for insert
to authenticated
with check (
  (select public.is_shift_member())
  and kind = 'direct'
  and title is null
  and created_by = (select auth.uid())
  and ((select auth.uid()) = user_a or (select auth.uid()) = user_b)
  and exists (
    select 1 from public.chat_members a
    where a.user_id = chat_conversations.user_a and a.active = true
  )
  and exists (
    select 1 from public.chat_members b
    where b.user_id = chat_conversations.user_b and b.active = true
  )
);

drop policy if exists "Members can read accessible chat messages" on public.chat_messages;
create policy "Members can read accessible chat messages"
on public.chat_messages
for select
to authenticated
using (
  (select public.is_shift_member())
  and exists (
    select 1
    from public.chat_conversations c
    where c.id = chat_messages.conversation_id
      and (
        c.kind = 'group'
        or (select auth.uid()) = c.user_a
        or (select auth.uid()) = c.user_b
      )
  )
);

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
);

drop policy if exists "Members can view own read state" on public.chat_read_state;
create policy "Members can view own read state"
on public.chat_read_state
for select
to authenticated
using (
  user_id = (select auth.uid())
  and (select public.is_shift_member())
  and exists (
    select 1 from public.chat_conversations c
    where c.id = chat_read_state.conversation_id
  )
);

drop policy if exists "Members can create own read state" on public.chat_read_state;
create policy "Members can create own read state"
on public.chat_read_state
for insert
to authenticated
with check (
  user_id = (select auth.uid())
  and (select public.is_shift_member())
  and exists (
    select 1 from public.chat_conversations c
    where c.id = chat_read_state.conversation_id
  )
  and (
    last_read_message_id is null
    or exists (
      select 1 from public.chat_messages m
      where m.id = chat_read_state.last_read_message_id
        and m.conversation_id = chat_read_state.conversation_id
    )
  )
);

drop policy if exists "Members can update own read state" on public.chat_read_state;
create policy "Members can update own read state"
on public.chat_read_state
for update
to authenticated
using (
  user_id = (select auth.uid())
  and (select public.is_shift_member())
)
with check (
  user_id = (select auth.uid())
  and (select public.is_shift_member())
  and exists (
    select 1 from public.chat_conversations c
    where c.id = chat_read_state.conversation_id
  )
  and (
    last_read_message_id is null
    or exists (
      select 1 from public.chat_messages m
      where m.id = chat_read_state.last_read_message_id
        and m.conversation_id = chat_read_state.conversation_id
    )
  )
);

create or replace function chat_private.sync_chat_member_from_allowed_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  old_user_id uuid;
  new_user_id uuid;
begin
  if tg_op in ('UPDATE','DELETE') then
    select u.id into old_user_id
    from auth.users u
    where lower(u.email) = lower(old.email)
    order by u.created_at desc
    limit 1;

    if old_user_id is not null
       and (tg_op = 'DELETE' or lower(old.email) <> lower(new.email) or new.active = false) then
      update public.chat_members
      set active = false, synced_at = now()
      where user_id = old_user_id;
    end if;
  end if;

  if tg_op in ('INSERT','UPDATE') then
    select u.id into new_user_id
    from auth.users u
    where lower(u.email) = lower(new.email)
    order by u.created_at desc
    limit 1;

    if new_user_id is not null then
      insert into public.chat_members(user_id,display_name,active,synced_at)
      values (new_user_id,new.display_name,new.active,now())
      on conflict (user_id) do update
      set display_name = excluded.display_name,
          active = excluded.active,
          synced_at = now();
    end if;
  end if;

  return coalesce(new,old);
end
$$;

revoke all on function chat_private.sync_chat_member_from_allowed_user() from public, anon, authenticated;

drop trigger if exists sync_chat_member_from_allowed_user on public.allowed_users;
create trigger sync_chat_member_from_allowed_user
after insert or update or delete on public.allowed_users
for each row execute function chat_private.sync_chat_member_from_allowed_user();

create or replace function chat_private.stamp_chat_message_identity()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_name text;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  select m.display_name into v_name
  from public.chat_members m
  where m.user_id = auth.uid()
    and m.active = true;

  if v_name is null then
    raise exception 'Active chat membership required';
  end if;

  new.sender_id := auth.uid();
  new.sender_display_name := v_name;
  new.created_at := now();
  return new;
end
$$;

revoke all on function chat_private.stamp_chat_message_identity() from public, anon, authenticated;

drop trigger if exists stamp_chat_message_identity on public.chat_messages;
create trigger stamp_chat_message_identity
before insert on public.chat_messages
for each row execute function chat_private.stamp_chat_message_identity();

create or replace function chat_private.touch_chat_read_state()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end
$$;

revoke all on function chat_private.touch_chat_read_state() from public, anon, authenticated;

drop trigger if exists touch_chat_read_state on public.chat_read_state;
create trigger touch_chat_read_state
before update on public.chat_read_state
for each row execute function chat_private.touch_chat_read_state();

create or replace function public.chat_unread_counts()
returns table(conversation_id uuid, unread_count bigint)
language sql
stable
security invoker
set search_path = ''
as $$
  select
    c.id as conversation_id,
    (
      select count(*)::bigint
      from public.chat_messages m
      where m.conversation_id = c.id
        and m.sender_id <> auth.uid()
        and m.id > coalesce(
          (
            select rs.last_read_message_id
            from public.chat_read_state rs
            where rs.user_id = auth.uid()
              and rs.conversation_id = c.id
          ),
          0
        )
    ) as unread_count
  from public.chat_conversations c
  where public.is_shift_member()
    and (
      c.kind = 'group'
      or auth.uid() = c.user_a
      or auth.uid() = c.user_b
    );
$$;

revoke all on function public.chat_unread_counts() from public, anon;
grant execute on function public.chat_unread_counts() to authenticated;

insert into public.chat_members(user_id,display_name,active,synced_at)
select u.id,a.display_name,a.active,now()
from auth.users u
join public.allowed_users a on lower(a.email) = lower(u.email)
on conflict (user_id) do update
set display_name = excluded.display_name,
    active = excluded.active,
    synced_at = now();

insert into public.chat_conversations(kind,title,created_by)
select 'group','Anaesthetic Team',null
where not exists (
  select 1 from public.chat_conversations where kind = 'group'
);

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'chat_messages'
  ) then
    alter publication supabase_realtime add table public.chat_messages;
  end if;

  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'chat_conversations'
  ) then
    alter publication supabase_realtime add table public.chat_conversations;
  end if;
end
$$;

commit;
