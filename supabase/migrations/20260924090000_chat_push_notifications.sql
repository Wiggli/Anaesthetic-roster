-- Chat push notifications for Anaesthetic Night Roster.
-- The VAPID private key is provisioned directly in Supabase and is deliberately
-- excluded from source control. This migration creates only the protected schema.

begin;

create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth_key text not null,
  user_agent text,
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint push_subscriptions_endpoint_https check (endpoint like 'https://%'),
  constraint push_subscriptions_key_lengths check (
    length(p256dh) between 16 and 512
    and length(auth_key) between 8 and 256
  )
);

create index if not exists push_subscriptions_user_enabled_idx
  on public.push_subscriptions(user_id,enabled);

create table if not exists public.push_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  chat_enabled boolean not null default true,
  team_enabled boolean not null default true,
  private_enabled boolean not null default true,
  updated_at timestamptz not null default now()
);

create table if not exists public.push_dispatches (
  message_id bigint primary key references public.chat_messages(id) on delete cascade,
  sender_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'processing',
  attempted integer not null default 0,
  succeeded integer not null default 0,
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  constraint push_dispatches_status check (status in ('processing','complete','partial','failed'))
);

create table if not exists public.push_server_config (
  id smallint primary key default 1 check (id=1),
  vapid_public_key text not null,
  vapid_private_key text not null,
  vapid_subject text not null,
  updated_at timestamptz not null default now()
);

create index if not exists push_dispatches_sender_id_idx
  on public.push_dispatches(sender_id);

alter table public.push_subscriptions enable row level security;
alter table public.push_preferences enable row level security;
alter table public.push_dispatches enable row level security;
alter table public.push_server_config enable row level security;

revoke all privileges on table public.push_subscriptions from public,anon,authenticated;
revoke all privileges on table public.push_preferences from public,anon,authenticated;
revoke all privileges on table public.push_dispatches from public,anon,authenticated;
revoke all privileges on table public.push_server_config from public,anon,authenticated;

grant select on table public.push_subscriptions to authenticated;
grant select on table public.push_preferences to authenticated;
grant update (chat_enabled,team_enabled,private_enabled) on table public.push_preferences to authenticated;

grant select,insert,update,delete on table public.push_subscriptions to service_role;
grant select,insert,update,delete on table public.push_preferences to service_role;
grant select,insert,update,delete on table public.push_dispatches to service_role;
grant select on table public.push_server_config to service_role;

drop policy if exists "No browser access to push dispatches" on public.push_dispatches;
create policy "No browser access to push dispatches"
on public.push_dispatches
for all
to anon,authenticated
using (false)
with check (false);

drop policy if exists "No browser access to push server config" on public.push_server_config;
create policy "No browser access to push server config"
on public.push_server_config
for all
to anon,authenticated
using (false)
with check (false);

drop policy if exists "Members can view own push subscriptions" on public.push_subscriptions;
create policy "Members can view own push subscriptions"
on public.push_subscriptions
for select
to authenticated
using (
  user_id=(select auth.uid())
  and (select public.is_shift_member())
);

drop policy if exists "Members can view own push preferences" on public.push_preferences;
create policy "Members can view own push preferences"
on public.push_preferences
for select
to authenticated
using (
  user_id=(select auth.uid())
  and (select public.is_shift_member())
);

drop policy if exists "Members can update own push preferences" on public.push_preferences;
create policy "Members can update own push preferences"
on public.push_preferences
for update
to authenticated
using (
  user_id=(select auth.uid())
  and (select public.is_shift_member())
)
with check (
  user_id=(select auth.uid())
  and (select public.is_shift_member())
);

create or replace function public.register_push_subscription(
  p_endpoint text,
  p_p256dh text,
  p_auth_key text,
  p_user_agent text default null
)
returns uuid
language plpgsql
security definer
set search_path=''
as $$
declare
  v_user uuid := auth.uid();
  v_id uuid;
begin
  if v_user is null or not public.is_shift_member() then
    raise exception 'Active roster membership required';
  end if;

  if p_endpoint is null or p_endpoint not like 'https://%' then
    raise exception 'Invalid push endpoint';
  end if;

  if length(coalesce(p_p256dh,'')) < 16 or length(coalesce(p_auth_key,'')) < 8 then
    raise exception 'Invalid push subscription keys';
  end if;

  insert into public.push_subscriptions(user_id,endpoint,p256dh,auth_key,user_agent,enabled,updated_at)
  values(v_user,p_endpoint,p_p256dh,p_auth_key,left(p_user_agent,500),true,now())
  on conflict(endpoint) do update
  set user_id=excluded.user_id,
      p256dh=excluded.p256dh,
      auth_key=excluded.auth_key,
      user_agent=excluded.user_agent,
      enabled=true,
      updated_at=now()
  returning id into v_id;

  insert into public.push_preferences(user_id,updated_at)
  values(v_user,now())
  on conflict(user_id) do nothing;

  return v_id;
end
$$;

revoke all on function public.register_push_subscription(text,text,text,text) from public,anon;
grant execute on function public.register_push_subscription(text,text,text,text) to authenticated;

create or replace function public.unregister_push_subscription(p_endpoint text)
returns boolean
language plpgsql
security definer
set search_path=''
as $$
declare
  v_user uuid := auth.uid();
  v_count integer;
begin
  if v_user is null then
    raise exception 'Authentication required';
  end if;

  delete from public.push_subscriptions
  where user_id=v_user
    and endpoint=p_endpoint;

  get diagnostics v_count = row_count;
  return v_count>0;
end
$$;

revoke all on function public.unregister_push_subscription(text) from public,anon;
grant execute on function public.unregister_push_subscription(text) to authenticated;

commit;
