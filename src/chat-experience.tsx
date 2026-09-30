import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { flushSync } from 'react-dom';
import { createRoot, type Root } from 'react-dom/client';
import { useLayoutEffect, useRef, useState } from 'react';
import { Avatar, Badge, EmptyState, GlassSurface, GroupedList, ListRow, Pressable, Surface } from './ui-system';

type Conversation = { id: string; title: string; initial: string; time: string; preview: string; unread: number; active: boolean };
type Member = { personKey: string; displayName: string; initial: string; available: boolean };
type ChatOverview = { conversations: Conversation[]; members: Member[] };
type Message = { id: string; sender: string; time: string; body: string; own: boolean; failed: boolean; deleted: boolean; mentioned: boolean; dateLabel: string; unreadBefore: boolean; replySender: string; replyBody: string };
type MessageExperience = { kind: 'team' | 'private'; items: Message[]; bottomOffset: number };
type ChatStatusModel = { message: string; error: boolean };
const roots = new Map<string, Root>();

function rootFor(id: string) {
  const host = document.getElementById(id); if (!host) return undefined;
  let root = roots.get(id); if (!root) { root = createRoot(host); roots.set(id, root); } return root;
}
function act(action: string, value: string, kind?: string) { window.dispatchEvent(new CustomEvent('roster:chat-action', { detail: { action, value, kind } })); }

function ConversationList({ items }: { items: Conversation[] }) {
  const reduced = useReducedMotion();
  if (!items.length) return <Surface>
    <EmptyState title="No private chats yet" detail="Tap New message to start a one-to-one conversation." />
  </Surface>;

  return <GroupedList className="reactConversationGroup chatInboxList tw:overflow-visible">
    <AnimatePresence initial={false}>
      {items.map((item, index) => <motion.div
        layout
        key={item.id}
        initial={reduced ? false : { opacity: 0, y: 5 }}
        animate={{ opacity: 1, y: 0 }}
        exit={reduced ? undefined : { opacity: 0, y: -3 }}
        transition={{ duration: reduced ? 0 : 0.16, delay: reduced ? 0 : Math.min(index * 0.018, 0.09) }}
      >
        <ListRow
          leading={<Avatar initial={item.initial} />}
          title={item.title}
          subtitle={<span className="tw:block tw:truncate">{item.preview}</span>}
          trailing={<span className="chatInboxMeta"><time>{item.time}</time>{item.unread > 0 && <Badge tone="accent" className="chatInboxUnread">{item.unread > 99 ? '99+' : item.unread}</Badge>}</span>}
          onClick={() => act('conversation', item.id)}
          ariaLabel={`Open conversation with ${item.title}${item.unread ? `, ${item.unread} unread` : ''}`}
          className={`chatInboxRow ${item.unread ? 'hasUnread' : ''} ${item.active ? 'active' : ''}`}
        />
      </motion.div>)}
    </AnimatePresence>
  </GroupedList>;
}

function MemberPicker({ members }: { members: Member[] }) {
  const [query, setQuery] = useState('');
  const visible = members.filter(member => member.displayName.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()));
  if (!members.length) return <Surface>
    <EmptyState title="No other nurses in this roster" detail="Private conversations will appear when another rostered nurse is registered." />
  </Surface>;

  return <div className="chatPickerExperience">
    <label className="chatPickerSearch"><span className="tw:sr-only">Search roster members</span><input type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="Search roster members" aria-label="Search roster members" /></label>
    <div className="chatPickerCount" role="status">{visible.length} {visible.length === 1 ? 'member' : 'members'} shown</div>
    {visible.length ? <GroupedList className="chatPickerList">{visible.map(member => <ListRow
      key={member.personKey}
      leading={<Avatar initial={member.initial} size="sm" />}
      title={member.displayName}
      subtitle={member.available ? 'Available for private chat' : 'Has not registered in Night Roster yet'}
      trailing={<Badge tone={member.available ? 'success' : 'neutral'}>{member.available ? 'Available' : 'Not registered'}</Badge>}
      onClick={member.available ? () => act('member', member.personKey) : undefined}
      ariaLabel={member.available ? `Start a private chat with ${member.displayName}` : undefined}
      className={`chatPickerRow ${member.available ? '' : 'notRegistered'}`}
    />)}</GroupedList> : <EmptyState title="No matching roster members" detail="Try another name." />}
  </div>;
}

