import { productHaptic, scrollToProductElement, useProductReducedMotion } from './product-motion';
import { useEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { createRoot, type Root } from 'react-dom/client';
import { Badge, EmptyState, ListRow, Pressable } from './ui-system';

type ClockChangeInfo = {
  direction: 'forward' | 'back';
  title: string;
  transitionLabel: string;
  handover: string;
  handoverDisplay: string;
  firstPeriod: string;
  secondPeriod: string;
  partHours: number;
  partHoursLabel: string;
  totalHours: number;
  totalHoursLabel: string;
  summary: string;
  date: string;
  transitionUtc?: number | null;
  startOffset?: number;
  endOffset?: number;
};

type BreakSummary = {
  date: string;
  formattedDate: string;
  nurseCount: number;
  absenceCount: number;
  pending: boolean;
  pendingReason: string;
  labourPending: boolean;
  first: string[];
  second: string[];
  notes: string[];
  highlightedName: string;
  firstDutyPeriod: string;
  secondDutyPeriod: string;
  clockChange?: ClockChangeInfo | null;
  dutyStartUtc?: number;
  handoverUtc?: number;
  dutyEndUtc?: number;
};

type NightRole = {
  key: string;
  label: string;
  names: string;
  detail: string;
  tone: 'first' | 'second' | 'pager' | 'reliever' | 'seventh' | 'full';
  mine: boolean;
};

type NightSummary = {
  date?: string;
  nurseCount: number;
  absenceCount: number;
  overtimeCount: number;
  overtimeNames?: string[];
  taskCount: number;
  decisionTasks: number;
  confirmNeeded: boolean;
  alert: string;
  firstTask: string;
  labourPending: boolean;
  breakLabel: string;
  chatUnread: number;
  liveState: string;
  roles: NightRole[];
  extras: string[];
  fivePerson?: { name: string; reason: string; mine: boolean };
  clockChange?: ClockChangeInfo | null;
  contextLabel?: string;
  currentPart?: 'first' | 'second' | '';
};

type PersonalNight = {
  date: string;
  displayName: string;
  jobTitle: string;
  avatarUrl: string;
  initial: string;
  assignmentLabel: string;
  title: string;
  detail: string;
  period: string;
  breakLabel: string;
  contextLabel: string;
  context: string;
  changedLabel: string;
  action: 'absence' | 'role' | 'choose';
  pending: boolean;
  pendingOther: string;
  liveStatus: string;
  dutyPart?: 'first' | 'second' | 'full' | '';
  dutyStartUtc?: number;
  handoverUtc?: number;
  dutyEndUtc?: number;
  handoverLabel?: string;
  transitionUtc?: number;
  changed?: boolean;
  clockChange?: ClockChangeInfo | null;
};

type ActivityItem = {
  label: string;
  type: string;
  title: string;
  detail: string;
  meta: string;
};

type RecentActivity = {
  totalCount?: number;
  updated: boolean;
  updatedCount: number;
  sinceLabel: string;
  summary?: string[];
  items: ActivityItem[];
};

declare global {
  interface Window {
    show?: (view: string) => void;
    openChatView?: () => void;
    appNowMs?: () => number;
  }
}

const roots = new Map<string, Root>();

const softHaptic = productHaptic;
const productNowMs = () => window.appNowMs?.() ?? Date.now();

function rootFor(id: string) {
  const host = document.getElementById(id);
  if (!host) return undefined;
  let root = roots.get(id);
  if (!root) {
    root = createRoot(host);
    roots.set(id, root);
  }
  return root;
}

function maltaClock(value: Date) {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/Malta', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
  }).formatToParts(value);
  const bag: Record<string, number> = {};
  parts.forEach(part => { if (part.type !== 'literal') bag[part.type] = Number(part.value); });
  const date = `${bag.year}-${String(bag.month).padStart(2, '0')}-${String(bag.day).padStart(2, '0')}`;
  const operationalDate = bag.hour < 7
    ? new Date(`${date}T12:00:00Z`)
    : undefined;
  if (operationalDate) operationalDate.setUTCDate(operationalDate.getUTCDate() - 1);
  return {
    date: operationalDate ? operationalDate.toISOString().slice(0, 10) : date,
    hour: bag.hour,
    minute: bag.minute || 0
  };
}

function nightProgress(model: PersonalNight, value = new Date()) {
  if (!model.dutyStartUtc || !model.dutyEndUtc) return null;
  const clock = maltaClock(value);
  if (clock.date !== model.date || !(clock.hour < 7 || clock.hour >= 19)) return null;
  const now = value.getTime();
  if (now <= model.dutyStartUtc) return 0;
  if (now >= model.dutyEndUtc) return 100;
  return Math.max(0, Math.min(100, (now - model.dutyStartUtc) / (model.dutyEndUtc - model.dutyStartUtc) * 100));
}

function clockText(value: Date) {
  const p = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/Malta', hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
  }).formatToParts(value);
  const hour = p.find(part => part.type === 'hour')?.value || '00';
  const minute = p.find(part => part.type === 'minute')?.value || '00';
  return hour + ':' + minute;
}

function clockChangePhase(model: PersonalNight, value: Date) {
  if (!model.clockChange || !model.transitionUtc) return '';
  const after = value.getTime() >= model.transitionUtc;
  if (model.clockChange.direction === 'back') return after ? 'winter time' : 'summer time';
  return after ? 'summer time' : 'winter time';
}

