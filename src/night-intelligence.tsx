import { createRoot, type Root } from 'react-dom/client';
import { useEffect, useMemo, useState } from 'react';
import './night-intelligence.css';

type PersonalNight = {
  date?: string;
  displayName?: string;
  jobTitle?: string;
  title?: string;
  detail?: string;
  breakLabel?: string;
  context?: string;
  liveStatus?: string;
  pending?: boolean;
  changed?: boolean;
};

type ActivityItem = { label?: string; type?: string; title?: string; detail?: string; meta?: string };
type ActivityModel = { updated?: boolean; updatedCount?: number; sinceLabel?: string; items?: ActivityItem[] };
type ShiftModel = { name?: string; tagline?: string; accentKey?: string; symbol?: string; initials?: string; photoUrl?: string; updatedBy?: string };
type AccountModel = { version?: string; shift?: ShiftModel; profile?: { name?: string; jobTitle?: string; photoUrl?: string } };
type Density = 'automatic' | 'comfortable' | 'compact';
type CalmPreference = 'automatic' | 'on' | 'off';
type NotificationMode = 'important' | 'all' | 'quiet';
type HealthRow = { label: string; value: string; tone?: 'good' | 'warn' | 'bad'; help?: string };

type IntelligenceSnapshot = {
  personal: PersonalNight | null;
  activity: ActivityModel | null;
  account: AccountModel | null;
  sync: string;
  online: boolean;
  presence: number;
};

declare global {
  interface Window {
    AnaestheticRuntime?: any;
    AnaestheticUndo?: { register: (item: UndoRegistration) => void };
    supa?: any;
    currentUser?: { id?: string } | null;
    show?: (view: string) => void;
    openChatView?: () => void;
    showQuickActions?: () => void;
  }
}

type UndoRegistration = {
  id?: string;
  label: string;
  expiresInMs?: number;
  undo: () => void | Promise<void>;
};

const DENSITY_KEY = 'anaes_density_pref_v46';
const CALM_KEY = 'anaes_calm_pref_v46';
const NOTIFICATION_MODE_KEY = 'anaes_notification_mode_v46';
const HEALTH_LAST_KEY = 'anaes_health_last_v46';
let root: Root | undefined;
let host: HTMLElement | null = null;
let personal: PersonalNight | null = null;
let activity: ActivityModel | null = null;
let account: AccountModel | null = null;
let syncState = 'starting';
let presenceCount = 0;
let presenceChannel: any = null;
let presenceDate = '';
let listeners = new Set<() => void>();
let undoListeners = new Set<(item: UndoRegistration | null) => void>();

function readPref<T extends string>(key: string, fallback: T): T {
  try { return (localStorage.getItem(key) as T) || fallback; } catch { return fallback; }
}

function writePref(key: string, value: string) {
  try { localStorage.setItem(key, value); } catch { /* optional preference */ }
}

function emit() { listeners.forEach(listener => listener()); }
function subscribe(listener: () => void) { listeners.add(listener); return () => listeners.delete(listener); }
function snapshot(): IntelligenceSnapshot { return { personal, activity, account, sync: syncState, online: navigator.onLine, presence: presenceCount }; }

function currentPhase() {
  const hour = new Date().getHours();
  if (hour >= 18 && hour < 22) return { key: 'early', label: 'Early night', detail: 'Settle into the shift' };
  if (hour >= 22 || hour < 1) return { key: 'late', label: 'Late night', detail: 'Keep the essentials close' };
  if (hour >= 1 && hour < 5) return { key: 'deep', label: 'Deep night', detail: 'Calm mode prioritises what matters' };
  if (hour >= 5 && hour < 8) return { key: 'handover', label: 'Handover', detail: 'Finish the night with a clear picture' };
  return { key: 'day', label: 'Next night', detail: 'Review the plan before duty' };
}

