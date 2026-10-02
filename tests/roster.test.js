const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const clinicalExperience = fs.readFileSync(path.join(__dirname, '..', 'src', 'clinical-experience.tsx'), 'utf8');
const changesWorkflowExperience = fs.readFileSync(path.join(__dirname, '..', 'src', 'changes-workflow.tsx'), 'utf8');
const changesConfirmationExperience = fs.readFileSync(path.join(__dirname, '..', 'src', 'changes-confirmation.tsx'), 'utf8');
const presentationCss = fs.readFileSync(path.join(__dirname, '..', 'src', 'presentation.css'), 'utf8');
const accountExperience = fs.readFileSync(path.join(__dirname, '..', 'src', 'account-experience.tsx'), 'utf8');
const quickActionsExperience = fs.readFileSync(path.join(__dirname, '..', 'src', 'quick-actions.tsx'), 'utf8');
const rudderCss = fs.readFileSync(path.join(__dirname, '..', 'src', 'rudder-navigation.css'), 'utf8');

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
assert.ok(context.R.some(r => r.date === '2026-09-26'), 'reference roster must include the next-night wording regression date');
const wordingTestOriginalIdx = context.idx;
context.idx = context.R.findIndex(r => r.date === '2026-09-26');
assert.equal(context.selectedNightCopy('2026-09-26', new Date('2026-09-24T12:00:00Z')).assignment, 'Next night’s assignment', 'a future automatic roster date must be described as the next night');
assert.equal(context.selectedNightCopy('2026-09-26', new Date('2026-09-26T10:00:00Z')).assignment, 'Next night’s assignment', 'before the 19:00 working-night boundary the selected roster date remains the next night');
context.idx = wordingTestOriginalIdx;

const normalDutyTiming = context.nightDutyTiming('2026-10-20');
assert.equal(normalDutyTiming.isClockChange, false, 'an ordinary Malta night must keep the standard duty split');
assert.equal(normalDutyTiming.handover, '03:30', 'an ordinary night must hand over at 03:30');
assert.equal(normalDutyTiming.partHours, 3.5, 'an ordinary night must give each part 3.5 actual hours');

const autumnDutyTiming = context.nightDutyTiming('2026-10-24');
assert.equal(autumnDutyTiming.isClockChange, true, 'the 24 October 2026 roster night must detect the Malta rollback');
assert.equal(autumnDutyTiming.direction, 'back', 'the October transition must be identified as clocks moving back');
assert.equal(autumnDutyTiming.totalHours, 8, 'the rollback must create eight actual hours between 00:00 and 07:00');
assert.equal(autumnDutyTiming.handover, '03:00', 'the rollback midpoint must be the post-change 03:00');
assert.equal(autumnDutyTiming.partHours, 4, 'the rollback must give First and Second Part four actual hours each');
assert.match(autumnDutyTiming.handoverDisplay, /after clock change/, 'the repeated-hour handover must be labelled unambiguously');
assert.equal(autumnDutyTiming.transitionUtc, Date.parse('2026-10-25T01:00:00Z'), 'the Malta rollback transition instant must be exposed for the repeated-hour rail');

