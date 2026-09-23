-- Security hardening for an authenticated-only application.
--
-- Night Roster does not make any anonymous PostgREST or RPC requests. Supabase
-- Auth remains public through the separate Auth API, while every public-schema
-- request must carry an authenticated user session and still pass RLS.

begin;

revoke usage on schema public from anon;
revoke all privileges on all tables in schema public from anon;
revoke all privileges on all sequences in schema public from anon;
revoke all privileges on all functions in schema public from anon;

alter default privileges for role postgres in schema public
  revoke all privileges on tables from anon;
alter default privileges for role postgres in schema public
  revoke all privileges on sequences from anon;
alter default privileges for role postgres in schema public
  revoke all privileges on functions from anon;

update public.app_schema_version
set version = 41,
    updated_at = now()
where id = 1;

commit;

-- Rollback, if an intentionally public database endpoint is introduced later:
-- grant usage on schema public to anon;
-- grant only the minimum object-specific privileges required by that endpoint.
-- Do not restore blanket anonymous grants.