function calmShouldApply(pref: CalmPreference) {
  if (pref === 'on') return true;
  if (pref === 'off') return false;
  const hour = new Date().getHours();
  return hour >= 1 && hour < 5;
}

function applyDisplayPreferences(density: Density, calm: CalmPreference) {
  document.documentElement.dataset.density = density;
  document.body.classList.toggle('nightCalmMode', calmShouldApply(calm));
}

function safeText(selector: string, fallback = '') {
  return document.querySelector<HTMLElement>(selector)?.textContent?.trim() || fallback;
}

function unreadChatCount() {
  let total = 0;
  document.querySelectorAll<HTMLElement>('#chatTeamUnread,.chatConversationBadge').forEach(node => {
    if (node.classList.contains('hidden')) return;
    const value = Number.parseInt(node.textContent || '0', 10);
    total += Number.isFinite(value) ? value : 0;
  });
  return total;
}

function attentionCount(data: IntelligenceSnapshot) {
  const activityCount = data.activity?.updatedCount || (data.activity?.updated ? 1 : 0);
  const chat = unreadChatCount();
  const sync = !data.online || ['offline', 'error', 'stale', 'reconnecting'].includes(data.sync) ? 1 : 0;
  const pending = data.personal?.pending ? 1 : 0;
  return activityCount + chat + sync + pending;
}

function openView(view: 'today' | 'changes' | 'breaks' | 'chat') {
  window.show?.(view);
  if (view === 'chat') window.openChatView?.();
}

function openQuickAction(action: 'absence' | 'overtime' | 'review' | 'private-chat' | 'share') {
  window.dispatchEvent(new CustomEvent('roster:quick-action', { detail: { action } }));
}

function symbolGlyph(symbol?: string) {
  return ({ spark: '✦', moon: '☾', cross: '✚', diamond: '◆', dot: '●', star: '★' } as Record<string, string>)[symbol || ''] || '✦';
}

function serviceWorkerState() {
  if (!('serviceWorker' in navigator)) return 'Unavailable';
  if (!navigator.serviceWorker.controller) return 'Not controlling this page';
  return 'Active';
}

function standaloneState() {
  const standalone = window.matchMedia?.('(display-mode: standalone)').matches || (navigator as any).standalone === true;
  return standalone ? 'Installed app' : 'Browser';
}

function notificationState() {
  if (!('Notification' in window)) return 'Unavailable';
  return Notification.permission === 'granted' ? 'Allowed' : Notification.permission === 'denied' ? 'Blocked' : 'Not enabled';
}

async function healthRows(data: IntelligenceSnapshot): Promise<HealthRow[]> {
  let waiting = false;
  let registration: ServiceWorkerRegistration | undefined;
  try { registration = await navigator.serviceWorker?.getRegistration(); waiting = Boolean(registration?.waiting); } catch { /* diagnostic only */ }
  const runtime = window.AnaestheticRuntime;
  const recovery = runtime?.recovery?.status?.() || runtime?.recoveryStatus?.() || null;
  const rows: HealthRow[] = [
    { label: 'Connection', value: data.online ? 'Online' : 'Offline', tone: data.online ? 'good' : 'warn', help: data.online ? 'Shared data can refresh normally.' : 'Showing the last safe read-only state until connection returns.' },
    { label: 'Live sync', value: data.sync || 'Starting', tone: data.sync === 'live' ? 'good' : data.sync === 'error' ? 'bad' : 'warn' },
    { label: 'App mode', value: standaloneState(), tone: 'good', help: standaloneState() === 'Browser' && /iPhone|iPad|iPod/i.test(navigator.userAgent) ? 'On iPhone, add Night Roster to the Home Screen for the full PWA experience.' : undefined },
    { label: 'Service worker', value: waiting ? 'Update ready' : serviceWorkerState(), tone: serviceWorkerState() === 'Active' ? 'good' : 'warn', help: waiting ? 'Close and reopen the app when convenient to activate the waiting update.' : undefined },
    { label: 'Notifications', value: notificationState(), tone: notificationState() === 'Blocked' ? 'warn' : 'good', help: notificationState() === 'Blocked' ? 'Allow Night Roster notifications in the phone or browser settings if you want alerts.' : undefined },
    { label: 'Recovery mode', value: recovery?.safeMode ? 'Safe mode' : 'Normal', tone: recovery?.safeMode ? 'warn' : 'good', help: recovery?.safeMode ? 'The app detected repeated launch trouble and reduced optional features temporarily.' : undefined },
    { label: 'Version', value: data.account?.version || safeText('[data-app-version]', 'Current build'), tone: 'good' }
  ];
  try { localStorage.setItem(HEALTH_LAST_KEY, new Date().toISOString()); } catch { /* optional */ }
  return rows;
}

