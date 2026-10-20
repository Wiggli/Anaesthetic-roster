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
| 1 | Data integrity and broken functionality | Pending audit | Trace guarded saves, retry/idempotency, realtime reconciliation, stale state and concurrent edits; run deterministic baseline first. |
| 2 | Roster correctness | Pending audit | Check effective five/six-person periods, preserved earlier nights, seven/additional staffing, provisional states and Malta/DST arithmetic. |
| 3 | Permissions and security | Pending audit | Review authenticated member/admin boundaries, migrations and RLS; separate static evidence from live backend verification. |
| 4 | Duplicate prevention | Pending audit | Trace assignment, overtime, cover, replacement, retry and simultaneous-write paths. |
| 5 | Staffing visibility | Pending audit | Inspect Night, overview and management summaries with shortages and unresolved allocations. |
| 6 | Allocation speed | Pending audit | Measure assignment/removal/replacement taps and assess supported batch/undo paths. |
| 7 | Leave and availability clashes | Pending audit | Establish supported categories and data sources before implementing warnings. |
| 8 | Fairness and workload | Pending audit | Review existing counts/cycles and explain rules without changing them. |
| 9 | Swaps and changes | Pending audit | Trace original/final state, role changes, confirmation and actor/time history. |
| 10 | iPhone safe areas | Pending audit | Inspect Pro Max-class and smaller viewports, Safari/standalone, keyboard and relevant landscape. |
| 11 | Mobile usability | Pending audit | Review Night, Changes, Breaks, Chat, Quick actions, roster, Account, admin, onboarding and sheets. |
| 12 | Perceived speed | Pending audit | Inspect startup, tab/date navigation, data refresh, saving and search. |
| 13 | Accessibility | Pending audit | Check contrast, scaling, labels, focus, touch targets, reduced motion and non-colour states. |
| 14 | Visual polish | Pending audit | Inspect light/dark, empty/loading/error/offline states and busy realistic fixtures. |
| 15 | Code quality | Pending audit | Refactor only issues supported by preceding review evidence. |

## Evidence discipline

For each reviewed area, record date, commit, checked paths/scenarios, findings, changes and actual test results. Distinguish static review, deterministic tests, browser interaction, authenticated backend checks and real-device checks. Record unsupported workflows explicitly. Keep production staff data and credentials out of this ledger and test fixtures.

Resume with the earliest unresolved priority and continue to related defects; update this ledger after each meaningful batch. A bounded completed change does not complete the whole product audit.
