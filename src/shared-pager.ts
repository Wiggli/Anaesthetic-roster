import './shared-pager.css';

type SharedPagerRow = {
  roster_date: string;
  nurse_order: string[];
  updated_by?: string;
  updated_at?: string;
};

type SharedPagerState = {
  eligible: boolean;
  date: string;
  nurses: string[];
  reason?: string;
};

type GlobalRoster = Record<string, any>;
const g = window as unknown as GlobalRoster;
const orderCache = new Map<string, SharedPagerRow | null>();
const fetches = new Map<string, Promise<SharedPagerRow | null>>();
const drafts = new Map<string, string[]>();
let realtimeStarted = false;
let liveTimer = 0;

function canonical(value: string) {
  const fn = g.canonicalNurseName as ((name: string) => string) | undefined;
  return fn ? fn(value) : String(value || '').trim().toLowerCase();
}

function professional(value: string) {
  const fn = g.professionalName as ((name: string) => string) | undefined;
  return fn ? fn(value) : value;
}

function sameSet(left: string[], right: string[]) {
  const a = left.map(canonical).sort();
  const b = right.map(canonical).sort();
  return a.length === b.length && a.every((value, index) => value === b[index]);
}

function baseForDate(date?: string) {
  if (date && Array.isArray(g.R)) return g.R.find((row: any) => row?.date === date) || null;
  return typeof g.cur === 'function' ? g.cur() : null;
}

function sharedPagerState(date?: string): SharedPagerState {
  const base = baseForDate(date);
  if (!base) return { eligible: false, date: date || '', nurses: [], reason: 'Roster night unavailable' };
  const targetDate = String(base.date || date || '');
  const plan = typeof g.staffingPlan === 'function' ? g.staffingPlan(base) : null;
  const count = Number(plan?.count ?? 0);
  if (count !== 4) return { eligible: false, date: targetDate, nurses: [], reason: 'Shared Pager is only used with exactly four nurses' };

  const theatre = [base.first1, base.first2, base.second1, base.second2].filter(Boolean).map(String);
  const working = typeof g.nightWorkingNames === 'function' ? g.nightWorkingNames(base).filter(Boolean).map(String) : [];
  if (theatre.length !== 4 || new Set(theatre.map(canonical)).size !== 4 || !sameSet(working, theatre)) {
    return { eligible: false, date: targetDate, nurses: theatre, reason: 'Four-nurse shared Pager requires both theatre pairs to remain intact' };
  }
  return { eligible: true, date: targetDate, nurses: theatre };
}

async function fetchOrder(date: string) {
  if (orderCache.has(date)) return orderCache.get(date) ?? null;
  const pending = fetches.get(date);
  if (pending) return pending;
  const task = (async () => {
    const supa = g.supa;
    if (!supa) return null;
    const result = await supa.from('night_shared_pager_order').select('roster_date,nurse_order,updated_by,updated_at').eq('roster_date', date).maybeSingle();
    if (result.error) {
      if (String(result.error.code || '') !== 'PGRST116') console.warn('Shared Pager order could not be loaded', result.error);
      orderCache.set(date, null);
      return null;
    }
    const row = result.data as SharedPagerRow | null;
    orderCache.set(date, row);
    return row;
  })().finally(() => fetches.delete(date));
  fetches.set(date, task);
  return task;
}

function formatHours(hours: number) {
  if (Math.abs(hours - Math.round(hours)) < 0.001) return `${Math.round(hours)}h`;
  const totalMinutes = Math.round(hours * 60);
  return `${Math.floor(totalMinutes / 60)}h ${totalMinutes % 60}m`;
}

function timingFor(date: string) {
  return typeof g.nightDutyTiming === 'function' ? g.nightDutyTiming(date) : null;
}

function boundaryLabel(ms: number, timing: any) {
  const parts = typeof g.maltaTimePartsAt === 'function' ? g.maltaTimePartsAt(ms) : null;
  if (!parts) return new Date(ms).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  const clock = `${String(parts.hour).padStart(2, '0')}:${String(parts.minute).padStart(2, '0')}`;
  if (timing?.direction === 'back' && parts.hour === 2) {
    const transition = Number(timing.transitionUtc || 0);
    return `${clock} ${ms < transition ? 'OLD' : 'NEW'}`;
  }
  return clock;
}

