-- Schema 43: allow authenticated newcomers to request access without opening roster data.

begin;

create table if not exists public.access_requests (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  display_name text not null,
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  requested_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by text,
  constraint access_requests_email_not_blank check (length(trim(email)) between 3 and 320),
  constraint access_requests_display_name_length check (length(trim(display_name)) between 1 and 100)
);

create index if not exists access_requests_status_requested_at_idx
  on public.access_requests (status, requested_at desc);

alter table public.access_requests enable row level security;

revoke all privileges on table public.access_requests from public, anon, authenticated;
grant select, insert on table public.access_requests to authenticated;
grant update (status, reviewed_at, reviewed_by) on table public.access_requests to authenticated;

drop policy if exists "Users can view own access request" on public.access_requests;
create policy "Users can view own access request"
on public.access_requests
for select
to authenticated
using (
  (select auth.uid()) = user_id
  and lower(email) = lower(coalesce((select auth.jwt()) ->> 'email', ''))
);

drop policy if exists "Admins can view access requests" on public.access_requests;
create policy "Admins can view access requests"
on public.access_requests
for select
to authenticated
using ((select public.is_roster_admin()));

drop policy if exists "Users can request own access" on public.access_requests;
create policy "Users can request own access"
on public.access_requests
for insert
to authenticated
with check (
  (select auth.uid()) = user_id
  and lower(email) = lower(coalesce((select auth.jwt()) ->> 'email', ''))
  and status = 'pending'
  and reviewed_at is null
  and reviewed_by is null
);

drop policy if exists "Admins can review access requests" on public.access_requests;
create policy "Admins can review access requests"
on public.access_requests
for update
to authenticated
using ((select public.is_roster_admin()))
with check ((select public.is_roster_admin()));

update public.app_schema_version
set version = greatest(version, 43),
    updated_at = now()
where id = 1;

commit;
