# Changes confirmation presentation boundary (37.55)

This PR follows the merged 37.54 redesign foundation. It gives the Confirm step a typed React preview while keeping the existing clinical engine and selected-night confirmation action in control.

## Ownership

- `app-ui.js` still computes the allocation preview, detects changed roles, formats professional names and Labour Ward break context, collects reasons, and decides whether a plan needs confirmation. It emits one serialisable preview model. The same model also renders escaped legacy HTML if the optional component cannot load.
- `src/changes-confirmation.tsx` owns only the visible changed-assignment list, reason and expandable full plan. It has no Supabase client, mutation or calculation. The save button and its busy, offline, conflict and retry behaviour remain in the established workflow.
- `src/presentation.css` gives changed assignments a grouped, readable phone and desktop layout. The heading and step guide scroll away rather than covering the review. The warning is immediate and the full plan remains secondary and keyboard accessible.

## Verification and safety

Node 22 regression, typecheck, production build, build artifact and mobile/desktop browser smoke tests cover both the React region and the escaped chunk-failure fallback. This change does not alter the 138-night rotation, Pager/Reliever order, five/seven-person staffing rules, Malta boundary, RLS/RPCs, private cache exclusions or explicit PWA update approval. The release tooling synchronises 37.55 and its What’s New entry.

Live authenticated two-device behaviour, installed PWA update and production clinical writes are not exercised by local fixtures. Follow-up PRs must complete Changes transient feedback and conflict presentation, then Chat, account/admin, auth/onboarding and lifecycle screens. Prove legacy selectors unused before removing their CSS.