function segments(date: string, order: string[]) {
  const timing = timingFor(date);
  if (!timing || order.length !== 4) return [];
  const width = (Number(timing.endUtc) - Number(timing.startUtc)) / 4;
  return order.map((name, index) => {
    const start = Number(timing.startUtc) + width * index;
    const end = start + width;
    return { index, name, start, end, label: `${boundaryLabel(start, timing)}–${boundaryLabel(end, timing)}` };
  });
}

function currentSegment(date: string, order: string[]) {
  const items = segments(date, order);
  const now = typeof g.appNowMs === 'function' ? Number(g.appNowMs()) : Date.now();
  const active = items.find(item => now >= item.start && now < item.end);
  return { items, active, now };
}

function summaryText(date: string, order: string[]) {
  const timing = timingFor(date);
  const items = segments(date, order);
  if (!timing || items.length !== 4) return '';
  const lines = [
    `Shared Pager coverage · ${date}`,
    `00:00–07:00 · ${formatHours(Number(timing.totalHours))} actual`,
    ...items.map(item => `${item.index + 1}. ${professional(item.name)} · ${item.label}`)
  ];
  if (timing.isClockChange) lines.push(`Clock change: each Pager segment is ${formatHours(Number(timing.totalHours) / 4)} actual.`);
  lines.push('The four nurses remain in their theatre parts; Pager handovers and breaks are coordinated clinically.');
  return lines.join('\n');
}

function toast(message: string) {
  if (typeof g.toast === 'function') g.toast(message);
}

async function saveOrder(date: string, order: string[]) {
  const state = sharedPagerState(date);
  if (!state.eligible || order.length !== 4 || new Set(order.map(canonical)).size !== 4 || !sameSet(order, state.nurses)) {
    toast('Use each of the four theatre nurses once');
    return;
  }
  const supa = g.supa;
  if (!supa || !navigator.onLine) {
    toast('Reconnect to save the shared Pager order');
    return;
  }
  const button = document.querySelector<HTMLButtonElement>('[data-shared-pager-save]');
  if (button) { button.disabled = true; button.textContent = 'Saving…'; }
  try {
    const result = await supa.rpc('set_night_shared_pager_order_v56', {
      p_roster_date: date,
      p_nurse_order: order,
      p_client_version: String(g.APP_VERSION || '56.0')
    });
    if (result.error) throw result.error;
    orderCache.set(date, result.data as SharedPagerRow);
    drafts.delete(date);
    toast('Shared Pager order saved for everyone');
    renderAll(date);
  } catch (error: any) {
    const message = String(error?.message || '');
    toast(message.includes('REQUIRES_FOUR_THEATRE_NURSES') || message.includes('NOT_AVAILABLE')
      ? 'Shared Pager is available only when the four theatre nurses are the whole team'
      : 'Shared Pager order could not be saved');
  } finally {
    if (button) { button.disabled = false; button.textContent = 'Save shared Pager order'; }
  }
}

function ensureHost(parent: Element, id: string, before = false) {
  let host = document.getElementById(id);
  if (!host) {
    host = document.createElement('section');
    host.id = id;
    host.className = 'sharedPagerSurface';
    if (before && parent.firstChild) parent.insertBefore(host, parent.firstChild); else parent.appendChild(host);
  }
  return host;
}

