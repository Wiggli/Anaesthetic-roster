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

assert.equal(context.operationalRosterDate(new Date('2026-08-22T00:00:00Z')), '2026-08-21', '02:00 Malta must stay on the current working night');
assert.equal(context.operationalRosterDate(new Date('2026-08-22T04:59:00Z')), '2026-08-21', '06:59 Malta must stay on the current working night');
assert.equal(context.operationalRosterDate(new Date('2026-08-22T05:00:00Z')), '2026-08-22', '07:00 Malta must move to the next date');
assert.equal(context.operationalRosterDate(new Date('2026-08-22T17:00:00Z')), '2026-08-22', '19:00 Malta must use the current date');

const originalVersions = context.rotationVersions.slice();
const before = context.calculateNight('2026-07-04');
const effective = context.calculateNight('2026-07-08');
context.rotationVersions = originalVersions.concat([{
  effective_from: '2026-07-08',
  first1: effective.first1 === 'James' ? 'New Nurse' : effective.first1,
  first2: effective.first2 === 'James' ? 'New Nurse' : effective.first2,
  second1: effective.second1 === 'James' ? 'New Nurse' : effective.second1,
  second2: effective.second2 === 'James' ? 'New Nurse' : effective.second2,
  pager: effective.pager === 'James' ? 'New Nurse' : effective.pager,
  reliever: effective.reliever === 'James' ? 'New Nurse' : effective.reliever,
  seventh_anchor: effective.seventh === 'James' ? 'New Nurse' : effective.seventh,
  seventh_cycle: context.ORIGINAL_SEVENTH.map(name => name === 'James' ? 'New Nurse' : name)
}]);
assert.deepEqual(context.calculateNight('2026-07-04'), before, 'a permanent change must not alter earlier nights');

const sw = fs.readFileSync(path.join(__dirname, '..', 'service-worker.js'), 'utf8');
assert.match(sw, /requestUrl\.origin !== self\.location\.origin/, 'service worker must leave shared cross-origin data on the network');
assert.match(sw, /cdn\.jsdelivr\.net/, 'only the fixed public Supabase library may be cached');
assert.match(sw, /fetch\(event\.request/, 'service worker must use the network for app updates');
assert.doesNotMatch(sw, /caches\.put\([^\n]*supabase/i, 'service worker must never cache shared Supabase data');

console.log('All roster, staffing, operational-night and PWA safety checks passed.');
