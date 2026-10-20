import { useProductReducedMotion } from './product-motion';
import { motion } from 'motion/react';
import { createRoot, type Root } from 'react-dom/client';
import { useState } from 'react';

type RosterDetail = { label: string; values: string[]; tone?: 'first' | 'second' | 'pager' | 'reliever' | 'warning' };
type RosterCard = { index: number; date: string; isoDate: string; status: string; count: number; short: boolean; needsReview: boolean; hasAbsence: boolean; members: string[]; rosteredMembers?: string[]; details: RosterDetail[] };

let root: Root | undefined;
function currentMonth() {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Malta', year: 'numeric', month: '2-digit' }).formatToParts(new Date());
  return parts.find(p => p.type === 'year')!.value + '-' + parts.find(p => p.type === 'month')!.value;
}

function openNight(index: number) {
  window.dispatchEvent(new CustomEvent('roster:open-night', { detail: { index } }));
}

function DetailRow({ detail }: { detail: RosterDetail }) {
  const tone = detail.tone === 'first' ? 'tw:bg-blue-400/12 tw:text-blue-800 tw:dark:text-blue-200'
    : detail.tone === 'second' ? 'tw:bg-sky-400/12 tw:text-sky-800 tw:dark:text-sky-200'
      : detail.tone === 'warning' ? 'tw:bg-amber-400/14 tw:text-amber-800 tw:dark:text-amber-200'
        : 'tw:bg-[var(--surface)] tw:text-[var(--accent-strong)]';
  const semanticTone = detail.tone || 'neutral';
  return <div className={`rosterDetailRow rosterDetail-${semanticTone} tw:grid tw:grid-cols-[6.5rem_1fr] tw:gap-3 tw:border-t tw:border-black/6 tw:py-3 tw:first:border-t-0 tw:dark:border-white/8`}>
    <span className="rosterDetailLabel tw:text-xs tw:font-bold tw:text-[var(--muted)]">{detail.label}</span>
    <div className="rosterDetailValues tw:flex tw:flex-wrap tw:justify-end tw:gap-1.5">
      {detail.values.map((value, index) => <span key={`${value}-${index}`} className={`rosterRolePill tw:rounded-full tw:px-2.5 tw:py-1 tw:text-xs tw:font-bold ${tone}`}>{value}</span>)}
    </div>
  </div>;
}

