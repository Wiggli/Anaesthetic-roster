-- Schema 57: the guarded SECURITY DEFINER RPCs are the only clinical write API.
-- Existing SELECT policies, realtime publication and server-owned history remain intact.
begin;
revoke insert, update, delete, truncate, references, trigger on table
  public.night_changes,
  public.night_overtime,
  public.night_five_cover,
  public.night_labour_order,
  public.night_plan_status,
  public.night_role_overrides,
  public.night_team_identity,
  public.night_change_history,
  public.night_overtime_history,
  public.night_role_override_history,
  public.roster_settings,
  public.rotation_versions,
  public.roster_operation_log,
  public.roster_audit_events
from public, anon, authenticated;
update public.app_schema_version set version=57 where id=1;
commit;
