# Safe cleanup and performance audit

Status: pre-deployment audit on `codex/audit-cleanup-37-11`. Nothing in this branch has been deployed and no production database write has been made.

## Protected baseline

| Item | Confirmed baseline |
| --- | --- |
| Source branch | `main` |
| Known-good commit | `fc4641771ffa37c539528b72b49d95bf996bfb89` |
| Working audit branch | `codex/audit-cleanup-37-11` |
| Deployed application version | 37.11 |
| Proposed branch version | 37.12 |
| Supabase project reference | `voaygfleqceqacvqixxp` |
| Repository migration level | Schema 39 |
| Production backup and recovery status | The Supabase dashboard confirms that this Free-plan project has no scheduled backups and PITR is not enabled. WAL archiving is active with 1,688 successful archives, zero failures and a latest archived WAL at 2026-09-19 23:58:57 UTC, but it does not provide a user-restorable recovery point. |

The remote `main` reference still resolves to the protected commit. The production URL, manifest identity, scope and `start_url` are unchanged.

## Architecture and startup trace

This is a static global-script PWA, not a React application. It has no React components, hooks, `useEffect` calls, runtime npm dependencies, build step, bundle chunks or component rerender model.

The normal signed-in startup is:

1. The browser loads `index.html`, the theme bootstrap, CSS, the pinned Supabase browser library, `app-core.js` and `app-ui.js`.
2. The existing service worker serves versioned shell assets cache-first and navigation network-first. Supabase Auth, REST, Storage and Realtime traffic bypasses the service-worker cache.
3. One Supabase client is created in `app-core.js`.
4. One auth listener records session changes, while `getSession()` resolves the initial session.
5. A near-expiry session is renewed once before protected roster access.
6. The browser requests the protected `get_roster_startup_v37` snapshot. Android uses the bounded XHR transport; other platforms use bounded `fetch`.
7. Only if that protected transport fails does the revision-consistent compatibility reader run.
8. The snapshot supplies active account access, staffing, allocation state, settings, schema version and sync revision in one consistent response.
9. The calculated 138-night roster is rebuilt and rendered.
10. The launch screen closes. Optional private profile/photo data continues without holding the roster behind the launch screen.
11. One realtime channel starts, a 15-second visible-page revision check starts, and the selected night's three history tables load without blocking the core roster.
12. Administrators load the authorised-account list in the background.

## Measured baseline and branch comparison

The shell measurements are deterministic local sizes. The authenticated browser figures below were collected in a cloud Chrome session against deployed production 37.11, so they are useful audit evidence but are not presented as a colleague-phone benchmark or as a direct 37.12 branch comparison.

| Metric | 37.11 before | 37.12 branch | Result |
| --- | ---: | ---: | --- |
| Shipped text assets, raw | 513,147 B | 515,971 B | +2,824 B |
| Shipped text assets, gzip estimate | 117,636 B | 118,445 B | +809 B |
| `app-core.js`, raw | 41,312 B | 42,058 B | +746 B |
| `app-ui.js`, raw | 220,991 B | 223,047 B | +2,056 B |
| Restored-session authorisation attempts | 2 | 1 | duplicate removed |
| Protected startup snapshots after restored session | up to 2 | 1 | follow-up reload removed |
| Optional private-profile request on roster-visible critical path | yes | no | moved off critical path |
| Supabase clients | 1 | 1 | unchanged |
| Auth listeners | 1 | 1 | unchanged |
| Realtime channels | 1 active channel | 1 active channel | unchanged |

| Authenticated live measurement | Result |
| --- | ---: |
| Restored-session reload to visible signed-in account control, run 1 | 741 ms |
| Restored-session reload to visible signed-in account control, run 2 | 865 ms |
| Restored-session reload to visible signed-in account control, run 3 | 896 ms |
| Restored-session median | 865 ms |
| `get_roster_startup_v37` database execution, normal member | 5.66 ms |
| `get_roster_startup_v37` database execution, administrator | 9.83 ms |
| Production `pg_stat_statements` mean for the startup RPC | 8.79 ms across 88 observed calls |
| Startup RPC disk/temp blocks in the production aggregate | 0 / 0 |

The branch is slightly larger because it restores bounded expired-session recovery, adds regression coverage and records the release. This is not represented as a bundle-size improvement. The measurable improvement is less startup work: one authorisation and one protected snapshot instead of the duplicated restored-session path, with optional private profile/photo requests no longer delaying interactivity.

