const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.join(__dirname, '..');
const source = Object.fromEntries(['app-core.js', 'app-ui.js', 'index.html', 'manifest.webmanifest', 'service-worker.js', 'styles.css']
  .map(file => [file, fs.readFileSync(path.join(root, file), 'utf8')]));
assert.match(source['app-ui.js'], /FIVE_NIGHT_ROLE_KEYS=\['first1','first2','second1','second2','fullLW'\]/, 'custom five-nurse plans must expose four theatre roles and one full-night role');
assert.match(source['app-ui.js'], /function validRoleAssignmentsForNight[\s\S]*sameNightNameSet\(working,assigned\)/, 'custom role saves must match the effective nurses for that night');
assert.match(source['app-ui.js'], /apply_night_role_override_v35/, 'night-only role changes must use the schema-35 atomic RPC');

const storage = new Map();
const element = () => ({
  classList: { add() {}, remove() {}, toggle() {}, contains() { return false; } }, style: {}, dataset: {},
  querySelectorAll() { return []; }, querySelector() { return null; }, closest() { return null; },
  setAttribute() {}, removeAttribute() {}, appendChild() {}, addEventListener() {}, focus() {},
  textContent: '', innerHTML: '', value: '', disabled: false
});
const context = {
  console, Date, Intl, Math, JSON, Set, Map, Array, Object, String, Number, Promise, Blob, URL,
  setTimeout, clearTimeout, setInterval() { return 0; }, clearInterval() {},
  navigator: { onLine: true, userAgent: 'safety-test', serviceWorker: {}, clipboard: { writeText: async () => {} } },
  localStorage: {
    getItem(key) { return storage.has(key) ? storage.get(key) : null; },
    setItem(key, value) { storage.set(key, String(value)); }, removeItem(key) { storage.delete(key); }
  },
  document: {
    visibilityState: 'visible', body: element(), activeElement: null,
    getElementById() { return element(); }, querySelector() { return null; }, querySelectorAll() { return []; },
    createElement() { return element(); }
  },
  window: { supabase: null, addEventListener() {}, matchMedia() { return { matches: false }; }, scrollTo() {}, navigator: {} },
  confirm() { return true; }, alert() {}
};
context.window.window = context.window;
vm.createContext(context);
for (const file of ['app-core.js', 'app-ui.js']) {
  const script = source[file].replace(/\nbind\(\);\s*\ninitApplication\(\);\s*$/, '');
  vm.runInContext(script, context, { filename: file });
}
context.rebuildCalculatedRoster();
const base = context.calculateNight('2026-08-21');
const keys = ['first1', 'first2', 'second1', 'second2', 'pager', 'reliever'];
const absent = (key, id = key) => ({ id: `absence-${id}`, absent_name: base[key], reason: 'Test leave', updated_at: '2026-08-20T18:00:00Z' });
const overtime = (id, allocation_key = null, name = `Overtime ${id}`) => ({ id: `ot-${id}`, nurse_name: name, allocation_key, updated_at: '2026-08-20T19:00:00Z' });
function reset(changes = [], overtimeRows = []) {
  context.nightChanges = { [base.date]: changes };
  context.nightOvertime = { [base.date]: overtimeRows };
  context.fiveCoverChoices = {};
  context.allocationDrafts = {};
  context.seventhDecisionDrafts = {};
  context.labourOrders = {};
  context.labourOrderDrafts = {};
  context.nightPlanStatuses = {};
  context.nightRoleOverrides = {};
  context.roleOverrideHistory = {};
}

// Staffing boundaries and multiple simultaneous changes.
reset([absent('first1'), absent('first2'), absent('second1')]);
assert.equal(context.staffingPlan(base).count, 3, 'three simultaneous absences must remain below the five-nurse safety threshold');
assert.equal(context.staffingPlan(base).coreComplete, false);
assert.equal(context.planIsProvisional(base), true, 'a below-five plan must always be provisional');
reset([absent('first1'), absent('first2')], [overtime('1')]);
assert.equal(context.staffingPlan(base).count, 5, 'two absences followed by confirmed overtime must produce five staff');
reset();
assert.equal(context.staffingPlan(base).count, 6, 'unchanged standard staffing must contain six nurses');
assert.equal(context.workflowTaskCount(base, context.staffingPlan(base)), 0, 'standard staffing must create no confirmation task');
reset([], [overtime('1', 'seventh')]);
assert.equal(context.staffingPlan({ ...base, seventh: 'OT Nurse' }).count, 7);
reset([], [overtime('1', 'seventh'), overtime('2'), overtime('3')]);
let plan = context.staffingPlan({ ...base, seventh: 'OT Nurse' });
assert.equal(plan.count, 9, 'all confirmed overtime must count above seven');
assert.deepEqual(Array.from(context.additionalNurses(plan), row => row.id), ['ot-2', 'ot-3'], 'only overtime outside the core seven may be additional staff');

