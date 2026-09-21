# Safe cleanup and performance audit

Status: pre-deployment audit with the schema-40 follow-up on `codex/rls-policy-performance`, stacked on draft PR #36. Nothing in either branch has been deployed and no production database write has been made.

## Protected baseline

| Item | Confirmed baseline |
| --- | --- |
| Source branch | `main` |
| Known-good commit | `fc4641771ffa37c539528b72b49d95bf996bfb89` |
| Working follow-up branch | `codex/rls-policy-performance` |
| Deployed application version | 37.11 |
| Proposed branch version | 37.12 |
| Supabase project reference | `voaygfleqceqacvqixxp` |
| Production / proposed repository schema | Schema 39 / Schema 40 |
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

The live database work is fast and cache-resident, so the snapshot query itself is not the likely cause of multi-second startup reports. A branch-hosted authenticated trace is still required to measure 37.12 end to end, and this browser surface did not expose a trustworthy resource waterfall or memory profile. A local checkout at `d44199ea79b900968a4263b998ee3d13c26d8b5e` passed the full test suite, but the cloud browser blocked loopback access before the application loaded. The immutable third-party preview was not given production roster credentials. Therefore no safe first-party authenticated 37.12 browser surface was available, and this gate remains open rather than being inferred from local or production 37.11 results. The only console errors observed during the production measurements came from the browser-control extension, not from the roster origin.

An authenticated production 37.11 desktop smoke check at 1363×936 covered Night, Changes and Breaks in light and dark themes. All three views rendered without horizontal document overflow, retained the Live state, and the theme switch updated the page from the light `#f2f2f7` surface to the dark `#000000` surface with corresponding high-contrast text. The session was restored to light mode afterwards. This does not replace the outstanding mobile viewport or installed-PWA checks.

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
| Realtime recovery | One channel plus one cheap revision query every 15 seconds while visible | Two simultaneous authenticated production clients reached Live state and rendered identical data. An isolated non-production trigger/publication test delivered the same three revisions to two independent WebSocket clients; keep pending a full two-browser application test. |
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

The proposed branch contains forward migrations from schema 33 through 40, not the original database creation migrations. Repository-observable objects are:

- `app_sync_state`, its active-member select policy and `bump_app_sync_state_v33`.
- Statement-level sync triggers on the shared roster tables listed in schema 33, plus `allowed_users` from schema 34.
- `set_roster_identity_v34`.
- `apply_night_role_override_v35` and the deliberate `apply_night_role_override_v33` compatibility wrapper.
- `night_role_assignments_valid_v38`, which replaced the schema-36 validator in the active table constraint.
- `get_roster_startup_v37`.
- The partial unique roster-name index.
- `app_sync_state` in the Supabase Realtime publication.
- The schema-40 policy-only optimisation, which keeps the same `allowed_users` and `user_profiles` access outcomes while making Auth helper calls init-plan safe and consolidating the two permissive account-read policies.

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

The production RLS and permission matrix was exercised without mutations. An active administrator could read all six authorised-account rows, an active member could read only their own authorised-account row and own profile while reading shared roster data, an unauthorised authenticated identity saw zero protected rows, and `anon` was denied table access. No policy uses user-editable metadata for authorisation. Schema 40 implements the five init-plan-safe Auth helper forms and consolidates the two permissive `allowed_users` SELECT policies without changing those outcomes.

One important integrity issue is now confirmed for a dedicated future migration: active members have direct INSERT/UPDATE/DELETE policies on several current staffing tables and direct INSERT policies on history tables. That means a technically capable signed-in member can bypass the application's atomic RPC pairing and can supply arbitrary `changed_by` text, even though the shipped application correctly uses the versioned RPCs. Removing that bypass requires a staged grant/RLS/RPC compatibility plan and must not be folded into this safe cleanup branch.

Realtime publishes 13 public tables while the client subscribes to 12 table feeds plus `app_sync_state`. Most shared writes therefore produce both a source-table event and the statement-level revision event; the 350 ms reload debounce normally coalesces them. `roster_nights` is published but not subscribed by the current client, while `app_settings` is subscribed but relies on its `app_sync_state` trigger because it is not published directly. This is real cleanup potential, but changing publication membership is correctness-sensitive and is not proposed here.

