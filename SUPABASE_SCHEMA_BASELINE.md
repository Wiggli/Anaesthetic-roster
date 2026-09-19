# Supabase schema baseline

Reviewed against application version 37.12 and the repository migration chain through database schema 39. This is a review baseline, not a replacement migration and not a database dump. Existing deployed migrations remain forward-only and must not be rewritten. Live catalogue details such as every deployed policy, index, trigger and Edge Function still require authenticated Supabase management inspection before any object is removed.

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

Schema 37 adds `get_roster_startup_v37`, a read-only, security-definer startup snapshot. It verifies the caller against the active `allowed_users` row before returning only the shared roster tables already readable by shift members. This reduces cold startup from several consecutive REST requests to one internally consistent database response; it does not alter any roster calculation or write contract.

Schema 38 extends the validated night-only override shape to seven working nurses. It retains the same `apply_night_role_override_v35` RPC name so current clients keep one atomic write contract while accepting an explicit `mode: "7"` payload with the four theatre roles, Pager, Reliever and Seventh nurse.

Schema 39 corrects schema 38's JSON key-count check: seven roles plus the required `mode` key means eight object keys. It replaces the schema-38 definition of `apply_night_role_override_v35`; it does not create a second live overload or change the table constraint.

The schema-33 `apply_night_role_override_v33` wrapper remains a deliberate compatibility interface for installed clients that have not yet activated a newer service worker. Do not remove it solely because current source calls v35.

## Repository-observable triggers and realtime

Schema 33 installs one statement-level `bump_app_sync_state_v33` trigger on each shared operational table that existed when the migration ran, and schema 34 adds the same trigger to `allowed_users`. Each trigger updates the single `app_sync_state` row. `app_sync_state` is added to the `supabase_realtime` publication, while the browser subscribes through one named realtime channel and uses the revision as missed-event recovery.

The migration uses `drop trigger if exists` followed by `create trigger`, so rerunning the migration cannot accumulate duplicate triggers with that name. Whether older differently named triggers or additional realtime publication entries exist in production cannot be established from repository files alone.

## Deployment review

Before merging a schema change, review the generated SQL, confirm every object is forward-only and safely repeatable where practical, run deterministic policy checks, and verify that `EXPECTED_SCHEMA_VERSION` matches the migration. After an explicitly approved deployment, verify schema diagnostics, authorised access, atomic staffing history, two-device realtime refresh, private profile isolation and administrator-only identity binding.
