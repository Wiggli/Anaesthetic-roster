import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { createRoot, type Root } from 'react-dom/client';

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

type ActivityItem = { label: string; type: string; title: string; detail: string; meta: string };
type RecentActivity = { updated: boolean; items: ActivityItem[] };

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
    const tab = document.querySelector<HTMLElement>('[data-changes-step="confirm"]');
    tab?.click();
  }, 180);
}

function SummaryCard({ label, value, tone, onClick }: {
  label: string;
  value: string;
  tone: 'teal' | 'amber' | 'blue';
  onClick?: () => void;
}) {
  const Component = onClick ? motion.button : motion.div;
  const toneClass = tone === 'amber'
    ? 'tw:border-amber-400/35 tw:bg-amber-400/10'
    : tone === 'blue'
      ? 'tw:border-sky-400/30 tw:bg-sky-400/10'
      : 'tw:border-teal-400/30 tw:bg-teal-400/10';
  return <Component
    type={onClick ? 'button' : undefined}
    onClick={onClick}
    whileTap={onClick ? { scale: 0.985 } : undefined}
    className={`tw:min-w-0 tw:rounded-2xl tw:border tw:p-3 tw:text-left ${toneClass}`}
  >
    <strong className="tw:block tw:text-[1.02rem] tw:leading-tight">{value}</strong>
    <span className="tw:mt-1 tw:block tw:text-xs tw:font-semibold tw:tracking-wide tw:text-[var(--muted)]">{label}</span>
  </Component>;
}

function BreakSummaryCards({ model }: { model: BreakSummary }) {
  return <div className="tw:grid tw:grid-cols-3 tw:gap-2" aria-label="Break plan status">
    <SummaryCard label="Nurses" value={String(model.nurseCount)} tone="teal" onClick={() => goToChanges('staffing')} />
    <SummaryCard
      label={model.absenceCount === 1 ? 'Absence' : 'Absences'}
      value={model.absenceCount ? String(model.absenceCount) : 'None'}
      tone={model.absenceCount ? 'amber' : 'teal'}
      onClick={() => goToChanges('staffing')}
    />
    <SummaryCard
      label="Labour Ward"
      value={model.labourPending ? 'Review' : 'Ready'}
      tone={model.labourPending ? 'amber' : 'blue'}
      onClick={model.labourPending ? () => goToChanges('allocation') : undefined}
    />
  </div>;
}

function PendingBreakPlan({ model }: { model: BreakSummary }) {
  return <AnimatePresence initial={false}>
    {model.pending && <motion.section
      key={model.pendingReason}
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      className="tw:mt-3 tw:flex tw:items-center tw:justify-between tw:gap-3 tw:rounded-2xl tw:border tw:border-amber-400/40 tw:bg-amber-400/10 tw:p-4"
      role="status"
    >
      <div className="tw:min-w-0">
        <strong className="tw:block">Break plan pending</strong>
        <span className="tw:mt-1 tw:block tw:text-sm tw:leading-snug tw:text-[var(--muted)]">{model.pendingReason}</span>
      </div>
      <motion.button
        type="button"
        whileTap={{ scale: 0.97 }}
        onClick={() => goToChanges('allocation')}
        className="tw:shrink-0 tw:rounded-full tw:bg-[var(--accent)] tw:px-3 tw:py-2 tw:text-sm tw:font-bold tw:text-white"
      >Review</motion.button>
    </motion.section>}
  </AnimatePresence>;
}

