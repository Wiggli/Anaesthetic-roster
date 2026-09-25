import { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { motion, useReducedMotion } from 'motion/react';

type Destination = 'today' | 'changes' | 'breaks' | 'chat';
type Badge = { text: string; hidden: boolean };
type Badges = { changes: Badge; chat: Badge };

const destinations: Destination[] = ['today', 'changes', 'breaks', 'chat'];

declare global {
  interface Window {
    show?: (view: string) => void;
    openChatView?: () => void;
  }
}

function badgeFrom(id: string): Badge {
  const element = document.getElementById(id);
  return { text: element?.textContent || '0', hidden: element?.classList.contains('hidden') !== false };
}

function Navigation({ badges }: { badges: Badges }) {
  const reducedMotion = useReducedMotion();
  const [active, setActive] = useState(document.body.getAttribute('data-view') || 'today');

  useEffect(() => {
    const sync = (event: Event) => setActive((event as CustomEvent<{ view: string }>).detail.view);
    let start: { id: number; x: number; y: number; view: Destination; at: number; bar: boolean } | null = null;
    let suppressClick = false;
    let clickTimer: number | undefined;
    const onStart = (event: TouchEvent) => {
      start = null;
      if (event.touches.length !== 1 || document.body.classList.contains('authPending') || document.querySelector('dialog[open]')) return;
      const target = event.target;
      if (!(target instanceof Element)) return;
      const bar = !!target.closest('.bottom');
      const view = document.body.getAttribute('data-view') as Destination;
      if (!destinations.includes(view) || (!bar && (!target.closest('main .view') || view === 'chat'))) return;
      if (!bar && target.closest('button,a,input,select,textarea,[role="button"],[contenteditable="true"],[tabindex],.nightStatusRow,.changesWorkflowTabs,.dateNav,.chatMessages')) return;
      if (!bar && window.getSelection()?.type === 'Range') return;
      const touch = event.touches[0];
      if (touch.clientX < 26 || touch.clientX > window.innerWidth - 26) return;
      start = { id: touch.identifier, x: touch.clientX, y: touch.clientY, view, at: Date.now(), bar };
    };
    const onEnd = (event: TouchEvent) => {
      const first = start;
      start = null;
      if (!first || document.body.getAttribute('data-view') !== first.view || document.querySelector('dialog[open]')) return;
      const touch = Array.from(event.changedTouches).find(item => item.identifier === first.id);
      if (!touch) return;
      const dx = touch.clientX - first.x;
      const dy = touch.clientY - first.y;
      if (Math.abs(dx) < (first.bar ? 58 : 85) || Math.abs(dx) < Math.abs(dy) * 1.7 || Date.now() - first.at > 700) return;
      const next = destinations[destinations.indexOf(first.view) + (dx < 0 ? 1 : -1)];
      if (!next) return;
      suppressClick = true;
      window.clearTimeout(clickTimer);
      clickTimer = window.setTimeout(() => { suppressClick = false; }, 180);
      window.show?.(next);
      if (next === 'chat') window.openChatView?.();
    };
    const onClick = (event: MouseEvent) => {
      if (!suppressClick) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      suppressClick = false;
    };
    const onCancel = () => { start = null; };
    window.addEventListener('roster:viewchange', sync);
    document.addEventListener('touchstart', onStart, { passive: true });
    document.addEventListener('touchend', onEnd, { passive: true });
    document.addEventListener('touchcancel', onCancel, { passive: true });
    document.addEventListener('click', onClick, true);
    return () => {
      window.removeEventListener('roster:viewchange', sync);
      document.removeEventListener('touchstart', onStart);
      document.removeEventListener('touchend', onEnd);
      document.removeEventListener('touchcancel', onCancel);
      document.removeEventListener('click', onClick, true);
      window.clearTimeout(clickTimer);
    };
  }, []);

  function navigate(view: Destination) {
    window.show?.(view);
    if (view === 'chat') window.openChatView?.();
  }

  function badge(id: string, initial: Badge) {
    return <em id={id} className={'navTaskBadge' + (initial.hidden ? ' hidden' : '')}>{initial.text}</em>;
  }

  return <div className="tw:contents" data-react-navigation="ready">
    <motion.button type="button" data-v="today" className={active === 'today' ? 'active' : ''}
      aria-current={active === 'today' ? 'page' : undefined} whileTap={reducedMotion ? undefined : { scale: 0.96 }}
      onClick={() => navigate('today')}>
      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M19.5 14.5A8 8 0 0 1 9.5 4.5a8 8 0 1 0 10 10Z" /><path d="M15.5 7.5h5M18 5v5" /></svg><span>Night</span>
    </motion.button>
    <motion.button type="button" data-v="changes" className={active === 'changes' ? 'active' : ''}
      aria-label="Staffing changes" aria-current={active === 'changes' ? 'page' : undefined}
      whileTap={reducedMotion ? undefined : { scale: 0.96 }} onClick={() => navigate('changes')}>
      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 7h11" /><path d="m13 4 3 3-3 3" /><path d="M19 17H8" /><path d="m11 14-3 3 3 3" /><circle cx="5" cy="17" r="1.5" /><circle cx="19" cy="7" r="1.5" /></svg><span>Changes</span>{badge('changesTaskBadge', badges.changes)}
    </motion.button>
    <motion.button type="button" data-v="breaks" className={active === 'breaks' ? 'active' : ''}
      aria-current={active === 'breaks' ? 'page' : undefined} whileTap={reducedMotion ? undefined : { scale: 0.96 }}
      onClick={() => navigate('breaks')}>
      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 9h12v5a5 5 0 0 1-5 5h-2a5 5 0 0 1-5-5Z" /><path d="M17 11h2a2 2 0 0 1 0 4h-2" /><path d="M8 6c0-1 1-1 1-2M12 6c0-1 1-1 1-2" /></svg><span>Breaks</span>
    </motion.button>
    <motion.button type="button" data-v="chat" className={active === 'chat' ? 'active' : ''}
      aria-label="Team chat" aria-current={active === 'chat' ? 'page' : undefined}
      whileTap={reducedMotion ? undefined : { scale: 0.96 }} onClick={() => navigate('chat')}>
      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5.5h16v11H9l-5 3v-14Z" /><path d="M8 10h8M8 13h5" /></svg><span>Chat</span>{badge('chatUnreadBadge', badges.chat)}
    </motion.button>
  </div>;
}

export function mountNavigation(element: HTMLElement) {
  const badges = { changes: badgeFrom('changesTaskBadge'), chat: badgeFrom('chatUnreadBadge') };
  createRoot(element).render(<Navigation badges={badges} />);
}