Supabase rejected a disposable branch before creation because branching is unavailable on the Free plan. A separate zero-cost eu-central-1 project was therefore used for a minimal isolated Realtime probe without copying any production data, users or roster logic. Two RLS-enabled probe tables, a fixed-search-path statement trigger and two publication entries produced zero security or performance advisor findings. Two independent WebSocket clients joined successfully and both received revisions 1, 2 and 3 after three REST writes. On the two timed warm runs, both clients received the revision event 493 ms and 521 ms after the REST response. The same disposable project later validated schema 40 against temporary account/profile fixtures: administrator, member and unauthorised read outcomes were preserved; own-profile insert/update/delete succeeded; cross-profile update remained blocked; the six targeted performance warnings fell to zero. The temporary fixtures were removed, leaving only the original two empty probe tables and zero advisor findings, and the project was paused again and confirmed `INACTIVE`. This verifies the database trigger/publication transport and schema-40 policy semantics in isolation, but it is not represented as a full two-device run of the roster application.

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

- One forward-only schema-40 policy-performance migration was created and tested only on the disposable project; it has not been applied to production.
- No production Supabase object, policy, function, trigger, index, row or user was changed.
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
- Schema-40 policy migration: pass on the disposable project for administrator/member/unauthorised reads, member-owned profile writes, denied cross-profile updates and zero performance-advisor findings.

Authenticated administrator login, three restored-session reloads, the administrator interface, production desktop light/dark rendering across Night, Changes and Breaks, simulated normal-member/unauthorised/anonymous RLS reads, two simultaneous production Live clients, isolated non-production two-client Realtime propagation, live function plans, advisors, the full database catalogue and the dashboard backup/PITR entitlement were verified. The remote references were rechecked on 20 September 2026: `main` remained `fc4641771ffa37c539528b72b49d95bf996bfb89`, draft PR #36 remained open and unmerged at `8f2c7bdb42fab5d745b1fd4097a9132ede7e3846`, and workflow run 105 succeeded with migration and deployment skipped. A production write was deliberately not made. Normal-member UI rendering, logout/login, installed-PWA reopening, a safe authenticated 37.12 browser trace, physical-device Realtime propagation and mobile responsive screenshots remain outstanding. Production recovery capability is now a confirmed gap rather than an unverified item.

## Original brief completion matrix

This matrix accounts for every section of the requested safe cleanup. “Verified” means the available repository, authenticated production read-only access or isolated test environment supplied direct evidence. “Deferred gate” means completing the item would require a production write, deployment, physical installed device, unavailable branch hosting or an approved recovery facility, so it is not represented as complete.

