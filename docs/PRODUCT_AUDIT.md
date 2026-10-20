# Production product audit

Standing brief: `AGENTS.md`, accepted 20 October 2026. This ledger records evidence and unfinished work, not a declaration that every capability listed in the brief exists.

## Baseline

- Initial checkout: main `258630d`, release 54.5, schema 56.
- Read repository guidance, project context, machine-readable state, current-state notes, development workflow and feature-release rules.
- No production data, clinical rules, backend policies or application UI changed while recording the brief.
- Baseline verification on 20 October 2026: `npm run verify:ci` passed under Node 22.23.3, including the deterministic suite, TypeScript, Vite build and Pages artifact checks. Staffing coverage includes a generated sweep of 1,600 combinations. This is test coverage, not a completed source, live-backend or visual audit.

## Review ledger

| Priority | Area | Status | Evidence / next review |
| --- | --- | --- | --- |
| 1 | Data integrity and broken functionality | Reviewed, fixes tested | Snapshot/retry/session recovery from 54.6; guarded-write migration and roster module recovery in 55.0. Live member writes must use v49 RPCs. |
| 2 | Roster correctness | Reviewed with deterministic coverage | Reference fingerprint, earlier periods, five/six establishments, seven/additional staffing, provisional plans, Malta/DST timing and 1,600 staffing combinations pass. |
| 3 | Permissions and security | Live metadata reviewed, write bypass fixed | All 34 public tables have RLS. Legacy mutation RPC execution is revoked. v49 membership/version guards and admin publication checks verified in live function definitions. Schema 57 revokes direct clinical table DML. Leaked-password setting remains an external control. |
| 4 | Duplicate prevention | Reviewed, live duplicate checks clear | No duplicate absence or overtime groups in live data. Operation-ID, stale revision, duplicate submission and concurrent-edit deterministic coverage passes. |
| 5 | Staffing visibility | Improved and covered | Month overview, short-staffed/allocation/absence filters and non-colour status labels use the effective plan. |
| 6 | Allocation speed | Current workflows reviewed | Existing modal absence/overtime entry, named role decisions and guarded confirmation preserved. Independent bulk roster mutation is not implemented. |
| 7 | Leave and availability clashes | Current model reviewed | Absence reasons flow into staffing and exclude absent nurses from effective workload; tests cover absent/unavailable assignments. No separate leave request/approval calendar exists. |
| 8 | Fairness and workload | Improved and covered | Effective night and Saturday/Sunday counts for the displayed period; absence excluded, overtime included, established Pager/seventh order unchanged. No automatic rebalancing or invented rest thresholds. |
| 9 | Swaps and changes | Current model reviewed | Night-only role overrides, explicit confirmation, revision protection, history invalidation/pagination and actor/time contracts inspected and tested. No separate staff swap approval system exists. |
| 10 | iPhone safe areas | Automated browser verification in progress | Phone Chromium/WebKit, keyboard, landscape and PWA resilience suite running in GitHub; physical-device inspection is separate. |
| 11 | Mobile usability | Workflow verification in progress | Night, Changes, Breaks, Chat, Actions, roster, Account/admin and onboarding included in browser suite. Opening a roster night now records manual selection. |
| 12 | Perceived speed | Budgets and source reviewed | Default roster DOM shows one month; all-published view remains available. TypeScript, built-asset budgets and low-end-browser resilience checks are retained. |
| 13 | Accessibility | Source and contracts reviewed | Labelled semantic controls, non-colour staffing states, reduced motion, dark mode and 44px period controls; browser assertions cover layout/focus. Physical VoiceOver check remains separate. |
| 14 | Visual polish | Screenshot review in progress | New overview checks at 320/440 widths and light/dark, plus existing screen capture suite; await GitHub artifacts for visual inspection. |
| 15 | Code quality | Reviewed, scoped changes | Typed roster presentation, existing domain calculation and mutation paths retained, generated runtime aligned, no new production dependencies or broad rewrite. |

## Evidence discipline

