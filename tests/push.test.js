const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.join(__dirname, '..');
const push = fs.readFileSync(path.join(root, 'push.js'), 'utf8');
const chat = fs.readFileSync(path.join(root, 'chat.js'), 'utf8');
const sw = fs.readFileSync(path.join(root, 'service-worker.js'), 'utf8');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const ui = fs.readFileSync(path.join(root, 'app-ui.js'), 'utf8');
const workflow = fs.readFileSync(path.join(root, '.github', 'workflows', 'deploy-pages.yml'), 'utf8');
const migration = fs.readFileSync(path.join(root, 'supabase', 'migrations', '20260924090000_chat_push_notifications.sql'), 'utf8');
const maturityMigration = fs.readFileSync(path.join(root, 'supabase', 'migrations', '20260924111500_chat_maturity.sql'), 'utf8');
const operationalMigration = fs.readFileSync(path.join(root, 'supabase', 'migrations', '20260924201500_operational_alerts_chat_retention.sql'), 'utf8');
const edge = fs.readFileSync(path.join(root, 'supabase', 'functions', 'notify-chat-message', 'index.ts'), 'utf8');
const release = JSON.parse(fs.readFileSync(path.join(root, 'release.json'), 'utf8'));

new vm.Script(push, { filename: 'push.js' });

assert.match(html, /id="pushNotificationCard"/, 'Chat must expose message notification controls');
assert.match(html, /id="pushPromptDialog"[\s\S]*id="pushPromptEnableBtn"[\s\S]*Enable notifications/, 'app entry must offer a one-time notification opt-in prompt');
assert.match(html, /id="pushPromptLaterBtn"[\s\S]*Not now/, 'notification opt-in prompt must provide a non-blocking Not now choice');
assert.match(html, /id="pushTeamToggle"/, 'users must be able to control group-chat notifications');
assert.match(html, /id="pushPrivateToggle"/, 'users must be able to control private-message notifications');
assert.match(html, /push\.js\?v=37\.33/, 'push client must be versioned with the app');

