import { createRoot, type Root } from 'react-dom/client';
import { useEffect, useRef, useState } from 'react';
import './night-intelligence-extensions.css';

type PersonContext = { label: string; source?: HTMLElement | null };
type ConflictContext = { message: string; at: number };
type NotificationMode = 'important' | 'all' | 'quiet';
type UndoRegistration = { label: string; expiresInMs?: number; undo: () => void | Promise<void> };

declare global {
  interface Window {
    show?: (view: string) => void;
    openChatView?: () => void;
    showQuickActions?: () => void;
    AnaestheticUndo?: { register: (item: UndoRegistration) => void };
  }
}

let extensionRoot: Root | null = null;
let conflictContext: ConflictContext | null = null;
let suppressQuickActionsUntil = 0;
let originalShowQuickActions: (() => void) | undefined;
let notificationMode: NotificationMode = 'important';
let preferenceUndoSuppressed = false;
const preferenceBefore = new WeakMap<HTMLSelectElement, string>();

const CONFLICT_PATTERN = /changed on another device|newer plan|revision conflict|latest version has been loaded|loaded for review|stale client/i;
const PERSON_SELECTOR = '.rolePerson,.allocationPerson,.rosterPerson,[data-person-name],#roles button,#cards button';
const NOTIFICATION_KEY = 'anaes_notification_mode_v46';

function openView(view: 'today' | 'changes' | 'chat') {
  window.show?.(view);
  if (view === 'chat') window.openChatView?.();
}

function cleanPerson(detail: any): PersonContext {
  const source = detail?.source instanceof HTMLElement ? detail.source : null;
  const direct = source?.getAttribute('data-person-name')
    || source?.querySelector<HTMLElement>('[data-person-name]')?.getAttribute('data-person-name')
    || source?.querySelector<HTMLElement>('.name,.roleName,.staffName,strong')?.textContent
    || detail?.label
    || 'Team member';
  const label = String(direct).replace(/\s+/g, ' ').replace(/\s+[·|—].*$/, '').trim().slice(0, 72) || 'Team member';
  return { label, source };
}

function currentChangesAttention() {
  const badge = document.getElementById('changesTaskBadge');
  if (!badge || badge.classList.contains('hidden')) return 0;
  const value = Number.parseInt(badge.textContent || '0', 10);
  return Number.isFinite(value) ? value : 1;
}

function updateContextAction() {
  const button = document.querySelector<HTMLElement>('[data-quick-rudder]');
  if (!button) return;
  const label = button.querySelector<HTMLElement>('.quickRudderLabel');
  const review = Boolean(conflictContext) || currentChangesAttention() > 0;
  button.dataset.niContext = review ? 'review' : 'actions';
  button.setAttribute('aria-label', review ? 'Review changes needing attention' : 'Quick actions');
  button.setAttribute('title', review ? 'Review changes' : 'Actions');
  if (label) label.textContent = review ? 'Review' : 'Actions';
}

function emitConflict(next: ConflictContext | null) {
  conflictContext = next;
  updateContextAction();
  window.dispatchEvent(new CustomEvent('roster:intelligence-conflict', { detail: next }));
}

function scanConflictMessages() {
  const nodes = document.querySelectorAll<HTMLElement>('.toast,[id$="FormMessage"],.disabledReason,.workflowGuidance');
  for (const node of Array.from(nodes)) {
    const message = node.textContent?.replace(/\s+/g, ' ').trim() || '';
    if (!message || !CONFLICT_PATTERN.test(message)) continue;
    if (conflictContext?.message === message && Date.now() - conflictContext.at < 30000) return;
    emitConflict({ message, at: Date.now() });
    return;
  }
}

function installConflictObserver() {
  let frame = 0;
  const queue = () => {
    if (frame) return;
    frame = requestAnimationFrame(() => { frame = 0; scanConflictMessages(); updateContextAction(); });
  };
  const observer = new MutationObserver(queue);
  observer.observe(document.body, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ['class'] });
  window.addEventListener('roster:recent-activity', queue);
  window.addEventListener('roster:viewchange', queue);
  queue();
}

function installContextAction() {
  document.addEventListener('click', event => {
    const button = (event.target as Element | null)?.closest<HTMLElement>('[data-quick-rudder]');
    if (!button || button.dataset.niContext !== 'review') return;
    event.preventDefault();
    event.stopImmediatePropagation();
    if (conflictContext) window.dispatchEvent(new CustomEvent('roster:intelligence-open-conflict'));
    else openView('changes');
    try { if ('vibrate' in navigator && !matchMedia('(prefers-reduced-motion: reduce)').matches) navigator.vibrate(7); } catch { /* optional */ }
  }, true);
}

function installQuickActionSuppression() {
  originalShowQuickActions = window.showQuickActions;
  if (!originalShowQuickActions) return;
  window.showQuickActions = () => {
    if (performance.now() < suppressQuickActionsUntil) return;
    originalShowQuickActions?.();
  };
}