// Every vacancy type, including automatic Pager/Reliever coverage and theatre decisions.
for (const key of keys) {
  reset([absent(key)]);
  plan = context.staffingPlan(base);
  assert.equal(plan.count, 5, `${key} vacancy must produce five staff`);
  assert.equal(plan.coverageKey, key, `a single ${key} vacancy must resolve deterministically`);
  assert.equal(context.applyChanges(base).mode, '5');
}
reset([absent('pager')]);
assert.equal(context.applyChanges(base).fullLW, base.reliever, 'Reliever must cover a Pager vacancy for the full night');
reset([absent('reliever')]);
assert.equal(context.applyChanges(base).fullLW, base.pager, 'Pager must cover a Reliever vacancy for the full night');
reset([absent('first1'), absent('second2')], [overtime('1')]);
plan = context.staffingPlan(base);
assert.equal(plan.requiresCoverageChoice, true, 'multiple theatre vacancies must require the Reliever decision');
context.fiveCoverChoices[base.date] = { coverage_key: 'second2' };
plan = context.staffingPlan(base);
assert.equal(plan.coverageKey, 'second2', 'a valid saved five-nurse theatre choice must be honoured');
assert.deepEqual(Array.from(plan.availableKeys), ['first1'], 'overtime must be allocated only after the Reliever covers the chosen theatre role');

// Seven-person choice: permanent candidate can move, or overtime can remain seventh.
const permanentSeventh = { ...base, seventh: base.first1 };
reset([], [overtime('1')]);
plan = context.staffingPlan(permanentSeventh);
assert.equal(plan.requiresSeventhDecision, true);
assert.equal(plan.seventhVacatedKey, 'first1');
context.seventhDecisionDrafts[base.date] = 'rotation';
plan = context.staffingPlan(permanentSeventh);
assert.deepEqual(Array.from(plan.availableKeys), ['first1'], 'moving the candidate must open their permanent role');
context.seventhDecisionDrafts[base.date] = 'overtime';
plan = context.staffingPlan(permanentSeventh);
assert.deepEqual(Array.from(plan.availableKeys), ['seventh'], 'leaving the candidate in place must allocate overtime as seventh');

// Standard Labour Ward order and break rules share the same effective plan.
reset();
const standard = context.applyChanges(base);
context.ensureAutomaticLabourOrder(base, standard);
const order = context.labourOrderFor(standard);
assert.equal(order.first_part_name, base.pager);
assert.equal(order.second_part_name, base.reliever);
const breaks = context.breakData(standard);
assert.ok(breaks.second.includes(base.pager), 'Pager works first part and takes Second break');
assert.ok(breaks.first.includes(base.reliever), 'Reliever works second part and takes First break');
assert.equal(context.workflowNeedsConfirmation(base, 0), false, 'automatic six-person Labour Ward order needs no confirmation');

// Night-only swaps are unique, date-scoped, and do not mutate the rotation.
reset();
const original = context.calculateNight(base.date);
const later = context.calculateNight(context.addDays(base.date, 4));
const swapped = { ...Object.fromEntries(keys.map(key => [key, base[key]])), first1: base.first2, first2: base.first1 };
context.nightRoleOverrides[base.date] = { assignments: swapped, reason: 'Agreed swap' };
context.roleOverrideHistory[base.date] = [{ action: 'saved', assignments: swapped, reason: 'Agreed swap', changed_by: 'Tester', changed_at: '2026-08-20T20:00:00Z' }];
assert.equal(new Set(context.activeNames(context.applyChanges(base))).size, 6, 'a night-only swap must not duplicate a nurse');
assert.deepEqual(context.calculateNight(base.date), original, 'night override must not alter the permanent calculated rotation');
assert.deepEqual(context.calculateNight(context.addDays(base.date, 4)), later, 'night override must not alter later nights');
assert.equal(context.staffingHistoryFor(base.date)[0].title, 'Saved a night-only role arrangement', 'role-swap audit history must remain visible');

