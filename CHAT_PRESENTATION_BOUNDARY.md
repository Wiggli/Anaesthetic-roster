# Chat presentation boundary (37.90)

Chat uses an inbox-first presentation on phone and a two-pane inbox/thread presentation on wider screens. Anaesthetic Team is explicitly labelled as **Team chat**, with plain-language copy explaining that it reaches everyone on tonight’s roster. Private messaging is separately labelled **Private messages**, and the new-private-chat action always includes a visible text label so occasional users do not need to interpret an icon.

## Ownership and interaction

- `index.html` owns the stable Chat landmarks and IDs: the inbox, Anaesthetic Team entry, private conversation list, team/private thread shells, notification disclosure and safety information entry point.
- `chat.js` continues to own Supabase transport, realtime subscription, unread/read-state bookkeeping, retention-compatible loading, replies, mentions, retry/delete rules and private-conversation creation. The new `activeThreadKind` presentation state only determines whether the inbox, team thread or private thread is active.
- Incoming Anaesthetic Team messages are marked read only when the team thread is actually open and visible. Merely visiting the Chat tab does not clear the team unread count.
- `src/chat-experience.tsx` continues to render typed conversation rows, messages, member picker, status feedback and composers. Consecutive messages from the same sender within five minutes are visually grouped without changing stored message data. The composer is a single presentation surface rather than a nested `GlassSurface` inside another bordered dock.
- `src/presentation.css` owns the inbox/thread composition, message grouping, dark mode, full-height phone conversation canvas and Liquid Glass treatment for thread chrome and composers. Composer chrome must remain one visible border with a plain textarea and one send button; wrapper layers must not add duplicate rings or borders.

## Product behaviour preserved

No database schema, RLS policy, authentication contract, chat retention rule, Edge Function, notification payload, service-worker activation rule or roster calculation is changed. Replies, @mentions, unread dividers, long-press/context message actions, copy/delete behaviour, failed-message retry and the existing new-private-message member picker remain in place.

Chat remains for staff coordination only. Patient-identifiable and clinical information must not be posted. The safety row opens an explanation using the existing information sheet, and messages remain subject to the established 14-day automatic removal policy.

## Verification

Verify Node 22 regression tests, release consistency, production build and the mobile/desktop Playwright suite. Phone review must confirm that Chat initially makes Team chat obvious without relying on icons, opening Anaesthetic Team or a private conversation creates a dedicated thread above the persistent app tab bar, the single-surface composer stays clear of the tab bar and keyboard, unread markers remain legible, and light/dark modes preserve contrast.
