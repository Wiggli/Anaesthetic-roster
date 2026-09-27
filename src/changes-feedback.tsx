import { useLayoutEffect } from 'react';
import { createRoot, type Root } from 'react-dom/client';

export type ChangesFeedbackModel = { message: string; state: string };
let root: Root | undefined;

function Feedback({ model }: { model: ChangesFeedbackModel }) {
  useLayoutEffect(() => {
    document.getElementById('allocationFormMessage')?.setAttribute('data-react-ready', 'true');
  }, []);
  if (!model.message) return null;
  const tone = model.state === 'success' ? 'success' : model.state === 'error' ? 'error' : 'progress';
  const label = tone === 'success' ? 'Shared plan' : tone === 'error' ? 'Needs attention' : 'Selected-night update';
  return <div className={`changesFeedback changesFeedback--${tone}`} role={tone === 'error' ? 'alert' : 'status'}>
    <span className="changesFeedbackMark" aria-hidden="true">{tone === 'success' ? '✓' : tone === 'error' ? '!' : '·'}</span>
    <div><strong>{label}</strong><p>{model.message}</p></div>
  </div>;
}

export function renderChangesFeedback(model: ChangesFeedbackModel) {
  const host = document.getElementById('allocationFormMessage');
  if (!host) return;
  if (!root) root = createRoot(host);
  root.render(<Feedback model={model} />);
}
