import { createRoot, type Root } from 'react-dom/client';
import { Metric } from './liquid-ui';

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
    <button type="button" className="pendingShortcut" onClick={() => goToChanges('allocation')}>Resolve now ›</button>
  </>;
}

function BreakGroup({
  className,
  title,
  names,
  highlightedName
}: {
  className: string;
  title: string;
  names: string[];
  highlightedName: string;
}) {
  return <div className={`breakGroup ${className}`}>
    <h3>{title}</h3>
    {names.length
      ? names.map(name => {
          const mine = Boolean(highlightedName) && name.toLocaleLowerCase() === highlightedName.toLocaleLowerCase();
          return <div key={name} className={`breakPerson${mine ? ' mine' : ''}`}>
            <span>{name}</span>{mine && <small className="breakPersonYou">You</small>}
          </div>;
        })
      : <div className="breakNote">Pending final allocation</div>}
  </div>;
}

function BreakPlan({ model }: { model: BreakSummary }) {
  return <>
    <div className="breakGrid">
      <BreakGroup className="firstBreak" title="First break" names={model.first} highlightedName={model.highlightedName} />
      <BreakGroup className="secondBreak" title="Second break" names={model.second} highlightedName={model.highlightedName} />
    </div>
    <div className="breakGroup lwBreak">
      <h3>Labour Ward / Pager and additional staffing</h3>
      {model.notes.map(note => <div key={note} className="breakNote">{note}</div>)}
    </div>
  </>;
}

export function renderBreaksExperience(model: BreakSummary) {
  rootFor('breakSummaryRow')?.render(<BreakSummaryItems model={model} />);
  const notice = document.getElementById('breakDate');
  if (notice) notice.classList.toggle('hidden', !model.pending);
  rootFor('breakDate')?.render(<PendingBreakPlan model={model} />);
  rootFor('breakList')?.render(<BreakPlan model={model} />);
}

function NightStatus({ model }: { model: NightSummary }) {
  return <div className="metricGrid nightMetricRail">
    <Metric label="Nurses" value={String(model.nurseCount)} tone="teal" />
    <Metric
      label={model.absenceCount === 1 ? 'Absence' : 'Absences'}
      value={model.absenceCount ? String(model.absenceCount) : 'No'}
      tone={model.absenceCount ? 'critical' : 'teal'}
      onClick={() => goToChanges('staffing')}
    />
    <Metric
      label="Overtime"
      value={String(model.overtimeCount)}
      tone={model.overtimeCount ? 'warning' : 'neutral'}
      onClick={() => goToChanges('staffing')}
    />
    {model.taskCount
      ? <Metric
          label={model.decisionTasks ? (model.taskCount === 1 ? 'Allocation' : 'Allocations') : 'Confirmation'}
          value={`Review ${model.taskCount}`}
          tone="warning"
          onClick={model.decisionTasks ? () => goToChanges('allocation') : goToConfirmation}
        />
      : <Metric label="Plan" value="Ready" tone="teal" />}
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
  if (text.includes('first part')) return 'first';
  if (text.includes('second part')) return 'second';
  if (text.includes('pager')) return 'pager';
  if (text.includes('reliever')) return 'reliever';
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
  const tone = personalTone(model);
  const action = () => {
    if (model.action === 'choose') return openAccount();
    if (model.action === 'absence') return goToChanges('staffing');
    const target = document.querySelector<HTMLElement>('#roles .rosterRow.mine,#fiveArrangement .fiveNurseSurface.mine');
    target?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    target?.focus({ preventScroll: true });
  };

  return <article className={`personalHeroSurface personalRole-${tone}`}>
    <div className="personalIdentity">
      <div className={`personalAvatar ${model.avatarUrl ? 'hasPhoto' : ''}`} aria-hidden="true">
        {model.avatarUrl ? <img src={model.avatarUrl} alt="" /> : model.initial}<i />
      </div>
      <div className="personalIdentityCopy">
        <b>{model.displayName}</b>
        {model.jobTitle && <small>{model.jobTitle}</small>}
      </div>
      <button type="button" className="personalChangeBtn" onClick={openAccount} aria-label="Edit your personal Night view">Edit</button>
    </div>
    <div className={`personalAssignmentHero personalRole-${tone}`}>
      <span className="personalRoleIcon" aria-hidden="true">{personalMark(tone)}</span>
      <span className="personalRoleCopy">
        <small>{model.assignmentLabel}</small>
        <b>{model.title}</b>
        <span>{model.detail}</span>
      </span>
      {model.changedLabel && <span className="personalChangedBadge">{model.changedLabel}</span>}
    </div>
    <dl className="personalFacts">
      <div><dt>Time</dt><dd>{model.period || 'Pending'}</dd></div>
      <div><dt>Break</dt><dd>{model.breakLabel || 'Pending'}</dd></div>
      <div><dt>{model.contextLabel}</dt><dd>{model.context || 'Pending'}</dd></div>
    </dl>
    <button type="button" className="personalContextAction" onClick={action}>
      {model.action === 'absence' ? 'Review absence' : model.action === 'role' ? 'View in night situation' : 'Choose your name'}
      <span aria-hidden="true">›</span>
    </button>
  </article>;
}

function PersonalPending({ model }: { model: PersonalNight }) {
  if (!model.pending) return null;
  return <button type="button" className="personalTaskCard" onClick={() => goToChanges('allocation')}>
    <span>
      <b>Your allocation is not final yet</b>
      <small>Labour Ward / Pager is shared with {model.pendingOther}.</small>
      <strong>Complete allocation ›</strong>
    </span>
  </button>;
}

function RecentActivityList({ model }: { model: RecentActivity }) {
  if (!model.items.length) {
    return <div className="emptyRecentActivity">No staffing changes have been recorded for this night.</div>;
  }
  return <div className="activityTimeline">
    {model.items.map((item, index) => <button
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
    </button>)}
  </div>;
}

export function renderPersonalNightExperience(model: PersonalNight) {
  rootFor('personalNightCard')?.render(<PersonalNightCard model={model} />);
  rootFor('personalAllocationNotice')?.render(<PersonalPending model={model} />);
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
      {model.roles.map(role => <button
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
      </button>)}
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
  return <button
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
  </button>;
}

export function renderNightExperience(model: NightSummary) {
  rootFor('nightStatusRow')?.render(<NightStatus model={model} />);
  rootFor('alerts')?.render(<NightAlerts model={model} />);
  rootFor('roles')?.render(<NightRoles model={model} />);
  rootFor('fiveArrangement')?.render(<FivePersonArrangement model={model} />);
}