function Cards({ cards, selectedMonth }: { cards: RosterCard[]; selectedMonth?: string }) {
  const reduced = useProductReducedMotion();
  const [month, setMonth] = useState(selectedMonth || currentMonth());
  const [allMonths, setAllMonths] = useState(false);
  const shown = allMonths ? cards : cards.filter(card => card.isoDate?.slice(0, 7) === month);
  const totals = new Map<string, { nights: number; weekends: number }>();
  shown.forEach(card => {
    const day = new Date(card.isoDate + 'T12:00:00Z').getUTCDay();
    (card.rosteredMembers || []).forEach(name => { if (!totals.has(name)) totals.set(name, { nights: 0, weekends: 0 }); });
    [...new Set(card.members || [])].forEach(name => {
      const total = totals.get(name) || { nights: 0, weekends: 0 };
      total.nights++; if (day === 0 || day === 6) total.weekends++;
      totals.set(name, total);
    });
  });
  function moveMonth(step: number) {
    const date = new Date((month || selectedMonth) + '-01T12:00:00Z');
    date.setUTCMonth(date.getUTCMonth() + step);
    setMonth(date.toISOString().slice(0, 7)); setAllMonths(false);
  }
  return <div className="rosterExperienceShell tw:grid tw:gap-3" aria-label={`${shown.length} roster nights`}>
    <div className="rosterPeriodControls" role="group" aria-label="Roster period">
      <button type="button" aria-label="Previous roster month" onClick={() => moveMonth(-1)}>‹</button>
      <input type="month" aria-label="Roster month" value={month} onChange={event => { if (event.target.value) { setMonth(event.target.value); setAllMonths(false); } }} />
      <button type="button" aria-label="Next roster month" onClick={() => moveMonth(1)}>›</button>
      <button type="button" onClick={() => { setMonth(currentMonth()); setAllMonths(false); }}>This month</button>
    </div>
    <label className="rosterAllMonths"><input type="checkbox" checked={allMonths} onChange={event => setAllMonths(event.target.checked)} /> All published months</label>
    <div className="rosterOverviewSummary" role="status" aria-live="polite">
      <span><b>{shown.length}</b> nights shown</span><span><b>{shown.filter(card => card.short).length}</b> short staffed</span><span><b>{shown.filter(card => card.needsReview).length}</b> need allocation</span>
    </div>
    {!!shown.length && <details className="rosterWorkload"><summary>Staff workload on shown nights</summary><p>Counts reflect the effective team after absences and overtime. Weekend means Saturday or Sunday; these totals inform review and do not rebalance the rotation.</p><ul>{[...totals].sort(([a], [b]) => a.localeCompare(b)).map(([name, total]) => <li key={name}><strong>{name}</strong><span>{total.nights} nights · {total.weekends} weekend</span></li>)}</ul></details>}
    {!shown.length && <div className="rosterEmpty" role="status"><strong>No nights match this view</strong><p>Try another month, clear the search and staffing filter, or show all published months.</p><button type="button" onClick={() => { const search = document.getElementById('search') as HTMLInputElement; const filter = document.getElementById('filter') as HTMLSelectElement; if (search) { search.value = ''; search.dispatchEvent(new Event('input', { bubbles: true })); } if (filter) { filter.value = 'all'; filter.dispatchEvent(new Event('change', { bubbles: true })); } setAllMonths(true); }}>Clear filters and show all nights</button></div>}
    <p className="tw:m-0 tw:text-xs tw:font-semibold tw:text-[var(--muted)]">Select a night to open its live plan</p>
    <div className="tw:grid tw:gap-3 tw:lg:grid-cols-2">
    {shown.map((card, index) => <motion.button
      type="button"
      key={`${card.date}-${card.index}`}
      data-roster-date={card.isoDate}
      initial={reduced ? false : { opacity: 0, y: 7 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: reduced ? 0 : 0.2, delay: reduced ? 0 : Math.min(index * 0.02, 0.12) }}
      whileTap={{ scale: reduced ? 1 : 0.99 }}
      onClick={() => openNight(card.index)}
      aria-label={`Open roster for ${card.date}`}
      className="rosterExperienceCard tw:w-full tw:rounded-[22px] tw:border tw:border-black/8 tw:bg-[var(--card)] tw:p-4 tw:text-left tw:shadow-sm tw:dark:border-white/10"
    >
      <div className="tw:flex tw:items-start tw:justify-between tw:gap-3">
        <div className="tw:min-w-0">
          <strong className="tw:block tw:text-[1.05rem]">{card.date}</strong>
          <span className="tw:mt-1 tw:block tw:text-xs tw:leading-relaxed tw:text-[var(--muted)]">{card.status}</span>
        </div>
        <span className={`rosterStaffingBadge ${card.short ? 'isShort' : card.needsReview ? 'needsReview' : ''}`}>{card.count} nurses{card.short ? ' · Short' : card.needsReview ? ' · Pending' : ' · Covered'}</span>
      </div>
      <div className="tw:mt-3">{card.details.map((detail, row) => <DetailRow key={`${detail.label}-${row}`} detail={detail} />)}</div>
    </motion.button>)}
    </div>
  </div>;
}

export function renderRosterExperience(cards: RosterCard[], selectedMonth?: string) {
  const host = document.getElementById('cards');
  if (!host) return;
  if (!root) root = createRoot(host);
  root.render(<Cards cards={cards} selectedMonth={selectedMonth} />);
}