async function setupPresence(date?: string) {
  const client = window.supa;
  const user = window.currentUser;
  const nextDate = String(date || '');
  if (!client?.channel || !user?.id || !nextDate || nextDate === presenceDate) return;
  if (presenceChannel) {
    try { await presenceChannel.untrack(); await client.removeChannel(presenceChannel); } catch { /* optional enhancement */ }
  }
  presenceDate = nextDate;
  presenceCount = 0;
  const channel = client.channel(`night-presence:${nextDate}`, { config: { presence: { key: user.id } } });
  presenceChannel = channel;
  const refresh = () => {
    try {
      const state = channel.presenceState() || {};
      presenceCount = Math.max(0, Object.keys(state).filter(key => key !== user.id).length);
      emit();
    } catch { /* presence never blocks core roster */ }
  };
  channel.on('presence', { event: 'sync' }, refresh);
  channel.subscribe(async (status: string) => {
    if (status !== 'SUBSCRIBED') return;
    try { await channel.track({ night: nextDate, visible: document.visibilityState === 'visible' }); refresh(); } catch { /* optional */ }
  });
}

function installPresenceVisibility() {
  document.addEventListener('visibilitychange', () => {
    if (!presenceChannel) return;
    try { presenceChannel.track({ night: presenceDate, visible: document.visibilityState === 'visible' }); } catch { /* optional */ }
  });
}

function installUndoRegistry() {
  window.AnaestheticUndo = {
    register(item: UndoRegistration) {
      const safeItem = { ...item, id: item.id || `undo-${Date.now()}`, expiresInMs: Math.min(Math.max(item.expiresInMs || 8000, 3000), 15000) };
      undoListeners.forEach(listener => listener(safeItem));
    }
  };
  window.addEventListener('roster:undo-available', (event: Event) => {
    const detail = (event as CustomEvent<UndoRegistration>).detail;
    if (detail?.label && typeof detail.undo === 'function') window.AnaestheticUndo?.register(detail);
  });
}

function useSnapshot() {
  const [data, setData] = useState(snapshot());
  useEffect(() => subscribe(() => setData(snapshot())), []);
  return data;
}

function UndoToast() {
  const [item, setItem] = useState<UndoRegistration | null>(null);
  useEffect(() => {
    const listener = (next: UndoRegistration | null) => setItem(next);
    undoListeners.add(listener);
    return () => { undoListeners.delete(listener); };
  }, []);
  useEffect(() => {
    if (!item) return;
    const timer = window.setTimeout(() => setItem(null), item.expiresInMs || 8000);
    return () => window.clearTimeout(timer);
  }, [item]);
  if (!item) return null;
  return <div className="niUndoToast" role="status" aria-live="polite"><span>{item.label}</span><button type="button" onClick={async () => { const current = item; setItem(null); await current.undo(); }}>Undo</button></div>;
}

