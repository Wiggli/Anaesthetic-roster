begin;

-- Keep account safety on the server, including older clients using table updates.
create or replace function public.guard_account_access_v54()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is not null then
    if not public.is_roster_admin() then
      raise exception 'ACCOUNT_ADMIN_REQUIRED' using errcode='42501';
    end if;
    perform pg_advisory_xact_lock(540054);
    if lower(old.email)=lower(auth.jwt()->>'email') and
       (tg_op='DELETE' or new.active is not true or new.user_role<>'admin' or new.email<>old.email) then
      raise exception 'ACCOUNT_SELF_PROTECTED' using errcode='42501';
    end if;
    if old.active and old.user_role='admin' and
       (tg_op='DELETE' or new.active is not true or new.user_role<>'admin') and
       not exists(select 1 from public.allowed_users where active and user_role='admin' and email<>old.email) then
      raise exception 'ACCOUNT_LAST_ADMIN' using errcode='42501';
    end if;
  end if;
  if tg_op='DELETE' then return old; end if;
  return new;
end $$;
revoke all on function public.guard_account_access_v54() from public, anon, authenticated;
drop trigger if exists guard_account_access_v54 on public.allowed_users;
create trigger guard_account_access_v54 before update or delete on public.allowed_users
for each row execute function public.guard_account_access_v54();

create or replace function public.set_account_access_v54(
  p_email text, p_active boolean, p_role text,
  p_expected_active boolean, p_expected_role text, p_client_version text
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_account public.allowed_users%rowtype;
begin
  if auth.uid() is null or not public.is_roster_admin() then
    raise exception 'ACCOUNT_ADMIN_REQUIRED' using errcode='42501';
  end if;
  perform public.assert_app_write_compatible_v49(p_client_version);
  if p_active is null or p_role is null or p_role not in ('member','admin') then
    raise exception 'ACCOUNT_INVALID_ACCESS' using errcode='22023';
  end if;
  perform pg_advisory_xact_lock(540054);
  select * into v_account from public.allowed_users where email=p_email for update;
  if not found then raise exception 'ACCOUNT_NOT_FOUND' using errcode='P0002'; end if;
  if v_account.active is distinct from p_expected_active or v_account.user_role is distinct from p_expected_role then
    raise exception 'ACCOUNT_ACCESS_CHANGED' using errcode='40001';
  end if;
  update public.allowed_users set active=p_active,user_role=p_role where email=p_email
  returning * into v_account;
  return jsonb_build_object('email',v_account.email,'active',v_account.active,'user_role',v_account.user_role);
end $$;
revoke all on function public.set_account_access_v54(text,boolean,text,boolean,text,text) from public,anon,authenticated;
grant execute on function public.set_account_access_v54(text,boolean,text,boolean,text,text) to authenticated;

update public.app_schema_version set version=54,updated_at=now() where id=1;
commit;