function renderEditor(date?: string) {
  const state = sharedPagerState(date);
  const pane = document.getElementById('changesAllocationPane');
  const existing = document.getElementById('sharedPagerEditor');
  if (!pane || !state.eligible) { existing?.remove(); return; }
  const host = ensureHost(pane, 'sharedPagerEditor', true);
  const stored = orderCache.get(state.date);
  const current = drafts.get(state.date) || stored?.nurse_order || state.nurses;
  const timing = timingFor(state.date);
  const segmentLength = timing ? Number(timing.totalHours) / 4 : 0;
  host.innerHTML = `
    <div class="sharedPagerHeading">
      <div><span class="sharedPagerEyebrow">4-nurse exception</span><h3>Shared Pager order</h3></div>
      <span class="sharedPagerDuration">${timing?.isClockChange ? `${formatHours(segmentLength)} each · clock change` : `${formatHours(segmentLength)} each`}</span>
    </div>
    <p class="sharedPagerIntro">Both theatre pairs stay in place. Choose the order in which the same four nurses share Pager from 00:00 to 07:00. The app does not rotate this automatically.</p>
    <div class="sharedPagerOrderEditor">
      ${current.map((name, index) => `<label><span>Part ${index + 1}</span><select data-shared-pager-index="${index}" aria-label="Shared Pager part ${index + 1}">${state.nurses.map(option => `<option value="${escapeHtml(option)}" ${canonical(option) === canonical(name) ? 'selected' : ''}>${escapeHtml(professional(option))}</option>`).join('')}</select><small>${segments(state.date, current)[index]?.label || ''}</small></label>`).join('')}
    </div>
    <div class="sharedPagerEditorStatus" role="status">${stored ? `Saved by ${escapeHtml(stored.updated_by || 'the team')}${stored.updated_at ? ` · ${escapeHtml(new Date(stored.updated_at).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }))}` : ''}` : 'Not saved yet. Choose the agreed order before the Pager period starts.'}</div>
    <div class="sharedPagerActions">
      <button type="button" class="primary" data-shared-pager-save>Save shared Pager order</button>
      <button type="button" class="soft" data-shared-pager-copy ${stored ? '' : 'disabled'}>Copy plan</button>
      <button type="button" class="soft" data-shared-pager-email ${stored ? '' : 'disabled'}>Email plan</button>
    </div>`;

  host.querySelectorAll<HTMLSelectElement>('[data-shared-pager-index]').forEach(select => {
    select.addEventListener('change', () => {
      const next = Array.from(host.querySelectorAll<HTMLSelectElement>('[data-shared-pager-index]')).map(item => item.value);
      drafts.set(state.date, next);
      renderEditor(state.date);
    });
  });
  host.querySelector<HTMLButtonElement>('[data-shared-pager-save]')?.addEventListener('click', () => saveOrder(state.date, drafts.get(state.date) || current));
  host.querySelector<HTMLButtonElement>('[data-shared-pager-copy]')?.addEventListener('click', async () => {
    const order = orderCache.get(state.date)?.nurse_order;
    if (!order) return;
    try { await navigator.clipboard.writeText(summaryText(state.date, order)); toast('Shared Pager plan copied'); } catch { toast('Copy is not available on this device'); }
  });
  host.querySelector<HTMLButtonElement>('[data-shared-pager-email]')?.addEventListener('click', () => {
    const order = orderCache.get(state.date)?.nurse_order;
    if (!order) return;
    const recipients = Array.isArray(g.appSettings?.email_recipients) ? g.appSettings.email_recipients.join(',') : '';
    const subject = encodeURIComponent(`Night Roster · Shared Pager · ${state.date}`);
    const body = encodeURIComponent(summaryText(state.date, order));
    window.location.href = `mailto:${recipients}?subject=${subject}&body=${body}`;
  });
}

function escapeHtml(value: string) {
  return String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char] || char));
}

function openSharedPagerEditor() {
  if (typeof g.show === 'function') g.show('changes');
  if (typeof g.setChangesStep === 'function') g.setChangesStep('allocation', true);
  window.setTimeout(() => document.getElementById('sharedPagerEditor')?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 100);
}

