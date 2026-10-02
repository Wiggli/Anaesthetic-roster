const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const ui = fs.readFileSync(path.join(root, 'app-ui.js'), 'utf8');
const core = fs.readFileSync(path.join(root, 'app-core.js'), 'utf8');
const chat = fs.readFileSync(path.join(root, 'chat.js'), 'utf8');
const domain = fs.readFileSync(path.join(root, 'domain-logic.js'), 'utf8');
const migration = fs.readFileSync(path.join(root, 'supabase', 'migrations', '20261002120000_logic_foundation_v47.sql'), 'utf8');
const sw = fs.readFileSync(path.join(root, 'service-worker.js'), 'utf8');

assert.match(ui, /var nightSelectionMode='automatic'/, 'automatic and manual night selection must be explicit state');
assert.match(ui, /function resolveNightContext\(/, 'Night must have one shared context resolver');
assert.match(ui, /function buildNightPlan\(/, 'Night, Changes and Breaks must share a canonical NightPlan');
assert.match(ui, /renderChanges\(base,canonical\);renderRoster\(\);renderBreaks\(canonical\)/, 'render paths must receive the same selected-night model');
assert.match(ui, /function runRosterMutation\(/, 'shared clinical writes must use a single guarded mutation path');
assert.match(ui, /rosterCommandInFlight\[key\]/, 'duplicate in-flight commands must be collapsed');
assert.match(ui, /verified-after-timeout/, 'ambiguous roster timeouts must be verified against refreshed shared state');
assert.match(ui, /incomingRevision<lastObservedSyncRevision/, 'an older shared snapshot must never replace newer state');
assert.match(ui, /sharedSyncState='starting'/, 'shared synchronization must have named state');
assert.match(ui, /noteCompatibilityStartup\(/, 'legacy startup fallbacks must be observable before retirement');
assert.match(ui, /syncServerClock\(/, 'server time must be used as an online clock sanity check');
assert.match(core, /function rosterCapabilities\(/, 'database capabilities must be centralized');
assert.match(core, /EXPECTED_SCHEMA_VERSION = 47/, 'logic foundation requires schema 47');
assert.match(domain, /snapshotIsExpired/, 'offline data must have an explicit retention bound');
assert.match(domain, /DIAG_LIMIT=30/, 'local diagnostics must be bounded');
assert.doesNotMatch(domain, /email|nurse|message body|roster_date/i, 'diagnostic foundation must not encode roster or identity fields');

assert.match(migration, /chat_messages_sender_client_message_uq[\s\S]*sender_id,client_message_id/, 'database must deduplicate retried sends');
assert.match(migration, /chat_send_message_v47[\s\S]*unique_violation[\s\S]*client_message_id/, 'send RPC must return the original message after a retry race');
assert.match(chat, /chatRetryFailed\(message,kind\)[\s\S]*message\.client_message_id/, 'client Retry must reuse the same idempotency key');
assert.match(migration, /chat_mark_read_v47[\s\S]*greatest\(/, 'read cursor must be monotonic on the server');
assert.match(chat, /Math\.max\(current,target\)/, 'read cursor must also be monotonic in client state');

assert.match(ui, /p_expected_revision:expectedRevision/, 'night finalisation must retain optimistic revision protection');
assert.match(ui, /changed on another device\|revision conflict/, 'stale multi-device finalisation must require review');
assert.match(sw, /ACTIVATE_UPDATE/, 'updates must still require explicit activation');
assert.match(ui, /verifyRuntimeHealth\(/, 'post-update runtime versions must be checked');

console.log('Multi-device, mutation retry, idempotency and update-health contracts passed.');
