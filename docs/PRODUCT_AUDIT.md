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

Validation: local `npm run verify:ci` passes. Focused run [39520553853](https://github.com/Wiggli/Anaesthetic-roster/actions/runs/39520553853) passes 33 browser cases with one platform skip, plus nine resilience cases with five platform skips. Checks cover 320/440px, normal/enlarged text, light/dark, zero/34px bottom safe areas, 50px targets, equal columns, navigation/Actions and page-end scrolling. Screenshot review found navigation-label collisions in the 320px enlarged-root-text stress case. Tab labels retain the standard 12px navigation size, independently of content reading sizes, and geometry checks now require every label to fit within its own touch target. Final run [39521148952](https://github.com/Wiggli/Anaesthetic-roster/actions/runs/39521148952) passes all 12 compact-dock cases and nine resilience cases with five platform skips. Final screenshots are reviewed before merge and the compatibility workflow is restored to its original scheduled/manual configuration. The supplied screenshot is real-device evidence of the issue; subsequent browser fixtures do not replace an updated physical-iPhone check.


## Release 56.0 edge-attached, scroll-aware navigation

The owner's second installed-iPhone screenshot showed that the smaller floating dock still felt cramped and left visible content below it. Replaces the phone capsule with a 64px navigation row, 58px targets, larger icons and a continuous background through the bottom safe area. Safe-area clearance sits inside the surface, and controls stay above the home indicator and outside landscape notch gutters. Desktop retains a centred bar.

Phone page navigation hides after deliberate downward scrolling and returns on a small upward scroll, page top/end, screen changes, viewport changes or keyboard/assistive focus. Chat, active edits, dialogs and Actions keep it available. Scroll direction uses hysteresis and clamped page coordinates so small jitter and iOS overscroll do not toggle it. One passive scroll listener coalesces updates with requestAnimationFrame; the DOM is not rerendered per scroll. Hidden navigation remains reachable through keyboard and assistive focus and does not use aria-hidden/inert. Reduced motion disables the slide transition.

The tutorial and Night guide explain the interaction and advance their education generations. Roster logic, shared data and backend paths are unchanged. The release gate also reached the existing foundation module size limit because of accumulated release notes. Moved that unchanged data into release-history.js, updated release generation/verification and preserved the module size guard. Source budget increases 1 KiB for retained release history and navigation education; built budgets remain unchanged. Local release gates and GitHub Node 22 checks pass. Run [39551942037](https://github.com/Wiggli/Anaesthetic-roster/actions/runs/39551942037) passes 33 focused browser cases with one platform skip and nine resilience cases with five platform skips. Visual review confirmed hide/return and safe-area geometry, then replaced the phone surface with an opaque semantic background to keep underlying roster text from competing with navigation. The next pass (39552762076) passed 22/24 browser cases and nine resilience cases; the two failures exposed the startup fallback using a different caption/badge order. Replaced last-child styling with explicit navLabel classes in both fallback HTML and React, and added a blocked-navigation-module interaction case. Final run [39553867247](https://github.com/Wiggli/Anaesthetic-roster/actions/runs/39553867247) passes all 27 focused Chromium/WebKit browser cases, including the blocked-module fallback, and nine resilience cases with five platform skips. Reviewed final 320/440px light/dark screenshots, enlarged text, safe-area controls, hidden/returned navigation and page-end content clearance. The phone surface is opaque and captions remain inside their own targets. The temporary browser workflow is restored exactly to its scheduled/manual main-branch configuration before merge. Physical-iPhone and VoiceOver verification remain separate.

## Release 57.0: coherent night plan and four-nurse recovery

Reproduced the reported disappearing Pager editor: applying a four-role override as a six-role base removed the absent nurse before headcount was evaluated, producing five instead of four. Four-role overrides now enter only the effective theatre arrangement; staffing remains based on the rostered team. Regression coverage includes raw, overridden and effective inputs, theatre/Pager absence, manually unselected slots, autumn/spring/ordinary elapsed-time turns, failed refresh retry and late sign-out response isolation.

Four-person cover remains provisional under the existing minimum-five rule. The arrangement screen records theatre positions and the manually agreed Pager order without offering unsupported standard finalisation. Night, Breaks, roster annotations and copy/email summaries use the validated saved order; intended theatre-based break groups are explicitly provisional. Pager loading failures are distinct from an unsaved order, invalid orders are rejected against the current working team, background updates cannot render another date into the selected night, and sign-out clears its private cache/channel/drafts. Pager drafts participate in the existing update/reload protection.

Compacts the sticky shell and Changes guidance, replaces repeated DST boxes with one hero notice, corrects pre-midnight timeline wording, adds a personal Pager shortcut beside the assignment and readable named Pager rows. Restores mobile dock hide/return using opacity without translating installed-iPhone fixed chrome, while retaining Chat/edit/dialog/focus visibility. Changes owns the attention badge rather than repeating it on Actions. Adds roster summary filters, Clear filters, workload sorting, and selected-night plan preview/copy/email distinct from sharing the public app link. Role-save reasons update button availability immediately and failures retain the draft/re-enable retry. Chat no longer clears a message arriving beyond the acknowledged read target; concurrent identical roster push dispatches share one in-flight request. The tutorial is refreshed in the same release.

Validation and limitations: Node 22 deterministic release checks, targeted browser fixtures and source review are recorded in the PR. Production metadata confirms the reported theatre arrangement exists and no Pager order was saved when inspected; no live staff records were changed. Browser fixtures simulate protected writes and do not certify delivery to physical devices, real recipient email handling, VoiceOver, or signed-in production write permissions. Existing account, recovery, chat and push regression suites remain part of the release gate. Source budget increases only for the explicit provisional workflow, plan-sharing adapter and retained release notes; built production budgets stay unchanged.

Final local review: the broad Chromium pass covered 45 scenarios; 43 passed and two exposed a 5px Full roster overflow at 320px enlarged text. Reflowing the summary filters and workload sort resolved that defect. The final focused pass passed all 21 scenarios, including both enlarged-text cases, four-nurse save/retry and Pager absence, DST repeated-hour cues, standard confirmation, Chat thread navigation, and scroll-aware dock recovery. The complete Node 22 release gate passes. Local WebKit browser installation succeeded but execution dependencies could not be installed in this container; Safari/physical-device checks remain explicitly unverified.


## Release 57.1: theatre placement discoverability

The four-person theatre editor was present but collapsed after a saved override, while Pager shortcuts scrolled past it. The editor now stays open in four-person mode, is explicitly titled Theatre positions, and is reachable through an Edit theatre positions action on Night. An unresolved theatre plan routes to its vacancy instead of the Pager editor. Browser coverage requires the saved theatre selectors to be visible and tests the Night shortcut. No assignments or roster rules change.

## 24 October 2026 · Release 58.0 · Routine-night workflow

The shared effective night plan remains the source for Night, Changes, Breaks and copied summaries. Theatre and Pager roles are visible by default below the personal hero, with direct role and break routes. Normal five-person Labour Ward cover is compact; six/seven-person Pager and Reliever rows retain their calculated periods and break groups. Role fields now include the calculated theatre periods and corresponding break groups. The everyday Actions sheet offers absence, overtime, agreed role swaps and break viewing; absence/overtime open the existing modal entry forms directly. Changes uses People, Roles and Review, suppresses duplicate allocated-role/empty-allocation sections, and retains review only for real changes. Four-person cover remains provisional, with separate explicit Pager ordering and no standard finalisation. No backend, staffing assignments, rotation rules or independently editable break schedule were introduced.

Verification: complete deterministic release gate under Node 22, TypeScript, production build and artifact checks passed. Phone-sized Chromium fixtures cover normal five/six/seven staffing, direct role/absence/overtime/break routes, and existing four-person Pager, retry and DST cases. Fixture writes do not alter production staffing. Physical iPhone, VoiceOver, live authenticated saves and push delivery remain unverified. An advisory clock-change toast was isolated from the failed-save browser fixture so its asynchronous notification cannot overwrite the save-feedback assertion.

## 1 November 2026 · Release 59.0 · Available parts

Night and Changes now share a read-only Available parts surface derived from staffingPlan.unresolved, with calculated theatre periods/breaks, unallocated overtime names, minimum-five warning and explicit all-assigned state. Conditional seventh-nurse alternatives and Reliever-first choices are described separately, so occupied or undecided roles are not advertised as definite vacancies. Saved assignments disappear from the open list on the normal render/realtime path. Changes keeps this surface above all three workflow steps. Overtime rows put a labelled Choose part action and pending state beneath the name, preserving the existing guarded allocation workflow and separate More actions.

Validation: Node 22.23.4 complete verify:ci gate, TypeScript, production build and artifact checks passed. Added deterministic coverage for absent theatre cover, saved assignments, both seventh choices, additional staff, Reliever priority and DST labels. Focused Chromium browser fixtures cover 320/440/1280px light/dark, long names, contained controls, Night-to-Roles and overtime-to-Roles navigation, and final all-assigned state. Reviewed captured mobile layouts. A transition to four-person staffing using the minimal browser RPC stub stalled rendering, so that extra browser transition is not claimed as verified; deterministic shortage checks pass. Real-device iPhone/VoiceOver, live authenticated writes and production realtime delivery remain unverified. No backend or rotation changes.

## 1 November 2026 · Release 59.1 · Seventh-nurse source role

The shared decision headline now names the proposed seventh nurse’s original part, including the theatre position where applicable, directly on Night and in Changes guidance. It reads the existing seventhVacatedKey instead of inferring the role from display names; staffing and saved allocation rules are unchanged. Complete Node 22 verify:ci passes, and the existing six light/dark browser fixtures now assert the source role in the Night decision card. No education generation change is needed for this wording correction.

## 1 November 2026 · Release 60.0 · Information hierarchy across the app

Reviewed Night, People/Roles/Review, Breaks, Actions, Chat, Full roster, Account home/Profile/Appearance/Security/Notifications/Help, sign-in and the permanent-team help text. The measured before screens showed repeated allocation prompts, two copies of the break periods, full empty staffing cards, repeated Chat availability text and profile styling before editable identity fields. No external reference claim is made: the optional Mobbin search was unavailable because its connection required a paid plan.

Available parts now owns ordinary allocation explanations on Night and Changes; the separate recommendation stays available for critical problems and when Focus hides the board. Definite openings and conditional seventh choices remain distinct, including the originating theatre position. Unassigned overtime names open on demand; source data and guarded save controls are unchanged. A placeholder Reliever is labelled Unassigned rather than presented as a nurse’s name, with no colleague menu for placeholder rows. Standard completed six-person roster cards no longer claim that their automatically calculated Labour Ward order requires a separate decision.

People uses compact counts and Add actions. Audit actor/time details are available in each record’s More sheet and Activity instead of repeated in every row. Roles puts each seventh-nurse choice beside its overtime consequence. Breaks puts times beside the group names and states that full-night Pager cover coordinates a break when cover allows. Actions is a list; Full roster uses plain role/name rows; Chat avoids repeating availability and coordination labels. Profile identity fields come before optional Preview, Photo/avatar and Accent disclosures; Me/Our Shift and Account navigation preserve typed name/title/roster-name drafts. Theme, reading, sign-in, notification and safety/error controls remain available. The education layer uses shorter reusable pages, and Full roster is again available beneath Tonight’s coverage.

Verification: complete Node 22 deterministic gate, TypeScript, release consistency and production artifact checks; 15 focused Chromium fixtures cover availability, source-role wording, mobile/desktop light/dark pages, disclosure navigation, audit metadata and profile drafts. Additional typography, fallback, reduced-motion, Chat and Account checks are recorded with the final review. Before/after fixture screenshots were inspected at phone widths. Signed-in production writes, physical iPhone, native VoiceOver and live notification delivery are not certified by these isolated fixtures; the existing four-person browser-stub limitation remains in the prior audit entry. No database migration or staff-data edits are included.

Final review: 15 neighbouring browser scenarios passed for enlarged-text phone reflow, Account draft navigation, optional-workflow fallback, reduced motion, colleague shortcuts, Chat transcript controls and Night Intelligence. The broader 25-case pass initially exposed a missed seventh-choice tap after Focus/navigation; the delayed smooth scroll could move the destination during a fast tap. Destination scrolling now settles on the next frame without animation. The choice/profile/audit scenario and the explicit four-person provisional-guidance scenario then passed five consecutive repetitions each. Critical recommendations remain visible, ordinary repeated recommendations are suppressed only while the availability board is accessible, and Focus restores the direct recommendation. The final Node 22 gate and source/tree consistency are part of publication verification.

Publication gate: Node 22.23.4 verify:ci passes on the final source. The last interaction smoke passes for Focus-to-allocation routing, the native details controls, per-record actor/time metadata, Me/Our Shift and Account-back draft retention, reset when the signed-in email changes, and the four-person provisional guidance. Profile state is keyed by the sign-in email so preserving one account’s drafts cannot carry them into another account’s form.

## Release 60.1 iPhone layout and staffing saves

- Removed a missing legacy form-control lookup that ran after a successful absence write. The current edit sheet loads the existing nurse and reason. Both staffing sheets close on an acknowledged or verified save, keep the draft if the result is uncertain and show refresh status separately from save status.
- Transport failures on staffing writes can replay once with the original operation ID and expected revision. The server remains authoritative for revisions, duplicate handling and audit history. Regression coverage checks exact operation replay, draft retention and the acknowledged-write path when refresh fails.
- The shared theme uses neutral materials and a 56px tab bar. Changes shows a grouped People list and one sharing status in Review. The compact title starts only after the original heading clears the safe area.
- The local Chromium launch was blocked by the environment denying the browser socket. Physical iPhone and signed-in production writes remain open for verification.

## Release 61.0 roster navigation

- Night keeps the live timeline, personal duty band, elapsed timings and both clock-change treatments visible. The summary around it is shorter, with break and colleague shortcuts ahead of an always-visible team list.
- Changes removes the three-stage navigation. Absence and overtime stay at the top with cover, review and activity on the same page. Sharing becomes available once prerequisites are met. The four-person arrangement stays provisional, with theatre and Pager setup in the same cover area.
- Staffing forms display the selected date and retain the 60.1 guarded write and retry paths. Actions uses the same wording as Changes, and Breaks uses compact headings without duplicate ordinals.

## Release 64.0 three-way Pager cover

- From the 21 November 2026 roster night, the existing four theatre roles and three shared Labour Ward / Pager slots form the seven-person plan. Historical night calculations and stored allocation keys stay compatible. The team agrees Pager turns and breaks, while the established theatre break groups continue to follow the existing duty timings.
- Verified the effective five-person establishment with two overtime nurses, pending cover, a theatre absence, additional staffing, an agreed seven-person role override, return to six and the historical seven-person calculations. The Node 22 verification gate and four light/dark phone and desktop Chromium fixtures pass. Browser fixtures use isolated data and do not authenticate to the production backend.
- The compatibility migration requires release 64.0 for shared roster edits. Older clients can still view the roster and receive the update prompt.

## Release 65.0 Pager turn times

- The three saved Pager slots map to consecutive turns from 23:30 to 07:00 in Night, Changes, Breaks, Full roster and the copied plan. Clock-change turns use equal elapsed time, with repeated local times labelled.
- Allocation and break-group rules continue to use their existing inputs and write paths. The timing checks cover a normal night and both Malta clock changes. Browser fixtures use isolated staffing data.

## Release 65.1 Pager timeline and exact coverage times

- Pager staff see a separate timeline matching their one, two or three coverage turns. Theatre retains its live timeline. The archive and plan summary show the same Pager duty periods as Night and Breaks.
- A complete two-person Pager plan resolves its automatic order before the first render. A compatible saved order is respected, and a stale draft cannot reintroduce a nurse who is no longer assigned.

## Release 66.0 Pager tombola

- A complete seven-nurse plan can draw the three assigned Pager nurses from Night. The draw changes the three Pager slot values only, uses an unbiased shuffle and saves via the existing night-only override path with its revision check and audit trail.
- The sheet reveals the persisted order and reopens the saved result. Theatre, staffing and Pager duration rules use their existing paths. The browser fixtures exercise normal and reduced motion against a simulated shared save.

## Release 66.1 staffing clarity and cover saves

- Night and Changes show the base roster count, recorded absences, replacement cover and overtime that contribute to the working count. A six-person plan explains the seven-nurse threshold for the Pager tombola.
- Cover can be saved and shared beside the choices. The readiness check and save both require distinct, current overtime IDs for the open roles. Selecting a different night remounts the cover selections for its own roster date.

## Release 67.0 simpler Pager workflow

- The seven-nurse Night view leads with the draw or its setup shortcut. Changes shows one assignment form and a direct return to Night after saving grouped cover.
- If the working count is seven and the overtime count matches the open roles, the user chooses any theatre cover. Existing valid Pager allocations are retained where possible, and the remaining overtime nurses fill the open Pager places before the draw. Other staffing layouts still use explicit selection.

## Release 67.1 Pager draw save

- Production database logs identified a text concatenation error in the guarded night-role write delegation. A forward migration corrects it while preserving the operation key, revision checks and permissions.
- The PostgreSQL fixture reproduces the failed seven-nurse write before migration and verifies the saved draw afterward. The browser checks the circular close control and the normal draw reveal.

## 19 November 2026 · Release 68.0 · Compact operational screens

- Reduced header and shift-identity spacing, grouped staffing and break surfaces, and removed duplicate ordinary available-parts explanations when the cover form already lists those roles. Conditional seventh choices, Reliever priority, shortage warnings and additional staffing retain their explanations.
- Team roles put the role above individual nurse names, with the canonical three-way Pager period beside each nurse. Pending cover opens the allocation destination. Full roster dates expand for names and times, with a separate Open night action. Four-person provisional Pager detail stays inside the expanded date.
- Pager draw controls distinguish awaiting draw, drawing/saving, saved result and retry. The existing server-confirmed reveal, guarded mutation, revision checks and draw algorithm continue to own persistence. Profile uses plain wording and existing draft retention.
- Compared the complete personal hero, Pager timeline, live rail and four-person shared-Pager hero functions against main and confirmed identical source. Domain and runtime foundation sources are identical. The clinical adapter adds display-only nurse/period pairs using the existing timing function.
- The deterministic release gate passes. Browser review covers phone and desktop widths, light/dark appearance, long names, staffing counts, roster disclosures, Pager draws and clock-change heroes with isolated data. Physical iPhone, VoiceOver and signed-in production writes remain outside this fixture review. The local screenshot renderer omits text even on a standalone font test, so text content, visibility, geometry and overlap are checked through the browser DOM.

## 19 November 2026 · Release 68.1 · Type and alignment follow-up

- Replaced small fixed Pager result text with the existing scalable body/caption tokens. Each result places the full nurse name under its time, with normal wrapping, a separate turn number and a 44px close control. The action area remains available while scrolling and the token flight lands at the newly aligned name area.
- Removed the inherited 44% maximum width from roster status labels. Standardised supporting type and control spacing in Changes, roster summaries, Chat, Quick actions, Account and administration. Narrow staffing headers place their actions on the next row instead of competing for width.
- The full deterministic gate passes. Focused browser coverage includes eight normal/enlarged-text typography cases, six phone/desktop light/dark layout cases, four Pager typography cases with long names, and normal/reduced-motion saved draws. Updated stale typography assertions to the existing two-fact hero and expandable roster structure.
- The clinical presentation, shared-Pager hero, domain and runtime foundation source match 68.0 exactly. Pager writes, ordering and save validation are retained. The source-only compatibility budget grows by 1 KiB to retain the new release notes; built performance budgets are retained.
- The visible browser confirmed the deployed sign-in screen renders text, but cannot reach the local fixture server. Headless screenshots still omit glyphs, so operational checks use DOM font metrics, text content, dimensions, wrapping and element geometry. WebKit dependencies are unavailable without system installation privileges. Physical iPhone and VoiceOver review remain unverified.

## 20 November 2026 · Typography and alignment recheck

- Confirmed the public app serves 68.1 and the reviewed runtime source matches main.
- Eighteen additional Chromium checks pass across Night, Changes, Breaks, Chat, Full roster, Actions, all Account sections and administrator navigation. Coverage includes 320/440px normal and enlarged text, 1280px layouts, light/dark themes, long transcripts and simulated keyboard viewport changes.
- No new overflow, font-size, control-reachability or navigation failure was reproduced by this pass. Runtime files and the existing hero/timing implementation retain release 68.1. Physical iPhone, VoiceOver and glyph-level screenshot review retain the preceding verification limits.

## 20 November 2026 · Release 69.0 · Quiet startup and remembered tutorials

- Removed the startup-audio mount, player, custom-audio helper, bundled MP3, Appearance controls and their styling. Build checks verify the startup track is absent from the deployed assets and offline cache. The Pager draw audio remains owned by its existing separate component.
- Intro prompts use durable completion/dismissal status across content generations. Skip and Escape persist, pending open callbacks recheck dismissal/authentication, and devices with an existing saved night are recognised on upgrade even when an earlier Skip was session-only. Ordinary tab navigation and release destination links no longer trigger feature-tour popups.
- Removed obsolete sound instructions from the Account lesson, aligned the Actions preview wording and retained manual guides under Account. Clock-change help still opens on request and remembers its date-specific acknowledgement.
- The full deterministic gate passes. Behavioural storage tests cover queued prompts, Skip, Escape, legacy completion and content-generation upgrades. Twenty-two focused browser cases cover reload persistence, complete/skip/Escape, old saved-night devices, guide access, silent startup with old enabled settings, date-specific help, clock-change heroes and saved Pager draws.
- Hero, clinical presentation, shared-Pager, domain, runtime timing and Pager draw source match 68.1 exactly. The existing physical iPhone and VoiceOver verification limits continue to apply.

### Clock-change notice and Pager timing (69.1)

Compared the 69.0 timing, allocation and hero sources with the pre-update release and confirmed that the startup changes did not alter the clocks or duty calculations. The advance notice uses the next published roster row, replaces the earlier one-off toast and opens the affected date’s contextual guide without changing the selected night. The advance notice is in-app. The existing same-night notification still uses the device’s granted permission.

Deterministic coverage checks spring and autumn notices on the preceding rostered night, no early notice two shifts ahead, and no notice on an unrostered date or after the published roster ends. The three-way Pager continues to divide 23:30 to 07:00 in elapsed time: 130 minutes per nurse in spring, 150 normally and 170 in autumn.

### Release 70.0 · Agreed two-nurse Pager parts

Six-nurse cover from 21 November offers a shared Pager place. Changes requires an agreed First Part before sharing the six-nurse plan and saves both parts with the selected cover. Night, Breaks and the roster show the saved agreement. Existing timing calculations determine duty periods and break groups.

The isolated PostgreSQL fixture tested a paired cover and order save, rejection before agreement, inactive names, conflicting plan revisions, replacing a departed Pager nurse and returning to five nurses. Browser fixtures exercise the six-nurse example with one absence and two overtime nurses and the transition to the three-way draw. Physical iPhone, VoiceOver and signed-in production writes were outside fixture coverage.

### Release 70.1 · Superseded Pager draw validation

The six-nurse cover save failed because the database validated a stored seven-person draw containing a departed overtime nurse. The client already ignored that arrangement. The validator now ignores the same superseded seven-person record from the policy cutover, while continuing to validate the submitted cover and agreed Pager names. The old draw remains in history. The role editor only describes an arrangement as active when it applies to the current staff.

Reproduced the production error in isolated PostgreSQL, applied the forward repair, and verified the screenshot's current cover and order. Checks retain rejection of inactive names, duplicate cover, repeated Pager names, missing agreement, and an invalid ordinary override. The validator stays private. The deterministic release gate passes. Production staffing records were read for diagnosis and remain unchanged by the repair.

The stale-draw browser case also exposed an outdated saved-result badge after returning to seven nurses. Saved draw status now requires all current assignments to match the persisted draw.

Release 70.1 deployment encountered artifact metadata propagation delay, followed by duplicate github-pages uploads during the retry. Pages uploads now use the run-attempt number in their name, and deployment uses the same name after a short metadata propagation wait. The tested pages-dist artifact remains the deployment input.

### Release 71.0 · Worker-rendered navigation feedback

Applied the OffscreenCanvas placeholder approach described at https://rida.dev/blog/bypassing-ios-safari-60-fps-limit to the bottom navigation selection highlight. The highlight moves beneath ordinary semantic buttons. A worker draws a 240ms transition at a requested cadence of 120Hz, independently of main-thread requestAnimationFrame. The brief iOS scroll/CSS compositor boost stops on settlement or after 400ms. No animation timer runs while the highlight is idle. Visibility, sign-out and Reduced Motion pause or release the rendering work. Worker creation, transfer or loading failure retains CSS feedback and working navigation.

The source technique reports high-refresh behaviour on iOS. This implementation has not been measured on a physical ProMotion iPhone and does not establish 120 displayed frames per second or battery impact. It applies to the decorative tab highlight. Existing DOM animations retain their browser-controlled cadence. Unit coverage exercises worker settlement and pause cancellation. Browser coverage checks selection, Actions, small and wide layouts, both themes, failure fallbacks and personal/system Reduced Motion. The generated worker is included in the offline shell.

The full deterministic gate and 24 focused Chromium cases pass. Light/dark dock screenshots were inspected alongside DOM labels and geometry, because the headless image renderer omits text glyphs. Routing, keyboard access and badges remain covered through the normal navigation controls. The clinical presentation, domain and timing sources match 70.1.

## Release 72.0, 22 November 2026

- Replaced the account menu with an editable identity card and grouped app/team/help destinations, with independent Profile, Appearance and Our shift pages. Text/motion/accent preferences use the existing profile save path, preserve drafts between pages, and retain shared-team save permissions. Phone surfaces use safe-area padding, 44px controls and viewport-aware sheet height, with desktop width capped at 520px.
- Restored Google provider pictures as a fallback to private uploads. URL validation permits only HTTPS googleusercontent.com hosts, the image CSP now permits those hosts, and image requests use no-referrer. Explicit initials/symbol preferences remain respected. Broken images reveal initials; late uploaded-photo signing responses cannot cross account boundaries. No photos are copied into storage automatically.
- Added deterministic cases for provider metadata, upload precedence, invalid URLs and asynchronous account changes; browser cases cover light/dark at 320/440/1280px, menu navigation, profile/Appearance saves and drafts, Google images and failed-image fallback. Updated account education and release notes. Fixed a reused React save-button element inheriting the legacy profile button's dirty class by keying the independent forms.
- Full npm run verify:ci passes, including TypeScript, deterministic regressions, Vite and Pages artifact checks. Focused Chromium interaction results are recorded in the release PR. Tests use isolated fixtures and mocked writes; no production profile or roster records were changed.
- Screenshot geometry and DOM overflow/visibility are checked; this environment's image renderer omits text glyphs, limiting visual typography judgement. Physical iPhone Safari/installed-PWA behaviour and VoiceOver remain unverified. No claim of live provider-photo coverage for every account or backend permission re-audit is made. Schema remains 58.

## Release 73.0, 23 November 2026

- Simplified available-part rows, supporting team/roster surfaces, Chat type and avatars, Settings icon materials and Actions icon boxes. Existing clinical colours, warnings, availability counts, controls and private preferences remain intact. Updated the account guide's motion explanation without changing automatic tour policy.
- Replaced shared JS press springs and segmented layout animation with native semantic buttons and one CSS transform selection layer. Removed stagger/layout animation from roster/inbox lists and the duplicate profile entrance animation; Actions dismissal retains a short native translation without zoom. Kept the bounded 120-cadence worker dock decoration and native scrolling. There is no persistent force-refresh loop added and no new production dependency.
- The expanded secondary-page check reproduced an infinite dock MutationObserver loop on Full roster: paint removed and then re-added dockFeedbackPaused when no primary destination was active. Pause state is now computed before one guarded class update. Secondary pages pause the worker, while returning to a primary page restores feedback. The browser checks explicitly visit Full roster and assert paused state.
- Verification: npm run verify:fast and npm run verify:ci pass, covering deterministic contracts, TypeScript, build and PWA artifact consistency. Focused final Chromium coverage includes theme/width matrices, native selection geometry and rapid selection, profile/Appearance saves, worker fallback, Reduced Motion and secondary-page navigation. Exact final counts are in the release PR. All browser fixtures and writes are isolated; production records were not modified.
- Screenshots inspect geometry and materials at 320/440/1280px; the local renderer omits text glyphs, limiting visual font review. WebKit downloaded but cannot start with this host's missing libraries, and ordinary package-based dependency installation is unavailable, so no new Safari-pass claim is made. Physical iPhone/VoiceOver, native display presentation rate, low-power throttling and battery cost remain unverified. The code makes accelerated transitions eligible for high-rate presentation but does not claim a measured 120fps throughout the app.

## Release 74.0, 25 November 2026

- Reproduced the screenshot state in isolated fixtures: five permanent nurses plus two overtime produces seven working, with no open theatre role. The existing grouped selection already places the overtime nurses on Pager with the rostered Pager nurse, but Changes hid those fields, called the nurses Unassigned, and directed users to Go to save / Set up Pager draw without displaying the team.
- Added a read-only review derived from the exact selectedCoverAssignments save payload. It shows First Part theatre, Second Part theatre, three Pager names and the three canonical elapsed-time turns. Pending proposals are explicitly unsaved, per-overtime Review assignment controls reveal the review, and required theatre selectors update the proposed team. Saved effective roles take precedence over older overtime slot keys, so manual swaps and draws do not produce stale or duplicate names in the review.
- A successful grouped allocation save opens the existing Pager review with a bounded date/account/view-scoped handoff. This does not run the draw. The existing explicit Draw button retains its guarded mutation, animation and result verification. The review and draw sheet explain that only Pager time order is randomised and expose the existing Change theatre / Pager team route before drawing. Six-person agreed parts, historical seventh policy, minimum staffing safeguards, permanent rotation, hero and DST calculations, RLS and RPC contracts are unchanged; no migration or live staff write was performed.
- Fixed the existing role-reason handler updating only the DOM disabled attribute: React still suppressed the Save click using its stale disabled prop. The adapter now rerenders the existing model so validated reason edits enable both the DOM and React handler consistently. Primary next-step links have a minimum 44px width as well as height.
- npm run verify:fast and npm run verify:ci pass. Deterministic additions cover default grouped proposals, explicit theatre selection, saved draw precedence, no review mutations and cancelled late handoffs after date/account changes. Browser coverage includes light/dark at 320/440/1280px, assignment save followed by an unopened draw result, explicit draw persistence, missing/duplicate theatre choices, failed save retention, manual swaps before drawing and the six-person neighbour. Final counts are in the release PR.
- Screenshots were inspected for supporting geometry and overflow, but local screenshot rendering omits text glyphs and limits typography judgement. All backend writes in browser tests are mocked; physical iPhone/VoiceOver and signed-in production mutation verification remain separate. The legacy source-size budget increased by 7 KiB for the review adapter, guarded UI handoff, education and retained release entry; built-asset budgets remain in force.