function AttentionInbox({ data, onClose }: { data: IntelligenceSnapshot; onClose: () => void }) {
  const items: { title: string; detail: string; action?: () => void }[] = [];
  if (!data.online) items.push({ title: 'You are offline', detail: 'Roster information is read-only until connection returns.' });
  else if (data.sync !== 'live') items.push({ title: 'Sync is ' + data.sync, detail: 'The app is protecting you from acting on stale shared data.' });
  if (data.personal?.pending) items.push({ title: 'Your allocation needs attention', detail: data.personal.detail || 'Review tonight’s allocation.', action: () => openView('changes') });
  const changed = data.activity?.updatedCount || (data.activity?.updated ? 1 : 0);
  if (changed) items.push({ title: `${changed} change${changed === 1 ? '' : 's'} since you last looked`, detail: data.activity?.sinceLabel ? `Since ${data.activity.sinceLabel}` : 'Review tonight’s activity.', action: () => openView('today') });
  const unread = unreadChatCount();
  if (unread) items.push({ title: `${unread} unread message${unread === 1 ? '' : 's'}`, detail: 'Open Chat to catch up.', action: () => openView('chat') });
  return <div className="niSheetScrim" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }}>
    <section className="niSheet" role="dialog" aria-modal="true" aria-labelledby="niInboxTitle">
      <div className="niSheetHandle" aria-hidden="true" />
      <div className="niSheetHeader"><div><span>Attention</span><h2 id="niInboxTitle">What needs you</h2></div><button type="button" onClick={onClose} aria-label="Close attention inbox">Done</button></div>
      <div className="niInboxList">
        {items.length ? items.map((item, index) => <button key={index} type="button" className="niInboxRow" onClick={() => { item.action?.(); if (item.action) onClose(); }} disabled={!item.action}>
          <span><strong>{item.title}</strong><small>{item.detail}</small></span>{item.action ? <b aria-hidden="true">›</b> : null}
        </button>) : <div className="niInboxEmpty"><strong>Nothing needs attention</strong><span>Your night is up to date.</span></div>}
      </div>
    </section>
  </div>;
}

function ShiftProfile({ data, onClose }: { data: IntelligenceSnapshot; onClose: () => void }) {
  const shift = data.account?.shift;
  const name = shift?.name || safeText('[data-night-team-identity]', 'Anaesthetic Team');
  return <div className="niSheetScrim" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }}>
    <section className="niSheet niShiftSheet" role="dialog" aria-modal="true" aria-labelledby="niShiftTitle">
      <div className="niSheetHandle" aria-hidden="true" />
      <div className="niSheetHeader"><div><span>Shift profile</span><h2 id="niShiftTitle">Our shift</h2></div><button type="button" onClick={onClose}>Done</button></div>
      <div className="niShiftHero">
        <span className="niShiftAvatar">{shift?.photoUrl ? <img src={shift.photoUrl} alt="" /> : symbolGlyph(shift?.symbol)}</span>
        <div><strong>{name}</strong><span>{shift?.tagline || 'Anaesthetic Night Roster team'}</span></div>
      </div>
      <div className="niShiftStats"><span><b>{safeText('#modeStatus', 'Tonight')}</b><small>staffing</small></span><span><b>{data.presence}</b><small>other teammate{data.presence === 1 ? '' : 's'} here now</small></span></div>
      <p className="niPrivacyNote">Presence is an aggregate live count only. Names, locations and activity histories are not exposed.</p>
      {shift?.updatedBy ? <p className="niShiftUpdated">Identity last updated by {shift.updatedBy}.</p> : null}
    </section>
  </div>;
}

