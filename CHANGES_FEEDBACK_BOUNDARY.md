# Changes feedback presentation boundary (37.56)

This follows the merged confirmation preview in 37.55. The Confirm step now presents the existing saving, success, offline, conflict and error messages as readable status cards, with accessible status or alert semantics. The exact operational messages and their next steps remain supplied by the existing engine.

`app-ui.js` still validates allocations, calls the versioned RPCs, detects revision conflicts, reloads shared data, handles timeout and retry, and decides whether confirmation is available. It sends only a message and tone to `src/changes-feedback.tsx`. The plain `aria-live` text remains the fallback when the optional chunk fails. There is no new storage, backend query, data mutation, or automatic retry.

The release script synchronises version 37.56 and the explicit PWA cache reference. No roster rotation, staffing, five/seven-person decision, Malta-time boundary, chat, push, realtime, authentication, RLS, schema, worker update approval, URL or installed identity changes in this boundary.

Verification: Node regression suite, typechecked production build and artifact check pass. The focused mobile and desktop browser checks cover conflict to success, as well as the chunk-failure fallback. The full browser suite covers navigation, Changes, account, auth, offline and update states. Live two-device conflict and installed-PWA update checks still require an authenticated production-like environment before a deployment is considered fully verified.

Next, complete Chat conversation and composer surfaces, account/admin, auth/onboarding and lifecycle overlays. Remove older CSS only after proving its selectors unused and checking light, dark, phone, tablet and desktop states.
