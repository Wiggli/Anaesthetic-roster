# Account and settings presentation boundary (37.57)

This stacked PR follows draft #97. The account sheet groups personal profile, appearance, app help and sign-in security in one scrolling surface. Phone presentation remains a safe-area sheet; larger screens use a centred dialog. Clinical content and settings rows use solid surfaces, while translucency stays with the overlay chrome.

## Ownership

- `src/account-experience.tsx` owns the profile editor, appearance choice, app-help rows and passkey list. `index.html` owns the dialog shell and stable security controls. `src/presentation.css` styles the shared scene surfaces, spacing and responsive layout.
- `app-ui.js` remains the adapter for profile validation/save/photo uploads, account identity, passkey operations, theme persistence, install prompts, onboarding replay, release history and sign-out. Existing IDs and `roster:account-action` events remain intact.
- The approved account identity, private preferred name and local roster highlight remain visibly distinct. The profile image is always mounted, allowing the existing upload adapter to update its preview after a selection.
- The scrolling grid sizes each group to its content. A browser assertion guards against the app-help group becoming clipped when a React list mounts.

## Verification and limits

Node 22 regression suite, typechecked production build, artifact policy and phone/desktop browser suite cover account controls, light/dark mode, responsive dialog placement, app-help visibility and the existing auth/PWA/clinical smoke paths. Fixture screenshots of the account sheet were inspected in both modes and at phone/desktop widths.

No Supabase schema, RLS, auth method, roster, staffing, notification, service-worker or update policy changes are included. An authenticated profile upload/passkey setup and installed-device screen reader pass remain device-dependent review items. The wider redesign still needs Admin, authentication/onboarding and other transient states. Do not merge or deploy without fresh user approval.