function MessageCard({ message, kind }: { message: Message; kind: 'team' | 'private' }) {
  const pointer = useRef<{ timer?: number; x: number; y: number }>({ x: 0, y: 0 });
  const cancel = () => { if (pointer.current.timer) window.clearTimeout(pointer.current.timer); pointer.current.timer = undefined; };
  const open = () => !message.failed && act('message', message.id, kind);
  const body = <>
    {message.replyBody && <span className="tw:mb-2 tw:block tw:rounded-xl tw:border-l-2 tw:border-blue-500 tw:bg-black/4 tw:px-2.5 tw:py-2 tw:dark:bg-white/6"><b className="tw:block tw:text-[0.68rem] tw:text-[var(--accent-strong)]">{message.replySender}</b><small className="tw:mt-0.5 tw:block tw:line-clamp-2 tw:text-[0.7rem] tw:text-[var(--muted)]">{message.replyBody}</small></span>}
    <span className={`tw:block tw:whitespace-pre-wrap tw:break-words tw:text-sm tw:leading-relaxed ${message.deleted ? 'tw:italic tw:text-[var(--muted)]' : ''}`}>{message.body}</span>
    {message.failed && <Pressable type="button" onClick={() => act('retry', message.id, kind)} className="tw:mt-2 tw:rounded-full tw:bg-rose-500/12 tw:px-3 tw:py-1.5 tw:text-xs tw:font-bold tw:text-rose-700 tw:dark:text-rose-200">Retry</Pressable>}
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
    {message.dateLabel && <div className="chatDateSeparator" role="separator" aria-label={message.dateLabel}><span>{message.dateLabel}</span></div>}
    {message.unreadBefore && <div className="tw:my-3 tw:flex tw:items-center tw:gap-2" data-chat-unread="true"><span className="tw:h-px tw:flex-1 tw:bg-blue-500/35" /><b className="tw:text-[0.68rem] tw:text-[var(--accent-strong)]">New messages</b><span className="tw:h-px tw:flex-1 tw:bg-blue-500/35" /></div>}
    {kind === 'team' ? <div {...handlers} className={`chatTeamMessage ${message.own ? 'own' : ''} ${message.mentioned ? 'mentioned' : ''}`} aria-label={`${message.own ? 'Your message' : `Message from ${message.sender}`}. Message actions available.`}>
      <div className="chatMessageHeading"><b>{message.own ? 'You' : message.sender}</b><span className="chatMessageTime">{message.time}</span>{!message.failed && <Pressable type="button" className="chatInlineAction" aria-label={`Actions for message from ${message.own ? 'you' : message.sender}`} onClick={event => { event.stopPropagation(); open(); }}>•••</Pressable>}</div><div className="chatMessageBodyText">{body}</div>
    </div> : <div className={`chatPrivateMessage ${message.own ? 'own' : ''}`}><div {...handlers} className={`chatPrivateBubble ${message.failed ? 'failed' : ''}`} aria-label={`${message.own ? 'Your message' : `Message from ${message.sender}`}. Message actions available.`}>
      <div className="chatMessageHeading"><b>{message.own ? 'You' : message.sender}</b><span className="chatMessageTime">{message.failed ? 'Not sent' : message.time}</span>{!message.failed && <Pressable type="button" className="chatInlineAction" aria-label={`Actions for message from ${message.own ? 'you' : message.sender}`} onClick={event => { event.stopPropagation(); open(); }}>•••</Pressable>}</div>{body}
    </div></div>}
  </>;
}

function Messages({ model, hostId }: { model: MessageExperience; hostId: string }) {
  useLayoutEffect(() => { const host = document.getElementById(hostId); if (host) host.scrollTop = Math.max(0, host.scrollHeight - host.clientHeight - model.bottomOffset); }, [hostId, model]);
  if (!model.items.length) return <div className="tw:grid tw:min-h-40 tw:place-items-center tw:p-5 tw:text-center"><span><b className="tw:block tw:text-sm">No messages yet</b><small className="tw:mt-1 tw:block tw:text-xs tw:text-[var(--muted)]">Start the conversation below.</small></span></div>;
  return <div className="tw:grid tw:gap-1.5">{model.items.map(item => <MessageCard key={item.id} message={item} kind={model.kind} />)}</div>;
}

