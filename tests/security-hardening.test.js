const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.join(__dirname, '..');
const core = fs.readFileSync(path.join(root, 'app-core.js'), 'utf8');
const ui = fs.readFileSync(path.join(root, 'app-ui.js'), 'utf8');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const anonymousAccessMigration = fs.readFileSync(path.join(root, 'supabase', 'migrations', '20260923120000_remove_anonymous_database_access.sql'), 'utf8');
const accessRequestMigration = fs.readFileSync(path.join(root, 'supabase', 'migrations', '20260924001000_access_request_approval.sql'), 'utf8');
const chatMigration = fs.readFileSync(path.join(root, 'supabase', 'migrations', '20260924003000_secure_chat.sql'), 'utf8');
const chatRefineMigration = fs.readFileSync(path.join(root, 'supabase', 'migrations', '20260924014500_refine_chat_directory.sql'), 'utf8');
const pushMigration = fs.readFileSync(path.join(root, 'supabase', 'migrations', '20260924090000_chat_push_notifications.sql'), 'utf8');
const maturityMigration = fs.readFileSync(path.join(root, 'supabase', 'migrations', '20260924111500_chat_maturity.sql'), 'utf8');
const pushClient = fs.readFileSync(path.join(root, 'push.js'), 'utf8');
const pushFunction = fs.readFileSync(path.join(root, 'supabase', 'functions', 'notify-chat-message', 'index.ts'), 'utf8');
const inheritedAccessMigration = fs.readFileSync(path.join(root, 'supabase', 'migrations', '20260923224500_remove_inherited_anonymous_access.sql'), 'utf8');
const advisorHardeningMigration = fs.readFileSync(path.join(root, 'supabase', 'migrations', '20260924180000_advisor_hardening.sql'), 'utf8');

assert.match(html, /@supabase\/supabase-js@2\.105\.0" integrity="sha384-[A-Za-z0-9+/=]+" crossorigin="anonymous"/,
  'the third-party Supabase browser bundle must be protected by subresource integrity');
assert.match(html, /name="robots"[\s\S]*content="noindex,nofollow,noarchive,nosnippet,noimageindex"/,
  'the public Pages shell must tell normal crawlers not to index or archive the roster app');
assert.match(html, /name="googlebot"[\s\S]*content="noindex,nofollow,noarchive,nosnippet,noimageindex"/,
  'Google-specific indexing directives must remain explicit on the public Pages shell');
