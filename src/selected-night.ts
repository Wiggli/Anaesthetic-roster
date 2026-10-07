/** One selected-night layout, preserving the canonical date inputs and their listeners. */
export function composeSelectedNight(panel: HTMLElement, staffingSelector: string) {
  if (panel.dataset.contextComposed === 'true') return;
  const identity = panel.querySelector<HTMLElement>('[data-night-team-identity]');
  const date = panel.querySelector<HTMLElement>('.rosterDateControl');
  const staffing = panel.querySelector<HTMLElement>(staffingSelector);
  if (!date || !staffing) return;
  const context = document.createElement('div');
  context.className = 'selectedNightContext';
  context.setAttribute('aria-label', 'Selected roster night');
  const row = document.createElement('div');
  row.className = 'selectedNightIdentity';
  if (identity) row.append(identity);
  const count = staffing.querySelector('strong');
  if (count) { count.classList.add('selectedNightCount'); row.append(count); }
  context.append(row, date);
  const reset = panel.querySelector<HTMLElement>('.dateResetBtn');
  if (reset) context.append(reset);
  // Empty wrappers and repeated metadata are removed, rather than visually overridden.
  panel.replaceChildren(context);
  panel.dataset.contextComposed = 'true';
}

export function composeOperationalContexts() {
  for (const [selector, count] of [
    ['#today .nightDateShell', '.staffingCount'],
    ['#changes .changesDatePanel', '.nightContextStaffing'],
    ['#breaks .breaksContextPanel', '.nightContextStaffing']
  ]) {
    const panel = document.querySelector<HTMLElement>(selector);
    if (!panel) continue;
    if (selector.startsWith('#breaks') && panel.dataset.contextComposed !== 'true') {
      const content = ['breakPersonalSummary', 'breakClockChange', 'breakSummaryRow', 'breakDate', 'breakList'];
      let anchor: Element = panel;
      for (const id of content) {
        const node = document.getElementById(id);
        if (node) {
          if (id === 'breakList') {
            const title = panel.querySelector('.breakPlanTitle');
            if (title) { anchor.insertAdjacentElement('afterend', title); anchor = title; }
          }
          anchor.insertAdjacentElement('afterend', node); anchor = node;
        }
      }
    }
    composeSelectedNight(panel, count);
  }
}