assert.match(push, /Notification\.requestPermission\(\)/, 'notification permission must only be requested by the explicit enable flow');
assert.match(push, /function pushCanPrompt\(\)[\s\S]*Notification\.permission!=='default'/, 'the app prompt must not appear after notification permission has already been decided');
assert.match(push, /pushPromptSeen\(\)/, 'the app prompt must be shown only once per device after a user decision');
assert.match(push, /document\.querySelector\('dialog\[open\]'\)/, 'notification prompt must wait until onboarding or another dialog is no longer open');
assert.match(push, /pushPromptEnableBtn[\s\S]*pushEnableFromPrompt/, 'the system permission request must remain behind the user pressing Enable notifications');
assert.match(push, /pushPromptLaterBtn[\s\S]*pushDismissPrompt/, 'Not now must dismiss the one-time prompt without granting permission');
assert.match(push, /pushManager\.subscribe\(\{userVisibleOnly:true,applicationServerKey:/, 'browser subscription must use VAPID and user-visible notifications');
assert.match(push, /register_push_subscription/, 'push endpoint registration must use the protected server RPC');
assert.match(push, /unregister_push_subscription/, 'users must be able to remove the current device subscription');
assert.match(push, /team_enabled/, 'team notification preference must be persisted');
assert.match(push, /private_enabled/, 'private notification preference must be persisted');
assert.match(html, /data-push-mute="hour"[\s\S]*data-push-mute="tonight"[\s\S]*data-push-mute="until_on"/, 'group alerts must support one-hour, tonight and until-enabled mute choices');
assert.match(html, /id="pushDeviceList"/, 'users must be able to review notification devices');
assert.match(html, /id="pushBlockedHelp"/, 'blocked notification permissions must have recovery guidance');
assert.match(push, /team_muted_until/, 'group mute expiry must be persisted');
assert.match(push, /pushBlockedInstructions/, 'blocked permission guidance must be platform-aware');
assert.match(push, /pushLoadDevices/, 'registered notification devices must be loaded for the signed-in user');
assert.match(push, /from\('push_subscriptions'\)\.delete\(\)\.eq\('id',id\)\.eq\('user_id',user\.id\)/, 'device removal must stay owner-scoped through RLS');
assert.doesNotMatch(html+push, /send test notification|test notification/i, 'the app must not add a test-notification button');
assert.match(push, /dispatchChatPush/, 'chat notification dispatch must be isolated behind a non-blocking helper');
assert.match(sw, /self\.navigator[\s\S]*setAppBadge/, 'background notifications should set a generic installed-app badge where supported');
assert.match(push, /view==='chat'[\s\S]*show\('chat'\)/, 'Chat shortcuts and notification URLs must open Chat even without a conversation id');
assert.match(push, /client\.functions\.invoke\('notify-chat-message'/, 'message pushes must be dispatched through the authenticated Edge Function');
assert.doesNotMatch(push, /vapid_private|privateKey|service_role|SUPABASE_SERVICE_ROLE/i, 'browser push code must not contain server secrets');

const dispatchCalls = chat.match(/window\.dispatchChatPush\(result\.data\.id\)/g) || [];
assert.equal(dispatchCalls.length, 1, 'successful sends must dispatch push from the shared completion path exactly once');
assert.match(chat, /chatSendTeamMessage[\s\S]*chatCompleteSend\(result,'team'\)/, 'group sends must use the shared push-aware completion path');
assert.match(chat, /chatSendPrivateMessage[\s\S]*chatCompleteSend\(result,'private'\)/, 'private sends must use the shared push-aware completion path');
assert.match(chat, /window\.openChatFromPush=chatOpenFromPush/, 'notification taps must be able to open the matching chat conversation');

assert.match(sw, /self\.addEventListener\('push'/, 'service worker must receive background push events');
assert.match(sw, /self\.addEventListener\('notificationclick'/, 'service worker must handle notification taps');
assert.match(sw, /visibilityState === 'visible'/, 'system notifications must be suppressed when the app is already visible');
assert.match(sw, /showNotification\(title, options\)/, 'background pushes must create a system notification');
assert.match(sw, /OPEN_APP_NOTIFICATION/, 'notification taps must route through the shared app deep-link handler');
assert.match(sw, /ROSTER_PUSH_RECEIVED/, 'visible roster pushes must refresh the open roster without showing duplicate system notifications');
assert.match(sw, /ACCESS_REQUEST_PUSH_RECEIVED/, 'visible access-request pushes must refresh administrator attention state');
assert.doesNotMatch(sw, /message\.body|chat_messages|patient/i, 'service worker must not obtain chat message content or patient data');

assert.match(migration, /create table if not exists public\.push_subscriptions/, 'push subscriptions must be stored separately');
assert.match(migration, /create table if not exists public\.push_preferences/, 'notification preferences must be persisted');
assert.match(migration, /create table if not exists public\.push_dispatches/, 'server dispatches must be deduplicated');
assert.match(migration, /create table if not exists public\.push_server_config/, 'server VAPID configuration must be isolated');
assert.match(migration, /revoke all privileges on table public\.push_server_config from public,anon,authenticated/, 'VAPID server configuration must not be browser-readable');
assert.match(migration, /grant select on table public\.push_server_config to service_role/, 'only the trusted server role may read VAPID configuration');
assert.match(migration, /user_id=\(select auth\.uid\(\)/, 'browser-visible push rows must be owner scoped');
assert.doesNotMatch(migration, /BqB7H_jy|vapid_private_key\s*[,=]\s*['"][A-Za-z0-9_-]{20,}/i, 'the private VAPID key must not be committed');
assert.match(maturityMigration, /add column if not exists team_muted_until timestamptz/, 'group mute expiry must be stored server-side');
assert.match(maturityMigration, /Members can remove own push subscriptions[\s\S]*user_id=\(select auth\.uid\(\)\)/, 'notification device removal must use owner-scoped RLS');
assert.match(maturityMigration, /drop function if exists public\.remove_my_push_device\(uuid\)/, 'legacy privileged device-removal RPC must be removed');
assert.doesNotMatch(maturityMigration, /create or replace function public\.remove_my_push_device\(/i, 'device removal must not add a privileged public RPC');

assert.doesNotMatch(edge, /body:\s*message\.body|body:\s*String\(message\.body/, 'chat message text must never be copied into a push payload');
assert.match(edge, /message\.sender_id !== user\.id/, 'only the actual message sender may dispatch its notification');
assert.match(edge, /push_dispatches/, 'duplicate notification dispatches must be claimed server-side');
assert.match(edge, /team_muted_until/, 'server dispatch must respect temporary group mute settings');
assert.match(edge, /pref\?\.team_muted_until[\s\S]*new Date\(String\(pref\.team_muted_until\)\)\.getTime\(\) > Date\.now\(\)/, 'group pushes must be skipped while the mute window is active');
assert.match(edge, /New message from/, 'group notification may identify the sender');
assert.match(edge, /New private message/, 'private notification body must remain generic');
assert.match(edge, /push_server_config/, 'VAPID keys must be loaded server-side');
assert.doesNotMatch(edge, /BqB7H_jy/, 'the Edge Function source must not contain the private VAPID key');

assert.match(push, /mentions_enabled/, 'mention notification preference must be persisted');
assert.match(push, /roster_enabled/, 'roster-update notification preference must be persisted');
assert.match(push, /access_request_enabled/, 'administrator access-request notification preference must be persisted');
assert.match(push, /dispatchRosterPush/, 'roster mutations must dispatch through a non-blocking notification helper');
assert.match(push, /queue_roster_push_event/, 'roster push dispatch must first claim the current server revision');
assert.match(push, /dispatchAccessRequestPush/, 'new access requests must have a privacy-safe administrator push helper');
assert.match(push, /view==='night'[\s\S]*chooseDate/, 'roster notification taps must open the affected night');
assert.match(push, /view==='admin'[\s\S]*switchAdminTab\(tab,false\)/, 'administrator notification taps must open the requested admin tab');
assert.match(operationalMigration, /add column if not exists roster_enabled boolean not null default true/, 'roster notifications must be optional per user');
assert.match(operationalMigration, /add column if not exists mentions_enabled boolean not null default true/, 'mention notifications must be optional per user');
assert.match(operationalMigration, /add column if not exists access_request_enabled boolean not null default true/, 'access-request notifications must be optional per administrator');
assert.match(operationalMigration, /create table if not exists public\.roster_push_events/, 'roster notification events must be server-validated and deduplicated');
assert.match(operationalMigration, /create table if not exists public\.push_event_dispatches/, 'non-chat notification dispatches must be deduplicated server-side');
assert.match(edge, /kind === "roster_update"/, 'Edge Function must support privacy-safe roster-update dispatch');
assert.match(edge, /kind === "access_request"/, 'Edge Function must support privacy-safe administrator access-request dispatch');
assert.match(edge, /You were mentioned by/, 'mentioned Team members must receive a targeted mention notification');
assert.match(edge, /A new access request is waiting for review\./, 'access-request push text must not expose the requesting account');
assert.match(edge, /Night Roster updated/, 'roster push must use a generic operational title');
assert.doesNotMatch(edge, /requestRow\.email|requestRow\.display_name/, 'access-request push dispatch must not load or expose requester identity');

assert.match(workflow, /supabase functions deploy notify-chat-message/, 'production deploy must include the push Edge Function');
assert.match(workflow, /push\.js/, 'GitHub Pages deployment must publish and verify the push client');
const appShell = sw.slice(sw.indexOf('const APP_SHELL = ['), sw.indexOf('];', sw.indexOf('const APP_SHELL = [')) + 2);
assert.doesNotMatch(appShell, /push\.js/, 'optional push code must not be required for core PWA installation');

assert.equal(release.version, '37.33');
assert.equal(release.title, 'Application shell foundation');
assert.ok(release.changes.some(item => /built from pinned Vite/i.test(item)), 'release notes must explain the build foundation');
assert.ok(release.changes.some(item => /service worker/i.test(item)), 'release notes must explain update and cache continuity');
assert.match(ui, /\{version:'37\.32'[\s\S]*?title:'Premium PWA experience'/, 'previous release history must remain intact');

console.log('Push notification privacy, security, routing and deployment checks passed.');
