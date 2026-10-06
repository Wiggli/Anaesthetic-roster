const assert = require('node:assert/strict');
const fs = require('node:fs');
const css = fs.readFileSync('src/product-unified.css', 'utf8');
const tailwind = fs.readFileSync('src/tailwind.css', 'utf8');
const coherentShell = fs.readFileSync('src/coherent-shell.ts', 'utf8');
const checks = [
  ['date controls use a three-column mobile-safe grid', 'grid-template-columns: 38px minmax(0, 1fr) 38px'],
  ['date fields cannot wrap vertically', 'white-space: nowrap !important'],
  ['WebKit date editing is explicitly bounded', '::-webkit-datetime-edit'],
  ['Night allocation remains a dedicated hero', '#today #personalNightCard > .personalHeroSurface'],
  ['Changes retains the three-step workflow rail', '#changes .workflowSteps'],
  ['Breaks combines personal summary and statistics', '#breaks .breakSummaryRow'],
  ['Chat promotes the team conversation', '#chat .chatInboxTeamRow'],
  ['Actions has product-system ownership', '.quickActionsExperience'],
  ['Account uses the product surface language', '.accountSheetHeader'],
  ['small-phone handling exists', '@media (max-width: 390px)'],
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
assert.ok(coherentShell.includes("document.documentElement.dataset.productShell = '50.2'"), '50.2 product shell marker must identify the real-device date conflict repair');
console.log('50.2 real-device date conflict regression checks passed');