| # | Requested area | Outcome |
| --- | --- | --- |
| 1 | Protect working version | Verified. `main`, known-good commit, production version/project/schema and deployed objects were recorded. Both work branches and PRs remain separate, draft and unmerged. Production has no user-restorable scheduled backup or PITR, so backup remains a deployment blocker. |
| 2 | Git history | Verified. The 37.9 allocation-render change was identified as the regression that reinstated duplicate restored-session authorisation. Later auth, Android transport, snapshot, schema and PWA changes were traced before deciding what to retain. |
| 3 | Before baseline | Verified where safely measurable. Production 37.11 restored-session reloads were 741/865/896 ms, median 865 ms; bundle and asset bytes, startup database timings, request paths, console state and service-worker behaviour were recorded. Exact authenticated 37.12 browser timing is a deferred gate. |
| 4 | Startup sequence | Verified and documented from shell load through service worker, one client, session restore, protected snapshot, render, optional profile and Realtime. |
| 5 | Supabase client initialisation | Verified. One client and one auth listener exist. The duplicate restored-session authorisation was fixed; channel and timers have cleanup paths. |
| 6 | Frontend Supabase queries | Verified. Normal snapshot, compatibility reads, profile/photo, history, admin accounts and revision polling were mapped. The duplicated normal snapshot was fixed; correctness-sensitive fallback and background reads were retained. |
| 7 | Lifecycle effects | Not applicable to React because this application is plain global-script JavaScript. Timers, browser events, auth callbacks, coalescing and subscription lifecycle were audited instead. No retry loop was added. |
| 8 | Full backend inventory | Verified read-only. Production has 17 public tables, 17 RLS-enabled tables, 51 policies, 23 indexes, 46 constraints, no views/materialized views, 16 public functions, 13 public triggers, 13 Realtime tables, one private Storage bucket, no Edge Functions and no installed `pg_cron`. |
| 9 | Backend changes from fixes | Verified against migrations 33–39 and the live catalogue. Compatibility wrappers, replaced function bodies, active constraints, triggers and snapshot RPC were distinguished from duplicates. |
| 10 | RLS | Verified through catalogue, advisor and an admin/member/unauthorised/anonymous permission matrix. Schema 40 fixes five repeated Auth-helper evaluations and one overlapping permissive SELECT-policy finding without broadening access. |
| 11 | Database performance | Verified with live statement statistics and plans. Startup RPC, revision and history/profile reads are already fast; table sizes are very small; no production query justifies a new index. High sequential-scan counts are expected for one-to-dozens-row tables. |
| 12 | Functions/RPCs | Verified. All 16 were inventoried with arguments, volatility, security mode, fixed search path and execute grants. The v33 role wrapper is intentional compatibility, while v36/v38 validators are versioned dependencies rather than safe deletion candidates. |
| 13 | Triggers | Verified. Thirteen same-purpose statement-level triggers call one fixed-search-path revision function. No same-table duplicate or recursive trigger was found. |
| 14 | Edge Functions | Verified. None are deployed. |
| 15 | Realtime | Verified structurally and with two simultaneous production read-only clients plus two isolated write-event WebSocket clients. One channel is used and removed/replaced on resubscribe. Full application change propagation between two devices remains a deferred no-production-write gate. |
| 16 | Schema bloat | Classified. No category-A/B table, column, view, trigger, function or index deletion is justified. Versioned compatibility functions and publication overlap are category C/D and must remain. |
| 17 | Preserve Supabase project | Verified. The same production project remains in use; no production object, data, user, secret or setting changed. |
| 18 | Unused frontend code | Verified by static and history review. No confirmed obsolete source file, duplicate auth implementation, debug block or safe dead-code deletion was found. Historical CSS repetition is not proven unused. |
| 19 | Dependencies | Verified. There are no runtime npm dependencies; the one browser dependency is the pinned Supabase CDN library. No removal or upgrade is proposed. |
| 20 | Production bundle | Verified for this unbundled static application. Raw/gzip JavaScript, CSS and largest image were recorded. Admin/UI code is not safely separable without an architectural change. |
| 21 | Rendering | Verified through render-path review and authenticated desktop smoke checks. This is not React and has no component rerender model. No broad memoisation or redraw rewrite is justified. |
| 22 | Service worker/PWA | Verified. One registration, controlled activation, versioned cache, old-cache cleanup, network-first navigation and Supabase bypass remain. Identity, URL, scope and `start_url` are unchanged. Installed-phone reopening remains a deferred physical-device gate. |
| 23 | Conservative cleanup | Followed. Category B duplication and category C launch blocking were fixed in PR #36; the independently verified RLS performance issue is isolated in PR #37. Cautious findings remain documented rather than changed. |
| 24 | No workaround layering | Verified. The duplicate path was removed, not hidden behind another delay or retry. Existing affected-device fallback remains unchanged. |
| 25 | Critical functionality | Deterministic roster, allocation, version, offline, PWA, startup and safety suites pass; authenticated administrator desktop paths pass. Normal-member UI, fresh logout/login, installed PWA and controlled live write remain pre-deployment gates. |
| 26 | Security tests | Verified read-only for anonymous, unauthorised, member and administrator roles. No privileged browser credential was found. Schema 40 owner/cross-owner write behaviour was verified in isolation. |
| 27 | Before/after | Request-path improvement is deterministic: a normal restored session falls from up to two authorisations and two protected snapshots to one of each. Optional profile/photo no longer gates roster usability. The branch adds 2,824 raw JavaScript bytes and 809 gzip bytes, so no bundle-size improvement is claimed. Exact authenticated 37.12 elapsed timing remains a deferred gate. |
| 28 | Preserve experience | Verified by source diff and tests. No interface, navigation, terminology, feature or roster rule changed. |
| 29 | Technical debt | Recorded below in “Safe to address later” and “Do not touch without a dedicated migration/test plan”. |
| 30 | Final pre-deployment report | Completed below. It distinguishes verified outcomes from gates that cannot be completed without violating the no-production-write/no-deploy constraint. |

## Final pre-deployment report

