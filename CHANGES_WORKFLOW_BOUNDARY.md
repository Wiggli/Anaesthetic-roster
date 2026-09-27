# Changes workflow presentation boundary (37.54)

This stacked PR builds on the 37.53 presentation foundation. It is a reviewable second slice of the requested full redesign, not a claim that every screen or transient state is complete. Its base is `feat/presentation-redesign-37-53`; neither PR is for merge or deployment without fresh user approval.

## Ownership and interaction

- `src/changes-workflow.tsx` owns the Staffing → Allocation → Confirm step control and contextual guidance. A typed model is emitted by the existing `app-ui.js` workflow; React sends step requests back through a named event. The legacy step controls remain visible if the optional chunk cannot load.
- The existing `app-ui.js` engine still determines tasks, pending confirmation, validation, disabled actions and the selected-night plan. It still owns all staffing and allocation writes, RPCs, history and realtime refresh. The model is presentation data only.
- `src/changes-experience.tsx` groups staffing records and allocation choices into scannable rows. Form actions and allocation select changes still use the established action adapter. `src/presentation.css` holds the responsive styling without adding another cascade file.
- The step control supports keyboard arrow, Home and End movement, visible focus, tab selection semantics and reduced motion. The panes retain their existing IDs and now expose named tab panels.

## Safety and cleanup boundary

No clinical rule, Supabase schema, RLS policy, Edge Function, auth flow, service worker update lifecycle, private network/cache exclusion or URL changed. The 138-night rotation, Pager/Reliever ordering, Malta-time boundary and incomplete-plan confirmation rules are covered by the unchanged regression suite. The replaced per-record card styling has been removed from the React component. Legacy controls and active global CSS remain until their load-failure and usage boundaries can be retired safely.

## Verification and limits

Run Node 22 `npm test`, `npm run build`, `npm run verify:build` and the full Playwright suite. Browser checks cover the new keyboard steps, the legacy load-failure fallback, typed record actions and responsive allocation selectors. Inspect Changes at 390 px and 820 px in light and dark themes; review the keyboard and bottom navigation overlap. This environment does not provide live authenticated shared clinical data or an installed mobile device, so those checks remain deployment gates.

## Next boundaries

1. Move Changes form layout, confirmation preview and conflict, saving, offline and empty presentations into typed React components while retaining every validation and RPC contract. Exercise five/seven-person paths with deterministic browser fixtures.
2. Complete Chat conversation, reply, selection and composer presentation; then Settings, Account and Admin, with keyboard, screen reader, phone and desktop review.
3. Complete auth, onboarding, lifecycle sheets, update and install prompts and version archive; prove unused legacy CSS and selectors before removal, then perform authenticated two-device and installed PWA update QA.
