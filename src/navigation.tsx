import { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { animate, motion, useMotionValue, useReducedMotion } from 'motion/react';

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
  const indicatorX = useMotionValue(0);
  const positions = useRef<number[]>([]);
  const [indicatorSize, setIndicatorSize] = useState({ top: 0, width: 0, height: 0 });

  useEffect(() => {
    const bar = document.querySelector<HTMLElement>('.bottom');
    if (!bar) return;
    let animation: ReturnType<typeof animate> | undefined;
    const moveTo = (view: string) => {
      const left = positions.current[destinations.indexOf(view as Destination)];
      if (left === undefined) return;
      animation?.stop();
      if (reducedMotion) indicatorX.set(left);
      else animation = animate(indicatorX, left, { type: 'spring', stiffness: 450, damping: 38 });
    };
    const measure = () => {
      const buttons = destinations.map(view => bar.querySelector<HTMLElement>(`button[data-v="${view}"]`));
      if (buttons.some(button => !button)) return;
      const barRect = bar.getBoundingClientRect();
      const rects = buttons.map(button => button!.getBoundingClientRect());
      positions.current = rects.map(rect => rect.left - barRect.left);
      setIndicatorSize({ top: rects[0].top - barRect.top, width: rects[0].width, height: rects[0].height });
      animation?.stop();
      indicatorX.set(positions.current[destinations.indexOf(document.body.getAttribute('data-view') as Destination)] ?? positions.current[0]);
    };
    const observer = new ResizeObserver(measure);
    observer.observe(bar);
    bar.classList.add('reactTabs');
    measure();
    const sync = (event: Event) => {
      const view = (event as CustomEvent<{ view: string }>).detail.view;
      setActive(view);
      moveTo(view);
    };
    type SwipeStart = { id: number; x: number; y: number; view: Destination; bar: boolean; preview?: Destination };
    let start: SwipeStart | null = null;
    let suppressClick = false;
    let clickTimer: number | undefined;
    let settleTimer: number | undefined;

    const clearContentDrag = () => {
      window.clearTimeout(settleTimer);
      settleTimer = undefined;
      const main = document.querySelector<HTMLElement>('main');
      const current = main?.querySelector<HTMLElement>(':scope > .view.swipeCurrent');
      const preview = main?.querySelector<HTMLElement>(':scope > .view.swipePreview');
      current?.classList.remove('swipeCurrent');
      if (current) current.style.removeProperty('transform');
      if (preview) {
        preview.classList.remove('swipePreview');
        preview.style.removeProperty('transform');
        preview.style.removeProperty('top');
        preview.style.removeProperty('left');
        preview.style.removeProperty('width');
        preview.removeAttribute('aria-hidden');
        preview.removeAttribute('inert');
      }
      main?.classList.remove('viewSwipeStage', 'viewSwipeSettling');
    };

    const stageContentDrag = (first: SwipeStart, dx: number) => {
      const index = destinations.indexOf(first.view);
      const step = -Math.sign(dx);
      const next = destinations[index + step];
      if (!step || !next) {
        if (first.preview) clearContentDrag();
        first.preview = undefined;
        return undefined;
      }
      const main = document.querySelector<HTMLElement>('main');
      const current = document.getElementById(first.view);
      const preview = document.getElementById(next);
      if (!main || !(current instanceof HTMLElement) || !(preview instanceof HTMLElement)) return undefined;
      if (first.preview && first.preview !== next) clearContentDrag();
      const mainRect = main.getBoundingClientRect();
      const currentRect = current.getBoundingClientRect();
      const width = Math.max(1, currentRect.width);
      const direction = destinations.indexOf(next) - index;
      main.classList.add('viewSwipeStage');
      current.classList.add('swipeCurrent');
      preview.classList.add('swipePreview');
      preview.setAttribute('aria-hidden', 'true');
      preview.setAttribute('inert', '');
      preview.style.top = `${currentRect.top - mainRect.top}px`;
      preview.style.left = `${currentRect.left - mainRect.left}px`;
      preview.style.width = `${width}px`;
      current.style.transform = `translate3d(${dx}px,0,0)`;
      preview.style.transform = `translate3d(${dx + direction * width}px,0,0)`;
      first.preview = next;
      return next;
    };

    const returnContentDrag = (first: SwipeStart) => {
      moveTo(first.view);
      const main = document.querySelector<HTMLElement>('main');
      const current = main?.querySelector<HTMLElement>(':scope > .view.swipeCurrent');
      const preview = main?.querySelector<HTMLElement>(':scope > .view.swipePreview');
      if (reducedMotion || !main || !current || !preview || !first.preview) {
        clearContentDrag();
        return;
      }
      const direction = destinations.indexOf(first.preview) - destinations.indexOf(first.view);
      const width = Math.max(1, current.getBoundingClientRect().width);
      main.classList.add('viewSwipeSettling');
      requestAnimationFrame(() => {
        current.style.transform = 'translate3d(0,0,0)';
        preview.style.transform = `translate3d(${direction * width}px,0,0)`;
      });
      settleTimer = window.setTimeout(() => {
        clearContentDrag();
      }, 190);
    };

    const commitContentDrag = (first: SwipeStart, next: Destination) => {
      moveTo(next);
      const main = document.querySelector<HTMLElement>('main');
      const current = main?.querySelector<HTMLElement>(':scope > .view.swipeCurrent');
      const preview = main?.querySelector<HTMLElement>(':scope > .view.swipePreview');
      if (reducedMotion || !main || !current || !preview || first.preview !== next) {
        clearContentDrag();
        window.show?.(next);
        if (next === 'chat') window.openChatView?.();
        return;
      }
      const direction = destinations.indexOf(next) - destinations.indexOf(first.view);
      const width = Math.max(1, current.getBoundingClientRect().width);
      main.classList.add('viewSwipeSettling');
      requestAnimationFrame(() => {
        current.style.transform = `translate3d(${-direction * width}px,0,0)`;
        preview.style.transform = 'translate3d(0,0,0)';
      });
      settleTimer = window.setTimeout(() => {
        clearContentDrag();
        window.show?.(next);
        if (next === 'chat') window.openChatView?.();
      }, 190);
    };

    const onStart = (event: TouchEvent) => {
      start = null;
      if (event.touches.length !== 1 || document.body.classList.contains('authPending') || document.querySelector('dialog[open]') || document.querySelector('main.viewSwipeSettling')) return;
      const target = event.target;
      if (!(target instanceof Element)) return;
      const inBar = !!target.closest('.bottom');
      const view = document.body.getAttribute('data-view') as Destination;
      if (!destinations.includes(view) || (!inBar && (!target.closest('main .view') || view === 'chat'))) return;
      if (!inBar && target.closest('button,a,input,select,textarea,[role="button"],[contenteditable="true"],[tabindex],.nightStatusRow,.changesWorkflowTabs,.dateNav,.chatMessages')) return;
      if (!inBar && window.getSelection()?.type === 'Range') return;
      const touch = event.touches[0];
      if (touch.clientX < 26 || touch.clientX > window.innerWidth - 26) return;
      animation?.stop();
      clearContentDrag();
      start = { id: touch.identifier, x: touch.clientX, y: touch.clientY, view, bar: inBar };
    };
    const onMove = (event: TouchEvent) => {
      if (!start || reducedMotion) return;
      const touch = Array.from(event.touches).find(item => item.identifier === start!.id);
      if (!touch) return;
      const dx = touch.clientX - start.x;
      const dy = touch.clientY - start.y;
      if (Math.abs(dy) > 18 && Math.abs(dy) > Math.abs(dx)) {
        const first = start;
        start = null;
        if (first.bar) moveTo(first.view); else returnContentDrag(first);
        return;
      }
      if (Math.abs(dx) < 8 || Math.abs(dx) < Math.abs(dy) * 1.35) return;
      const index = destinations.indexOf(start.view);
      const step = start.bar ? Math.sign(dx) : -Math.sign(dx);
      const neighbor = positions.current[index + step];
      const origin = positions.current[index];
      if (!start.bar) stageContentDrag(start, dx);
      if (origin !== undefined && neighbor !== undefined)
        indicatorX.set(origin + (neighbor - origin) * Math.min(1, Math.abs(dx) / 115));
    };
    const onEnd = (event: TouchEvent) => {
      const first = start;
      start = null;
      if (!first) return;
      if (document.body.getAttribute('data-view') !== first.view || document.querySelector('dialog[open]')) {
        clearContentDrag();
        moveTo(document.body.getAttribute('data-view') || first.view);
        return;
      }
      const touch = Array.from(event.changedTouches).find(item => item.identifier === first.id);
      if (!touch) {
        if (first.bar) moveTo(first.view); else returnContentDrag(first);
        return;
      }
      const dx = touch.clientX - first.x;
      const dy = touch.clientY - first.y;
      const step = first.bar ? Math.sign(dx) : -Math.sign(dx);
      const next = destinations[destinations.indexOf(first.view) + step];
      if (Math.abs(dx) < (first.bar ? 45 : 65) || Math.abs(dx) < Math.abs(dy) * 1.5 || !next) {
        if (first.bar) moveTo(first.view); else returnContentDrag(first);
        return;
      }
      suppressClick = true;
      window.clearTimeout(clickTimer);
      clickTimer = window.setTimeout(() => { suppressClick = false; }, 240);
      if (first.bar) {
        clearContentDrag();
        window.show?.(next);
        if (next === 'chat') window.openChatView?.();
      } else commitContentDrag(first, next);
    };
    const onClick = (event: MouseEvent) => {
      if (!suppressClick) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      suppressClick = false;
    };
    const onCancel = () => {
      const first = start;
      start = null;
      if (!first) return;
      if (first.bar) moveTo(first.view); else returnContentDrag(first);
    };
    window.addEventListener('roster:viewchange', sync);
    document.addEventListener('touchstart', onStart, { passive: true });
    document.addEventListener('touchmove', onMove, { passive: true });
    document.addEventListener('touchend', onEnd, { passive: true });
    document.addEventListener('touchcancel', onCancel, { passive: true });
    document.addEventListener('click', onClick, true);
    return () => {
      window.removeEventListener('roster:viewchange', sync);
      document.removeEventListener('touchstart', onStart);
      document.removeEventListener('touchmove', onMove);
      document.removeEventListener('touchend', onEnd);
      document.removeEventListener('touchcancel', onCancel);
      document.removeEventListener('click', onClick, true);
      window.clearTimeout(clickTimer);
      clearContentDrag();
      observer.disconnect();
      animation?.stop();
      bar.classList.remove('reactTabs');
    };
  }, [indicatorX, reducedMotion]);

  function navigate(view: Destination) {
    window.show?.(view);
    if (view === 'chat') window.openChatView?.();
  }

  function badge(id: string, initial: Badge) {
    return <em id={id} className={'navTaskBadge' + (initial.hidden ? ' hidden' : '')}>{initial.text}</em>;
  }

  return <div className="tw:contents" data-react-navigation="ready">
    <motion.span className="tabSlidingIndicator" aria-hidden="true"
      style={{ x: indicatorX, top: indicatorSize.top, width: indicatorSize.width, height: indicatorSize.height }} />
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
