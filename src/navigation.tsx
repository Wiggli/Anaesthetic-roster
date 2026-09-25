import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
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
  const gesture = useRef<{ pointerId: number; x: number; y: number; view: string } | null>(null);
  const suppressClick = useRef(false);

  useEffect(() => {
    const sync = (event: Event) => setActive((event as CustomEvent<{ view: string }>).detail.view);
    window.addEventListener('roster:viewchange', sync);
    return () => window.removeEventListener('roster:viewchange', sync);
  }, []);

  function navigate(view: Destination) {
    window.show?.(view);
    if (view === 'chat') window.openChatView?.();
  }

  function start(event: ReactPointerEvent<HTMLDivElement>) {
    if (event.pointerType !== 'touch') return;
    gesture.current = { pointerId: event.pointerId, x: event.clientX, y: event.clientY, view: document.body.getAttribute('data-view') || active };
  }

  function end(event: ReactPointerEvent<HTMLDivElement>) {
    const first = gesture.current;
    gesture.current = null;
    if (!first || first.pointerId !== event.pointerId) return;
    const dx = event.clientX - first.x;
    const dy = event.clientY - first.y;
    if (Math.abs(dx) < 58 || Math.abs(dx) < Math.abs(dy) * 1.5) return;
    const index = destinations.indexOf(first.view as Destination);
    const next = destinations[index + (dx < 0 ? 1 : -1)];
    if (!next) return;
    suppressClick.current = true;
    navigate(next);
    window.setTimeout(() => { suppressClick.current = false; }, 80);
  }

  function badge(id: string, initial: Badge) {
    return <em id={id} className={'navTaskBadge' + (initial.hidden ? ' hidden' : '')}>{initial.text}</em>;
  }

  return <div className="tw:contents" data-react-navigation="ready" onPointerDown={start} onPointerUp={end}
    onPointerCancel={() => { gesture.current = null; }}
    onClickCapture={event => { if (suppressClick.current) { event.preventDefault(); event.stopPropagation(); } }}>
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
