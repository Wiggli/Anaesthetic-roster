# Chat presentation boundary (37.56)

This stacked PR follows draft #96. It improves the existing Chat screen without changing the team/private conversation transport, message retention, Supabase auth/RLS, notification delivery or unread bookkeeping.

## Ownership and interaction

- The typed React regions in `src/chat-experience.tsx` render a clearer private inbox, readable team/private message rows, visible action buttons, and a searchable roster-member picker. Existing event adapters still open conversations, select members, retry sends and show message actions through `chat.js`.
- Unregistered roster members remain legible and explicitly labelled. The picker searches only the roster entries already supplied by the existing directory model; it does not expand the directory or expose new people.
- A desktop empty conversation panel in `index.html` replaces the inherited dummy thread/composer when no private chat is selected. Its button calls the existing new-conversation action. Phone navigation between the list and a private thread is unchanged.
- `src/presentation.css` extends the shared scene tokens for unread rows, messages, replies, touch targets, dark mode and layout. Existing `chat.css` still styles the load-failure fallback and active legacy shell elements, so it is not removed without proof.

## Preservation and verification

No database, Edge Function, notification payload, service worker or roster rule was changed. The existing team chat remains staff-coordination only, with no patient information or new lock-screen disclosure. Message content is still plain React text, and the established failed-message, keyboard, context-menu, long-press and composer handlers remain intact.

Verify Node 22 regression tests, typecheck, production build, artifact policy and mobile/desktop Playwright suite, including private unread labels, roster-member filtering, message actions, composer submission and desktop empty state. Local fixture visual checks are representative only; an authenticated two-device exchange, installed PWA update and actual notification device check remain outstanding.

## Remaining redesign

Chat’s full-screen phone thread, notification settings placement and lifecycle sheets need further visual and keyboard review. The wider redesign still needs Settings, Account, Admin, auth/onboarding, transient states and proved removal of unused global selectors. Do not merge or deploy this stacked PR without fresh user approval.
