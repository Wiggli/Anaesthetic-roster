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
| Production recovery point | Not independently verified because Supabase management access is not available in this audit environment |

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

The available shell measurements are deterministic local sizes. Network timings observed from this workspace include a 6–7 second workspace proxy floor and are not representative of a colleague's phone, so they are not reported as user startup latency.

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

The branch is slightly larger because it restores bounded expired-session recovery, adds regression coverage and records the release. This is not represented as a bundle-size improvement. The measurable improvement is less startup work: one authorisation and one protected snapshot instead of the duplicated restored-session path, with optional private profile/photo requests no longer delaying interactivity.

An authenticated browser performance trace is still required for millisecond values, memory, console, request waterfall and rendering behaviour.

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
- Direct administrator writes for account activation, publishing and prospective team versions remain unchanged pending live RLS verification.

## Frontend query audit

| Area | Current behaviour | Audit result |
| --- | --- | --- |
| Initial shared roster | One protected snapshot; compatibility only after transport failure | Keep |
| Initial auth | One `getSession`; refresh only near expiry or after an auth rejection | Fixed and covered |
| Private profile | One selected-column query, plus one signed URL only when an avatar exists | Keep; no longer blocks launch |
| Current-night history | Three independent history queries in parallel and guarded per date | Keep; non-blocking |
| Admin account list | One background query for administrators only | Keep; consider selected columns later |
| Realtime recovery | One channel plus one cheap revision query every 15 seconds while visible | Keep pending two-device trace |
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

Anonymous REST probes returned HTTP 401 for protected roster tables. No production row was read. No service-role or database credential is present in the browser source.

### Live backend items not yet verified

Authenticated Supabase management access is required to inventory and test:

- every live table column, key, relationship and index;
- every deployed RLS policy, including policies created before schema 33;
- exact trigger catalogue and any differently named historical triggers;
- actual function definitions and grants outside the repository migration window;
- realtime publication membership beyond `app_sync_state`;
- storage bucket policies;
- Auth provider settings;
- Edge Functions, scheduled jobs, extensions, query statistics and query plans;
- backup/PITR status and a recovery point.

Because these facts are unavailable, the audit does not claim that production has no duplicate RLS policies, indexes, triggers or Edge Functions. No backend object has been changed or proposed for deletion.

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
- No production roster data or account data was read through privileged access.
- RLS was not disabled or relaxed.
- Existing atomic write contracts and security-definer membership checks remain.
- The verified 138-night rotation, fingerprint, Pager/Reliever rules, five/seven-nurse rules and all allocation safety tests pass.

## Tests completed

- `npm test`: pass.
- Rotation, staffing, Malta operational-night and PWA safety: pass.
- Expanded allocation, consistency, offline, accessibility and privacy safety: pass.
- Startup transport, saved-roster recovery, single restored-session authorisation, expired-token single refresh, optional-profile ordering and seven-nurse render: pass.
- Version, release-history, manifest and service-worker cache consistency: pass after the 37.12 version update.

Authenticated fresh login, logout/login, installed-PWA reopening, normal/admin permission checks, two-device realtime, live database plans and responsive browser screenshots remain blocked until browser and Supabase management access are available.

## Technical debt

### Safe to address later

- Add development-only stage timing and request-count capture, without shipping permanent diagnostics to production.
- Narrow `select('*')` only after capturing the live column contract.
- Losslessly optimise large image assets after pixel and profile comparison.
- Consolidate CSS in small visual-regression-backed groups.
- Investigate a `realtimeConnecting` guard if a live trace confirms channel churn during rapid focus/pageshow/visibility events.

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

1. Authenticated browser timings and request waterfall for a restored session and fresh login.
2. Light/dark mobile smoke checks, despite no intended visual change.
3. Normal-user and administrator permission checks.
4. Two-device realtime verification.
5. Authenticated Supabase catalogue, policy, trigger, function, index, Edge Function and backup inspection.
6. Owner review and explicit approval.