function applyPushToggle(id: string, checked: boolean) {
  const input = document.getElementById(id) as HTMLInputElement | null;
  if (!input || input.disabled || input.checked === checked) return;
  input.click();
}

function applyNotificationMode(mode: NotificationMode) {
  notificationMode = mode;
  if (mode === 'all') {
    applyPushToggle('pushTeamToggle', true);
    applyPushToggle('pushPrivateToggle', true);
    applyPushToggle('pushMentionToggle', true);
    applyPushToggle('pushRosterToggle', true);
  } else if (mode === 'quiet') {
    applyPushToggle('pushTeamToggle', false);
    applyPushToggle('pushPrivateToggle', false);
    applyPushToggle('pushMentionToggle', true);
    applyPushToggle('pushRosterToggle', false);
  } else {
    applyPushToggle('pushTeamToggle', false);
    applyPushToggle('pushPrivateToggle', true);
    applyPushToggle('pushMentionToggle', true);
    applyPushToggle('pushRosterToggle', true);
  }
}

function installNotificationPresets() {
  try { notificationMode = (localStorage.getItem(NOTIFICATION_KEY) as NotificationMode) || 'important'; } catch { /* optional */ }
  window.addEventListener('roster:notification-mode', event => {
    const mode = (event as CustomEvent<{ mode?: NotificationMode }>).detail?.mode;
    if (mode === 'important' || mode === 'all' || mode === 'quiet') applyNotificationMode(mode);
  });
  const observer = new MutationObserver(() => {
    if (document.getElementById('pushMentionToggle')) applyNotificationMode(notificationMode);
  });
  observer.observe(document.body, { childList: true, subtree: true });
}

function setSelectValue(select: HTMLSelectElement, value: string) {
  const setter = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value')?.set;
  if (setter) setter.call(select, value); else select.value = value;
  select.dispatchEvent(new Event('change', { bubbles: true }));
}

function installSafePreferenceUndo() {
  document.addEventListener('focusin', event => {
    const select = (event.target as Element | null)?.closest<HTMLSelectElement>('.niPreferenceGroup select');
    if (select) preferenceBefore.set(select, select.value);
  });
  document.addEventListener('pointerdown', event => {
    const select = (event.target as Element | null)?.closest<HTMLSelectElement>('.niPreferenceGroup select');
    if (select) preferenceBefore.set(select, select.value);
  }, true);
  document.addEventListener('change', event => {
    const select = (event.target as Element | null)?.closest<HTMLSelectElement>('.niPreferenceGroup select');
    if (!select || preferenceUndoSuppressed) return;
    const before = preferenceBefore.get(select);
    const after = select.value;
    preferenceBefore.set(select, after);
    if (!before || before === after) return;
    const field = select.closest('label')?.childNodes[0]?.textContent?.trim() || 'Preference';
    window.AnaestheticUndo?.register({
      label: `${field} changed`,
      expiresInMs: 9000,
      undo: () => {
        preferenceUndoSuppressed = true;
        setSelectValue(select, before);
        preferenceBefore.set(select, before);
        preferenceUndoSuppressed = false;
      }
    });
  });
}

function copyText(value: string) {
  if (navigator.clipboard?.writeText) return navigator.clipboard.writeText(value);
  const area = document.createElement('textarea');
  area.value = value;
  area.style.position = 'fixed';
  area.style.opacity = '0';
  document.body.appendChild(area);
  area.select();
  document.execCommand('copy');
  area.remove();
  return Promise.resolve();
}

function PersonSheet({ person, onClose }: { person: PersonContext; onClose: () => void }) {
  const closeRef = useRef<HTMLButtonElement>(null);
  useEffect(() => { closeRef.current?.focus(); }, []);
  return <div className="niSheetScrim niExtensionScrim" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }}>
    <section className="niSheet niPersonSheet" role="dialog" aria-modal="true" aria-labelledby="niPersonTitle">
      <div className="niSheetHandle" aria-hidden="true" />
      <div className="niSheetHeader"><div><span>Team member</span><h2 id="niPersonTitle">{person.label}</h2></div><button ref={closeRef} type="button" onClick={onClose}>Done</button></div>
      <p className="niPersonMeta">Quick access only. Roster changes still use the existing guarded Changes workflow.</p>
      <div className="niSheetActionList">
        <button type="button" onClick={() => { onClose(); openView('today'); }}><span><strong>Review in Night</strong><small>See tonight’s current roster context</small></span><b aria-hidden="true">›</b></button>
        <button type="button" onClick={() => { onClose(); openView('changes'); }}><span><strong>Review staffing changes</strong><small>Use the protected change workflow</small></span><b aria-hidden="true">›</b></button>
        <button type="button" onClick={() => { onClose(); openView('chat'); requestAnimationFrame(() => document.getElementById('chatNewPrivateBtn')?.click()); }}><span><strong>Start a private chat</strong><small>Open the existing private-message picker</small></span><b aria-hidden="true">›</b></button>
        <button type="button" onClick={async () => { await copyText(person.label); onClose(); }}><span><strong>Copy name</strong><small>Copy this displayed roster identity</small></span><b aria-hidden="true">›</b></button>
      </div>
    </section>
  </div>;
}

