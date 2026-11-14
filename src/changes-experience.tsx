import { AvailableParts, type AvailablePartsModel } from './available-parts';
import { useProductReducedMotion } from './product-motion';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';
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
  editing: { id: string; absent_name: string; reason?: string } | null;
  overtimeSuggestions: string[];
};

type RoleOverride = {
  notice?: string;
  mode?: string;
  present?: { value: string; label: string }[];
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
  periods?: { first: string; second: string };
};

export type ChangesExperience = {
  availableParts?: AvailablePartsModel;
  dateLabel: string;
  date: string;
  absences: StaffingRecord[];
  overtime: StaffingRecord[];
  history: HistoryRecord[];
  historyTotal: number;
  historyStatus?: 'loading' | 'loaded' | 'offline' | 'error';
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
          title={<span className="tw:flex tw:items-center tw:gap-2"><span>{record.name}</span></span>}
          subtitle={<><span>{record.meta.split(' · Updated by ')[0]}</span></>}
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
          subtitle={<><span className="overtimeRecordStatus">
            {record.needsAllocation
              ? <Pressable type="button" className="overtimeAllocateButton" aria-label={`Choose part for ${record.name}`} onClick={() => dispatchAction({ action: 'allocation' })}>Choose part <span aria-hidden="true">›</span></Pressable>
              : <Badge tone="success">{record.status}</Badge>}
            {record.needsAllocation && <span className="overtimePendingLabel">Unassigned</span>}
          </span></>}
          trailing={<span>
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
          subtitle={<><span className="historyMeta">{item.meta}</span>{item.detail.includes(' → ') ? <span className="historyComparison"><del>{item.detail.split(' → ')[0]}</del><span aria-hidden="true">→</span><ins>{item.detail.split(' → ').slice(1).join(' → ')}</ins></span> : item.detail && <span className="historyDetail">{item.detail}</span>}</>}
        />)
      : <EmptyState title={model.historyStatus === 'error' ? 'Activity could not be loaded' : model.historyStatus === 'offline' ? 'Reconnect to view activity' : model.historyStatus === 'loading' ? 'Loading activity…' : 'No staffing change history for this night'} />}
    {model.historyStatus === 'error' && <div className="tw:p-2.5" role="status"><Pressable type="button" className="soft wide" onClick={() => dispatchAction({ action: 'history-retry' })}>Retry activity</Pressable></div>}
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

  if (model.roleOverride?.mode === '4' && !model.roleOverride.stored) return null;
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
  const [openFor, setOpenFor] = useState<{ date: string; label: string } | null>(null);
  const open = Boolean(openFor);
  const sheet = useRef<HTMLDialogElement>(null);
  const editing = mode === 'absence' ? model.forms.editing : null;
  const [saving, setSaving] = useState(false);
  const reduced = useProductReducedMotion();

  useLayoutEffect(() => {
    if (open) { if (sheet.current && !sheet.current.open) sheet.current.showModal(); dispatchAction({ action: 'staffing-mounted' }); }
  }, [model, mode, open]);

  useEffect(() => {
    if (editing?.id) setOpenFor({ date: model.date, label: model.dateLabel });
  }, [editing?.id, model.date, model.dateLabel]);

  useEffect(() => {
    const openStaffing = (event: Event) => { if ((event as CustomEvent).detail?.mode === mode) setOpenFor({ date: model.date, label: model.dateLabel }); };
    const saveState = (event: Event) => {
      const detail = (event as CustomEvent).detail;
      if (detail.mode !== mode) return;
      setSaving(detail.saving);
      if (detail.saved) {
        sheet.current?.close();
        setOpenFor(null);
      }
    };
    window.addEventListener('roster:open-staffing', openStaffing);
    window.addEventListener('roster:staffing-save', saveState);
    return () => {
      window.removeEventListener('roster:open-staffing', openStaffing);
      window.removeEventListener('roster:staffing-save', saveState);
    };
  }, [mode, model.date, model.dateLabel]);

  const inputClass = 'tw:min-h-12 tw:w-full tw:rounded-[14px] tw:border tw:border-black/[0.07] tw:bg-[var(--card)] tw:px-3.5 tw:text-sm tw:outline-none tw:focus:border-blue-500/45 tw:focus:ring-2 tw:focus:ring-blue-500/12 tw:dark:border-white/10';
  const title = mode === 'absence' ? (editing ? 'Edit absence' : 'Add absence') : 'Add overtime nurse';
  const summary = records.length ? `${records.length} recorded` : '';
  const close = () => {
    if (saving) return;
    setOpenFor(null);
    if (editing) dispatchAction({ action: 'absence-cancel' });
  };

  const form = mode === 'absence' ? <>
    <div className="changeGrid tw:@container tw:grid tw:gap-3 tw:@md:grid-cols-2">
      <FieldShell label="Nurse">
        <select id="absentName" disabled={saving || Boolean(editing)} defaultValue={editing?.absent_name ?? ''} onChange={() => dispatchAction({ action: 'staffing-input' })} className={inputClass}>
          <option value="">{model.forms.names.length ? 'Choose a nurse' : 'Every rostered nurse is already absent'}</option>
          {editing && <option value={editing.absent_name}>{model.absences.find(record => record.id === editing.id)?.name ?? editing.absent_name}</option>}
          {!editing && model.forms.names.map(name => <option key={name.value} value={name.value}>{name.label}</option>)}
        </select>
      </FieldShell>
      <FieldShell label="Reason">
        <select id="changeReason" disabled={saving} defaultValue={editing?.reason || 'Leave'} onChange={() => dispatchAction({ action: 'staffing-input' })} className={inputClass}>
          {Array.from(new Set(['Leave', 'Sick leave', 'Other absence', 'Reassigned elsewhere', editing?.reason || 'Leave'])).map(reason => <option key={reason}>{reason}</option>)}
        </select>
      </FieldShell>
    </div>
    <Pressable className="primary wide staffingPrimaryAction tw:min-h-12" id="saveChangeBtn" type="button" onClick={() => dispatchAction({ action: 'absence-save' })}>
      {saving ? 'Saving…' : editing ? 'Update absence' : 'Save absence'}
    </Pressable>
    <div id="absenceFormMessage" className="formMessage" role="status" aria-live="polite" />
  </> : <>
    <FieldShell label="Overtime nurse">
      <input
        id="overtimeName"
        disabled={saving}
        type="text"
        autoComplete="off"
        autoCapitalize="words"
        placeholder="Type the nurse's name"
        list="overtimeSuggestions"
        onInput={() => dispatchAction({ action: 'staffing-input' })}
        onKeyDown={event => {
          if (event.key === 'Enter' && !event.nativeEvent.isComposing) dispatchAction({ action: 'overtime-save' });
        }}
        className={inputClass}
      />
      <datalist id="overtimeSuggestions">
        {model.forms.overtimeSuggestions.map(name => <option key={name} value={name} />)}
      </datalist>
    </FieldShell>
    <Pressable className="primary wide overtimeAddButton tw:min-h-12" id="addOvertimeBtn" type="button" onClick={() => dispatchAction({ action: 'overtime-save' })}>
      {saving ? 'Saving…' : 'Add overtime'}
    </Pressable>
    <div id="overtimeFormMessage" className="formMessage" role="status" aria-live="polite" />
  </>;

  return <div className="staffingEditor">
    <div className="staffingActionRow">
      {summary && <span className="staffingActionCopy"><strong>{summary}</strong></span>}
      <Pressable
        type="button"
        className="staffingAddButton"
        onClick={() => setOpenFor({ date: model.date, label: model.dateLabel })}
        aria-haspopup="dialog"
        aria-expanded={open}
      >{mode === 'absence' ? 'Add absence' : 'Add overtime'}</Pressable>
    </div>
    {open && <>
      <motion.dialog
        key={editing?.id ?? mode}
        ref={sheet}
        onCancel={event => { event.preventDefault(); close(); }}
        onClick={event => { const box = event.currentTarget.getBoundingClientRect(); if (event.target === event.currentTarget && (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom)) close(); }}
        className="staffingSheet"
        data-roster-night={openFor?.date}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        initial={reduced ? false : { opacity: 0, y: 44 }}
        animate={{ opacity: 1, y: 0 }}
        transition={reduced ? { duration: 0 } : { type: 'spring', stiffness: 440, damping: 40, mass: 0.7 }}
      >
        <div className="staffingSheetHandle" aria-hidden="true" />
        <div className="staffingSheetHeader">
          <div><h3>{title}</h3><p className="staffingSheetDate">{openFor?.label}</p></div>
          <button
            type="button"
            className="staffingSheetClose"
            onClick={close}
            disabled={saving}
            aria-label={`Close ${title}`}
          >×</button>
        </div>
        <div className="staffingSheetBody">
          {openFor?.date === model.date ? form : <p role="status">The selected night has changed. Reopen this form for the night you want to edit.</p>}
        </div>
      </motion.dialog>
    </>}
  </div>;
}
function RoleOverrideEditor({ model }: { model: RoleOverride }) {
  if (model.notice) return <div className="time">{model.notice}</div>;

  return <details className="nightRoleEditor" open={model.mode === '4' || model.open}>
    <summary>
      <span><b>{model.mode === '4' ? 'Theatre positions · 4 nurses' : 'Swap assignments'}</b>{(model.stored || model.dirty || model.mode === '4') && <small>{model.summary}</small>}</span>
      <span aria-hidden="true">›</span>
    </summary>
    <div className="nightRoleEditorBody">
      {model.mode === '4' && model.present?.length ? <div className="fourNursePresent"><strong>Present tonight · {model.present.length} nurses</strong><div className="fourNursePresentList">{model.present.map(name => <span key={name.value}>{name.label}</span>)}</div></div> : null}
      <p className="time">{model.guidance}</p>
      <div className="editGrid">
        {model.keys.map(row => <label key={row.key} className={row.fullWidth ? 'fullWidth' : ''}>
          <span>{row.label}</span>
          {model.periods && /^(first|second)/.test(row.key) && <small className="roleDutyHint">{row.key.startsWith('first') ? model.periods.first + ' · Second break' : model.periods.second + ' · First break'}</small>}
          <select
            data-night-role={row.key}
            value={model.assignments[row.key] || ''}
            onChange={event => dispatchAction({ action: 'role-select', key: row.key, value: event.target.value })}
          >
            {model.mode === '4' && !model.assignments[row.key] ? <option value="" disabled>Select nurse</option> : null}
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
  rootFor('changesAvailableParts')?.render(<AvailableParts model={model.availableParts} hideWhenComplete />);
  rootFor('absenceFormExperience')?.render(<StaffingForms model={model} mode="absence" />);
  rootFor('overtimeFormExperience')?.render(<StaffingForms model={model} mode="overtime" />);
  rootFor('changeList')?.render(<RecordList records={model.absences} empty="No absences recorded for this night." />);
  rootFor('overtimeList')?.render(<RecordList records={model.overtime} empty="No overtime nurses recorded for this night." />);
  rootFor('changeHistory')?.render(<History model={model} />);
  rootFor('allocationList')?.render(<AllocationList model={model} />);
  if (model.roleOverride) rootFor('nightRoleOverrideStep')?.render(<RoleOverrideEditor model={model.roleOverride} />);
}