function HealthSheet({ data, onClose }: { data: IntelligenceSnapshot; onClose: () => void }) {
  const [rows, setRows] = useState<HealthRow[]>([]);
  useEffect(() => { healthRows(data).then(setRows); }, [data.online, data.sync, data.account?.version]);
  return <div className="niSheetScrim" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }}>
    <section className="niSheet" role="dialog" aria-modal="true" aria-labelledby="niHealthTitle">
      <div className="niSheetHandle" aria-hidden="true" />
      <div className="niSheetHeader"><div><span>Diagnostics</span><h2 id="niHealthTitle">App health</h2></div><button type="button" onClick={onClose}>Done</button></div>
      <div className="niHealthList">{rows.map(row => <div key={row.label} className={`niHealthRow ${row.tone || ''}`}><i aria-hidden="true" /><span><strong>{row.label}</strong>{row.help ? <small>{row.help}</small> : null}</span><b>{row.value}</b></div>)}</div>
      <button type="button" className="niHealthRefresh" onClick={() => healthRows(snapshot()).then(setRows)}>Run checks again</button>
    </section>
  </div>;
}

function CommandPalette({ onClose, onHealth, onShift }: { onClose: () => void; onHealth: () => void; onShift: () => void }) {
  const [query, setQuery] = useState('');
  const commands = useMemo(() => [
    { label: 'Open Night', keywords: 'today roster allocation', run: () => openView('today') },
    { label: 'Open Changes', keywords: 'staffing absence overtime allocation', run: () => openView('changes') },
    { label: 'Open Breaks', keywords: 'rest break plan', run: () => openView('breaks') },
    { label: 'Open Chat', keywords: 'messages team private', run: () => openView('chat') },
    { label: 'Report an absence', keywords: 'leave sickness', run: () => openQuickAction('absence') },
    { label: 'Add overtime cover', keywords: 'overtime extra nurse', run: () => openQuickAction('overtime') },
    { label: 'Review changes', keywords: 'attention activity', run: () => openQuickAction('review') },
    { label: 'Our shift', keywords: 'team identity profile', run: onShift },
    { label: 'App health', keywords: 'diagnostics update offline notifications', run: onHealth }
  ], [onHealth, onShift]);
  const needle = query.trim().toLowerCase();
  const filtered = commands.filter(command => !needle || `${command.label} ${command.keywords}`.toLowerCase().includes(needle));
  return <div className="niPaletteScrim" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }}>
    <section className="niPalette" role="dialog" aria-modal="true" aria-label="Search Night Roster">
      <div className="niPaletteSearch"><span aria-hidden="true">⌕</span><input autoFocus value={query} onChange={event => setQuery(event.target.value)} placeholder="Search or jump to…" aria-label="Search commands" /><button type="button" onClick={onClose}>Cancel</button></div>
      <div className="niPaletteResults">{filtered.map(command => <button key={command.label} type="button" onClick={() => { onClose(); command.run(); }}><span>{command.label}</span><b aria-hidden="true">›</b></button>)}{!filtered.length ? <p>No matching actions</p> : null}</div>
      <small className="niPaletteHint">Search navigates and opens existing guarded workflows. It never bypasses roster checks.</small>
    </section>
  </div>;
}

function PreferencesPanel({ density, setDensity, calm, setCalm, notificationMode, setNotificationMode }: {
  density: Density; setDensity: (value: Density) => void;
  calm: CalmPreference; setCalm: (value: CalmPreference) => void;
  notificationMode: NotificationMode; setNotificationMode: (value: NotificationMode) => void;
}) {
  return <details className="niPreferences">
    <summary><span><strong>View preferences</strong><small>Density, calm mode and alerts</small></span><b aria-hidden="true">›</b></summary>
    <div className="niPreferenceGroup">
      <label>Information density<select value={density} onChange={event => setDensity(event.target.value as Density)}><option value="automatic">Automatic</option><option value="comfortable">Comfortable</option><option value="compact">Compact</option></select></label>
      <label>Calm mode<select value={calm} onChange={event => setCalm(event.target.value as CalmPreference)}><option value="automatic">Automatic overnight</option><option value="on">Always on</option><option value="off">Off</option></select></label>
      <label>Notification focus<select value={notificationMode} onChange={event => setNotificationMode(event.target.value as NotificationMode)}><option value="important">Important only</option><option value="all">Everything tonight</option><option value="quiet">Quiet except mentions</option></select></label>
    </div>
  </details>;
}

