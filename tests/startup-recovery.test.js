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

  let xhrSent;
  let xhrPayload = { profile: { active: true } };
  class SuccessfulStartupXhr {
    constructor() { this.headers = {}; this.status = 0; this.responseText = ''; }
    open(method, url, async) { this.method = method; this.url = url; this.async = async; }
    setRequestHeader(name, value) { this.headers[name] = value; }
    send(body) {
      xhrSent = { method: this.method, url: this.url, async: this.async, headers: this.headers, body, timeout: this.timeout };
      setTimeout(() => { this.status = 200; this.responseText = JSON.stringify(xhrPayload); if (this.onload) this.onload(); }, 0);
    }
    abort() { if (this.onabort) this.onabort(); }
  }
  context.window.XMLHttpRequest = SuccessfulStartupXhr;
  const xhrResponse = await context.requestStartupSnapshotXhr();
  assert.equal(xhrResponse.profile.active, true, 'the independent Android transport must return the protected snapshot');
  assert.equal(xhrSent.method, 'POST');
  assert.equal(xhrSent.url, `${context.SUPABASE_URL}/rest/v1/rpc/get_roster_startup_v37`);
  assert.equal(xhrSent.headers.Authorization, 'Bearer signed-in-test-token');
  assert.equal(xhrSent.headers.apikey, context.SUPABASE_KEY);
  assert.equal(xhrSent.body, '{}');

  context.startupSnapshotTimeoutMs = 10;
  context.fetch = () => new Promise(() => {});
  await assert.rejects(
    context.requestStartupSnapshot(),
    error => error && error.code === 'TIMEOUT',
    'an unresolved browser fetch must be released by the application-level deadline'
  );
  class HangingStartupXhr {
    open() {} setRequestHeader() {} send() {} abort() {}
  }
  context.window.XMLHttpRequest = HangingStartupXhr;
  await assert.rejects(
    context.requestStartupSnapshotXhr(),
    error => error && error.code === 'TIMEOUT',
    'an unresolved Android request must be released by its independent application deadline'
  );
  context.window.XMLHttpRequest = SuccessfulStartupXhr;

  const tableData = {
    allowed_users: { data: { email: 'andre@example.test', display_name: 'Andre', user_role: 'admin', active: true }, error: null },
    night_changes: { data: [], error: null }, night_overtime: { data: [], error: null }, night_five_cover: { data: [], error: null },
    roster_settings: { data: context.rosterSettings, error: null }, rotation_versions: { data: context.rotationVersions, error: null },
    night_labour_order: { data: [], error: null }, night_plan_status: { data: [], error: null }, night_role_overrides: { data: [], error: null },
    night_change_history: { data: [], error: null }, night_overtime_history: { data: [], error: null }, night_role_override_history: { data: [], error: null },
    app_settings: { data: { id: 1, email_recipients: [] }, error: null }, app_schema_version: { data: { id: 1, version: 37 }, error: null },
    app_sync_state: { data: { id: 1, revision: 9 }, error: null }
  };
  let syncRevisions = [9, 9];
  const queryFor = table => {
    const query = {
      select() { return query; }, eq() { return query; }, order() { return query; }, maybeSingle() { return query; },
      then(resolve, reject) {
        const result = table === 'app_sync_state'
          ? { data: { id: 1, revision: syncRevisions.length > 1 ? syncRevisions.shift() : syncRevisions[0] }, error: null }
          : tableData[table];
        return Promise.resolve(result).then(resolve, reject);
      }
    };
    return query;
  };
  context.currentUser = { email: 'andre@example.test' };
  context.supa = { from: queryFor };
  context.startupFallbackTimeoutMs = 50;
  assert.equal(context.preferCompatibilityStartup(), false);
  context.navigator.userAgent = 'Mozilla/5.0 (Linux; Android 16; SM-S928B)';
  assert.equal(context.preferCompatibilityStartup(), true, 'Android must avoid the startup transport that remained pending on the affected Samsung');
  const fallback = await context.requestCompatibilityStartup();
  assert.equal(fallback.profile.active, true, 'compatibility startup must re-check active roster access');
  assert.equal(fallback.rotation_versions.length, 1, 'compatibility startup must return the verified rotation source');
  assert.equal(fallback.roster_settings.published_until, '2027-12-30');
  assert.equal(fallback.schema_version, 37);
  assert.equal(fallback.sync_revision, 9);

  syncRevisions = [9, 10, 10, 10];
  const refreshedFallback = await context.requestCompatibilityStartup();
  assert.equal(refreshedFallback.sync_revision, 10, 'compatibility startup must retry once when shared data changes during sequential reads');

  syncRevisions = [10, 10];
  tableData.app_schema_version = { data: null, error: { message: 'unavailable' } };
  const unknownSchemaFallback = await context.requestCompatibilityStartup();
  assert.equal(unknownSchemaFallback.schema_version, 0, 'compatibility startup must not claim the expected schema when its read fails');
  tableData.app_schema_version = { data: { id: 1, version: 37 }, error: null };
  context.document.querySelector = () => element();
  context.initialNightChosen = false;
  xhrPayload = {
    profile: tableData.allowed_users.data,
    night_changes: [], night_overtime: [], night_five_cover: [],
    roster_settings: context.rosterSettings, rotation_versions: context.rotationVersions,
    night_labour_order: [], night_plan_status: [], night_role_overrides: [],
    app_settings: tableData.app_settings.data, schema_version: 37, sync_revision: 10
  };
  assert.equal(await context.loadSharedData(), true, 'an Android signed-in startup must open through the independent protected snapshot request');
  assert.equal(context.currentUserProfile.email, 'andre@example.test');
  assert.equal(context.R.length, 138, 'the Android startup route must preserve the verified rotation');

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

  const sevenNurseNight = context.calculateNight('2026-09-18');
  context.nightOvertime[sevenNurseNight.date] = [{ id: 'overtime-1', nurse_name: 'Nazia' }];
  context.renderNightRoleOverride = () => {};
  assert.doesNotThrow(
    () => context.updateAllocationSaveControl(sevenNurseNight),
    'the seven-nurse allocation control must derive its plan instead of crashing after shared data loads'
  );
}

run().then(() => console.log('Startup transport and saved-roster recovery checks passed.')).catch(error => {
  console.error(error);
  process.exitCode = 1;
});
