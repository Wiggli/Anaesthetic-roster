import { createRoot, type Root } from 'react-dom/client';
import { Badge, EmptyState, ListRow, Pressable, Surface } from './ui-system';

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
  return <Surface className={`breakGroup ${className} tw:shadow-none`}>
    <div className="tw:flex tw:items-center tw:justify-between tw:gap-3 tw:px-3.5 tw:py-3">
      <h3 className="tw:m-0 tw:text-sm tw:font-bold">{title}</h3>
      <Badge tone={className.includes('first') ? 'accent' : 'info'}>{names.length || '—'}</Badge>
    </div>
    <div className="tw:divide-y tw:divide-black/7 tw:dark:divide-white/8">
      {names.length
        ? names.map(name => {
            const mine = Boolean(highlightedName) && name.toLocaleLowerCase() === highlightedName.toLocaleLowerCase();
            return <ListRow
              key={name}
              className={`breakPerson ${mine ? 'mine tw:bg-teal-500/7' : ''}`}
              title={name}
              trailing={mine ? <Badge tone="accent" className="breakPersonYou">You</Badge> : undefined}
            />;
          })
        : <EmptyState title="Pending final allocation" />}
    </div>
  </Surface>;
}

function BreakPlan({ model }: { model: BreakSummary }) {
  return <>
    <div className="breakGrid tw:@container tw:grid tw:gap-3 tw:@md:grid-cols-2">
      <BreakGroup className="firstBreak" title="First break" names={model.first} highlightedName={model.highlightedName} />
      <BreakGroup className="secondBreak" title="Second break" names={model.second} highlightedName={model.highlightedName} />
    </div>
    <Surface className="breakGroup lwBreak tw:mt-3 tw:shadow-none">
      <div className="tw:px-3.5 tw:py-3"><h3 className="tw:m-0 tw:text-sm tw:font-bold">Labour Ward / Pager and additional staffing</h3></div>
      <div className="tw:divide-y tw:divide-black/7 tw:dark:divide-white/8">
        {model.notes.length
          ? model.notes.map(note => <ListRow key={note} className="breakNote" title={note} />)
          : <EmptyState title="No additional staffing notes" />}
      </div>
    </Surface>
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
  const taskLabel = model.decisionTasks
    ? (model.taskCount === 1 ? '1 allocation' : `${model.taskCount} allocations`)
    : 'Confirm plan';

  return <section className="nightPulse" aria-label="Selected night status">
    <div className="nightPulseLead">
      <strong>{model.nurseCount}</strong>
      <span>nurses on duty</span>
    </div>
    <div className="nightPulseSignals">
      <Pressable
        type="button"
        className={`nightPulseSignal ${model.absenceCount ? 'attention danger' : 'quiet'}`}
        onClick={() => goToChanges('staffing')}
        aria-label={model.absenceCount ? `${model.absenceCount} absences. Review staffing.` : 'No absences. Review staffing.'}
      >
        <i aria-hidden="true">{model.absenceCount ? model.absenceCount : '✓'}</i>
        <span>{model.absenceCount ? (model.absenceCount === 1 ? 'absence' : 'absences') : 'No absences'}</span>
      </Pressable>
      <Pressable
        type="button"
        className={`nightPulseSignal ${model.overtimeCount ? 'attention' : 'quiet'}`}
        onClick={() => goToChanges('staffing')}
        aria-label={`${model.overtimeCount} overtime nurses. Review staffing.`}
      >
        <i aria-hidden="true">{model.overtimeCount}</i>
        <span>overtime</span>
      </Pressable>
      {model.taskCount
        ? <Pressable
            type="button"
            className="nightPulseSignal attention"
            onClick={model.decisionTasks ? () => goToChanges('allocation') : goToConfirmation}
          >
            <i aria-hidden="true">!</i><span>{taskLabel}</span>
          </Pressable>
        : <div className="nightPulseSignal ready" aria-label="Plan ready">
            <i aria-hidden="true">✓</i><span>Plan ready</span>
          </div>}
    </div>
  </section>;
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
  const title = model.title.toLocaleLowerCase();
  const detail = model.detail.toLocaleLowerCase();
  if (model.action === 'absence' || title.includes('absent') || detail.includes('absent')) return 'absence';
  if (title.includes('pager')) return 'pager';
  if (title.includes('reliever')) return 'reliever';
  if (title.includes('second part')) return 'second';
  if (title.includes('first part')) return 'first';
  if (title.includes('seventh')) return 'seventh';
  if (title.includes('labour')) return 'full';
  if (detail.includes('pager')) return 'pager';
  if (detail.includes('reliever')) return 'reliever';
  if (detail.includes('second part')) return 'second';
  if (detail.includes('first part')) return 'first';
  if (detail.includes('seventh')) return 'seventh';
  if (detail.includes('labour')) return 'full';
  return 'task';
}