function ChatComposer({ kind, initialValue }: { kind: 'team' | 'private'; initialValue: string }) {
  const team = kind === 'team';
  useLayoutEffect(() => {
    const input = document.getElementById(team ? 'chatTeamInput' : 'chatMessageInput') as HTMLTextAreaElement | null;
    const button = document.getElementById(team ? 'chatTeamSendBtn' : 'chatSendBtn') as HTMLButtonElement | null;
    const counter = document.getElementById(team ? 'chatTeamCharacterCount' : 'chatPrivateCharacterCount');
    const update = () => {
      if (!input || !button) return;
      const length = input.value.length;
      button.disabled = !input.value.trim();
      if (counter) {
        counter.textContent = `${2000 - length} characters remaining`;
        counter.classList.toggle('hidden', length < 1600);
        counter.classList.toggle('chatCharacterWarning', length >= 1900);
      }
    };
    input?.addEventListener('input', update);
    update();
    window.dispatchEvent(new CustomEvent('roster:chat-composers-mounted'));
    return () => input?.removeEventListener('input', update);
  }, [team]);
  return <GlassSurface className="chatComposerGlass tw:col-span-full tw:flex tw:min-w-0 tw:items-end tw:gap-1.5 tw:rounded-[22px] tw:p-1.5">
    <textarea
      id={team ? 'chatTeamInput' : 'chatMessageInput'}
      data-chat-composer="react"
      defaultValue={initialValue}
      maxLength={2000}
      rows={1}
      placeholder={team ? 'Message Anaesthetic Team…' : 'Message…'}
      aria-label={team ? 'Write a message to Anaesthetic Team' : 'Write a private chat message'}
      className="tw:max-h-32 tw:min-h-10 tw:min-w-0 tw:flex-1 tw:resize-none tw:rounded-[16px] tw:border-0! tw:bg-transparent! tw:px-2.5 tw:py-2 tw:text-sm tw:leading-relaxed tw:shadow-none! tw:outline-none tw:ring-0! tw:placeholder:text-[var(--muted)] tw:focus:border-0! tw:focus:shadow-none! tw:focus:ring-0!"
    />
    <span id={team ? 'chatTeamCharacterCount' : 'chatPrivateCharacterCount'} className="hidden tw:shrink-0 tw:self-center tw:px-1 tw:text-[0.62rem] tw:font-bold tw:text-[var(--muted)]" aria-live="polite" />
    <Pressable
      type="submit"
      id={team ? 'chatTeamSendBtn' : 'chatSendBtn'}
      aria-label={team ? 'Send group message' : 'Send private message'}
      title="Send · Command or Control + Enter"
      className="chatSendBtn tw:grid tw:h-10 tw:w-10 tw:shrink-0 tw:place-items-center tw:rounded-full tw:bg-blue-600! tw:text-white tw:shadow-[0_4px_12px_rgba(0,113,227,0.20)] tw:disabled:opacity-40"
    >
      <svg viewBox="0 0 24 24" aria-hidden="true" className="tw:h-5 tw:w-5 tw:fill-none tw:stroke-current tw:stroke-2"><path d="m21 3-8.5 18-2-7-7-2L21 3Z" /><path d="m10.5 14 4-4" /></svg>
    </Pressable>
  </GlassSurface>;
}

export function renderChatOverview(model: ChatOverview) {
  const teamDraft = (document.getElementById('chatTeamInput') as HTMLTextAreaElement | null)?.value ?? '';
  const privateDraft = (document.getElementById('chatMessageInput') as HTMLTextAreaElement | null)?.value ?? '';
  const teamRoot = rootFor('chatTeamComposer');
  const privateRoot = rootFor('chatComposer');
  const conversationRoot = rootFor('chatConversationList');
  const memberRoot = rootFor('chatMemberPicker');
  flushSync(() => {
    teamRoot?.render(<ChatComposer kind="team" initialValue={teamDraft} />);
    privateRoot?.render(<ChatComposer kind="private" initialValue={privateDraft} />);
    conversationRoot?.render(<ConversationList items={model.conversations} />);
    memberRoot?.render(<MemberPicker members={model.members} />);
  });
}

export function renderChatMessages(model: MessageExperience) {
  const hostId = model.kind === 'team' ? 'chatTeamMessages' : 'chatMessages';
  rootFor(hostId)?.render(<Messages model={model} hostId={hostId} />);
}

function ChatStatus({ model }: { model: ChatStatusModel }) {
  useLayoutEffect(() => { document.getElementById('chatStatus')?.setAttribute('data-react-ready', 'true'); }, []);
  if (!model.message) return null;
  return <div className={`chatStatusCard ${model.error ? 'chatStatusCard--error' : ''}`} role={model.error ? 'alert' : 'status'}>
    <span className="chatStatusMark" aria-hidden="true">{model.error ? '!' : '·'}</span>
    <div><strong>{model.error ? 'Chat needs attention' : 'Chat update'}</strong><p>{model.message}</p></div>
  </div>;
}

export function renderChatStatus(model: ChatStatusModel) {
  rootFor('chatStatus')?.render(<ChatStatus model={model} />);
}
