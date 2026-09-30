# Chat presentation boundary (37.89)

Chat now uses an inbox-first presentation on phone and a two-pane inbox/thread presentation on wider screens. The Anaesthetic Team group is no longer an always-open embedded card above private chats. It appears as the pinned first conversation in the inbox and opens into the same dedicated thread canvas used by private conversations.

## Ownership and interaction

- `index.html` owns the stable Chat landmarks and IDs: the inbox, Anaesthetic Team entry, private conversation list, team/private thread shells, notification disclosure and safety information entry point.
- `chat.js` continues to own Supabase transport, realtime subscription, unread/read-state bookkeeping, retention-compatible loading, replies, mentions, retry/delete rules and private-conversation creation. The new `activeThreadKind` presentation state only determines whether the inbox, team thread or private thread is active.
- Incoming Anaesthetic Team messages are marked read only when the team thread is actually open and visible. Merely visiting the Chat tab does not clear the team unread count.
- `src/chat-experience.tsx` continues to render typed conversation rows, messages, member picker, status feedback and composers. Consecutive messages from the same sender within five minutes are visually grouped without changing stored message data.
- `src/presentation.css` owns the inbox/thread composition, message grouping, dark mode, full-height phone conversation canvas and Liquid Glass treatment for thread chrome and composers.

## Product behaviour preserved

No database schema, RLS policy, authentication contract, chat retention rule, Edge Function, notification payload, service-worker activation rule or roster calculation is changed. Replies, @mentions, unread dividers, long-press/context message actions, copy/delete behaviour, failed-message retry and the existing new-private-message member picker remain in place.

Chat remains for staff coordination only. Patient-identifiable and clinical information must not be posted. The safety row opens an explanation using the existing information sheet, and messages remain subject to the established 14-day automatic removal policy.

## Verification

Verify Node 22 regression tests, release consistency, production build and the mobile/desktop Playwright suite. Phone review must confirm that Chat initially shows the inbox, opening Anaesthetic Team or a private conversation creates a dedicated thread above the persistent app tab bar, the composer stays clear of the tab bar and keyboard, unread markers remain legible, and light/dark modes preserve contrast.
