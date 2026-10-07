import { useEffect } from 'react';
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
    showQuickActions?: () => void;
  }
}

function navigationHaptic() {
  try {
    if ('vibrate' in navigator && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) navigator.vibrate(7);
  } catch {
    // Optional enhancement only.
  }
}

function badgeFrom(id: string): Badge {
  const element = document.getElementById(id);
  return { text: element?.textContent || '0', hidden: element?.classList.contains('hidden') !== false };
}

function Navigation({ badges }: { badges: Badges }) {
  const reducedMotion = useReducedMotion();
  useEffect(() => {
    const bar = document.querySelector<HTMLElement>('.bottom');
    if (!bar) return;

    let clickSuppressed = false;
    let clickTimer: number | undefined;

    const currentView = () => {
      const value = document.body.getAttribute('data-view') as Destination;
      return destinations.includes(value) ? value : 'today';
    };

    const navigate = (view: Destination) => {
      if (view === currentView()) return;
      navigationHaptic();
      window.show?.(view);
      if (view === 'chat') window.openChatView?.();
    };

    const quickDialog = document.getElementById('quickActionsSheet');
    const quickButton = bar.querySelector<HTMLElement>('[data-quick-rudder]');
    const syncQuick = () => {
      const open = Boolean(quickDialog?.hasAttribute('open'));
      quickButton?.classList.toggle('open', open);
      quickButton?.setAttribute('aria-expanded', open ? 'true' : 'false');
    };
    const quickObserver = quickDialog ? new MutationObserver(syncQuick) : undefined;
    if (quickDialog) quickObserver?.observe(quickDialog, { attributes: true, attributeFilter: ['open'] });
    syncQuick();

    type SwipeAxis = 'pending' | 'horizontal' | 'vertical';
    type SwipeStart = {
      id: number;
      x: number;
      y: number;
      at: number;
      view: Destination;
      bar: boolean;
      axis: SwipeAxis;
    };

    let start: SwipeStart | null = null;
    const blocked = 'button,a,input,select,textarea,summary,[role="button"],[contenteditable="true"]';

    const lockAxis = (first: SwipeStart, dx: number, dy: number) => {
      if (first.axis !== 'pending') return first.axis;
      const ax = Math.abs(dx);
      const ay = Math.abs(dy);
      if (Math.max(ax, ay) < 10) return first.axis;
      if (ax > ay * 1.22) first.axis = 'horizontal';
      else if (ay > ax * 1.12) first.axis = 'vertical';
      return first.axis;
    };

    const onStart = (event: TouchEvent) => {
      start = null;
      if (event.touches.length !== 1 || document.body.classList.contains('authPending') || document.querySelector('dialog[open]')) return;
      const touch = event.touches[0];
      const hit = document.elementFromPoint(touch.clientX, touch.clientY);
      const target = hit instanceof Element ? hit : event.target;
      if (!(target instanceof Element)) return;

      const inBar = Boolean(target.closest('.bottom'));
      if (target.closest('[data-quick-rudder]')) return;
      if (!inBar && (!target.closest('main .view') || target.closest(blocked))) return;
      if (!inBar && window.getSelection()?.type === 'Range') return;

      start = {
        id: touch.identifier,
        x: touch.clientX,
        y: touch.clientY,
        at: performance.now(),
        view: currentView(),
        bar: inBar,
        axis: 'pending'
      };
    };

    const onMove = (event: TouchEvent) => {
      if (!start) return;
      const touch = Array.from(event.touches).find(item => item.identifier === start!.id);
      if (!touch) return;
      const axis = lockAxis(start, touch.clientX - start.x, touch.clientY - start.y);
      if (axis === 'vertical') {
        start = null;
        return;
      }
      if (axis === 'horizontal' && event.cancelable) event.preventDefault();
    };

    const suppressNextClick = (ms: number) => {
      clickSuppressed = true;
      window.clearTimeout(clickTimer);
      clickTimer = window.setTimeout(() => { clickSuppressed = false; }, ms);
    };

    const onEnd = (event: TouchEvent) => {
      const first = start;
      start = null;
      if (!first) return;
      const touch = Array.from(event.changedTouches).find(item => item.identifier === first.id);
      if (!touch) return;

      const dx = touch.clientX - first.x;
      const dy = touch.clientY - first.y;
      const axis = lockAxis(first, dx, dy);
      if (axis !== 'horizontal') return;

      if (first.bar) {
        if (Math.abs(dx) < 18) return;
        const candidates = destinations.map(view => {
          const button = bar.querySelector<HTMLElement>(`button[data-v="${view}"]`);
          const rect = button?.getBoundingClientRect();
          return { view, center: rect ? rect.left + rect.width / 2 : Number.POSITIVE_INFINITY };
        });
        const target = candidates.reduce((best, item) =>
          Math.abs(item.center - touch.clientX) < Math.abs(best.center - touch.clientX) ? item : best
        ).view;
        if (target !== first.view) {
          suppressNextClick(240);
          navigate(target);
        }
        return;
      }

      const elapsed = Math.max(1, performance.now() - first.at);
      const distance = Math.abs(dx);
      const velocity = distance / elapsed;
      const enoughDistance = distance >= Math.min(82, Math.max(52, window.innerWidth * 0.16));
      const quickFlick = distance >= 34 && velocity >= 0.52;
      if ((!enoughDistance && !quickFlick) || Math.abs(dx) <= Math.abs(dy) * 1.08) return;

      const index = destinations.indexOf(first.view);
      const next = destinations[index - Math.sign(dx)];
      if (!next) return;
      suppressNextClick(220);
      navigate(next);
    };

    const onCancel = () => { start = null; };
    const onClickCapture = (event: MouseEvent) => {
      if (!clickSuppressed) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      clickSuppressed = false;
    };

    bar.classList.add('reactTabs', 'liquidTabBar');

    document.addEventListener('touchstart', onStart, { passive: true });
    document.addEventListener('touchmove', onMove, { passive: false });
    document.addEventListener('touchend', onEnd, { passive: true });
    document.addEventListener('touchcancel', onCancel, { passive: true });
    document.addEventListener('click', onClickCapture, true);

    return () => {
      quickObserver?.disconnect();
      window.clearTimeout(clickTimer);
      document.removeEventListener('touchstart', onStart);
      document.removeEventListener('touchmove', onMove);
      document.removeEventListener('touchend', onEnd);
      document.removeEventListener('touchcancel', onCancel);
      document.removeEventListener('click', onClickCapture, true);
      bar.classList.remove('reactTabs', 'liquidTabBar');
    };
  }, []);

  const navigate = (view: Destination) => {
    if (document.body.getAttribute('data-view') !== view) navigationHaptic();
    window.show?.(view);
    if (view === 'chat') window.openChatView?.();
  };

  function badge(id: string, initial: Badge) {
    return <em id={id} className={'navTaskBadge' + (initial.hidden ? ' hidden' : '')}>{initial.text}</em>;
  }

  return <div className="tw:contents" data-react-navigation="ready">
    <motion.button type="button" data-v="today" className={document.body.getAttribute('data-view') === 'today' ? 'active' : ''}
      aria-current={document.body.getAttribute('data-view') === 'today' ? 'page' : undefined}
      whileTap={reducedMotion ? undefined : { scale: 0.97 }} onClick={() => navigate('today')}>
      <span className="navIconWrap"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M19.5 14.5A8 8 0 0 1 9.5 4.5a8 8 0 1 0 10 10Z" /><path d="M15.5 7.5h5M18 5v5" /></svg></span>
      <span>Night</span>
    </motion.button>
    <motion.button type="button" data-v="changes" className={document.body.getAttribute('data-view') === 'changes' ? 'active' : ''}
      aria-label="Staffing changes" aria-current={document.body.getAttribute('data-view') === 'changes' ? 'page' : undefined}
      whileTap={reducedMotion ? undefined : { scale: 0.97 }} onClick={() => navigate('changes')}>
      <span className="navIconWrap"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 7h11" /><path d="m13 4 3 3-3 3" /><path d="M19 17H8" /><path d="m11 14-3 3 3 3" /><circle cx="5" cy="17" r="1.5" /><circle cx="19" cy="7" r="1.5" /></svg>{badge('changesTaskBadge', badges.changes)}</span>
      <span>Changes</span>
    </motion.button>
    <motion.button type="button" className="quickRudder" data-quick-rudder aria-label="Quick actions" aria-haspopup="dialog" aria-expanded="false"
      whileTap={reducedMotion ? undefined : { scale: 0.97 }}
      onClick={() => { navigationHaptic(); window.showQuickActions?.(); }}>
      <span className="quickRudderDisc">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>
        <em id="quickActionAttention" className={'quickRudderAttention' + (badges.changes.hidden ? ' hidden' : '')} aria-hidden="true">
          {badges.changes.hidden ? '' : badges.changes.text}
        </em>
      </span>
      <span className="quickRudderLabel">Actions</span>
    </motion.button>
    <motion.button type="button" data-v="breaks" className={document.body.getAttribute('data-view') === 'breaks' ? 'active' : ''}
      aria-current={document.body.getAttribute('data-view') === 'breaks' ? 'page' : undefined}
      whileTap={reducedMotion ? undefined : { scale: 0.97 }} onClick={() => navigate('breaks')}>
      <span className="navIconWrap"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 9h12v5a5 5 0 0 1-5 5h-2a5 5 0 0 1-5-5Z" /><path d="M17 11h2a2 2 0 0 1 0 4h-2" /><path d="M8 6c0-1 1-1 1-2M12 6c0-1 1-1 1-2" /></svg></span>
      <span>Breaks</span>
    </motion.button>
    <motion.button type="button" data-v="chat" className={document.body.getAttribute('data-view') === 'chat' ? 'active' : ''}
      aria-label="Team chat" aria-current={document.body.getAttribute('data-view') === 'chat' ? 'page' : undefined}
      whileTap={reducedMotion ? undefined : { scale: 0.97 }} onClick={() => navigate('chat')}>
      <span className="navIconWrap"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5.5h16v11H9l-5 3v-14Z" /><path d="M8 10h8M8 13h5" /></svg>{badge('chatUnreadBadge', badges.chat)}</span>
      <span>Chat</span>
    </motion.button>
  </div>;
}

export function mountNavigation(element: HTMLElement) {
  const badges = { changes: badgeFrom('changesTaskBadge'), chat: badgeFrom('chatUnreadBadge') };
  createRoot(element).render(<Navigation badges={badges} />);
}