function renderHero(date?: string) {
  const state = sharedPagerState(date);
  const personal = document.getElementById('personalNight');
  const existing = document.getElementById('sharedPagerHero');
  if (!personal || !state.eligible) { existing?.remove(); return; }
  const host = ensureHost(personal, 'sharedPagerHero');
  host.classList.add('sharedPagerHero');
  host.setAttribute('role', 'button');
  host.setAttribute('tabindex', '0');
  const stored = orderCache.get(state.date);
  if (!stored) {
    host.innerHTML = `<div class="sharedPagerHeroTop"><div><span class="sharedPagerEyebrow">Shared Pager coverage</span><strong>Order still to agree</strong></div><span class="sharedPagerDuration">00:00–07:00</span></div><p>All four theatre nurses share Pager. Open the allocation step to record the agreed order for everyone.</p><button type="button" class="soft">Set Pager order</button>`;
    host.onclick = openSharedPagerEditor;
    return;
  }

  const timing = timingFor(state.date);
  const { items, active, now } = currentSegment(state.date, stored.nurse_order);
  const activeIndex = active ? active.index : now >= Number(timing?.endUtc) ? 4 : -1;
  const progress = active ? Math.max(0, Math.min(1, (now - active.start) / (active.end - active.start))) : 0;
  const next = active && items[active.index + 1];
  const remainingMinutes = active ? Math.max(0, Math.ceil((active.end - now) / 60000)) : 0;
  const elapsedMinutes = active ? Math.max(0, Math.floor((now - active.start) / 60000)) : 0;
  const myName = typeof g.myName === 'function' ? String(g.myName() || '') : String(g.appStorage?.getItem?.('anaes_my_name') || '');
  const myPart = items.find(item => canonical(item.name) === canonical(myName));

  host.innerHTML = `
    <div class="sharedPagerHeroTop">
      <div><span class="sharedPagerEyebrow">Shared Pager coverage</span><strong>${active ? `Part ${active.index + 1} of 4` : 'Four-part Pager plan'}</strong></div>
      <span class="sharedPagerDuration">${formatHours(Number(timing?.totalHours || 0) / 4)} each</span>
    </div>
    ${active ? `<p class="sharedPagerNow"><b>${escapeHtml(professional(active.name))} now</b>${next ? ` · ${escapeHtml(professional(next.name))} next` : ' · final Pager part'}</p><p class="sharedPagerElapsed">${elapsedMinutes}m completed · ${remainingMinutes}m remaining</p>` : `<p class="sharedPagerNow">${now < Number(timing?.startUtc) ? 'Pager starts at 00:00' : 'Pager period complete'}</p>`}
    <div class="sharedPagerTrack" aria-label="Shared Pager progress">
      ${items.map(item => `<span class="${item.index < activeIndex ? 'complete' : item.index === activeIndex ? 'active' : ''}" title="${escapeHtml(professional(item.name))} · ${escapeHtml(item.label)}"><i style="--shared-progress:${item.index < activeIndex ? 1 : item.index === activeIndex ? progress : 0}"></i></span>`).join('')}
    </div>
    <div class="sharedPagerSegments">${items.map(item => `<div class="${item.index === activeIndex ? 'active' : ''} ${myPart?.index === item.index ? 'mine' : ''}"><span>${item.index + 1}</span><b>${escapeHtml(professional(item.name))}</b><small>${escapeHtml(item.label)}</small></div>`).join('')}</div>
    ${myPart ? `<p class="sharedPagerMine">Your Pager part: <b>Part ${myPart.index + 1}</b> · ${escapeHtml(myPart.label)}</p>` : ''}
    ${timing?.isClockChange ? `<p class="sharedPagerClock">Clock change night: the track uses real elapsed time. OLD and NEW distinguish the repeated 02:00 hour.</p>` : ''}`;
  host.onclick = openSharedPagerEditor;
  host.onkeydown = event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); openSharedPagerEditor(); } };
}

function hideLegacyFourNurseWarnings(root: Element) {
  root.querySelectorAll<HTMLElement>('p,div,span,li').forEach(node => {
    const text = (node.textContent || '').trim();
    if ((text.includes('Additional overtime cover is required before allocations and breaks can be finalised') || text.includes('Breaks cannot be finalised while only 4 nurses are recorded')) && node.children.length < 3) {
      node.classList.add('sharedPagerLegacyWarningHidden');
    }
  });
}

