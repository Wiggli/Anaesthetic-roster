import { useLayoutEffect } from 'react';
import { createRoot, type Root } from 'react-dom/client';

type Change = { label: string; before: string; after: string; detail: string };
type PlanRole = { label: string; value: string; detail: string };
export type ConfirmationModel = {
  visible: boolean;
  blocked: boolean;
  instruction: string;
  changed: Change[];
  full: PlanRole[];
  reason: string;
};

let root: Root | undefined;

function Confirmation({ model }: { model: ConfirmationModel }) {
  useLayoutEffect(() => {
    document.getElementById('confirmationPreview')?.setAttribute('data-react-ready', 'true');
  }, []);
  if (!model.visible) return null;

  return <section className="confirmationExperience" aria-label="Selected-night confirmation preview">
    <div className={model.blocked ? 'confirmationWarning' : 'confirmationReady'} role={model.blocked ? 'alert' : 'status'}>
      {model.blocked ? `${model.instruction} before continuing.` : 'Review only what changed before sharing.'}
    </div>
    <div className="confirmationChanges" aria-label="Changed assignments">
      {model.changed.map((item, index) => <div className="confirmationChangeRow" key={`${item.label}-${index}`}>
        <div><span>{item.label}</span>{item.detail && <small>{item.detail}</small>}</div>
        <div className="confirmationChangeValues">
          <span className="confirmationCompareValue"><small>Rostered</small><del>{item.before}</del></span>
          <span className="confirmationCompareArrow" aria-hidden="true">→</span>
          <span className="confirmationCompareValue current"><small>This night</small><ins>{item.after}</ins></span>
        </div>
      </div>)}
    </div>
    {model.reason && <div className="confirmationReason"><span>Reason</span><b>{model.reason}</b></div>}
    <details className="confirmationFullPlan"><summary>View full plan</summary>
      <div>{model.full.map((role, index) => <div className="confirmationRow" key={`${role.label}-${index}`}>
        <div><span>{role.label}</span>{role.detail && <small>{role.detail}</small>}</div><b>{role.value}</b>
      </div>)}</div>
    </details>
  </section>;
}

export function renderChangesConfirmation(model: ConfirmationModel) {
  const host = document.getElementById('confirmationPreview');
  if (!host) return;
  if (!root) root = createRoot(host);
  root.render(<Confirmation model={model} />);
}
