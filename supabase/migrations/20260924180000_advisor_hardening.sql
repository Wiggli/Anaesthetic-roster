-- Safe Supabase advisor hardening.
-- Preserve application behaviour while removing redundant RLS evaluation and
-- unnecessary SECURITY DEFINER execution from two functions that do not need it.

begin;

-- These two permissive SELECT policies are semantically ORed by PostgreSQL.
-- Combining them avoids evaluating two policies for every access_requests read.
drop policy if exists "Admins can view access requests" on public.access_requests;
drop policy if exists "Users can view own access request" on public.access_requests;

create policy "Authenticated users can view permitted access requests"
on public.access_requests
for select
to authenticated
using (
  (select public.is_roster_admin())
  or (
    (select auth.uid()) = user_id
    and lower(email) = lower(coalesce((select auth.jwt()) ->> 'email', ''))
  )
);

-- This legacy compatibility wrapper only forwards to the protected v35 function.
-- It does not need elevated privileges itself.
alter function public.apply_night_role_override_v33(date,text,jsonb,text,text,text)
  security invoker;
alter function public.apply_night_role_override_v33(date,text,jsonb,text,text,text)
  set search_path = '';

-- Authenticated users already have DELETE on push_subscriptions and an
-- owner-scoped RLS DELETE policy, so unregistration should run as the caller.
alter function public.unregister_push_subscription(text)
  security invoker;

commit;
