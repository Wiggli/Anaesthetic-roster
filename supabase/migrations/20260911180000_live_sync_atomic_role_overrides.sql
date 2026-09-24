-- Schema 33: resilient live-update signal and atomic night-only role changes.

create table if not exists public.app_sync_state (
  id integer primary key check (id = 1),
  revision bigint not null default 0,
  updated_at timestamptz not null default now()
);

insert into public.app_sync_state (id, revision)
values (1, 0)
on conflict (id) do nothing;

alter table public.app_sync_state enable row level security;
alter table public.app_sync_state replica identity full;

revoke all on public.app_sync_state from public, anon;
grant select on public.app_sync_state to authenticated;

drop policy if exists "Shift members can view app sync state"
on public.app_sync_state;

create policy "Shift members can view app sync state"
on public.app_sync_state
for select
to authenticated
using (public.is_shift_member());

create or replace function public.bump_app_sync_state_v33()
returns trigger
language plpgsql
security definer
set search_path = public
as $function$
begin
  update public.app_sync_state
  set revision = revision + 1,
      updated_at = now()
  where id = 1;
  return null;
end
$function$;

revoke all on function public.bump_app_sync_state_v33()
from public, anon, authenticated;

do $migration$
declare
  v_table text;
begin
  foreach v_table in array array[
    'night_changes',
    'night_overtime',
    'night_change_history',
    'night_overtime_history',
    'night_five_cover',
    'roster_settings',
    'rotation_versions',
    'night_plan_status',
    'app_settings',
    'night_labour_order',
    'night_role_overrides',
    'night_role_override_history'
  ]
  loop
    if to_regclass('public.' || v_table) is not null then
      execute format(
        'drop trigger if exists bump_app_sync_state_v33 on public.%I',
        v_table
      );
      execute format(
        'create trigger bump_app_sync_state_v33 after insert or update or delete on public.%I for each statement execute function public.bump_app_sync_state_v33()',
        v_table
      );
    end if;
  end loop;
end
$migration$;

do $publication$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'app_sync_state'
  ) then
    alter publication supabase_realtime
    add table public.app_sync_state;
  end if;
end
$publication$;

create or replace function public.apply_night_role_override_v33(
  p_roster_date date,
  p_action text,
  p_assignments jsonb,
  p_override_reason text,
  p_history_reason text,
  p_changed_by text
)
returns void
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_action text := lower(trim(coalesce(p_action, '')));
  v_changed_by text := trim(coalesce(p_changed_by, ''));
  v_override_reason text := trim(coalesce(p_override_reason, ''));
  v_previous_assignments jsonb := '{}'::jsonb;
  v_allowed_names text[];
  v_required_keys text[] := array[
    'first1', 'first2', 'second1', 'second2', 'pager', 'reliever'
  ];
  v_key text;
begin
  if not public.is_shift_member() then
    raise exception 'Only active shift members can change night roles.';
  end if;

  if p_roster_date is null then
    raise exception 'A roster date is required.';
  end if;

  if length(v_changed_by) = 0 then
    raise exception 'The person making the change is required.';
  end if;

  if v_action not in ('save', 'reset') then
    raise exception 'Unsupported night-role action.';
  end if;

  select assignments
  into v_previous_assignments
  from public.night_role_overrides
  where roster_date = p_roster_date;

  v_previous_assignments := coalesce(v_previous_assignments, '{}'::jsonb);

  if v_action = 'save' then
    if p_assignments is null
       or jsonb_typeof(p_assignments) <> 'object'
       or jsonb_object_length(p_assignments) <> 6 then
      raise exception 'Exactly six role assignments are required.';
    end if;

    foreach v_key in array v_required_keys
    loop
      if length(trim(coalesce(p_assignments ->> v_key, ''))) = 0 then
        raise exception 'Every core role must have a nurse.';
      end if;
    end loop;

    select array[
      first1, first2, second1, second2, pager, reliever
    ]
    into v_allowed_names
    from public.rotation_versions
    where effective_from <= p_roster_date
    order by effective_from desc
    limit 1;

    if v_allowed_names is null or exists (
      select 1
      from jsonb_each_text(p_assignments)
      where not (trim(value) = any(v_allowed_names))
    ) then
      raise exception 'Assignments must use the permanent nurses effective for this night.';
    end if;

    if (
      select count(distinct trim(value))
      from jsonb_each_text(p_assignments)
    ) <> 6 then
      raise exception 'Each core role must have a different nurse.';
    end if;

    if length(v_override_reason) = 0 or length(v_override_reason) > 120 then
      raise exception 'A reason of 1 to 120 characters is required.';
    end if;

    insert into public.night_role_overrides (
      roster_date, assignments, reason, updated_by, updated_at
    ) values (
      p_roster_date, p_assignments, v_override_reason, v_changed_by, now()
    )
    on conflict (roster_date) do update
    set assignments = excluded.assignments,
        reason = excluded.reason,
        updated_by = excluded.updated_by,
        updated_at = excluded.updated_at;

    insert into public.night_role_override_history (
      roster_date, action, assignments, reason, changed_by, changed_at
    ) values (
      p_roster_date,
      'saved',
      p_assignments,
      coalesce(nullif(trim(p_history_reason), ''), v_override_reason),
      v_changed_by,
      now()
    );
  else
    delete from public.night_role_overrides
    where roster_date = p_roster_date;

    insert into public.night_role_override_history (
      roster_date, action, assignments, reason, changed_by, changed_at
    ) values (
      p_roster_date,
      'reset',
      v_previous_assignments,
      coalesce(nullif(trim(p_history_reason), ''), 'Reset to calculated roster'),
      v_changed_by,
      now()
    );
  end if;
end
$function$;

revoke all on function public.apply_night_role_override_v33(
  date, text, jsonb, text, text, text
)
from public, anon;

grant execute on function public.apply_night_role_override_v33(
  date, text, jsonb, text, text, text
)
to authenticated;

update public.app_schema_version
set version = 33
where id = 1;