For each reviewed area, record date, commit, checked paths/scenarios, findings, changes and actual test results. Distinguish static review, deterministic tests, browser interaction, authenticated backend checks and real-device checks. Record unsupported workflows explicitly. Keep production staff data and credentials out of this ledger and test fixtures.

Resume with the earliest unresolved priority and continue to related defects; update this ledger after each meaningful batch. A bounded completed change does not complete the whole product audit.

## Release 54.6, 20 October 2026

- Reproduced a malformed mutation-date expression, which prevented field-level conflict comparisons from resolving the affected night.
- Moved incoming revision and required staffing/allocation collection checks ahead of all snapshot state replacement; rejected snapshots no longer replace loaded data or compatibility settings.
- Failed refreshes retain the latest in-memory roster as read-only rather than restoring an older disk snapshot over it.
- Bound in-flight snapshot acceptance to the same user and authorisation attempt, with checks after asynchronous work, so sign-out/access invalidation cannot restore cleared private state.
- Timed-out mutations require a successful live online refresh before result verification; ambiguous failures retain retry IDs. Conflict recovery now distinguishes a loaded newer plan from an unavailable refresh in both form feedback and the conflict dialog.
- Night freshness receives an explicit sync-state event rather than waiting for unrelated DOM changes or a periodic timer.
- Verification: `npm run verify:ci` passed under Node 22.23.3 after runtime generation, including behavioural snapshot/retry/conflict tests, TypeScript, build and artifact checks. The source budget increases by 3 KiB for recovery validation and retained release history; built asset budgets remain unchanged.
- Browser evidence: four focused mobile Chromium checks passed, covering light/dark offline preservation, the connection-check conflict dialog and navigation through Night, Changes, Breaks and Chat as an administrator. Screenshots were visually inspected at Pro Max-class dimensions. An earlier focused run also passed both Chromium project configurations.
- Limits: browser fixtures simulate the shared backend without modifying production data. WebKit could not initially start because system libraries were unavailable; this is not real-iPhone, installed-PWA or live-RLS verification. Full product audit remains in progress. These are narrow recovery fixes, so the education layer does not require a new feature lesson.


## Release 55.0 scope and boundaries

The production audit reviewed the app's current model rather than treating a generic calendar feature list as existing functionality. Added month navigation/current month/all published months, staffing filters, professional-name search, effective workload totals, explicit manual selection from cards and roster-module recovery. The tutorial/onboarding generations are updated.

The live permissions review found browser-role INSERT/UPDATE/DELETE grants on clinical tables that could bypass the version/freshness/audit boundary. Schema 57 revokes those grants from PUBLIC, anon and authenticated while preserving SELECT policies and guarded SECURITY DEFINER RPCs. No production roster rows were edited during the audit. Security advisor notices about authenticated SECURITY DEFINER RPCs were reviewed against their intended membership/administrator guards; app_compatibility deliberately has no direct-access policy. Performance advisor notices identify unused indexes, which remain intact because removing them without workload evidence would be speculative.

Validation before browser review: the complete deterministic suite, new search/shortage/workload-membership tests, TypeScript, Vite build and artifact checks pass locally; the GitHub Node 22 gate passed on the initial review commit. Local browser execution is prevented by the host's Unix-socket restrictions, so the existing GitHub compatibility workflow is temporarily triggered on this review branch. Remove that temporary trigger before merge.

Not implemented by this change: a separate leave request/approval service, staff-initiated swap approvals, batch writing across dates, a new draft/locked/archive lifecycle, or rest-rule validation against day duties that the app does not hold. These require defined business rules/data and, for consequential workflow changes, an owner decision under the standing brief. Existing publication/confirmation, absence, role override and history workflows remain authoritative.

External verification/control: actual iPhone hardware, native VoiceOver and a nurse's signed-in production end-to-end session cannot be certified from browser fixtures. Supabase reports leaked-password protection disabled; no Auth configuration mutation capability is exposed in this session. It can be reviewed in the project Auth password-security settings without weakening existing account approval. This is an open external setting, not a claimed fix.
