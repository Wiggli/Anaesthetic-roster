-- Schema 40: preserve the existing access model while avoiding repeated
-- per-row Auth helper evaluation and duplicate permissive SELECT policies.

begin;

drop policy if exists "Admin can view all accounts"
on public.allowed_users;

drop policy if exists "Users can view their account"
on public.allowed_users;

create policy "Authenticated accounts can view permitted accounts"
on public.allowed_users
for select
to authenticated
using (
  public.is_roster_admin()
  or lower(email) = lower(coalesce((select auth.jwt()) ->> 'email', ''))
);

drop policy if exists "Members can view their own profile"
on public.user_profiles;

create policy "Members can view their own profile"
on public.user_profiles
for select
to authenticated
using (
  (select auth.uid()) = user_id
  and public.is_shift_member()
);

drop policy if exists "Members can create their own profile"
on public.user_profiles;

create policy "Members can create their own profile"
on public.user_profiles
for insert
to authenticated
with check (
  (select auth.uid()) = user_id
  and public.is_shift_member()
);

drop policy if exists "Members can update their own profile"
on public.user_profiles;

create policy "Members can update their own profile"
on public.user_profiles
for update
to authenticated
using (
  (select auth.uid()) = user_id
  and public.is_shift_member()
)
with check (
  (select auth.uid()) = user_id
  and public.is_shift_member()
);

drop policy if exists "Members can delete their own profile"
on public.user_profiles;

create policy "Members can delete their own profile"
on public.user_profiles
for delete
to authenticated
using (
  (select auth.uid()) = user_id
  and public.is_shift_member()
);

update public.app_schema_version
set version = 40
where id = 1;

commit;
