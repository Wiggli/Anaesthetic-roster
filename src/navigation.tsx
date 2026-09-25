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
  const transitionToRef = useRef<((view: Destination) => void) | null>(null);
  const [indicatorSize, setIndicatorSize] = useState({ top: 0, width: 0, height: 0 });

  useEffect(() => {
    const bar = document.querySelector<HTMLElement>('.bottom');
    if (!bar) return;
    let animation: ReturnType<typeof animate> | undefined;
    let pageAnimation: ReturnType<typeof animate> | undefined;
    const moveTo = (view: string) => {
      const left = positions.current[destinations.indexOf(view as Destination)];
      if (left === undefined) return;
      animation?.stop();
      if (reducedMotion) indicatorX.set(left);
      else animation = animate(indicatorX, left, { type: 'tween', duration: 0.26, ease: [0.22, 0.61, 0.36, 1] });
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
      const finishingCommittedTransition = committingTarget === view;
      if (document.querySelector('main.viewSwipeStage') && !finishingCommittedTransition) clearContentDrag();
      setActive(view);
      if (!finishingCommittedTransition) moveTo(view);
    };
    type SwipeAxis = 'pending' | 'horizontal' | 'vertical';
    type SwipeStart = {
      id: number;
      x: number;
      y: number;
      at: number;
      view: Destination;
      bar: boolean;
      barOrigin: number;
      axis: SwipeAxis;
      offset: number;
      preview?: Destination;
    };
    let start: SwipeStart | null = null;
    let suppressClick = false;
    let clickTimer: number | undefined;
    let settleTimer: number | undefined;
    let settleTarget: Destination | null = null;
    let committingTarget: Destination | null = null;
    const blockedContentSelector = 'button,a,input,select,textarea,[role="button"],[contenteditable="true"],[tabindex],.nightStatusRow,.changesWorkflowTabs,.dateNav,.chatComposer,.chatConversationList';

    const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));
    const nearestPositionIndex = (value: number) => {
      let best = 0;
      let distance = Number.POSITIVE_INFINITY;
      positions.current.forEach((position, index) => {
        const nextDistance = Math.abs(position - value);
        if (nextDistance < distance) {
          best = index;
          distance = nextDistance;
        }
      });
      return best;
    };

    const clearContentDrag = () => {
      window.clearTimeout(settleTimer);
      settleTimer = undefined;
      pageAnimation?.stop();
      pageAnimation = undefined;
      settleTarget = null;
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

    const finishContentSettle = (immediate = false) => {
      const target = settleTarget;
      if (!target) {
        clearContentDrag();
        return;
      }
      window.clearTimeout(settleTimer);
      settleTimer = undefined;
      settleTarget = null;
      committingTarget = target;
      window.show?.(target);
      if (target === 'chat') window.openChatView?.();
      const complete = () => {
        clearContentDrag();
        committingTarget = null;
      };
      if (immediate || reducedMotion) complete();
      else requestAnimationFrame(() => requestAnimationFrame(complete));
    };

    const alignPreviewToCurrent = (current: HTMLElement, preview: HTMLElement) => {
      preview.style.left = '0px';
      preview.style.top = '0px';
      preview.style.removeProperty('transform');
      const currentRect = current.getBoundingClientRect();
      const width = Math.max(1, currentRect.width);
      preview.style.width = `${width}px`;
      const previewRect = preview.getBoundingClientRect();
      preview.style.left = `${currentRect.left - previewRect.left}px`;
      preview.style.top = `${currentRect.top - previewRect.top}px`;
      return width;
    };

    const setPageTrackOffset = (current: HTMLElement, preview: HTMLElement, offset: number, direction: number, width: number) => {
      current.style.transform = `translate3d(${offset}px,0,0)`;
      preview.style.transform = `translate3d(${offset + direction * width}px,0,0)`;
    };

    const animatePageTrack = (
      current: HTMLElement,
      preview: HTMLElement,
      from: number,
      to: number,
      direction: number,
      width: number,
      complete: () => void
    ) => {
      pageAnimation?.stop();
      setPageTrackOffset(current, preview, from, direction, width);
      pageAnimation = animate(from, to, {
        type: 'tween',
        duration: 0.26,
        ease: [0.22, 0.61, 0.36, 1],
        onUpdate: value => setPageTrackOffset(current, preview, value, direction, width),
        onComplete: () => {
          pageAnimation = undefined;
          complete();
        }
      });
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
      const changingPreview = first.preview !== next;
      if (first.preview && changingPreview) clearContentDrag();
      const direction = destinations.indexOf(next) - index;
      const newlyStaged = !preview.classList.contains('swipePreview');
      main.classList.add('viewSwipeStage');
      current.classList.add('swipeCurrent');
      preview.classList.add('swipePreview');
      preview.setAttribute('aria-hidden', 'true');
      preview.setAttribute('inert', '');
      const width = changingPreview || newlyStaged
        ? alignPreviewToCurrent(current, preview)
        : Math.max(1, current.getBoundingClientRect().width);
      const offset = clamp(dx, -width, width);
      setPageTrackOffset(current, preview, offset, direction, width);
      first.offset = offset;
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
      animatePageTrack(current, preview, first.offset, 0, direction, width, clearContentDrag);
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
      settleTarget = next;
      animatePageTrack(current, preview, first.offset, -direction * width, direction, width, () => finishContentSettle());
    };

    const animateViewChange = (target: Destination) => {
      if (settleTarget || document.querySelector('main.viewSwipeSettling')) finishContentSettle(true);
      const from = document.body.getAttribute('data-view') as Destination;
      if (!destinations.includes(from) || from === target) {
        moveTo(target);
        if (from !== target) {
          window.show?.(target);
          if (target === 'chat') window.openChatView?.();
        }
        return;
      }
      if (reducedMotion) {
        clearContentDrag();
        window.show?.(target);
        if (target === 'chat') window.openChatView?.();
        return;
      }
      const main = document.querySelector<HTMLElement>('main');
      const current = document.getElementById(from);
      const preview = document.getElementById(target);
      if (!main || !(current instanceof HTMLElement) || !(preview instanceof HTMLElement)) {
        window.show?.(target);
        if (target === 'chat') window.openChatView?.();
        return;
      }
      clearContentDrag();
      const direction = Math.sign(destinations.indexOf(target) - destinations.indexOf(from)) || 1;
      main.classList.add('viewSwipeStage');
      current.classList.add('swipeCurrent');
      preview.classList.add('swipePreview');
      preview.setAttribute('aria-hidden', 'true');
      preview.setAttribute('inert', '');
      const width = alignPreviewToCurrent(current, preview);
      setPageTrackOffset(current, preview, 0, direction, width);
      settleTarget = target;
      moveTo(target);
      main.classList.add('viewSwipeSettling');
      animatePageTrack(current, preview, 0, -direction * width, direction, width, () => finishContentSettle());
    };
    transitionToRef.current = animateViewChange;

    const lockAxis = (first: SwipeStart, dx: number, dy: number) => {
      if (first.axis !== 'pending') return first.axis;
      const ax = Math.abs(dx);
      const ay = Math.abs(dy);
      if (Math.max(ax, ay) < 10) return first.axis;
      if (first.bar) {
        if (ax >= ay * 0.72) first.axis = 'horizontal';
        else if (ay > ax * 1.35) first.axis = 'vertical';
      } else {
        if (ax > ay * 1.08) first.axis = 'horizontal';
        else if (ay > ax * 1.08) first.axis = 'vertical';
      }
      return first.axis;
    };

    const onStart = (event: TouchEvent) => {
      start = null;
      if (event.touches.length !== 1 || document.body.classList.contains('authPending') || document.querySelector('dialog[open]')) return;
      const touch = event.touches[0];
      if (settleTarget || document.querySelector('main.viewSwipeSettling')) finishContentSettle(true);
      const hitTarget = document.elementFromPoint(touch.clientX, touch.clientY);
      const target = hitTarget instanceof Element ? hitTarget : event.target;
      if (!(target instanceof Element)) return;
      const inBar = !!target.closest('.bottom');
      const view = document.body.getAttribute('data-view') as Destination;
      if (!destinations.includes(view) || (!inBar && !target.closest('main .view'))) return;
      if (!inBar && target.closest(blockedContentSelector)) return;
      if (!inBar && window.getSelection()?.type === 'Range') return;
      if (!inBar && (touch.clientX < 26 || touch.clientX > window.innerWidth - 26)) return;
      animation?.stop();
      pageAnimation?.stop();
      pageAnimation = undefined;
      clearContentDrag();
      const viewIndex = destinations.indexOf(view);
      const barOrigin = positions.current[viewIndex] ?? indicatorX.get();
      start = {
        id: touch.identifier,
        x: touch.clientX,
        y: touch.clientY,
        at: performance.now(),
        view,
        bar: inBar,
        barOrigin,
        axis: 'pending',
        offset: 0
      };
    };

    const onMove = (event: TouchEvent) => {
      if (!start || reducedMotion) return;
      const touch = Array.from(event.touches).find(item => item.identifier === start!.id);
      if (!touch) return;
      const dx = touch.clientX - start.x;
      const dy = touch.clientY - start.y;
      const axis = lockAxis(start, dx, dy);
      if (axis === 'vertical') {
        if (!start.bar) start = null;
        else moveTo(start.view);
        return;
      }
      if (axis !== 'horizontal') return;

      const index = destinations.indexOf(start.view);
      const origin = positions.current[index];
      if (start.bar) {
        const firstPosition = positions.current[0];
        const lastPosition = positions.current[positions.current.length - 1];
        if (firstPosition !== undefined && lastPosition !== undefined)
          indicatorX.set(clamp(start.barOrigin + dx, firstPosition, lastPosition));
        return;
      }

      const next = stageContentDrag(start, dx);
      if (!next || origin === undefined) {
        moveTo(start.view);
        return;
      }
      const neighbor = positions.current[destinations.indexOf(next)];
      const current = document.getElementById(start.view);
      const width = current instanceof HTMLElement ? Math.max(1, current.getBoundingClientRect().width) : Math.max(1, window.innerWidth);
      if (neighbor !== undefined)
        indicatorX.set(origin + (neighbor - origin) * Math.min(1, Math.abs(dx) / width));
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
      const axis = lockAxis(first, dx, dy);

      if (first.bar) {
        const firstPosition = positions.current[0];
        const lastPosition = positions.current[positions.current.length - 1];
        const draggedPosition = firstPosition !== undefined && lastPosition !== undefined
          ? clamp(first.barOrigin + dx, firstPosition, lastPosition)
          : first.barOrigin;
        const targetIndex = axis === 'horizontal' ? nearestPositionIndex(reducedMotion ? draggedPosition : indicatorX.get()) : destinations.indexOf(first.view);
        const target = destinations[targetIndex] || first.view;
        if (target === first.view) {
          moveTo(first.view);
          return;
        }
        suppressClick = true;
        window.clearTimeout(clickTimer);
        clickTimer = window.setTimeout(() => { suppressClick = false; }, 320);
        animateViewChange(target);
        return;
      }

      if (axis !== 'horizontal') {
        returnContentDrag(first);
        return;
      }
      const step = -Math.sign(dx);
      const next = destinations[destinations.indexOf(first.view) + step];
      const elapsed = Math.max(1, performance.now() - first.at);
      const distance = Math.abs(dx);
      const quickFlick = distance >= 30 && elapsed <= 280;
      if ((!quickFlick && distance < 52) || !next) {
        returnContentDrag(first);
        return;
      }
      suppressClick = true;
      window.clearTimeout(clickTimer);
      clickTimer = window.setTimeout(() => { suppressClick = false; }, 220);
      commitContentDrag(first, next);
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
      transitionToRef.current = null;
      clearContentDrag();
      observer.disconnect();
      animation?.stop();
      bar.classList.remove('reactTabs');
    };
  }, [indicatorX, reducedMotion]);

  function navigate(view: Destination) {
    const transition = transitionToRef.current;
    if (transition) transition(view);
    else {
      window.show?.(view);
      if (view === 'chat') window.openChatView?.();
    }
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