The live database work is fast and cache-resident, so the snapshot query itself is not the likely cause of multi-second startup reports. A branch-hosted authenticated trace is still required to measure 37.12 end to end, and this browser surface did not expose a trustworthy resource waterfall or memory profile. The only console errors observed came from the browser-control extension, not from the roster origin.

## Confirmed findings and changes

### B. Duplicated and safe to consolidate

Git history showed that the 37.9 allocation-render repair accidentally reverted the immediately preceding restored-session repair. It removed its regression test and made both the auth-state callback and `getSession()` call `authorizeUser`. The shared-load coalescer prevented simultaneous writes, but deliberately scheduled another full snapshot after the first request, so a normal restored session could perform two authorisation attempts and two protected roster snapshots.

The branch restores the single-authorisation contract and its deterministic test while retaining the later allocation-render correction.

### C. Proven performance issue

`authorizeUser` waited up to six seconds for optional `user_profiles` data and, when present, a signed profile-photo URL before dismissing the launch screen. Shared roster data was already validated and rendered at that point. The branch closes the launch screen as soon as the protected roster is ready, then lets the optional private profile settle. Onboarding still waits for the profile, preserving its existing behaviour.

### E. Working code intentionally retained

- The Android XHR startup transport and revision-consistent compatibility reads were added for a real affected-device failure. They are fallback paths, not parallel normal startup paths.
- The read-only saved-roster fallback remains; there is no offline write queue.
- The schema-33 role-override wrapper remains for older installed clients.
- All atomic absence, overtime, allocation, finalisation and night-role RPC calls remain.
- The single realtime channel, revision recovery row and statement-level sync triggers remain.
- The current update banner, controlled service-worker activation and cache cleanup remain.
- Direct administrator writes for account activation, publishing and prospective team versions remain unchanged; their live RLS policies were verified, while broader policy tightening is deferred to a dedicated migration.

## Frontend query audit

| Area | Current behaviour | Audit result |
| --- | --- | --- |
| Initial shared roster | One protected snapshot; compatibility only after transport failure | Keep |
| Initial auth | One `getSession`; refresh only near expiry or after an auth rejection | Fixed and covered |
| Private profile | One selected-column query, plus one signed URL only when an avatar exists | Keep; no longer blocks launch |
| Current-night history | Three independent history queries in parallel and guarded per date | Keep; non-blocking |
| Admin account list | One background query for administrators only | Keep; consider selected columns later |
| Realtime recovery | One channel plus one cheap revision query every 15 seconds while visible | Two simultaneous authenticated clients reached Live state and rendered identical data; keep pending a safe non-production write-propagation test |
| Compatibility startup | Thirteen authorised reads in a revision-consistent retry envelope | Cautious fallback; do not remove without affected-device testing |
| Full reload after a realtime event | Debounced protected snapshot, with selected-night history invalidation where applicable | Potential optimisation, but correctness-sensitive |

Several fallback/admin queries use `select('*')`. Narrowing them could reduce response size, but the live column contract and affected-device path must be captured before changing them.

## Service worker and PWA audit

- Exactly one service worker is registered.
- Navigation is network-first with cached `index.html` fallback.
- Versioned same-origin shell files and the pinned Supabase library are cache-first.
- Supabase authentication, REST, realtime and private photo traffic is not cached.
- Old named caches are deleted on activation.
- Activation still waits for explicit user approval and reloads only after `controllerchange`.
- Manifest `id`, `start_url`, `scope`, display mode and production URL are unchanged.
- `./` and `./index.html` are both retained in the app shell because the manifest starts at `./` while the offline navigation fallback explicitly matches `./index.html`.

No multiple registration or stale-cache workaround was found. Update checks on load, focus, visibility and every 15 minutes do not gate roster startup.

## Supabase repository audit

The repository contains forward migrations from schema 33 through 39, not the original database creation migrations. Repository-observable objects are:

- `app_sync_state`, its active-member select policy and `bump_app_sync_state_v33`.
- Statement-level sync triggers on the shared roster tables listed in schema 33, plus `allowed_users` from schema 34.
- `set_roster_identity_v34`.
- `apply_night_role_override_v35` and the deliberate `apply_night_role_override_v33` compatibility wrapper.
- `night_role_assignments_valid_v38`, which replaced the schema-36 validator in the active table constraint.
- `get_roster_startup_v37`.
- The partial unique roster-name index.
- `app_sync_state` in the Supabase Realtime publication.

