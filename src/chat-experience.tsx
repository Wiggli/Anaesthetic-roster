import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { createRoot, type Root } from 'react-dom/client';
import { useLayoutEffect, useRef } from 'react';

type Conversation = { id: string; title: string; initial: string; time: string; preview: string; unread: number; active: boolean };
type Member = { personKey: string; displayName: string; initial: string; available: boolean };
type ChatOverview = { conversations: Conversation[]; members: Member[] };
type Message = { id: string; sender: string; time: string; body: string; own: boolean; failed: boolean; deleted: boolean; mentioned: boolean; dateLabel: string; unreadBefore: boolean; replySender: string; replyBody: string };
type MessageExperience = { kind: 'team' | 'private'; items: Message[]; bottomOffset: number };
const roots = new Map<string, Root>();

function rootFor(id: string) {
  const host = document.getElementById(id); if (!host) return undefined;
  let root = roots.get(id); if (!root) { root = createRoot(host); roots.set(id, root); } return root;
}
function act(action: string, value: string, kind?: string) { window.dispatchEvent(new CustomEvent('roster:chat-action', { detail: { action, value, kind } })); }

function ConversationList({ items }: { items: Conversation[] }) {
  const reduced = useReducedMotion();
  if (!items.length) return <div className="tw:rounded-2xl tw:bg-[var(--surface)] tw:p-5 tw:text-center"><strong className="tw:block tw:text-sm">No private chats yet</strong><span className="tw:mt-1 tw:block tw:text-xs tw:text-[var(--muted)]">Tap New message to start a one-to-one conversation.</span></div>;
  return <div className="tw:grid tw:gap-1.5"><AnimatePresence initial={false}>{items.map((item, index) => <motion.button
    layout key={item.id} type="button" initial={reduced ? false : { opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
    transition={{ duration: reduced ? 0 : 0.16, delay: reduced ? 0 : Math.min(index * 0.02, 0.1) }} whileTap={{ scale: reduced ? 1 : 0.99 }}
    onClick={() => act('conversation', item.id)} aria-current={item.active ? 'true' : undefined}
    className={`tw:flex tw:w-full tw:items-center tw:gap-3 tw:rounded-2xl tw:px-3 tw:py-3 tw:text-left ${item.active ? 'tw:bg-teal-500/12' : 'tw:bg-[var(--card)]'}`}
  >
    <span className="tw:grid tw:h-11 tw:w-11 tw:shrink-0 tw:place-items-center tw:rounded-full tw:bg-teal-500/14 tw:text-sm tw:font-bold tw:text-[var(--accent-strong)]">{item.initial}</span>
    <span className="tw:min-w-0 tw:flex-1"><span className="tw:flex tw:items-baseline tw:justify-between tw:gap-2"><strong className="tw:truncate tw:text-sm">{item.title}</strong><small className="tw:shrink-0 tw:text-[0.68rem] tw:text-[var(--muted)]">{item.time}</small></span><span className="tw:mt-0.5 tw:block tw:truncate tw:text-xs tw:text-[var(--muted)]">{item.preview}</span></span>
    {item.unread > 0 && <em className="tw:grid tw:min-h-5 tw:min-w-5 tw:place-items-center tw:rounded-full tw:bg-teal-600 tw:px-1.5 tw:text-[0.65rem] tw:font-bold tw:not-italic tw:text-white" aria-label={`${item.unread} unread`}>{item.unread > 99 ? '99+' : item.unread}</em>}
  </motion.button>)}</AnimatePresence></div>;
}

function MemberPicker({ members }: { members: Member[] }) {
  if (!members.length) return <p className="tw:p-5 tw:text-center tw:text-sm tw:text-[var(--muted)]">No other nurses are currently in the roster.</p>;
  return <div className="tw:grid tw:gap-2">{members.map(member => <motion.button key={member.personKey} type="button" disabled={!member.available} whileTap={member.available ? { scale: 0.99 } : undefined} onClick={() => member.available && act('member', member.personKey)} className="tw:flex tw:w-full tw:items-center tw:gap-3 tw:rounded-2xl tw:border tw:border-black/8 tw:bg-[var(--card)] tw:p-3 tw:text-left disabled:tw:opacity-55 dark:tw:border-white/10">
    <span className="tw:grid tw:h-10 tw:w-10 tw:shrink-0 tw:place-items-center tw:rounded-full tw:bg-[var(--surface)] tw:text-sm tw:font-bold">{member.initial}</span>
    <span className="tw:min-w-0 tw:flex-1"><strong className="tw:block tw:text-sm">{member.displayName}</strong><small className="tw:mt-0.5 tw:block tw:text-xs tw:text-[var(--muted)]">{member.available ? 'Available for private chat' : 'Has not registered in Night Roster yet'}</small></span>
    <span className={`tw:rounded-full tw:px-2.5 tw:py-1 tw:text-[0.65rem] tw:font-bold ${member.available ? 'tw:bg-teal-500/12 tw:text-teal-700 dark:tw:text-teal-200' : 'tw:bg-[var(--surface)] tw:text-[var(--muted)]'}`}>{member.available ? 'Available' : 'Not registered'}</span>
  </motion.button>)}</div>;
}

function MessageCard({ message, kind }: { message: Message; kind: 'team' | 'private' }) {
  const pointer = useRef<{ timer?: number; x: number; y: number }>({ x: 0, y: 0 });
  const cancel = () => { if (pointer.current.timer) window.clearTimeout(pointer.current.timer); pointer.current.timer = undefined; };
  const open = () => !message.failed && act('message', message.id, kind);
  const body = <>
    {message.replyBody && <span className="tw:mb-2 tw:block tw:rounded-xl tw:border-l-2 tw:border-teal-500 tw:bg-black/4 tw:px-2.5 tw:py-2 dark:tw:bg-white/6"><b className="tw:block tw:text-[0.68rem] tw:text-[var(--accent-strong)]">{message.replySender}</b><small className="tw:mt-0.5 tw:block tw:line-clamp-2 tw:text-[0.7rem] tw:text-[var(--muted)]">{message.replyBody}</small></span>}
    <span className={`tw:block tw:whitespace-pre-wrap tw:break-words tw:text-sm tw:leading-relaxed ${message.deleted ? 'tw:italic tw:text-[var(--muted)]' : ''}`}>{message.body}</span>
    {message.failed && <button type="button" onClick={() => act('retry', message.id, kind)} className="tw:mt-2 tw:rounded-full tw:bg-rose-500/12 tw:px-3 tw:py-1.5 tw:text-xs tw:font-bold tw:text-rose-700 dark:tw:text-rose-200">Retry</button>}
  </>;
  const handlers = {
    tabIndex: message.failed ? undefined : 0,
    onPointerDown: (event: React.PointerEvent) => { cancel(); pointer.current.x = event.clientX; pointer.current.y = event.clientY; pointer.current.timer = window.setTimeout(open, 520); },
    onPointerMove: (event: React.PointerEvent) => { if (Math.abs(event.clientX - pointer.current.x) > 8 || Math.abs(event.clientY - pointer.current.y) > 8) cancel(); },
    onPointerUp: cancel, onPointerCancel: cancel, onPointerLeave: cancel,
    onContextMenu: (event: React.MouseEvent) => { event.preventDefault(); cancel(); open(); },
    onKeyDown: (event: React.KeyboardEvent) => { if (event.key === 'ContextMenu' || (event.shiftKey && event.key === 'F10')) { event.preventDefault(); open(); } }
  };
  return <>
    {message.dateLabel && <div className="tw:my-3 tw:text-center tw:text-[0.68rem] tw:font-bold tw:text-[var(--muted)]">{message.dateLabel}</div>}
    {message.unreadBefore && <div className="tw:my-3 tw:flex tw:items-center tw:gap-2" data-chat-unread="true"><span className="tw:h-px tw:flex-1 tw:bg-teal-500/35" /><b className="tw:text-[0.68rem] tw:text-[var(--accent-strong)]">New messages</b><span className="tw:h-px tw:flex-1 tw:bg-teal-500/35" /></div>}
    {kind === 'team' ? <div {...handlers} className={`tw:rounded-xl tw:px-2.5 tw:py-2 ${message.own ? 'tw:bg-teal-500/8' : ''} ${message.mentioned ? 'tw:ring-1 tw:ring-amber-400/50' : ''}`} aria-label={`${message.own ? 'Your message' : `Message from ${message.sender}`}. Long press for actions.`}>
      <div className="tw:flex tw:items-baseline tw:gap-2"><span className="tw:text-[0.65rem] tw:text-[var(--muted)]">[{message.time}]</span><b className="tw:text-xs">{message.own ? 'You' : message.sender}:</b></div><div className="tw:mt-1">{body}</div>
    </div> : <div className={`tw:flex ${message.own ? 'tw:justify-end' : 'tw:justify-start'}`}><div {...handlers} className={`tw:max-w-[88%] tw:rounded-[18px] tw:px-3.5 tw:py-2.5 ${message.own ? 'tw:bg-teal-600 tw:text-white' : 'tw:bg-[var(--surface)]'} ${message.failed ? 'tw:ring-1 tw:ring-rose-400/50' : ''}`} aria-label={`${message.own ? 'Your message' : `Message from ${message.sender}`}. Long press for actions.`}>
      <div className="tw:mb-1 tw:flex tw:items-baseline tw:justify-between tw:gap-3"><b className="tw:text-[0.68rem]">{message.own ? 'You' : message.sender}</b><span className={`tw:text-[0.62rem] ${message.own ? 'tw:text-white/75' : 'tw:text-[var(--muted)]'}`}>{message.failed ? 'Not sent' : message.time}</span></div>{body}
    </div></div>}
  </>;
}

function Messages({ model, hostId }: { model: MessageExperience; hostId: string }) {
  useLayoutEffect(() => { const host = document.getElementById(hostId); if (host) host.scrollTop = Math.max(0, host.scrollHeight - host.clientHeight - model.bottomOffset); }, [hostId, model]);
  if (!model.items.length) return <div className="tw:grid tw:min-h-40 tw:place-items-center tw:p-5 tw:text-center"><span><b className="tw:block tw:text-sm">No messages yet</b><small className="tw:mt-1 tw:block tw:text-xs tw:text-[var(--muted)]">Start the conversation below.</small></span></div>;
  return <div className="tw:grid tw:gap-1.5">{model.items.map(item => <MessageCard key={item.id} message={item} kind={model.kind} />)}</div>;
}

function ChatComposer({ kind }: { kind: 'team' | 'private' }) {
  const team = kind === 'team';
  useLayoutEffect(() => { window.dispatchEvent(new CustomEvent('roster:chat-composers-mounted')); }, []);
  return <>
    <textarea id={team ? 'chatTeamInput' : 'chatMessageInput'} maxLength={2000} rows={1} placeholder={team ? 'Message Anaesthetic Team…' : 'Message…'} aria-label={team ? 'Write a message to Anaesthetic Team' : 'Write a private chat message'} className="tw:max-h-32 tw:min-h-10 tw:flex-1 tw:resize-none tw:rounded-xl tw:bg-transparent tw:px-2.5 tw:py-2 tw:text-sm tw:leading-relaxed tw:outline-none placeholder:tw:text-[var(--muted)]" />
      <button type="submit" id={team ? 'chatTeamSendBtn' : 'chatSendBtn'} aria-label={team ? 'Send group message' : 'Send private message'} className="chatSendBtn tw:grid tw:h-10 tw:w-10 tw:shrink-0 tw:place-items-center tw:rounded-full tw:bg-teal-600 tw:text-white tw:transition-transform active:tw:scale-95">
        <svg viewBox="0 0 24 24" aria-hidden="true" className="tw:h-5 tw:w-5 tw:fill-none tw:stroke-current tw:stroke-2"><path d="m21 3-8.5 18-2-7-7-2L21 3Z" /><path d="m10.5 14 4-4" /></svg>
      </button>
  </>;
}

export function renderChatOverview(model: ChatOverview) {
  rootFor('chatTeamComposer')?.render(<ChatComposer kind="team" />);
  rootFor('chatComposer')?.render(<ChatComposer kind="private" />);
  rootFor('chatConversationList')?.render(<ConversationList items={model.conversations} />);
  rootFor('chatMemberPicker')?.render(<MemberPicker members={model.members} />);
}

export function renderChatMessages(model: MessageExperience) {
  const hostId = model.kind === 'team' ? 'chatTeamMessages' : 'chatMessages';
  rootFor(hostId)?.render(<Messages model={model} hostId={hostId} />);
}