function CommandCentre() {
  const data = useSnapshot();
  const [inbox, setInbox] = useState(false);
  const [palette, setPalette] = useState(false);
  const [health, setHealth] = useState(false);
  const [shift, setShift] = useState(false);
  const [density, setDensityState] = useState<Density>(() => readPref(DENSITY_KEY, 'automatic'));
  const [calm, setCalmState] = useState<CalmPreference>(() => readPref(CALM_KEY, 'automatic'));
  const [notificationMode, setNotificationModeState] = useState<NotificationMode>(() => readPref(NOTIFICATION_MODE_KEY, 'important'));
  const phase = currentPhase();
  const attention = attentionCount(data);
  const staffing = safeText('#modeStatus', 'Tonight');
  const syncLabel = !data.online ? 'Offline · read only' : data.sync === 'live' ? 'Live' : data.sync === 'starting' ? 'Connecting' : data.sync;
  const changed = data.activity?.updatedCount || 0;

  const setDensity = (value: Density) => { setDensityState(value); writePref(DENSITY_KEY, value); applyDisplayPreferences(value, calm); };
  const setCalm = (value: CalmPreference) => { setCalmState(value); writePref(CALM_KEY, value); applyDisplayPreferences(density, value); };
  const setNotificationMode = (value: NotificationMode) => {
    setNotificationModeState(value); writePref(NOTIFICATION_MODE_KEY, value);
    window.dispatchEvent(new CustomEvent('roster:notification-mode', { detail: { mode: value } }));
  };

  useEffect(() => {
    applyDisplayPreferences(density, calm);
    const timer = window.setInterval(() => applyDisplayPreferences(density, calm), 60000);
    return () => window.clearInterval(timer);
  }, [density, calm]);

  useEffect(() => {
    const key = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') { event.preventDefault(); setPalette(true); }
      if (event.key === 'Escape') { setPalette(false); setInbox(false); setHealth(false); setShift(false); }
    };
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  }, []);

  return <>
    <section className={`niCommandCentre niPhase-${phase.key}`} aria-labelledby="niCommandTitle">
      <div className="niTopline"><span><i aria-hidden="true" />{syncLabel}</span><button type="button" onClick={() => setPalette(true)} aria-label="Search Night Roster">⌕</button></div>
      <div className="niHeroLine">
        <div><span>{phase.label}</span><h2 id="niCommandTitle">{data.personal?.displayName ? `${data.personal.displayName} · your night` : 'Night command centre'}</h2><p>{data.personal?.title || phase.detail}</p></div>
        {attention ? <button type="button" className="niAttentionButton" onClick={() => setInbox(true)}><b>{attention}</b><span>need attention</span></button> : <span className="niAllClear"><b>✓</b><span>Up to date</span></span>}
      </div>
      <div className="niVitals" aria-label="Night overview">
        <button type="button" onClick={() => openView('today')}><span>Staffing</span><strong>{staffing}</strong></button>
        <button type="button" onClick={() => openView('breaks')}><span>Your break</span><strong>{data.personal?.breakLabel || 'See plan'}</strong></button>
        <button type="button" onClick={() => setInbox(true)}><span>Changes</span><strong>{changed ? `${changed} new` : 'None new'}</strong></button>
        <button type="button" onClick={() => setShift(true)}><span>Team here</span><strong>{data.presence ? `${data.presence} other${data.presence === 1 ? '' : 's'}` : 'Just you'}</strong></button>
      </div>
      <div className="niActions">
        <button type="button" onClick={() => setInbox(true)}>Attention inbox</button>
        <button type="button" onClick={() => setShift(true)}>Our shift</button>
        <button type="button" onClick={() => setHealth(true)}>App health</button>
      </div>
      <PreferencesPanel density={density} setDensity={setDensity} calm={calm} setCalm={setCalm} notificationMode={notificationMode} setNotificationMode={setNotificationMode} />
    </section>
    {inbox ? <AttentionInbox data={data} onClose={() => setInbox(false)} /> : null}
    {shift ? <ShiftProfile data={data} onClose={() => setShift(false)} /> : null}
    {health ? <HealthSheet data={data} onClose={() => setHealth(false)} /> : null}
    {palette ? <CommandPalette onClose={() => setPalette(false)} onHealth={() => { setPalette(false); setHealth(true); }} onShift={() => { setPalette(false); setShift(true); }} /> : null}
    <UndoToast />
  </>;
}