assert.doesNotMatch(core, /authMessage\([^\n;]*\.error\.message/,
  'raw authentication-provider errors must not be shown to users');
assert.doesNotMatch(ui, /profile could not be saved[^\n]*error\.message/,
  'raw database errors must not be shown in profile messages');
assert.doesNotMatch(ui, /Current account:[^\n]*\.email/,
  'copied diagnostics must not contain the signed-in email address');

assert.match(html, /id="authGoogleBtn"[\s\S]*?>[\s\S]*?Google/,
  'the sign-in screen must expose the Google provider control');
assert.match(core, /signInWithOAuth\(\{provider:'google',options:\{redirectTo:APP_URL\}\}\)/,
  'Google sign-in must use the Supabase OAuth client and approved application URL');
assert.doesNotMatch(html, /id="authMicrosoftBtn"/,
  'Microsoft sign-in must not be shown while Google is the only social provider');
assert.doesNotMatch(html, /id="authAppleBtn"|Continue with Apple|Sign in with Apple/,
  'paid Apple sign-in must not be presented');
assert.match(html, /id="authGoogleBtn"[\s\S]*Continue with Google/,
  'Google must remain the single clearly labelled social sign-in action');
assert.match(core, /byId\('authSocial'\)\.classList\.toggle\('hidden',!login\)/,
  'social sign-in controls must only appear in normal sign-in mode');
assert.match(ui, /ensureAccessRequest\(user\)/, 'unapproved authenticated users must enter the access-request flow');
assert.match(accessRequestMigration, /revoke all privileges on table public\.access_requests from public, anon, authenticated/, 'access requests must start from a deny-by-default table privilege boundary');
assert.match(accessRequestMigration, /grant select, insert on table public\.access_requests to authenticated/, 'authenticated users receive only the minimum table-level privileges needed to request and inspect access');
assert.match(accessRequestMigration, /grant update \(status, reviewed_at, reviewed_by\) on table public\.access_requests to authenticated/, 'request identity fields must not be generally mutable');
assert.doesNotMatch(accessRequestMigration, /grant all .*access_requests/i, 'access request storage must never grant blanket privileges');
assert.match(chatMigration, /sender_id = \(select auth\.uid\(\)\)/, 'chat message RLS must bind the sender to the authenticated user');
assert.match(chatMigration, /grant insert \(conversation_id,body\) on table public\.chat_messages to authenticated/, 'chat clients must not receive insert privileges on sender identity columns');
assert.match(chatMigration, /Members can view accessible conversations[\s\S]*kind = 'group'[\s\S]*auth\.uid\(\).*user_a[\s\S]*auth\.uid\(\).*user_b/, 'private conversations must only be visible to their participants');
assert.doesNotMatch(chatMigration, /grant all .*chat_/i, 'chat tables must not receive blanket authenticated privileges');
assert.doesNotMatch(chatMigration, /alter table public\.user_profiles|create policy[\s\S]*on public\.user_profiles/i, 'chat must not broaden private profile access');
assert.match(chatRefineMigration, /revoke all privileges on table public\.chat_directory from public, anon, authenticated/, 'the safe chat directory must start deny-by-default');
assert.match(chatRefineMigration, /grant select on table public\.chat_directory to authenticated/, 'chat directory must be read-only to authenticated clients');
assert.match(chatRefineMigration, /create policy "Active members can view roster chat directory"[\s\S]*is_shift_member/, 'only active roster members may read the chat directory');
assert.match(chatRefineMigration, /revoke all on table chat_private\.identity_links from public, anon, authenticated/, 'alternate identity links must remain private');
assert.match(chatRefineMigration, /person_key=participant\.person_key/, 'private chat RLS must authorize by server-managed canonical identity');
assert.match(chatRefineMigration, /new\.sender_id:=auth\.uid\(\)/, 'alternate identity support must not weaken sender authentication');
assert.doesNotMatch(chatRefineMigration, /grant .*identity_links.*authenticated/i, 'private identity links must never be exposed to the browser');
assert.doesNotMatch(chatRefineMigration, /alter table public\.user_profiles|create policy[\s\S]*on public\.user_profiles/i, 'chat refinement must not expose private profiles');
assert.match(pushMigration, /revoke all privileges on table public\.push_server_config from public,anon,authenticated/, 'VAPID server configuration must be inaccessible to browser roles');
assert.match(pushMigration, /revoke all privileges on table public\.push_dispatches from public,anon,authenticated/, 'push dispatch records must remain server-only');
assert.match(pushMigration, /user_id=\(select auth\.uid\(\)\)[\s\S]*is_shift_member/, 'push subscription reads must remain owner and roster-member scoped');
assert.match(pushMigration, /register_push_subscription[\s\S]*security definer[\s\S]*auth\.uid\(\)/i, 'push subscription registration must bind to the authenticated user');
assert.doesNotMatch(pushMigration, /BFF3dFdZ|BqB7H_jy/, 'the VAPID keypair must never be committed to a database migration');
assert.doesNotMatch(pushClient, /vapid_private|privateKey|BqB7H_jy/i, 'the browser push client must never contain the VAPID private key');
assert.match(pushFunction, /message\.sender_id !== user\.id/, 'notification dispatch must verify that the caller sent the message');
assert.match(pushFunction, /push_server_config/, 'the Edge Function must load the VAPID private key server-side');
assert.doesNotMatch(pushFunction, /BqB7H_jy/, 'the Edge Function source must not hard-code the VAPID private key');
assert.match(maturityMigration, /create or replace function public\.chat_overview_v2\(\)[\s\S]*security invoker/, 'chat overview must not bypass RLS');
assert.match(maturityMigration, /create policy "Members can remove own push subscriptions"[\s\S]*user_id=\(select auth\.uid\(\)/, 'device removal must remain owner-scoped');
assert.match(maturityMigration, /create or replace function public\.admin_app_health\(\)[\s\S]*is_roster_admin\(\)/, 'admin health must verify administrator status server-side');
const adminHealthSource = maturityMigration.slice(
  maturityMigration.indexOf('create or replace function public.admin_app_health()'),
  maturityMigration.indexOf('revoke all on function public.admin_app_health()')
);
assert.doesNotMatch(adminHealthSource, /endpoint|p256dh|auth_key/i, 'admin health must not expose push endpoints or encryption keys');
assert.doesNotMatch(adminHealthSource, /\bbody\b/i, 'admin health must not expose chat message content');

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

const deployableFiles = ['index.html', 'app-core.js', 'app-ui.js', 'push.js', 'chat.js', 'service-worker.js', 'theme-bootstrap.js', 'manifest.webmanifest'];
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


assert.match(advisorHardeningMigration, /drop policy if exists "Admins can view access requests"/i,
  'the redundant administrator access-request SELECT policy must be removed');
assert.match(advisorHardeningMigration, /drop policy if exists "Users can view own access request"/i,
  'the redundant owner access-request SELECT policy must be removed');
assert.match(advisorHardeningMigration, /create policy "Authenticated users can view permitted access requests"[\s\S]*is_roster_admin\(\)[\s\S]*auth\.uid\(\)[\s\S]*auth\.jwt\(\)/i,
  'access-request reads must preserve administrator-or-owner authorization in one policy');
assert.match(advisorHardeningMigration, /alter function public\.apply_night_role_override_v33\(date,text,jsonb,text,text,text\)[\s\S]*security invoker/i,
  'the legacy v33 wrapper must not retain unnecessary definer privileges');
assert.match(advisorHardeningMigration, /alter function public\.unregister_push_subscription\(text\)[\s\S]*security invoker/i,
  'push unregistration must rely on authenticated DELETE plus owner-scoped RLS');
assert.doesNotMatch(advisorHardeningMigration, /grant all|disable row level security/i,
  'advisor hardening must not broaden table privileges or disable RLS');

console.log('Security hardening checks passed.');
