import { composeOperationalContexts } from './selected-night';
const formatRosterDate = (value: string) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return '';
  const date = new Date(`${value}T12:00:00`);
  return new Intl.DateTimeFormat('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  }).format(date);
};

function openNativePicker(input: HTMLInputElement) {
  if (input.disabled) return;
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
  // Always normalise first so Android, iPhone and desktop never render two date controls.
  removeLegacyDatePresentation(control, input);

  let text = control.querySelector<HTMLElement>(':scope > .rosterDateText');
  if (!text) {
    text = document.createElement('span');
    text.className = 'rosterDateText';
    text.setAttribute('role', 'button');
    text.setAttribute('tabindex', '0');
    input.insertAdjacentElement('afterend', text);
  }

  const sync = () => {
    const supplied = control.getAttribute('data-date-label') || '';
    const nextLabel = formatRosterDate(input.value) || supplied || 'Choose night';
    if (control.getAttribute('data-date-label') !== nextLabel) control.setAttribute('data-date-label', nextLabel);
    if (text && text.textContent !== nextLabel) text.textContent = nextLabel;
    if (text) text.setAttribute('aria-label', `Choose roster night, ${nextLabel}`);
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

function addClass(selector: string, className: string) {
  document.querySelectorAll<HTMLElement>(selector).forEach((element) => {
    if (!element.classList.contains(className)) element.classList.add(className);
  });
}

function normaliseProductShell() {
  // These classes are the common structural contract used by the final product stylesheet.
  addClass('#today #appHeader, #changes .appScreenHeader, #breaks .appScreenHeader, #chat .appScreenHeader', 'appShellHeader');
  addClass('#today .hospitalStrip, #changes .primaryInstitution, #breaks .primaryInstitution, #chat .primaryInstitution', 'appInstitutionRow');
  addClass('#today .nightSectionIdentity, #changes .primaryScreenTitleRow, #breaks .primaryScreenTitleRow, #chat .primaryScreenTitleRow', 'appTitleBlock');
  addClass('#today .nightDateShell, #changes .changesDatePanel, #breaks .breaksContextPanel, #chat .chatRosterContext', 'appNightContext');
  addClass('#today .nightTeamIdentityContext, #changes .nightTeamIdentityContext, #breaks .nightTeamIdentityContext, #chat .chatShiftIdentity', 'appShiftIdentity');
  addClass('#today .dateNav.rosterDateControl, #changes .dateNav.rosterDateControl, #breaks .dateNav.rosterDateControl', 'appDateRail');
  addClass('.liveStatus, #breakPlanLive, .primaryConnectionLine, .headerLiveChip', 'appLiveStatus');
  addClass('.bottom.reactTabs', 'appDock');

  composeOperationalContexts();

  const chatRosterContext = document.querySelector<HTMLElement>('#chat .chatRosterContext');
  const chatSafety = document.querySelector<HTMLElement>('#chat .chatSafetyNotice');
  const chatUtility = document.querySelector<HTMLElement>('#chat .chatUtilityGroup');

  // Safety belongs beside chat context, not inside a second large settings card.
  // Moving the existing node preserves its ID, listeners, semantics and content.
  if (chatRosterContext && chatSafety) {
    chatSafety.classList.add('appSafetyBanner');
    if (chatSafety.previousElementSibling !== chatRosterContext) {
      chatRosterContext.insertAdjacentElement('afterend', chatSafety);
    }
  }
  if (chatUtility) chatUtility.classList.add('chatSettingsCompact');
}

function enhanceProductShell() {
  document.querySelectorAll<HTMLElement>('.rosterDateControl').forEach(enhanceRosterDateControl);
  normaliseProductShell();
  document.documentElement.dataset.productShell = '52.0';
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', enhanceProductShell, { once: true });
} else {
  enhanceProductShell();
}

// Message arrivals, clock ticks and input updates do not require a whole-app scan.
// Normalisation is coalesced and only structural shell mutations qualify.
let shellFrame = 0;
const structural = '.rosterDateControl, .prettyDateControl, .prettyDateButton, .appScreenHeader, .nightDateShell, .changesDatePanel, .breaksContextPanel, .chatRosterContext';
new MutationObserver(records => {
  const needsShell = records.some(record => record.target instanceof Element && record.target.closest('.rosterDateControl') ||
    Array.from(record.addedNodes).some(node => node instanceof Element && (node.matches(structural) || node.querySelector(structural))));
  if (!needsShell || shellFrame) return;
  shellFrame = requestAnimationFrame(() => { shellFrame = 0; enhanceProductShell(); });
}).observe(document.documentElement, {
  childList: true,
  subtree: true
});
