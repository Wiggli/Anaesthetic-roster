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
    className="tw:relative tw:overflow-hidden tw:rounded-[22px] tw:border tw:border-black/8 tw:bg-[var(--card)] tw:p-4 tw:shadow-sm dark:tw:border-white/10"
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
    <div className="tw:grid tw:gap-3 md:tw:grid-cols-2">
      <BreakGroup title="First break" time="00:00–03:30 off duty" names={model.first} highlightedName={model.highlightedName} delay={0} />
      <BreakGroup title="Second break" time="03:30–07:00 off duty" names={model.second} highlightedName={model.highlightedName} delay={0.035} />
    </div>
    <motion.section
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="tw:rounded-[22px] tw:border tw:border-black/8 tw:bg-[var(--card)] tw:p-4 dark:tw:border-white/10"
    >
      <div className="tw:flex tw:items-center tw:justify-between tw:gap-3">
        <h3 className="tw:text-base tw:font-bold">Labour Ward and additional staffing</h3>
        <span className="tw:rounded-full tw:bg-sky-500/12 tw:px-2.5 tw:py-1 tw:text-xs tw:font-bold tw:text-sky-700 dark:tw:text-sky-300">Live plan</span>
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