function ensureHost() {
  if (host?.isConnected) return host;
  const anchor = document.getElementById('personalNight');
  const panel = anchor?.parentElement;
  if (!anchor || !panel) return null;
  host = document.getElementById('nightIntelligenceRoot') as HTMLElement | null;
  if (!host) {
    host = document.createElement('div');
    host.id = 'nightIntelligenceRoot';
    host.className = 'nightIntelligenceRoot';
    panel.insertBefore(host, anchor);
  }
  return host;
}

function mount() {
  const target = ensureHost();
  if (!target) return;
  if (!root) root = createRoot(target);
  root.render(<CommandCentre />);
}

function bindRuntime() {
  const runtime = window.AnaestheticRuntime;
  if (runtime?.state?.sync) {
    syncState = runtime.state.sync.value || syncState;
    runtime.state.sync.on?.((next: string) => { syncState = next; emit(); });
  }
  window.addEventListener('online', emit);
  window.addEventListener('offline', emit);
}

function bindModels() {
  window.addEventListener('roster:personal-night', (event: Event) => {
    personal = (event as CustomEvent<PersonalNight>).detail || null;
    setupPresence(personal?.date);
    mount(); emit();
  });
  window.addEventListener('roster:recent-activity', (event: Event) => { activity = (event as CustomEvent<ActivityModel>).detail || null; mount(); emit(); });
  window.addEventListener('roster:account', (event: Event) => { account = (event as CustomEvent<AccountModel>).detail || null; emit(); });
  window.addEventListener('roster:viewchange', () => { mount(); emit(); });
}

function installLongPressActions() {
  let timer = 0;
  let target: HTMLElement | null = null;
  const eligible = '.rolePerson,.allocationPerson,.rosterPerson,[data-person-name],#roles button,#cards button';
  const start = (event: PointerEvent) => {
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    const hit = (event.target as Element | null)?.closest<HTMLElement>(eligible);
    if (!hit || hit.closest('input,select,textarea')) return;
    target = hit;
    timer = window.setTimeout(() => {
      const label = target?.getAttribute('data-person-name') || target?.textContent?.trim().replace(/\s+/g, ' ').slice(0, 80) || 'Team member';
      window.dispatchEvent(new CustomEvent('roster:person-actions', { detail: { label, source: target } }));
      window.showQuickActions?.();
      if ('vibrate' in navigator && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) navigator.vibrate(8);
      timer = 0;
    }, 520);
  };
  const clear = () => { if (timer) window.clearTimeout(timer); timer = 0; target = null; };
  document.addEventListener('pointerdown', start, { passive: true });
  document.addEventListener('pointerup', clear, { passive: true });
  document.addEventListener('pointercancel', clear, { passive: true });
  document.addEventListener('pointermove', event => { if (timer && event.pointerType !== 'mouse' && ((event as PointerEvent).pressure === 0)) clear(); }, { passive: true });
}

export function mountNightIntelligence() {
  installUndoRegistry();
  installPresenceVisibility();
  bindRuntime();
  bindModels();
  installLongPressActions();
  applyDisplayPreferences(readPref<Density>(DENSITY_KEY, 'automatic'), readPref<CalmPreference>(CALM_KEY, 'automatic'));
  mount();
}
