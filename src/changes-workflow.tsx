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
    document.getElementById('changesWorkflowExperience')?.setAttribute('data-react-ready', 'true');
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

  return <section className="workflowExperience" aria-label="Manage changes for the selected night">
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
        className={`workflowStep ${model.active === step.id ? 'active' : ''} ${step.attention ? 'hasTasks' : ''} ${step.complete ? 'complete' : ''} ${step.quiet ? 'quiet' : ''}`}
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
    <div className={`workflowGuidance workflowGuidance-${model.tone}`} role="status" aria-live="polite">
      <span className="workflowGuidanceMark" aria-hidden="true">{model.tone === 'attention' ? '!' : model.tone === 'ready' ? '→' : model.tone === 'complete' ? '✓' : '·'}</span>
      <span><strong>{model.headline}</strong><small>{model.guidance}</small></span>
    </div>
  </section>;
}

export function renderChangesWorkflow(model: ChangesWorkflowModel) {
  const host = document.getElementById('changesWorkflowExperience');
  if (!host) return;
  if (!root) root = createRoot(host);
  root.render(<Workflow model={model} />);
}
