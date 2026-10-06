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

function enhanceRosterDateControl(control: HTMLElement) {
  if (control.dataset.coherentDate === 'true') return;
  const input = control.querySelector<HTMLInputElement>('input[type="date"]');
  if (!input) return;

  const text = document.createElement('span');
  text.className = 'rosterDateText';
  text.setAttribute('role', 'button');
  text.setAttribute('tabindex', '0');
  text.setAttribute('aria-label', 'Choose roster night');
  input.insertAdjacentElement('afterend', text);

  const sync = () => {
    const supplied = control.getAttribute('data-date-label') || '';
    text.textContent = supplied || formatRosterDate(input.value) || 'Choose night';
  };
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
  sync();
}

function enhanceProductShell() {
  document.querySelectorAll<HTMLElement>('.rosterDateControl').forEach(enhanceRosterDateControl);
  document.documentElement.dataset.productShell = '50.1';
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