1. **Slow startup cause:** the proven avoidable work was duplicate restored-session authorisation/snapshot loading and optional profile/photo work blocking the launch screen. The database snapshot itself is fast and is not the bottleneck.
2. **Frontend duplication:** the auth callback and `getSession()` path both authorised a restored session after the 37.9 regression. No second Supabase client, second service worker or second active Realtime channel implementation was found.
3. **Authentication duplication:** a normal restored session could call authorisation twice. PR #36 restores one authoritative `getSession()` startup path while retaining the listener for later state changes.
4. **Duplicated Supabase requests:** up to two protected startup snapshots were scheduled before the fix. Normal startup is now one; the thirteen-read compatibility path runs only after protected transport failure.
5. **Backend debt:** direct member table writes can bypass atomic current/history RPC pairing and accept client-supplied actor text; source-table Realtime events overlap with revision events; backup/PITR is absent; leaked-password protection is disabled.
6. **RLS duplication:** production has two overlapping permissive `allowed_users` SELECT policies and five per-row Auth-helper findings. Schema 40 consolidates/fixes exactly these findings with equivalent tested outcomes.
7. **Functions/triggers:** no accidental duplicate trigger or same-signature live function was found. The v33/v35 and v36/v38 version pairs have compatibility or active dependency reasons and are retained.
8. **Edge Functions:** none exist, so no cleanup is required.
9. **Realtime:** the client uses one channel but listens to source-table events alongside the revision event. Debouncing normally coalesces reloads. Consolidation is possible but not safe without controlled two-device write testing.
10. **Indexes:** the 23 indexes fit the current constraints/query patterns. With the present table sizes and measured timings, no additional or duplicate-index removal is justified.
11. **Unused code removed:** none. No deletion met the required proof threshold.
12. **Unused dependencies removed:** none. No production npm dependency exists.
13. **Backend objects changed/removed:** production: none. Proposed schema 40 changes five policy expressions and replaces two account-read policies with one equivalent policy; it removes no table, column, row, user, function, trigger or index.
14. **Migrations created:** `supabase-migration-20260920141553_optimize_rls_policy_checks.sql`, forward-only schema 40, tested on the isolated project and not applied to production.
15. **Bundle before/after:** raw JavaScript 513,147 B to 515,971 B; gzip 117,636 B to 118,445 B. The small increase is testable session/profile control logic, not a bundle optimisation claim.
16. **Startup performance before/after:** before production median is 865 ms over three restored reloads. After-path work is one authorisation/snapshot and non-blocking optional profile; a trustworthy authenticated branch elapsed time is still required before claiming a millisecond improvement.
17. **Supabase startup requests before/after:** protected core path falls from up to two authorisation attempts/two snapshots to one/one. Optional profile remains one selected-column read and a signed URL only when an avatar exists. History/admin background reads are unchanged.
18. **Authentication:** production 37.11 login/session restoration passed; deterministic 37.12 single-session, refresh and failure tests pass. Fresh branch logout/login remains a deployment gate because the branch is not first-party hosted.
19. **Roster data:** no production roster write occurred. Aggregate row counts and read-only comparisons show the existing data remained in place during the audit.
20. **Users:** no production user, identity, role, password or session setting was changed.
21. **Permissions:** read outcomes for administrator, member, unauthorised authenticated and anonymous contexts were verified. Schema 40 also preserved member-owned profile writes and denied cross-profile updates in isolation.
22. **Installed PWA compatibility:** source-level identity, scope, URL, `start_url`, controlled update behaviour and cache alignment are preserved. Physical installed-device reopening is still required before deployment.
23. **Remaining risks:** no restorable production backup, no authenticated first-party 37.12 waterfall, no normal-member branch UI run, no physical installed-PWA run and no full application two-device controlled-write propagation test.
24. **Remaining debt:** the policy/grant/RPC write-boundary project, server-derived audit actor, Realtime publication consolidation, optional Auth hardening, backup plan, CSS/image maintenance and carefully narrowed fallback selects remain separate work.

## Technical debt

### Safe to address later

- Add development-only stage timing and request-count capture, without shipping permanent diagnostics to production.
- Narrow `select('*')` only after capturing the live column contract.
- Losslessly optimise large image assets after pixel and profile comparison.
- Consolidate CSS in small visual-regression-backed groups.
- Investigate a `realtimeConnecting` guard if a live trace confirms channel churn during rapid focus/pageshow/visibility events.
- Consolidate direct table-write policies behind the atomic RPC contract only through a dedicated compatibility migration and installed-client test plan.
- Derive audit actor identity from the authenticated claim instead of accepting arbitrary client-supplied `changed_by` text.
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
2. Light/dark mobile smoke checks and installed-PWA reopening; authenticated desktop light/dark Night, Changes and Breaks checks already pass.
3. Normal-member UI check; database-level member/admin/unauthorised/anonymous permissions are already verified.
4. Full two-browser or two-device application change propagation; the isolated non-production trigger/publication test delivered revisions 1–3 to both independent clients, while production remained read-only.
5. Establish and verify an approved production backup/restore capability; the current Free plan has no scheduled backups or PITR, and healthy WAL archiver counters are not a user-restorable recovery point.
6. Owner review and explicit approval.
