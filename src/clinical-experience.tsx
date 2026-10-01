import { useEffect, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
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
  nurseCount: number;
  absenceCount: number;
  overtimeCount: number;
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
  updated: boolean;
  updatedCount: number;
  sinceLabel: string;
  items: ActivityItem[];
};

declare global {
  interface Window {
    show?: (view: string) => void;
    openChatView?: () => void;
  }
}

const roots = new Map<string, Root>();

function softHaptic() {
  try {
    if ('vibrate' in navigator && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) navigator.vibrate(8);
  } catch {
    // Haptics are an optional enhancement only.
  }
}

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
    return (value.getTime() < model.transitionUtc ? 'First ' : 'Second ') + time + ' · ' + clockChangePhase(model, value);
  }
  if (model.clockChange) return time + ' · ' + clockChangePhase(model, value);
  return time;
}

function personalLiveStatus(model: PersonalNight, value = new Date()) {
  const clock = maltaClock(value);
  if (clock.date !== model.date || !(clock.hour < 7 || clock.hour >= 19)) return model.liveStatus;
  const now = value.getTime();
  if (/absent/i.test(model.title)) return 'Not on duty tonight';
  if (model.pending || /pending/i.test(model.period)) return 'Allocation pending';
  if (model.dutyPart === 'first' && model.dutyStartUtc && model.handoverUtc) {
    if (now < model.dutyStartUtc) return 'On duty next · starts 00:00';
    return now < model.handoverUtc ? 'First Part active' : 'Duty block complete';
  }
  if (model.dutyPart === 'second' && model.handoverUtc && model.dutyEndUtc) {
    if (now < model.handoverUtc) return 'Second Part later · starts ' + (model.handoverLabel || '03:30');
    return now < model.dutyEndUtc ? 'Second Part active' : 'Duty block complete';
  }
  if (model.period === '00:00–07:00') return 'Full-night cover active';
  if (/seventh/i.test(model.title)) return 'Supporting tonight’s team';
  return model.liveStatus;
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

function nextNightMessage(model: PersonalNight, value: Date) {
  if (model.pending) return { eyebrow: 'What matters next', title: 'Allocation still pending', detail: 'Open Changes to complete the shared plan.' };
  if (/absent/i.test(model.title)) return { eyebrow: 'Tonight', title: 'No duty block', detail: 'You are recorded as not working this night.' };
  if (!model.dutyStartUtc || !model.handoverUtc || !model.dutyEndUtc) return { eyebrow: 'Your night', title: model.period || 'Selected night', detail: model.breakLabel || '' };
  const clock = maltaClock(value);
  const liveNight = clock.date === model.date && (clock.hour < 7 || clock.hour >= 19);
  if (!liveNight) return { eyebrow: 'Handover', title: model.handoverLabel || '03:30', detail: (model.period || '') + ' · ' + (model.breakLabel || '') };
  const now = value.getTime();
  const handover = model.handoverUtc;
  if (now < model.dutyStartUtc) {
    if (model.dutyPart === 'first') return { eyebrow: 'What matters next', title: 'First Part starts at 00:00', detail: 'Handover at ' + (model.handoverLabel || '03:30') + ' · ' + model.breakLabel };
    if (model.dutyPart === 'second') return { eyebrow: 'What matters next', title: 'Take over at ' + (model.handoverLabel || '03:30'), detail: (model.period || '') + ' · ' + model.breakLabel };
    return { eyebrow: 'What matters next', title: 'Night duty starts at 00:00', detail: model.period || '' };
  }
  if (Math.abs(now - handover) <= 120000) return { eyebrow: 'Handover now', title: 'Second Part starts', detail: 'Equal-duty handover · ' + (model.handoverLabel || '03:30') };
  if (now < handover) {
    if (model.dutyPart === 'first') return { eyebrow: 'Now', title: 'First Part active', detail: 'Handover at ' + (model.handoverLabel || '03:30') + ' · ' + model.breakLabel };
    if (model.dutyPart === 'second') return { eyebrow: 'What matters next', title: 'Take over at ' + (model.handoverLabel || '03:30'), detail: model.breakLabel };
    return { eyebrow: 'Now', title: 'First Part active', detail: 'Handover at ' + (model.handoverLabel || '03:30') };
  }
  if (now < model.dutyEndUtc) {
    if (model.dutyPart === 'first') return { eyebrow: 'Your duty', title: 'Duty block complete', detail: model.breakLabel };
    if (model.dutyPart === 'second') return { eyebrow: 'Now', title: 'Second Part active', detail: 'Until 07:00 · ' + model.breakLabel };
    return { eyebrow: 'Now', title: 'Second Part active', detail: 'Night continues until 07:00' };
  }
  return { eyebrow: 'Your duty', title: 'Night block complete', detail: model.breakLabel };
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
  const reduced = useReducedMotion();
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
    <button type="button" className="breakSummaryItem staffing" onClick={() => goToChanges('staffing')}>
      <b>{model.nurseCount}</b><small>Nurses</small>
    </button>
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
  target?.scrollIntoView({ behavior: 'smooth', block: 'center' });
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
  const mine = model.highlightedName;
  const first = model.first.some(name => name.toLocaleLowerCase() === mine.toLocaleLowerCase());
  const second = model.second.some(name => name.toLocaleLowerCase() === mine.toLocaleLowerCase());
  const assignment = model.pending ? 'Awaiting allocation' : first ? 'First break' : second ? 'Second break' : 'Check the plan';
  return <section className="personalBreakSummary" aria-label="Your break">
    <span className="personalBreakEyebrow">Your break · {model.formattedDate}</span>
    <div className="personalBreakMain">
      <div><h2>{assignment}</h2><p>{model.pending ? model.pendingReason : mine || 'Choose your name in Account to highlight your break.'}</p></div>
      <span className="personalBreakMark" aria-hidden="true">{model.pending ? '…' : first ? '1' : second ? '2' : '·'}</span>
    </div>
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
  const provisional = model.nurseCount < 5 || Boolean(model.taskCount || model.labourPending);
  const [chatUnread, setChatUnread] = useState(model.chatUnread);
  const [liveState, setLiveState] = useState(model.liveState);
  useEffect(() => {
    const sync = () => {
      const badge = document.getElementById('chatUnreadBadge');
      setChatUnread(Number(badge?.textContent || 0) || 0);
      const live = document.querySelector<HTMLElement>('#personalNightCard .personalLiveState span');
      if (live?.textContent) setLiveState(live.textContent);
    };
    sync();
    const observer = new MutationObserver(sync);
    const badge = document.getElementById('chatUnreadBadge');
    const personal = document.getElementById('personalNightCard');
    if (badge) observer.observe(badge, { childList: true, attributes: true, subtree: true });
    if (personal) observer.observe(personal, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [model.chatUnread, model.liveState]);
  const absenceLabel = model.absenceCount ? `${model.absenceCount} ${model.absenceCount === 1 ? 'absence' : 'absences'}` : 'No absences';
  const overtimeLabel = model.overtimeCount ? `${model.overtimeCount} overtime` : 'No overtime';
  const openBreaks = () => { softHaptic(); window.show?.('breaks'); };
  const openChat = () => { softHaptic(); window.show?.('chat'); window.openChatView?.(); };
  return <section className={'nightSignal ' + (provisional ? 'needsReview' : '')} aria-label="Tonight at a glance">
    <div className="nightContextLine"><span className={'nightContextCapsule ' + (provisional ? 'review' : model.clockChange ? 'clock' : 'standard')}><i aria-hidden="true" />{model.contextLabel || 'Standard night'}</span><small>{provisional ? 'Shared plan needs attention' : model.clockChange ? 'Equal-duty timing active' : 'Calculated shared plan'}</small></div>
    <div className="nightSignalPrimary">
      <span className="nightOverviewIcon" aria-hidden="true">
        <svg viewBox="0 0 24 24"><path d="M8.5 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z" /><path d="M2.5 20c.4-4 2.7-6 6-6s5.6 2 6 6" /><path d="M16.5 10a3 3 0 1 0 0-6" /><path d="M16.5 14c2.8 0 4.5 1.6 5 4.5" /></svg>
      </span>
      <span className="nightSignalLeadCopy">
        <small>Team tonight</small>
        <strong>{model.nurseCount} nurses</strong>
        <span>{absenceLabel} · {overtimeLabel}</span>
      </span>
      <span className="nightSignalState">
        <i className="nightSignalGlyph" aria-hidden="true">{provisional ? '!' : '✓'}</i>
        <b>{provisional ? 'Review needed' : 'Plan ready'}</b>
      </span>
    </div>
    <div className="nightQuickStrip" aria-label="Quick night status">
      <span className="nightQuickItem current"><small>Now</small><b>{liveState || 'Night selected'}</b></span>
      <Pressable type="button" className="nightQuickItem" onClick={openBreaks}><small>Your break</small><b>{model.breakLabel || 'Check plan'}</b></Pressable>
      <Pressable type="button" className="nightQuickItem" onClick={openChat}><small>Chat</small><b>{chatUnread ? `${chatUnread} unread` : 'No unread'}</b></Pressable>
    </div>
    {model.taskCount > 0 && <Pressable type="button" className="nightSignalTask" onClick={model.decisionTasks ? () => goToChanges('allocation') : goToConfirmation}>
      Review {model.taskCount} {model.decisionTasks ? (model.taskCount === 1 ? 'allocation' : 'allocations') : 'confirmation'} →
    </Pressable>}
  </section>;
}

function NightAlerts({ model }: { model: NightSummary }) {
  const needsReview = model.nurseCount < 5 || Boolean(model.taskCount || model.labourPending);
  const informationalParts = !needsReview && model.alert ? model.alert.split(':') : [];
  const infoTitle = informationalParts.length > 1 ? informationalParts.shift()?.trim() : 'Night arrangement';
  const infoDetail = informationalParts.length ? informationalParts.join(':').trim() : model.alert;
  return <>
    {model.alert && (needsReview
      ? <div className="alert compactNotice warn">{model.alert}</div>
      : <div className="alert compactNotice informational nightContextNotice"><span className="nightContextIcon" aria-hidden="true">i</span><span><b>{infoTitle}</b><small>{infoDetail}</small></span></div>)}
    {model.firstTask && <button type="button" className="alert gold taskAlert" onClick={() => goToChanges('allocation')}>
      <b>{model.firstTask}</b><span>Complete now ›</span>
    </button>}
    {model.labourPending && <button type="button" className="alert gold taskAlert" onClick={() => goToChanges('allocation')}>
      <b>Choose the Labour Ward order</b><span>Complete now ›</span>
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
  const reduced = useReducedMotion();
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

  return <section className={'nightProgressRail nightTimeline nightTimelineBlue ' + (model.clockChange ? 'hasClockChange' : '')} aria-label={'Night timeline from 00:00 to 07:00. Handover ' + (model.handoverLabel || '03:30') + '.'}>
    <div className="nightTimelineHead">
      <span><small>Night timeline</small><b>{currentSide}</b></span>
      {liveLabel && <motion.em
        key={liveLabel}
        initial={reduced ? false : { opacity: 0, y: 3 }}
        animate={{ opacity: 1, y: 0 }}
        transition={reduced ? { duration: 0 } : { duration: 0.18 }}
      >{liveLabel}</motion.em>}
    </div>

    <button type="button" className="nightTimelineTrackShell nightTimelineSlimRail" onClick={openClockHelp} disabled={!model.clockChange} aria-label={model.clockChange ? 'Explain this clock-change timeline' : 'Night duty timeline'}>
      <span className="nightTimelineBase" aria-hidden="true" />
      <span
        className={'nightTimelineOwnBand first ' + (firstMine ? 'mine' : '')}
        style={{ left: '0%', width: handoverPct + '%' }}
        aria-hidden="true"
      />
      <span
        className={'nightTimelineOwnBand second ' + (secondMine ? 'mine' : '')}
        style={{ left: handoverPct + '%', width: (100 - handoverPct) + '%' }}
        aria-hidden="true"
      />
      {progress !== null && <motion.span
        className="nightTimelineFill"
        aria-hidden="true"
        initial={false}
        animate={{ width: progress + '%' }}
        transition={reduced ? { duration: 0 } : { type: 'spring', stiffness: 150, damping: 26, mass: 0.72 }}
      />}
      <span className="nightTimelineHandover" style={{ left: handoverPct + '%' }}><i /><b>Handover</b></span>
      {transitionPct !== null && <span className={'nightTimelineTransition ' + (model.clockChange?.direction || '')} style={{ left: transitionPct + '%' }}><i>{model.clockChange?.direction === 'back' ? '↶' : '↗'}</i><b>{model.clockChange?.direction === 'back' ? 'Clock back' : 'Clock forward'}</b></span>}
      {progress !== null && <motion.span
        className="nightTimelineNow"
        aria-hidden="true"
        initial={false}
        animate={{ left: progress + '%' }}
        transition={reduced ? { duration: 0 } : { type: 'spring', stiffness: 160, damping: 28, mass: 0.7 }}
      ><i /></motion.span>}
    </button>

    <div className="nightTimelinePhaseLabels" aria-hidden="true">
      <span className={firstMine ? 'mine' : ''} style={{ width: handoverPct + '%' }}>First Part</span>
      <span className={secondMine ? 'mine' : ''} style={{ width: (100 - handoverPct) + '%' }}>Second Part</span>
    </div>

    <div className={'nightTimelineScale ' + (model.clockChange?.direction || 'normal')}>
      <span style={{ left: '0%' }}>00:00</span>
      {model.clockChange?.direction === 'back' && <>
        <span className="dstMark" style={{ left: '25%' }}>02:00¹</span>
        <span className="dstMark" style={{ left: (transitionPct || 37.5) + '%' }}>02:00²</span>
      </>}
      {model.clockChange?.direction === 'forward' && <span className="dstJumpMark" style={{ left: (transitionPct || 33.33) + '%' }}>02:00 → 03:00</span>}
      <span className="handoverScale" style={{ left: handoverPct + '%' }}>{model.clockChange?.handover || model.handoverLabel || '03:30'}</span>
      <span style={{ left: '100%' }}>07:00</span>
    </div>
    {model.clockChange?.direction === 'back' && <div className="nightTimelineExplain"><span><b>02:00¹</b> first 02:xx · summer time</span><span><b>02:00²</b> second 02:xx · winter time</span></div>}
    {model.clockChange?.direction === 'forward' && <div className="nightTimelineExplain"><span><b>02:00 → 03:00</b> skipped hour compressed on the rail</span></div>}
  </section>;
}

function PersonalNightCard({ model }: { model: PersonalNight }) {
  const reducedMotion = useReducedMotion();
  const [now, setNow] = useState(() => Date.now());
  const previousNow = useRef(now);
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 30000);
    return () => window.clearInterval(timer);
  }, []);
  useEffect(() => {
    if (model.handoverUtc && previousNow.current < model.handoverUtc && now >= model.handoverUtc && document.visibilityState === 'visible') softHaptic();
    previousNow.current = now;
  }, [now, model.handoverUtc]);
  useEffect(() => {
    const host = document.getElementById('today');
    if (!host) return;
    host.dataset.shiftPhase = nightVisualPhase(model, new Date(now));
    return () => { delete host.dataset.shiftPhase; };
  }, [model.date, model.title, model.pending, model.dutyStartUtc, model.handoverUtc, model.dutyEndUtc, now]);
  const value = new Date(now);
  const tone = personalTone(model);
  const liveStatus = personalLiveStatus(model, value);
  const next = nextNightMessage(model, value);
  const scanContextLabel = model.contextLabel === 'Working with' ? 'Colleague' : model.contextLabel;
  const scanContext = model.context.replace(/^With\s+/i, '');
  const action = () => {
    if (model.action === 'choose') return openAccount();
    if (model.action === 'absence') return goToChanges('staffing');
    document.querySelector<HTMLDetailsElement>('#today .nightTeamDetails')?.setAttribute('open', '');
    const target = document.querySelector<HTMLElement>('#roles .rosterRow.mine,#fiveArrangement .fiveNurseSurface.mine');
    target?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    target?.focus({ preventScroll: true });
  };
  const openBreak = () => { softHaptic(); window.show?.('breaks'); };
  const openColleague = () => {
    softHaptic();
    document.querySelector<HTMLDetailsElement>('#today .nightTeamDetails')?.setAttribute('open', '');
    const rows = Array.from(document.querySelectorAll<HTMLElement>('#roles .rosterRow'));
    const target = rows.find(row => scanContext && row.textContent?.toLocaleLowerCase().includes(scanContext.toLocaleLowerCase())) || rows.find(row => row.classList.contains('mine'));
    target?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    target?.classList.add('focusPulse');
    window.setTimeout(() => target?.classList.remove('focusPulse'), 900);
  };
  const openDutyTiming = () => {
    softHaptic();
    if (model.clockChange) window.dispatchEvent(new CustomEvent('roster:clock-change-guide'));
    else document.querySelector<HTMLElement>('#personalNightCard .nightTimeline')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  return <motion.article
    className={'personalHeroSurface personalRole-' + tone}
    initial={reducedMotion ? false : { opacity: 0.94, y: 6, scale: 0.994 }}
    animate={{ opacity: 1, y: 0, scale: 1 }}
    transition={reducedMotion ? { duration: 0 } : { type: 'spring', stiffness: 360, damping: 34, mass: 0.7 }}
  >
    <div className="personalIdentity">
      <div className={'personalAvatar ' + (model.avatarUrl ? 'hasPhoto' : '')} aria-hidden="true">
        {model.avatarUrl ? <img src={model.avatarUrl} alt="" /> : model.initial}
      </div>
      <div className="personalIdentityCopy">
        <b>{model.displayName}</b>
        {model.jobTitle && <small>{model.jobTitle}</small>}
      </div>
      <Pressable type="button" className="personalChangeBtn" onClick={openAccount} aria-label="Edit your personal Night view">Edit</Pressable>
    </div>

    <div className="personalAssignmentStage">
      <div className={'personalAssignmentHero personalRole-' + tone}>
        <span className="personalRoleIcon" aria-hidden="true">{personalMark(tone)}</span>
        <span className="personalRoleCopy">
          <small>{model.assignmentLabel}</small>
          <b>{model.title}</b>
          <span>{model.detail}</span>
        </span>
        {model.changedLabel && <span className="personalChangedBadge">{model.changedLabel}</span>}
      </div>

      <div className="personalLiveContext" aria-live="polite">
        {liveStatus && <span className="personalLiveState"><i aria-hidden="true" /><b>{liveStatus}</b></span>}
        {model.clockChange && <span className="personalClockBadge">Clock change</span>}
        {model.changed && <span className="personalNightChanged">Changed tonight</span>}
      </div>

      <motion.div
        className="personalNextState personalNextStateIntegrated"
        key={next.eyebrow + '-' + next.title}
        initial={reducedMotion ? false : { opacity: 0.6, y: 5 }}
        animate={{ opacity: 1, y: 0 }}
        transition={reducedMotion ? { duration: 0 } : { duration: 0.22 }}
      >
        <span className="personalNextIndicator" aria-hidden="true"><i /></span>
        <span className="personalNextCopy">
          <small>{next.eyebrow}</small>
          <strong>{next.title}</strong>
          <span>{next.detail}</span>
        </span>
      </motion.div>

      <NightTimeline model={model} value={value} />

      <div className="personalFacts personalScan personalFactButtons" aria-label="Your night at a glance">
        <Pressable type="button" className="personalFactButton personalFactContext" onClick={openColleague}>
          <small>{scanContextLabel}</small><b>{scanContext || 'Pending'}</b><span>View in team allocation ›</span>
        </Pressable>
        <Pressable type="button" className="personalFactButton" onClick={openDutyTiming}>
          <small>On duty</small><b>{model.period || 'Pending'}</b><span>{model.clockChange ? model.clockChange.partHoursLabel + ' actual duty · Explain ›' : 'View timeline ›'}</span>
        </Pressable>
        <Pressable type="button" className="personalFactButton" onClick={openBreak}>
          <small>Break</small><b>{model.breakLabel || 'Pending'}</b><span>Open Breaks ›</span>
        </Pressable>
      </div>

      <Pressable type="button" className="personalContextAction" onClick={action}>
        {model.action === 'absence' ? 'Review absence' : model.action === 'role' ? 'View in night situation' : 'Choose your name'}
        <span aria-hidden="true">›</span>
      </Pressable>
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
    {model.updated && model.updatedCount > 0 && <div className="recentActivityDigest">
      <span className="recentActivityDigestMark" aria-hidden="true">↻</span>
      <span><b>{model.updatedCount} {model.updatedCount === 1 ? 'change' : 'changes'} since {model.sinceLabel || 'you last opened Night'}</b><small>Review the latest shared staffing and allocation updates below.</small></span>
    </div>}
    {model.items.map((item, index) => <Pressable
      key={`${item.type}-${item.title}-${item.meta}-${index}`}
      type="button"
      className="recentActivityRow"
      onClick={() => window.dispatchEvent(new CustomEvent('roster:activity-open', { detail: { index } }))}
      aria-label={`View details for ${item.title}`}
    >
      <span className={`activityType ${item.type}`}>{item.label}</span>
      <span className="recentActivityCopy">
        <b>{item.title}</b>
        {item.detail && <small className="recentActivityDetail">{item.detail}</small>}
        <small className="recentActivityMeta">{item.meta}</small>
      </span>
      <i aria-hidden="true">›</i>
    </Pressable>)}
  </div>;
}

function NightBreakShortcut({ model }: { model: PersonalNight }) {
  return <Pressable type="button" className="nightOverviewShortcut nightBreakShortcut" onClick={() => { softHaptic(); window.show?.('breaks'); }}>
    <span className="nightOverviewIcon" aria-hidden="true">
      <svg viewBox="0 0 24 24"><path d="M5 9h12v5a5 5 0 0 1-5 5h-2a5 5 0 0 1-5-5Z" /><path d="M17 11h2a2 2 0 0 1 0 4h-2" /><path d="M8 6c0-1 1-1 1-2M12 6c0-1 1-1 1-2" /></svg>
    </span>
    <span className="nightOverviewShortcutCopy"><small>Your break</small><strong>{model.breakLabel || 'Pending'}</strong><span>Open the full break plan</span></span>
    <i aria-hidden="true">›</i>
  </Pressable>;
}

export function renderPersonalNightExperience(model: PersonalNight) {
  rootFor('personalNightCard')?.render(<PersonalNightCard model={model} />);
  rootFor('personalAllocationNotice')?.render(<PersonalPending model={model} />);
  rootFor('nightBreakShortcut')?.render(<NightBreakShortcut model={model} />);
}

export function renderRecentActivityExperience(model: RecentActivity) {
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
    target?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    target?.classList.add('focusPulse');
    window.setTimeout(() => target?.classList.remove('focusPulse'), 900);
  };
  return <>
    {hasMine && <div className="nightRoleTools"><Pressable type="button" className="jumpToMeButton" onClick={jumpToMine}>Jump to me <span aria-hidden="true">↓</span></Pressable></div>}
    <div className="liquidRosterList nightSituationTimeline">
      {model.roles.map(role => <Pressable
        key={role.key}
        type="button"
        onClick={openRoleEditor}
        className={`rosterRow rosterRow-${role.tone} ${role.mine ? 'mine' : ''}`}
        aria-label={`Change this night's ${role.label} allocation`}
      >
        <span className="rosterRoleMark">{roleMark(role.tone)}</span>
        <span className="rosterRowCopy">
          <span className="rosterRowName">{role.names}{role.mine && <Badge tone="accent" className="rosterYouBadge">You</Badge>}{roleLiveState(role, model.currentPart) && <Badge tone={roleLiveState(role, model.currentPart) === 'Now' ? 'success' : 'info'} className="rosterLiveBadge">{roleLiveState(role, model.currentPart)}</Badge>}</span>
          <span className="rosterRowMeta">{role.label} · {role.detail}</span>
        </span>
      </Pressable>)}
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
