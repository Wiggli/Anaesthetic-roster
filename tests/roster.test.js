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
const ui = fs.readFileSync(path.join(__dirname, '..', 'app-ui.js'), 'utf8');
const css = fs.readFileSync(path.join(__dirname, '..', 'styles.css'), 'utf8');
const workflow = fs.readFileSync(path.join(__dirname, '..', '.github', 'workflows', 'deploy-pages.yml'), 'utf8');
const migration = fs.readFileSync(path.join(__dirname, '..', 'supabase-migration-20260911180000_live_sync_atomic_role_overrides.sql'), 'utf8');
assert.equal(context.APP_VERSION, context.RELEASE_HISTORY[0].version, 'APP_VERSION must match the newest release-history entry');
assert.deepEqual(Array.from(context.RELEASE_HISTORY, entry => entry.version), ['35.3','35.2','35.1','35.0','34.8','34.7','34.6','34.5','34.4','34.3','34.2','34.1','34.0','33.0','32.2','32.1','32.0','31.3','31.2','31.1','31.0','30.1','30.0','29.0','28.0','27.0','26.2','26.1','26.0'], 'release history must remain complete and newest first');
assert.match(sw, new RegExp(`CACHE_NAME = 'anaesthetic-night-roster-v${context.APP_VERSION.replace('.', '-')}'`), 'service-worker cache must match APP_VERSION');
for (const asset of ['styles.css', 'app-core.js', 'app-ui.js', 'manifest.webmanifest']) {
  assert.match(html, new RegExp(`${asset.replace('.', '\\.') }\\?v=${context.APP_VERSION.replace('.', '\\.')}`), `${asset} HTML query must match APP_VERSION`);
  assert.match(sw, new RegExp(`${asset.replace('.', '\\.') }\\?v=${context.APP_VERSION.replace('.', '\\.')}`), `${asset} app-shell query must match APP_VERSION`);
}
assert.match(manifest, new RegExp(`icon-192\\.png\\?v=${context.APP_VERSION.replace('.', '\\.')}`), 'manifest icon query must match APP_VERSION');
for (const [file, source] of Object.entries({ 'index.html': html, 'styles.css': css, 'manifest.webmanifest': manifest, 'service-worker.js': sw })) {
  const versions = Array.from(source.matchAll(/[?&]v=([0-9]+(?:\.[0-9]+)+)/g), match => match[1]);
  assert.ok(versions.length, `${file} must contain a production cache-busting reference`);
  assert.deepEqual(Array.from(new Set(versions)), [context.APP_VERSION], `${file} cache-busting references must all match APP_VERSION`);
}

const deployBlock = workflow.match(/- name: Prepare public app files[\s\S]*?(?=\n      - uses:)/);
assert.ok(deployBlock, 'deployment workflow must contain an explicit dist preparation step');
const copiedAssets = new Set(Array.from(deployBlock[0].matchAll(/^\s*cp\s+(.+)\s+dist\/$/gm), match => match[1].trim().split(/\s+/)).flat());
const requiredProductionAssets = [
  'index.html', 'styles.css', 'app-core.js', 'app-ui.js', 'service-worker.js', 'manifest.webmanifest',
  'anaesthesia-header.jpg', 'mater-dei-logo.png', 'apple-touch-icon.png',
  'icon-192.png', 'icon-512.png', 'icon-maskable-192.png', 'icon-maskable-512.png'
];
for (const asset of requiredProductionAssets) {
  assert.ok(copiedAssets.has(asset), `${asset} must be copied into the GitHub Pages dist directory`);
  assert.ok(fs.existsSync(path.join(__dirname, '..', asset)), `${asset} must exist in the repository`);
}

const obsoleteFiles = ['index-18.html', 'app-v25.js', 'header-background.jpg', 'header-background.png'];
const productionSources = { 'index.html': html, 'app-core.js': fs.readFileSync(path.join(__dirname, '..', 'app-core.js'), 'utf8'), 'app-ui.js': ui, 'styles.css': css, 'manifest.webmanifest': manifest, 'service-worker.js': sw };
for (const obsolete of obsoleteFiles) {
  for (const [file, source] of Object.entries(productionSources)) assert.doesNotMatch(source, new RegExp(obsolete.replace('.', '\\.'), 'i'), `${file} must not reference obsolete ${obsolete}`);
  assert.ok(!copiedAssets.has(obsolete), `obsolete ${obsolete} must not be copied into dist`);
}