function personalMark(tone: string) {
  if (tone === 'first') return '1st';
  if (tone === 'second') return '2nd';
  if (tone === 'pager') return 'Pager';
  if (tone === 'reliever') return 'Relief';
  if (tone === 'seventh') return '7th';
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

  const actionLabel = model.action === 'absence'
    ? 'Review absence'
    : model.action === 'role'
      ? 'View in night situation'
      : 'Choose your name';

  return <article className={`personalHeroSurface nightV2Hero personalRole-${tone}`}>
    <span className="nightV2Aura" aria-hidden="true" />
    <div className="nightV2HeroTop">
      <div className="nightV2Identity">
        <div className={`nightV2Avatar ${model.avatarUrl ? 'hasPhoto' : ''}`} aria-hidden="true">
          {model.avatarUrl ? <img src={model.avatarUrl} alt="" /> : model.initial}<i />
        </div>
        <div className="nightV2IdentityCopy">
          <small>Your night</small>
          <b>{model.displayName}</b>
          {model.jobTitle && <span>{model.jobTitle}</span>}
        </div>
      </div>
      <Pressable type="button" className="nightV2ProfileButton" onClick={openAccount} aria-label="Open your profile">
        <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="3.25" /><path d="M5.5 20c.7-4 3-6 6.5-6s5.8 2 6.5 6" /></svg>
      </Pressable>
    </div>
    <div className="nightV2Assignment">
      <div className="nightV2Kicker">
        <span className="nightV2RoleChip" aria-hidden="true">{personalMark(tone)}</span>
        <span>{model.assignmentLabel}</span>
        {model.changedLabel && <span className="nightV2Changed">{model.changedLabel}</span>}
      </div>
      <h2>{model.title}</h2>
      <p>{model.detail}</p>
    </div>
    <dl className="personalFacts nightV2Facts">
      <div><dt>On duty</dt><dd>{model.period || 'Pending'}</dd></div>
      <div><dt>Break</dt><dd>{model.breakLabel || 'Pending'}</dd></div>
      <div><dt>{model.contextLabel}</dt><dd>{model.context || 'Pending'}</dd></div>
    </dl>
    <Pressable type="button" className="personalContextAction nightV2Action" onClick={action}>
      <span>{actionLabel}</span>
      <svg viewBox="0 0 20 20" aria-hidden="true"><path d="m7 4 6 6-6 6" /></svg>
    </Pressable>
  </article>;
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
    return <div className="emptyRecentActivity">No staffing changes have been recorded for this night.</div>;
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
    <div className="liquidRosterList nightSituationTimeline nightV2Team">
      {model.roles.map(role => <Pressable
        key={role.key}
        type="button"
        onClick={openRoleEditor}
        className={`rosterRow nightTeamRow rosterRow-${role.tone} ${role.mine ? 'mine' : ''}`}
        aria-label={`Change this night's ${role.label} allocation`}
      >
        <span className="rosterRoleMark nightTeamRole">{roleMark(role.tone)}</span>
        <span className="rosterRowCopy nightTeamCopy">
          <span className="rosterRowName nightTeamName">{role.names}</span>
          <span className="rosterRowMeta nightTeamMeta">{role.detail}</span>
        </span>
        {role.mine && <span className="rosterMineLabel nightTeamYou">You</span>}
        <svg className="rosterRowChevron nightTeamChevron" viewBox="0 0 20 20" aria-hidden="true"><path d="m7 4 6 6-6 6" /></svg>
      </Pressable>)}
    </div>
    {model.extras.length > 0 && <div className="additionalStaff nightV2Extras">
      <b>Additional staff</b>
      <small>Allocation as required</small>
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
