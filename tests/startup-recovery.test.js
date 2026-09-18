const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.join(__dirname, '..');
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
  navigator: { onLine: true, userAgent: 'startup-test', serviceWorker: {}, clipboard: { writeText: async () => {} } },
  localStorage: {
    getItem(key) { return storage.has(key) ? storage.get(key) : null; },
    setItem(key, value) { storage.set(key, String(value)); }, removeItem(key) { storage.delete(key); }
  },
  document: {
    visibilityState: 'visible', body: element(), activeElement: null,
    getElementById() { return element(); }, querySelector() { return null; }, querySelectorAll() { return []; },
    createElement() { return element(); }
  },
  window: { supabase: null, AbortController, addEventListener() {}, matchMedia() { return { matches: false }; }, scrollTo() {}, navigator: {} },
  confirm() { return true; }, alert() {}
};
context.window.window = context.window;
vm.createContext(context);
for (const file of ['app-core.js', 'app-ui.js']) {
  const script = fs.readFileSync(path.join(root, file), 'utf8').replace(/\nbind\(\);\s*\ninitApplication\(\);\s*$/, '');
  vm.runInContext(script, context, { filename: file });
}

async function run() {
  let sent;
  context.currentAccessToken = 'signed-in-test-token';
  context.fetch = async (url, options) => {
    sent = { url, options };
    return { ok: true, status: 200, text: async () => JSON.stringify({ profile: { active: true } }) };
  };
  const response = await context.requestStartupSnapshot();
  assert.equal(response.profile.active, true, 'the direct startup response must be returned');
  assert.equal(sent.url, `${context.SUPABASE_URL}/rest/v1/rpc/get_roster_startup_v37`);
  assert.equal(sent.options.method, 'POST');
  assert.equal(sent.options.headers.Authorization, 'Bearer signed-in-test-token');
  assert.equal(sent.options.headers.apikey, context.SUPABASE_KEY);
  assert.equal(sent.options.cache, 'no-store');
  assert.equal(sent.options.credentials, 'omit');

  storage.set('anaes_offline_snapshot', JSON.stringify({
    saved_at: '2026-09-18T12:00:00.000Z',
    nightChanges: { '2026-09-18': [{ id: 'absence-1', absent_name: 'James' }] },
    nightOvertime: null,
    fiveCoverChoices: [],
    rosterSettings: context.rosterSettings,
    rotationVersions: context.rotationVersions,
    labourOrders: {},
    nightRoleOverrides: {},
    nightPlanStatuses: {},
    appSettings: { shift_start: '19:00', shift_end: '07:00', email_recipients: [] },
    schemaVersion: 37
  }));
  assert.equal(context.restoreOfflineSnapshot(), true, 'a validated saved roster must open without a network request');
  assert.equal(context.R.length, 138, 'saved-roster recovery must preserve the verified 138-night rotation');
  assert.equal(context.nightChanges['2026-09-18'][0].absent_name, 'James');
}

run().then(() => console.log('Startup transport and saved-roster recovery checks passed.')).catch(error => {
  console.error(error);
  process.exitCode = 1;
});
