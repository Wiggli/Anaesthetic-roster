import { motionIsReduced, productHaptic } from './product-motion';

type Member = { personKey: string; displayName: string; available: boolean };
let members: Member[] = [];
window.addEventListener('roster:chat-overview', event => { members = (event as CustomEvent).detail?.members || []; });

/** Dismissal reconnects the sheet with the Actions control; domain actions stay immediate. */
export function closeProductDialog(dialog: HTMLDialogElement) {
  if (!dialog.open || dialog.dataset.closing === 'true') return;
  if (motionIsReduced() || typeof dialog.animate !== 'function') { dialog.close(); return; }
  dialog.dataset.closing = 'true';
  const animation = dialog.animate([{ opacity: 1, transform: 'translateY(0) scale(1)' }, { opacity: 0, transform: 'translateY(16px) scale(.98)' }], { duration: 150, easing: 'cubic-bezier(.2,.8,.2,1)' });
  const finish = () => { delete dialog.dataset.closing; if (dialog.open) dialog.close(); animation.cancel(); };
  animation.finished.then(finish, finish);
}
(window as Window & { closeProductDialog?: typeof closeProductDialog }).closeProductDialog = closeProductDialog;

function setupActionsDismissal() {
  const dialog = document.getElementById('quickActionsSheet') as HTMLDialogElement | null;
  dialog?.addEventListener('cancel', event => { event.preventDefault(); closeProductDialog(dialog); });
  dialog?.addEventListener('click', event => {
    if (event.target !== dialog) return;
    const rect = dialog.getBoundingClientRect();
    if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) closeProductDialog(dialog);
  });
}

function openColleagueMenu(names: string) {
  if (document.body.classList.contains('authPending') || document.querySelector('dialog[open]')) return;
  const dialog = document.createElement('dialog');
  dialog.className = 'productColleagueMenu';
  const title = document.createElement('h2'); title.id = 'productColleagueTitle'; title.textContent = names;
  dialog.setAttribute('aria-labelledby', title.id); dialog.append(title);
  const add = (label: string, run: () => void) => {
    const button = document.createElement('button'); button.type = 'button'; button.textContent = label;
    button.addEventListener('click', run); dialog.append(button);
  };
  const colleagues = names.split(' + ').map(name => name.trim());
  const available = members.filter(member => member.available && colleagues.includes(member.displayName) && members.filter(candidate => candidate.displayName === member.displayName).length === 1);
  for (const member of available) add(`Message ${member.displayName}`, () => {
    dialog.close(); window.show?.('chat'); window.openChatView?.();
    window.dispatchEvent(new CustomEvent('roster:chat-action', { detail: { action: 'member', value: member.personKey } }));
  });
  add('View tonight’s allocation', () => {
    dialog.close(); window.show?.('today');
    document.querySelector<HTMLDetailsElement>('#today .nightTeamDetails')?.setAttribute('open', '');
    const row = Array.from(document.querySelectorAll<HTMLElement>('[data-colleague-names]')).find(node => node.dataset.colleagueNames === names);
    row?.scrollIntoView({ behavior: motionIsReduced() ? 'auto' : 'smooth', block: 'center' });
  });
  add('Copy name', () => {
    const copy = navigator.clipboard?.writeText(names) || Promise.reject(new Error('Clipboard unavailable'));
    copy.then(() => { dialog.close(); window.dispatchEvent(new CustomEvent('roster:product-notice', { detail: { message: 'Name copied' } })); }).catch(() => {
      title.textContent = 'Select the name to copy it';
      const text = document.createElement('p'); text.textContent = names; dialog.append(text);
    });
  });
  add('Done', () => dialog.close());
  dialog.addEventListener('close', () => dialog.remove(), { once: true });
  document.body.append(dialog); productHaptic(); dialog.showModal();
}

window.addEventListener('roster:colleague-shortcuts', event => {
  const names = (event as CustomEvent).detail?.names;
  if (typeof names === 'string' && names.trim()) openColleagueMenu(names);
});

