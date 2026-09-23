const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.join(__dirname, '..');
const core = fs.readFileSync(path.join(root, 'app-core.js'), 'utf8');
const ui = fs.readFileSync(path.join(root, 'app-ui.js'), 'utf8');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const anonymousAccessMigration = fs.readFileSync(path.join(root, 'supabase-migration-20260923120000_remove_anonymous_database_access.sql'), 'utf8');
const inheritedAccessMigration = fs.readFileSync(path.join(root, 'supabase-migration-20260923224500_remove_inherited_anonymous_access.sql'), 'utf8');

assert.match(html, /@supabase\/supabase-js@2\.105\.0" integrity="sha384-[A-Za-z0-9+/=]+" crossorigin="anonymous"/,
  'the third-party Supabase browser bundle must be protected by subresource integrity');
assert.doesNotMatch(core, /authMessage\([^\n;]*\.error\.message/,
  'raw authentication-provider errors must not be shown to users');
assert.doesNotMatch(ui, /profile could not be saved[^\n]*error\.message/,
  'raw database errors must not be shown in profile messages');
assert.doesNotMatch(ui, /Current account:[^\n]*\.email/,
  'copied diagnostics must not contain the signed-in email address');

const storage = new Map([
  ['anaes_offline_snapshot', '{"private":true}'],
  ['anaes_cached_profile', '{"email":"person@example.test"}'],
  ['anaes_recent_overtime_names', '["Person"]'],
  ['anaes_seen_night_activity', '{"date":"2026-09-23"}'],
  ['anaes_my_name', 'Person'],
  ['anaes_theme', 'dark'],
  ['anaes_selected_date', '2026-09-23']
]);
const context = {
  console, Date, Intl, Math, JSON, Set, Map, Array, Object, String, Number, Promise, Blob, URL,
  setTimeout, clearTimeout, setInterval() { return 0; }, clearInterval() {},
  navigator: { onLine: true, userAgent: 'security-test' },
  localStorage: {
    getItem(key) { return storage.has(key) ? storage.get(key) : null; },
    setItem(key, value) { storage.set(key, String(value)); },
    removeItem(key) { storage.delete(key); }
  },
  document: { body: { classList: { add() {}, remove() {} } }, getElementById() { return null; } },
  window: { supabase: null, AbortController, addEventListener() {}, matchMedia() { return { matches: false }; } },
  confirm() { return true; }
};
context.window.window = context.window;
vm.createContext(context);
vm.runInContext(core.replace(/\nbind\(\);\s*\ninitApplication\(\);\s*$/, ''), context, { filename: 'app-core.js' });
context.clearPrivateDeviceData();

for (const key of ['anaes_offline_snapshot', 'anaes_cached_profile', 'anaes_recent_overtime_names', 'anaes_seen_night_activity', 'anaes_my_name']) {
  assert.equal(storage.has(key), false, `${key} must be removed when a session ends`);
}
assert.equal(storage.get('anaes_theme'), 'dark', 'logout must preserve the non-sensitive appearance preference');
assert.equal(storage.get('anaes_selected_date'), '2026-09-23', 'logout must preserve the non-sensitive navigation preference');

const deployableFiles = ['index.html', 'app-core.js', 'app-ui.js', 'service-worker.js', 'theme-bootstrap.js', 'manifest.webmanifest'];
const deployable = deployableFiles.map(file => fs.readFileSync(path.join(root, file), 'utf8')).join('\n');
assert.doesNotMatch(deployable, /sb_secret_[A-Za-z0-9_-]+|service_role\s*[:=]\s*["'][A-Za-z0-9._-]+|postgres(?:ql)?:\/\//i,
  'deployed files must not contain a secret Supabase key or database connection string');
assert.match(core, /SUPABASE_KEY\s*=\s*'sb_publishable_[A-Za-z0-9_-]+'/, 
  'the browser must use a publishable Supabase key');
assert.match(anonymousAccessMigration, /revoke usage on schema public from anon/i,
  'anonymous users must not retain access to the application schema');
for (const objectType of ['tables', 'sequences', 'functions']) {
  assert.match(anonymousAccessMigration, new RegExp(`revoke all privileges on all ${objectType} in schema public from anon`, 'i'),
    `anonymous users must not retain blanket ${objectType} privileges`);
  assert.match(anonymousAccessMigration, new RegExp(`alter default privileges[\\s\\S]*?revoke all privileges on ${objectType} from anon`, 'i'),
    `future ${objectType} must not automatically become anonymous endpoints`);
}
assert.match(inheritedAccessMigration, /revoke usage on schema public from public/i,
  'anonymous users must not inherit public-schema usage through the PUBLIC role');
for (const objectType of ['tables', 'sequences']) {
  assert.match(inheritedAccessMigration, new RegExp(`revoke all privileges on all ${objectType} in schema public from public`, 'i'),
    `${objectType} must not inherit blanket privileges through the PUBLIC role`);
}
assert.match(inheritedAccessMigration, /revoke execute on all functions in schema public from public/i,
  'functions must not remain anonymously executable through the PUBLIC role');
assert.match(inheritedAccessMigration, /grant usage on schema public to authenticated, service_role/i,
  'the authenticated application and trusted service operations must retain schema access');

console.log('Security hardening checks passed.');