// Explicit agreed five-person overrides may place overtime on full-night Pager/Labour Ward.
reset([absent('first1'), absent('second2')], [overtime('1', null, 'Sadaf Nazia')]);
const workingFive = context.nightWorkingNames(base);
const theatreFive = workingFive.filter(name => context.canonicalNurseName(name) !== context.canonicalNurseName('Sadaf Nazia'));
assert.equal(theatreFive.length, 4, 'the scenario must contain four non-overtime nurses');
const customFive = {
  mode: '5',
  first1: theatreFive[0],
  first2: theatreFive[1],
  second1: theatreFive[2],
  second2: theatreFive[3],
  fullLW: 'Sadaf Nazia'
};
context.nightRoleOverrides[base.date] = { assignments: customFive, reason: 'Agreed one-night arrangement' };
plan = context.staffingPlan(base);
assert.equal(plan.count, 5, 'the custom arrangement must remain a five-nurse night');
assert.equal(plan.coreComplete, true, 'an exact custom five-person arrangement must be complete');
assert.equal(plan.requiresCoverageChoice, false, 'the explicit arrangement replaces only the unresolved default choice');
assert.equal(plan.validAssignments[0].nurse_name, 'Sadaf Nazia', 'the overtime nurse must be recognised as assigned');
const customApplied = context.applyChanges(base);
assert.equal(customApplied.mode, '5');
assert.equal(customApplied.fullLW, 'Sadaf Nazia', 'overtime may cover full-night Pager/Labour Ward by explicit agreement');
assert.equal(new Set(context.activeNames(customApplied).map(context.canonicalNurseName)).size, 5, 'each effective nurse must appear exactly once');
assert.equal(context.calculateNight(base.date).pager, base.pager, 'the permanent Pager rotation must remain unchanged');

// Similar names and display aliases must remain distinct stable identities.
assert.notEqual(context.canonicalNurseName('Andre'), context.canonicalNurseName('Andre Seychell'));
assert.equal(context.canonicalNurseName('André Bartolo'), 'andre');
assert.equal(context.professionalName('Andre'), 'André Bartolo');
assert.equal(context.professionalName('Andre Seychell'), 'Andre Seychell');
reset([absent('first1')], [overtime('1', 'first1'), overtime('2', 'first1'), overtime('1', 'second1')]);
plan = context.staffingPlan(base);
assert.equal(plan.validAssignments.length, 1, 'duplicate allocation keys and duplicate overtime IDs must be de-duplicated');
assert.equal(plan.validAssignments[0].id, 'ot-1', 'the first valid saved allocation wins deterministically');

// Working-night boundaries, daytime selection, and both Malta DST seasons.
const cases = [
  ['2026-01-10T05:59:00Z', '2026-01-09'], // 06:59 CET
  ['2026-01-10T06:00:00Z', '2026-01-10'], // 07:00 CET
  ['2026-08-22T10:00:00Z', '2026-08-22'], // daytime CEST
  ['2026-08-22T17:00:00Z', '2026-08-22'], // 19:00 CEST
  ['2026-03-29T04:59:00Z', '2026-03-28'], // 06:59 after spring transition
  ['2026-03-29T05:00:00Z', '2026-03-29'], // 07:00 after spring transition
  ['2026-10-25T05:59:00Z', '2026-10-24'], // 06:59 after autumn transition
  ['2026-10-25T06:00:00Z', '2026-10-25']  // 07:00 after autumn transition
];
for (const [instant, expected] of cases) assert.equal(context.operationalRosterDate(new Date(instant)), expected, instant);
context.idx = context.startingIndex(new Date('2026-08-22T10:00:00Z'));
assert.equal(context.automaticNightState(new Date('2026-08-22T10:00:00Z')).isCurrent, false, 'daytime must identify the next roster night, not a current shift');