Schema 38 and 39 use `create or replace function`, so they do not leave several live v35 functions with the same signature. Schema 39 corrects the v35 body; it does not create a second constraint. Trigger migrations drop the known trigger name before creating it, so replay does not accumulate same-name copies.

Anonymous REST probes returned HTTP 401 for protected roster tables, and no production row was readable through the anonymous role. No service-role or database credential is present in the browser source.

### Live backend verification completed 2026-09-20

The production project is healthy on Postgres 17.6.1. The live catalogue contains 17 public tables, all 17 with RLS enabled, 51 public policies, four `storage.objects` policies, 13 non-internal public triggers, 16 public functions, 23 public indexes and 46 public constraints. The deployed migration history exactly contains the seven repository migrations from schema 33 through 39. No duplicate same-name trigger or duplicate live v35 overload was found.

The function and grant review found:

- no anonymous execution grant on the protected startup or mutation RPCs;
- all seven externally callable `SECURITY DEFINER` functions use a fixed `search_path` and perform an active-member or administrator check directly or through the reviewed v35 callee;
- the v33 night-role function is only the intentional compatibility wrapper around v35;
- `valid_night_role_assignments` remains anonymously executable, but it is a pure immutable JSON validator with no table access;
- the Supabase security advisor reports the seven expected callable `SECURITY DEFINER` functions as warnings, not evidence that their reviewed membership checks failed;
- leaked-password protection is disabled and should be considered separately from this branch.

The RLS and permission matrix was exercised without mutations. An active administrator could read all six authorised-account rows, an active member could read only their own authorised-account row and own profile while reading shared roster data, an unauthorised authenticated identity saw zero protected rows, and `anon` was denied table access. No policy uses user-editable metadata for authorisation. The five current `auth.uid()`/`auth.jwt()` policy expressions flagged by the performance advisor should later use init-plan-safe `(select auth.uid())`/`(select auth.jwt())` forms. The two permissive `allowed_users` SELECT policies are also a confirmed low-scale optimisation target.

One important integrity issue is now confirmed for a dedicated future migration: active members have direct INSERT/UPDATE/DELETE policies on several current staffing tables and direct INSERT policies on history tables. That means a technically capable signed-in member can bypass the application's atomic RPC pairing and can supply arbitrary `changed_by` text, even though the shipped application correctly uses the versioned RPCs. Removing that bypass requires a staged grant/RLS/RPC compatibility plan and must not be folded into this safe cleanup branch.

Realtime publishes 13 public tables while the client subscribes to 12 table feeds plus `app_sync_state`. Most shared writes therefore produce both a source-table event and the statement-level revision event; the 350 ms reload debounce normally coalesces them. `roster_nights` is published but not subscribed by the current client, while `app_settings` is subscribed but relies on its `app_sync_state` trigger because it is not published directly. This is real cleanup potential, but changing publication membership is correctness-sensitive and is not proposed here.

The revision poll is inexpensive at the database: 1.477 ms mean across 1,454 observed calls. History reads average 0.254–0.742 ms and profile reads average 1.400 ms. There are no Edge Functions, no installed `pg_cron` extension or scheduled jobs, and the only installed non-core extensions are `pg_stat_statements`, `pgcrypto`, `supabase_vault` and `uuid-ossp`.

Storage has one private `profile-photos` bucket, a 2 MiB limit, JPEG/PNG/WebP allow-list and four owner-prefix policies covering SELECT, INSERT, UPDATE and DELETE. Auth currently has three confirmed email users, no banned users, no verified MFA factors and eight non-expired sessions. Exact Auth dashboard toggles beyond the advisor-visible leaked-password setting were not changed.

WAL archiving is operating with 1,688 successful archives and zero failures. The authenticated Supabase dashboard confirms that the project is on the Free plan, scheduled backups are not included and PITR is not enabled because it is a Pro-plan add-on. Therefore there is no dashboard-retained backup or latest user-restorable recovery point to confirm. The healthy archiver counters do not change that recovery gap, which must be resolved before deployment through an approved backup/restore plan.

