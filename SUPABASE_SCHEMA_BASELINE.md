# Supabase schema baseline

Reviewed against application version 36.9 and database schema 36. This is a review baseline, not a replacement migration and not a database dump. Existing deployed migrations remain forward-only and must not be rewritten.

## Shared operational data

| Object | Application purpose | Required protection |
| --- | --- | --- |
| `allowed_users` | Authorised email, approved display name, role, active state and optional administrator-approved roster identity | Active-member reads; administrator writes; prevent self-deactivation |
| `app_schema_version` | Single exact deployed schema number | Active-member read; deployment-controlled write |
| `app_settings` | Protected operational settings such as email recipients and shift times | Active-member read; administrator write |
| `roster_settings` | Published roster boundary | Active-member read; administrator write |
| `rotation_versions` | Prospective permanent-team versions | Active-member read; administrator write; preserve earlier nights |
| `night_changes` and `night_change_history` | Current absences and immutable actor/time history | Active-member read; atomic versioned RPC writes |
| `night_overtime` and `night_overtime_history` | Current overtime allocations and immutable actor/time history | Active-member read; atomic versioned RPC writes |
| `night_five_cover` | Saved five-nurse reliever decision | Active-member read; validated RPC writes |
| `night_labour_order` | Saved Labour Ward order where applicable | Active-member read; validated RPC writes |
| `night_plan_status` | Final or provisional plan status | Active-member read; atomic finalisation RPC writes |
| `night_role_overrides` and `night_role_override_history` | One-night agreed core-role arrangement and its audit history | Active-member read; atomic schema 35 RPC writes |
| `app_sync_state` | Monotonic revision used to recover missed realtime events | Active-member read; trigger-only write |

## Private account data

| Object | Application purpose | Required protection |
| --- | --- | --- |
| `user_profiles` | The signed-in user's optional preferred name, job title and private avatar path | The user may read and write only their own row |
| `profile-photos` | Private profile photographs served with short-lived signed URLs | The user may access only their own object prefix |

Profile details and photographs must remain outside administrator roster-data exports. A highlighted local name is presentation state only and must never be treated as verified roster identity.

## Required atomic interfaces

The supported shared-write contract is `record_night_absence_v25`, `remove_night_absence_v25`, `add_night_overtime_v25`, `remove_night_overtime_v25`, `apply_staffing_allocations_v25`, `finalise_night_plan_v26`, and `apply_night_role_override_v35`. Application code must stop with an upgrade message if one is unavailable, rather than falling back to separate current-row and history writes.

Schema 34 adds `allowed_users.roster_name` and `set_roster_identity_v34`. The value is an internal permanent-roster identifier, is unique when present, and can be changed only by an active administrator through the validated RPC.

Schema 35 extends the atomic role-override contract with a validated, explicit five-person night-only arrangement. It also replaces the schema-33 function with a compatibility wrapper so older installed clients no longer call the unavailable `jsonb_object_length(jsonb)` routine. Normal Reliever-first five-nurse planning remains the default.

Schema 36 expands the pre-existing `night_role_overrides_valid` table constraint to accept that reviewed five-person structure alongside the original six-role structure. It rejects missing or extra keys, blank values and duplicate nurse names before a row can be stored.

## Deployment review

Before merging a schema change, review the generated SQL, confirm every object is forward-only and safely repeatable where practical, run deterministic policy checks, and verify that `EXPECTED_SCHEMA_VERSION` matches the migration. After an explicitly approved deployment, verify schema diagnostics, authorised access, atomic staffing history, two-device realtime refresh, private profile isolation and administrator-only identity binding.