function renderBreaks(date?: string) {
  const state = sharedPagerState(date);
  const root = document.getElementById('breaks');
  const existing = document.getElementById('sharedPagerBreaks');
  if (!root || !state.eligible) { existing?.remove(); return; }
  hideLegacyFourNurseWarnings(root);
  const list = document.getElementById('breakList') || root;
  const host = ensureHost(list.parentElement || root, 'sharedPagerBreaks', true);
  const stored = orderCache.get(state.date);
  const timing = timingFor(state.date);
  host.innerHTML = `<div class="sharedPagerHeading"><div><span class="sharedPagerEyebrow">4-nurse exception</span><h3>Shared Pager and breaks</h3></div><span class="sharedPagerDuration">${formatHours(Number(timing?.totalHours || 0))} actual Pager</span></div>
    <p>The four nurses remain in their theatre parts and keep the break linked to that theatre part. Pager is shared separately, with handovers and breaks coordinated clinically.</p>
    ${stored ? `<div class="sharedPagerMiniOrder">${segments(state.date, stored.nurse_order).map(item => `<span><b>${item.index + 1}. ${escapeHtml(professional(item.name))}</b><small>${escapeHtml(item.label)}</small></span>`).join('')}</div>` : '<p class="sharedPagerPending">Pager order has not been saved yet.</p>'}`;
}

function enhanceRosterCards() {
  const cards = document.querySelectorAll<HTMLElement>('[data-roster-date]');
  cards.forEach(card => {
    const date = card.dataset.rosterDate || '';
    const state = sharedPagerState(date);
    card.querySelector('.sharedPagerRosterRow')?.remove();
    if (!state.eligible) return;
    const row = document.createElement('div');
    row.className = 'sharedPagerRosterRow';
    const stored = orderCache.get(date);
    row.innerHTML = `<span><b>Shared Pager</b><small>${stored ? stored.nurse_order.map(professional).join(' → ') : 'Order to agree'}</small></span><em>${stored ? '4-way cover' : 'Pending'}</em>`;
    card.appendChild(row);
    if (!orderCache.has(date)) void fetchOrder(date).then(() => enhanceRosterCards());
  });
}

function renderAll(date?: string) {
  const state = sharedPagerState(date);
  const target = state.date || date;
  renderEditor(target);
  renderHero(target);
  renderBreaks(target);
  window.setTimeout(enhanceRosterCards, 40);
}

async function prepare(date?: string) {
  const state = sharedPagerState(date);
  if (!state.eligible) { renderAll(state.date || date); return; }
  await fetchOrder(state.date);
  renderAll(state.date);
}

function startRealtime() {
  if (realtimeStarted || !g.supa || document.body.classList.contains('authPending')) return;
  realtimeStarted = true;
  g.supa.channel('shared-pager-order-ui')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'night_shared_pager_order' }, (payload: any) => {
      const row = (payload.new || payload.old) as SharedPagerRow | undefined;
      if (!row?.roster_date) return;
      if (payload.eventType === 'DELETE') orderCache.set(row.roster_date, null); else orderCache.set(row.roster_date, payload.new as SharedPagerRow);
      renderAll(row.roster_date);
    })
    .subscribe();
}

function selectedDateFromEvent(detail: any) {
  return String(detail?.date || detail?.isoDate || detail?.selectedDate || baseForDate()?.date || '');
}

window.addEventListener('roster:night', event => { const date = selectedDateFromEvent((event as CustomEvent).detail); void prepare(date); });
window.addEventListener('roster:breaks', () => { const date = String(baseForDate()?.date || ''); void prepare(date); });
window.addEventListener('roster:changes', () => { const date = String(baseForDate()?.date || ''); void prepare(date); });
window.addEventListener('roster:changes-workflow', () => { const date = String(baseForDate()?.date || ''); void prepare(date); });
window.addEventListener('roster:full-roster', () => window.setTimeout(enhanceRosterCards, 80));
window.addEventListener('online', () => { orderCache.clear(); void prepare(String(baseForDate()?.date || '')); });

const authObserver = new MutationObserver(() => {
  if (!document.body.classList.contains('authPending')) {
    startRealtime();
    void prepare(String(baseForDate()?.date || ''));
  }
});
authObserver.observe(document.body, { attributes: true, attributeFilter: ['class'] });
startRealtime();

function startLiveProgress() {
  if (liveTimer) window.clearInterval(liveTimer);
  liveTimer = window.setInterval(() => {
    if (document.visibilityState === 'visible') renderHero(String(baseForDate()?.date || ''));
  }, 30000);
}
startLiveProgress();

export { sharedPagerState, segments, summaryText };
