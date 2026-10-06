const formatRosterDate = (value: string) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return '';
  const date = new Date(`${value}T12:00:00`);
  return new Intl.DateTimeFormat('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long'
  }).format(date);
};

function openNativePicker(input: HTMLInputElement) {
  try {
    const picker = input as HTMLInputElement & { showPicker?: () => void };
    if (typeof picker.showPicker === 'function') {
      picker.showPicker();
      return;
    }
  } catch { /* fall through to the browser click path */ }
  input.focus({ preventScroll: true });
  input.click();
}

function removeLegacyDatePresentation(control: HTMLElement, input: HTMLInputElement) {
  const legacyWrapper = input.closest<HTMLElement>('.prettyDateControl');
  if (legacyWrapper && control.contains(legacyWrapper)) {
    legacyWrapper.parentNode?.insertBefore(input, legacyWrapper);
    legacyWrapper.remove();
  }

  control.querySelectorAll<HTMLElement>('.prettyDateButton').forEach((button) => button.remove());
}

function enhanceRosterDateControl(control: HTMLElement) {
  const input = control.querySelector<HTMLInputElement>('input[type="date"]');
  if (!input) return;

  // The legacy date enhancer can run after the modern shell and re-wrap this input.
  // Always normalise first, even when this control was already enhanced, so the two
  // generations of date UI can never coexist on Android, iPhone or desktop browsers.
  removeLegacyDatePresentation(control, input);

  let text = control.querySelector<HTMLElement>(':scope > .rosterDateText');
  if (!text) {
    text = document.createElement('span');
    text.className = 'rosterDateText';
    text.setAttribute('role', 'button');
    text.setAttribute('tabindex', '0');
    text.setAttribute('aria-label', 'Choose roster night');
    input.insertAdjacentElement('afterend', text);
  }

  const sync = () => {
    const supplied = control.getAttribute('data-date-label') || '';
    const nextLabel = supplied || formatRosterDate(input.value) || 'Choose night';
    // The product shell watches child-list mutations so it can repair a legacy
    // date wrapper injected later. Updating textContent unconditionally here can
    // create another child-list mutation and starve startup in a feedback loop.
    if (text && text.textContent !== nextLabel) text.textContent = nextLabel;
  };

  if (control.dataset.coherentDate !== 'true') {
    const open = (event: Event) => {
      event.preventDefault();
      event.stopPropagation();
      openNativePicker(input);
    };

    text.addEventListener('click', open);
    text.addEventListener('keydown', (event: KeyboardEvent) => {
      if (event.key === 'Enter' || event.key === ' ') open(event);
    });
    input.addEventListener('change', sync);
    input.addEventListener('input', sync);

    new MutationObserver(sync).observe(control, {
      attributes: true,
      attributeFilter: ['data-date-label']
    });

    control.dataset.coherentDate = 'true';
  }

  sync();
}

function enhanceProductShell() {
  document.querySelectorAll<HTMLElement>('.rosterDateControl').forEach(enhanceRosterDateControl);
  document.documentElement.dataset.productShell = '50.3';
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', enhanceProductShell, { once: true });
} else {
  enhanceProductShell();
}

new MutationObserver(enhanceProductShell).observe(document.documentElement, {
  childList: true,
  subtree: true
});
