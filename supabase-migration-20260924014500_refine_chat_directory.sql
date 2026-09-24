-- Refine chat identity and directory handling without changing roster identity rules.
-- Keeps alternate sign-in identities grouped inside chat only.

begin;

create table if not exists chat_private.identity_links (
  user_id uuid primary key references auth.users(id) on delete cascade,
  person_key text not null,
  constraint identity_links_person_key_length
    check (length(trim(person_key)) between 1 and 100)
);

revoke all on table chat_private.identity_links from public, anon, authenticated;

insert into chat_private.identity_links(user_id,person_key)
select u.id,'Andre'
from auth.users u
join public.allowed_users a on lower(a.email)=lower(u.email)
where a.display_name='Andre Bartolo'
on conflict (user_id) do update set person_key=excluded.person_key;

alter table public.chat_members
  add column if not exists person_key text;

update public.chat_members m
set person_key=coalesce(l.person_key,a.roster_name,a.display_name),
    display_name=coalesce(l.person_key,a.roster_name,a.display_name),
    active=a.active,
    synced_at=now()
from auth.users u
join public.allowed_users a on lower(a.email)=lower(u.email)
left join chat_private.identity_links l on l.user_id=u.id
where u.id=m.user_id;

alter table public.chat_members
  drop constraint if exists chat_members_person_key_length;

alter table public.chat_members
  add constraint chat_members_person_key_length
  check (person_key is null or length(trim(person_key)) between 1 and 100);

create index if not exists chat_members_person_key_idx
  on public.chat_members(person_key)
  where active=true;

create table if not exists public.chat_directory (
  person_key text primary key,
  display_name text not null,
  preferred_user_id uuid references public.chat_members(user_id) on delete set null,
  registered boolean not null default false,
  active boolean not null default true,
  synced_at timestamptz not null default now(),
  constraint chat_directory_person_key_length
    check (length(trim(person_key)) between 1 and 100),
  constraint chat_directory_display_name_length
    check (length(trim(display_name)) between 1 and 100)
);

create index if not exists chat_directory_preferred_user_id_idx
  on public.chat_directory(preferred_user_id)
  where preferred_user_id is not null;

alter table public.chat_directory enable row level security;

revoke all privileges on table public.chat_directory from public, anon, authenticated;
grant select on table public.chat_directory to authenticated;

drop policy if exists "Active members can view roster chat directory" on public.chat_directory;
create policy "Active members can view roster chat directory"
on public.chat_directory
for select
to authenticated
using (
  (select public.is_shift_member())
  and active=true
);

create or replace function chat_private.refresh_chat_directory()
returns void
language plpgsql
security definer
set search_path=''
as $$
begin
  delete from public.chat_directory;

  insert into public.chat_directory(person_key,display_name,preferred_user_id,registered,active,synced_at)
  select
    entries.person_key,
    entries.person_key,
    (
      select m.user_id
      from public.chat_members m
      where m.active=true
        and m.person_key=entries.person_key
      order by
        case when m.display_name=entries.person_key then 0 else 1 end,
        m.synced_at asc,
        m.user_id::text asc
      limit 1
    ),
    exists (
      select 1
      from public.chat_members m2
      where m2.active=true
        and m2.person_key=entries.person_key
    ),
    true,
    now()
  from (
    select distinct
      coalesce(l.person_key,a.roster_name,a.display_name) as person_key
    from public.allowed_users a
    left join auth.users u on lower(u.email)=lower(a.email)
    left join chat_private.identity_links l on l.user_id=u.id
    where a.active=true
      and length(trim(coalesce(l.person_key,a.roster_name,a.display_name))) between 1 and 100
  ) entries;
end
$$;

revoke all on function chat_private.refresh_chat_directory() from public, anon, authenticated;

create or replace function chat_private.sync_chat_member_from_allowed_user()
returns trigger
language plpgsql
security definer
set search_path=''
as $$
declare
  old_user_id uuid;
  new_user_id uuid;
  new_person_key text;
