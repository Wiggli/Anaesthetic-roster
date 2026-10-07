# Night Roster 51.0: coherence refactor

Production baseline: 50.9, commit `9887cb478bab0dcaa16e9655929548ce6eaeaf85`.
Release: 51.0. Database contract: 53, unchanged.

## Audit and resulting structure

The supplied 50.9 app recording was the visual baseline. The audit covered its operational and settings journeys against the pinned production HTML, generated and modular runtime, React regions, imported and separately loaded CSS, navigation gestures, PWA release flow and safe-area rules.

The principal cause of inconsistency was competing presentation generations. Ordinary display rules could expose inactive UI; Changes mounted React beside a separate fallback rail; Account left its parent menu in the scroll container when selecting a child. Identity, count and date were also wrapped separately, and Night retained its earlier brand, motto, summary-chip and two-row header structure underneath newer presentation.

| Area | Structural change and ownership |
| --- | --- |
| Night header | `index.html` places the existing account/install/admin controls in the institution row. Removes the redundant brand title, motto, chips, compact duplicate context and decorative backdrop. Keeps the personalised greeting. |
| Selected night | New `src/selected-night.ts` composes Night, Changes and Breaks from the original identity, nurse-count and native date nodes. The existing date handlers are retained. Count and identity share one row; date is one rail. |
| Date controls | `src/coherent-shell.ts` owns the visible label and native-picker affordance. Removes late legacy picker wrappers instead of leaving two controls. The date is abbreviated with the year, while its ISO value and change handlers remain intact. |
| Changes | `#changesWorkflowExperience` contains the usable HTML fallback. `src/changes-workflow.tsx` replaces the contents of that same host. There is one rail in both normal and module-failure operation. Compatibility rendering checks whether its fallback nodes still exist. |
| Breaks | Personal summary, clock-change notice, exceptions, plan heading and both break schedules move outside the compact context. This preserves every operational node while removing the enclosing context-card nesting. The personal card comes first. |
| Chat | Removes the repeated identity block and Tonight kicker. Date/count is one compact row, safety is a compact banner, and the team conversation and direct-message list form the main workspace. Notifications use an Account shortcut. |
| Night allocation | `PersonalNightCard` keeps one dark hero surface, with facts and timeline separated by spacing and restrained dividers. Start and end labels have explicit `timelineStart` and `timelineEnd` anchors, separate from phase labels and markers. |
| Account | `src/legacy-ui/account.js` mounts one destination into `#accountPageOutlet`. Home is detached on Personalise, Preferences, Notifications, Security and App & Help. Back returns to Account; Done closes home. Inactive nodes retain drafts and listeners. |
| Account adapters | `src/account-experience.tsx`, `byId` and `pushEl` can resolve retained controls. Notification binding, mute-state rendering and busy state use the retained original card. No notification subscription or delivery contract changes. |
| Roster Management | Existing administrator routing and controls remain intact; the Account shortcut returns through Back to Account. Administrator internals use the same surface and typography tokens. |
| Bottom dock | `src/navigation.tsx` removes the sliding-indicator element, its motion value, measuring observer and animation. Touch/gesture routing stays intact. `src/rudder-navigation.css` gives all five controls the same column, icon stage, target height, label and badge geometry. Actions is central inside that geometry. |
| Shared surfaces and motion | `src/ui-system.tsx` replaces the Surface decoration stack with `uiSurface`; Pressable uses the shared short motion timing. Canonical page and sheet motion is 180–200 ms and respects reduced motion. |
| Education, launch and updates | Updated feature education teaches the compact context and Account hierarchy. Existing launch recovery, optional-module fallback, version history and approval-based PWA activation remain unchanged. Sheets use the common radius, surface and safe-area contract. |

## Removed presentation

Deleted files:

- `src/product-polish.css`
- `src/product-coherence.css`
- `src/product-coherence-bridge.css`
- `src/product-coherence-correction.css`

Removed redundant components and structure:

- Separate simultaneously mounted Changes fallback rail/state beside React. The fallback now belongs to the single React mount host.
- Night's old header brand/motto, three summary chips, compact duplicate assignment/date and decorative backdrop, plus their obsolete summary renderer.
- Chat's duplicate shift identity, Tonight kicker and large Chat essentials heading.
- Repeated date in the personal break card and duplicate staffing-count summary control.
- Sliding dock indicator and its geometry/animation machinery.
- The Account menu preceding every child page. The home menu itself remains as the required root destination.

The cleanup folded exact duplicate selectors, removed superseded shared presentation rules and their priority flags, and removed 35 further rules for deleted header/indicator/intro components, and 113 obsolete Chat-scoped notification rules. Notification rows, explicit switches and mute/device controls now belong to the shared settings contract with 44 px touch targets. Retained compatibility internals are explicitly layered, so the canonical system owns shared geometry through the normal cascade.

Across the 13 reviewed presentation files, CSS falls from **1,049,656 to 612,134 bytes**, rules from **7,577 to 4,600**, and `!important` declarations from **3,749 to zero**. The semantic `.hidden, [hidden]` visibility invariant remains the single deliberate priority declaration in `src/tailwind.css`.

