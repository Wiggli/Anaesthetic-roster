type Part = { key: string; label: string; detail: string };
export type AvailablePartsModel = {
  parts: Part[];
  conditional: { name: string; rotation: Part; overtime: Part } | null;
  coverageChoices: Part[];
  unassigned: string[];
  shortage: number;
  extras: number;
  complete: boolean;
};

export function AvailableParts({ model, onAllocate }: { model?: AvailablePartsModel; onAllocate: () => void }) {
  if (!model) return null;
  const pending = model.parts.length > 0 || model.conditional || model.coverageChoices.length > 0;
  return <section className="availableParts" aria-label="Available parts">
    <div className="availablePartsHeading"><h3>Available parts</h3><span>{model.parts.length ? `${model.parts.length} open` : pending ? 'Decision needed' : model.shortage ? 'Cover needed' : 'All assigned'}</span></div>
    <div className="availablePartsContent" aria-live="polite">
      {model.shortage > 0 && <p className="availablePartsWarning">{model.shortage} more {model.shortage === 1 ? 'nurse is' : 'nurses are'} needed to reach five; this plan remains provisional.</p>}
      {model.parts.length > 0 && <ul>{model.parts.map(part => <li key={part.key}><strong>{part.label}</strong><small>{part.detail}</small></li>)}</ul>}
      {model.coverageChoices.length > 0 && <div className="availablePartsDecision"><strong>Reliever chooses first</strong><p>{model.coverageChoices.map(part => part.label).join(' or ')}. The remaining part becomes available for overtime once the Reliever’s choice is saved.</p></div>}
      {model.conditional && <div className="availablePartsDecision"><strong>One more part depends on the seventh-nurse decision</strong><p>If {model.conditional.name} moves to seventh: <b>{model.conditional.rotation.label}</b> opens for overtime; if they keep their role: <b>Seventh nurse</b> opens instead.</p></div>}
      {!pending && !model.shortage && <p>All required parts are assigned.{model.extras > 0 ? ` ${model.extras} additional ${model.extras === 1 ? 'nurse is' : 'nurses are'} available as required.` : ''}</p>}
      {model.unassigned.length > 0 && !model.complete && <p className="availablePartsNurses"><strong>Awaiting a part</strong><span>{model.unassigned.join(' · ')}</span></p>}
    </div>
    {pending && <button type="button" className="availablePartsAction" onClick={onAllocate}>{model.conditional || model.coverageChoices.length ? 'Review allocation choices' : 'Allocate available parts'} <span aria-hidden="true">›</span></button>}
  </section>;
}