function liveClockLabel(model: PersonalNight, value: Date) {
  const clock = maltaClock(value);
  const time = clockText(value);
  if (clock.date !== model.date || !(clock.hour < 7 || clock.hour >= 19)) return '';
  if (model.clockChange?.direction === 'back' && clock.hour === 2 && model.transitionUtc) {
    return (value.getTime() < model.transitionUtc ? 'FIRST ' : 'SECOND ') + time + (value.getTime() < model.transitionUtc ? ' · OLD clock' : ' · NEW clock');
  }
  if (model.clockChange && model.transitionUtc) {
    return time + (value.getTime() < model.transitionUtc ? ' · OLD clock' : ' · NEW clock');
  }
  return time;
}

function clockChangeNowCue(model: PersonalNight, value: Date) {
  if (!model.clockChange || !model.transitionUtc) return null;
  const clock = maltaClock(value);
  if (clock.date !== model.date || !(clock.hour < 7 || clock.hour >= 19)) return null;

  const time = clockText(value);
  const after = value.getTime() >= model.transitionUtc;
  if (model.clockChange.direction === 'back') {
    const repeatedHour = clock.hour === 2;
    return {
      phase: after ? 'new' : 'old',
      flag: after ? 'NEW' : 'OLD',
      eyebrow: repeatedHour
        ? (after ? 'CURRENT TIME · SECOND 02:xx' : 'CURRENT TIME · FIRST 02:xx')
        : 'CURRENT TIME',
      time,
      detail: after
        ? (repeatedHour ? 'Clocks have already gone back. This is the new 02:xx hour now.' : 'Clocks have already gone back. New clock time is in use.')
        : (repeatedHour ? 'Clocks have not gone back yet. This is the first 02:xx hour.' : 'Clocks have not changed yet. Old clock time is still in use.')
    };
  }

  return {
    phase: after ? 'new' : 'old',
    flag: after ? 'NEW' : 'OLD',
    eyebrow: 'CURRENT TIME',
    time,
    detail: after
      ? 'Clocks have moved forward. New clock time is in use.'
      : 'Clocks have not moved forward yet. Old clock time is still in use.'
  };
}

function nightVisualPhase(model: PersonalNight, value = new Date()) {
  const clock = maltaClock(value);
  const operationalDate = clock.hour < 7
    ? new Date(Date.parse(clock.date + 'T12:00:00Z') - 86400000).toISOString().slice(0, 10)
    : clock.date;
  if (operationalDate !== model.date || !(clock.hour < 7 || clock.hour >= 19)) return 'selected';
  if (model.pending || /absent/i.test(model.title)) return 'selected';
  const now = value.getTime();
  if (model.dutyStartUtc && now < model.dutyStartUtc) return 'upcoming';
  if (model.handoverUtc && Math.abs(now - model.handoverUtc) <= 120000) return 'handover';
  if (model.dutyStartUtc && model.handoverUtc && now >= model.dutyStartUtc && now < model.handoverUtc) return 'first';
  if (model.handoverUtc && model.dutyEndUtc && now >= model.handoverUtc && now < model.dutyEndUtc) return 'second';
  if (model.dutyEndUtc && now >= model.dutyEndUtc) return 'complete';
  return 'selected';
}

