import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { createRoot, type Root } from 'react-dom/client';
import { useLayoutEffect } from 'react';

type StaffingRecord = {
  id: string;
  kind: 'absence' | 'overtime';
  name: string;
  status: string;
  meta: string;
  needsAllocation?: boolean;
};

type HistoryRecord = {
  label: string;
  type: string;
  title: string;
  detail: string;
  meta: string;
};
type AllocationRow = { key: string; label: string; breakLabel: string; selectedId: string; options: { id: string; name: string }[] };

export type ChangesExperience = {
  absences: StaffingRecord[];
  overtime: StaffingRecord[];
  history: HistoryRecord[];
  historyTotal: number;
  historyExpanded: boolean;
  allocations: AllocationRow[];
  allocationMessage: string;
};

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

function dispatchAction(detail: Record<string, unknown>) {
  window.dispatchEvent(new CustomEvent('roster:changes-action', { detail }));
}

function EmptyRecord({ children }: { children: string }) {
  return <div className="tw:rounded-2xl tw:border tw:border-dashed tw:border-black/12 tw:bg-[var(--surface)]/70 tw:px-4 tw:py-5 tw:text-center tw:text-sm tw:text-[var(--muted)] dark:tw:border-white/14">{children}</div>;
}

function RecordList({ records, empty }: { records: StaffingRecord[]; empty: string }) {
  const reduced = useReducedMotion();
  return <div className="tw:grid tw:gap-2">
    <AnimatePresence initial={false} mode="popLayout">
      {records.length ? records.map((record, index) => <motion.article
        layout
        key={`${record.kind}-${record.id}`}
        initial={reduced ? false : { opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        exit={reduced ? { opacity: 0 } : { opacity: 0, x: -8 }}
        transition={{ duration: reduced ? 0 : 0.18, delay: reduced ? 0 : Math.min(index * 0.025, 0.1) }}
        data-absence-name={record.kind === 'absence' ? record.name : undefined}
        data-overtime-name={record.kind === 'overtime' ? record.name : undefined}
        className="tw:flex tw:items-center tw:justify-between tw:gap-3 tw:rounded-2xl tw:border tw:border-black/8 tw:bg-[var(--card)] tw:p-3.5 tw:shadow-sm dark:tw:border-white/10"
      >
        <div className="tw:min-w-0">
          <div className="tw:flex tw:flex-wrap tw:items-center tw:gap-2">
            <strong className="tw:text-[0.96rem]">{record.name}</strong>
            <button
              type="button"
              disabled={!record.needsAllocation}
              onClick={() => record.needsAllocation && dispatchAction({ action: 'allocation' })}
              className={`tw:rounded-full tw:px-2.5 tw:py-1 tw:text-[0.68rem] tw:font-bold tw:tracking-wide ${record.needsAllocation ? 'tw:bg-amber-400/15 tw:text-amber-800 dark:tw:text-amber-200' : record.kind === 'absence' ? 'tw:bg-rose-400/12 tw:text-rose-700 dark:tw:text-rose-200' : 'tw:bg-teal-400/12 tw:text-teal-700 dark:tw:text-teal-200'}`}
            >{record.status}</button>
          </div>
          <p className="tw:mt-1 tw:text-xs tw:leading-relaxed tw:text-[var(--muted)]">{record.meta}</p>
        </div>
        <motion.button
          type="button"
          whileTap={{ scale: 0.94 }}
          onClick={() => dispatchAction({ action: 'record', kind: record.kind, id: record.id, name: record.name })}
          aria-label={`More actions for ${record.name}`}
          className="tw:grid tw:h-10 tw:w-10 tw:shrink-0 tw:place-items-center tw:rounded-full tw:bg-[var(--surface)] tw:text-lg tw:font-bold tw:tracking-[0.08em] tw:text-[var(--muted)]"
        >•••</motion.button>
      </motion.article>) : <EmptyRecord key="empty">{empty}</EmptyRecord>}
    </AnimatePresence>
  </div>;
}

function History({ model }: { model: ChangesExperience }) {
  return <div className="tw:grid tw:gap-2 tw:pt-2">
    {model.history.length ? model.history.map((item, index) => <motion.article
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      key={`${item.type}-${item.title}-${item.meta}-${index}`}
      className="tw:rounded-2xl tw:bg-[var(--surface)] tw:px-3.5 tw:py-3"
    >
      <div className="tw:flex tw:items-start tw:gap-2">
        <span className="tw:rounded-full tw:bg-[var(--card)] tw:px-2 tw:py-1 tw:text-[0.64rem] tw:font-bold tw:uppercase tw:tracking-wider tw:text-[var(--muted)]">{item.label}</span>
        <strong className="tw:min-w-0 tw:text-sm tw:leading-snug">{item.title}</strong>
      </div>
      {(item.detail || item.meta) && <p className="tw:mt-1.5 tw:text-xs tw:leading-relaxed tw:text-[var(--muted)]">{[item.detail, item.meta].filter(Boolean).join(' · ')}</p>}
    </motion.article>) : <EmptyRecord>No staffing change history for this night.</EmptyRecord>}
    {model.historyTotal > 15 && <button
      type="button"
      onClick={() => dispatchAction({ action: 'history' })}
      className="tw:mt-1 tw:w-full tw:rounded-xl tw:bg-[var(--surface)] tw:px-3 tw:py-2.5 tw:text-sm tw:font-bold tw:text-[var(--accent-strong)]"
    >{model.historyExpanded ? 'Show recent changes' : `Show full history (${model.historyTotal})`}</button>}
  </div>;
}

function AllocationList({ model }: { model: ChangesExperience }) {
  useLayoutEffect(() => { dispatchAction({ action: 'allocation-mounted' }); }, [model]);
  if (!model.allocations.length) return <div className="tw:rounded-2xl tw:bg-[var(--surface)] tw:p-4 tw:text-sm tw:leading-relaxed tw:text-[var(--muted)]">{model.allocationMessage}</div>;
  return <div className="tw:grid tw:gap-2">{model.allocations.map(row => <motion.label layout key={row.key} className="tw:grid tw:gap-3 tw:rounded-2xl tw:border tw:border-black/8 tw:bg-[var(--card)] tw:p-3.5 sm:tw:grid-cols-[1fr_minmax(12rem,0.8fr)] sm:tw:items-center dark:tw:border-white/10">
    <span className="tw:min-w-0"><strong className="tw:block tw:text-sm">{row.label}</strong><small className="tw:mt-0.5 tw:block tw:text-xs tw:text-[var(--muted)]">{row.breakLabel}</small></span>
    <select
      defaultValue={row.selectedId}
      data-final-allocation={row.key}
      aria-label={`Choose nurse for ${row.label}`}
      onChange={event => dispatchAction({ action: 'allocation-select', key: row.key, value: event.target.value })}
      className="tw:min-h-11 tw:w-full tw:rounded-xl tw:border tw:border-black/10 tw:bg-[var(--surface)] tw:px-3 tw:text-sm tw:font-semibold dark:tw:border-white/12"
    >
      <option value="">Choose a nurse</option>
      {row.options.map(option => <option key={option.id} value={option.id}>{option.name}</option>)}
    </select>
  </motion.label>)}</div>;
}

export function renderChangesExperience(model: ChangesExperience) {
  rootFor('changeList')?.render(<RecordList records={model.absences} empty="No absences recorded for this night." />);
  rootFor('overtimeList')?.render(<RecordList records={model.overtime} empty="No overtime nurses recorded for this night." />);
  rootFor('changeHistory')?.render(<History model={model} />);
  rootFor('allocationList')?.render(<AllocationList model={model} />);
}