begin
  if tg_op in ('UPDATE','DELETE') then
    select u.id into old_user_id
    from auth.users u
    where lower(u.email)=lower(old.email)
    order by u.created_at desc
    limit 1;

    if old_user_id is not null
       and (
         tg_op='DELETE'
         or lower(old.email)<>lower(new.email)
         or new.active=false
       ) then
      update public.chat_members
      set active=false,synced_at=now()
      where user_id=old_user_id;
    end if;
  end if;

  if tg_op in ('INSERT','UPDATE') then
    select u.id into new_user_id
    from auth.users u
    where lower(u.email)=lower(new.email)
    order by u.created_at desc
    limit 1;

    if new_user_id is not null then
      select coalesce(l.person_key,new.roster_name,new.display_name)
      into new_person_key
      from (select 1) seed
      left join chat_private.identity_links l on l.user_id=new_user_id;

      insert into public.chat_members(user_id,display_name,person_key,active,synced_at)
      values(new_user_id,new_person_key,new_person_key,new.active,now())
      on conflict(user_id) do update
      set display_name=excluded.display_name,
          person_key=excluded.person_key,
          active=excluded.active,
          synced_at=now();
    end if;
  end if;

  perform chat_private.refresh_chat_directory();
  return coalesce(new,old);
end
$$;

revoke all on function chat_private.sync_chat_member_from_allowed_user() from public, anon, authenticated;

create or replace function chat_private.stamp_chat_member_identity()
returns trigger
language plpgsql
security definer
set search_path=''
as $$
declare
  v_person_key text;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  select coalesce(l.person_key,a.roster_name,a.display_name)
  into v_person_key
  from public.allowed_users a
  left join chat_private.identity_links l on l.user_id=auth.uid()
  where lower(a.email)=lower(coalesce(auth.jwt() ->> 'email',''))
    and a.active=true
  limit 1;

  if v_person_key is null then
    raise exception 'Active roster membership required';
  end if;

  new.user_id:=auth.uid();
  new.display_name:=v_person_key;
  new.person_key:=v_person_key;
  new.active:=true;
  new.synced_at:=now();
  return new;
end
$$;

revoke all on function chat_private.stamp_chat_member_identity() from public, anon, authenticated;

drop trigger if exists stamp_chat_member_identity on public.chat_members;
create trigger stamp_chat_member_identity
before insert on public.chat_members
for each row execute function chat_private.stamp_chat_member_identity();

create or replace function chat_private.refresh_directory_from_chat_member()
returns trigger
language plpgsql
security definer
set search_path=''
as $$
begin
  perform chat_private.refresh_chat_directory();
  return null;
end
$$;

revoke all on function chat_private.refresh_directory_from_chat_member() from public, anon, authenticated;

drop trigger if exists refresh_directory_from_chat_member on public.chat_members;
create trigger refresh_directory_from_chat_member
after insert or update or delete on public.chat_members
for each statement execute function chat_private.refresh_directory_from_chat_member();

drop policy if exists "Members can register own chat identity" on public.chat_members;
create policy "Members can register own chat identity"
on public.chat_members
for insert
to authenticated
with check (
  user_id=(select auth.uid())
  and active=true
  and person_key is not null
  and (select public.is_shift_member())
);

drop policy if exists "Members can view accessible conversations" on public.chat_conversations;
create policy "Members can view accessible conversations"
on public.chat_conversations
for select
to authenticated
using (
  (select public.is_shift_member())
  and (
    kind='group'
    or exists (
      select 1
      from public.chat_members me
      join public.chat_members participant
        on participant.user_id in (chat_conversations.user_a,chat_conversations.user_b)
      where me.user_id=(select auth.uid())
        and me.active=true
        and participant.active=true
        and me.person_key=participant.person_key
    )
  )
);

