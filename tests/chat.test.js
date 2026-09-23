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
const migration = fs.readFileSync(path.join(root, 'supabase-migration-20260924003000_secure_chat.sql'), 'utf8');

new vm.Script(chat, { filename: 'chat.js' });

assert.match(html, /id="chat" class="view hidden"/, 'chat must be an isolated app view');
assert.match(html, /data-v="chat"[^>]*>[\s\S]*?<span>Chat<\/span>[\s\S]*?id="chatUnreadBadge"/, 'bottom navigation must expose Chat with an unread badge');
assert.match(html, /Staff coordination only\.<\/b> Do not share patient-identifiable or clinical information in chat\./, 'chat must display the patient-information safety notice');
assert.match(html, /id="chatMessageInput"[^>]*maxlength="2000"/, 'chat must be plain text with a bounded message length');
assert.doesNotMatch(html.slice(html.indexOf('<section id="chat"'), html.indexOf('<section id="admin"')), /type="file"|accept="image|camera|microphone|video|location/i, 'chat must not expose attachment or media controls');
assert.match(html, /chat\.css\?v=37\.19/, 'chat styling must be versioned with the app');
assert.match(html, /chat\.js\?v=37\.19/, 'chat client must be versioned with the app');

assert.match(chat, /var PAGE_SIZE=40;/, 'chat must page messages instead of loading full history');
assert.match(chat, /\.limit\(PAGE_SIZE\)/, 'recent and older message queries must use the page size');
assert.match(chat, /\.lt\('id',chatState\.oldestMessageId\)/, 'older messages must use keyset pagination');
assert.match(chat, /channel\('anaesthetic-chat-v1-'/, 'chat must use a realtime channel separate from roster sync');
assert.doesNotMatch(chat, /changesChannel|loadSharedData|scheduleSharedReload|night_changes|night_overtime|rotation_versions|roster_nights/, 'chat client must not call roster synchronization or roster tables');
assert.match(chat, /\.from\('chat_members'\)\.select\('user_id,display_name,active'\)/, 'chat directory must request names and ids only');
assert.doesNotMatch(chat, /select\([^\n]*email|\.email\b/, 'chat client must not request or render email addresses');
assert.match(chat, /\.insert\(\{conversation_id:conversationId,body:body\}\)/, 'message send must not supply sender identity from the browser');
assert.match(chat, /body\.textContent=message\.body/, 'message text must be rendered as text rather than HTML');
assert.doesNotMatch(chat, /accept swap|approve swap|request swap|swap request/i, 'chat must not implement a formal swap workflow');

assert.match(migration, /create table if not exists public\.chat_members/, 'chat member directory must be separate from private profiles');
assert.match(migration, /create table if not exists public\.chat_conversations/, 'chat conversations table must exist');
assert.match(migration, /create table if not exists public\.chat_messages/, 'chat messages table must exist');
assert.match(migration, /create table if not exists public\.chat_read_state/, 'unread state must be persisted');
assert.match(migration, /alter table public\.chat_members enable row level security/, 'chat members must use RLS');
assert.match(migration, /alter table public\.chat_conversations enable row level security/, 'chat conversations must use RLS');
assert.match(migration, /alter table public\.chat_messages enable row level security/, 'chat messages must use RLS');
assert.match(migration, /alter table public\.chat_read_state enable row level security/, 'chat read state must use RLS');
assert.match(migration, /sender_id = \(select auth\.uid\(\)\)/, 'sender identity must be enforced by RLS');
assert.match(migration, /new\.sender_id := auth\.uid\(\)/, 'database trigger must stamp the authenticated sender id');
assert.match(migration, /grant insert \(conversation_id,body\) on table public\.chat_messages to authenticated/, 'clients must not be able to insert sender identity columns');
assert.match(migration, /kind = 'direct'[\s\S]*auth\.uid\(\).*user_a[\s\S]*auth\.uid\(\).*user_b/, 'direct chats must be participant-scoped');
assert.match(migration, /grant execute on function public\.chat_unread_counts\(\) to authenticated/, 'unread counts must use the RLS-aware function');
assert.match(migration, /security invoker/, 'unread aggregation must not bypass RLS');
assert.match(migration, /alter publication supabase_realtime add table public\.chat_messages/, 'chat messages must use Supabase Realtime');
assert.match(migration, /alter publication supabase_realtime add table public\.chat_conversations/, 'new private conversations must propagate in realtime');
assert.doesNotMatch(migration, /create table[^;]*chat_[^;]*\bemail\b/is, 'chat tables must not store email addresses');
assert.doesNotMatch(migration, /alter table public\.user_profiles|create policy[\s\S]*on public\.user_profiles/i, 'private user profile visibility must remain unchanged');
assert.doesNotMatch(migration, /insert into public\.night_|update public\.night_|delete from public\.night_|insert into public\.roster_|update public\.roster_|delete from public\.roster_/i, 'chat migration must not mutate roster data');

const appShell = sw.slice(sw.indexOf('const APP_SHELL = ['), sw.indexOf('];', sw.indexOf('const APP_SHELL = [')) + 2);
assert.doesNotMatch(appShell, /chat\.js|chat\.css/, 'chat assets must not be mandatory for service-worker installation');
assert.match(workflow, /cp index\.html styles\.css chat\.css[\s\S]*app-ui\.js chat\.js/, 'deployment must publish chat assets');
assert.match(chatCss, /body\.dark/, 'chat must include dark-mode styling');
assert.match(chatCss, /@media\(min-width:760px\)/, 'chat must adapt to wider screens while remaining mobile-first');

console.log('Chat isolation, privacy and pagination checks passed.');
