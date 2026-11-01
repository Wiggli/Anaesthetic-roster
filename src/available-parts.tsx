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
  const pending = model.parts.length > 0 || Boolean(model.conditional) || model.coverageChoices.length > 0;
  const choices = Number(Boolean(model.conditional)) + Number(model.coverageChoices.length > 0);
  return <section className={`availableParts ${pending || model.shortage ? 'partsPending' : 'partsComplete'}`} aria-label="Available parts">
    <div className="availablePartsHeading"><h3>Available parts</h3><span>{[model.parts.length ? `${model.parts.length} open` : '', choices ? `${choices} choice${choices === 1 ? '' : 's'}` : ''].filter(Boolean).join(' · ') || (model.shortage ? 'Cover needed' : 'All assigned')}</span></div>
    <div className="availablePartsContent" aria-live="polite">
      {model.shortage > 0 && <p className="availablePartsWarning">{model.shortage} more {model.shortage === 1 ? 'nurse is' : 'nurses are'} needed to reach five; this plan remains provisional.</p>}
      {model.parts.length > 0 && <ul>{model.parts.map(part => <li key={part.key}><strong>{part.label}</strong><small>{part.detail}</small></li>)}</ul>}
      {model.coverageChoices.length > 0 && <div className="availablePartsDecision"><strong>Reliever chooses first</strong><p>{model.coverageChoices.map(part => part.label).join(' or ')}. The remaining part becomes available for overtime once the Reliever’s choice is saved.</p></div>}
      {model.conditional && <div className="availablePartsDecision"><strong>{model.conditional.name}: {model.conditional.rotation.label} → Seventh nurse?</strong><p>Overtime fills <b>{model.conditional.rotation.label}</b> if they move, or <b>Seventh nurse</b> if they stay.</p></div>}
      {!pending && model.extras > 0 && <p>{model.extras} additional {model.extras === 1 ? 'nurse' : 'nurses'} available as required.</p>}
      {model.unassigned.length > 0 && !model.complete && <details className="availablePartsNurses"><summary>{model.unassigned.length} overtime awaiting a part</summary><p>{model.unassigned.join(' · ')}</p></details>}
    </div>
    {pending && <button type="button" className="availablePartsAction" onClick={onAllocate}>{model.conditional || model.coverageChoices.length ? 'Review allocation choices' : 'Allocate available parts'} <span aria-hidden="true">›</span></button>}
  </section>;
}