drop policy if exists "Members can create direct conversations" on public.chat_conversations;
create policy "Members can create direct conversations"
on public.chat_conversations
for insert
to authenticated
with check (
  (select public.is_shift_member())
  and kind='direct'
  and title is null
  and created_by in (user_a,user_b)
  and exists (
    select 1
    from public.chat_members me
    join public.chat_members participant
      on participant.user_id in (chat_conversations.user_a,chat_conversations.user_b)
    where me.user_id=(select auth.uid())
      and me.active=true
      and participant.active=true
      and me.person_key=participant.person_key
  )
  and exists (
    select 1
    from public.chat_members a
    join public.chat_members b on b.user_id=chat_conversations.user_b
    where a.user_id=chat_conversations.user_a
      and a.active=true
      and b.active=true
      and a.person_key<>b.person_key
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
    where c.id=chat_messages.conversation_id
      and (
        c.kind='group'
        or exists (
          select 1
          from public.chat_members me
          join public.chat_members participant
            on participant.user_id in (c.user_a,c.user_b)
          where me.user_id=(select auth.uid())
            and me.active=true
            and participant.active=true
            and me.person_key=participant.person_key
        )
      )
  )
);

drop policy if exists "Members can send as themselves" on public.chat_messages;
create policy "Members can send as themselves"
on public.chat_messages
for insert
to authenticated
with check (
  sender_id=(select auth.uid())
  and (select public.is_shift_member())
  and exists (
    select 1
    from public.chat_conversations c
    where c.id=chat_messages.conversation_id
      and (
        c.kind='group'
        or (
          c.kind='direct'
          and exists (
            select 1
            from public.chat_members me
            join public.chat_members participant
              on participant.user_id in (c.user_a,c.user_b)
            where me.user_id=(select auth.uid())
              and me.active=true
              and participant.active=true
              and me.person_key=participant.person_key
          )
          and exists (
            select 1
            from public.chat_members a
            join public.chat_members b on b.user_id=c.user_b
            where a.user_id=c.user_a
              and a.active=true
              and b.active=true
              and a.person_key<>b.person_key
          )
        )
      )
  )
);

create or replace function chat_private.stamp_chat_message_identity()
returns trigger
language plpgsql
security definer
set search_path=''
as $$
declare
  v_name text;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  select m.person_key into v_name
  from public.chat_members m
  where m.user_id=auth.uid()
    and m.active=true;

  if v_name is null then
    raise exception 'Active chat membership required';
  end if;

  new.sender_id:=auth.uid();
  new.sender_display_name:=v_name;
  new.created_at:=now();
  return new;
end
$$;

revoke all on function chat_private.stamp_chat_message_identity() from public, anon, authenticated;

create or replace function public.chat_unread_counts()
returns table(conversation_id uuid, unread_count bigint)
language sql
stable
security invoker
set search_path=''
as $$
  select
    c.id,
    (
      select count(*)::bigint
      from public.chat_messages m
      where m.conversation_id=c.id
        and not exists (
          select 1
          from public.chat_members me
          join public.chat_members sender on sender.user_id=m.sender_id
          where me.user_id=auth.uid()
            and me.active=true
            and sender.active=true
            and me.person_key=sender.person_key
        )
        and m.id>coalesce(
          (
            select rs.last_read_message_id
            from public.chat_read_state rs
            where rs.user_id=auth.uid()
              and rs.conversation_id=c.id
          ),
          0
        )
    )
  from public.chat_conversations c
  where public.is_shift_member()
    and (
      c.kind='group'
      or exists (
        select 1
        from public.chat_members me
        join public.chat_members participant
          on participant.user_id in (c.user_a,c.user_b)
        where me.user_id=auth.uid()
          and me.active=true
          and participant.active=true
          and me.person_key=participant.person_key
      )
    );
$$;

revoke all on function public.chat_unread_counts() from public, anon;
grant execute on function public.chat_unread_counts() to authenticated;

delete from public.chat_conversations c
using public.chat_members a, public.chat_members b
where c.kind='direct'
  and a.user_id=c.user_a
  and b.user_id=c.user_b
  and a.person_key=b.person_key;

select chat_private.refresh_chat_directory();

commit;
