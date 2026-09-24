const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.join(__dirname, '..');
const push = fs.readFileSync(path.join(root, 'push.js'), 'utf8');
const chat = fs.readFileSync(path.join(root, 'chat.js'), 'utf8');
const sw = fs.readFileSync(path.join(root, 'service-worker.js'), 'utf8');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const workflow = fs.readFileSync(path.join(root, '.github', 'workflows', 'deploy-pages.yml'), 'utf8');
const migration = fs.readFileSync(path.join(root, 'supabase-migration-20260924090000_chat_push_notifications.sql'), 'utf8');
const edge = fs.readFileSync(path.join(root, 'supabase', 'functions', 'notify-chat-message', 'index.ts'), 'utf8');
const release = JSON.parse(fs.readFileSync(path.join(root, 'release.json'), 'utf8'));

new vm.Script(push, { filename: 'push.js' });

assert.match(html, /id="pushNotificationCard"/, 'Chat must expose message notification controls');
assert.match(html, /id="pushTeamToggle"/, 'users must be able to control group-chat notifications');
assert.match(html, /id="pushPrivateToggle"/, 'users must be able to control private-message notifications');
assert.match(html, /push\.js\?v=37\.24/, 'push client must be versioned with the app');

assert.match(push, /Notification\.requestPermission\(\)/, 'notification permission must only be requested by the explicit enable flow');
assert.match(push, /pushManager\.subscribe\(\{userVisibleOnly:true,applicationServerKey:/, 'browser subscription must use VAPID and user-visible notifications');
assert.match(push, /register_push_subscription/, 'push endpoint registration must use the protected server RPC');
assert.match(push, /unregister_push_subscription/, 'users must be able to remove the current device subscription');
assert.match(push, /team_enabled/, 'team notification preference must be persisted');
assert.match(push, /private_enabled/, 'private notification preference must be persisted');
assert.match(push, /dispatchChatPush/, 'chat notification dispatch must be isolated behind a non-blocking helper');
assert.match(push, /client\.functions\.invoke\('notify-chat-message'/, 'message pushes must be dispatched through the authenticated Edge Function');
assert.doesNotMatch(push, /vapid_private|privateKey|service_role|SUPABASE_SERVICE_ROLE/i, 'browser push code must not contain server secrets');

const dispatchCalls = chat.match(/window\.dispatchChatPush\(result\.data\.id\)/g) || [];
assert.equal(dispatchCalls.length, 2, 'both group and private sends must trigger push dispatch after the message is saved');
assert.match(chat, /window\.openChatFromPush=chatOpenFromPush/, 'notification taps must be able to open the matching chat conversation');

assert.match(sw, /self\.addEventListener\('push'/, 'service worker must receive background push events');
assert.match(sw, /self\.addEventListener\('notificationclick'/, 'service worker must handle notification taps');
assert.match(sw, /visibilityState === 'visible'/, 'system notifications must be suppressed when the app is already visible');
assert.match(sw, /showNotification\(title, options\)/, 'background pushes must create a system notification');
assert.match(sw, /OPEN_CHAT_NOTIFICATION/, 'notification taps must route back into Chat');
assert.doesNotMatch(sw, /message\.body|chat_messages|patient/i, 'service worker must not obtain chat message content or patient data');

assert.match(migration, /create table if not exists public\.push_subscriptions/, 'push subscriptions must be stored separately');
assert.match(migration, /create table if not exists public\.push_preferences/, 'notification preferences must be persisted');
assert.match(migration, /create table if not exists public\.push_dispatches/, 'server dispatches must be deduplicated');
assert.match(migration, /create table if not exists public\.push_server_config/, 'server VAPID configuration must be isolated');
assert.match(migration, /revoke all privileges on table public\.push_server_config from public,anon,authenticated/, 'VAPID server configuration must not be browser-readable');
assert.match(migration, /grant select on table public\.push_server_config to service_role/, 'only the trusted server role may read VAPID configuration');
assert.match(migration, /user_id=\(select auth\.uid\(\)/, 'browser-visible push rows must be owner scoped');
assert.doesNotMatch(migration, /BqB7H_jy|vapid_private_key\s*[,=]\s*['"][A-Za-z0-9_-]{20,}/i, 'the private VAPID key must not be committed');

assert.doesNotMatch(edge, /\.select\([^)]*\bbody\b/, 'the notification function must not read chat message text');
assert.match(edge, /message\.sender_id !== user\.id/, 'only the actual message sender may dispatch its notification');
assert.match(edge, /push_dispatches/, 'duplicate notification dispatches must be claimed server-side');
assert.match(edge, /New message from/, 'group notification may identify the sender');
assert.match(edge, /New private message/, 'private notification body must remain generic');
assert.match(edge, /push_server_config/, 'VAPID keys must be loaded server-side');
assert.doesNotMatch(edge, /BqB7H_jy/, 'the Edge Function source must not contain the private VAPID key');

assert.match(workflow, /supabase functions deploy notify-chat-message/, 'production deploy must include the push Edge Function');
assert.match(workflow, /push\.js/, 'GitHub Pages deployment must publish and verify the push client');
const appShell = sw.slice(sw.indexOf('const APP_SHELL = ['), sw.indexOf('];', sw.indexOf('const APP_SHELL = [')) + 2);
assert.doesNotMatch(appShell, /push\.js/, 'optional push code must not be required for core PWA installation');

assert.equal(release.version, '37.24');
assert.equal(release.title, 'Team chat & notifications');
assert.ok(release.changes.some(item => /notifications/i.test(item)), 'release notes must announce message notifications together with Team chat');
assert.ok(release.changes.some(item => /roster/i.test(item) && /separate|entered|update/i.test(item)), 'release notes must keep chat separate from roster changes');

console.log('Push notification privacy, security, routing and deployment checks passed.');
