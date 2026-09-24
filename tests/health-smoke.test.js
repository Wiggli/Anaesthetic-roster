const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const core = fs.readFileSync(path.join(root, 'app-core.js'), 'utf8');
const ui = fs.readFileSync(path.join(root, 'app-ui.js'), 'utf8');
const chat = fs.readFileSync(path.join(root, 'chat.js'), 'utf8');
const push = fs.readFileSync(path.join(root, 'push.js'), 'utf8');
const edge = fs.readFileSync(path.join(root, 'supabase', 'functions', 'notify-chat-message', 'index.ts'), 'utf8');
const migration = fs.readFileSync(path.join(root, 'supabase-migration-20260924111500_chat_maturity.sql'), 'utf8');
const workflow = fs.readFileSync(path.join(root, '.github', 'workflows', 'deploy-pages.yml'), 'utf8');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');

assert.match(ui, /async function authorizeUser\(user,session\)[\s\S]*loadSharedData\(\)/,
  'signed-in startup must still load the protected roster before normal app use');
assert.match(chat, /button\[data-v="chat"\][\s\S]*chatOpenView\(\)/,
  'opening the Chat tab must explicitly start the chat view');
assert.match(chat, /client\.rpc\('chat_overview_v2'\)/,
  'Chat must obtain its overview from the compact RLS-aware RPC');
assert.match(chat, /from\('chat_messages'\)[\s\S]*eq\('conversation_id',team\.id\)[\s\S]*limit\(TEAM_PAGE_SIZE\)/,
  'opening team chat must query only a bounded page of group messages');
assert.match(chat, /async function chatStartSession\(\)[\s\S]*chatRefreshUnreadCounts\(\)[\s\S]*chatSubscribeRealtime\(\)/,
  'background chat startup must be limited to unread state and realtime');
const startSession = chat.slice(chat.indexOf('async function chatStartSession()'), chat.indexOf('function chatScheduleSessionStart', chat.indexOf('async function chatStartSession()')));
assert.doesNotMatch(startSession, /chatFetchOverview|chatLoadTeamMessages/,
  'message history must remain lazy and must not slow roster startup');

assert.match(edge, /Deno\.serve/, 'chat notification Edge Function must expose a request handler');
assert.match(edge, /admin\.auth\.getUser\(token\)/, 'Edge Function must authenticate the sender');
assert.match(edge, /from\("chat_messages"\)/, 'Edge Function must validate the saved message before dispatch');
assert.match(workflow, /supabase functions deploy notify-chat-message/,
  'deployment must publish the chat notification Edge Function');
assert.match(workflow, /Chat notification endpoint health check/,
  'deployment must verify that the notification endpoint is reachable');

assert.match(migration, /create or replace function public\.admin_app_health\(\)/,
  'database must expose the privacy-safe administrator health summary');
assert.match(core, /supa\.rpc\('admin_app_health'\)/,
  'administrator UI must query the server health summary');
assert.match(html, /id="adminHealthGrid"/,
  'administrator overview must have a system-health surface');

assert.doesNotMatch(html + push, /send test notification|test notification/i,
  'no test-notification button or workflow may be added');

assert.match(ui, /That’s all you need to start\./,
  'onboarding must end with the shortened ready step');
const onboarding = ui.slice(ui.indexOf('function onboardingPages()'), ui.indexOf('function renderOnboarding()', ui.indexOf('function onboardingPages()')));
assert.doesNotMatch(onboarding, /onboardingProfileSetup|onboardingPasskeyButton/,
  'optional profile and passkey setup must stay out of the shortened onboarding path');

console.log('Authenticated startup, lazy chat, push endpoint, onboarding and admin-health contracts passed.');
