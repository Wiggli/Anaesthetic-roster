const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const storage = new Map();
const noopElement = () => ({
  classList: { add() {}, remove() {}, toggle() {} },
  style: {},
  querySelectorAll() { return []; },
  querySelector() { return null; },
  setAttribute() {},
  removeAttribute() {}
});
const context = {
  console,
  Date,
  Intl,
  Math,
  JSON,
  Set,
  Map,
  Array,
  Object,
  String,
  Number,
  Promise,
  setTimeout,
  clearTimeout,
  setInterval() { return 0; },
  clearInterval() {},
  navigator: { onLine: true, userAgent: 'test', serviceWorker: {} },
  localStorage: {
    getItem(key) { return storage.has(key) ? storage.get(key) : null; },
    setItem(key, value) { storage.set(key, String(value)); },
    removeItem(key) { storage.delete(key); }
  },
  document: {
    visibilityState: 'visible',
    body: noopElement(),
    getElementById() { return noopElement(); },
    querySelector() { return null; },
    querySelectorAll() { return []; },
    createElement() { return noopElement(); }
  },
  window: {
    supabase: null,
    addEventListener() {},
    matchMedia() { return { matches: false }; },
    scrollTo() {},
    navigator: {}
  },
  confirm() { return true; },
  alert() {},
  Blob,
  URL
};
context.window.window = context.window;
vm.createContext(context);
for (const file of ['app-core.js', 'app-ui.js']) {
  const source = fs.readFileSync(path.join(__dirname, '..', file), 'utf8').replace(/\nbind\(\);\s*\ninitApplication\(\);\s*$/, '');
  vm.runInContext(source, context, { filename: file });
}

context.rebuildCalculatedRoster();
assert.equal(context.verifyReference().mismatches, 0, 'verified reference rotation changed');
assert.equal(context.R.length, 138, 'published reference must contain 138 nights');

storage.set('anaes_offline_snapshot', JSON.stringify({
  saved_at: '2026-09-18T12:00:00.000Z',
  nightChanges: { '2026-09-18': [{ id: 'absence-1', absent_name: 'James' }], '2026-09-22': 'invalid legacy value' },
  nightOvertime: null,
  fiveCoverChoices: [],
  rosterSettings: context.rosterSettings,
  rotationVersions: context.rotationVersions,
  labourOrders: { '2026-09-18': null },
  nightRoleOverrides: { '2026-09-18': { assignments: {} } },
  nightPlanStatuses: 'invalid legacy value',
  appSettings: { shift_start: '19:00', shift_end: '07:00' },
  schemaVersion: '36'
}));
const repairedSnapshot = context.readOfflineSnapshot();
assert.ok(repairedSnapshot, 'an older partial saved roster must remain recoverable');
assert.equal(repairedSnapshot.nightChanges['2026-09-18'].length, 1, 'valid saved staffing rows must be retained');
assert.equal(repairedSnapshot.nightChanges['2026-09-22'], undefined, 'malformed saved staffing rows must be discarded safely');
assert.deepEqual(Object.keys(repairedSnapshot.nightOvertime), [], 'missing saved overtime data must become an empty date map');
assert.deepEqual(Object.keys(repairedSnapshot.fiveCoverChoices), [], 'malformed saved record maps must be repaired');
assert.equal(repairedSnapshot.schemaVersion, 36, 'saved schema metadata must be normalised');
storage.delete('anaes_offline_snapshot');

const groupedStartupRows = context.rowsGroupedByDate([
  { roster_date: '2026-09-18', id: 'first' },
  { roster_date: '2026-09-18', id: 'second' },
  { id: 'missing-date' },
  null
]);
assert.deepEqual(Array.from(groupedStartupRows['2026-09-18'], row => row.id), ['first', 'second'], 'startup staffing rows must stay grouped by roster date');
assert.deepEqual(Object.keys(context.rowsIndexedByDate([{ roster_date: '2026-09-18', id: 'only' }, null])), ['2026-09-18'], 'startup allocation rows must be indexed by roster date');

for (let i = 0; i < context.R.length; i += 1) {
  const row = context.R[i];
  const six = [row.first1, row.first2, row.second1, row.second2, row.pager, row.reliever];
  assert.equal(new Set(six).size, 6, `duplicate permanent assignment on ${row.date}`);
  if (i) assert.equal(context.daysBetween(context.R[i - 1].date, row.date), 4, `night interval changed at ${row.date}`);
}

const base = context.calculateNight('2026-08-21');
context.nightChanges = {};
context.nightOvertime = {};
assert.equal(context.staffingPlan(base).count, 6, 'normal night should have six nurses');
context.nightChanges[base.date] = [{ id: 'absence-1', absent_name: base.first1, reason: 'Leave' }];
assert.equal(context.staffingPlan(base).count, 5, 'one uncovered absence should produce five nurses');
context.nightOvertime[base.date] = [{ id: 'ot-1', nurse_name: 'Overtime One', allocation_key: null }];
assert.equal(context.staffingPlan(base).count, 6, 'one overtime nurse should restore six nurses');
context.nightOvertime[base.date].push({ id: 'ot-2', nurse_name: 'Overtime Two', allocation_key: null });
assert.equal(context.staffingPlan(base).count, 7, 'second overtime nurse should produce seven nurses');

// Every staffing mode must resolve through the same effective-plan functions.
context.nightChanges = { [base.date]: [{ id: 'absence-1', absent_name: base.pager, reason: 'Leave' }] };
context.nightOvertime = {};
let plan = context.staffingPlan(base);
let effective = context.applyChanges(base);
assert.equal(plan.count, 5, 'one absence without cover must create a five-nurse night');
assert.equal(plan.coverageKey, 'pager', 'a Pager vacancy must select automatic full-night cover');
assert.equal(effective.fullLW, base.reliever, 'the Reliever must cover full-night Labour Ward / Pager');
assert.equal(context.planIsProvisional(base), false, 'an automatic valid five-nurse plan must be complete');

context.nightChanges = { [base.date]: [
  { id: 'absence-1', absent_name: base.first1, reason: 'Leave' },
  { id: 'absence-2', absent_name: base.second1, reason: 'Leave' }
] };
context.nightOvertime = { [base.date]: [{ id: 'ot-1', nurse_name: 'Overtime One', allocation_key: null }] };
plan = context.staffingPlan(base);
assert.equal(plan.count, 5, 'two absences and one overtime nurse must create a five-nurse night');
assert.equal(plan.requiresCoverageChoice, true, 'multiple theatre vacancies must require the Reliever choice first');
assert.match(context.workflowTaskDetails(base, plan)[0], /Reliever/, 'the unresolved task must name the Reliever decision');