// Incomplete plans cannot power final outputs, and every output path uses effective().
reset([absent('first1'), absent('first2'), absent('second1')]);
assert.equal(context.planIsProvisional(base), true);
assert.match(source['app-ui.js'], /function setOutputState\(base,plan\)[\s\S]*planIsProvisional\(base\)[\s\S]*button\.disabled=pending/);
for (const fn of ['renderBreaks', 'copyBreaks', 'emailRoster']) {
  const start = source['app-ui.js'].indexOf(`function ${fn}`);
  const next = source['app-ui.js'].indexOf('\nfunction ', start + 10);
  assert.match(source['app-ui.js'].slice(start, next < 0 ? undefined : next), /effective\(|applyChanges\(|allocationPreview\(/, `${fn} must derive from the effective plan`);
}
assert.match(source['app-ui.js'], /function renderPersonalNight\(base,r\)[\s\S]*personalAllocation\(base,r/);
assert.match(source['app-ui.js'], /function renderChanges\(base\)[\s\S]*staffingPlan\(base\)[\s\S]*updateChangesWorkflow\(base,plan\)/);

// Offline mutations are blocked, conflict revisions are sent atomically, and Supabase bypasses cache storage.
context.navigator.onLine = false;
assert.equal(context.requireOnline(), false, 'offline mode must reject writes');
assert.match(source['app-ui.js'], /expectedRevision=nightPlanStatuses\[base\.date\]/);
assert.match(source['app-ui.js'], /p_expected_revision:expectedRevision/);
assert.match(source['app-ui.js'], /changed on another device|revision/i, 'device conflicts must produce an explicit refresh/review path');
assert.doesNotMatch(source['app-ui.js'], /saveAbsenceCompatibility|saveOvertimeCompatibility/, 'absence and overtime writes must remain atomic');
assert.match(source['app-ui.js'], /failedAction\('Absence was not saved\.'/);
assert.match(source['app-ui.js'], /failedAction\('Overtime nurse was not saved\.'/);
assert.match(source['service-worker.js'], /requestUrl\.origin !== self\.location\.origin && !isSupabaseLibrary[\s\S]*return/, 'non-library Supabase requests must bypass caching');
assert.doesNotMatch(source['service-worker.js'], /caches\.put\([^\n]*supabase/i);

// Runtime/cache alignment stays guarded independently of the main regression file.
assert.equal(context.APP_VERSION, context.RELEASE_HISTORY[0].version);
const escapedVersion = context.APP_VERSION.replace('.', '\\.');
assert.match(source['service-worker.js'], new RegExp(`CACHE_NAME = 'anaesthetic-night-roster-v${context.APP_VERSION.replace('.', '-')}'`));
for (const asset of ['styles.css', 'app-core.js', 'app-ui.js', 'manifest.webmanifest']) {
  assert.match(source['index.html'], new RegExp(`${asset.replace('.', '\\.') }\\?v=${escapedVersion}`));
  assert.match(source['service-worker.js'], new RegExp(`${asset.replace('.', '\\.') }\\?v=${escapedVersion}`));
}
assert.match(source['manifest.webmanifest'], new RegExp(`icon-192\\.png\\?v=${escapedVersion}`));
assert.match(source['app-ui.js'], /select\('email,display_name,user_role,active'\)/, 'authorisation must retain the original access fields');
assert.doesNotMatch(source['app-ui.js'], /boundRosterName|setRosterIdentity|personalUpcomingNights|exportMyCalendar/, 'removed account binding and personal calendar code must not return');
assert.doesNotMatch(source['index.html'], /personalSchedulePanel|My upcoming nights|exportMyCalendarBtn/, 'the removed upcoming-nights interface must not return');
assert.match(source['index.html'], /id="briefingActionsReason"[^>]*aria-live="polite"/, 'unavailable Night output actions must have a live explanatory status');
assert.match(source['styles.css'], /button:disabled\s*\{[\s\S]*opacity:1;filter:none/, 'disabled buttons must remain readable in the final cascade');
assert.match(source['styles.css'], /body\.dark #today \.actionPanel #copyBriefingBtn\.buttonPending:disabled/, 'dark mode must retain a dedicated readable pending-action state');

// The final UI layer must win over historical selectors on narrow phones and in dark mode.
const finalAppleCss = source['styles.css'].slice(source['styles.css'].lastIndexOf('/* V36.3:'));
assert.match(finalAppleCss, /flex:0 0 44px;width:44px;height:44px;min-width:44px;min-height:44px/, 'header actions must remain fixed 44px circles in a constrained flex row');
assert.match(finalAppleCss, /max-width:44px;max-height:44px;aspect-ratio:1[\s\S]*border-radius:50%/, 'header actions must not distort into ovals');
assert.match(finalAppleCss, /body\.dark #changes input[\s\S]*background:#2c2c2e!important[\s\S]*color:#f5f5f7!important/, 'dark Changes fields must override legacy white surfaces');
assert.match(finalAppleCss, /body\.dark input::placeholder[\s\S]*color:#aeaeb2!important[\s\S]*opacity:1/, 'dark placeholders must remain visible');
assert.match(finalAppleCss, /body\.dark \.bottom button:not\(\.active\)\{color:#c7c7cc\}/, 'inactive dark navigation labels must remain readable');
assert.match(finalAppleCss, /body\.dark #changes \.changesWorkflowTabs button\{color:#d1d1d6/, 'dark workflow labels must remain readable');
assert.match(finalAppleCss, /body\.dark #changes \.changeItem[\s\S]*background:var\(--apple-surface\)!important/, 'saved staffing records must stay on solid dark surfaces');
const relativeLuminance = hex => {
  const channels = hex.match(/[a-f\d]{2}/gi).map(channel => parseInt(channel, 16) / 255)
    .map(channel => channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4);
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
};
const contrastRatio = (foreground, background) => {
  const values = [relativeLuminance(foreground), relativeLuminance(background)].sort((a, b) => b - a);
  return (values[0] + 0.05) / (values[1] + 0.05);
};
assert.ok(contrastRatio('c7c7cc', '1c1c1e') >= 4.5, 'inactive dark navigation text must meet WCAG AA contrast');
assert.ok(contrastRatio('d1d1d6', '2c2c2e') >= 4.5, 'dark workflow text must meet WCAG AA contrast');
assert.ok(contrastRatio('aeaeb2', '2c2c2e') >= 4.5, 'dark form placeholder text must meet WCAG AA contrast');

// Lightweight static accessibility checks for the shipped HTML shell.
const html = source['index.html'];
const tags = Array.from(html.matchAll(/<([a-z][\w-]*)([^>]*?)>/gi), match => ({ name: match[1].toLowerCase(), attrs: match[2], raw: match[0], index: match.index }));
const attr = (tag, name) => (tag.attrs.match(new RegExp(`\\s${name}=(?:"([^"]*)"|'([^']*)')`, 'i')) || []).slice(1).find(value => value !== undefined);
const ids = tags.map(tag => attr(tag, 'id')).filter(Boolean);
assert.equal(new Set(ids).size, ids.length, 'all static HTML IDs must be unique');
const labels = new Set(tags.filter(tag => tag.name === 'label').map(tag => attr(tag, 'for')).filter(Boolean));
for (const control of tags.filter(tag => ['input', 'select', 'textarea'].includes(tag.name))) {
  const id = attr(control, 'id');
  const before = html.slice(0, control.index);
  const nestedInLabel = before.lastIndexOf('<label') > before.lastIndexOf('</label>');
  const labelled = attr(control, 'aria-label') || attr(control, 'aria-labelledby') || (id && labels.has(id)) || nestedInLabel;
  assert.ok(labelled, `${control.raw} must have a label`);
}
for (const button of tags.filter(tag => tag.name === 'button')) {
  const bodyStart = button.index + button.raw.length;
  const body = html.slice(bodyStart, html.indexOf('</button>', bodyStart));
  const visibleText = body.replace(/<[^>]+>/g, '').trim();
  assert.ok(visibleText || attr(button, 'aria-label') || attr(button, 'aria-labelledby') || attr(button, 'title'), `${button.raw} must have an accessible name`);
}
for (const dialog of tags.filter(tag => tag.name === 'dialog')) {
  const end = html.indexOf('</dialog>', dialog.index);
  const body = html.slice(dialog.index + dialog.raw.length, end);
  assert.ok(attr(dialog, 'aria-label') || attr(dialog, 'aria-labelledby') || /<h[1-3][^>]*>[^<]+<\/h[1-3]>/i.test(body), `${dialog.raw} must have a programmatic label or visible heading`);
}
assert.match(source['app-core.js'], /setAttribute\('aria-current','page'\)/, 'primary navigation must expose aria-current');
assert.ok(tags.some(tag => attr(tag, 'aria-live')), 'the HTML shell must include aria-live feedback');

console.log('All expanded staffing, allocation, timezone, consistency, offline and accessibility safety checks passed.');