function BreakGroup({ title, time, names, highlightedName, delay }: {
  title: string;
  time: string;
  names: string[];
  highlightedName: string;
  delay: number;
}) {
  const reduced = useReducedMotion();
  return <motion.section
    initial={reduced ? false : { opacity: 0, y: 7 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: reduced ? 0 : 0.22, delay: reduced ? 0 : delay }}
    className="tw:relative tw:overflow-hidden tw:rounded-[22px] tw:border tw:border-black/8 tw:bg-[var(--card)] tw:p-4 tw:shadow-sm tw:dark:border-white/10"
  >
    <div className="tw:flex tw:items-start tw:justify-between tw:gap-3">
      <div>
        <h3 className="tw:text-base tw:font-bold">{title}</h3>
        <p className="tw:mt-0.5 tw:text-xs tw:font-semibold tw:text-[var(--muted)]">{time}</p>
      </div>
      <span className="tw:rounded-full tw:bg-[var(--surface)] tw:px-2.5 tw:py-1 tw:text-xs tw:font-bold tw:text-[var(--muted)]">
        {names.length || 'Pending'}
      </span>
    </div>
    <div className="tw:mt-3 tw:grid tw:gap-2">
      {names.length ? names.map(name => {
        const mine = highlightedName && name.toLocaleLowerCase() === highlightedName.toLocaleLowerCase();
        return <motion.div
          layout
          key={name}
          className={`tw:flex tw:items-center tw:gap-2 tw:rounded-xl tw:px-3 tw:py-2.5 tw:text-sm tw:font-semibold ${mine ? 'tw:bg-teal-500/14 tw:text-[var(--accent-strong)]' : 'tw:bg-[var(--surface)]'}`}
        >
          <span className={`tw:h-2 tw:w-2 tw:rounded-full ${mine ? 'tw:bg-teal-500' : 'tw:bg-[var(--muted)]/45'}`} aria-hidden="true" />
          {name}
          {mine && <span className="tw:ml-auto tw:text-[0.68rem] tw:font-bold tw:uppercase tw:tracking-wider">You</span>}
        </motion.div>;
      }) : <div className="tw:rounded-xl tw:bg-[var(--surface)] tw:px-3 tw:py-3 tw:text-sm tw:text-[var(--muted)]">Pending final allocation</div>}
    </div>
  </motion.section>;
}

function BreakPlan({ model }: { model: BreakSummary }) {
  return <div className="tw:grid tw:gap-3">
    <div className="tw:grid tw:gap-3 tw:md:grid-cols-2">
      <BreakGroup title="First break" time="00:00–03:30 off duty" names={model.first} highlightedName={model.highlightedName} delay={0} />
      <BreakGroup title="Second break" time="03:30–07:00 off duty" names={model.second} highlightedName={model.highlightedName} delay={0.035} />
    </div>
    <motion.section
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="tw:rounded-[22px] tw:border tw:border-black/8 tw:bg-[var(--card)] tw:p-4 tw:dark:border-white/10"
    >
      <div className="tw:flex tw:items-center tw:justify-between tw:gap-3">
        <h3 className="tw:text-base tw:font-bold">Labour Ward and additional staffing</h3>
        <span className="tw:rounded-full tw:bg-sky-500/12 tw:px-2.5 tw:py-1 tw:text-xs tw:font-bold tw:text-sky-700 tw:dark:text-sky-300">Live plan</span>
      </div>
      <div className="tw:mt-3 tw:grid tw:gap-2">
        {model.notes.map(note => <p key={note} className="tw:rounded-xl tw:bg-[var(--surface)] tw:px-3 tw:py-2.5 tw:text-sm tw:leading-relaxed tw:text-[var(--muted)]">{note}</p>)}
      </div>
    </motion.section>
  </div>;
}

export function renderBreaksExperience(model: BreakSummary) {
  rootFor('breakSummaryRow')?.render(<BreakSummaryCards model={model} />);
  rootFor('breakDate')?.render(<PendingBreakPlan model={model} />);
  rootFor('breakList')?.render(<BreakPlan model={model} />);
}

function NightStatus({ model }: { model: NightSummary }) {
  const items = [
    { label: 'Nurses', value: String(model.nurseCount), tone: 'teal' as const },
    { label: model.absenceCount === 1 ? 'Absence' : 'Absences', value: model.absenceCount ? String(model.absenceCount) : 'None', tone: model.absenceCount ? 'amber' as const : 'teal' as const, action: () => goToChanges('staffing') },
    { label: 'Overtime', value: String(model.overtimeCount), tone: 'blue' as const, action: () => goToChanges('staffing') },
    model.taskCount
      ? { label: model.decisionTasks ? 'Allocation' : 'Confirmation', value: `Review ${model.taskCount}`, tone: 'amber' as const, action: model.decisionTasks ? () => goToChanges('allocation') : goToConfirmation }
      : { label: 'Plan', value: 'Ready', tone: 'teal' as const }
  ];
  return <div className="tw:grid tw:grid-cols-2 tw:gap-2 tw:sm:grid-cols-4" aria-label="Selected night summary">
    {items.map(item => <SummaryCard key={item.label} label={item.label} value={item.value} tone={item.tone} onClick={item.action} />)}
  </div>;
}

