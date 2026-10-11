const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const root = path.join(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const release = JSON.parse(read('release.json'));
const version = release.version;
const escapedVersion = version.replace(/\./g, '\\.');
const intelligence = read('night-intelligence.js');
const css = read('night-intelligence.css');
const theme = read('theme-bootstrap.js');
const worker = read('service-worker.js');
const vite = read('vite.config.mts');
const clinical = read('src/legacy-ui/clinical.js');
const sync = read('src/legacy-ui/sync.js');
const push = read('push.js');

const syntax = spawnSync(process.execPath, ['--check', path.join(root, 'night-intelligence.js')], { encoding: 'utf8' });
assert.equal(syntax.status, 0, syntax.stderr || 'night-intelligence.js must parse');

for (const contract of [
  'Command centre', 'Attention inbox', 'My Night', 'niPhase', 'Undo last change',
  'niConflictItems', 'nightRecommendedQuickAction', 'niBindLongPress',
  'navigator.setAppBadge', 'anaes_safe_intent_v1', 'niFreshnessLabel',
  'Review concurrent changes', 'niShiftIdentity', 'privacy-preserving', 'Search & commands',
  'data-night-density', 'niAccessibilityPass', 'App health', 'Guided troubleshooting', 'Calm Mode'
]) {
  assert.ok(intelligence.includes(contract), `Night Intelligence must include ${contract}`);
}

assert.match(intelligence, /ROSTER_REVISION_CONFLICT/);
assert.match(intelligence, /conflictChanges/);
assert.match(intelligence, /It will never auto-submit/);
assert.match(intelligence, /Shared changes will not be queued or sent until you reconnect/);
assert.match(intelligence, /read-only/i);
assert.doesNotMatch(intelligence, /\.rpc\s*\(/, 'Night Intelligence must not create a second clinical RPC path');
assert.doesNotMatch(intelligence, /\.from\s*\(/, 'Night Intelligence must not create a second database write/read contract');
assert.doesNotMatch(intelligence, /age>180000/, 'elapsed minutes alone must not create a stale-roster warning');
assert.doesNotMatch(intelligence, /id:'stale'/, 'passive refresh age must not become an attention warning');
assert.match(intelligence, /function niActionableAttention/, 'Night Intelligence must distinguish actionable roster issues from technical refresh notices');
assert.match(intelligence, /item\.action!=='refresh'/, 'technical refresh items must not drive app-badge attention');
assert.match(intelligence, /niAttentionItems\(\)\.filter\(niActionableAttention\)/, 'app-badge attention must retain actionable roster issues');

// Pending decisions are in-app attention, never an independent OS notification path.
assert.doesNotMatch(intelligence, /showNotification|niSmartNotify|lastNotifiedSignature/,
  'passive attention renders must not send or re-send device notifications');
const attentionFunctions = intelligence.slice(intelligence.indexOf('function niActionableAttention('), intelligence.indexOf('function niRecommendedAction('));
const badgeFunction = intelligence.slice(intelligence.indexOf('function niSyncBadge('), intelligence.indexOf('function niWrapBadge('));
const badgeCalls = [];
const attentionContext = {
  items: [
    { id: 'task-allocation', severity: 'warning', action: 'review' },
    { id: 'cover-critical', severity: 'critical', action: 'review' },
    { id: 'sync', severity: 'warning', action: 'refresh' }
  ],
  unread: 0,
  navigator: { setAppBadge: count => badgeCalls.push(count), clearAppBadge: () => badgeCalls.push(0) }
};
// VM globals are called without a receiver.
attentionContext.niAttentionItems = () => attentionContext.items;
attentionContext.niChatUnread = () => attentionContext.unread;
vm.createContext(attentionContext);
vm.runInContext(attentionFunctions + badgeFunction, attentionContext);
for (let render = 0; render < 3; render++) vm.runInContext('niSyncBadge()', attentionContext);
assert.deepEqual(badgeCalls, [2, 2, 2], 'repeated renders must preserve pending allocation and critical attention badges');
attentionContext.items = [];
attentionContext.unread = 1;
vm.runInContext('niSyncBadge()', attentionContext);
assert.equal(badgeCalls.at(-1), 1, 'chat unread counts remain on the badge');
attentionContext.unread = 0;
vm.runInContext('niSyncBadge()', attentionContext);
assert.equal(badgeCalls.at(-1), 0, 'resolved attention clears the badge');

assert.match(clinical, /label:'Undo'/, 'existing clinical mutations must retain supported Undo paths');
assert.match(sync, /function runRosterMutation/);
assert.match(sync, /ensureFreshBeforeMutation/);
assert.match(sync, /conflictSummary/);
assert.match(sync, /ROSTER_REVISION_CONFLICT/);
assert.match(push, /view==='night'/, 'roster notifications must deep-link into Night');
assert.match(push, /rosterDate/, 'roster notification deep links must preserve the selected date');

assert.match(theme, new RegExp(`night-intelligence\\.css\\?v=${escapedVersion}`));
assert.match(theme, new RegExp(`night-intelligence\\.js\\?v=${escapedVersion}`));
assert.match(theme, /data-night-intelligence/);
assert.ok(worker.includes(`./night-intelligence.css?v=${version}`));
assert.ok(worker.includes(`./night-intelligence.js?v=${version}`));
assert.match(vite, /'night-intelligence\.css'/);
assert.match(vite, /'night-intelligence\.js'/);

assert.match(css, /var\(--app-safe-top\)/);
assert.match(css, /var\(--app-safe-bottom\)/);
assert.match(css, /prefers-reduced-motion/);
assert.match(css, /prefers-contrast:more/);
assert.match(css, /nightCalmMode/);
assert.match(css, /data-night-density="compact"/);

console.log('Night Intelligence feature, safety, offline, notification and PWA integration contracts passed.');