function goToChanges(target: 'staffing' | 'allocation') {
  softHaptic();
  window.show?.('changes');
  window.setTimeout(() => {
    const selector = target === 'staffing' ? '#changesStaffingPane' : '#changesAllocationPane';
    document.querySelector(selector)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, 180);
}

function goToConfirmation() {
  window.show?.('changes');
  window.setTimeout(() => {
    document.querySelector<HTMLElement>('[data-changes-step="confirm"]')?.click();
  }, 180);
}

function openRoleEditor() {
  goToChanges('allocation');
  window.setTimeout(() => {
    const editor = document.querySelector<HTMLDetailsElement>('.nightRoleEditor');
    if (editor) editor.open = true;
  }, 260);
}

function openAccount() {
  document.getElementById('accountBtn')?.click();
}

function ClockChangeNotice({ info, context }: { info?: ClockChangeInfo | null; context: 'night' | 'breaks' }) {
  const reduced = useProductReducedMotion();
  if (!info) return null;
  return <motion.section
    className={`clockChangeNotice clockChange-${info.direction} clockChange-${context}`}
    role="status"
    aria-label={`${info.transitionLabel}. Equal-duty handover ${info.handoverDisplay}. ${info.partHoursLabel} each.`}
    initial={reduced ? false : { opacity: 0, y: 8, scale: 0.99 }}
    animate={{ opacity: 1, y: 0, scale: 1 }}
    transition={reduced ? { duration: 0 } : { type: 'spring', stiffness: 380, damping: 32, mass: 0.65 }}
  >
    <motion.span
      className="clockChangeGlyph"
      aria-hidden="true"
      initial={reduced ? false : { rotate: info.direction === 'back' ? 28 : -28, scale: 0.9 }}
      animate={{ rotate: 0, scale: 1 }}
      transition={reduced ? { duration: 0 } : { type: 'spring', stiffness: 320, damping: 20 }}
    >
      <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8.5" /><path d="M12 7v5l3 2" /><path d={info.direction === 'back' ? 'M8 4H4v4' : 'M16 4h4v4'} /></svg>
    </motion.span>
    <span className="clockChangeCopy">
      <small>{info.transitionLabel}</small>
      <strong>Equal handover · {info.handoverDisplay}</strong>
      <span>{info.firstPeriod} · {info.partHoursLabel} actual</span>
      <span>{info.secondPeriod} · {info.partHoursLabel} actual</span>
    </span>
    <Pressable
      type="button"
      className="clockChangeLearn"
      onClick={() => window.dispatchEvent(new CustomEvent('roster:clock-change-guide'))}
    >
      Why? <span aria-hidden="true">›</span>
    </Pressable>
  </motion.section>;
}

function BreakSummaryItems({ model }: { model: BreakSummary }) {
  return <>
    <button type="button" className={`breakSummaryItem ${model.absenceCount ? 'absence' : 'ready'}`} onClick={() => goToChanges('staffing')}>
      <b>{model.absenceCount || 'No'}</b><small>{model.absenceCount === 1 ? 'Absence' : 'Absences'}</small>
    </button>
    {model.labourPending
      ? <button type="button" className="breakSummaryItem labour pending" onClick={() => goToChanges('allocation')}>
          <b>Action needed</b><small>Review allocation</small>
        </button>
      : <div className="breakSummaryItem labour ready informational">
          <b>Automatic</b><small>Labour Ward</small>
        </div>}
  </>;
}

function PendingBreakPlan({ model }: { model: BreakSummary }) {
  if (!model.pending) return null;
  return <>
    <b>Break plan pending</b>
    <span>{model.pendingReason}</span>
    <Pressable type="button" className="pendingShortcut" onClick={() => goToChanges('allocation')}>Resolve now ›</Pressable>
  </>;
}

function BreakScheduleSection({
  className,
  ordinal,
  title,
  names,
  highlightedName
}: {
  className: string;
  ordinal: string;
  title: string;
  names: string[];
  highlightedName: string;
}) {
  return <section className={`breakScheduleSection ${className}`} aria-label={title}>
    <div className="breakScheduleHeader">
      <span className="breakScheduleOrdinal" aria-hidden="true">{ordinal}</span>
      <div className="breakScheduleHeadingCopy">
        <h3>{title}</h3>
        <small>{names.length ? `${names.length} nurses` : 'Awaiting allocation'}</small>
      </div>
    </div>
    <div className="breakScheduleRows">
      {names.length
        ? names.map(name => {
            const mine = Boolean(highlightedName) && name.toLocaleLowerCase() === highlightedName.toLocaleLowerCase();
            return <ListRow
              key={name}
              className={`breakPerson ${mine ? 'mine' : ''}`}
              title={name}
              trailing={mine ? <Badge tone="accent" className="breakPersonYou">You</Badge> : undefined}
            />;
          })
        : <EmptyState title="Pending final allocation" />}
    </div>
  </section>;
}

function coverageRow(note: string) {
  const first = note.match(/^First part Labour Ward \/ Pager:\s*(.+?)\s*•\s*(.+?)\.?$/i);
  if (first) return { label: 'First part', value: first[1], detail: first[2] };
  const second = note.match(/^Second part Labour Ward \/ Pager:\s*(.+?)\s*•\s*(.+?)\.?$/i);
  if (second) return { label: 'Second part', value: second[1], detail: second[2] };
  const seventh = note.match(/^(.+?) is the seventh nurse and coordinates a break as required\.?$/i);
  if (seventh) return { label: 'Seventh nurse', value: seventh[1], detail: 'Break as required' };
  const full = note.match(/^(.+?) covers Labour Ward \/ Pager for the full night\./i);
  if (full) return { label: 'Full night', value: full[1], detail: 'Break coordinated with clinical cover' };
  return { label: 'Coverage note', value: note, detail: '' };
}

function jumpToBreak() {
  softHaptic();
  const target = document.querySelector<HTMLElement>('#breakList .breakPerson.mine');
  scrollToProductElement(target);
  target?.classList.add('focusPulse');
  window.setTimeout(() => target?.classList.remove('focusPulse'), 900);
}

function BreakPlan({ model }: { model: BreakSummary }) {
  const hasMine = Boolean(model.highlightedName) && [...model.first, ...model.second].some(name => name.toLocaleLowerCase() === model.highlightedName.toLocaleLowerCase());
  return <>
    {hasMine && <div className="breakPlanTools"><Pressable type="button" className="jumpToMeButton" onClick={jumpToBreak}>Jump to me <span aria-hidden="true">↓</span></Pressable></div>}
    <div className="breakGrid breakScheduleBoard">
      <BreakScheduleSection className="firstBreak" ordinal="1" title="First break" names={model.first} highlightedName={model.highlightedName} />
      <BreakScheduleSection className="secondBreak" ordinal="2" title="Second break" names={model.second} highlightedName={model.highlightedName} />
    </div>
    <section className="breakNotesBlock" aria-labelledby="breakNotesTitle">
      <div className="breakNotesHeading"><span>Additional coverage</span><h3 id="breakNotesTitle">Labour Ward / Pager</h3></div>
      <div className="breakNotesBoard coverageBoard">
        {model.notes.length
          ? model.notes.map(note => {
              const row = coverageRow(note);
              return <div className="coverageRow" key={note}><span>{row.label}</span><strong>{row.value}</strong>{row.detail && <small>{row.detail}</small>}</div>;
            })
          : <EmptyState title="No additional staffing notes" />}
      </div>
    </section>
  </>;
}

function PersonalBreak({ model }: { model: BreakSummary }) {
  const [now,setNow] = useState(productNowMs);
  useEffect(() => {
    let timer: number | undefined;
    const update = () => { clearInterval(timer); if (document.visibilityState === 'visible' && document.body.dataset.view === 'breaks') { setNow(productNowMs()); timer = window.setInterval(() => setNow(productNowMs()),30000); } };
    window.addEventListener('roster:viewchange',update); document.addEventListener('visibilitychange',update); update();
    return () => { clearInterval(timer); window.removeEventListener('roster:viewchange',update); document.removeEventListener('visibilitychange',update); };
  },[]);
  const current = model.dutyStartUtc && model.handoverUtc && model.dutyEndUtc && now >= model.dutyStartUtc && now < model.dutyEndUtc ? (now < model.handoverUtc ? 'first' : 'second') : '';
  const mine = model.highlightedName;
  const first = model.first.some(name => name.toLocaleLowerCase() === mine.toLocaleLowerCase());
  const second = model.second.some(name => name.toLocaleLowerCase() === mine.toLocaleLowerCase());
  const assignment = model.pending ? 'Awaiting allocation' : first ? 'First break' : second ? 'Second break' : 'Check the plan';
  return <section className="personalBreakSummary" aria-label="Your break">
    <span className="personalBreakEyebrow">Your break</span>
    <div className="personalBreakMain">
      <div><h2>{assignment}</h2><p>{model.pending ? model.pendingReason : mine || 'Choose your name in Account to highlight your break.'}</p></div>
      <span className="personalBreakMark" aria-hidden="true">{model.pending ? '…' : first ? '1' : second ? '2' : '·'}</span>
    </div>
    {!model.pending && (first || second) && <p className="breakTogether">With {(first ? model.first : model.second).filter(name => name.toLocaleLowerCase() !== mine.toLocaleLowerCase()).join(', ') || 'your allocated group'}</p>}
    {!model.pending && <div className="breakCompactRail" aria-label="Night break periods">
      <span className={current === 'first' ? 'current' : ''}><b>First break</b><small>{model.firstDutyPeriod}</small><small>{current === 'first' ? 'Current period' : current === 'second' ? 'Earlier period' : 'First Part'}</small></span>
      <span className={current === 'second' ? 'current' : ''}><b>Second break</b><small>{model.secondDutyPeriod}</small><small>{current === 'second' ? 'Current period' : current === 'first' ? 'Upcoming period' : 'Second Part'}</small></span>
    </div>}
    {!model.pending && !first && !second && <small>For full-night Labour Ward cover, coordinate your break when clinical cover allows.</small>}
  </section>;
}

export function renderBreaksExperience(model: BreakSummary) {
  rootFor('breakPersonalSummary')?.render(<PersonalBreak model={model} />);
  rootFor('breakClockChange')?.render(<ClockChangeNotice info={model.clockChange} context="breaks" />);
  rootFor('breakSummaryRow')?.render(<BreakSummaryItems model={model} />);
  const notice = document.getElementById('breakDate');
  if (notice) notice.classList.toggle('hidden', !model.pending);
  rootFor('breakDate')?.render(<PendingBreakPlan model={model} />);
  rootFor('breakList')?.render(<BreakPlan model={model} />);
}

function NightStatus({ model }: { model: NightSummary }) {
  const [feedback,setFeedback] = useState('');
  const previous = useRef(model);
  const feedbackTimer = useRef<number | undefined>(undefined);
  useEffect(() => {
    const before = previous.current; previous.current = model;
    if (before.date !== model.date) { setFeedback(''); clearTimeout(feedbackTimer.current); return; }
    const changedRole = model.roles.find(role => before.roles.find(old => old.key === role.key)?.names !== role.names);
    const oldRole = changedRole && before.roles.find(role => role.key === changedRole.key);
    const message = before.nurseCount !== model.nurseCount ? `${before.nurseCount} nurses → ${model.nurseCount} nurses`
      : oldRole && changedRole ? `${oldRole.names} → ${changedRole.names}`
      : before.currentPart && model.currentPart && before.currentPart !== model.currentPart ? 'First Part → Second Part'
      : before.overtimeCount < model.overtimeCount ? 'Overtime nurse added'
      : before.breakLabel && before.breakLabel !== model.breakLabel ? 'Break allocation updated' : '';
    if (message) { setFeedback(message); clearTimeout(feedbackTimer.current); feedbackTimer.current = window.setTimeout(() => setFeedback(''),4500); }
  },[model]);
  useEffect(() => () => clearTimeout(feedbackTimer.current),[]);
  useEffect(() => {
    const onPhase = (event: Event) => {
      if ((event as CustomEvent).detail?.date !== model.date) return;
      setFeedback('First Part → Second Part'); clearTimeout(feedbackTimer.current);
      feedbackTimer.current = window.setTimeout(() => setFeedback(''),4500);
    };
    window.addEventListener('roster:phase-transition',onPhase);
    return () => window.removeEventListener('roster:phase-transition',onPhase);
  },[model.date]);
  const provisional = model.nurseCount < 5 || Boolean(model.taskCount || model.labourPending);
  const previousReady = useRef({ready: !provisional, date: model.date});
  const completed = !provisional && !previousReady.current.ready && previousReady.current.date === model.date;
  useEffect(() => { previousReady.current = {ready: !provisional, date: model.date}; }, [provisional,model.date]);
  const staffingLabel = [
    `${model.nurseCount} nurses`,
    model.absenceCount ? `${model.absenceCount} absent` : '',
    model.overtimeCount ? `${model.overtimeCount} overtime` : ''
  ].filter(Boolean).join(' · ');
  const hasSpecificDecision = Boolean(model.firstTask || model.labourPending);

  return <section className={'nightSignal ' + (provisional ? 'needsReview' : '')} aria-label="Tonight at a glance">
    <div className="nightTeamStatusLine">
      <span role="status" aria-live="polite" className={feedback ? 'productUpdateText' : 'nightTeamStaffing'}>{feedback || staffingLabel}</span>
      <span className="nightSignalState">
        <span className="nightSignalGlyph" aria-hidden="true">{provisional ? '!' : <svg className={'productStatusCheck' + (completed ? ' justCompleted' : '')} viewBox="0 0 24 24"><path d="m5 12 4 4L19 6" /></svg>}</span>
        <b>{provisional ? 'Review needed' : 'Plan ready'}</b>
      </span>
    </div>
    {model.taskCount > 0 && !hasSpecificDecision && <Pressable type="button" className="nightSignalTask" onClick={model.decisionTasks ? () => goToChanges('allocation') : goToConfirmation}>
      Review {model.taskCount} {model.decisionTasks ? (model.taskCount === 1 ? 'allocation' : 'allocations') : 'confirmation'} →
    </Pressable>}
  </section>;
}

function NightAlerts({ model }: { model: NightSummary }) {
  const needsReview = model.nurseCount < 5 || Boolean(model.taskCount || model.labourPending);
  const hasSpecificDecision = Boolean(model.firstTask || model.labourPending);
  return <>
    {model.alert && !hasSpecificDecision && needsReview && <div className="alert compactNotice warn">{model.alert}</div>}
    {model.firstTask && <button type="button" className="decisionTaskCard" onClick={() => goToChanges('allocation')}>
      <span className="decisionTaskMark" aria-hidden="true">!</span>
      <span className="decisionTaskCopy"><small>Allocation decision</small><b>{model.firstTask}</b><strong>Review allocation</strong></span>
      <i aria-hidden="true">›</i>
    </button>}
    {model.labourPending && <button type="button" className="decisionTaskCard" onClick={() => goToChanges('allocation')}>
      <span className="decisionTaskMark" aria-hidden="true">!</span>
      <span className="decisionTaskCopy"><small>Labour Ward</small><b>Choose the Labour Ward order</b><strong>Review allocation</strong></span>
      <i aria-hidden="true">›</i>
    </button>}
  </>;
}

function personalTone(model: PersonalNight) {
  const text = `${model.title} ${model.detail}`.toLocaleLowerCase();
  if (model.action === 'absence' || text.includes('absent')) return 'absence';
  if (text.includes('full night')) return 'full';
  if (text.includes('pager')) return 'pager';
  if (text.includes('reliever')) return 'reliever';
  if (text.includes('first part')) return 'first';
  if (text.includes('second part')) return 'second';
  if (text.includes('seventh')) return 'seventh';
  if (text.includes('labour')) return 'full';
  return 'task';
}

function personalMark(tone: string) {
  if (tone === 'first') return '1st';
  if (tone === 'second') return '2nd';
  if (tone === 'pager') return 'P';
  if (tone === 'reliever') return 'R';
  if (tone === 'seventh') return '7';
  if (tone === 'full') return 'LW';
  if (tone === 'absence') return '!';
  return '•';
}

function NightTimeline({ model, value }: { model: PersonalNight; value: Date }) {
  const reduced = useProductReducedMotion();
  const progress = nightProgress(model, value);
  const start = model.dutyStartUtc || 0;
  const end = model.dutyEndUtc || 0;
  const duration = Math.max(1, end - start);
  const handoverPct = model.handoverUtc ? (model.handoverUtc - start) / duration * 100 : 50;
  const transitionPct = model.transitionUtc ? (model.transitionUtc - start) / duration * 100 : null;
  const firstMine = model.dutyPart === 'first';
  const secondMine = model.dutyPart === 'second';
  const liveLabel = liveClockLabel(model, value);
  const currentSide = progress === null
    ? firstMine ? 'Your First Part' : secondMine ? 'Your Second Part' : 'Duty orientation'
    : progress < handoverPct ? 'First Part now' : 'Second Part now';
  const openClockHelp = () => { if (model.clockChange) window.dispatchEvent(new CustomEvent('roster:clock-change-guide')); };

  return <section
    className={'nightProgressRail nightTimeline nightTimelineBlue ' + (model.clockChange ? 'hasClockChange' : '')}
    aria-label={model.clockChange ? 'Clock-change night timeline with equal-duty handover.' : 'Night timeline from 00:00 to 07:00.'}
  >
    <div className="nightTimelineHead">
      <span><small>Night timeline</small><b>{currentSide}</b></span>
      {liveLabel && <motion.em
        key={liveLabel}
        initial={reduced ? false : { opacity: 0, y: 3 }}
        animate={{ opacity: 1, y: 0 }}
        transition={reduced ? { duration: 0 } : { duration: 0.18 }}
      >{liveLabel}</motion.em>}
    </div>

    <button
      type="button"
      className="nightTimelineTrackShell nightTimelineSlimRail"
      onClick={openClockHelp}
      disabled={!model.clockChange}
      aria-label={model.clockChange ? 'Explain this clock-change timeline' : 'Night duty timeline'}
    >
      <span className="nightTimelineBase" aria-hidden="true" />
      <span className={'nightTimelineOwnBand first ' + (firstMine ? 'mine' : '')} style={{ left: '0%', width: handoverPct + '%' }} aria-hidden="true" />
      <span className={'nightTimelineOwnBand second ' + (secondMine ? 'mine' : '')} style={{ left: handoverPct + '%', width: (100 - handoverPct) + '%' }} aria-hidden="true" />
      {progress !== null && <motion.span
        className="nightTimelineFill"
        aria-hidden="true"
        initial={false}
        style={{ width: '100%', transformOrigin: 'left center' }}
        animate={{ scaleX: progress / 100 }}
        transition={reduced ? { duration: 0 } : { type: 'spring', stiffness: 150, damping: 26, mass: 0.72 }}
      />}
      <span className="nightTimelineHandover" style={{ left: handoverPct + '%' }}>
        <i />
        {model.clockChange && <b>Equal duty</b>}
      </span>
      {transitionPct !== null && <span className={'nightTimelineTransition ' + (model.clockChange?.direction || '')} style={{ left: transitionPct + '%' }}>
        <i>{model.clockChange?.direction === 'back' ? '↶' : '↗'}</i>
        <b>{model.clockChange?.direction === 'back' ? 'Clock back' : 'Clock forward'}</b>
      </span>}
      {progress !== null && <motion.span
        className="nightTimelineNow"
        aria-hidden="true"
        initial={false}
        style={{ left: progress + '%' }}
        animate={{ opacity: 1 }}
        transition={reduced ? { duration: 0 } : { type: 'spring', stiffness: 160, damping: 28, mass: 0.7 }}
      ><i /></motion.span>}
    </button>

    <div className="nightTimelinePhaseLabels" aria-hidden="true">
      <span className={firstMine ? 'mine' : ''} style={{ width: handoverPct + '%' }}>First Part</span>
      <span className={secondMine ? 'mine' : ''} style={{ width: (100 - handoverPct) + '%' }}>Second Part</span>
    </div>

    <div className={'nightTimelineScale ' + (model.clockChange?.direction || 'normal')}>
      <span className="timelineStart">00:00</span>
      {model.clockChange?.direction === 'back' && <>
        <span className="dstMark" style={{ left: '25%' }}>02:00¹</span>
        <span className="dstMark" style={{ left: (transitionPct || 37.5) + '%' }}>02:00²</span>
      </>}
      {model.clockChange?.direction === 'forward' && <span className="dstJumpMark" style={{ left: (transitionPct || 33.33) + '%' }}>02:00 → 03:00</span>}
      <span className="handoverScale" style={{ left: handoverPct + '%' }}>{model.clockChange?.handover || model.handoverLabel || '03:30'}</span>
      <span className="timelineEnd">07:00</span>
    </div>

    {model.clockChange?.direction === 'back' && <div className="nightTimelineExplain">
      <span><b>02:00¹</b> first 02:xx · summer time</span>
      <span><b>02:00²</b> second 02:xx · winter time</span>
    </div>}
    {model.clockChange?.direction === 'forward' && <div className="nightTimelineExplain">
      <span><b>02:00 → 03:00</b> skipped hour compressed on the rail</span>
    </div>}
  </section>;
}

function PersonalNightCard({ model }: { model: PersonalNight }) {
  const reducedMotion = useProductReducedMotion();
  const [now, setNow] = useState(productNowMs);
  const previousNow = useRef(now);

  useEffect(() => {
    let timer: number | undefined;
    const update = () => {
      window.clearInterval(timer);
      if (document.visibilityState !== 'visible' || document.body.dataset.view !== 'today') return;
      setNow(productNowMs()); timer = window.setInterval(() => setNow(productNowMs()), 30000);
    };
    document.addEventListener('visibilitychange', update); window.addEventListener('roster:viewchange', update); update();
    return () => { window.clearInterval(timer); document.removeEventListener('visibilitychange', update); window.removeEventListener('roster:viewchange', update); };
  }, []);

  useEffect(() => {
    if (model.handoverUtc && previousNow.current < model.handoverUtc && now >= model.handoverUtc && now < (model.dutyEndUtc || 0) && document.visibilityState === 'visible') {
      softHaptic(); window.dispatchEvent(new CustomEvent('roster:phase-transition',{detail:{date:model.date}}));
    }
    previousNow.current = now;
  }, [now, model.handoverUtc]);

  useEffect(() => {
    const host = document.getElementById('today');
    if (!host) return;
    host.dataset.shiftPhase = nightVisualPhase(model, new Date(now));
    return () => { delete host.dataset.shiftPhase; };
  }, [model.date, model.title, model.pending, model.dutyStartUtc, model.handoverUtc, model.dutyEndUtc, now]);

  const value = new Date(now);
  const clockNowCue = clockChangeNowCue(model, value);
  const tone = personalTone(model);
  const scanContextLabel = model.contextLabel === 'Working with' ? 'Colleague' : model.contextLabel;
  const scanContext = model.context.replace(/^With\s+/i, '');
  const dutyLabel = model.dutyPart === 'first'
    ? 'First Part'
    : model.dutyPart === 'second'
      ? 'Second Part'
      : model.dutyPart === 'full'
        ? 'Full night'
        : model.period || 'Pending';

  const openNameSetup = () => {
    softHaptic();
    openAccount();
  };

  const openBreak = () => { softHaptic(); window.show?.('breaks'); };
  const openColleague = () => {
    softHaptic();
    const details = document.querySelector<HTMLDetailsElement>('#today .nightTeamDetails');
    details?.setAttribute('open', '');
    const rows = Array.from(document.querySelectorAll<HTMLElement>('#roles .rosterRow'));
    const target = rows.find(row => scanContext && row.textContent?.toLocaleLowerCase().includes(scanContext.toLocaleLowerCase())) || rows.find(row => row.classList.contains('mine')) || details;
    scrollToProductElement(target);
    target?.classList.add('focusPulse');
    window.setTimeout(() => target?.classList.remove('focusPulse'), 900);
  };
  const openDutyTiming = () => {
    softHaptic();
    if (model.clockChange) window.dispatchEvent(new CustomEvent('roster:clock-change-guide'));
    else scrollToProductElement(document.querySelector<HTMLElement>('#personalNightCard .nightTimeline'));
  };
  const openClockGuide = () => {
    softHaptic();
    window.dispatchEvent(new CustomEvent('roster:clock-change-guide'));
  };

  return <motion.article
    className={'personalHeroSurface personalHeroCompact personalRole-' + tone}
    initial={reducedMotion ? false : { opacity: 0.97, y: 4 }}
    animate={{ opacity: 1, y: 0 }}
    transition={reducedMotion ? { duration: 0 } : { duration: 0.18, ease: [0.2, 0.8, 0.2, 1] }}
  >
    <div className="personalIdentity personalIdentityAssistive">
      <span>{model.displayName}</span>
      {model.jobTitle && <small>{model.jobTitle}</small>}
    </div>

    <div className="personalAssignmentStage">
      {model.changedLabel && <div className="personalHeroMeta personalHeroMetaBadgesOnly">
        <span className="personalHeroMetaBadges">
          <span className="personalChangedBadge">{model.changedLabel}</span>
        </span>
      </div>}

      <div className={'personalAssignmentHero personalAssignmentHeroCompact personalRole-' + tone}>
        <span className="personalRoleIcon" aria-hidden="true">{personalMark(tone)}</span>
        <span className="personalRoleCopy">
          <b>{model.title}</b>
          <span>{model.detail}</span>
        </span>
      </div>

      {clockNowCue && <div
        className={'personalClockNow personalClockNow-' + clockNowCue.phase}
        role="status"
        aria-live="polite"
        aria-label={clockNowCue.eyebrow + '. ' + clockNowCue.time + '. ' + clockNowCue.detail}
      >
        <span className="personalClockNowFlag">{clockNowCue.flag}</span>
        <span className="personalClockNowCopy">
          <small>{clockNowCue.eyebrow}</small>
          <strong>{clockNowCue.time}</strong>
          <span>{clockNowCue.detail}</span>
        </span>
        <span className="personalClockNowBadge">NOW</span>
      </div>}

      {model.clockChange && <Pressable type="button" className="personalClockException" onClick={openClockGuide}>
        <span className="personalClockExceptionIcon" aria-hidden="true">{model.clockChange.direction === 'back' ? '↶' : '↗'}</span>
        <span className="personalClockExceptionCopy">
          <small>Clock-change night · equal duty</small>
          <strong>Handover {model.clockChange.handoverDisplay || model.clockChange.handover}</strong>
          <span>{model.clockChange.summary}</span>
        </span>
        <i aria-hidden="true">›</i>
      </Pressable>}

      <NightTimeline model={model} value={value} />

      <div className="personalHeroFactGrid" aria-label="Your night at a glance">
        <Pressable type="button" className="personalHeroFact personalFactButton" onClick={openDutyTiming}>
          <small>Duty</small>
          <b>{dutyLabel}</b>
          <span>{model.clockChange ? model.clockChange.partHoursLabel + ' actual' : 'See timeline'}</span>
        </Pressable>
        <Pressable type="button" className="personalHeroFact personalFactButton" onClick={openBreak}>
          <small>Break</small>
          <b>{model.breakLabel || 'Pending'}</b>
          <span>Open Breaks</span>
        </Pressable>
        <Pressable type="button" className="personalHeroFact personalFactButton" onClick={openColleague}>
          <small>{scanContextLabel || 'Colleague'}</small>
          <b>{scanContext || 'Team'}</b>
          <span>Team allocation</span>
        </Pressable>
      </div>

      {model.action === 'choose' && <Pressable type="button" className="personalContextAction personalHeroPrimaryAction" onClick={openNameSetup}>
        Choose your name
        <span aria-hidden="true">›</span>
      </Pressable>}
    </div>
  </motion.article>;
}

function PersonalPending({ model }: { model: PersonalNight }) {
  if (!model.pending) return null;
  return <Pressable type="button" className="personalTaskCard" onClick={() => goToChanges('allocation')}>
    <span>
      <b>Your allocation is not final yet</b>
      <small>Labour Ward / Pager is shared with {model.pendingOther}.</small>
      <strong>Complete allocation ›</strong>
    </span>
  </Pressable>;
}

function RecentActivityList({ model }: { model: RecentActivity }) {
  if (!model.items.length) {
    return <div className="emptyRecentActivity">
      <span className="nightOverviewIcon nightOverviewIconSuccess" aria-hidden="true">✓</span>
      <span><b>No changes tonight</b><small>No shared staffing or allocation changes are recorded.</small></span>
    </div>;
  }
  return <div className="activityTimeline">
    {(model.totalCount || 0) > model.items.length && <small className="nightRecentLimit">Latest {model.items.length} changes; open Changes for the full history.</small>}
    {model.updated && model.updatedCount > 0 && <div className="recentActivityDigest" role="status">
      <span className="recentActivityDigestMark" aria-hidden="true">↻</span>
      <span><b>{model.updatedCount} {model.updatedCount === 1 ? 'change' : 'changes'} since {model.sinceLabel || 'you last opened Night'}</b><small>{model.summary?.join(' · ') || 'Review the latest shared staffing and allocation updates below.'}</small><span className="returnSummaryActions"><Pressable type="button" onClick={() => { window.dispatchEvent(new CustomEvent('roster:activity-acknowledge')); goToChanges('staffing'); }}>Review updates</Pressable><Pressable type="button" onClick={() => window.dispatchEvent(new CustomEvent('roster:activity-acknowledge'))}>Got it</Pressable></span></span>
    </div>}
    {model.items.map((item, index) => {
      const type = item.type.toLocaleLowerCase();
      const glyph = type.includes('overtime') ? '+' : type.includes('absence') ? '−' : type.includes('allocation') || type.includes('role') ? '↔' : '·';
      return <Pressable
        key={`${item.type}-${item.title}-${item.meta}-${index}`}
        type="button"
        className="recentActivityRow"
        onClick={() => window.dispatchEvent(new CustomEvent('roster:activity-open', { detail: { index } }))}
        aria-label={`View details for ${item.title}`}
      >
        <span className={`activityTimelineMark ${item.type}`} aria-hidden="true">{glyph}</span>
        <span className="recentActivityCopy">
          <b>{item.title}</b>
          <small className="recentActivityMeta">{item.meta}</small>
        </span>
        <i aria-hidden="true">›</i>
      </Pressable>;
    })}
  </div>;
}

export function renderPersonalNightExperience(model: PersonalNight) {
  rootFor('personalNightCard')?.render(<PersonalNightCard model={model} />);
  rootFor('personalAllocationNotice')?.render(<PersonalPending model={model} />);
}

export function renderRecentActivityExperience(model: RecentActivity) {
  const list = document.getElementById('recentActivityList');
  const panel = list?.closest<HTMLElement>('.recentActivityPanel');
  if (panel) panel.hidden = model.items.length === 0;
  const count = document.getElementById('nightActivityCount');
  if (count) count.textContent = ' · ' + (model.totalCount ?? model.items.length);
  rootFor('recentActivityList')?.render(<RecentActivityList model={model} />);
  const chip = document.getElementById('changedSinceChip');
  if (chip) {
    chip.classList.toggle('hidden', !model.updated);
    chip.textContent = model.updated ? (model.updatedCount ? `${model.updatedCount} new` : 'Updated') : 'Updated';
  }
}

function roleMark(tone: NightRole['tone']) {
  if (tone === 'first') return '1st';
  if (tone === 'second') return '2nd';
  if (tone === 'pager') return 'Pager';
  if (tone === 'reliever') return 'Reliever';
  if (tone === 'seventh') return '7th';
  return 'Full night';
}

function roleLiveState(role: NightRole, currentPart?: NightSummary['currentPart']) {
  if (!currentPart) return '';
  if (role.tone === 'first') return currentPart === 'first' ? 'Now' : 'Complete';
  if (role.tone === 'second') return currentPart === 'first' ? 'Next' : 'Now';
  return '';
}

function NightRoles({ model }: { model: NightSummary }) {
  const hasMine = model.roles.some(role => role.mine);
  const jumpToMine = () => {
    softHaptic();
    const target = document.querySelector<HTMLElement>('#roles .rosterRow.mine,#fiveArrangement .fiveNurseSurface.mine');
    scrollToProductElement(target);
    target?.classList.add('focusPulse');
    window.setTimeout(() => target?.classList.remove('focusPulse'), 900);
  };
  return <>
    {hasMine && <div className="nightRoleTools"><Pressable type="button" className="jumpToMeButton" onClick={jumpToMine}>Jump to me <span aria-hidden="true">↓</span></Pressable></div>}
    <div className="liquidRosterList nightSituationTimeline">
      {model.roles.map(role => {
        const liveState = roleLiveState(role, model.currentPart);
        return <div className="rosterRoleLine" key={role.key}><Pressable
          data-colleague-names={role.names}
          type="button"
          onClick={openRoleEditor}
          className={`rosterRow rosterRow-${role.tone} ${role.mine ? 'mine' : ''}`}
          aria-label={`Change this night's ${role.label} allocation`}
        >
          <span className="rosterRoleMark">{roleMark(role.tone)}</span>
          <span className="rosterRowCopy">
            <span className="rosterRowName">
              <span className="rosterRowPeople">{role.names}</span>
            </span>
            <span className="rosterRowMeta">{role.label} · {role.detail}</span>
          </span>
          {(role.mine || liveState) && <span className="rosterRowBadges">
            {role.mine && <Badge tone="accent" className="rosterYouBadge">You</Badge>}
            {liveState && <Badge tone={liveState === 'Now' ? 'success' : 'info'} className="rosterLiveBadge">{liveState}</Badge>}
          </span>}
        </Pressable><Pressable type="button" className="roleShortcutButton" aria-label={`Shortcuts for ${role.names}`} onClick={() => window.dispatchEvent(new CustomEvent('roster:colleague-shortcuts', { detail: { names: role.names } }))}>•••</Pressable></div>;
      })}
    </div>
    {model.extras.length > 0 && <div className="additionalStaff">
      <b>Additional staff · allocation as required</b>
      {model.extras.map(name => <span key={name} className="additionalName">{name}</span>)}
    </div>}
  </>;
}

function FivePersonArrangement({ model }: { model: NightSummary }) {
  const arrangement = model.fivePerson;
  if (!arrangement) return null;
  return <Pressable
    type="button"
    className={`fiveNurseSurface ${arrangement.mine ? 'mine' : ''}`}
    onClick={openRoleEditor}
    aria-label={`Change the full-night Labour Ward or Pager allocation for ${arrangement.name}`}
  >
    <span className="fiveNurseLabel">Five-nurse arrangement · Full night</span>
    <strong>{arrangement.name}</strong>
    <p>{arrangement.reason}</p>
    <small>Labour Ward / Pager · 00:00–07:00 · Break coordinated when clinical cover allows</small>
    <i aria-hidden="true">›</i>
  </Pressable>;
}

export function renderNightExperience(model: NightSummary) {
  rootFor('nightClockChange')?.render(<ClockChangeNotice info={model.clockChange} context="night" />);
  rootFor('nightStatusRow')?.render(<NightStatus model={model} />);
  rootFor('alerts')?.render(<NightAlerts model={model} />);
  rootFor('roles')?.render(<NightRoles model={model} />);
  rootFor('fiveArrangement')?.render(<FivePersonArrangement model={model} />);
}
