const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.join(__dirname, '..');
const chat = fs.readFileSync(path.join(root, 'chat.js'), 'utf8');
const chatCss = fs.readFileSync(path.join(root, 'chat.css'), 'utf8');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const sw = fs.readFileSync(path.join(root, 'service-worker.js'), 'utf8');
const workflow = fs.readFileSync(path.join(root, '.github', 'workflows', 'deploy-pages.yml'), 'utf8');
const baseMigration = fs.readFileSync(path.join(root, 'supabase-migration-20260924003000_secure_chat.sql'), 'utf8');
const refineMigration = fs.readFileSync(path.join(root, 'supabase-migration-20260924014500_refine_chat_directory.sql'), 'utf8');

new vm.Script(chat, { filename: 'chat.js' });

assert.match(html, /id="chat" class="view hidden"/, 'chat must remain an isolated app view');
assert.match(html, /data-v="chat"[^>]*>[\s\S]*?<span>Chat<\/span>[\s\S]*?id="chatUnreadBadge"/, 'bottom navigation must expose Chat with an unread badge');
assert.match(html, /id="chatTeamCard"[\s\S]*Anaesthetic Team/, 'Anaesthetic Team must be the primary group-chat card');
assert.match(html, /id="chatTeamPreview"/, 'team card must surface the latest group message');
assert.match(html, /id="chatConversationList"[^>]*aria-label="Private conversations"/, 'private conversations must be visually separate from the team room');
assert.match(html, /Staff coordination only\.<\/b> Do not share patient-identifiable or clinical information in chat\./, 'chat must retain the patient-information safety notice');
assert.match(html, /id="chatMessageInput"[^>]*maxlength="2000"/, 'chat must be plain text with a bounded message length');
assert.doesNotMatch(html.slice(html.indexOf('<section id="chat"'), html.indexOf('<section id="admin"')), /type="file"|accept="image|camera|microphone|video|location/i, 'chat must not expose attachment or media controls');
assert.match(html, /chat\.css\?v=37\.20/, 'chat styling must be versioned with the app');
assert.match(html, /chat\.js\?v=37\.20/, 'chat client must be versioned with the app');

assert.match(chatCss, /grid-auto-rows:max-content/, 'chat home rows must not stretch the safety notice vertically');
assert.match(chatCss, /\.chatTeamCard\{[\s\S]*min-height:150px/, 'the team group must be a prominent hero card');
assert.match(chatCss, /\.chatSafetyNotice\{[\s\S]*padding:9px 11px/, 'the safety notice must remain compact');
assert.match(chatCss, /body\.dark/, 'chat must include dark-mode styling');

assert.match(chat, /var PAGE_SIZE=40;/, 'chat must page messages instead of loading full history');
assert.match(chat, /\.limit\(PAGE_SIZE\)/, 'recent and older message queries must use the page size');
assert.match(chat, /\.lt\('id',chatState\.oldestMessageId\)/, 'older messages must use keyset pagination');
assert.match(chat, /channel\('anaesthetic-chat-v2-'/, 'chat must use a realtime channel separate from roster sync');
assert.doesNotMatch(chat, /changesChannel|loadSharedData|scheduleSharedReload|night_changes|night_overtime|rotation_versions|roster_nights/, 'chat client must not call roster synchronization or roster tables');
assert.match(chat, /\.from\('chat_directory'\)\.select\('person_key,display_name,preferred_user_id,registered,active'\)/, 'private-chat picker must use the safe roster directory');
assert.match(chat, /Has not joined Night Roster yet/, 'authorised staff who have not registered must still be visible with a clear unavailable state');
assert.match(chat, /entry\.person_key!==mine/, 'the picker must remove the current staff identity rather than only the current auth account');
assert.match(chat, /chatSamePerson/, 'alternate sign-in identities for one person must be treated as the same chat sender');
assert.doesNotMatch(chat, /select\([^\n]*email|\.email\b/, 'chat client must not request or render email addresses');
assert.match(chat, /\.insert\(\{conversation_id:conversationId,body:body\}\)/, 'message send must not supply sender identity from the browser');
assert.match(chat, /body\.textContent=message\.body/, 'message text must be rendered as text rather than HTML');
assert.doesNotMatch(chat, /accept swap|approve swap|request swap|swap request/i, 'chat must not implement a formal swap workflow');

assert.match(baseMigration, /create table if not exists public\.chat_messages/, 'base chat schema must remain intact');
assert.match(refineMigration, /create table if not exists public\.chat_directory/, 'refined directory must be stored separately from private profiles');
assert.match(refineMigration, /create table if not exists chat_private\.identity_links/, 'alternate login identities must be linked in the private chat schema');
assert.match(refineMigration, /grant select on table public\.chat_directory to authenticated/, 'authenticated members may read only the safe directory');
assert.match(refineMigration, /Active members can view roster chat directory/, 'directory access must be RLS protected');
assert.match(refineMigration, /person_key=participant\.person_key/, 'private conversation RLS must compare canonical chat identity');
assert.match(refineMigration, /new\.sender_id:=auth\.uid\(\)/, 'database trigger must still stamp the authenticated sender id');
assert.match(refineMigration, /new\.sender_display_name:=v_name/, 'sender display identity must be stamped server-side');
assert.match(refineMigration, /security invoker/, 'unread aggregation must continue to respect RLS');
assert.doesNotMatch(refineMigration, /alter table public\.user_profiles|create policy[\s\S]*on public\.user_profiles/i, 'private user profile visibility must remain unchanged');
assert.doesNotMatch(refineMigration, /insert into public\.night_|update public\.night_|delete from public\.night_|insert into public\.roster_|update public\.roster_|delete from public\.roster_/i, 'chat refinement must not mutate roster data');

const appShell = sw.slice(sw.indexOf('const APP_SHELL = ['), sw.indexOf('];', sw.indexOf('const APP_SHELL = [')) + 2);
assert.doesNotMatch(appShell, /chat\.js|chat\.css/, 'chat assets must not be mandatory for service-worker installation');
assert.match(workflow, /cp index\.html styles\.css chat\.css[\s\S]*app-ui\.js chat\.js/, 'deployment must publish chat assets');

console.log('Refined chat identity, UI isolation and pagination checks passed.');