// These are advanced shortcuts; each roster row also exposes an ordinary button.
let hold: { x: number; y: number; timer: number; pointer: number } | undefined;
let suppressClickUntil = 0;
function cancelHold() { if (hold) clearTimeout(hold.timer); hold = undefined; }
document.addEventListener('pointerdown', event => {
  const row = (event.target as Element)?.closest<HTMLElement>('.rosterRow[data-colleague-names]');
  if (!row || event.button !== 0 || document.querySelector('dialog[open]')) return;
  cancelHold();
  hold = { x: event.clientX, y: event.clientY, pointer: event.pointerId, timer: window.setTimeout(() => {
    suppressClickUntil = performance.now() + 800; openColleagueMenu(row.dataset.colleagueNames || ''); cancelHold();
  }, 520) };
}, { passive: true });
document.addEventListener('pointermove', event => { if (hold && (Math.abs(event.clientX - hold.x) > 8 || Math.abs(event.clientY - hold.y) > 8)) cancelHold(); }, { passive: true });
for (const name of ['pointerup', 'pointercancel', 'visibilitychange']) document.addEventListener(name, cancelHold, { passive: true });
document.addEventListener('click', event => {
  if (performance.now() < suppressClickUntil && (event.target as Element)?.closest('.rosterRow')) {
    event.preventDefault(); event.stopImmediatePropagation(); suppressClickUntil = 0;
  }
}, true);

function setupRefresh() {
  let drag: { x: number; y: number; distance: number; locked: boolean } | undefined;
  let refreshing = false;
  let finishTimer = 0;
  let hideTimer = 0;
  let indicator: HTMLElement | undefined;
  const standalone = () => window.matchMedia('(display-mode: standalone)').matches || Boolean((navigator as Navigator & { standalone?: boolean }).standalone);
  const paint = (state: string, label: string, distance = 0) => {
    if (!indicator) {
      indicator = document.createElement('div'); indicator.className = 'productRefreshIndicator'; indicator.setAttribute('role', 'status');
      indicator.append(document.createElement('span'), document.createElement('b')); document.body.append(indicator);
    }
    indicator.hidden = false; indicator.dataset.state = state;
    indicator.firstElementChild!.textContent = state === 'complete' ? '✓' : state === 'problem' ? '!' : '✦';
    indicator.lastElementChild!.textContent = label;
    indicator.style.transform = `translate(-50%,${Math.min(distance / 2, 32)}px)`;
  };
  const hide = () => { if (indicator) indicator.hidden = true; drag = undefined; };
  document.addEventListener('touchstart', event => {
    drag = undefined;
    if (!standalone() || refreshing || event.touches.length !== 1 || scrollY > 0 || document.body.classList.contains('authPending') || document.querySelector('dialog[open]') || document.body.classList.contains('keyboardVisible')) return;
    const target = event.target as Element;
    if (!target.closest('main > .view:not(.hidden)') || target.closest('button,input,textarea,select,summary,a,[role="button"],.chatMessages,.chatTeamMessages')) return;
    clearTimeout(hideTimer);
    const touch = event.touches[0]; drag = { x: touch.clientX, y: touch.clientY, distance: 0, locked: false };
  }, { passive: true });
  document.addEventListener('touchmove', event => {
    if (!drag || event.touches.length !== 1) return;
    const touch = event.touches[0], dy = touch.clientY - drag.y, dx = touch.clientX - drag.x;
    if (!drag.locked && Math.max(Math.abs(dx), Math.abs(dy)) > 10) {
      if (dy <= 0 || dy < Math.abs(dx) * 1.4) { hide(); return; }
      drag.locked = true;
    }
    if (!drag.locked) return;
    if (event.cancelable) event.preventDefault();
    drag.distance = Math.max(0,dy);
    paint('pull', dy >= 80 ? 'Release to refresh' : 'Pull to refresh', dy);
  }, { passive: false });
  document.addEventListener('touchend', () => {
    const ready = drag?.locked && drag.distance >= 80;
    if (!ready) { hide(); return; }
    drag = undefined; refreshing = true; paint('refreshing', 'Updating…'); productHaptic();
    finishTimer = window.setTimeout(() => finish(false), 20000);
    window.dispatchEvent(new CustomEvent('roster:product-refresh'));
  }, { passive: true });
  document.addEventListener('touchcancel', hide, { passive: true });
  function finish(ok: boolean) {
    if (!refreshing) return;
    clearTimeout(finishTimer); refreshing = false;
    if (document.body.classList.contains('authPending')) { hide(); return; }
    paint(ok ? 'complete' : 'problem', ok ? 'Up to date' : 'Could not refresh, existing plan retained');
    if (ok) productHaptic('success');
    hideTimer = window.setTimeout(hide, ok ? 900 : 2400);
  }
  window.addEventListener('roster:product-refreshed', event => finish(Boolean((event as CustomEvent).detail?.ok)));
  document.addEventListener('visibilitychange', () => { cancelHold(); if (!refreshing) hide(); });
}

setupActionsDismissal();
setupRefresh();
