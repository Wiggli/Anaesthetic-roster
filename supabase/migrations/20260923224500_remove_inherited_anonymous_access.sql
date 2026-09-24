-- Complete the authenticated-only boundary introduced by schema 41.
--
-- PostgreSQL roles inherit grants made to the special PUBLIC role. Revoking a
-- privilege from anon alone therefore does not remove a matching PUBLIC grant.
-- Existing authenticated and service-role grants are explicit and are retained.

begin;

revoke usage on schema public from public;
revoke all privileges on all tables in schema public from public;
revoke all privileges on all sequences in schema public from public;
revoke execute on all functions in schema public from public;

grant usage on schema public to authenticated, service_role;

alter default privileges for role postgres in schema public
  revoke all privileges on tables from public;
alter default privileges for role postgres in schema public
  revoke all privileges on sequences from public;
alter default privileges for role postgres in schema public
  revoke execute on functions from public;

update public.app_schema_version
set version = 42,
    updated_at = now()
where id = 1;

commit;

-- If an intentionally public endpoint is introduced later, grant only its
-- minimum object-specific privilege to anon. Do not restore PUBLIC grants.
