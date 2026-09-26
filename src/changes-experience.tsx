import { useLayoutEffect } from 'react';
import { createRoot, type Root } from 'react-dom/client';

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

function EmptyRecord({ children }: { children: string }) {
  return <div className="time">{children}</div>;
}

function RecordList({ records, empty }: { records: StaffingRecord[]; empty: string }) {
  if (!records.length) return <EmptyRecord>{empty}</EmptyRecord>;

  return <>
    {records.map(record => record.kind === 'absence'
      ? <div key={`absence-${record.id}`} className="changeItem" data-absence-name={record.name}>
          <div>
            <div><b>{record.name}</b> <span className="changeArrow">•</span> <b>{record.status}</b></div>
            <div className="changeMeta">{record.meta}</div>
          </div>
          <button
            type="button"
            className="recordMoreButton"
            onClick={() => dispatchAction({ action: 'record', kind: record.kind, id: record.id, name: record.name })}
            aria-label={`More actions for ${record.name}`}
          >
            <span aria-hidden="true">•••</span><small>More</small>
          </button>
        </div>
      : <div key={`overtime-${record.id}`} className="overtimeItem" data-overtime-name={record.name}>
          <div className="overtimeTop">
            <div>
              <div className="overtimeName">{record.name}</div>
              {record.needsAllocation
                ? <button type="button" className="overtimeStatus taskStatus" onClick={() => dispatchAction({ action: 'allocation' })}>
                    {record.status} ›
                  </button>
                : <span className="overtimeStatus assigned">{record.status}</span>}
              <div className="changeMeta">{record.meta}</div>
            </div>
            <button
              type="button"
              className="recordMoreButton"
              onClick={() => dispatchAction({ action: 'record', kind: record.kind, id: record.id, name: record.name })}
              aria-label={`More actions for ${record.name}`}
            >
              <span aria-hidden="true">•••</span><small>More</small>
            </button>
          </div>
        </div>)}
  </>;
}

function History({ model }: { model: ChangesExperience }) {
  return <>
    {model.history.length
      ? model.history.map((item, index) => <div key={`${item.type}-${item.title}-${item.meta}-${index}`} className="historyItem">
          <div><span className={`historyType ${item.type}`}>{item.label}</span><b>{item.title}</b></div>
          {(item.detail || item.meta) && <div className="changeMeta">{[item.detail, item.meta].filter(Boolean).join(' · ')}</div>}
        </div>)
      : <EmptyRecord>No staffing change history for this night.</EmptyRecord>}
    {model.historyTotal > 15 && <button
      type="button"
      className="historyMore"
      onClick={() => dispatchAction({ action: 'history' })}
    >
      {model.historyExpanded ? 'Show recent changes' : `Show full history (${model.historyTotal})`}
    </button>}
  </>;
}

function AllocationList({ model }: { model: ChangesExperience }) {
  useLayoutEffect(() => {
    dispatchAction({ action: 'allocation-mounted' });
  }, [model]);

  if (!model.allocations.length) return <div className="time">{model.allocationMessage}</div>;

  return <>
    {model.allocations.map(row => <div key={row.key} className="allocationRow">
      <div>
        <div className="allocationRole">{row.label}</div>
        <div className="allocationBreak">{row.breakLabel}</div>
      </div>
      <select
        defaultValue={row.selectedId}
        data-final-allocation={row.key}
        aria-label={`Choose nurse for ${row.label}`}
        onChange={event => dispatchAction({ action: 'allocation-select', key: row.key, value: event.target.value })}
      >
        <option value="">Choose a nurse</option>
        {row.options.map(option => <option key={option.id} value={option.id}>{option.name}</option>)}
      </select>
    </div>)}
  </>;
}

function StaffingForms({ model, mode }: { model: ChangesExperience; mode: 'absence' | 'overtime' }) {
  useLayoutEffect(() => {
    dispatchAction({ action: 'staffing-mounted' });
  }, [model, mode]);

  if (mode === 'absence') {
    return <>
      <div className="time">Select the absent nurse. You can arrange cover afterwards.</div>
      <div className="changeGrid">
        <label>
          Nurse
          <select id="absentName" defaultValue="" onChange={() => dispatchAction({ action: 'staffing-input' })}>
            <option value="">{model.forms.names.length ? 'Choose a nurse' : 'Every rostered nurse is already absent'}</option>
            {model.forms.names.map(name => <option key={name.value} value={name.value}>{name.label}</option>)}
          </select>
        </label>
        <label>
          Reason
          <select id="changeReason" defaultValue="Leave" onChange={() => dispatchAction({ action: 'staffing-input' })}>
            {['Leave', 'Sick leave', 'Other absence', 'Reassigned elsewhere'].map(reason => <option key={reason}>{reason}</option>)}
          </select>
        </label>
      </div>
      <button className="primary wide" id="saveChangeBtn" type="button" onClick={() => dispatchAction({ action: 'absence-save' })}>
        {model.forms.editing ? 'Update absence' : 'Save absence'}
      </button>
      <button
        className={`soft wide ${model.forms.editing ? '' : 'hidden'}`}
        id="cancelAbsenceEditBtn"
        type="button"
        onClick={() => dispatchAction({ action: 'absence-cancel' })}
      >
        Cancel editing
      </button>
      <div id="absenceFormMessage" className="formMessage" role="status" aria-live="polite" />
    </>;
  }

  return <>
    <div className="time">Add confirmed overtime staff. Their role can be assigned afterwards.</div>
    <div className="overtimeAdd">
      <label>
        Overtime nurse
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
        />
        <datalist id="overtimeSuggestions">
          {model.forms.overtimeSuggestions.map(name => <option key={name} value={name} />)}
        </datalist>
      </label>
      <button className="soft" id="addOvertimeBtn" type="button" onClick={() => dispatchAction({ action: 'overtime-save' })}>
        Add overtime
      </button>
    </div>
    <div id="overtimeFormMessage" className="formMessage" role="status" aria-live="polite" />
  </>;
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