assert.match(workflow, /version: 2\.45\.5/, 'Supabase CLI must use the reviewed pinned version');
assert.doesNotMatch(workflow, /version:\s*latest/, 'deployment must not follow the mutable latest Supabase CLI');
assert.match(workflow, /migrate:[\s\S]*needs: test/, 'migration must depend on tests');
assert.match(workflow, /deploy:[\s\S]*needs: migrate/, 'deployment must depend on migration');
assert.match(workflow, /github\.event_name == 'push' \|\| github\.event_name == 'workflow_dispatch'/, 'production jobs must allow only main pushes or safe manual recovery');
assert.match(workflow, /github\.ref == 'refs\/heads\/main'/, 'production jobs must remain restricted to main');
assert.match(workflow, /service-worker\.js[\s\S]*CACHE_NAME = 'anaesthetic-night-roster-v\$\{cache_version\}'/, 'post-deployment checks must verify the live service-worker cache version');
assert.match(workflow, /manifest\.webmanifest\?v=\$\{app_version\}[\s\S]*icon-192\.png\?v=\$\{app_version\}/, 'post-deployment checks must verify the live manifest version');
assert.match(ui, /entries=showHistory\?RELEASE_HISTORY:\[latest\]/, 'the update window must contain only the installed release');
assert.match(ui, /function undoAddedAbsence[\s\S]*remove_night_absence_v25/, 'absence Undo must use the versioned database function');
assert.match(ui, /function undoAddedOvertime[\s\S]*remove_night_overtime_v25/, 'overtime Undo must use the versioned database function');
assert.match(ui, /app_sync_state[\s\S]*setInterval\(checkSharedRevision,15000\)/, 'active clients must check the shared revision as a realtime fallback');
assert.match(ui, /CHANNEL_ERROR[\s\S]*TIMED_OUT[\s\S]*CLOSED[\s\S]*scheduleRealtimeReconnect/, 'realtime must recover from interrupted channels');
assert.match(ui, /window\.addEventListener\('pageshow',resumeSharedSync\)/, 'returning to an open app must resume shared synchronization');
assert.match(ui, /apply_night_role_override_v33/, 'night-only role mutations must use the atomic schema-33 RPC');
assert.doesNotMatch(ui, /saveAllocationsCompatibility/, 'allocation saves must not fall back to browser-side multi-step writes');
assert.match(migration, /create table if not exists public\.app_sync_state/, 'schema 33 must provide a shared revision signal');
assert.match(migration, /create or replace function public\.apply_night_role_override_v33[\s\S]*insert into public\.night_role_override_history/, 'schema 33 must save role overrides and audit history atomically');
assert.match(migration, /update public\.app_schema_version[\s\S]*version = 33/, 'schema 33 migration must update the schema marker');
assert.doesNotMatch(fs.readFileSync(path.join(__dirname, '..', 'app-core.js'), 'utf8'), /[A-Z0-9._%+-]+@gov\.mt/i, 'public application source must not embed named government email recipients');
assert.match(ui, /night_role_override_history:allHistory\[2\]\.data/, 'administrator roster-data exports must include night-only role history');
assert.match(ui, /Private profile details and profile photos are excluded/, 'administrator export scope must identify excluded private profile data');
assert.match(sw, /requestUrl\.origin !== self\.location\.origin/, 'service worker must leave shared cross-origin data on the network');
assert.match(sw, /cdn\.jsdelivr\.net/, 'only the fixed public Supabase library may be cached');
assert.match(sw, /event\.request\.mode === 'navigate'[\s\S]*fetch\(event\.request, \{ cache: 'no-store' \}\)[\s\S]*catch\(\(\) => caches\.match\('\.\/index\.html'\)\)/, 'navigation must be network-first with the cached shell fallback');
assert.doesNotMatch(sw, /caches\.put\([^\n]*supabase/i, 'service worker must never cache shared Supabase data');
assert.match(sw, /requestUrl\.origin !== self\.location\.origin && !isSupabaseLibrary/, 'authentication, REST, realtime and private profile-photo origins must bypass caching');

assert.match(ui, /Connecting to the shared roster…/, 'slow launch state must name the shared roster connection');
assert.match(ui, /Showing the last saved roster/, 'offline launch state must identify saved roster data');
assert.match(ui, /statusChip staffingChip informational/, 'staffing count must remain a non-interactive Night summary item');
assert.match(ui, /Review '\+taskCount[\s\S]*allocation/, 'Night tasks must use an explicit allocation review label');
assert.match(ui, /button.disabled=pending/, 'Break output actions must be disabled until the plan is complete');
assert.match(ui, /Saved for this night only\. The permanent rotation is unchanged\./, 'night-only role save must state its scope');
const onboardingSequence = ui.slice(ui.indexOf('  return[', ui.indexOf('function onboardingPages')), ui.indexOf('\n  ];', ui.indexOf('function onboardingPages')));
assert.ok(onboardingSequence.indexOf('Your roster identity') < onboardingSequence.indexOf('Optional profile') && onboardingSequence.indexOf('Optional profile') < onboardingSequence.indexOf('Optional faster sign-in'), 'onboarding must introduce identity, then profile, then passkey');

console.log('All roster, staffing, operational-night and PWA safety checks passed.');
