import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { createRoot, type Root } from 'react-dom/client';
import { Badge, EmptyState, FieldShell, GroupedList, ListRow, Pressable, Surface } from './ui-system';

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

type AllocationRow = {
  key: string;
  label: string;
  breakLabel: string;
  selectedId: string;
  options: { id: string; name: string }[];
};

type ChangesForms = {
  names: { value: string; label: string }[];
  editing: boolean;
  overtimeSuggestions: string[];
};

type RoleOverride = {
  notice?: string;
  guidance: string;
  summary: string;
  open: boolean;
  stored: boolean;
  dirty: boolean;
  reason: string;
  canSave: boolean;
  keys: { key: string; label: string; fullWidth: boolean }[];
  names: { value: string; label: string }[];
  assignments: Record<string, string>;
};

export type ChangesExperience = {
  absences: StaffingRecord[];
  overtime: StaffingRecord[];
  history: HistoryRecord[];
  historyTotal: number;
  historyExpanded: boolean;
  historyHasMore: boolean;
  allocations: AllocationRow[];
  allocationMessage: string;
  forms: ChangesForms;
  roleOverride?: RoleOverride;
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

function RecordList({ records, empty: _empty }: { records: StaffingRecord[]; empty: string }) {
  if (!records.length) return null;

  return <GroupedList className="changesRecordGroup tw:shadow-none">
    {records.map(record => record.kind === 'absence'
      ? <ListRow
          key={`absence-${record.id}`}
          className="changeItem"
          title={<span className="tw:flex tw:items-center tw:gap-2"><span>{record.name}</span><Badge tone="danger">{record.status}</Badge></span>}
          subtitle={record.meta}
          trailing={<Pressable
            type="button"
            className="recordMoreButton tw:grid tw:min-h-11 tw:min-w-11 tw:place-items-center tw:rounded-full tw:bg-black/5 tw:px-2 tw:text-[var(--muted)] tw:dark:bg-white/8"
            onClick={() => dispatchAction({ action: 'record', kind: record.kind, id: record.id, name: record.name })}
            aria-label={`More actions for ${record.name}`}
          ><span aria-hidden="true">•••</span><small className="tw:sr-only">More</small></Pressable>}
        />
      : <ListRow
          key={`overtime-${record.id}`}
          className="overtimeItem"
          title={record.name}
          subtitle={record.meta}
          trailing={<span className="tw:flex tw:items-center tw:gap-2">
            {record.needsAllocation
              ? <Pressable type="button" className="overtimeStatus taskStatus tw:rounded-full tw:bg-amber-500/12 tw:px-2.5 tw:py-1.5 tw:text-[0.68rem] tw:font-bold tw:text-amber-700 tw:dark:text-amber-300" onClick={() => dispatchAction({ action: 'allocation' })}>{record.status} ›</Pressable>
              : <Badge tone="success">{record.status}</Badge>}
            <Pressable
              type="button"
              className="recordMoreButton tw:grid tw:min-h-11 tw:min-w-11 tw:place-items-center tw:rounded-full tw:bg-black/5 tw:px-2 tw:text-[var(--muted)] tw:dark:bg-white/8"
              onClick={() => dispatchAction({ action: 'record', kind: record.kind, id: record.id, name: record.name })}
              aria-label={`More actions for ${record.name}`}
            ><span aria-hidden="true">•••</span><small className="tw:sr-only">More</small></Pressable>
          </span>}
        />)}
  </GroupedList>;
}

function History({ model }: { model: ChangesExperience }) {
  return <Surface className="tw:divide-y tw:divide-black/7 tw:shadow-none tw:dark:divide-white/8">
    {model.history.length
      ? model.history.map((item, index) => <ListRow
          key={`${item.type}-${item.title}-${item.meta}-${index}`}
          className="historyItem"
          leading={<Badge tone={item.type === 'absence' ? 'danger' : item.type === 'overtime' ? 'warning' : 'accent'}>{item.label}</Badge>}
          title={item.title}
          subtitle={[item.detail, item.meta].filter(Boolean).join(' · ')}
        />)
      : <EmptyState title="No staffing change history for this night" />}
    {(model.historyTotal > 15 || model.historyHasMore) && <div className="tw:p-2.5">
      <Pressable
        type="button"
        className="historyMore tw:min-h-10 tw:w-full tw:rounded-xl tw:bg-black/5 tw:px-3 tw:text-xs tw:font-bold tw:text-[var(--accent-strong)] tw:dark:bg-white/8"
        onClick={() => dispatchAction({ action: 'history' })}
      >
        {model.historyExpanded
          ? (model.historyHasMore ? 'Load earlier changes' : 'Show recent changes')
          : (model.historyHasMore ? 'Show history' : `Show full history (${model.historyTotal})`)}
      </Pressable>
    </div>}
  </Surface>;
}

function AllocationList({ model }: { model: ChangesExperience }) {
  useLayoutEffect(() => {
    dispatchAction({ action: 'allocation-mounted' });
  }, [model]);

  if (!model.allocations.length) return <Surface className="tw:shadow-none">
    <EmptyState title={model.allocationMessage || 'No allocation decisions are waiting'} />
  </Surface>;

  return <GroupedList className="changesAllocationGroup tw:shadow-none">
    {model.allocations.map(row => <div
      key={row.key}
      className="allocationRow"
    >
      <span className="allocationRowCopy"><strong>{row.label}</strong><small>{row.breakLabel}</small></span>
      <label className="allocationRowField"><span className="tw:sr-only">Choose nurse for {row.label}</span><select
        defaultValue={row.selectedId}
        data-final-allocation={row.key}
        aria-label={`Choose nurse for ${row.label}`}
        onChange={event => dispatchAction({ action: 'allocation-select', key: row.key, value: event.target.value })}
        className="tw:min-h-12 tw:w-full tw:rounded-[14px] tw:border tw:border-black/[0.07] tw:bg-[var(--card)] tw:px-3.5 tw:text-sm tw:font-semibold tw:outline-none tw:focus:border-blue-500/45 tw:focus:ring-2 tw:focus:ring-blue-500/12 tw:dark:border-white/10"
      >
        <option value="">Choose a nurse</option>
        {row.options.map(option => <option key={option.id} value={option.id}>{option.name}</option>)}
      </select></label>
    </div>)}
  </GroupedList>;
}

function StaffingForms({ model, mode }: { model: ChangesExperience; mode: 'absence' | 'overtime' }) {
  const records = mode === 'absence' ? model.absences : model.overtime;
  const [open, setOpen] = useState(mode === 'absence' && model.forms.editing);
  const previousCount = useRef(records.length);
  const previousEditing = useRef(model.forms.editing);
  const reduced = useReducedMotion();

  useLayoutEffect(() => {
    if (open) dispatchAction({ action: 'staffing-mounted' });
  }, [model, mode, open]);

  useEffect(() => {
    if (mode === 'absence' && model.forms.editing) setOpen(true);
  }, [mode, model.forms.editing]);

  useEffect(() => {
    const countIncreased = records.length > previousCount.current;
    const editingFinished = mode === 'absence' && previousEditing.current && !model.forms.editing;
    if (open && (countIncreased || editingFinished)) setOpen(false);
    previousCount.current = records.length;
    previousEditing.current = model.forms.editing;
  }, [mode, model.forms.editing, open, records.length]);

  const inputClass = 'tw:min-h-12 tw:w-full tw:rounded-[14px] tw:border tw:border-black/[0.07] tw:bg-[var(--card)] tw:px-3.5 tw:text-sm tw:outline-none tw:focus:border-blue-500/45 tw:focus:ring-2 tw:focus:ring-blue-500/12 tw:dark:border-white/10';
  const title = mode === 'absence' ? (model.forms.editing ? 'Edit absence' : 'Add absence') : 'Add overtime nurse';
  const summary = records.length ? `${records.length} ${mode === 'absence' ? (records.length === 1 ? 'absence' : 'absences') : 'recorded'}` : 'None recorded';
  const detail = mode === 'absence'
    ? (records.length ? 'Only confirmed absences are listed below.' : 'The published staffing plan is unchanged.')
    : (records.length ? 'Confirmed overtime staff are listed below.' : 'No additional staff are recorded.');
  const close = () => {
    setOpen(false);
    if (mode === 'absence' && model.forms.editing) dispatchAction({ action: 'absence-cancel' });
  };

  const form = mode === 'absence' ? <>
    <p className="staffingFormIntro tw:m-0 tw:text-xs tw:leading-relaxed tw:text-[var(--muted)]">Choose the absent nurse and record the reason. Cover can be arranged afterwards if needed.</p>
    <div className="changeGrid tw:@container tw:grid tw:gap-3 tw:@md:grid-cols-2">
      <FieldShell label="Nurse">
        <select id="absentName" defaultValue="" onChange={() => dispatchAction({ action: 'staffing-input' })} className={inputClass}>
          <option value="">{model.forms.names.length ? 'Choose a nurse' : 'Every rostered nurse is already absent'}</option>
          {model.forms.names.map(name => <option key={name.value} value={name.value}>{name.label}</option>)}
        </select>
      </FieldShell>
      <FieldShell label="Reason">
        <select id="changeReason" defaultValue="Leave" onChange={() => dispatchAction({ action: 'staffing-input' })} className={inputClass}>
          {['Leave', 'Sick leave', 'Other absence', 'Reassigned elsewhere'].map(reason => <option key={reason}>{reason}</option>)}
        </select>
      </FieldShell>
    </div>
    <Pressable className="primary wide staffingPrimaryAction tw:min-h-12" id="saveChangeBtn" type="button" onClick={() => dispatchAction({ action: 'absence-save' })}>
      {model.forms.editing ? 'Update absence' : 'Save absence'}
    </Pressable>
    <div id="absenceFormMessage" className="formMessage" role="status" aria-live="polite" />
  </> : <>
    <p className="staffingFormIntro tw:m-0 tw:text-xs tw:leading-relaxed tw:text-[var(--muted)]">Add a confirmed overtime nurse. Their role can be assigned afterwards if the plan requires it.</p>
    <FieldShell label="Overtime nurse">
      <input
        id="overtimeName"
        type="text"
        autoComplete="off"
        autoCapitalize="words"
        placeholder="Type the nurse's name"
        list="overtimeSuggestions"
        onInput={() => dispatchAction({ action: 'staffing-input' })}
        onKeyDown={event => {
          if (event.key === 'Enter') dispatchAction({ action: 'overtime-save' });
        }}
        className={inputClass}
      />
      <datalist id="overtimeSuggestions">
        {model.forms.overtimeSuggestions.map(name => <option key={name} value={name} />)}
      </datalist>
    </FieldShell>
    <Pressable className="primary wide overtimeAddButton tw:min-h-12" id="addOvertimeBtn" type="button" onClick={() => dispatchAction({ action: 'overtime-save' })}>
      Add overtime
    </Pressable>
    <div id="overtimeFormMessage" className="formMessage" role="status" aria-live="polite" />
  </>;

  return <div className="staffingEditor">
    <div className="staffingActionRow">
      <span className="staffingActionCopy"><strong>{summary}</strong><small>{detail}</small></span>
      <Pressable
        type="button"
        className="staffingAddButton"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        aria-expanded={open}
      >{records.length ? 'Add another' : 'Add'}</Pressable>
    </div>
    {open && <>
      <motion.button
        type="button"
        className="staffingSheetBackdrop"
        aria-label={`Close ${title}`}
        onClick={close}
        initial={reduced ? false : { opacity: 0 }}
        animate={{ opacity: 1 }}
      />
      <motion.section
        className="staffingSheet"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        initial={reduced ? false : { opacity: 0, y: 44 }}
        animate={{ opacity: 1, y: 0 }}
        transition={reduced ? { duration: 0 } : { type: 'spring', stiffness: 440, damping: 40, mass: 0.7 }}
      >
        <div className="staffingSheetHandle" aria-hidden="true" />
        <div className="staffingSheetHeader">
          <div><small>Staffing change</small><h3>{title}</h3></div>
          <Pressable type="button" className="staffingSheetClose" onClick={close} aria-label={`Close ${title}`}>×</Pressable>
        </div>
        <div className="staffingSheetBody">{form}</div>
      </motion.section>
    </>}
  </div>;
}
function RoleOverrideEditor({ model }: { model: RoleOverride }) {
  if (model.notice) return <div className="time">{model.notice}</div>;

  return <details className="nightRoleEditor" open={model.open}>
    <summary>
      <span><b>Change this night’s roles</b><small>{model.summary}</small></span>
      <span aria-hidden="true">›</span>
    </summary>
    <div className="nightRoleEditorBody">
      <p className="time">{model.guidance}</p>
      <div className="editGrid">
        {model.keys.map(row => <label key={row.key} className={row.fullWidth ? 'fullWidth' : ''}>
          {row.label}
          <select
            data-night-role={row.key}
            value={model.assignments[row.key] || ''}
            onChange={event => dispatchAction({ action: 'role-select', key: row.key, value: event.target.value })}
          >
            {model.names.map(name => <option key={name.value} value={name.value}>{name.label}</option>)}
          </select>
        </label>)}
      </div>
      {model.dirty && <>
        <div className="alert gold compactNotice">Unsaved night-only change</div>
        <label>
          Reason for the change
          <input
            id="nightRoleReason"
            defaultValue={model.reason}
            maxLength={120}
            placeholder="For example, agreed role arrangement"
            onInput={event => dispatchAction({ action: 'role-reason', value: event.currentTarget.value })}
          />
        </label>
        <button type="button" id="saveNightRolesBtn" className="primary wide" disabled={!model.canSave} onClick={() => dispatchAction({ action: 'role-save' })}>
          Save night-only change
        </button>
      </>}
      {model.stored && <button type="button" id="resetNightRolesBtn" className="soft wide" onClick={() => dispatchAction({ action: 'role-reset' })}>
        Restore rostered roles
      </button>}
    </div>
  </details>;
}

export function renderChangesExperience(model: ChangesExperience) {
  rootFor('absenceFormExperience')?.render(<StaffingForms model={model} mode="absence" />);
  rootFor('overtimeFormExperience')?.render(<StaffingForms model={model} mode="overtime" />);
  rootFor('changeList')?.render(<RecordList records={model.absences} empty="No absences recorded for this night." />);
  rootFor('overtimeList')?.render(<RecordList records={model.overtime} empty="No overtime nurses recorded for this night." />);
  rootFor('changeHistory')?.render(<History model={model} />);
  rootFor('allocationList')?.render(<AllocationList model={model} />);
  if (model.roleOverride) rootFor('nightRoleOverrideStep')?.render(<RoleOverrideEditor model={model.roleOverride} />);
}
