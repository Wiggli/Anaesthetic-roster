import './shared-pager.css';

type SharedPagerRow = { roster_date: string; nurse_order: string[]; updated_by?: string; updated_at?: string };
type TheatreRoles = { first1: string; first2: string; second1: string; second2: string };
type SharedPagerState = { eligible: boolean; ready?: boolean; date: string; nurses: string[]; roles?: TheatreRoles; reason?: string };
type GlobalRoster = Record<string, any>;

const g = window as unknown as GlobalRoster;
const orderCache = new Map<string, SharedPagerRow | null>();
const fetches = new Map<string, Promise<SharedPagerRow | null>>();
const drafts = new Map<string, string[]>();
let realtimeStarted = false;
let channel: any = null;
let generation = 0;
const loadErrors = new Set<string>();
const saving = new Set<string>();
const workflowSignatures = new Map<string, string>();
let liveTimer = 0;

function canonical(value: string) {
  const fn = g.canonicalNurseName as ((name: string) => string) | undefined;
  return fn ? fn(value) : String(value || '').trim().toLowerCase();
}
function professional(value: string) {
  const fn = g.professionalName as ((name: string) => string) | undefined;
  return fn ? fn(value) : value;
}
function sameNurse(a: string, b: string) { return canonical(a) === canonical(b); }
function sameSet(left: string[], right: string[]) {
  const a = left.map(canonical).sort(); const b = right.map(canonical).sort();
  return a.length === b.length && a.every((value, index) => value === b[index]);
}
function baseForDate(date?: string) {
  if (date && typeof g.rawBaseForDate === 'function' && Array.isArray(g.R) && g.R.some((row: any) => row.date === date)) return g.rawBaseForDate(date);
  return typeof g.cur === 'function' ? g.cur() : null;
}
function changesFor(date: string) { return typeof g.changesFor === 'function' ? (g.changesFor(date) || []) : []; }
function overtimeFor(date: string) { return typeof g.overtimeFor === 'function' ? (g.overtimeFor(date) || []) : []; }
function effectiveTheatreRoles(base: any, date: string): TheatreRoles | null {
  const roles: TheatreRoles = { first1: String(base.first1 || ''), first2: String(base.first2 || ''), second1: String(base.second1 || ''), second2: String(base.second2 || '') };
  const override = g.nightRoleOverrides?.[date]?.assignments;
  if (override?.mode === '4') {
    const saved: TheatreRoles = { first1: String(override.first1 || ''), first2: String(override.first2 || ''), second1: String(override.second1 || ''), second2: String(override.second2 || '') };
    const working = typeof g.nightWorkingNames === 'function' ? g.nightWorkingNames(base).filter(Boolean).map(String) : Object.values(saved);
    if (Object.values(saved).every(Boolean) && new Set(Object.values(saved).map(canonical)).size === 4 && sameSet(working, Object.values(saved))) return saved;
  }
  if (Object.values(roles).some(name => !name) || overtimeFor(date).length) return null;
  const changes = changesFor(date);
  if (changes.some((change: any) => String(change?.replacement_name || '').trim())) return null;
  const mode = String(base.mode || '');
  if (mode === '5') {
    const full = String(base.fullLW || base.pager || ''); if (!full) return null;
    const team = [...Object.values(roles), full];
    const relevant = changes.filter((change: any) => team.some(name => sameNurse(name, String(change?.absent_name || ''))));
    if (relevant.length !== 1) return null;
    const absent = String(relevant[0].absent_name || '');
    if (sameNurse(full, absent)) return new Set(Object.values(roles).map(canonical)).size === 4 ? roles : null;
    const vacantTheatreRole = (Object.keys(roles) as (keyof TheatreRoles)[]).find(role => sameNurse(roles[role], absent));
    if (vacantTheatreRole) return null; // wait for the team to explicitly save the theatre reassignment
    return null;
  }
  if (mode === '6') {
    const pagerAbsent = changes.some((change: any) => sameNurse(String(base.pager || ''), String(change?.absent_name || '')));
    const relieverAbsent = changes.some((change: any) => sameNurse(String(base.reliever || ''), String(change?.absent_name || '')));
    const theatreAbsent = changes.some((change: any) => Object.values(roles).some(name => sameNurse(name, String(change?.absent_name || ''))));
    return pagerAbsent && relieverAbsent && !theatreAbsent ? roles : null;
  }
  return null;
}
function sharedPagerState(date?: string): SharedPagerState {
  const base = baseForDate(date); if (!base) return { eligible: false, date: date || '', nurses: [], reason: 'Roster night unavailable' };
  const targetDate = String(base.date || date || ''), plan = typeof g.staffingPlan === 'function' ? g.staffingPlan(base) : null;
  if (Number(plan?.count ?? 0) !== 4) return { eligible: false, date: targetDate, nurses: [], reason: 'Shared Pager is only used with exactly four nurses' };
  const roles = effectiveTheatreRoles(base, targetDate); if (!roles) return { eligible: true, ready: false, date: targetDate, nurses: typeof g.nightWorkingNames === 'function' ? g.nightWorkingNames(base) : [], reason: 'Save the four theatre positions first' };
  const nurses = Object.values(roles), working = typeof g.nightWorkingNames === 'function' ? g.nightWorkingNames(base).filter(Boolean).map(String) : nurses;
  if (!sameSet(working, nurses)) return { eligible: false, date: targetDate, nurses, reason: 'The four working nurses do not match the effective theatre plan' };
  return { eligible: true, ready: true, date: targetDate, nurses, roles };
}
function validOrder(date: string) {
  const state = sharedPagerState(date), row = orderCache.get(date);
  return state.ready && Array.isArray(row?.nurse_order) && row.nurse_order.length === 4 && new Set(row.nurse_order.map(canonical)).size === 4 && sameSet(row.nurse_order, state.nurses) ? row : null;
}
async function fetchOrder(date: string, refresh = false) {
  if (!refresh && orderCache.has(date)) return orderCache.get(date) ?? null;
  if (fetches.has(date)) return fetches.get(date)!;
  const epoch = generation, client = g.supa;
  const task = (async () => {
    if (!client?.from || document.body.classList.contains('authPending')) return null;
    try {
      const result = await client.from('night_shared_pager_order').select('roster_date,nurse_order,updated_by,updated_at').eq('roster_date', date).maybeSingle();
      if (result.error) throw result.error;
      if (epoch !== generation || client !== g.supa) return null;
      loadErrors.delete(date); const row = result.data as SharedPagerRow | null, current = orderCache.get(date); if (!current?.updated_at || !row?.updated_at || Date.parse(row.updated_at) >= Date.parse(current.updated_at)) orderCache.set(date, row); return orderCache.get(date) ?? null;
    } catch { if (epoch === generation) loadErrors.add(date); return null; }
  })().finally(() => { if (epoch === generation) fetches.delete(date); });
  fetches.set(date, task); return task;
}
function status(date: string) { const state = sharedPagerState(date); return { ...state, saved: !!validOrder(date), loading: fetches.has(date), error: loadErrors.has(date) }; }
g.sharedPagerStatus = status;
g.sharedPagerDraftDates = () => Array.from(drafts.keys());
g.openSharedPagerEditor = openEditor;
g.sharedPagerPersonal = (date: string) => { const state = sharedPagerState(date), row = validOrder(date), name = typeof g.myName === 'function' ? g.myName() : '', mine = row && segments(date, row.nurse_order).find(item => sameNurse(item.name, name)); return { eligible: state.eligible, title: mine ? `Your Pager · turn ${mine.index + 1}` : 'Shared Pager', label: mine ? mine.label : state.ready ? 'Agreed order not saved' : 'Theatre arrangement needed' }; };
g.sharedPagerSummary = (date: string) => { const row = validOrder(date); return row ? summaryText(date, row.nurse_order) : sharedPagerState(date).eligible ? 'Shared Pager 00:00–07:00 · agreed order not saved.' : ''; };
function formatHours(hours: number) { if (Math.abs(hours - Math.round(hours)) < .001) return `${Math.round(hours)}h`; const minutes = Math.round(hours * 60); return `${Math.floor(minutes / 60)}h ${minutes % 60}m`; }
function timingFor(date: string) { return typeof g.nightDutyTiming === 'function' ? g.nightDutyTiming(date) : null; }
function boundaryLabel(ms: number, timing: any) { const parts = typeof g.maltaTimePartsAt === 'function' ? g.maltaTimePartsAt(ms) : null; if (!parts) return new Date(ms).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }); const clock = `${String(parts.hour).padStart(2, '0')}:${String(parts.minute).padStart(2, '0')}`; if (timing?.direction === 'back' && parts.hour === 2) return `${clock} ${ms < Number(timing.transitionUtc || 0) ? 'OLD' : 'NEW'}`; return clock; }
function segments(date: string, order: string[]) { const timing = timingFor(date); if (!timing || order.length !== 4) return []; const width = (Number(timing.endUtc) - Number(timing.startUtc)) / 4; return order.map((name, index) => { const start = Number(timing.startUtc) + width * index, end = start + width; return { index, name, start, end, label: `${boundaryLabel(start, timing)}–${boundaryLabel(end, timing)}` }; }); }
function theatreSummary(state: SharedPagerState) { return state.roles ? `First Part: ${professional(state.roles.first1)} + ${professional(state.roles.first2)} · Second Part: ${professional(state.roles.second1)} + ${professional(state.roles.second2)}` : ''; }
function summaryText(date: string, order: string[]) { const state = sharedPagerState(date), timing = timingFor(date), items = segments(date, order); if (!state.eligible || !timing || items.length !== 4) return ''; const lines = [`4-nurse exceptional arrangement · ${date}`, theatreSummary(state), `Shared Pager 00:00–07:00 · ${formatHours(Number(timing.totalHours))} actual`, ...items.map(item => `${item.index + 1}. ${professional(item.name)} · ${item.label}`)]; if (timing.isClockChange) lines.push(`Clock change: each Pager segment is ${formatHours(Number(timing.totalHours) / 4)} actual.`); lines.push('PROVISIONAL four-person cover, below normal staffing. Both theatre parts remain staffed; coordinate Pager handovers and breaks clinically.'); return lines.join('\n'); }
function escapeHtml(value: string) { return String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char] || char)); }
function toast(message: string) { if (typeof g.toast === 'function') g.toast(message); }
async function saveOrder(date: string, order: string[]) {
  const state = sharedPagerState(date); if (!state.ready || order.length !== 4 || new Set(order.map(canonical)).size !== 4 || !sameSet(order, state.nurses)) { toast('Select all four working nurses, using each nurse once'); return; }
  if (saving.has(date)) return;
  if (typeof g.requireOnline === 'function' && !g.requireOnline()) return;
  if (!g.supa || !navigator.onLine) { toast('Reconnect to save the shared Pager order'); return; }
  saving.add(date);
  const button = document.querySelector<HTMLButtonElement>('[data-shared-pager-save]'); if (button) { button.disabled = true; button.textContent = 'Saving…'; }
  try { const result = await g.supa.rpc('set_night_shared_pager_order_v56', { p_roster_date: date, p_nurse_order: order, p_client_version: String(g.APP_VERSION || 'unknown') }); if (result.error) throw result.error; if (!Array.isArray(result.data?.nurse_order) || !sameSet(result.data.nurse_order, order)) throw new Error('Pager save response could not be verified'); if (document.body.classList.contains('authPending')) return; orderCache.set(date, result.data as SharedPagerRow); drafts.delete(date); toast('Shared Pager order saved for everyone'); renderAll(date); window.dispatchEvent(new CustomEvent('roster:pager-updated')); window.dispatchEvent(new CustomEvent('roster:pager-saved', { detail: { date } })); }
  catch (error: any) { toast(String(error?.message || '').includes('SHARED_PAGER_') ? 'The four-nurse arrangement changed. Review staffing before saving Pager.' : 'Shared Pager order could not be saved'); }
  finally { saving.delete(date); if (button) { button.disabled = false; button.textContent = 'Save shared Pager order'; } }
}
function ensureHost(parent: Element, id: string, before = false) { let host = document.getElementById(id); if (!host) { host = document.createElement('section'); host.id = id; host.className = 'sharedPagerSurface'; if (before && parent.firstChild) parent.insertBefore(host, parent.firstChild); else parent.appendChild(host); } return host; }
function renderEditor(date?: string) {
  const state = sharedPagerState(date), pane = document.getElementById('changesAllocationPane'), existing = document.getElementById('sharedPagerEditor'); if (!pane || !state.eligible) { existing?.remove(); return; }
  const host = ensureHost(pane, 'sharedPagerEditor'), stored = validOrder(state.date), savedOrder = Array.isArray(stored?.nurse_order) && stored.nurse_order.length === 4 ? stored.nurse_order : null, current = drafts.get(state.date) || savedOrder || ['', '', '', ''], timing = timingFor(state.date), each = timing ? Number(timing.totalHours) / 4 : 0, slotSegments = segments(state.date, ['', '', '', '']), complete = current.length === 4 && current.every(Boolean) && new Set(current.map(canonical)).size === 4 && sameSet(current, state.nurses);
  if (!state.ready) { host.innerHTML = `<div class="sharedPagerHeading"><h3>Shared Pager · 00:00–07:00</h3></div><p>Save the four theatre positions above, then choose one nurse for each Pager turn.</p>`; return; }
  host.innerHTML = `<div class="sharedPagerHeading"><div><span class="sharedPagerEyebrow">4-nurse exception</span><h3>Shared Pager order</h3></div><span class="sharedPagerDuration">${formatHours(each)} each${timing?.isClockChange ? ' · clock change' : ''}</span></div><p class="sharedPagerIntro">${escapeHtml(theatreSummary(state))}. Choose the agreed Pager order for 00:00–07:00. There is no automatic rotation.</p><div class="sharedPagerOrderEditor">${current.map((name, index) => `<label><span>Pager turn ${index + 1}</span><select data-shared-pager-index="${index}" aria-label="Shared Pager turn ${index + 1}"><option value="" disabled ${name ? '' : 'selected'}>Select nurse</option>${state.nurses.map(option => { const usedElsewhere = current.some((chosen, chosenIndex) => chosenIndex !== index && chosen && sameNurse(chosen, option)); return `<option value="${escapeHtml(option)}" ${sameNurse(option, name) ? 'selected' : ''} ${usedElsewhere ? 'disabled' : ''}>${escapeHtml(professional(option))}</option>`; }).join('')}</select><small>${escapeHtml(slotSegments[index]?.label || '')}</small></label>`).join('')}</div><div class="sharedPagerEditorStatus" role="status">${drafts.has(state.date) ? 'Unsaved Pager changes. Save to update everyone.' : loadErrors.has(state.date) ? 'Pager order could not be refreshed. Retry before changing it.' : stored ? `Saved by ${escapeHtml(stored.updated_by || 'the team')}${stored.updated_at ? ` · ${escapeHtml(new Date(stored.updated_at).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }))}` : ''}` : 'Not saved yet. Select one nurse for each Pager part in the order agreed by the four nurses.'}</div><div class="sharedPagerActions"><button type="button" class="primary" data-shared-pager-save ${complete && !loadErrors.has(state.date) && navigator.onLine && !saving.has(state.date) ? '' : 'disabled'}>Save shared Pager order</button><button type="button" class="soft" data-shared-pager-copy ${stored ? '' : 'disabled'}>Copy plan</button><button type="button" class="soft" data-shared-pager-email ${stored ? '' : 'disabled'}>Email plan</button>${loadErrors.has(state.date) ? '<button type="button" data-pager-retry>Retry refresh</button>' : ''}</div>`;
  host.querySelector('[data-pager-retry]')?.addEventListener('click', () => void fetchOrder(state.date, true).then(() => renderAll(state.date)));
  host.querySelectorAll<HTMLSelectElement>('[data-shared-pager-index]').forEach(select => select.addEventListener('change', () => { drafts.set(state.date, Array.from(host.querySelectorAll<HTMLSelectElement>('[data-shared-pager-index]')).map(item => item.value)); renderEditor(state.date); }));
  host.querySelector<HTMLButtonElement>('[data-shared-pager-save]')?.addEventListener('click', () => saveOrder(state.date, drafts.get(state.date) || current));
  host.querySelector<HTMLButtonElement>('[data-shared-pager-copy]')?.addEventListener('click', async () => { const order = orderCache.get(state.date)?.nurse_order; if (!order) return; try { await navigator.clipboard.writeText(summaryText(state.date, order)); toast('Shared Pager plan copied'); } catch { toast('Copy is not available on this device'); } });
  host.querySelector<HTMLButtonElement>('[data-shared-pager-email]')?.addEventListener('click', () => { const order = orderCache.get(state.date)?.nurse_order; if (!order) return; const recipients = Array.isArray(g.appSettings?.email_recipients) ? g.appSettings.email_recipients.join(',') : ''; window.location.href = `mailto:${recipients}?subject=${encodeURIComponent(`Night Roster · Shared Pager · ${state.date}`)}&body=${encodeURIComponent(summaryText(state.date, order))}`; });
}
function openEditor() { if (typeof g.show === 'function') g.show('changes'); if (typeof g.setChangesStep === 'function') g.setChangesStep('allocation', true); window.setTimeout(() => document.getElementById('sharedPagerEditor')?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 100); }
function renderHero(date?: string) {
  const state = sharedPagerState(date), personal = document.getElementById('personalNight'), existing = document.getElementById('sharedPagerHero'); if (!personal || !state.eligible) { existing?.remove(); return; }
  const host = ensureHost(personal, 'sharedPagerHero'); host.classList.add('sharedPagerHero'); host.setAttribute('role', 'region'); host.setAttribute('aria-label', 'Shared Pager plan'); host.removeAttribute('tabindex'); const stored = validOrder(state.date), timing = timingFor(state.date);
  if (!stored) { host.innerHTML = `<div class="sharedPagerHeroTop"><div><span class="sharedPagerEyebrow">4-nurse exceptional arrangement</span><strong>${state.ready ? 'Agree the Pager order' : 'Complete the theatre arrangement'}</strong></div><span class="sharedPagerDuration">00:00–07:00</span></div><p>${escapeHtml(theatreSummary(state))}</p><p>${loadErrors.has(state.date) ? 'The saved Pager order could not be loaded. Open Arrangement to retry.' : 'Four nurses share Pager from midnight. Record your agreed order in Arrangement.'}</p><button type="button" class="soft">${state.ready ? 'Set Pager order' : 'Arrange theatre positions'}</button>`; host.onclick = null; host.onkeydown = null; host.querySelector('button')?.addEventListener('click', openEditor); return; }
  const items = segments(state.date, stored.nurse_order), now = typeof g.appNowMs === 'function' ? Number(g.appNowMs()) : Date.now(), active = items.find(item => now >= item.start && now < item.end), activeIndex = active ? active.index : now >= Number(timing?.endUtc) ? 4 : -1, progress = active ? Math.max(0, Math.min(1, (now - active.start) / (active.end - active.start))) : 0, next = active && items[active.index + 1], remaining = active ? Math.max(0, Math.ceil((active.end - now) / 60000)) : 0, elapsed = active ? Math.max(0, Math.floor((now - active.start) / 60000)) : 0;
  const myName = typeof g.myName === 'function' ? String(g.myName() || '') : String(g.appStorage?.getItem?.('anaes_my_name') || ''), mine = items.find(item => sameNurse(item.name, myName));
  host.innerHTML = `<div class="sharedPagerHeroTop"><div><span class="sharedPagerEyebrow">Shared Pager coverage</span><strong>${active ? `Part ${active.index + 1} of 4` : 'Four-part Pager plan'}</strong></div><span class="sharedPagerDuration">${formatHours(Number(timing?.totalHours || 0) / 4)} each</span></div><p class="sharedPagerTheatre">${escapeHtml(theatreSummary(state))}</p>${loadErrors.has(state.date) ? '<p role="status">Showing the last loaded Pager order. Refresh unavailable.</p>' : ''}${active ? `<p class="sharedPagerNow"><b>${escapeHtml(professional(active.name))} now</b>${next ? ` · ${escapeHtml(professional(next.name))} next` : ' · final Pager part'}</p><p class="sharedPagerElapsed">${elapsed}m completed · ${remaining}m remaining</p>` : `<p class="sharedPagerNow">${now < Number(timing?.startUtc) ? 'Pager starts at 00:00' : 'Pager period complete'}</p>`}<div class="sharedPagerTrack" aria-label="Shared Pager progress">${items.map(item => `<span class="${item.index < activeIndex ? 'complete' : item.index === activeIndex ? 'active' : ''}" title="${escapeHtml(professional(item.name))} · ${escapeHtml(item.label)}"><i style="--shared-progress:${item.index < activeIndex ? 1 : item.index === activeIndex ? progress : 0}"></i></span>`).join('')}</div><div class="sharedPagerSegments">${items.map(item => `<div class="${item.index === activeIndex ? 'active' : ''} ${mine?.index === item.index ? 'mine' : ''}"><span>${item.index + 1}${mine?.index === item.index ? ' · You' : ''}${active?.index === item.index ? ' · Now' : next?.index === item.index ? ' · Next' : ''}</span><b>${escapeHtml(professional(item.name))}</b><small>${escapeHtml(item.label)}</small></div>`).join('')}</div>${mine ? `<p class="sharedPagerMine">Your Pager part: <b>Part ${mine.index + 1}</b> · ${escapeHtml(mine.label)}</p>` : ''}${timing?.isClockChange ? '<p class="sharedPagerClock">Each turn uses real elapsed time. OLD means before clocks change; NEW means after.</p>' : ''}`;
  host.onclick = null; host.onkeydown = null; const edit = document.createElement('button'); edit.type = 'button'; edit.className = 'soft'; edit.textContent = 'Edit Pager order'; edit.addEventListener('click', openEditor); host.appendChild(edit);
}
function hideLegacyWarnings(root: Element) { root.querySelectorAll<HTMLElement>('p,div,span,li').forEach(node => { const text = (node.textContent || '').trim(); if ((text.includes('Additional overtime cover is required before allocations and breaks can be finalised') || text.includes('Breaks cannot be finalised while only 4 nurses are recorded')) && node.children.length < 3) node.classList.add('sharedPagerLegacyWarningHidden'); }); }
function renderBreaks(date?: string) { const state = sharedPagerState(date), root = document.getElementById('breaks'), existing = document.getElementById('sharedPagerBreaks'); if (!root || !state.eligible) { existing?.remove(); return; }  const host = ensureHost(root, 'sharedPagerBreaks'), stored = validOrder(state.date), timing = timingFor(state.date); host.innerHTML = `<div class="sharedPagerHeading"><div><span class="sharedPagerEyebrow">4-nurse exception</span><h3>Shared Pager and breaks</h3></div><span class="sharedPagerDuration">${formatHours(Number(timing?.totalHours || 0))} actual Pager</span></div><p>${escapeHtml(theatreSummary(state))}. Theatre-part break assignments remain linked to those parts. Pager handovers and breaks are coordinated clinically.</p>${stored ? `<div class="sharedPagerMiniOrder">${segments(state.date, stored.nurse_order).map(item => `<span><b>${item.index + 1}. ${escapeHtml(professional(item.name))}</b><small>${escapeHtml(item.label)}</small></span>`).join('')}</div>` : '<p class="sharedPagerPending">Pager order has not been saved yet.</p>'}`; }
function enhanceRosterCards() { document.querySelectorAll<HTMLElement>('[data-roster-date]').forEach(card => { const date = card.dataset.rosterDate || '', state = sharedPagerState(date); card.querySelector('.sharedPagerRosterRow')?.remove(); if (!state.eligible) return; const row = document.createElement('div'); row.className = 'sharedPagerRosterRow'; const stored = validOrder(date); row.innerHTML = `<span><b>4-nurse shared Pager</b><small>${escapeHtml(theatreSummary(state))}${stored ? ` · ${stored.nurse_order.map(professional).join(' → ')}` : ' · order to agree'}</small></span><em>${stored ? 'Recorded · provisional' : 'Order pending'}</em>`; card.appendChild(row); if (!orderCache.has(date)) void fetchOrder(date).then(enhanceRosterCards); }); }
function renderAll(date?: string) { const target = String(baseForDate()?.date || ''); if (date && date !== target) { window.setTimeout(enhanceRosterCards, 40); return; } renderEditor(target); renderHero(target); renderBreaks(target); window.setTimeout(enhanceRosterCards, 40); }
async function prepare(date?: string) {
  const state = sharedPagerState(date); if (state.eligible) await fetchOrder(state.date); renderAll(state.date || date);
  const signature = JSON.stringify(status(state.date));
  if (state.eligible && workflowSignatures.get(state.date) !== signature && state.date === baseForDate()?.date) {
    workflowSignatures.set(state.date, signature); window.dispatchEvent(new CustomEvent('roster:pager-updated'));
    if (typeof g.updateChangesWorkflow === 'function') g.updateChangesWorkflow(g.cur(), g.staffingPlan(g.cur()));
  }
}
function startRealtime() {
  if (realtimeStarted || !g.supa?.channel || document.body.classList.contains('authPending')) return;
  realtimeStarted = true;
  channel = g.supa.channel('shared-pager-order-ui').on('postgres_changes', { event: '*', schema: 'public', table: 'night_shared_pager_order' }, (payload: any) => {
    const row = (payload.new || payload.old) as SharedPagerRow | undefined; if (!row?.roster_date) return;
    orderCache.set(row.roster_date, payload.eventType === 'DELETE' ? null : payload.new as SharedPagerRow);
    renderAll(row.roster_date); window.dispatchEvent(new CustomEvent('roster:pager-updated'));
    if (row.roster_date === baseForDate()?.date && typeof g.updateChangesWorkflow === 'function') g.updateChangesWorkflow(g.cur(), g.staffingPlan(g.cur()));
  }).subscribe((result: string) => { if (result === 'SUBSCRIBED') { const date = String(baseForDate()?.date || ''); if (sharedPagerState(date).eligible) void fetchOrder(date, true).then(() => renderAll(date)); } });
}
function resetPrivateState() {
  generation++; workflowSignatures.clear(); orderCache.clear(); fetches.clear(); drafts.clear(); loadErrors.clear(); saving.clear(); realtimeStarted = false;
  if (channel && g.supa?.removeChannel) void g.supa.removeChannel(channel); channel = null;
  ['sharedPagerHero', 'sharedPagerEditor', 'sharedPagerBreaks'].forEach(id => document.getElementById(id)?.remove());
}
function selectedDate(detail: any) { return String(detail?.date || detail?.isoDate || detail?.selectedDate || baseForDate()?.date || ''); }
window.addEventListener('roster:night', event => void prepare(selectedDate((event as CustomEvent).detail)));
window.addEventListener('roster:breaks', () => void prepare(String(baseForDate()?.date || '')));
window.addEventListener('roster:changes', () => void prepare(String(baseForDate()?.date || '')));
window.addEventListener('roster:changes-workflow', () => void prepare(String(baseForDate()?.date || '')));
window.addEventListener('roster:full-roster', () => window.setTimeout(enhanceRosterCards, 80));
window.addEventListener('beforeunload', event => { if (drafts.size) { event.preventDefault(); event.returnValue = ''; } });
window.addEventListener('roster:pager-saved', () => { if (typeof g.updateChangesWorkflow === 'function') g.updateChangesWorkflow(g.cur(), g.staffingPlan(g.cur())); });
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && !document.body.classList.contains('authPending')) { const date = String(baseForDate()?.date || ''); if (sharedPagerState(date).eligible) void fetchOrder(date, true).then(() => renderAll(date)); } });
window.addEventListener('online', () => { generation++; fetches.clear(); orderCache.clear(); void prepare(String(baseForDate()?.date || '')); });
const authObserver = new MutationObserver(() => { if (document.body.classList.contains('authPending')) { resetPrivateState(); } else { startRealtime(); void prepare(String(baseForDate()?.date || '')); } }); authObserver.observe(document.body, { attributes: true, attributeFilter: ['class'] }); startRealtime();
liveTimer = window.setInterval(() => { if (document.visibilityState === 'visible') renderHero(String(baseForDate()?.date || '')); }, 30000);

export { sharedPagerState, segments, summaryText };
