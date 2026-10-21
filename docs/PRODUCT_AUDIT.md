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
| 10 | iPhone safe areas | Automated browser verification complete | Phone Chromium/WebKit, keyboard, landscape and PWA resilience checks pass; physical-device inspection is separate. |
| 11 | Mobile usability | Current workflows verified | Night, Changes, Breaks, Chat, Actions, roster, Account/admin and onboarding included in browser suite. Opening a roster night now records manual selection. |
| 12 | Perceived speed | Budgets and source reviewed | Default roster DOM shows one month; all-published view remains available. TypeScript, built-asset budgets and low-end-browser resilience checks are retained. |
| 13 | Accessibility | Source and contracts reviewed | Labelled semantic controls, non-colour staffing states, reduced motion, dark mode and 44px period controls; browser assertions cover layout/focus. Physical VoiceOver check remains separate. |
| 14 | Visual polish | Screenshots visually reviewed | New overview checks at 320/440 widths and light/dark pass. Roster, Changes, Breaks, Chat, Account, management and onboarding screenshots inspected. |
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

Validation completed 20 October 2026:

- Final local `npm run verify:ci` passes, including the deterministic suite, new search/shortage/workload-membership checks, TypeScript, Vite build, performance budgets and Pages artifact validation. GitHub Node 22 gates also pass.
- Full Chromium phone/desktop and iPhone WebKit run [39430726015](https://github.com/Wiggli/Anaesthetic-roster/actions/runs/39430726015): 302 passed, six failed, five intentionally skipped by platform. The six failures were corrected test journeys: a hidden activity acknowledgement needed its disclosure opened, an intentionally absent admin glass title was still asserted, and a WebKit hit-test needed to await the opening animation.
- Focused run [39432489944](https://github.com/Wiggli/Anaesthetic-roster/actions/runs/39432489944): all eight affected browser cases pass. Product code is identical between those runs; together they validate all 308 applicable browser cases. This is cumulative coverage, not a claim that the earlier full run was green.
- WebKit iPhone/low-end Chromium resilience: nine passed in both runs, five intentionally skipped by platform. Includes saved startup, stale assets, viewport/keyboard changes, safe areas and landscape gutters.
- Screenshots inspected from GitHub artifacts, including 320/440 light/dark roster planning from the initial run and final release roster, management, onboarding, Changes, Breaks, Chat and Account captures. Browser fixtures use realistic rotation/staffing data and do not edit production records.
- Local browser execution is prevented by host Unix-socket restrictions. The temporary branch trigger and diagnostic commands have been removed, restoring the existing scheduled/manual compatibility workflow before merge.

Not implemented by this change: a separate leave request/approval service, staff-initiated swap approvals, batch writing across dates, a new draft/locked/archive lifecycle, or rest-rule validation against day duties that the app does not hold. These require defined business rules/data and, for consequential workflow changes, an owner decision under the standing brief. Existing publication/confirmation, absence, role override and history workflows remain authoritative.

External verification/control: actual iPhone hardware, native VoiceOver and a nurse's signed-in production end-to-end session cannot be certified from browser fixtures. Supabase reports leaked-password protection disabled; no Auth configuration mutation capability is exposed in this session. It can be reviewed in the project Auth password-security settings without weakening existing account approval. This is an open external setting, not a claimed fix.


## Release 55.1 clock-change hero review

Found a presentation-only date error: `maltaClock()` already returns the operational night date, but `nightVisualPhase()` subtracted another day after midnight. Removed the second subtraction so the hero tracks First Part, handover and Second Part through both autumn 02:xx hours. Timing, allocations and backend data are unchanged. Added behavioural checks for the exact 24/25 October 2026 transition and mobile screenshot cases at 320/440 in light/dark. Education remains accurate for this narrow bug fix.

Also corrected the hero duty-duration label for full-night Labour Ward/Pager cover: eight actual hours on the autumn night, rather than the four-hour split-duty label. Pending/unassigned cards no longer imply a known split duty duration. Browser cases now cover First Part, Second Part and full-night cover.

Visual review exposed overlapping repeated-hour tick labels and duplicate floating captions at 320px. The clock-change rail now staggers repeated-hour labels and keeps the handover explanation in its existing prominent notice. Added geometry checks for tick collisions. Component screenshots hide only the fixed dock during capture so all hero facts can be inspected; viewport/safe-area checks remain separate.

Final verification, 21 October 2026: local `npm run verify:ci` and GitHub Node 22 release gates pass. Focused compatibility run [39509334347](https://github.com/Wiggli/Anaesthetic-roster/actions/runs/39509334347) passes all 42 clock-change cases across mobile Chromium, desktop Chromium and iPhone WebKit; resilience passes nine with five platform-specific skips. Visually inspected 320/440 hero captures in light/dark, including full-night Labour Ward/Pager wording and separated repeated-hour ticks. Browser fixtures are not physical iPhone or signed-in production verification. The temporary branch trigger and diagnostic commands are removed before merge.


## Release 55.2 typography and phone layout

Increases shared body/supporting sizes to 16/14px with existing user text scaling preserved. Gives mobile hero duty/break facts two columns and colleague/coverage its own row. Reflows narrow roster detail labels and long names, keeps form text at least 16px, allows date/workflow labels to wrap, and stacks Actions on the narrowest screens. The clock-change hero uses a concise duration summary in place of a clipped paragraph; the full guide remains available. Existing education remains accurate for this presentation-only change. Account segmented controls now wrap with larger text and retain 44px targets. The Account scroll container uses normal block flow and the opaque sheet avoids an unnecessary backdrop filter.

Validation: local `npm run verify:ci` and GitHub Node 22 release gates pass. Run [39517212518](https://github.com/Wiggli/Anaesthetic-roster/actions/runs/39517212518) passed all 57 focused cases across mobile/desktop Chromium and iPhone WebKit, plus nine resilience cases with five platform skips. This covers hero, roster, Changes, Breaks, Chat, staffing forms, Actions, Account and enlarged text at 320/440 in light/dark. Screenshot review caught a blank WebKit Account capture despite passing geometry assertions, so the final pass adds settled-animation/content captures and simplifies the scroll container. Final WebKit Account screenshots at 320px enlarged/light and 440px normal/dark now show the content correctly. Run [39518170640](https://github.com/Wiggli/Anaesthetic-roster/actions/runs/39518170640) initially passed 23 of 24 typography cases and all nine resilience cases; the remaining WebKit case timed out waiting for fixture startup before any typography interaction and a retry was superseded by the final narrow-label improvement. Final run [39519035157](https://github.com/Wiggli/Anaesthetic-roster/actions/runs/39519035157) passes all 12 narrow-phone cases, including that WebKit scenario, and all nine resilience cases with five platform skips. The Colleague label stacks above the value at the narrowest width so enlarged text does not split the label. The scheduled/manual compatibility workflow is restored exactly before merge. Browser fixtures do not certify physical iPhone or VoiceOver behaviour and do not write production data.


## Release 55.3 compact bottom navigation

The owner's installed-iPhone screenshot showed excessive dock prominence. Reduced the dock from 68px to 56px and its controls from 58px to 50px, preserving readable labels and all five equal columns. The home-indicator safe area remains protected; Safari's zero-inset gap reduces from 8px to 4px. Main-page padding and the chat transcript reserve now use the same dock-height token. Clinical rules and backend paths are unchanged. Existing tutorial navigation remains accurate for this visual refinement.

Validation: local `npm run verify:ci` passes. Phone browser layout, touch, scrolling, enlarged text, safe-area and resilience checks plus screenshot review are required before merge. The supplied screenshot is real-device evidence of the issue; subsequent browser fixtures do not replace an updated physical-iPhone check.