function NightAlerts({ model }: { model: NightSummary }) {
  const messages = [
    model.alert && { title: model.alert, action: undefined },
    model.firstTask && { title: model.firstTask, action: () => goToChanges('allocation') },
    model.labourPending && { title: 'Choose the Labour Ward order', action: () => goToChanges('allocation') }
  ].filter(Boolean) as { title: string; action?: () => void }[];
  return <AnimatePresence initial={false}>
    {messages.length > 0 && <motion.div layout className="tw:mt-3 tw:grid tw:gap-2">
      {messages.map(message => {
        const Component = message.action ? motion.button : motion.div;
        return <Component
          layout
          key={message.title}
          type={message.action ? 'button' : undefined}
          onClick={message.action}
          whileTap={message.action ? { scale: 0.99 } : undefined}
          className="tw:flex tw:w-full tw:items-center tw:justify-between tw:gap-3 tw:rounded-2xl tw:border tw:border-amber-400/35 tw:bg-amber-400/10 tw:px-4 tw:py-3 tw:text-left"
        >
          <strong className="tw:text-sm tw:leading-snug">{message.title}</strong>
          {message.action && <span className="tw:shrink-0 tw:text-sm tw:font-bold tw:text-[var(--accent)]">Review ›</span>}
        </Component>;
      })}
    </motion.div>}
  </AnimatePresence>;
}

const roleTone: Record<NightRole['tone'], string> = {
  first: 'tw:bg-indigo-500/12 tw:text-indigo-700 tw:dark:text-indigo-300',
  second: 'tw:bg-violet-500/12 tw:text-violet-700 tw:dark:text-violet-300',
  pager: 'tw:bg-amber-500/12 tw:text-amber-700 tw:dark:text-amber-300',
  reliever: 'tw:bg-teal-500/12 tw:text-teal-700 tw:dark:text-teal-300',
  seventh: 'tw:bg-sky-500/12 tw:text-sky-700 tw:dark:text-sky-300',
  full: 'tw:bg-rose-500/12 tw:text-rose-700 tw:dark:text-rose-300'
};

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

function PersonalNightCard({ model }: { model: PersonalNight }) {
  const action = () => {
    if (model.action === 'choose') return openAccount();
    if (model.action === 'absence') return goToChanges('staffing');
    const target = document.querySelector<HTMLElement>('#roles .role.mine,#fiveArrangement .role.mine');
    target?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    target?.focus({ preventScroll: true });
  };
  return <motion.article layout className="tw:overflow-hidden tw:rounded-[24px] tw:border tw:border-black/8 tw:bg-[var(--card)] tw:shadow-sm tw:dark:border-white/10">
    <div className="tw:flex tw:items-center tw:gap-3 tw:p-4">
      <div className="tw:relative tw:flex tw:h-12 tw:w-12 tw:shrink-0 tw:items-center tw:justify-center tw:overflow-hidden tw:rounded-full tw:bg-teal-500/14 tw:text-lg tw:font-extrabold tw:text-teal-700 tw:dark:text-teal-300">
        {model.avatarUrl ? <img src={model.avatarUrl} alt="" className="tw:h-full tw:w-full tw:object-cover" /> : model.initial}
        <span className="tw:absolute tw:bottom-0.5 tw:right-0.5 tw:h-2.5 tw:w-2.5 tw:rounded-full tw:border-2 tw:border-[var(--card)] tw:bg-teal-500" />
      </div>
      <div className="tw:min-w-0 tw:flex-1">
        <strong className="tw:block tw:truncate tw:text-base">{model.displayName}</strong>
        {model.jobTitle && <span className="tw:block tw:truncate tw:text-sm tw:text-[var(--muted)]">{model.jobTitle}</span>}
      </div>
      <button type="button" onClick={openAccount} className="tw:rounded-full tw:bg-[var(--surface)] tw:px-3 tw:py-2 tw:text-sm tw:font-bold">Edit</button>
    </div>
    <div className="tw:border-y tw:border-black/6 tw:bg-teal-500/7 tw:px-4 tw:py-4 tw:dark:border-white/8">
      <div className="tw:flex tw:items-start tw:justify-between tw:gap-3">
        <div>
          <span className="tw:text-[0.7rem] tw:font-extrabold tw:uppercase tw:tracking-wider tw:text-[var(--muted)]">{model.assignmentLabel}</span>
          <h3 className="tw:mt-1 tw:text-xl tw:font-extrabold tw:leading-tight">{model.title}</h3>
          <p className="tw:mt-1 tw:text-sm tw:text-[var(--muted)]">{model.detail}</p>
        </div>
        {model.changedLabel && <span className="tw:shrink-0 tw:rounded-full tw:bg-amber-500/14 tw:px-2.5 tw:py-1 tw:text-[0.68rem] tw:font-extrabold tw:text-amber-700 tw:dark:text-amber-300">{model.changedLabel}</span>}
      </div>
    </div>
    <dl className="tw:grid tw:grid-cols-2 tw:gap-px tw:bg-black/6 tw:dark:bg-white/8">
      {[["Time", model.period], ["Break", model.breakLabel], [model.contextLabel, model.context]].map(([label, value], index) => <div key={label} className={`tw:bg-[var(--card)] tw:p-3 ${index === 2 ? 'tw:col-span-2' : ''}`}>
        <dt className="tw:text-[0.68rem] tw:font-bold tw:uppercase tw:tracking-wider tw:text-[var(--muted)]">{label}</dt>
        <dd className="tw:mt-1 tw:text-sm tw:font-semibold">{value || 'Pending'}</dd>
      </div>)}
    </dl>
    <motion.button type="button" whileTap={{ scale: 0.99 }} onClick={action} className="tw:flex tw:min-h-12 tw:w-full tw:items-center tw:justify-between tw:px-4 tw:py-3 tw:text-left tw:text-sm tw:font-bold tw:text-[var(--accent)]">
      {model.action === 'absence' ? 'Review absence' : model.action === 'role' ? 'View in night situation' : 'Choose your name'} <span aria-hidden="true">›</span>
    </motion.button>
  </motion.article>;
}