context.nightChanges = { [base.date]: [{ id: 'absence-1', absent_name: base.first1, reason: 'Leave' }] };
context.nightOvertime = { [base.date]: [{ id: 'ot-1', nurse_name: 'Overtime One', allocation_key: null }] };
plan = context.staffingPlan(base);
assert.equal(plan.count, 6, 'an absence plus overtime replacement must restore six nurses');
assert.deepEqual(Array.from(context.workflowTaskDetails(base, plan)), ['Choose a nurse for First Part theatre · position 1'], 'the interface must name the exact unresolved allocation');
context.allocationDrafts[base.date] = { first1: 'ot-1' };
assert.equal(context.workflowTaskCount(base, plan), 0, 'a valid draft selection must resolve the task immediately');
assert.equal(context.allocationPreview(base).first1, 'Overtime One', 'the shared allocation preview must apply the selected nurse');

context.nightChanges = {};
const sevenBase = { ...base, seventh: 'OT Nurse' };
context.nightOvertime = { [base.date]: [
  { id: 'ot-1', nurse_name: 'Overtime One', allocation_key: 'seventh' },
  { id: 'ot-2', nurse_name: 'Overtime Two', allocation_key: null }
] };
delete context.allocationDrafts[base.date];
plan = context.staffingPlan(sevenBase);
assert.equal(plan.count, 8, 'two overtime nurses without absences must produce eight nurses');
assert.equal(plan.coreComplete, true, 'the core seven-person plan must complete before extras are exposed');
assert.deepEqual(Array.from(context.additionalNurses(plan), nurse => nurse.id), ['ot-2'], 'only the remaining overtime nurse may appear as additional staff');

context.nightOvertime = { [base.date]: [
  { id: 'ot-1', nurse_name: 'Overtime One', allocation_key: 'seventh' },
  { id: 'ot-2', nurse_name: 'Overtime Two', allocation_key: 'seventh' }
] };
plan = context.staffingPlan(sevenBase);
assert.equal(plan.validAssignments.length, 1, 'duplicate saved records must never duplicate an effective allocation');
assert.equal(context.applyChanges(sevenBase).seventh, 'Overtime One', 'the effective plan must use one deterministic saved allocation');

const permanentSeventhBase = { ...base, seventh: base.first1 };
context.nightChanges = { [base.date]: [{ id: 'absence-1', absent_name: base.first1, reason: 'Leave' }] };
const fallback = context.seventhRotationChoice(permanentSeventhBase, context.nightChanges[base.date]);
assert.equal(fallback.fallback, true, 'an absent permanent seventh candidate must use the established fallback');
assert.notEqual(fallback.nurse, base.first1, 'the absent candidate must never remain the seventh nurse');

context.nightChanges = {};
context.nightOvertime = {};
context.labourOrderDrafts[base.date] = { first: base.pager, second: base.reliever, automatic: true };
const standardBreaks = context.breakData(context.applyChanges(base));
assert.ok(standardBreaks.second.includes(base.pager), 'Pager must work first part Labour Ward and take second break automatically');
assert.ok(standardBreaks.first.includes(base.reliever), 'Reliever must work second part Labour Ward and take first break automatically');
const personalFirst = context.personalAllocation(base, context.applyChanges(base), base.first1);
const personalUnselected = context.personalAllocation(base, context.applyChanges(base), '');
assert.equal(personalUnselected.context, 'Stored privately on this device', 'choosing a highlighted roster name must remain explicitly private');
assert.equal(personalFirst.title, 'First Part theatre', 'Your night must make the personal role the primary information');
assert.equal(personalFirst.period, '00:00–03:30', 'Your night must show the personal working period separately');
assert.equal(personalFirst.breakLabel, 'Second break', 'Your night must show the personal break separately');
assert.match(personalFirst.context, /^With /, 'Your night must identify the theatre colleague');
assert.equal(context.personalAssignmentChanged(base, context.applyChanges(base), base.first1, personalFirst), false, 'an unchanged calculated role must not be labelled as changed');
const swappedPersonalNight = { ...base, first1: base.first2, first2: base.first1 };
const personalSwap = context.personalAllocation(base, swappedPersonalNight, base.first1);
assert.equal(context.personalAssignmentChanged(base, swappedPersonalNight, base.first1, personalSwap), true, 'a night-only personal role change must be labelled clearly');

context.nightChanges = { [base.date]: [{ id: 'absence-1', absent_name: base.first1, replacement_name: 'Legacy Cover' }] };
context.nightOvertime = {};
plan = context.staffingPlan(base);
effective = context.applyChanges(base);
assert.equal(plan.count, 6, 'legacy named replacement cover must not inflate staffing');
assert.equal(effective.first1, 'Legacy Cover', 'legacy replacement cover must occupy only the absent role');
assert.equal(new Set(context.activeNames(effective)).size, 6, 'replacement cover must not duplicate an effective allocation');

assert.equal(context.operationalRosterDate(new Date('2026-08-22T00:00:00Z')), '2026-08-21', '02:00 Malta must stay on the current working night');
assert.equal(context.operationalRosterDate(new Date('2026-08-22T04:59:00Z')), '2026-08-21', '06:59 Malta must stay on the current working night');
assert.equal(context.operationalRosterDate(new Date('2026-08-22T05:00:00Z')), '2026-08-22', '07:00 Malta must move to the next date');
assert.equal(context.operationalRosterDate(new Date('2026-08-22T17:00:00Z')), '2026-08-22', '19:00 Malta must use the current date');

const originalVersions = context.rotationVersions.slice();
const before = context.calculateNight('2026-07-04');
const prospective = context.calculateNight('2026-07-08');
context.rotationVersions = originalVersions.concat([{
  effective_from: '2026-07-08',
  first1: prospective.first1 === 'James' ? 'New Nurse' : prospective.first1,
  first2: prospective.first2 === 'James' ? 'New Nurse' : prospective.first2,
  second1: prospective.second1 === 'James' ? 'New Nurse' : prospective.second1,
  second2: prospective.second2 === 'James' ? 'New Nurse' : prospective.second2,
  pager: prospective.pager === 'James' ? 'New Nurse' : prospective.pager,
  reliever: prospective.reliever === 'James' ? 'New Nurse' : prospective.reliever,
  seventh_anchor: prospective.seventh === 'James' ? 'New Nurse' : prospective.seventh,
  seventh_cycle: context.ORIGINAL_SEVENTH.map(name => name === 'James' ? 'New Nurse' : name)
}]);
assert.deepEqual(context.calculateNight('2026-07-04'), before, 'a permanent change must not alter earlier nights');