function ConflictSheet({ conflict, onClose, onResolved }: { conflict: ConflictContext; onClose: () => void; onResolved: () => void }) {
  const primaryRef = useRef<HTMLButtonElement>(null);
  useEffect(() => { primaryRef.current?.focus(); }, []);
  return <div className="niSheetScrim niExtensionScrim" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }}>
    <section className="niSheet niConflictSheet" role="alertdialog" aria-modal="true" aria-labelledby="niConflictTitle" aria-describedby="niConflictDetail">
      <div className="niSheetHandle" aria-hidden="true" />
      <div className="niSheetHeader"><div><span>Protected conflict</span><h2 id="niConflictTitle">A newer roster won</h2></div><button type="button" onClick={onClose}>Later</button></div>
      <div className="niConflictCallout"><strong>No stale roster was forced over the shared version.</strong><p id="niConflictDetail">{conflict.message}</p><small>The app loaded the latest shared state. Review it before saving again.</small></div>
      <div className="niSheetActionList">
        <button ref={primaryRef} type="button" onClick={() => { openView('changes'); onResolved(); }}><span><strong>Review latest Changes</strong><small>Continue from the current shared version</small></span><b aria-hidden="true">›</b></button>
        <button type="button" onClick={() => { openView('today'); onResolved(); }}><span><strong>Review latest Night</strong><small>Check the current roster before acting</small></span><b aria-hidden="true">›</b></button>
      </div>
    </section>
  </div>;
}

function ExtensionRoot() {
  const [person, setPerson] = useState<PersonContext | null>(null);
  const [conflict, setConflict] = useState<ConflictContext | null>(conflictContext);
  const [conflictOpen, setConflictOpen] = useState(false);
  const [announcement, setAnnouncement] = useState('');

  useEffect(() => {
    const personHandler = (event: Event) => {
      suppressQuickActionsUntil = performance.now() + 180;
      const next = cleanPerson((event as CustomEvent).detail);
      setPerson(next);
      setAnnouncement(`Actions for ${next.label}`);
    };
    const conflictHandler = (event: Event) => {
      const next = (event as CustomEvent<ConflictContext | null>).detail;
      setConflict(next);
      if (next) { setConflictOpen(true); setAnnouncement('A newer shared roster was loaded for review'); }
    };
    const openConflict = () => { if (conflictContext) setConflictOpen(true); };
    const keyHandler = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { setPerson(null); setConflictOpen(false); }
      if ((event.key === 'ContextMenu' || (event.shiftKey && event.key === 'F10')) && event.target instanceof Element) {
        const hit = event.target.closest<HTMLElement>(PERSON_SELECTOR);
        if (hit) { event.preventDefault(); window.dispatchEvent(new CustomEvent('roster:person-actions', { detail: { label: hit.textContent || '', source: hit } })); }
      }
    };
    window.addEventListener('roster:person-actions', personHandler);
    window.addEventListener('roster:intelligence-conflict', conflictHandler);
    window.addEventListener('roster:intelligence-open-conflict', openConflict);
    window.addEventListener('keydown', keyHandler);
    return () => {
      window.removeEventListener('roster:person-actions', personHandler);
      window.removeEventListener('roster:intelligence-conflict', conflictHandler);
      window.removeEventListener('roster:intelligence-open-conflict', openConflict);
      window.removeEventListener('keydown', keyHandler);
    };
  }, []);

  const resolved = () => { emitConflict(null); setConflict(null); setConflictOpen(false); };
  return <>
    <div className="niA11yStatus" role="status" aria-live="polite" aria-atomic="true">{announcement}</div>
    {person ? <PersonSheet person={person} onClose={() => setPerson(null)} /> : null}
    {conflict && conflictOpen ? <ConflictSheet conflict={conflict} onClose={() => setConflictOpen(false)} onResolved={resolved} /> : null}
  </>;
}

export function mountNightIntelligenceExtensions() {
  let host = document.getElementById('nightIntelligenceExtensions');
  if (!host) {
    host = document.createElement('div');
    host.id = 'nightIntelligenceExtensions';
    document.body.appendChild(host);
  }
  if (!extensionRoot) extensionRoot = createRoot(host);
  extensionRoot.render(<ExtensionRoot />);
  installQuickActionSuppression();
  installConflictObserver();
  installContextAction();
  installNotificationPresets();
  installSafePreferenceUndo();
}
