const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.join(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'app-ui.js'), 'utf8');
assert.match(source, /roster_settings:rosterSettings/);
assert.match(source, /rotation_versions:rotationVersions/);
assert.match(source, /night_changes:nightChanges/);
assert.match(source, /night_overtime:nightOvertime/);
assert.match(source, /night_plan_statuses:Object\.values\(nightPlanStatuses\)/);
assert.match(source, /night_team_identity:Object\.values\(nightTeamIdentities\)/);

const storage = new Map();
const context = {
  console, Date, Intl, Math, JSON, Set, Map, Array, Object, String, Number, Promise, Blob, URL,
  setTimeout, clearTimeout, setInterval() { return 0; }, clearInterval() {},
  navigator: { onLine: true, userAgent: 'backup-drill' },
  localStorage: {
    getItem(key) { return storage.has(key) ? storage.get(key) : null; },
    setItem(key, value) { storage.set(key, String(value)); },
    removeItem(key) { storage.delete(key); }
  },
  document: { body: { classList: { add() {}, remove() {}, toggle() {} } }, getElementById() { return null; } },
  window: { supabase: null, AbortController, addEventListener() {}, matchMedia() { return { matches: false }; } },
  confirm() { return true; }
};
context.window.window = context.window;
vm.createContext(context);
vm.runInContext(fs.readFileSync(path.join(root, 'app-core.js'), 'utf8'), context, { filename: 'app-core.js' });

const exported = JSON.stringify({
  created_at: '2026-10-02T08:00:00.000Z',
  app_version: context.APP_VERSION,
  roster_settings: context.rosterSettings,
  rotation_versions: context.rotationVersions,
  night_changes: {},
  night_overtime: {},
  night_plan_statuses: [],
  night_team_identity: [{
    roster_date: '2026-10-04',
    nickname: 'Night Owls',
    updated_by: 'Roster Nurse',
    updated_by_user_id: '00000000-0000-0000-0000-000000000001',
    updated_at: '2026-10-04T02:30:00.000Z'
  }]
});
const restored = JSON.parse(exported);

context.rosterSettings = restored.roster_settings;
context.rotationVersions = restored.rotation_versions;
context.nightChanges = restored.night_changes;
context.nightOvertime = restored.night_overtime;
context.nightTeamIdentities = Object.fromEntries((restored.night_team_identity || []).map(row => [row.roster_date, row]));
context.rebuildCalculatedRoster();

assert.equal(context.nightTeamIdentities['2026-10-04'].nickname, 'Night Owls', 'the restore drill must preserve shared shift nicknames');

assert.equal(context.R.length, 138, 'a restored verified export must regenerate all 138 original roster nights');
assert.equal(context.R[0].date, '2026-06-30');
assert.equal(context.R.at(-1).date, '2027-12-30');
const verification = context.verifyReference();
assert.equal(verification.mismatches, 0, 'the restore drill must preserve the immutable reference rotation');

console.log('Roster-data export restore drill passed.');
