import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { createRoot, type Root } from 'react-dom/client';

type Conversation = { id: string; title: string; initial: string; time: string; preview: string; unread: number; active: boolean };
type Member = { personKey: string; displayName: string; initial: string; available: boolean };
type ChatOverview = { conversations: Conversation[]; members: Member[] };
const roots = new Map<string, Root>();

function rootFor(id: string) {
  const host = document.getElementById(id); if (!host) return undefined;
  let root = roots.get(id); if (!root) { root = createRoot(host); roots.set(id, root); } return root;
}
function act(action: string, value: string) { window.dispatchEvent(new CustomEvent('roster:chat-action', { detail: { action, value } })); }

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

export function renderChatOverview(model: ChatOverview) {
  rootFor('chatConversationList')?.render(<ConversationList items={model.conversations} />);
  rootFor('chatMemberPicker')?.render(<MemberPicker members={model.members} />);
}
