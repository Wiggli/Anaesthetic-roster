# Presentation redesign boundary for 37.53

## 37.92 core-screen coherence pass

The 37.92 presentation pass builds on the completed incremental React migration without changing clinical calculation or persistence ownership. Night gains current-duty context, an orientation-only 00:00–07:00 progress rail with no countdown, quick links to the personal break and Chat unread state, smarter since-last-open activity presentation and Jump to me affordances. Breaks keeps the established first/second break calculation but presents the schedule as one grouped board with structured Labour Ward / Pager coverage. Changes keeps the same staffing, allocation and confirmation state machine but visually collapses a published plan into a quieter Shared state.

Shared presentation tokens now enforce semantic colour roles, larger core-screen typography, reduced card and border furniture, clearer content-under-glass chrome, optional haptic feedback and the existing reduced-motion, increased-contrast and reduced-transparency fallbacks. None of these additions writes roster data, changes the Malta operational-night boundary, alters Pager/Reliever or five/seven-nurse logic, or changes the explicit PWA update approval contract.

This PR is the first independently reviewable boundary of the requested complete redesign. It modernises the presentation layer in place, without replacing the clinical engine or changing the installed PWA identity. It is deliberately **not the completed redesign of every state and overlay**.

## Architecture and ownership

- `app-core.js` continues to calculate the roster, operational night, staffing and allocations. `app-ui.js` continues to own authentication, authorised actions, Supabase integration, realtime, chat coordination and the PWA lifecycle.
- Existing typed React view models remain the boundary for Night, Breaks, Changes, Chat, Account and Admin. The Night and Breaks presentation changes consume those models; they do not recalculate or write clinical data.
- `src/presentation.css` replaces seven ordered `liquid-*.css` imports with one ordered source and adds shared scene tokens and responsive surfaces. The former files were imported only from `src/tailwind.css`, and the production build now includes the consolidated source.
- The older `styles.css` and `chat.css` still contain active rules and remain in the reviewed asset allow-list. Their removal needs separate selector and browser proof; this PR does not label them obsolete.

## Visible boundary

- Night leads with the signed-in nurse's allocation, then the selected-night control, staffing summary, live team, and activity. The team's allocation remains on solid surfaces with role colour and text labels.
- Breaks leads with a personal first/second-break summary and retains the team plan and provisional state. A full-night Labour Ward assignment is not silently classified as a scheduled first or second break.
- Shared spacing, surfaces and touch geometry now apply across the shell, Changes workflow, Breaks, Chat, Account, auth and common overlays. Glass remains in floating chrome and overlays; clinical data stays on solid surfaces.
- The release dialog says “What’s new”, with the complete historical archive still available from Account. Release 37.53 accurately describes this boundary.

## Preserved contracts

The 138-night reference rotation, Pager/Reliever order, five/seven-person allocation decisions, Malta 07:00 boundary, history, privacy and RLS, Supabase RPCs, authenticated membership, chat and push delivery, offline read-only fallback, and explicit `ACTIVATE_UPDATE` approval were left intact. The release script changed only versioned runtime references, cache names and metadata. No migration, Edge Function, security policy, schema, or backend behaviour changed.

## Verification

- Baseline on remote `main` `00f4611767dc149d88e2ffc0fa9f5496b122c855`: Node 22 regression suite, typechecked production build, artifact check, and Playwright suite passed (52 passed, 6 skipped by test conditions).
- Candidate: `npm test`, `npm run build`, `npm run verify:build`, and Playwright mobile/desktop Chromium smoke suite. The suite exercises navigation gestures, keyboard tabs, typed clinical cards, Changes, Chat, Account/Admin, release history, and service-worker offline/cache policy. Personal Night ordering and personal Breaks text were added to the browser checks.
- Visual inspection used 390 px phone, 820 px tablet, and 1280 px desktop layouts in light and dark modes. A reduced-motion viewport was also inspected. Auth, Night, Changes, Breaks and Chat were sampled with local fixture data or unauthenticated shell states. The live authenticated production data and an installed mobile PWA were not available for this PR's visual inspection.

## Remaining redesign work, in order

1. **Clinical interaction ownership:** move the remaining Changes form chrome, confirmation preview, empty/error/conflict states and secondary roster view fully behind typed React adapters. Keep all existing validation and RPC calls in the engine; validate the five/seven-person paths with browser fixtures.
2. **Communication and account:** give team/private Chat, message actions, member selection, composer, Settings, Account and Admin complete responsive React screen ownership. Preserve chat delivery, retention, unread and notification behaviour; remove legacy selectors only after usage checks.
3. **Lifecycle and cleanup:** migrate auth/onboarding and every install/update/release dialog to shared sheet primitives with focus-return and keyboard QA. Prove and remove superseded rules from `styles.css` and `chat.css`, then repeat installed-PWA update and two-device authenticated checks before any deployment.

Each subsequent PR should be independently reviewable and should not be merged or deployed without fresh user approval. This PR also must **not** be merged or deployed without fresh user approval.
