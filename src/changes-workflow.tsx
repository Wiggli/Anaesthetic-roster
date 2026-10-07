import { useLayoutEffect } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { motion, useReducedMotion } from 'motion/react';
import { Pressable } from './ui-system';

type StepId = 'staffing' | 'allocation' | 'confirm';
type Step = { id: StepId; label: string; detail: string; complete: boolean; attention: boolean; quiet: boolean };
export type ChangesWorkflowModel = {
  active: StepId;
  steps: Step[];
  headline: string;
  guidance: string;
  tone: 'attention' | 'ready' | 'complete' | 'automatic';
  progressValue: number;
  progressMax: number;
  progressLabel: string;
  draftLabel?: string;
};

let root: Root | undefined;
const paneIds: Record<StepId, string> = {
  staffing: 'changesStaffingPane', allocation: 'changesAllocationPane', confirm: 'changesConfirmPane'
};

function chooseStep(id: StepId) {
  window.dispatchEvent(new CustomEvent('roster:changes-step-request', { detail: { step: id } }));
}

function Workflow({ model }: { model: ChangesWorkflowModel }) {
  const reduced = useReducedMotion();
  useLayoutEffect(() => {
    const host = document.getElementById('changesWorkflowExperience');
    host?.setAttribute('data-react-ready', 'true');
  }, []);

  const moveFocus = (event: React.KeyboardEvent<HTMLButtonElement>, index: number) => {
    const target = event.key === 'ArrowRight' ? (index + 1) % model.steps.length
      : event.key === 'ArrowLeft' ? (index + model.steps.length - 1) % model.steps.length
      : event.key === 'Home' ? 0 : event.key === 'End' ? model.steps.length - 1 : -1;
    if (target < 0) return;
    event.preventDefault();
    chooseStep(model.steps[target].id);
    document.querySelector<HTMLElement>(`#changesWorkflowExperience [data-changes-step="${model.steps[target].id}"]`)?.focus();
  };

  const percent = Math.max(0, Math.min(100, (model.progressValue / Math.max(1, model.progressMax)) * 100));

  return <section className={`workflowExperience workflow-${model.tone}`} aria-label="Manage changes for the selected night">
    {model.tone !== 'automatic' && <div className="workflowProgress" aria-label={model.progressLabel}>
      <div className="workflowProgressCopy">
        <span>{model.progressLabel}</span>
        {model.draftLabel && <b>{model.draftLabel}</b>}
      </div>
      <div className="workflowProgressTrack" role="progressbar" aria-valuemin={0} aria-valuemax={model.progressMax} aria-valuenow={model.progressValue}>
        <motion.span
          className="workflowProgressFill"
          initial={false}
          animate={{ width: `${percent}%` }}
          transition={reduced ? { duration: 0 } : { type: 'spring', stiffness: 420, damping: 42, mass: 0.55 }}
        />
      </div>
    </div>}
    <div className="workflowSteps" role="tablist" aria-label="Changes steps">
      {model.steps.map((step, index) => <Pressable
        key={step.id}
        type="button"
        role="tab"
        id={`reactChangesTab-${step.id}`}
        aria-controls={paneIds[step.id]}
        aria-selected={model.active === step.id}
        tabIndex={model.active === step.id ? 0 : -1}
        data-changes-step={step.id}
        onClick={() => chooseStep(step.id)}
        onKeyDown={event => moveFocus(event, index)}
        className={`workflowStep ${model.active === step.id ? 'active' : ''} ${step.attention ? 'hasTasks' : ''} ${step.quiet ? 'quiet' : ''}`}
      >
        {model.active === step.id && <motion.span
          className="workflowSelection"
          layoutId="changes-workflow-selection"
          transition={reduced ? { duration: 0 } : { type: 'spring', stiffness: 490, damping: 43, mass: 0.6 }}
          aria-hidden="true"
        />}
        <span className="workflowStepNumber" aria-hidden="true">{step.complete ? '✓' : index + 1}</span>
        <span className="workflowStepCopy"><b>{step.label}</b><small>{step.detail}</small></span>
      </Pressable>)}
    </div>
    <div className={`workflowGuidance workflowGuidance-${model.tone}`}>
      <span className="workflowGuidanceMark" aria-hidden="true">{model.tone === 'attention' ? '!' : model.tone === 'ready' ? '→' : model.tone === 'complete' ? '✓' : '·'}</span>
      <div className="workflowGuidanceSummary">
        <strong role="status" aria-live="polite">{model.headline}</strong>
        {model.tone === 'attention' || model.tone === 'ready'
          ? <details className="workflowWhy">
              <summary>{model.tone === 'attention' ? 'Why this needs you' : 'Why this is ready'}</summary>
              <p>{model.guidance}</p>
            </details>
          : <small>{model.guidance}</small>}
      </div>
    </div>
  </section>;
}

export function renderChangesWorkflow(model: ChangesWorkflowModel) {
  const host = document.getElementById('changesWorkflowExperience');
  if (!host) return;
  if (!root) root = createRoot(host);
  root.render(<Workflow model={model} />);
}