const springDutyTiming = context.nightDutyTiming('2027-03-27');
assert.equal(springDutyTiming.isClockChange, true, 'the night before the March 2027 Malta transition must detect the skipped hour');
assert.equal(springDutyTiming.direction, 'forward', 'the March transition must be identified as clocks moving forward');
assert.equal(springDutyTiming.totalHours, 6, 'the spring jump must create six actual hours between 00:00 and 07:00');
assert.equal(springDutyTiming.handover, '04:00', 'the spring midpoint must move the handover to 04:00');
assert.equal(springDutyTiming.partHours, 3, 'the spring jump must give First and Second Part three actual hours each');
assert.equal(springDutyTiming.transitionUtc, Date.parse('2027-03-28T01:00:00Z'), 'the Malta spring transition instant must be exposed for the skipped-hour rail');

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
const navigation = fs.readFileSync(path.join(__dirname, '..', 'src', 'navigation.tsx'), 'utf8');
const workflow = fs.readFileSync(path.join(__dirname, '..', '.github', 'workflows', 'deploy-pages.yml'), 'utf8');
const syncMigration = fs.readFileSync(path.join(__dirname, '..', 'supabase', 'migrations', '20260911180000_live_sync_atomic_role_overrides.sql'), 'utf8');
const roleMigration = fs.readFileSync(path.join(__dirname, '..', 'supabase', 'migrations', '20260914150000_custom_five_nurse_roles.sql'), 'utf8');
const constraintMigration = fs.readFileSync(path.join(__dirname, '..', 'supabase', 'migrations', '20260914190000_expand_night_role_override_constraint.sql'), 'utf8');
const identityMigration = fs.readFileSync(path.join(__dirname, '..', 'supabase', 'migrations', '20260913120000_account_roster_identity.sql'), 'utf8');
const startupMigration = fs.readFileSync(path.join(__dirname, '..', 'supabase', 'migrations', '20260918183000_atomic_startup_snapshot.sql'), 'utf8');
const sevenRoleFixMigration = fs.readFileSync(path.join(__dirname, '..', 'supabase', 'migrations', '20260919203000_fix_seven_nurse_override_key_count.sql'), 'utf8');
const rlsPerformanceMigration = fs.readFileSync(path.join(__dirname, '..', 'supabase', 'migrations', '20260920141553_optimize_rls_policy_checks.sql'), 'utf8');
const accessRequestMigration = fs.readFileSync(path.join(__dirname, '..', 'supabase', 'migrations', '20260924001000_access_request_approval.sql'), 'utf8');
const chatPolicyFixMigration = fs.readFileSync(path.join(__dirname, '..', 'supabase', 'migrations', '20260924211500_fix_chat_reply_policy.sql'), 'utf8');
const logicFoundationMigration = fs.readFileSync(path.join(__dirname, '..', 'supabase', 'migrations', '20261002120000_logic_foundation_v47.sql'), 'utf8');
const reliabilityMigration = fs.readFileSync(path.join(__dirname, '..', 'supabase', 'migrations', '20261002153000_reliability_architecture_v48.sql'), 'utf8');
const trustBoundaryMigration = fs.readFileSync(path.join(__dirname, '..', 'supabase', 'migrations', '20261002180000_trust_boundary_v49.sql'), 'utf8');
assert.equal(context.APP_VERSION, context.RELEASE_HISTORY[0].version, 'APP_VERSION must match the newest release-history entry');
const releaseHistorySnapshot = Array.from(context.RELEASE_HISTORY, entry => ({
  version: String(entry.version),
  date: String(entry.date),
  title: String(entry.title),
  changes: Array.from(entry.changes, String)
}));
const fnv1a32 = value => {
  let hash = 0x811c9dc5;
  for (let i = 0; i < value.length; i++) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash.toString(16).padStart(8, '0');
};
const frozenReleaseHistory = releaseHistorySnapshot.slice(-89);
assert.equal(frozenReleaseHistory.length, 89, 'the permanent release-history baseline must remain present');
assert.equal(fnv1a32(JSON.stringify(frozenReleaseHistory)), '6cb5b43e', 'released changelog entries through the current baseline must never be rewritten, collapsed or deleted');
assert.equal(new Set(releaseHistorySnapshot.map(entry => entry.version)).size, releaseHistorySnapshot.length, 'release history versions must remain unique');
for (let i = 1; i < releaseHistorySnapshot.length; i++) {
  const previous = releaseHistorySnapshot[i - 1].version.split('.').map(Number);
  const current = releaseHistorySnapshot[i].version.split('.').map(Number);
  const previousNumber = (previous[0] || 0) * 10000 + (previous[1] || 0);
  const currentNumber = (current[0] || 0) * 10000 + (current[1] || 0);
  assert.ok(previousNumber > currentNumber, 'release history must remain newest first');
}
assert.equal(releaseMeta.version, context.APP_VERSION, 'network release metadata must match APP_VERSION');
assert.ok(releaseMeta.changes.length >= 3, 'network release metadata must describe the incoming update');
assert.equal(context.validUpdateMeta(releaseMeta), true, 'well-formed incoming release metadata must be accepted');
assert.equal(context.validUpdateMeta({ version: '37.4', title: 'Incomplete', changes: [] }), false, 'empty incoming release notes must be rejected');
assert.match(sw, new RegExp(`CACHE_NAME = 'anaesthetic-night-roster-v${context.APP_VERSION.replace('.', '-')}'`), 'service-worker cache must match APP_VERSION');
for (const asset of ['styles.css', 'theme-bootstrap.js', 'domain-logic.js', 'runtime-foundation.js', 'app-core.js', 'app-ui.js', 'manifest.webmanifest']) {
  assert.match(html, new RegExp(`${asset.replace('.', '\\.') }\\?v=${context.APP_VERSION.replace('.', '\\.')}`), `${asset} HTML query must match APP_VERSION`);
  assert.match(sw, new RegExp(`${asset.replace('.', '\\.') }\\?v=${context.APP_VERSION.replace('.', '\\.')}`), `${asset} app-shell query must match APP_VERSION`);
}
assert.match(manifest, new RegExp(`icon-192\\.png\\?v=${context.APP_VERSION.replace('.', '\\.')}`), 'manifest icon query must match APP_VERSION');
assert.match(manifest, /"purpose": "any maskable"/, 'the shared PWA icons must explicitly serve both standard and maskable purposes');
assert.match(manifest, /"shortcuts"[\s\S]*"\.\/\?view=night"[\s\S]*"\.\/\?view=chat"/, 'installed apps must expose Night and Chat shortcuts where supported');
assert.match(html, new RegExp(`class="launchMark"[\\s\\S]*icon-192\\.png\\?v=${context.APP_VERSION.replace('.', '\\.')}`), 'the cinematic launch must begin with the same app icon used by the installed PWA splash');
assert.match(themeBootstrap, /document\.documentElement\.style\.backgroundColor=background/, 'startup theme bootstrap must set the first-paint background before CSS loads');
assert.match(ui, /update_policy==='automatic'[\s\S]*No action required/, 'minor releases must support quiet automatic-on-reopen update messaging');
assert.match(ui, /function applyStandaloneUi\(\)[\s\S]*standaloneApp/, 'installed mode must remove browser-only installation chrome');
assert.match(ui, /function setupViewportState\(\)[\s\S]*keyboardVisible/, 'mobile viewport handling must protect the app chrome from the software keyboard');
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
assert.ok(navigation.includes("type SwipeAxis = 'pending' | 'horizontal' | 'vertical';"), 'page swipes must lock their gesture axis instead of re-evaluating direction on every move');
assert.ok(navigation.includes("if (settleTarget || document.querySelector('main.viewSwipeSettling')) finishContentSettle(true);"), 'a settling animation must be interruptible by the next touch instead of dropping that gesture');
assert.ok(navigation.includes("if (document.querySelector('main.viewSwipeStage') && !finishingCommittedTransition) clearContentDrag();"), 'explicit navigation must cancel stale staged swipes without tearing down the committed handoff');
assert.ok(navigation.includes('const hitTarget = document.elementFromPoint(touch.clientX, touch.clientY);'), 'an interrupted settle must re-hit-test the page currently under the finger');
assert.doesNotMatch(navigation, /dialog\[open\][^\n]*main\.viewSwipeSettling/, 'touch start must not reject a gesture solely because the previous page is settling');
assert.ok(navigation.includes('indicatorX.set(clamp(start.barOrigin + dx, firstPosition, lastPosition));'), 'bottom-tab dragging must track the finger continuously across the full bar');
assert.ok(navigation.includes("const targetIndex = axis === 'horizontal' ? nearestPositionIndex(reducedMotion ? draggedPosition : indicatorX.get())"), 'a long bottom-bar drag must settle on the nearest tab rather than only one neighbour');
assert.ok(navigation.includes("if (!destinations.includes(view) || (!inBar && !target.closest('main .view'))) return;"), 'Chat must no longer be excluded from safe content swipes');
assert.doesNotMatch(navigation, /blockedContentSelector[^\n]*chatMessageViewport/, 'Chat transcript whitespace must remain eligible for horizontal app swipes');
assert.ok(navigation.includes("const blockedContentSelector = 'input,select,textarea,[contenteditable=\"true\"]';"), 'text-entry controls must remain protected while tappable rows can participate in deliberate horizontal drags');
assert.doesNotMatch(navigation, /blockedContentSelector[^\n]*\[tabindex\]/, 'focusable Chat messages must not be rejected solely because they support keyboard actions');
assert.doesNotMatch(navigation, /blockedContentSelector[^\n]*(nightStatusRow|changesWorkflowTabs|dateNav|chatComposer|chatConversationList)/, 'empty padding inside common page containers must remain swipeable');
assert.ok(navigation.includes("if (ax >= 10 && ax >= ay * 1.16) first.axis = 'horizontal';"), 'page swipes must require clear horizontal intent before claiming the gesture');
assert.ok(navigation.includes("else if (ay >= 12 && ay >= ax * 1.12) first.axis = 'vertical';"), 'clearly vertical movement must yield promptly to normal page scrolling');
assert.match(css, /#chat \.chatMessageViewport,#chat \.chatTeamMessages,#chat \.chatMessages\{touch-action:pan-y\}/, 'Chat transcript scrollers must preserve vertical scroll while exposing horizontal gestures');
assert.ok(navigation.includes('current.style.transform = \`translate3d(\${offset}px,0,0)\`;'), 'the visible content page must track the finger directly without scale or opacity morphing');
assert.match(css, /main>\.view\{touch-action:pan-y\}/, 'all primary views including Chat must allow reliable horizontal app gestures while preserving vertical scroll');
assert.match(css, /\.bottom\.reactTabs\{touch-action:none;overscroll-behavior:none;isolation:isolate\}/, 'the React bottom bar must own its continuous drag without browser gesture cancellation');
assert.match(css, /main\.viewSwipeStage[\s\S]*\.view\.swipePreview/, 'page swipe staging must clip and position the adjacent screen');
assert.ok(navigation.includes('transitionToRef.current = animateViewChange;'), 'tab taps must use the same page-track transition engine as swipe navigation');
assert.ok(navigation.includes('animateViewChange(target);'), 'long bottom-bar drags must settle through the shared page-track transition');
assert.ok(navigation.includes('committingTarget = target;'), 'the final view handoff must preserve the staged destination until the normal view becomes active');
assert.ok(navigation.includes("pageAnimation = animate(from, to"), 'automatic page settling must use one shared animation value for both screens');
assert.ok(navigation.includes("type: 'spring'") && navigation.includes("stiffness: 390") && navigation.includes("damping: 38"), 'page settling must use restrained spring physics rather than a fixed tween');
assert.ok(navigation.includes("if (event.cancelable) event.preventDefault();"), 'claimed horizontal navigation must prevent the browser from stealing the gesture');
assert.ok(navigation.includes("document.addEventListener('touchmove', onMove, { passive: false });"), 'the authoritative touchmove listener must be able to claim horizontal navigation');
assert.ok(navigation.includes("const velocity = distance / elapsed;"), 'swipe completion must account for gesture velocity as well as distance');
assert.ok(navigation.includes("onUpdate: value => setPageTrackOffset(current, preview, value, direction, width)"), 'every animation frame must position both pages from the same track offset');
assert.ok(navigation.includes("window.viewScrollPositions?.[view]"), 'incoming page staging must use the destination tab\'s saved vertical scroll position');
assert.match(html, /<section id="today" class="view">[\s\S]*?<header id="appHeader">/, 'Night must own its header so the complete screen moves with the horizontal page track');
assert.doesNotMatch(css, /body\[data-view="(?:changes|breaks)"\] #appHeader\{display:none\}/, 'non-Night body state must not hide the Night header while Night is staged as an incoming page');
assert.match(css, /main>\.view\{width:min\(100%,704px\);max-width:704px;padding-left:12px;padding-right:12px;margin-inline:auto\}/, 'primary page slabs must include the full horizontal gutter so no viewport gap opens between screens');
assert.match(css, /viewSwipeSettling>\.view\.swipePreview\{transition:none!important\}/, 'CSS must not run an independent page transition that could desynchronise the shared track');
assert.match(css, /background:var\(--ios-bg,var\(--apple-bg,#f2f2f7\)\)/, 'staged pages must have an opaque app background so adjacent screens cannot bleed through');
assert.match(css, /opacity:1!important/, 'staged pages must remain fully opaque throughout the track transition');
assert.doesNotMatch(navigation, /viewMorphing|style\.opacity|scale\(/, 'navigation must not reintroduce overlapping opacity or scale morphs');

assert.match(css, /--apple-control-gap:10px/, 'Apple controls must share one canonical spacing token');
assert.match(html, /class="launchAtmosphere"[\s\S]*class="launchMark"/, 'cold launch must retain its cinematic atmosphere and focal app mark');
assert.match(css, /body\.appRevealing #appHeader[\s\S]*body\.appRevealing main[\s\S]*body\.appRevealing \.bottom/, 'cold launch must hand off into the app with one-time chrome and content reveal');
assert.match(css, /\.view:not\(\.hidden\)\{animation:none\}/, 'ordinary tab switching must not animate the whole view');
assert.match(css, /@media\(prefers-reduced-motion:reduce\)[\s\S]*launchAtmosphere[\s\S]*onboardingContentIn/, 'cinematic launch and onboarding must provide reduced-motion fallbacks');
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
assert.match(ui, /function smartChangesStep\(base\)[\s\S]*if\(tasks\)return'allocation'[\s\S]*workflowNeedsConfirmation\(base,tasks\)\)return'confirm'[\s\S]*return'staffing'/, 'Changes must smart-default to the step that actually needs attention');
assert.match(ui, /changesSmartDefaultDate!==base\.date[\s\S]*activeChangesStep=smartChangesStep\(base\)/, 'the smart Changes default must apply once per selected night rather than fighting manual navigation');
assert.match(changesWorkflowExperience, /workflowProgress[\s\S]*role="progressbar"[\s\S]*aria-valuenow=\{model\.progressValue\}/, 'Changes must expose real completion progress instead of decorative steps only');
assert.match(ui, /function localChangesDraftParts\(base\)[\s\S]*allocationDrafts\[date\][\s\S]*nightRoleOverrideDrafts\[date\][\s\S]*overtime entry/, 'unfinished local Changes work must be detected across allocation, role and staffing inputs');
assert.match(ui, /function allLocalChangesDraftParts\(\)[\s\S]*allocationDrafts[\s\S]*nightRoleOverrideDrafts[\s\S]*protectLocalChangesDraft[\s\S]*beforeunload',protectLocalChangesDraft/, 'leaving or reloading must protect unfinished Changes work across selected nights');
assert.match(ui, /function applyWaitingUpdate\(\)[\s\S]*allLocalChangesDraftParts\(\)[\s\S]*before updating so your work is not lost[\s\S]*ACTIVATE_UPDATE/, 'accepted PWA updates must not discard unfinished local Changes work');
assert.match(changesConfirmationExperience, /Rostered[\s\S]*This night/, 'confirmation must make the rostered versus selected-night comparison explicit');
assert.match(presentationCss, /\.workflowProgress[\s\S]*\.workflowProgressTrack[\s\S]*\.workflowProgressFill/, 'meaningful workflow progress must have a restrained visual treatment');
assert.match(ui, /function clockChangeDetailFor\(date\)[\s\S]*Handover moves to[\s\S]*First Part and Second Part each work/, 'clock-change copy must explain the equal-duty midpoint');
assert.match(ui, /function showClockChangeEducation\(date,force\)[\s\S]*clockchange/, 'clock-change nights must have contextual onboarding');
assert.match(ui, /showNotification\('Clock change tonight'[\s\S]*Equal-duty handover/, 'a live clock-change night may use an already-granted device notification without prompting for permission');
assert.match(clinicalExperience, /ClockChangeNotice[\s\S]*Equal handover[\s\S]*roster:clock-change-guide/, 'Night and Breaks must expose a replayable clock-change explanation');
assert.match(presentationCss, /\.clockChangeNotice[\s\S]*\.clockChangeOnboardingPreview[\s\S]*prefers-reduced-motion/, 'clock-change surfaces must include polished motion with a reduced-motion fallback');

assert.match(ui, /plan\.validAssignments\.some\(function\(item\)\{return item\.id===o\.id\}\)/, 'overtime status must use the validated, de-duplicated assignment');
assert.match(ui, /pending:pending,pendingReason:/, 'Breaks must pass the derived pending state to the typed interface');
assert.match(clinicalExperience, /if \(!model\.pending\) return null;/, 'Breaks must omit the pending notice once the plan is ready');
assert.equal(context.labourAssignmentDetail(base.pager, { first: base.pager, second: base.reliever }), 'Labour Ward first part · Second break', 'Pager summary must include the derived first-part duty without a second row');
assert.equal(context.labourAssignmentDetail(base.reliever, { first_part_name: base.pager, second_part_name: base.reliever }), 'Labour Ward second part · First break', 'Reliever summary must include the derived second-part duty without a second row');
assert.doesNotMatch(ui, /confirmationRow\('Labour Ward (?:first|second) part'/, 'confirmation must not repeat Pager and Reliever as separate Labour Ward rows');
assert.doesNotMatch(ui, /<div class="lab">LW (?:first|second) part/, 'full-roster cards must not repeat Pager and Reliever as separate Labour Ward rows');
assert.match(ui, /visible=!!\(tasks\|\|confirmNeeded\)[\s\S]*host\.innerHTML=visible\?/, 'an unchanged plan must leave the confirmation preview empty');
assert.match(ui, /confirmationChangedRows\(base,r,order\)[\s\S]*confirmationReason\(base\)[\s\S]*View full plan/, 'confirmation must lead with changed roles and their reason while keeping the full plan secondary');
assert.match(ui, /selectedNightCopy\(base\.date\)[\s\S]*assignmentLabel:nightCopy\.assignment[\s\S]*period:assignment\.period,breakLabel:assignment\.breakLabel/, 'Your night must pass date-aware assignment wording, time and break separately');
assert.doesNotMatch(ui, /<small>Tonight’s assignment<\/small>/, 'Your night must not hard-code Tonight for a future selected roster night');
assert.match(clinicalExperience, /const openFullNight[\s\S]*nightTeamDetails[\s\S]*scrollIntoView[\s\S]*View full night situation/, 'Your night must keep one direct full-night action that opens the matching team allocation');\nassert.match(clinicalExperience, /personalHeroFactGrid[\s\S]*<small>Duty<\/small>[\s\S]*<small>Break<\/small>[\s\S]*scanContextLabel/, 'Your night must keep Duty, Break and Colleague as the three scan-first facts');\nassert.match(clinicalExperience, /personalClockException[\s\S]*Clock-change night · equal duty[\s\S]*model\.clockChange\.summary/, 'clock-change nights must keep their equal-duty exception prominent in the personal hero');
assert.match(css, /#today \.personalFacts\{[\s\S]*grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/, 'Your night facts must retain a readable responsive grid');
assert.match(css, /#today \.personalContextAction\{[\s\S]*min-height:48px/, 'Your night contextual action must retain a large touch target');
assert.match(ui, /confirmationHeading\.textContent=confirmNeeded\?'Confirm selected-night changes':shared\?'Changes shared':'No changes to review'/, 'the confirmation heading must describe the selected night rather than assuming today');
assert.doesNotMatch(html, /id="labourOrderStep"/, 'obsolete Labour Ward editor markup must stay removed');
assert.doesNotMatch(ui, /function (?:labourRoleIsReady|setLabourOrderDraft|renderLabourOrder)\(/, 'obsolete Labour Ward editor helpers must stay removed');

assert.match(workflow, /- name: Build public app files\n        run: npm run build/, 'Pages must build the reviewed dist artifact');
const viteConfig = fs.readFileSync(path.join(__dirname, '..', 'vite.config.mts'), 'utf8');
const requiredProductionAssets = [
  'styles.css', 'theme-bootstrap.js', 'domain-logic.js', 'runtime-foundation.js', 'app-core.js', 'app-ui.js', 'manifest.webmanifest', 'release.json',
  'anaesthesia-header.jpg', 'mater-dei-logo.png', 'apple-touch-icon.png',
  'icon-192.png', 'icon-512.png'
];
for (const asset of requiredProductionAssets) {
  assert.ok(viteConfig.includes(`'${asset}'`), `${asset} must be explicitly emitted to the Pages dist directory`);
  assert.ok(fs.existsSync(path.join(__dirname, '..', asset)), `${asset} must exist in the repository`);
}
assert.match(viteConfig, /strategies: 'injectManifest'[\s\S]*filename: 'service-worker\.js'[\s\S]*injectRegister: false/, 'the built worker must retain the existing registration and scope');
assert.match(viteConfig, /publicDir: false/, 'build must not publish arbitrary repository files');

const obsoleteFiles = ['index-18.html', 'app-v25.js', 'header-background.jpg', 'header-background.png', 'icon-maskable-192.png', 'icon-maskable-512.png'];
const productionSources = { 'index.html': html, 'app-core.js': fs.readFileSync(path.join(__dirname, '..', 'app-core.js'), 'utf8'), 'app-ui.js': ui, 'styles.css': css, 'manifest.webmanifest': manifest, 'service-worker.js': sw };
for (const obsolete of obsoleteFiles) {
  for (const [file, source] of Object.entries(productionSources)) assert.doesNotMatch(source, new RegExp(obsolete.replace('.', '\\.'), 'i'), `${file} must not reference obsolete ${obsolete}`);
  assert.ok(!viteConfig.includes(`'${obsolete}'`), `obsolete ${obsolete} must not be emitted into dist`);
}

assert.match(workflow, /version: 2\.45\.5/, 'Supabase CLI must use the reviewed pinned version');
assert.doesNotMatch(workflow, /version:\s*latest/, 'deployment must not follow the mutable latest Supabase CLI');
const migrationDirectory = path.join(__dirname, '..', 'supabase', 'migrations');
const checkedInMigrations = fs.readdirSync(migrationDirectory).filter(name => /^\d{14}_.+\.sql$/.test(name)).sort();
assert.equal(checkedInMigrations.length, 23, 'all deployed and pending release Supabase migrations must remain checked in under supabase/migrations');
assert.ok(checkedInMigrations.includes('20261002193000_recovery_longevity_v50.sql'), 'the schema-50 recovery and longevity migration must stay checked in');
assert.equal(fs.readdirSync(path.join(__dirname, '..')).some(name => /^supabase-migration-.*\.sql$/.test(name)), false, 'legacy root migration files must stay removed');
assert.match(workflow, /supabase init[\s\S]*migration_files=\(supabase\/migrations\/\*\.sql\)[\s\S]*root_migrations=\(supabase-migration-\*\.sql\)/, 'deployment must use the checked-in Supabase migration directory and reject legacy root migrations');
assert.match(workflow, /migrate:[\s\S]*needs: test/, 'migration must depend on the complete required test job');
assert.match(workflow, /deploy:[\s\S]*needs: migrate/, 'deployment must depend on migration');
assert.match(workflow, /actions\/upload-artifact@v4[\s\S]*name: pages-dist[\s\S]*deploy:[\s\S]*actions\/download-artifact@v4[\s\S]*name: pages-dist/, 'deployment must use the exact dist artifact that passed the required test job');
assert.match(workflow, /github\.event\.pull_request\.number \|\| github\.ref[\s\S]*cancel-in-progress: \$\{\{ github\.event_name == 'pull_request' \}\}/, 'superseded pull-request verification runs must be cancelled without cancelling main deployments');
assert.match(workflow, /github\.event_name == 'push' \|\| github\.event_name == 'workflow_dispatch'/, 'production jobs must allow only main pushes or safe manual recovery');
assert.match(workflow, /github\.ref == 'refs\/heads\/main'/, 'production jobs must remain restricted to main');
assert.match(workflow, /service-worker\.js[\s\S]*anaesthetic-night-roster-v\$\{cache_version\}/, 'post-deployment checks must verify the live service-worker cache version');
assert.match(workflow, /browser-smoke:[\s\S]*@playwright\/test@1\.55\.0[\s\S]*verify:browser[\s\S]*browser-resilience:[\s\S]*verify:resilience/, 'browser verification must run in dedicated lanes before the required aggregate test gate');
assert.match(workflow, /test:[\s\S]*needs: \[build, regression, browser-smoke, browser-resilience\]/, 'the required test status must aggregate build, deterministic and browser verification lanes');
assert.match(workflow, /github\.event_name == 'pull_request'[\s\S]*--project=low-end-chromium[\s\S]*github\.event_name != 'pull_request'[\s\S]*chromium webkit/, 'pull requests must use Chromium resilience while release and scheduled runs retain WebKit coverage');
assert.match(workflow, /schedule:[\s\S]*cron:/, 'the workflow must keep a scheduled full compatibility run');
assert.match(workflow, /migrate:[\s\S]*needs: test/, 'production migration must wait for deterministic and browser verification in the required test job');
assert.match(workflow, /manifest\.webmanifest\?v=\$\{app_version\}[\s\S]*icon-192\.png\?v=\$\{app_version\}/, 'post-deployment checks must verify the live manifest version');
assert.match(ui, /entries=showHistory\?RELEASE_HISTORY:\[latest\]/, 'the update window must contain only the installed release');
assert.match(html, /id="updateBanner"[\s\S]*id="openUpdateDetailsBtn"[\s\S]*id="laterUpdateBtn"[\s\S]*id="applyUpdateBtn"/, 'the update notice must offer details, deferral and explicit installation');
assert.match(html, /id="updateDetails"[\s\S]*id="updateChangesList"[\s\S]*Your shared roster data stays intact[\s\S]*id="laterUpdateSheetBtn"[\s\S]*id="applyUpdateSheetBtn"/, 'the update sheet must explain changes, data safety and both choices');
assert.match(ui, /function waitingUpdateDeferralKey\(\)[\s\S]*anaes_update_later_[\s\S]*waitingUpdateVersion/, 'update deferral must be scoped to the specific waiting release instead of suppressing later releases in the same session');
assert.match(ui, /async function showUpdate\(registration\)[\s\S]*workerCacheName\(waiting\)[\s\S]*await loadPendingUpdateMeta\(\)[\s\S]*sessionStorage\.getItem\(waitingUpdateDeferralKey\(\)\)[\s\S]*!updateIsAutomatic\(\)/, 'update discovery must identify the waiting worker version, load its policy and apply only version-scoped deferral');
assert.match(ui, /function classifyWaitingUpdate\(\)[\s\S]*return'new'[\s\S]*return'refresh'[\s\S]*return'finish'/, 'waiting updates must distinguish a newer release from a same-version component refresh and a partially installed current release');
assert.match(ui, /function applyWaitingUpdate\(\)[\s\S]*ACTIVATE_UPDATE[\s\S]*setTimeout\(async function\(\)[\s\S]*updateRegistration\.waiting[\s\S]*window\.location\.reload\(\)/, 'explicit update activation must retain ACTIVATE_UPDATE and recover if controllerchange is missed');
assert.match(ui, /serverRequired=compatibilityNeedsUpdate\(\)[\s\S]*laterBanner\.classList\.toggle\('hidden',serverRequired\)[\s\S]*laterSheet\.classList\.toggle\('hidden',serverRequired\)/, 'a server-required safety update must remove deferral without auto-activating the waiting worker');
assert.match(ui, /function dismissWaitingUpdate\(\)[\s\S]*compatibilityNeedsUpdate\(\)[\s\S]*required before shared changes/, 'required safety updates must not be dismissible as ordinary optional releases');
assert.match(ui, /controllerchange'[\s\S]*finishUpdateActivation\(\)[\s\S]*refreshControllerCacheVersion\(\)[\s\S]*reloadForUpdate[\s\S]*window\.location\.reload\(\)/, 'controller changes must clear stale update UI and reload exactly when an accepted update is completing');
assert.match(sw, /GET_CACHE_VERSION'[\s\S]*event\.ports[\s\S]*postMessage\(payload\)[\s\S]*event\.source/, 'waiting and active service workers must both be able to report their cache version through MessageChannel or the controlling client');
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
assert.match(ui, /function undoAddedAbsence[\s\S]*remove_night_absence_v49/, 'absence Undo must use the versioned database function');
assert.match(ui, /function undoAddedOvertime[\s\S]*remove_night_overtime_v49/, 'overtime Undo must use the versioned database function');
assert.match(ui, /app_sync_state[\s\S]*scheduler\.every\('shared-revision',[\s\S]*realtimeSubscribed&&sharedSyncState==='live'\?60000:15000/, 'active clients must check the shared revision through the adaptive central scheduler');
assert.match(ui, /CHANNEL_ERROR[\s\S]*TIMED_OUT[\s\S]*CLOSED[\s\S]*scheduleRealtimeReconnect/, 'realtime must recover from interrupted channels');
assert.match(ui, /lifecycle\.setResumeHandler\(reconcileApplication\)/, 'returning to an open app must use the centralized resume reconciliation path');
assert.match(ui, /apply_night_role_override_v49/, 'night-only role mutations must use the guarded schema-48 RPC');
assert.doesNotMatch(ui, /saveAllocationsCompatibility/, 'allocation saves must not fall back to browser-side multi-step writes');
assert.doesNotMatch(ui, /saveAbsenceCompatibility|saveOvertimeCompatibility/, 'staffing saves must never fall back to browser-side multi-step writes');
assert.match(ui, /record_night_absence_v49[\s\S]*atomicRequired/, 'absence saves must require the atomic RPC');
assert.match(ui, /add_night_overtime_v49[\s\S]*atomicRequired/, 'overtime saves must require the atomic RPC');
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
assert.equal(context.EXPECTED_SCHEMA_VERSION, 50, 'the application must require the Recovery and Longevity schema');
assert.match(chatPolicyFixMigration, /reply_belongs_to_conversation[\s\S]*security definer[\s\S]*grant execute[\s\S]*to authenticated/, 'schema 46 must validate reply targets without recursive message-table RLS');
assert.match(chatPolicyFixMigration, /update public\.app_schema_version[\s\S]*version=46/, 'schema 46 migration must advance the schema marker');
assert.match(logicFoundationMigration, /create or replace function public\.app_server_clock_v47\(\)/, 'schema 47 must expose an authenticated server clock');
assert.match(logicFoundationMigration, /chat_messages_sender_client_message_uq/, 'schema 47 must deduplicate retried chat sends');
assert.match(logicFoundationMigration, /chat_mark_read_v47[\s\S]*greatest\(/, 'schema 47 must make chat read cursors monotonic');
assert.match(logicFoundationMigration, /update public\.app_schema_version[\s\S]*version=47/, 'schema 47 migration must advance the schema marker');
assert.match(reliabilityMigration, /create table if not exists public\.roster_operation_log/, 'schema 48 must persist idempotent roster operation ids');
assert.match(reliabilityMigration, /assert_roster_fresh_v48/, 'schema 48 must reject stale roster commands');
assert.match(reliabilityMigration, /validate_night_plan_v48/, 'schema 48 must validate final plans on the server');
assert.match(reliabilityMigration, /publish_roster_v48[\s\S]*PUBLISH_REGRESSION/, 'schema 48 must prevent publication rollback');
assert.match(reliabilityMigration, /upsert_rotation_version_v48[\s\S]*ROTATION_VERSION_EXISTS/, 'schema 48 must protect effective-dated rotation history');
assert.match(reliabilityMigration, /update public\.app_schema_version[\s\S]*version=48/, 'schema 48 migration must advance the schema marker');
assert.match(trustBoundaryMigration, /create table if not exists public\.app_compatibility[\s\S]*minimum_write_version text[\s\S]*blocked_write_versions text\[\]/, 'schema 49 must add a server-controlled compatibility contract and per-version write blocklist');
assert.match(trustBoundaryMigration, /minimum_write_version='41\.0'[\s\S]*recommended_version='41\.0'/, 'schema 49 must require the Trust Boundary client for consequential writes');
assert.match(trustBoundaryMigration, /create table if not exists public\.app_access_signal[\s\S]*access_epoch bigint not null default 0/, 'schema 49 must isolate revocation into a privacy-safe access signal');
assert.match(trustBoundaryMigration, /create policy "Authenticated sessions can view access epoch"[\s\S]*auth\.uid\(\)/, 'revoked but still authenticated sessions must remain able to observe the access epoch');
assert.match(trustBoundaryMigration, /alter publication supabase_realtime add table public\.app_access_signal/, 'the access epoch must be delivered without publishing the allowed-users directory');
assert.match(trustBoundaryMigration, /tg_table_name='allowed_users'[\s\S]*update public\.app_access_signal[\s\S]*access_epoch=access_epoch\+1/, 'access epoch must advance only when authorised-account state changes');
assert.match(trustBoundaryMigration, /create trigger bump_app_sync_state_v49[\s\S]*on public\.app_compatibility/, 'compatibility switches must wake active clients through the existing realtime revision signal');
assert.match(trustBoundaryMigration, /create or replace function public\.my_access_status_v49\(\)[\s\S]*auth\.uid\(\)[\s\S]*access_epoch/, 'schema 49 must expose only the signed-in account status plus the access epoch');
assert.match(trustBoundaryMigration, /create or replace function public\.current_roster_actor_name_v49\(\)[\s\S]*allowed_users[\s\S]*auth\.jwt\(\)/, 'audit display identity must be resolved on the server from the authenticated account');
for (const table of ['night_change_history','night_overtime_history','night_role_override_history']) assert.match(trustBoundaryMigration, new RegExp(`alter table public\\.${table}[\\s\\S]*actor_user_id uuid`), `schema 49 must give ${table} an immutable authenticated actor id`);
for (const rpc of ['record_night_absence_v49','remove_night_absence_v49','add_night_overtime_v49','remove_night_overtime_v49','apply_staffing_allocations_v49','finalise_night_plan_v49','apply_night_role_override_v49','publish_roster_v49','upsert_rotation_version_v49']) {
  assert.match(trustBoundaryMigration, new RegExp(`create or replace function public\\.${rpc}[\\s\\S]*assert_app_write_compatible_v49\\(p_client_version\\)`), `${rpc} must enforce server compatibility before changing the shared roster`);
}
assert.doesNotMatch(trustBoundaryMigration, /create or replace function public\.[a-z_]+_v49\([^$]*p_changed_by/, 'public v49 mutation signatures must not accept browser-supplied audit identity');
for (const legacy of ['record_night_absence_v25','remove_night_absence_v25','add_night_overtime_v25','remove_night_overtime_v25','apply_staffing_allocations_v25','finalise_night_plan_v26','apply_night_role_override_v35','apply_night_role_override_v33','record_night_absence_v48','remove_night_absence_v48','add_night_overtime_v48','remove_night_overtime_v48','apply_staffing_allocations_v48','finalise_night_plan_v48','apply_night_role_override_v48','publish_roster_v48','upsert_rotation_version_v48']) {
  assert.match(trustBoundaryMigration, new RegExp(`revoke all on function public\\.${legacy}[\\s\\S]{0,260}from public,anon,authenticated`), `legacy mutation route ${legacy} must no longer be executable by authenticated clients`);
}
assert.match(trustBoundaryMigration, /update public\.app_schema_version[\s\S]*version=49/, 'schema 49 migration must advance the schema marker');
assert.match(accessRequestMigration, /create table if not exists public\.access_requests/, 'schema 43 must add a dedicated access request table');
assert.match(accessRequestMigration, /alter table public\.access_requests enable row level security/, 'access requests must use RLS');
assert.match(accessRequestMigration, /Users can request own access[\s\S]*auth\.uid\(\)[\s\S]*auth\.jwt\(\)/, 'a pending user may only create a request for their own authenticated identity');
assert.match(accessRequestMigration, /Admins can review access requests[\s\S]*is_roster_admin/, 'only roster administrators may review pending requests');
assert.match(accessRequestMigration, /grant update \(status, reviewed_at, reviewed_by\)/, 'authenticated clients must not receive blanket update rights on request identity fields');
assert.match(accessRequestMigration, /version = greatest\(version, 43\)/, 'schema 43 migration must update the schema marker');
assert.doesNotMatch(html, /personalSchedulePanel|personalScheduleList|exportMyCalendarBtn|My upcoming nights/, 'Night must not include the removed upcoming-nights section');
assert.doesNotMatch(ui, /boundRosterName|setRosterIdentity|personalUpcomingNights|renderPersonalSchedule|exportMyCalendar/, 'the app must not use account-to-roster binding or personal calendar features');
assert.match(ui, /requestStartupSnapshot\(\)[\s\S]*get_roster_startup_v49[\s\S]*p_client_version:APP_VERSION/, 'authorisation and shared data must use the compatibility-aware protected startup snapshot');
assert.doesNotMatch(ui, /supa\.from\('allowed_users'\)\.select\('email,display_name,user_role,active'\)/, 'startup must not make a separate serial account request');
assert.match(fs.readFileSync(path.join(__dirname, '..', 'app-core.js'), 'utf8'), /function myName\(\)\{return appStorage\.getItem\('anaes_my_name'\)/, 'roster highlighting must remain a private device choice through the storage facade');
assert.match(html, /id="recentActivityList"/, 'Night must retain recent activity');
assert.doesNotMatch(html, /copyBriefingBtn|copyBreaksBtn|emailRosterBtn|briefingActionsReason|breakActionsReason/, 'Night and Breaks must not restore redundant copy or email action controls');
assert.match(fs.readFileSync(path.join(__dirname, '..', 'app-core.js'), 'utf8'), /function prepareAdminInformationArchitecture\(\)[\s\S]*What do you need to manage\?[\s\S]*People & Access[\s\S]*Roster Management[\s\S]*System/, 'Admin must open from one four-area management hub');
assert.match(fs.readFileSync(path.join(__dirname, '..', 'app-core.js'), 'utf8'), /adminLegacyTabs/, 'the superseded five-tab administrator rail must be retired from the active interface');
assert.match(ui, /function prepareAccountInformationArchitecture\(\)[\s\S]*Profile[\s\S]*Preferences[\s\S]*Security[\s\S]*App & Help/, 'Account must use progressive disclosure instead of one long settings sheet');
assert.match(html, /id="quickActionsSheet"[\s\S]*data-quick-action="absence"[\s\S]*data-quick-action="overtime"[\s\S]*data-quick-action="review"/, 'Quick Actions must retain a usable HTML fallback for the core night actions');
assert.match(navigation, /data-quick-rudder[\s\S]*Quick actions[\s\S]*window\.showQuickActions/, 'the React navigation must expose one central Quick Actions rudder rather than a fifth destination');
assert.match(navigation, /target\.closest\('\[data-quick-rudder\]'\)\) return/, 'the rudder must not accidentally start a destination drag gesture');
assert.match(ui, /function showQuickActions\(\)[\s\S]*roster:quick-actions/, 'Quick Actions must build its context from the live selected night before opening');
assert.match(ui, /function performQuickAction\(action\)[\s\S]*show\('changes'\)[\s\S]*setChangesStep/, 'staffing Quick Actions must route into the existing Changes workflow instead of creating a mutation shortcut');
assert.match(quickActionsExperience, /Report an absence[\s\S]*Add overtime cover[\s\S]*Review this night[\s\S]*New private message[\s\S]*Share Night Roster/, 'the typed Quick Actions sheet must keep the compact operational action set');
assert.match(rudderCss, /grid-template-columns:repeat\(5,minmax\(0,1fr\)\)/, 'rudder navigation must reserve one centre slot while keeping four page destinations');
assert.match(rudderCss, /prefers-reduced-transparency:reduce[\s\S]*quickRudderDisc[\s\S]*quickActionsSheet/, 'the rudder and sheet must retain a solid reduced-transparency fallback');
assert.match(ui, /type:item\.type,title:item\.title/, 'recent activity must expose its semantic type to the typed interface');
assert.match(clinicalExperience, /item\.detail && <small[\s\S]*\{item\.detail\}/, 'recent activity must show the saved reason or allocation detail');
assert.match(html, /id="activityDetailSheet"[\s\S]*id="activityDetailContent"/, 'recent activity must provide a labelled native-style detail sheet');
assert.match(ui, /function openActivityDetail\(item,date\)[\s\S]*No additional reason was recorded/, 'activity detail sheet must show saved context without inventing a reason');
assert.match(ui, /roster:activity-open[\s\S]*openActivityDetail/, 'recent activity rows must open their corresponding detail safely');
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
assert.match(ui, /fetch\(SUPABASE_URL\+'\/rest\/v1\/rpc\/get_roster_startup_v49'[\s\S]*p_client_version:APP_VERSION/, 'startup must send the compatibility-aware protected snapshot request directly instead of waiting on the stalled client wrapper');
assert.match(ui, /Authorization:'Bearer '\+token/, 'the direct startup request must use the signed-in token');
assert.match(ui, /setTimeout\(function\(\)\{controller\.abort\(\)\},startupSnapshotTimeoutMs\)/, 'the direct startup request must still ask the browser to abort');
assert.match(ui, /withTimeout\([\s\S]*startupSnapshotTimeoutMs\+500,'The shared roster snapshot did not settle\.'/,
  'the direct startup request must have an application-level deadline independent of browser abort completion');
assert.match(ui, /async function requestStartupSnapshotXhr\(\)[\s\S]*new window\.XMLHttpRequest\(\)[\s\S]*get_roster_startup_v49[\s\S]*xhr\.timeout=startupSnapshotTimeoutMs[\s\S]*xhr\.send\(JSON\.stringify\(\{p_client_version:APP_VERSION\}\)\)/,
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
assert.match(ui, /function sharedWritesBlocked\(\)[\s\S]*write_allowed!==true/, 'client controls must fail closed when the server compatibility contract blocks shared writes');
assert.match(ui, /CLIENT_UPDATE_REQUIRED[\s\S]*CLIENT_VERSION_BLOCKED[\s\S]*APP_MAINTENANCE/, 'roster errors must distinguish required updates, blocked releases and emergency maintenance');
assert.match(fs.readFileSync(path.join(__dirname, '..', 'runtime-foundation.js'), 'utf8'), /CLIENT_UPDATE_REQUIRED:[\s\S]*CLIENT_VERSION_BLOCKED:[\s\S]*APP_MAINTENANCE:/, 'the shared runtime must preserve Trust Boundary server codes instead of collapsing them into generic errors');
assert.match(ui, /function enterAccessLost\(\)[\s\S]*chatTeardownSession[\s\S]*signOut/, 'access loss must clear Chat state and end the local authenticated session');
assert.match(ui, /function checkCurrentAccessStatus[\s\S]*my_access_status_v49[\s\S]*enterAccessLost/, 'an active session must enter Access Lost when the server reports that its account is no longer active');
assert.match(ui, /accessLossInFlight=false;[\s\S]*var isAdmin=currentUserProfile/, 'successful re-authorisation must re-enable live access-change checks after a previous revocation');
assert.match(ui, /accessEpoch[\s\S]*roster:peer-revision[\s\S]*checkCurrentAccessStatus/, 'the access epoch must propagate to follower tabs instead of relying on the realtime leader only');
assert.match(ui, /app_access_signal[\s\S]*access_epoch[\s\S]*checkCurrentAccessStatus/, 'revocation detection must use the authenticated-only access signal rather than weakening roster-sync RLS');
assert.doesNotMatch(ui, /p_changed_by:currentUserProfile\.display_name/, 'v49 roster calls must never trust browser-provided audit names');
assert.match(ui, /record_night_absence_v49[\s\S]*p_client_version:APP_VERSION/, 'v49 roster writes must send the running app version to the server guard');
assert.match(html, /id="writeGuardBanner"[\s\S]*id="writeGuardTitle"[\s\S]*id="writeGuardDetail"/, 'read-only compatibility states must have a persistent user-facing explanation');
assert.match(presentationCss, /\/\* 41\.0 Trust Boundary write guard\. \*\/[\s\S]*\.writeGuardBanner/, 'the Trust Boundary notice must use the shared presentation system');
assert.match(ui, /forcedOfflineSession=true;if\(cached&&restoreOfflineSnapshot\(\)\)\{updateOfflineControls\(\);return true\}/, 'saved-roster fallback must require the cached authorised account and disable writes before rendering');
assert.match(ui, /function readOfflineSnapshot\(\)[\s\S]*snapshotRowsByDate\(raw\.nightChanges\)[\s\S]*snapshotRecordsByDate\(raw\.nightRoleOverrides\)/, 'saved-roster recovery must validate and repair partial local data before rendering');
const retrySource = ui.slice(ui.indexOf('async function retryLaunchConnection'), ui.indexOf('\nfunction useSavedRosterAtLaunch'));
assert.match(retrySource, /Trying again…[\s\S]*Waiting for the shared roster to respond/, 'retry must show visible progress while reconnecting');
assert.match(retrySource, /if\(sharedLoadPromise\)try\{await sharedLoadPromise\}[\s\S]*if\(!launchFinished\)await authorizeUser/, 'retry must wait for an active request before starting a fresh authorisation attempt');
assert.doesNotMatch(retrySource, /hideLaunchRecovery\(/, 'retry must not hide all recovery feedback while reconnecting');
assert.doesNotMatch(ui, /online'[\s\S]{0,160}forcedOfflineSession\)forcedOfflineSession=false/, 'browser online status alone must not re-enable shared writes');
assert.match(ui, /nurseCount:count,absenceCount:absenceCount,overtimeCount:overtimeCount/, 'Night must pass its derived clinical summary into the typed interface');
assert.match(clinicalExperience, /function NightStatus[\s\S]*model\.nurseCount[\s\S]*model\.absenceCount[\s\S]*model\.overtimeCount[\s\S]*model\.taskCount[\s\S]*function PersonalNightCard/, 'the typed Night interface must preserve staffing, exceptions, tasks and the personal allocation surface');
assert.match(clinicalExperience, /Review \{model\.taskCount\} \{model\.decisionTasks \? \(model\.taskCount === 1 \? 'allocation' : 'allocations'\) : 'confirmation'\}/, 'Night tasks must use an explicit allocation review label');
assert.match(ui, /Saved for this night only\. The permanent rotation is unchanged\./, 'night-only role save must state its scope');
const onboardingSequence = ui.slice(ui.indexOf('  return[', ui.indexOf('function onboardingPages')), ui.indexOf('\n  ]', ui.indexOf('function onboardingPages')));
assert.ok(onboardingSequence.indexOf('First, which roster name is yours?') >= 0, 'first-use onboarding must begin by identifying the signed-in nurse');
assert.ok(onboardingSequence.indexOf('What matters to you stays first.') > onboardingSequence.indexOf('First, which roster name is yours?'), 'first-use onboarding must teach the personal Night hierarchy after identity');
assert.ok(onboardingSequence.indexOf('The normal roster is automatic.') > onboardingSequence.indexOf('What matters to you stays first.'), 'first-use onboarding must finish by explaining that the standard plan is automatic');
assert.equal(onboardingSequence.includes('featureChatPreview'), false, 'Chat education must not be embedded as a first-use onboarding page');
assert.equal(onboardingSequence.includes('Optional profile'), false, 'optional profile setup must stay in Account rather than first-use onboarding');
assert.equal(onboardingSequence.includes('Optional faster sign-in'), false, 'optional passkey setup must stay in Account rather than first-use onboarding');
assert.match(ui, /function featureEducationPage\(key\)[\s\S]*Team chat, when you need it\.[\s\S]*You usually don’t need this screen\.[\s\S]*Your break is already highlighted\./, 'Chat, Changes and Breaks must retain contextual first-use education');

console.log('All roster, staffing, operational-night and PWA safety checks passed.');

assert.match(clinicalExperience, /nightProgressRail/, 'Night must keep the non-countdown orientation rail');
assert.match(clinicalExperience, /function NightTimeline[\s\S]*Clock back/, 'clock-change rail must expose the rollback event');
assert.match(clinicalExperience, /02:00¹[\s\S]*02:00²/, 'autumn clock-change rail must distinguish the first and second 02:xx hour');
assert.match(clinicalExperience, /function liveClockLabel[\s\S]*First[\s\S]*Second[\s\S]*winter time/, 'live Night clock must explain which repeated 02:xx the nurse is seeing');
assert.match(clinicalExperience, /function nextNightMessage[\s\S]*What matters next[\s\S]*Handover now[\s\S]*Duty block complete/, 'personal hero must adapt to the live stage of the night without a countdown');
assert.match(clinicalExperience, /personalFactButtons[\s\S]*View in team allocation[\s\S]*Open Breaks/, 'hero facts must be directly actionable');
assert.match(clinicalExperience, /nightContextCapsule[\s\S]*contextLabel/, 'Night overview must expose a compact routine-or-exception context');
assert.match(accountExperience, /SHARE_QR_TARGET = 'https:\/\/wiggli\.github\.io\/Anaesthetic-roster\/\?welcome=1'/, 'the QR matrix target must match the public shared-entry URL');
assert.match(accountExperience, /Share Night Roster[\s\S]*QR code, WhatsApp, Messages and more/, 'Account must make peer-to-peer sharing obvious');
assert.match(accountExperience, /function shareAct\(action:[\s\S]*roster:share-action/, 'share buttons must dispatch through the dedicated share event channel');
assert.match(accountExperience, /shareAct\('native'\)[\s\S]*shareAct\('copy'\)[\s\S]*shareAct\('install'\)/, 'Send, copy and install-help controls must all use the working share action channel');
assert.doesNotMatch(accountExperience, /act\('share-(?:native|copy|install)'\)/, 'share controls must not accidentally dispatch account actions');
assert.match(accountExperience, /SHARE_QR_ROWS[\s\S]*shareQrSvg[\s\S]*Scan to get Night Roster/, 'share sheet must render an offline QR code rather than depending on a remote QR service');
assert.match(ui, /function sharedAppUrl\(\)\{return APP_URL\+'\?welcome=1'\}/, 'shared links must use the harmless welcome entry point');
assert.match(ui, /function showSharedWelcomeIfRequested[\s\S]*showInstallGuide\(true\)/, 'a scanned shared link must open device-aware installation help');
assert.match(ui, /navigator\.share[\s\S]*navigator\.clipboard/, 'sharing must use the native share sheet with a copy-link fallback');
assert.match(presentationCss, /\.nightTimelineNow[\s\S]*box-shadow[\s\S]*\.shareQrFrame/, 'Night rail and QR sharing must receive polished visual treatment');
assert.match(clinicalExperience, /nightTimelineSlimRail[\s\S]*nightTimelineFill[\s\S]*nightTimelinePhaseLabels/, 'Night must use the slim progress-rail composition rather than the chunky segmented panel');
assert.match(presentationCss, /37\.97 Night hero refinement[\s\S]*\.nightTimelineSlimRail[\s\S]*height:20px[\s\S]*\.nightTimelineFill[\s\S]*linear-gradient/, 'the live Night rail must stay slim and visibly blue');
assert.match(presentationCss, /\.personalNextStateIntegrated[\s\S]*background:transparent!important/, 'what-matters-next must remain integrated into the dark hero instead of becoming a pale nested card');
assert.match(presentationCss, /#today #personalNightCard \.personalFactButtons[\s\S]*background:transparent!important/, 'hero facts must remain integrated with the dark hero');
assert.doesNotMatch(clinicalExperience, /countdown|remaining time|time remaining/i, 'Night polish must not introduce the excluded countdown timer');
assert.match(clinicalExperience, /Jump to me/, 'Night and Breaks must expose fast jump-to-me affordances');
assert.match(clinicalExperience, /recentActivityDigest/, 'Night must retain the since-last-open activity digest');