const sw = fs.readFileSync(path.join(__dirname, '..', 'service-worker.js'), 'utf8');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const manifest = fs.readFileSync(path.join(__dirname, '..', 'manifest.webmanifest'), 'utf8');
const releaseMeta = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'release.json'), 'utf8'));
const themeBootstrap = fs.readFileSync(path.join(__dirname, '..', 'theme-bootstrap.js'), 'utf8');
const ui = fs.readFileSync(path.join(__dirname, '..', 'app-ui.js'), 'utf8');
const css = fs.readFileSync(path.join(__dirname, '..', 'styles.css'), 'utf8');
const workflow = fs.readFileSync(path.join(__dirname, '..', '.github', 'workflows', 'deploy-pages.yml'), 'utf8');
const syncMigration = fs.readFileSync(path.join(__dirname, '..', 'supabase', 'migrations', '20260911180000_live_sync_atomic_role_overrides.sql'), 'utf8');
const roleMigration = fs.readFileSync(path.join(__dirname, '..', 'supabase', 'migrations', '20260914150000_custom_five_nurse_roles.sql'), 'utf8');
const constraintMigration = fs.readFileSync(path.join(__dirname, '..', 'supabase', 'migrations', '20260914190000_expand_night_role_override_constraint.sql'), 'utf8');
const identityMigration = fs.readFileSync(path.join(__dirname, '..', 'supabase', 'migrations', '20260913120000_account_roster_identity.sql'), 'utf8');
const startupMigration = fs.readFileSync(path.join(__dirname, '..', 'supabase', 'migrations', '20260918183000_atomic_startup_snapshot.sql'), 'utf8');
const sevenRoleFixMigration = fs.readFileSync(path.join(__dirname, '..', 'supabase', 'migrations', '20260919203000_fix_seven_nurse_override_key_count.sql'), 'utf8');
const rlsPerformanceMigration = fs.readFileSync(path.join(__dirname, '..', 'supabase', 'migrations', '20260920141553_optimize_rls_policy_checks.sql'), 'utf8');
const accessRequestMigration = fs.readFileSync(path.join(__dirname, '..', 'supabase', 'migrations', '20260924001000_access_request_approval.sql'), 'utf8');
assert.equal(context.APP_VERSION, context.RELEASE_HISTORY[0].version, 'APP_VERSION must match the newest release-history entry');
assert.deepEqual(Array.from(context.RELEASE_HISTORY, entry => entry.version), ['37.29','37.28','37.27','37.26','37.25','37.24','37.23','37.22','37.21','37.20','37.19','37.18','37.17','37.16','37.15','37.14','37.13','37.12','37.11','37.10','37.9','37.8','37.7','37.6','37.5','37.4','37.3','37.2','37.1','37.0','36.9','36.8','36.7','36.6','36.5','36.4','36.3','36.2','36.1','36.0','35.6','35.5','35.4','35.3','35.2','35.1','35.0','34.8','34.7','34.6','34.5','34.4','34.3','34.2','34.1','34.0','33.0','32.2','32.1','32.0','31.3','31.2','31.1','31.0','30.1','30.0','29.0','28.0','27.0','26.2','26.1','26.0'], 'release history must remain complete and newest first');
assert.equal(releaseMeta.version, context.APP_VERSION, 'network release metadata must match APP_VERSION');
assert.ok(releaseMeta.changes.length >= 3, 'network release metadata must describe the incoming update');
assert.equal(context.validUpdateMeta(releaseMeta), true, 'well-formed incoming release metadata must be accepted');
assert.equal(context.validUpdateMeta({ version: '37.4', title: 'Incomplete', changes: [] }), false, 'empty incoming release notes must be rejected');
assert.match(sw, new RegExp(`CACHE_NAME = 'anaesthetic-night-roster-v${context.APP_VERSION.replace('.', '-')}'`), 'service-worker cache must match APP_VERSION');
for (const asset of ['styles.css', 'theme-bootstrap.js', 'app-core.js', 'app-ui.js', 'manifest.webmanifest']) {
  assert.match(html, new RegExp(`${asset.replace('.', '\\.') }\\?v=${context.APP_VERSION.replace('.', '\\.')}`), `${asset} HTML query must match APP_VERSION`);
  assert.match(sw, new RegExp(`${asset.replace('.', '\\.') }\\?v=${context.APP_VERSION.replace('.', '\\.')}`), `${asset} app-shell query must match APP_VERSION`);
}
assert.match(manifest, new RegExp(`icon-192\\.png\\?v=${context.APP_VERSION.replace('.', '\\.')}`), 'manifest icon query must match APP_VERSION');
assert.match(manifest, /"purpose": "any maskable"/, 'the shared PWA icons must explicitly serve both standard and maskable purposes');
assert.doesNotMatch(manifest, /icon-maskable-/, 'the manifest must not reference duplicate maskable icon files');
const bootTheme = { root: {}, colour: {} };
vm.runInNewContext(themeBootstrap, {
  localStorage: { getItem() { return 'dark'; } },
  window: { matchMedia() { return { matches: false }; } },
  document: {
    documentElement: { style: {}, setAttribute(name, value) { bootTheme.root[name] = value; } },
    querySelector() { return { setAttribute(name, value) { bootTheme.colour[name] = value; } }; }
  }
});
assert.equal(bootTheme.root['data-theme'], 'dark', 'saved appearance must be applied to the root before the stylesheet paints');
assert.equal(bootTheme.colour.content, '#000000', 'pre-paint appearance must update the browser chrome colour');
for (const [file, source] of Object.entries({ 'index.html': html, 'styles.css': css, 'manifest.webmanifest': manifest, 'service-worker.js': sw })) {
  const versions = Array.from(source.matchAll(/[?&]v=([0-9]+(?:\.[0-9]+)+)/g), match => match[1]);
  assert.ok(versions.length, `${file} must contain a production cache-busting reference`);
  assert.deepEqual(Array.from(new Set(versions)), [context.APP_VERSION], `${file} cache-busting references must all match APP_VERSION`);
}
assert.match(css, /--apple-control-gap:10px/, 'Apple controls must share one canonical spacing token');
assert.match(css, /--apple-section-gap:14px/, 'Apple sections must share one canonical spacing token');
assert.match(css, /#today \.nightStatusRow\{[\s\S]*?gap:var\(--apple-control-gap\)[\s\S]*?background:transparent/, 'Night summary tiles must be visually separated');
assert.match(css, /#today \.roles\{[\s\S]*?display:grid;gap:var\(--apple-control-gap\)[\s\S]*?background:transparent/, 'Night allocation cards must be visually separated');
assert.match(css, /#breaks \.breakSummaryRow\{[\s\S]*?gap:var\(--apple-control-gap\)[\s\S]*?background:transparent/, 'Break summary cards must be visually separated');
assert.match(css, /body\.dark #today \.nightStatusRow[\s\S]*?background:transparent!important/, 'dark mode must preserve separation between information cards');
assert.match(css, /#changes \.changesWorkflowTabs,.authSwitch,.appearanceControl,#admin \.adminTabs/, 'true segmented controls must remain intentionally grouped');
assert.match(html, /id="screenInfoSheet"[\s\S]*aria-labelledby="screenInfoTitle"/, 'screen help must use an accessible information sheet');
assert.match(ui, /data-go-absence[\s\S]*data-go-overtime/, 'Night summary must link absences and overtime to their exact sections');
assert.match(ui, /bindStaffingTarget\('data-go-absence','\.absenceSection'\)[\s\S]*bindStaffingTarget\('data-go-overtime','\.overtimeSection'\)/, 'summary shortcuts must focus the relevant staffing form');
assert.doesNotMatch(html, /historyStep">4/, 'activity history must not appear as a fourth workflow step');
assert.match(html, /Activity for this night/, 'staffing history must have a clear non-step label');
assert.match(ui, /function updateStaffingActionAvailability\(\)[\s\S]*absence\.disabled=offline\|\|!absenceName\|\|!absenceName\.value[\s\S]*overtime\.disabled=offline\|\|!overtimeName\|\|!normaliseNurseName/, 'staffing actions must remain disabled until their required value is entered');
assert.match(ui, /roleAssignmentsDiffer[\s\S]*Unsaved night-only change[\s\S]*Save night-only change/, 'role-save controls must appear only for a genuine draft change');
assert.match(ui, /plan\.validAssignments\.some\(function\(item\)\{return item\.id===o\.id\}\)/, 'overtime status must use the validated, de-duplicated assignment');
assert.match(ui, /breakDate\.classList\.toggle\('hidden',!pending\)/, 'Breaks must hide duplicate date status once the plan is ready');
assert.equal(context.labourAssignmentDetail(base.pager, { first: base.pager, second: base.reliever }), 'Labour Ward first part · Second break', 'Pager summary must include the derived first-part duty without a second row');
assert.equal(context.labourAssignmentDetail(base.reliever, { first_part_name: base.pager, second_part_name: base.reliever }), 'Labour Ward second part · First break', 'Reliever summary must include the derived second-part duty without a second row');
assert.doesNotMatch(ui, /confirmationRow\('Labour Ward (?:first|second) part'/, 'confirmation must not repeat Pager and Reliever as separate Labour Ward rows');
assert.doesNotMatch(ui, /<div class="lab">LW (?:first|second) part/, 'full-roster cards must not repeat Pager and Reliever as separate Labour Ward rows');
assert.match(ui, /if\(!tasks&&!confirmNeeded\)\{host\.innerHTML='';return\}/, 'an unchanged plan must stop without repeating the calculated roster');
assert.match(ui, /confirmationChangedRows\(base,r,order\)[\s\S]*confirmationReasonHtml\(base\)[\s\S]*View full plan/, 'confirmation must lead with changed roles and their reason while keeping the full plan secondary');
assert.match(ui, /Tonight’s assignment[\s\S]*personalFact\('Time'[\s\S]*personalFact\('Break'/, 'Your night must expose the assignment, time and break separately');
assert.match(ui, /View in night situation/, 'Your night must link directly to the matching team allocation');
assert.match(css, /#today \.personalFacts\{[\s\S]*grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/, 'Your night facts must retain a readable responsive grid');
assert.match(css, /#today \.personalContextAction\{[\s\S]*min-height:48px/, 'Your night contextual action must retain a large touch target');
assert.match(ui, /confirmationHeading\.textContent=confirmNeeded\?'Confirm tonight’s changes':shared\?'Changes shared':'No changes to review'/, 'the confirmation heading must state the complete quiet outcome once');
assert.doesNotMatch(html, /id="labourOrderStep"/, 'obsolete Labour Ward editor markup must stay removed');
assert.doesNotMatch(ui, /function (?:labourRoleIsReady|setLabourOrderDraft|renderLabourOrder)\(/, 'obsolete Labour Ward editor helpers must stay removed');

const deployBlock = workflow.match(/- name: Prepare public app files[\s\S]*?(?=\n      - uses:)/);
assert.ok(deployBlock, 'deployment workflow must contain an explicit dist preparation step');
const copiedAssets = new Set(Array.from(deployBlock[0].matchAll(/^\s*cp\s+(.+)\s+dist\/$/gm), match => match[1].trim().split(/\s+/)).flat());
const requiredProductionAssets = [
  'index.html', 'styles.css', 'theme-bootstrap.js', 'app-core.js', 'app-ui.js', 'service-worker.js', 'manifest.webmanifest', 'release.json',
  'anaesthesia-header.jpg', 'mater-dei-logo.png', 'apple-touch-icon.png',
  'icon-192.png', 'icon-512.png'
];
for (const asset of requiredProductionAssets) {
  assert.ok(copiedAssets.has(asset), `${asset} must be copied into the GitHub Pages dist directory`);
  assert.ok(fs.existsSync(path.join(__dirname, '..', asset)), `${asset} must exist in the repository`);
}

const obsoleteFiles = ['index-18.html', 'app-v25.js', 'header-background.jpg', 'header-background.png', 'icon-maskable-192.png', 'icon-maskable-512.png'];
const productionSources = { 'index.html': html, 'app-core.js': fs.readFileSync(path.join(__dirname, '..', 'app-core.js'), 'utf8'), 'app-ui.js': ui, 'styles.css': css, 'manifest.webmanifest': manifest, 'service-worker.js': sw };
for (const obsolete of obsoleteFiles) {
  for (const [file, source] of Object.entries(productionSources)) assert.doesNotMatch(source, new RegExp(obsolete.replace('.', '\\.'), 'i'), `${file} must not reference obsolete ${obsolete}`);
  assert.ok(!copiedAssets.has(obsolete), `obsolete ${obsolete} must not be copied into dist`);
}

assert.match(workflow, /version: 2\.45\.5/, 'Supabase CLI must use the reviewed pinned version');
assert.doesNotMatch(workflow, /version:\s*latest/, 'deployment must not follow the mutable latest Supabase CLI');
const migrationDirectory = path.join(__dirname, '..', 'supabase', 'migrations');
const checkedInMigrations = fs.readdirSync(migrationDirectory).filter(name => /^\d{14}_.+\.sql$/.test(name)).sort();
assert.equal(checkedInMigrations.length, 17, 'all deployed Supabase migrations must remain checked in under supabase/migrations');
assert.equal(fs.readdirSync(path.join(__dirname, '..')).some(name => /^supabase-migration-.*\.sql$/.test(name)), false, 'legacy root migration files must stay removed');
assert.match(workflow, /supabase init[\s\S]*migration_files=\(supabase\/migrations\/\*\.sql\)[\s\S]*root_migrations=\(supabase-migration-\*\.sql\)/, 'deployment must use the checked-in Supabase migration directory and reject legacy root migrations');
assert.match(workflow, /migrate:[\s\S]*needs: test/, 'migration must depend on tests');
assert.match(workflow, /deploy:[\s\S]*needs: migrate/, 'deployment must depend on migration');
assert.match(workflow, /github\.event_name == 'push' \|\| github\.event_name == 'workflow_dispatch'/, 'production jobs must allow only main pushes or safe manual recovery');
assert.match(workflow, /github\.ref == 'refs\/heads\/main'/, 'production jobs must remain restricted to main');
assert.match(workflow, /service-worker\.js[\s\S]*CACHE_NAME = 'anaesthetic-night-roster-v\$\{cache_version\}'/, 'post-deployment checks must verify the live service-worker cache version');
assert.match(workflow, /browser-smoke:[\s\S]*@playwright\/test@1\.55\.0[\s\S]*playwright test/, 'CI must run a real-browser smoke suite before production migration');
assert.match(workflow, /migrate:[\s\S]*needs: \[test, browser-smoke\]/, 'production migration must wait for deterministic and browser smoke tests');
assert.match(workflow, /manifest\.webmanifest\?v=\$\{app_version\}[\s\S]*icon-192\.png\?v=\$\{app_version\}/, 'post-deployment checks must verify the live manifest version');
assert.match(ui, /entries=showHistory\?RELEASE_HISTORY:\[latest\]/, 'the update window must contain only the installed release');
assert.match(html, /id="updateBanner"[\s\S]*id="openUpdateDetailsBtn"[\s\S]*id="laterUpdateBtn"[\s\S]*id="applyUpdateBtn"/, 'the update notice must offer details, deferral and explicit installation');
assert.match(html, /id="updateDetails"[\s\S]*id="updateChangesList"[\s\S]*Your shared roster data stays intact[\s\S]*id="laterUpdateSheetBtn"[\s\S]*id="applyUpdateSheetBtn"/, 'the update sheet must explain changes, data safety and both choices');
assert.match(ui, /function showUpdate\(registration\)[\s\S]*sessionStorage\.getItem\('anaes_update_later'\)[\s\S]*loadPendingUpdateMeta/, 'an update must remain passive and respect session deferral');
assert.doesNotMatch(ui, /function showUpdate\(registration\)[^}]*showModal/, 'finding an update must never open a modal automatically');
assert.match(ui, /fetch\('\.\/release\.json\?check='\+Date\.now\(\),\{cache:'no-store'/, 'incoming release notes must be checked without a stale HTTP cache');
assert.match(sw, /requestUrl\.pathname\.endsWith\('\/release\.json'\)[\s\S]*fetch\(event\.request, \{ cache: 'no-store' \}\)[\s\S]*caches\.match\('\.\/release\.json'\)/, 'release metadata must use network-first delivery with an offline fallback');
assert.match(css, /\.updateBannerSummary[^{]*\{[^}]*min-height:44px/, 'the update notice details target must meet the minimum touch size');
assert.match(css, /body:not\(\[data-view="today"\]\) \.updateBanner\{display:none\}/, 'the passive update notice must stay out of Changes and Breaks workflows');
assert.match(css, /\.updateSheetActions button\{[^}]*min-height:50px/, 'update-sheet decisions must have comfortable touch targets');
assert.match(css, /@media\(prefers-reduced-motion:reduce\)[^{]*\{[^}]*\.updateBanner:not\(\.hidden\),\.updateSheet\[open\]\{animation:none!important\}/, 'the update experience must respect reduced-motion preferences');
assert.match(css, /\.bottom\{[\s\S]*backdrop-filter:saturate\(210%\) blur\(30px\)/, 'primary navigation must retain the reviewed glass material');
assert.match(css, /#changes \.staffingSection[^{]*\{[^}]*background:var\(--ios-surface\)/, 'clinical staffing surfaces must remain solid');
assert.match(css, /@supports not \(\(-webkit-backdrop-filter:[\s\S]*\.bottom\{background:#f8f8fa\}/, 'glass chrome must retain an opaque fallback');
assert.match(css, /@media\(prefers-reduced-motion:reduce\)[\s\S]*\.bottom button\.active\{animation:none\}/, 'tab selection motion must respect reduced-motion preferences');
assert.match(ui, /function undoAddedAbsence[\s\S]*remove_night_absence_v25/, 'absence Undo must use the versioned database function');
assert.match(ui, /function undoAddedOvertime[\s\S]*remove_night_overtime_v25/, 'overtime Undo must use the versioned database function');
assert.match(ui, /app_sync_state[\s\S]*setInterval\(checkSharedRevision,15000\)/, 'active clients must check the shared revision as a realtime fallback');
assert.match(ui, /CHANNEL_ERROR[\s\S]*TIMED_OUT[\s\S]*CLOSED[\s\S]*scheduleRealtimeReconnect/, 'realtime must recover from interrupted channels');
assert.match(ui, /window\.addEventListener\('pageshow',function\(\)\{applyThemePreference\(\);resumeSharedSync\(\)\}\)/, 'returning to an open app must restore appearance and resume shared synchronization');
assert.match(ui, /apply_night_role_override_v35/, 'night-only role mutations must use the atomic schema-35 RPC');
assert.doesNotMatch(ui, /saveAllocationsCompatibility/, 'allocation saves must not fall back to browser-side multi-step writes');
assert.doesNotMatch(ui, /saveAbsenceCompatibility|saveOvertimeCompatibility/, 'staffing saves must never fall back to browser-side multi-step writes');
assert.match(ui, /record_night_absence_v25[\s\S]*atomicRequired/, 'absence saves must require the atomic RPC');
assert.match(ui, /add_night_overtime_v25[\s\S]*atomicRequired/, 'overtime saves must require the atomic RPC');
assert.match(syncMigration, /create table if not exists public\.app_sync_state/, 'schema 33 must provide a shared revision signal');
assert.match(syncMigration, /create or replace function public\.apply_night_role_override_v33[\s\S]*insert into public\.night_role_override_history/, 'schema 33 must save role overrides and audit history atomically');
assert.match(syncMigration, /update public\.app_schema_version[\s\S]*version = 33/, 'schema 33 migration must update the schema marker');
assert.match(identityMigration, /add column if not exists roster_name text/, 'schema 34 must add the reviewed roster identity field');
assert.match(identityMigration, /allowed_users_roster_name_unique/, 'one roster identity must not be bound to multiple accounts');
assert.match(identityMigration, /user_role = 'admin'[\s\S]*set roster_name = v_roster_name/, 'only an active administrator may bind roster identities');
assert.match(identityMigration, /update public\.app_schema_version[\s\S]*version = 34/, 'schema 34 migration must update the schema marker');
assert.match(roleMigration, /create or replace function public\.apply_night_role_override_v35[\s\S]*insert into public\.night_role_override_history/, 'schema 35 must save custom role overrides and history atomically');
assert.match(roleMigration, /jsonb_object_keys\(p_assignments\)/, 'schema 35 must count JSON keys with a supported PostgreSQL primitive');
assert.doesNotMatch(roleMigration, /jsonb_object_length\(/, 'schema 35 must not call the unavailable JSONB object-length function');
assert.match(roleMigration, /night_overtime[\s\S]*nurse_name/, 'schema 35 must validate overtime nurses as part of the effective five-person team');
assert.match(roleMigration, /apply_night_role_override_v33[\s\S]*apply_night_role_override_v35/, 'schema 35 must repair older installed clients with a compatibility wrapper');
assert.match(roleMigration, /update public\.app_schema_version[\s\S]*version = 35/, 'schema 35 migration must update the schema marker');
assert.match(constraintMigration, /drop constraint if exists night_role_overrides_valid[\s\S]*add constraint night_role_overrides_valid/, 'schema 36 must replace the incompatible table constraint forward-only');
assert.match(constraintMigration, /when p_assignments ->> 'mode' = '5'[\s\S]*'fullLW'/, 'schema 36 must accept the reviewed five-role structure');
assert.match(constraintMigration, /'pager', 'reliever'[\s\S]*count\(\*\) = 6/, 'schema 36 must retain the original six-role structure');
assert.match(constraintMigration, /count\(distinct lower\(trim\(value\)\)\) = 5/, 'schema 36 must reject duplicate nurses in five-role rows');
assert.doesNotMatch(constraintMigration, /jsonb_object_length\(/, 'schema 36 must use supported JSONB operations');
assert.match(constraintMigration, /validate constraint night_role_overrides_valid/, 'schema 36 must validate existing rows before deployment completes');
assert.match(constraintMigration, /update public\.app_schema_version[\s\S]*version = 36/, 'schema 36 migration must update the schema marker');
assert.match(startupMigration, /create or replace function public\.get_roster_startup_v37\(\)[\s\S]*security definer[\s\S]*auth\.jwt\(\) ->> 'email'/, 'schema 37 startup snapshot must authenticate inside the protected function');
assert.match(startupMigration, /where lower\(account\.email\) = v_email[\s\S]*and account\.active/, 'the startup snapshot must reject inactive or unapproved accounts');
for (const table of ['night_changes','night_overtime','night_five_cover','roster_settings','rotation_versions','night_labour_order','night_plan_status','night_role_overrides']) assert.match(startupMigration, new RegExp(`public\\.${table}`), `startup snapshot must include ${table}`);
assert.match(startupMigration, /revoke all on function public\.get_roster_startup_v37\(\)[\s\S]*from public, anon[\s\S]*grant execute[\s\S]*to authenticated/, 'the startup snapshot must be callable only by authenticated users');
assert.match(startupMigration, /update public\.app_schema_version[\s\S]*version = 37/, 'schema 37 migration must update the schema marker');
assert.match(sevenRoleFixMigration, /elsif v_mode = '7'[\s\S]*v_expected_key_count := 8/, 'schema 39 must count the seven role keys plus the required mode key');
assert.match(sevenRoleFixMigration, /v_mode in \('5','7'\)[\s\S]*p_assignments ->> 'mode' <> v_mode/, 'schema 39 must continue requiring the explicit custom-arrangement mode');
assert.match(sevenRoleFixMigration, /update public\.app_schema_version set version=39/, 'schema 39 migration must update the schema marker');
assert.match(rlsPerformanceMigration, /drop policy if exists "Admin can view all accounts"[\s\S]*drop policy if exists "Users can view their account"/, 'schema 40 must remove the overlapping allowed-users read policies');
assert.match(rlsPerformanceMigration, /create policy "Authenticated accounts can view permitted accounts"[\s\S]*public\.is_roster_admin\(\)[\s\S]*lower\(email\) = lower\(coalesce\(\(select auth\.jwt\(\)\)/, 'schema 40 must preserve administrator-wide and member-own account reads in one policy');
for (const action of ['select', 'insert', 'update', 'delete']) {
  assert.match(rlsPerformanceMigration, new RegExp(`for ${action}[\\s\\S]*?\\(select auth\\.uid\\(\\)\\) = user_id`), `schema 40 ${action} profile policy must evaluate auth.uid once per statement`);
}
assert.doesNotMatch(rlsPerformanceMigration, /(?<!select )auth\.(?:uid|jwt)\(\)/, 'schema 40 policies must not evaluate Auth helpers once per row');
assert.match(rlsPerformanceMigration, /update public\.app_schema_version[\s\S]*version = 40/, 'schema 40 migration must update the schema marker');
assert.equal(context.EXPECTED_SCHEMA_VERSION, 45, 'the application must require the operational alerts and retention schema');
assert.match(accessRequestMigration, /create table if not exists public\.access_requests/, 'schema 43 must add a dedicated access request table');
assert.match(accessRequestMigration, /alter table public\.access_requests enable row level security/, 'access requests must use RLS');
assert.match(accessRequestMigration, /Users can request own access[\s\S]*auth\.uid\(\)[\s\S]*auth\.jwt\(\)/, 'a pending user may only create a request for their own authenticated identity');
assert.match(accessRequestMigration, /Admins can review access requests[\s\S]*is_roster_admin/, 'only roster administrators may review pending requests');
assert.match(accessRequestMigration, /grant update \(status, reviewed_at, reviewed_by\)/, 'authenticated clients must not receive blanket update rights on request identity fields');
assert.match(accessRequestMigration, /version = greatest\(version, 43\)/, 'schema 43 migration must update the schema marker');
assert.doesNotMatch(html, /personalSchedulePanel|personalScheduleList|exportMyCalendarBtn|My upcoming nights/, 'Night must not include the removed upcoming-nights section');
assert.doesNotMatch(ui, /boundRosterName|setRosterIdentity|personalUpcomingNights|renderPersonalSchedule|exportMyCalendar/, 'the app must not use account-to-roster binding or personal calendar features');
assert.match(ui, /requestStartupSnapshot\(\)[\s\S]*get_roster_startup_v37/, 'authorisation and shared data must use the protected single-request startup snapshot');
assert.doesNotMatch(ui, /supa\.from\('allowed_users'\)\.select\('email,display_name,user_role,active'\)/, 'startup must not make a separate serial account request');
assert.match(fs.readFileSync(path.join(__dirname, '..', 'app-core.js'), 'utf8'), /function myName\(\)\{return localStorage\.getItem\('anaes_my_name'\)/, 'roster highlighting must remain a private device choice');
assert.match(html, /id="recentActivityList"/, 'Night must retain recent activity');
assert.doesNotMatch(html, /copyBriefingBtn|copyBreaksBtn|emailRosterBtn|briefingActionsReason|breakActionsReason/, 'Night and Breaks must not restore redundant copy or email action controls');
assert.doesNotMatch(html, /adminQuickGrid|data-admin-open=/, 'Admin Overview must not repeat the primary management tabs as shortcut buttons');
assert.match(html, /data-admin-tab="overview"[\s\S]*data-admin-tab="publish"[\s\S]*data-admin-tab="team"[\s\S]*data-admin-tab="access"[\s\S]*data-admin-tab="data"/, 'Admin must retain one clear set of management tabs');
assert.match(ui, /activityType '\+esc\(item\.type\)/, 'recent activity must expose its semantic type for accessible colour styling');
assert.match(ui, /item\.detail\?'<small class="recentActivityDetail">'\+esc\(item\.detail\)/, 'recent activity must show the saved reason or allocation detail');
assert.match(html, /id="activityDetailSheet"[\s\S]*id="activityDetailContent"/, 'recent activity must provide a labelled native-style detail sheet');
assert.match(ui, /function openActivityDetail\(item,date\)[\s\S]*No additional reason was recorded/, 'activity detail sheet must show saved context without inventing a reason');
assert.match(ui, /data-activity-index[\s\S]*openActivityDetail/, 'recent activity rows must open their corresponding detail safely');
assert.doesNotMatch(ui.slice(ui.indexOf('function prepareChangesView'), ui.indexOf('\nfunction openScreenInfo')), /appendChild|insertBefore|insertAdjacentElement/, 'primary screen structure must not be moved at runtime');
assert.match(css, /\.mini,.screenInfoButton[\s\S]*min-width:44px;min-height:44px/, 'important compact controls must meet the 44 pixel touch target');
assert.match(css, /\.bottom button:not\(\.active\)\{color:var\(--apple-secondary\)\}/, 'inactive navigation labels must retain readable contrast');
assert.match(css, /button:disabled\{[\s\S]*opacity:1;filter:none;cursor:not-allowed/, 'disabled controls must remain fully legible without saturation loss');
assert.match(css, /\.activityType\.absence[\s\S]*\.activityType\.overtime[\s\S]*\.activityType\.allocation/, 'recent activity types must retain distinct semantic colours');
assert.match(css, /#today \.nightDateShell \.staffingCount\{margin-top:var\(--apple-control-gap\)\}/, 'the date and staffing surfaces must have deliberate separation');
assert.match(css, /\.bottom\{column-gap:6px;padding:5px 5px calc\(5px \+ env\(safe-area-inset-bottom\)\)\}/, 'bottom navigation targets must not visually touch and must preserve the device safe area');
assert.match(css, /\.recentActivityRow \.recentActivityDetail\{[^}]*color:var\(--apple-secondary\)[^}]*font-size:12px/, 'saved activity reasons must remain readable in the compact list');
assert.match(css, /\.recentActivityRow \.recentActivityDetail\{font-size:13px;font-weight:520\}/, 'operational activity reasons must receive the raised final type size');
assert.match(css, /\.view\.viewEntering\{animation:appleViewIn 280ms var\(--native-spring\)/, 'primary navigation must use restrained native-style motion');
assert.match(css, /data-date-direction="next"[\s\S]*appleDateNext 280ms/, 'date navigation must communicate forward direction');
assert.match(css, /body\.uiScrolled\[data-view="changes"\][\s\S]*changesScreenHeader/, 'Changes and Breaks headers must gain compact scroll-edge hierarchy');
assert.match(css, /\.formMessage\.success:not\(:empty\)::before\{content:'✓'/, 'successful saves must provide a non-colour confirmation symbol');
assert.match(ui, /function showButtonConfirmation\(button,restoredLabel\)[\s\S]*button\.textContent='✓ Saved'/, 'successful primary actions must acknowledge completion in place');
assert.match(css, /@media\(prefers-reduced-motion:reduce\)[\s\S]*\.view\.viewEntering[\s\S]*animation:none!important/, 'new motion must retain a reduced-motion fallback');
const luminance = hex => {
  const channels = hex.match(/[0-9a-f]{2}/gi).map(value => parseInt(value, 16) / 255).map(value => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4);
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
};
const contrast = (foreground, background) => {
  const first = luminance(foreground), second = luminance(background);
  return (Math.max(first, second) + 0.05) / (Math.min(first, second) + 0.05);
};
[['#246965','#dff1ef'],['#545960','#eef0f2'],['#b42332','#fff0f1'],['#8a4b00','#fff3dc'],['#246b3d','#e8f6ed'],['#8edbd6','#173b39'],['#c7c7cc','#2c2c2e']].forEach(([foreground, background]) => assert.ok(contrast(foreground, background) >= 4.5, `${foreground} on ${background} must meet readable text contrast`));
assert.match(css, /#changes>\.changesDatePanel label,#breaks>\.panel>\.grid2 label\{font-size:11px\}/, 'operational date labels must remain legible');
assert.doesNotMatch(fs.readFileSync(path.join(__dirname, '..', 'app-core.js'), 'utf8'), /[A-Z0-9._%+-]+@gov\.mt/i, 'public application source must not embed named government email recipients');
assert.match(ui, /night_role_override_history:allHistory\[2\]\.data/, 'administrator roster-data exports must include night-only role history');
assert.match(ui, /Private profile details and profile photos are excluded/, 'administrator export scope must identify excluded private profile data');
assert.match(sw, /requestUrl\.origin !== self\.location\.origin/, 'service worker must leave shared cross-origin data on the network');
assert.match(sw, /cdn\.jsdelivr\.net/, 'only the fixed public Supabase library may be cached');
assert.match(sw, /event\.request\.mode === 'navigate'[\s\S]*fetch\(event\.request, \{ cache: 'no-store' \}\)[\s\S]*catch\(\(\) => caches\.match\('\.\/index\.html'\)\)/, 'navigation must be network-first with the cached shell fallback');
assert.doesNotMatch(sw, /caches\.put\([^\n]*supabase/i, 'service worker must never cache shared Supabase data');
assert.match(sw, /requestUrl\.origin !== self\.location\.origin && !isSupabaseLibrary/, 'authentication, REST, realtime and private profile-photo origins must bypass caching');

assert.match(ui, /Finishing the shared roster connection…/, 'slow launch state must name the shared roster connection without declaring failure');
assert.match(ui, /Showing the last saved roster/, 'offline launch state must identify saved roster data');
assert.match(fs.readFileSync(path.join(__dirname, '..', 'app-core.js'), 'utf8'), /function withTimeout\(promise,ms,message\)/, 'startup network work must have a bounded timeout helper');
assert.match(html, /id="launchRecovery"[\s\S]*launchRetryBtn[\s\S]*launchOfflineBtn/, 'a delayed startup must offer retry and saved-roster recovery actions');
assert.match(ui, /fetch\(SUPABASE_URL\+'\/rest\/v1\/rpc\/get_roster_startup_v37'/, 'startup must send the protected snapshot request directly instead of waiting on the stalled client wrapper');
assert.match(ui, /Authorization:'Bearer '\+token/, 'the direct startup request must use the signed-in token');
assert.match(ui, /setTimeout\(function\(\)\{controller\.abort\(\)\},startupSnapshotTimeoutMs\)/, 'the direct startup request must still ask the browser to abort');
assert.match(ui, /withTimeout\([\s\S]*startupSnapshotTimeoutMs\+500,'The shared roster snapshot did not settle\.'/,
  'the direct startup request must have an application-level deadline independent of browser abort completion');
assert.match(ui, /async function requestStartupSnapshotXhr\(\)[\s\S]*new window\.XMLHttpRequest\(\)[\s\S]*get_roster_startup_v37[\s\S]*xhr\.timeout=startupSnapshotTimeoutMs/,
  'installed Android startup must use an independent bounded request for the protected snapshot');
assert.match(ui, /if\(preferCompatibilityStartup\(\)\)[\s\S]*snapshot=await requestStartupWithSessionRecovery\(requestStartupSnapshotXhr\)/,
  'Android must use the independent protected snapshot transport before compatibility reads');
assert.match(ui, /nightChanges=rowsGroupedByDate\(snapshot\.night_changes\)[\s\S]*labourOrders=rowsIndexedByDate\(snapshot\.night_labour_order\)[\s\S]*nightRoleOverrides=rowsIndexedByDate\(snapshot\.night_role_overrides\)/, 'one consistent snapshot must populate staffing and effective allocations together');
assert.match(ui, /async function requestCompatibilityStartup\(\)[\s\S]*allowed_users[\s\S]*night_changes[\s\S]*night_labour_order/,
  'startup must retain an independent authorised read-only route when the snapshot transport never settles');
assert.match(ui, /snapshot=await requestCompatibilityStartup\(\)/, 'a failed snapshot must automatically enter the compatibility route');
assert.match(ui, /launchSlowTimer=setTimeout\([\s\S]*Finishing the shared roster connection…[\s\S]*\},12000\)/, 'a slow request may update its status without presenting failure controls prematurely');
assert.doesNotMatch(ui, /launchSlowTimer=setTimeout\([\s\S]{0,240}showLaunchRecovery/, 'the normal cold-start timer must not display recovery controls before the request fails');
assert.doesNotMatch(ui, /await withTimeout\(loadNightHistory/, 'recent activity history must never block the core roster from opening');
assert.match(ui, /renderRecentActivity\(date\);renderChanges\(cur\(\)\)/, 'recent activity must refresh when its non-blocking history request completes');
assert.match(ui, /forcedOfflineSession[\s\S]*requireOnline/, 'saved-roster recovery must keep all writes read-only until reconnection');
assert.match(ui, /forcedOfflineSession=true;if\(cached&&restoreOfflineSnapshot\(\)\)\{updateOfflineControls\(\);return true\}/, 'saved-roster fallback must require the cached authorised account and disable writes before rendering');
assert.match(ui, /function readOfflineSnapshot\(\)[\s\S]*snapshotRowsByDate\(raw\.nightChanges\)[\s\S]*snapshotRecordsByDate\(raw\.nightRoleOverrides\)/, 'saved-roster recovery must validate and repair partial local data before rendering');
const retrySource = ui.slice(ui.indexOf('async function retryLaunchConnection'), ui.indexOf('\nfunction useSavedRosterAtLaunch'));
assert.match(retrySource, /Trying again…[\s\S]*Waiting for the shared roster to respond/, 'retry must show visible progress while reconnecting');
assert.match(retrySource, /if\(sharedLoadPromise\)try\{await sharedLoadPromise\}[\s\S]*if\(!launchFinished\)await authorizeUser/, 'retry must wait for an active request before starting a fresh authorisation attempt');
assert.doesNotMatch(retrySource, /hideLaunchRecovery\(/, 'retry must not hide all recovery feedback while reconnecting');
assert.doesNotMatch(ui, /online'[\s\S]{0,160}forcedOfflineSession\)forcedOfflineSession=false/, 'browser online status alone must not re-enable shared writes');
assert.match(ui, /statusChip staffingChip informational/, 'staffing count must remain a non-interactive Night summary item');
assert.match(ui, /Review '\+taskCount[\s\S]*allocation/, 'Night tasks must use an explicit allocation review label');
assert.match(ui, /Saved for this night only\. The permanent rotation is unchanged\./, 'night-only role save must state its scope');
const onboardingSequence = ui.slice(ui.indexOf('  return[', ui.indexOf('function onboardingPages')), ui.indexOf('\n  ];', ui.indexOf('function onboardingPages')));
assert.ok(onboardingSequence.indexOf('Your identity') > onboardingSequence.indexOf('onboardingChatPage()') && onboardingSequence.indexOf('Ready') > onboardingSequence.indexOf('Your identity'), 'onboarding must move from Chat to roster identity and then a concise ready step');
assert.equal(onboardingSequence.includes('Optional profile'), false, 'optional profile setup must stay in Account rather than first-use onboarding');
assert.equal(onboardingSequence.includes('Optional faster sign-in'), false, 'optional passkey setup must stay in Account rather than first-use onboarding');

console.log('All roster, staffing, operational-night and PWA safety checks passed.');