## Dependency, bundle and code audit

- There are no production npm dependencies to remove.
- Supabase JS is one pinned CDN dependency.
- No abandoned legacy files named by `AGENTS.md` remain.
- No obvious unused named function, debug statement, `TODO`, `FIXME` or commented-out implementation was found.
- The 197,089-byte stylesheet contains approximately 1,902 rule heads and 297 repeated selector heads from 49 historical CSS commits. This is real maintainability debt, but not safe category-A deletion without complete light/dark responsive visual regression coverage.
- The 191,027-byte 1200×415 logo is the largest initial same-origin asset. It is fetched once despite several DOM uses. Image re-encoding is deferred because pixel/profile equivalence and device rendering have not been verified.

## Security and data preservation

- No database migration was created.
- No Supabase object, policy, function, trigger, index, row or user was changed.
- Catalogue metadata, aggregate counts and the signed-in administrator's normal application view were read; no raw account list, private profile content or roster export was copied into the report.
- RLS was not disabled or relaxed.
- Existing atomic write contracts and security-definer membership checks remain.
- The verified 138-night rotation, fingerprint, Pager/Reliever rules, five/seven-nurse rules and all allocation safety tests pass.

## Tests completed

- `npm test`: pass.
- Rotation, staffing, Malta operational-night and PWA safety: pass.
- Expanded allocation, consistency, offline, accessibility and privacy safety: pass.
- Startup transport, saved-roster recovery, single restored-session authorisation, expired-token single refresh, optional-profile ordering and seven-nurse render: pass.
- Version, release-history, manifest and service-worker cache consistency: pass after the 37.12 version update.

Authenticated administrator login, three restored-session reloads, the administrator interface, simulated normal-member/unauthorised/anonymous RLS reads, two simultaneous Live clients, live function plans, advisors, the full database catalogue and the dashboard backup/PITR entitlement were verified. A production write was deliberately not made, so cross-client change propagation is not claimed. Normal-member UI rendering, logout/login, installed-PWA reopening, a branch-hosted 37.12 waterfall and responsive screenshots remain outstanding. Production recovery capability is now a confirmed gap rather than an unverified item.

## Technical debt

### Safe to address later

- Add development-only stage timing and request-count capture, without shipping permanent diagnostics to production.
- Narrow `select('*')` only after capturing the live column contract.
- Losslessly optimise large image assets after pixel and profile comparison.
- Consolidate CSS in small visual-regression-backed groups.
- Investigate a `realtimeConnecting` guard if a live trace confirms channel churn during rapid focus/pageshow/visibility events.
- Consolidate direct table-write policies behind the atomic RPC contract only through a dedicated compatibility migration and installed-client test plan.
- Derive audit actor identity from the authenticated claim instead of accepting arbitrary client-supplied `changed_by` text.
- Optimise the five auth-expression policies and the overlapping `allowed_users` SELECT policies after permission regression tests.
- Review whether source-table Realtime subscriptions/publication entries are still needed alongside `app_sync_state`; do not remove them without a two-client write test.
- Decide whether to enable leaked-password protection after reviewing user impact and recovery communications.
- Establish a tested production backup and restore plan; the current Free plan includes neither scheduled backups nor PITR.

### Do not touch without a dedicated migration/test plan

- RLS policies, grants and security-definer functions.
- Existing sync triggers and realtime publication membership.
- The v33 compatibility wrapper and v35 atomic role function.
- Existing indexes or schema columns.
- Replacing the schema-37 snapshot or Android compatibility transport.
- Incremental realtime patching in place of the correctness-first full snapshot.
- Authentication persistence, service-worker identity, manifest scope or installed-PWA update flow.

## Deployment gate

Do not deploy this branch yet. Before deployment it still needs:

1. Branch-hosted authenticated 37.12 request waterfall and comparison with the measured 37.11 production baseline.
2. Light/dark mobile smoke checks and installed-PWA reopening, despite no intended visual change.
3. Normal-member UI check; database-level member/admin/unauthorised/anonymous permissions are already verified.
4. Two-client change propagation in a non-production environment; both production clients reached Live state and converged, but no production write was permitted.
5. Establish and verify an approved production backup/restore capability; the current Free plan has no scheduled backups or PITR, and healthy WAL archiver counters are not a user-restorable recovery point.
6. Owner review and explicit approval.
