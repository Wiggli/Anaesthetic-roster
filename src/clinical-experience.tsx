import { motion, useReducedMotion } from 'motion/react';
import { createRoot, type Root } from 'react-dom/client';
import { Badge, EmptyState, ListRow, Pressable } from './ui-system';

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
  roles: NightRole[];
  extras: string[];
  fivePerson?: { name: string; reason: string; mine: boolean };
};

type PersonalNight = {
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
  items: ActivityItem[];
};

declare global {
  interface Window {
    show?: (view: string) => void;
  }
}

const roots = new Map<string, Root>();

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

function goToChanges(target: 'staffing' | 'allocation') {
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

function BreakPlan({ model }: { model: BreakSummary }) {
  return <>
    <div className="breakGrid breakScheduleBoard">
      <BreakScheduleSection className="firstBreak" ordinal="1" title="First break" names={model.first} highlightedName={model.highlightedName} />
      <BreakScheduleSection className="secondBreak" ordinal="2" title="Second break" names={model.second} highlightedName={model.highlightedName} />
    </div>
    <section className="breakNotesBlock" aria-labelledby="breakNotesTitle">
      <div className="breakNotesHeading"><span>Additional coverage</span><h3 id="breakNotesTitle">Labour Ward / Pager</h3></div>
      <div className="breakNotesBoard">
        <div className="tw:divide-y tw:divide-black/7 tw:dark:divide-white/8">
          {model.notes.length
            ? model.notes.map(note => <ListRow key={note} className="breakNote" title={note} />)
            : <EmptyState title="No additional staffing notes" />}
        </div>
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
  rootFor('breakSummaryRow')?.render(<BreakSummaryItems model={model} />);
  const notice = document.getElementById('breakDate');
  if (notice) notice.classList.toggle('hidden', !model.pending);
  rootFor('breakDate')?.render(<PendingBreakPlan model={model} />);
  rootFor('breakList')?.render(<BreakPlan model={model} />);
}

function NightStatus({ model }: { model: NightSummary }) {
  const provisional = model.nurseCount < 5 || Boolean(model.alert || model.taskCount || model.labourPending);
  const absenceLabel = model.absenceCount ? `${model.absenceCount} ${model.absenceCount === 1 ? 'absence' : 'absences'}` : 'No absences';
  const overtimeLabel = model.overtimeCount ? `${model.overtimeCount} overtime` : '0 overtime';
  return <div className={`nightSignal ${provisional ? 'needsReview' : ''}`} aria-label="Team staffing and plan status">
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
    {model.taskCount > 0 && <Pressable type="button" className="nightSignalTask" onClick={model.decisionTasks ? () => goToChanges('allocation') : goToConfirmation}>
      Review {model.taskCount} {model.decisionTasks ? (model.taskCount === 1 ? 'allocation' : 'allocations') : 'confirmation'} →
    </Pressable>}
  </div>;
}

function NightAlerts({ model }: { model: NightSummary }) {
  return <>
    {model.alert && <div className="alert compactNotice warn">{model.alert}</div>}
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

function PersonalNightCard({ model }: { model: PersonalNight }) {
  const reducedMotion = useReducedMotion();
  const tone = personalTone(model);
  const scanContextLabel = model.contextLabel === 'Working with' ? 'Colleague' : model.contextLabel;
  const scanContext = model.context.replace(/^With\\s+/i, '');
  const action = () => {
    if (model.action === 'choose') return openAccount();
    if (model.action === 'absence') return goToChanges('staffing');
    document.querySelector<HTMLDetailsElement>('#today .nightTeamDetails')?.setAttribute('open', '');
    const target = document.querySelector<HTMLElement>('#roles .rosterRow.mine,#fiveArrangement .fiveNurseSurface.mine');
    target?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    target?.focus({ preventScroll: true });
  };

  return <motion.article
    className={`personalHeroSurface personalRole-${tone}`}
    initial={reducedMotion ? false : { opacity: 0.94, y: 6, scale: 0.994 }}
    animate={{ opacity: 1, y: 0, scale: 1 }}
    transition={reducedMotion ? { duration: 0 } : { type: 'spring', stiffness: 360, damping: 34, mass: 0.7 }}
  >
    <div className="personalIdentity">
      <div className={`personalAvatar ${model.avatarUrl ? 'hasPhoto' : ''}`} aria-hidden="true">
        {model.avatarUrl ? <img src={model.avatarUrl} alt="" /> : model.initial}
      </div>
      <div className="personalIdentityCopy">
        <b>{model.displayName}</b>
        {model.jobTitle && <small>{model.jobTitle}</small>}
      </div>
      <Pressable type="button" className="personalChangeBtn" onClick={openAccount} aria-label="Edit your personal Night view">Edit</Pressable>
    </div>

    <div className="personalAssignmentStage">
      <div className={`personalAssignmentHero personalRole-${tone}`}>
        <span className="personalRoleIcon" aria-hidden="true">{personalMark(tone)}</span>
        <span className="personalRoleCopy">
          <small>{model.assignmentLabel}</small>
          <b>{model.title}</b>
          <span>{model.detail}</span>
        </span>
        {model.changedLabel && <span className="personalChangedBadge">{model.changedLabel}</span>}
      </div>

      <dl className="personalFacts personalScan" aria-label="Your night at a glance">
        <div className="personalFactContext"><dt><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="9" cy="8" r="3" /><path d="M3.5 19c.4-3.5 2.4-5.2 5.5-5.2s5.1 1.7 5.5 5.2" /><path d="M17 6.5a2.5 2.5 0 1 1 0 5" /><path d="M17 14.5c2.2.4 3.4 1.8 3.6 4" /></svg>{scanContextLabel}</dt><dd>{scanContext || 'Pending'}</dd></div>
        <div><dt><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8" /><path d="M12 7v5l3.5 2" /></svg>On duty</dt><dd>{model.period || 'Pending'}</dd></div>
        <div><dt><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 9h11v5a5 5 0 0 1-5 5h-1a5 5 0 0 1-5-5Z" /><path d="M16 11h2a2 2 0 0 1 0 4h-2" /></svg>Break</dt><dd>{model.breakLabel || 'Pending'}</dd></div>
      </dl>

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
  return <Pressable type="button" className="nightOverviewShortcut nightBreakShortcut" onClick={() => window.show?.('breaks')}>
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
    chip.textContent = model.updated ? 'Updated since last opened' : 'Updated';
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

function NightRoles({ model }: { model: NightSummary }) {
  return <>
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
          <span className="rosterRowName">{role.names}</span>
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
  rootFor('nightStatusRow')?.render(<NightStatus model={model} />);
  rootFor('alerts')?.render(<NightAlerts model={model} />);
  rootFor('roles')?.render(<NightRoles model={model} />);
  rootFor('fiveArrangement')?.render(<FivePersonArrangement model={model} />);
}
