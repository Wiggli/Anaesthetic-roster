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
| 1 | Data integrity and broken functionality | Partial, recovery fixes verified | Release 54.6 reviews snapshot admission and mutation recovery; see evidence below. Continue with remaining save callers and realtime reconciliation. |
| 2 | Roster correctness | Pending audit | Check effective five/six-person periods, preserved earlier nights, seven/additional staffing, provisional states and Malta/DST arithmetic. |
| 3 | Permissions and security | Partial, session response isolation verified | Late snapshots are discarded after sign-out or access invalidation. Backend member/admin boundaries and live RLS remain pending. |
| 4 | Duplicate prevention | Partial, retry recovery verified | Ambiguous mutation retries retain operation IDs; failed/offline refreshes cannot confirm a save. Continue with assignment, overtime, cover and replacement paths. |
| 5 | Staffing visibility | Pending audit | Inspect Night, overview and management summaries with shortages and unresolved allocations. |
| 6 | Allocation speed | Pending audit | Measure assignment/removal/replacement taps and assess supported batch/undo paths. |
| 7 | Leave and availability clashes | Pending audit | Establish supported categories and data sources before implementing warnings. |
| 8 | Fairness and workload | Pending audit | Review existing counts/cycles and explain rules without changing them. |
| 9 | Swaps and changes | Pending audit | Trace original/final state, role changes, confirmation and actor/time history. |
| 10 | iPhone safe areas | Focused recovery screens checked | Chromium phone tests at 440 × 956 verify offline and conflict states; full Safari/standalone, keyboard and real-device review remains pending. |
| 11 | Mobile usability | Pending audit | Review Night, Changes, Breaks, Chat, Quick actions, roster, Account, admin, onboarding and sheets. |
| 12 | Perceived speed | Pending audit | Inspect startup, tab/date navigation, data refresh, saving and search. |
| 13 | Accessibility | Pending audit | Check contrast, scaling, labels, focus, touch targets, reduced motion and non-colour states. |
| 14 | Visual polish | Pending audit | Inspect light/dark, empty/loading/error/offline states and busy realistic fixtures. |
| 15 | Code quality | Pending audit | Refactor only issues supported by preceding review evidence. |

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