The canonical system uses 4 / 8 / 12 / 16 / 24 / 32 spacing; 12 px control and 16 px content radii; a 10 / 12 / 14 / 16 / 18 / 22 / 28 typography scale; page, normal-content and strong surfaces; and saved reading-size preferences. Borders are reserved for meaningful separation. Dock translucency is limited to chrome.

The removed backdrop means `styles.css` has no asset URLs. Release synchronization and verification now allow that specific asset-free stylesheet while continuing to reject stale references and missing version references in the remaining production shell files.

## Exact visible wording changes

| Before | After |
| --- | --- |
| Manage this night | Tonight’s staffing |
| Standard plan is automatic | Standard staffing applies |
| Record an absence or overtime only when staffing changes. | Add only changes to tonight’s staffing. |
| View or adjust roles | Adjust roles |
| Up to date | Plan up to date |
| Your break · [date] | Your break |
| Team card repeated motto/count or count · Team chat | Team conversation |
| Chat context repeated count · Team chat/live state | Nurse count only |
| Staff coordination only / No patient information in the large essentials surface | Staff coordination only · No patient information in the compact safety banner |
| Expanded notification disclosure in Chat | Notification settings shortcut to the Account page |
| Close on the Account-to-administrator path | Back to Account |
| Full weekday/month date rail without year | Abbreviated weekday/month with year, for example Thu, 8 Oct 2026 |

Removed redundant visible phrases include the Night Your night eyebrow, Chat Tonight kicker, Chat essentials / Safety & alerts heading, repeated selected-night wrapper labels, and the separate Night phase signal. First Part, Second Part, Pager, Labour Ward and clinical staffing terminology remain unchanged. The full chat safety explanation and retention policy remain available through the safety information action.

## Validation

- Node 22.23.3; lockfile-installed application dependencies.
- `npm run release`: pass; 51.0 metadata, history, manifest, worker and generated runtime aligned.
- `npm run verify:ci`: pass. Complete deterministic regression suite, `tsc --noEmit`, Vite build and Pages/PWA artifact checks.
- Staffing property sweep: five reference nights and **1,600 staffing combinations**, pass. DST/equal-duty, Labour Ward, concurrency, idempotency, guarded writes, authentication, offline recovery, notifications and chat contracts pass.
- Source/build performance budgets pass without increasing their thresholds. PWA precache is approximately 853 KiB versus approximately 1,195 KiB at baseline.
- Chromium desktop smoke: **66 passed, 5 skipped, 0 failed**. Dedicated mobile Chromium coherence suite: **7 passed, 0 failed**, after the earlier mobile smoke completed its first 64 cases successfully. WebKit iPhone smoke: **11 passed, 0 failed**. The broad mobile run was interrupted by browser-runner setup; the dedicated suite and complete desktop/WebKit runs supply the final UI evidence.
- WebKit iPhone and low-end Chromium resilience: **9 passed, 5 skipped, 0 failed**. Skips are existing platform-specific/opt-in cases. WebKit checks include status-bar/Dynamic Island and landscape safe-area containment. Temporary browser libraries were loaded from the review workspace, with no dependency or runner workaround committed to the app.
- New coherence checks cover all operational destinations and Account child pages at **320, 360, 390, 412 and 430 px**, light/dark layouts, fixed dock geometry, one Changes rail, fallback-module failure, timeline separation, date/page overflow, both break schedules and six nurse rows, rapid switching, retained profile drafts and notification handlers.
- Additional existing browser checks cover clock-change notices and education, Actions/dialogs, chat threads, Roster Management, launch fallback, updates, offline navigation, revocation, safe areas and landscape notch gutters.

Browser checks use mobile emulation and the actual production build with isolated synthetic staff/session data. They do not send production roster writes and are not physical-device tests.

### Preservation evidence

`src/domain-logic.ts`, `src/runtime-foundation.ts`, `domain-logic.js`, `runtime-foundation.js` and `src/legacy-ui/sync.js` are byte-identical to production 50.9. No Supabase migrations, Edge Functions, schema, RLS or backend files change. `app-core.js` changes only APP_VERSION and the presentation lookup for retained Account controls. Chat changes only presentation metadata; push changes only presentation-node lookup and control scoping. Existing calculation and mutation functions remain the authority.

## Visual evidence

These are synthetic review fixtures rendered by the production build, with no patient information.

| Screen | Screenshot |
| --- | --- |
| Night | [Night](night.png) |
| Changes | [Changes](changes.png) |
| Breaks | [Breaks](breaks.png) |
| Chat | [Chat](chat.png) |
| Account | [Account](account.png) |
| Personalise | [Personalise](personalise.png) |
| Preferences | [Preferences](preferences.png) |
| Notifications | [Notifications](notifications.png) |
| Security | [Security](security.png) |
| App & Help | [App & Help](help.png) |
| Chat, dark | [Chat dark](chat-dark.png) |

## Release workflow

Use the existing repository PR gate and Pages workflow. The successful `test` job supplies the exact `pages-dist` artifact to deployment; UI-only scope requires no database migration. Deployment verification checks live index, service worker, manifest and push client against 51.0.
