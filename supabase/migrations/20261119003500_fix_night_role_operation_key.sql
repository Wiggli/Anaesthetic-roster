-- PostgreSQL concatenates text with ||. Keep the role save/reset operation
-- keys stable so the existing idempotency and revision checks still apply.
create or replace function public.apply_night_role_override_v48(
  p_roster_date date,
  p_action text,
  p_assignments jsonb,
  p_override_reason text,
  p_history_reason text,
  p_changed_by text,
  p_operation_id uuid,
  p_expected_sync_revision bigint
)
returns void
language plpgsql
security invoker
set search_path=''
as $$
begin
  if not public.claim_roster_operation_v48(p_operation_id,'roles-'||coalesce(p_action,'unknown'),p_roster_date,p_expected_sync_revision) then return; end if;
  perform public.assert_roster_fresh_v48(p_expected_sync_revision);
  perform public.apply_night_role_override_v35(p_roster_date,p_action,p_assignments,p_override_reason,p_history_reason,p_changed_by);
end
$$;
