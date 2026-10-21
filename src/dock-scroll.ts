type DockScrollState = { y: number; travel: number; hidden: boolean };

/** Direction hysteresis ignores small scroll jitter and iOS edge bounce. */
export function nextDockScroll(state: DockScrollState, position: number, maximum: number, pinned: boolean): DockScrollState {
  const y = Math.max(0, Math.min(position, Math.max(0, maximum)));
  if (pinned || y <= 128 || maximum - y <= 24) return { y, travel: 0, hidden: false };
  const delta = y - state.y;
  if (delta === 0) return { ...state, y };
  const travel = delta > 0 ? Math.min(64, Math.max(0, state.travel) + delta) : Math.max(-64, Math.min(0, state.travel) + delta);
  const hidden = travel >= 24 ? true : travel <= -8 ? false : state.hidden;
  return { y, travel: hidden !== state.hidden ? 0 : travel, hidden };
}

export function setupDockScroll() {
  const dock = document.querySelector<HTMLElement>('.bottom');
  if (!dock) return;
  const mobile = window.matchMedia('(max-width: 1023px)');
  let state: DockScrollState = { y: window.scrollY, travel: 0, hidden: false };
  let frame = 0;
  let touchingDock = false;
  const reveal = () => {
    state = { y: window.scrollY, travel: 0, hidden: false };
    dock.classList.remove('dockScrollHidden');
  };
  const update = () => {
    frame = 0;
    const active = document.activeElement;
    const pinned = !mobile.matches || touchingDock || document.body.dataset.view === 'chat'
      || document.body.classList.contains('authPending') || dock.classList.contains('actionsOpen')
      || Boolean(document.querySelector('dialog[open]')) || Boolean(dock.querySelector(':focus-visible'))
      || Boolean(active?.matches('input,textarea,select,[contenteditable="true"]'));
    state = nextDockScroll(state, window.scrollY, document.documentElement.scrollHeight - window.innerHeight, pinned);
    dock.classList.toggle('dockScrollHidden', state.hidden);
  };
  window.addEventListener('scroll', () => { if (!frame) frame = requestAnimationFrame(update); }, { passive: true });
  window.addEventListener('resize', reveal, { passive: true });
  document.addEventListener('visibilitychange', reveal);
  // Keep the navigation available to keyboard and assistive-technology focus.
  document.addEventListener('focusin', reveal);
  document.addEventListener('keydown', event => { if (event.key === 'Tab') reveal(); });
  dock.addEventListener('pointerdown', () => { touchingDock = true; reveal(); }, { passive: true });
  for (const event of ['pointerup', 'pointercancel']) window.addEventListener(event, () => { touchingDock = false; }, { passive: true });
  new MutationObserver(reveal).observe(document.body, { attributes: true, attributeFilter: ['data-view'] });
}
