const assert = require('node:assert/strict');
const fs = require('node:fs');
const css = fs.readFileSync('src/product-unified.css', 'utf8');
const tailwind = fs.readFileSync('src/tailwind.css', 'utf8');
const coherentShell = fs.readFileSync('src/coherent-shell.ts', 'utf8');
const changesWorkflow = fs.readFileSync('src/changes-workflow.tsx', 'utf8');
const syncSource = fs.readFileSync('src/legacy-ui/sync.js', 'utf8');
const checks = [
  ['date controls use a three-column mobile-safe grid', 'grid-template-columns: 40px minmax(0, 1fr) 40px'],
  ['date fields cannot wrap vertically', 'white-space: nowrap !important'],
  ['WebKit date editing is explicitly bounded', '::-webkit-datetime-edit'],
  ['Night allocation remains a dedicated hero', '#today #personalNightCard > .personalHeroSurface'],
  ['Changes retains the three-step workflow rail', '#changes .workflowSteps'],
  ['Breaks combines personal summary and statistics', '#breaks .breakSummaryRow'],
  ['Chat promotes the team conversation', '#chat .chatInboxTeamRow'],
  ['Actions has product-system ownership', '.quickActionsExperience'],
  ['Account uses the product surface language', '.accountSheetHeader'],
  ['small-phone handling exists', '@media (max-width: 370px)'],
  ['broader compact-phone guard exists', '@media (max-width: 430px)']
];
for (const [label, needle] of checks) assert.ok(css.includes(needle), label);
assert.equal((tailwind.match(/product-(?:coherence|unified)[^";]*\.css/g) || []).length, 1, 'only one active product-wide coherence stylesheet may be imported');
console.log('coherent layout regression contract tests passed');

assert.ok(css.includes('content: attr(data-date-label)'), 'controlled one-line date label must remain visible');
assert.ok(css.includes('opacity: 0 !important'), 'native date text must stay visually suppressed while input remains interactive');
assert.ok(css.includes('#today .nightContextCapsule'), 'duplicate Night context copy must remain suppressible');
assert.ok(coherentShell.includes("input.closest<HTMLElement>('.prettyDateControl')"), 'coherent date control must detect the legacy pretty-date wrapper');
assert.ok(coherentShell.includes('legacyWrapper.remove()'), 'coherent date control must remove the legacy pretty-date presentation');
assert.ok(coherentShell.includes("control.querySelectorAll<HTMLElement>('.prettyDateButton')"), 'coherent date control must remove stray legacy pretty-date buttons');
assert.ok(coherentShell.includes("text.textContent !== nextLabel"), 'date shell must not rewrite an unchanged label and retrigger its child-list observer');
assert.ok(coherentShell.includes("document.documentElement.dataset.productShell = '50.8'"), '50.8 product shell marker must identify the layout-consolidation pass');
assert.ok(coherentShell.includes("'appShellHeader'"), 'operational screens must share one shell-header contract');
assert.ok(coherentShell.includes("'appShiftIdentity'"), 'operational screens must share one shift-identity contract');
assert.ok(coherentShell.includes('appShiftContextRow'), 'Changes and Breaks must consolidate staffing beside shift identity instead of leaving a floating badge');
assert.ok(changesWorkflow.includes("fallback?.classList.add('hidden')"), 'React Changes workflow must hide the duplicate legacy stepper only after it mounts');
assert.ok(changesWorkflow.includes("legacyState?.classList.add('hidden')"), 'React Changes guidance must suppress the duplicate legacy workflow state');
assert.ok(css.includes('#changes .appShiftContextRow'), 'task screens must share the compact shift-context row');
assert.ok(coherentShell.includes("chatSafety.insertAdjacentElement") || coherentShell.includes("chatRosterContext.insertAdjacentElement('afterend', chatSafety)"), 'Chat safety guidance must move beside roster context without duplicating the node');
assert.ok(css.includes('--liquid-text: var(--liquid-label)'), 'canonical unified text token must resolve to the visible product label token');
assert.ok(css.includes('-webkit-text-fill-color: var(--liquid-label) !important'), 'selected-night label must explicitly paint visible text in WebKit');
assert.ok(syncSource.includes("return'current'"), 'same-version active controller must have an explicit current update state');
assert.ok(syncSource.includes('waitingWorkerIsRedundant()'), 'same-version waiting worker must be dismissed instead of trapping the update banner');
console.log('50.8 layout-consolidation, date and update regression checks passed');