function PersonalPending({ model }: { model: PersonalNight }) {
  return <AnimatePresence initial={false}>{model.pending && <motion.button
    type="button"
    initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
    onClick={() => goToChanges('allocation')}
    className="tw:mt-3 tw:flex tw:w-full tw:items-center tw:justify-between tw:gap-3 tw:rounded-2xl tw:border tw:border-amber-400/35 tw:bg-amber-400/10 tw:p-4 tw:text-left"
  >
    <span><strong className="tw:block tw:text-sm">Your allocation is not final yet</strong><small className="tw:mt-1 tw:block tw:text-[var(--muted)]">Labour Ward and Pager are shared with {model.pendingOther}.</small></span>
    <span className="tw:shrink-0 tw:text-sm tw:font-bold tw:text-[var(--accent)]">Complete ›</span>
  </motion.button>}</AnimatePresence>;
}

function RecentActivityList({ model }: { model: RecentActivity }) {
  return <div className="tw:grid tw:gap-2">
    {model.items.length ? model.items.map((item, index) => <motion.button
      layout
      key={`${item.title}-${item.meta}`}
      type="button"
      onClick={() => window.dispatchEvent(new CustomEvent('roster:activity-open', { detail: { index } }))}
      className="tw:flex tw:w-full tw:items-center tw:gap-3 tw:rounded-2xl tw:border tw:border-black/8 tw:bg-[var(--card)] tw:p-3 tw:text-left tw:dark:border-white/10"
    >
      <span className="tw:rounded-full tw:bg-[var(--surface)] tw:px-2.5 tw:py-1 tw:text-[0.68rem] tw:font-extrabold tw:uppercase tw:tracking-wider tw:text-[var(--muted)]">{item.label}</span>
      <span className="tw:min-w-0 tw:flex-1"><strong className="tw:block tw:text-sm">{item.title}</strong>{item.detail && <small className="tw:mt-0.5 tw:block tw:truncate tw:text-[var(--muted)]">{item.detail}</small>}<small className="tw:mt-1 tw:block tw:text-xs tw:text-[var(--muted)]">{item.meta}</small></span>
      <span aria-hidden="true" className="tw:text-xl tw:text-[var(--muted)]">›</span>
    </motion.button>) : <div className="tw:rounded-2xl tw:bg-[var(--surface)] tw:p-4 tw:text-sm tw:text-[var(--muted)]">No staffing changes have been recorded for this night.</div>}
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

function NightRoles({ model }: { model: NightSummary }) {
  const reduced = useReducedMotion();
  return <div className="tw:grid tw:gap-2">
    {model.roles.map((role, index) => <motion.button
      layout
      initial={reduced ? false : { opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: reduced ? 0 : 0.2, delay: reduced ? 0 : index * 0.025 }}
      whileTap={{ scale: 0.992 }}
      key={role.key}
      type="button"
      onClick={openRoleEditor}
      className={`role tw:flex tw:w-full tw:items-center tw:gap-3 tw:rounded-[20px] tw:border tw:p-3.5 tw:text-left tw:shadow-sm ${role.mine ? 'mine tw:border-teal-500/45 tw:bg-teal-500/8' : 'tw:border-black/8 tw:bg-[var(--card)] tw:dark:border-white/10'}`}
      aria-label={`Change this night's ${role.label} allocation`}
    >
      <span className={`tw:flex tw:h-10 tw:min-w-10 tw:items-center tw:justify-center tw:rounded-xl tw:px-2 tw:text-xs tw:font-extrabold ${roleTone[role.tone]}`} aria-hidden="true">
        {role.tone === 'first' ? '1ST' : role.tone === 'second' ? '2ND' : role.tone === 'pager' ? 'P' : role.tone === 'reliever' ? 'R' : role.tone === 'seventh' ? '7' : 'FULL'}
      </span>
      <span className="tw:min-w-0 tw:flex-1">
        <span className="tw:block tw:text-base tw:font-bold tw:leading-tight">{role.names}</span>
        <span className="tw:mt-1 tw:block tw:text-xs tw:font-semibold tw:leading-snug tw:text-[var(--muted)]">{role.label} · {role.detail}</span>
      </span>
      {role.mine ? <span className="tw:rounded-full tw:bg-teal-500/14 tw:px-2.5 tw:py-1 tw:text-[0.68rem] tw:font-extrabold tw:uppercase tw:tracking-wider tw:text-teal-700 tw:dark:text-teal-300">You</span> : <span aria-hidden="true" className="tw:text-xl tw:text-[var(--muted)]">›</span>}
    </motion.button>)}
    {model.extras.length > 0 && <section className="tw:rounded-[20px] tw:border tw:border-dashed tw:border-sky-400/45 tw:bg-sky-400/8 tw:p-4">
      <strong className="tw:text-sm">Additional staff · allocation as required</strong>
      <div className="tw:mt-2 tw:flex tw:flex-wrap tw:gap-2">
        {model.extras.map(name => <span key={name} className="tw:rounded-full tw:bg-sky-500/12 tw:px-3 tw:py-1.5 tw:text-sm tw:font-semibold">{name}</span>)}
      </div>
    </section>}
  </div>;
}

function FivePersonArrangement({ model }: { model: NightSummary }) {
  const arrangement = model.fivePerson;
  if (!arrangement) return null;
  return <motion.section
    initial={{ opacity: 0, y: 6 }}
    animate={{ opacity: 1, y: 0 }}
    className="tw:mt-3 tw:rounded-[22px] tw:border tw:border-rose-400/30 tw:bg-rose-400/8 tw:p-4"
  >
    <span className="tw:text-xs tw:font-bold tw:uppercase tw:tracking-wider tw:text-[var(--muted)]">Five-nurse arrangement</span>
    <h3 className="tw:mt-1 tw:text-base tw:font-bold">Full-night Labour Ward and Pager</h3>
    <button type="button" onClick={openRoleEditor} className={`role tw:mt-3 tw:flex tw:w-full tw:items-center tw:gap-3 tw:rounded-2xl tw:bg-[var(--card)] tw:p-3 tw:text-left ${arrangement.mine ? 'mine tw:ring-2 tw:ring-teal-500/35' : ''}`}>
      <span className="tw:flex-1 tw:font-bold">{arrangement.name}</span>
      {arrangement.mine && <span className="tw:text-xs tw:font-bold tw:text-teal-600">You</span>}
      <span aria-hidden="true">›</span>
    </button>
    <p className="tw:mt-2 tw:text-sm tw:leading-relaxed tw:text-[var(--muted)]">{arrangement.reason}</p>
  </motion.section>;
}

export function renderNightExperience(model: NightSummary) {
  rootFor('nightStatusRow')?.render(<NightStatus model={model} />);
  rootFor('alerts')?.render(<NightAlerts model={model} />);
  rootFor('roles')?.render(<NightRoles model={model} />);
  rootFor('fiveArrangement')?.render(<FivePersonArrangement model={model} />);
}
