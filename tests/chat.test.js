const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.join(__dirname, '..');
const chat = fs.readFileSync(path.join(root, 'chat.js'), 'utf8');
const chatCss = fs.readFileSync(path.join(root, 'chat.css'), 'utf8');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const ui = fs.readFileSync(path.join(root, 'app-ui.js'), 'utf8');
const core = fs.readFileSync(path.join(root, 'app-core.js'), 'utf8');
const mainCss = fs.readFileSync(path.join(root, 'styles.css'), 'utf8');
const sw = fs.readFileSync(path.join(root, 'service-worker.js'), 'utf8');
const workflow = fs.readFileSync(path.join(root, '.github', 'workflows', 'deploy-pages.yml'), 'utf8');
const baseMigration = fs.readFileSync(path.join(root, 'supabase-migration-20260924003000_secure_chat.sql'), 'utf8');
const refineMigration = fs.readFileSync(path.join(root, 'supabase-migration-20260924014500_refine_chat_directory.sql'), 'utf8');

new vm.Script(chat, { filename: 'chat.js' });

assert.match(html, /id="chat" class="view hidden"/, 'chat must remain an isolated app view');
assert.match(html, /data-v="chat"[^>]*>[\s\S]*?<span>Chat<\/span>[\s\S]*?id="chatUnreadBadge"/, 'bottom navigation must expose Chat with an unread badge');
assert.match(html, /class="chatTeamConsole"[\s\S]*Anaesthetic Team/, 'Anaesthetic Team must be displayed as the main chat transcript');
assert.match(html, /id="chatTeamMessages"/, 'team chat must expose a scrolling multi-message transcript');
assert.match(html, /id="chatTeamComposer"[\s\S]*id="chatTeamInput"/, 'group messages must be sent directly from the Chat home screen');
assert.match(html, /id="chatConversationList"[^>]*aria-label="Private conversations"/, 'private conversations must remain visually separate from the team transcript');
assert.match(html, /One-to-one messages with nurses in the current roster/, 'private messaging must explicitly follow roster membership');
assert.match(html, /Staff coordination only\.<\/b> Do not share patient-identifiable or clinical information in chat\./, 'chat must retain the patient-information safety notice');
assert.match(html, /id="chatTeamInput"[^>]*maxlength="2000"/, 'group chat must remain bounded plain text');
assert.match(html, /id="chatMessageInput"[^>]*maxlength="2000"/, 'private chat must remain bounded plain text');
assert.doesNotMatch(html.slice(html.indexOf('<section id="chat"'), html.indexOf('<section id="admin"')), /type="file"|accept="image|camera|microphone|video|location/i, 'chat must not expose attachment or media controls');
assert.match(html, /chat\.css\?v=37\.24/, 'chat styling must be versioned with the app');
assert.match(html, /chat\.js\?v=37\.24/, 'chat client must be versioned with the app');
assert.match(ui, /function onboardingChatPage\(\)/, 'onboarding must include a dedicated Team chat page');
assert.match(ui, /if\(onboardingChatIntro\)return\[onboardingChatPage\(\)\]/, 'existing users must receive a one-page chat introduction rather than replaying the full guide');
assert.match(ui, /anaes_chat_intro_v37_24/, 'the chat introduction must be shown once per device');
assert.match(ui, /onboardingChatPage\(\),[\s\S]*Your roster identity/, 'new users must see chat as part of the normal onboarding sequence');
assert.match(ui, /Chat with the anaesthetic team\./, 'chat onboarding must explain the feature in plain language');
assert.match(ui, /If you agree a swap or another change, update the roster separately/, 'chat onboarding must explain that agreed changes still need to be entered in the roster');
assert.match(ui, /Notifications[\\s\\S]*Optional alerts can tell you when a new message arrives while the app is in the background/, 'chat onboarding must introduce optional message notifications');
assert.match(core, /var viewScrollPositions=\{today:0,changes:0,breaks:0,chat:0,roster:0,admin:0\}/, 'each primary view must keep its own scroll position');
const showSource = core.slice(core.indexOf('function show(v)'), core.indexOf('function previewExtension', core.indexOf('function show(v)')));
assert.match(showSource, /viewScrollPositions\[previous\]=Math\.max\(0,Number\(window\.scrollY\|\|0\)\)/, 'tab switching must remember the outgoing tab position');
assert.match(showSource, /window\.scrollTo\(0,restoreY\)/, 'tab switching must restore the destination tab without smooth scrolling');
assert.doesNotMatch(showSource, /window\.scrollTo\(0,0\)|viewEntering'\)/, 'tab switching must not force the page to the top or animate the entire view');
assert.match(mainCss, /body\.tabSwitching \.screenHeader[\s\S]*transition:none!important/, 'scroll-edge header transitions must be frozen during a tab switch');

assert.match(chatCss, /\.chatTeamConsole\{[\s\S]*minmax\(250px,330px\)/, 'team transcript must provide a substantial scrolling message area');
assert.match(chatCss, /\.chatTeamLine\{[\s\S]*grid-template-columns:auto auto minmax\(0,1fr\)/, 'team messages must render as compact continuous chat lines rather than bubbles');
assert.match(chatCss, /\.chatSafetyNotice\{[\s\S]*padding:8px 10px/, 'the safety notice must remain compact');
assert.match(chatCss, /\.chatMemberChoice:disabled\{[\s\S]*opacity:1/, 'unregistered roster members must stay legible rather than looking broken');
assert.match(chatCss, /body\.dark/, 'chat must include dark-mode styling');

assert.match(chat, /var PRIVATE_PAGE_SIZE=40;/, 'private chat must page messages instead of loading full history');
assert.match(chat, /var TEAM_PAGE_SIZE=30;/, 'team chat must load a bounded recent transcript');
assert.match(chat, /\.limit\(TEAM_PAGE_SIZE\)/, 'team message history must be paginated');
assert.match(chat, /\.lt\('id',chatState\.teamOldestMessageId\)/, 'older team messages must use keyset pagination');
assert.match(chat, /\.limit\(PRIVATE_PAGE_SIZE\)/, 'private message history must be paginated');
assert.match(chat, /\.lt\('id',chatState\.oldestMessageId\)/, 'older private messages must use keyset pagination');
assert.match(chat, /channel\('anaesthetic-chat-v3-'/, 'chat must use a realtime channel separate from roster sync');
assert.doesNotMatch(chat, /changesChannel|loadSharedData|scheduleSharedReload|night_changes|night_overtime|rotation_versions|roster_nights/, 'chat client must not call roster synchronization or roster tables');
assert.match(chat, /typeof TEAM!=='undefined'&&Array\.isArray\(TEAM\)/, 'private-message availability must be derived from the current roster team');
assert.match(chat, /chatRosterKeys\(\)\.filter/, 'private-message picker must be generated from roster membership');
assert.match(chat, /Not registered yet/, 'roster members without an app account must be shown with a clear availability state');
assert.match(chat, /chatDisplayName\(/, 'chat should use roster display names without exposing emails');
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

console.log('Group transcript, roster-based private list, privacy and pagination checks passed.');
