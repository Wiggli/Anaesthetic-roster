const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');

const core = read('src/night-intelligence.tsx');
const extensions = read('src/night-intelligence-extensions.tsx');
const launch = read('src/launch.tsx');
const legacy = read('app-ui.js');

assert.match(launch, /mountNightIntelligence\(\);[\s\S]*mountNightIntelligenceExtensions\(\);/,
  'the intelligence surfaces and interaction extensions must both mount from the isolated React launch layer');
assert.doesNotMatch(core + extensions, /\.rpc\s*\(|(?:supa|client)\s*\??\.\s*from\s*\(/,
  'Night Intelligence must not introduce direct roster/database mutations');
assert.match(legacy, /ROSTER_REVISION_CONFLICT/,
  'revision-conflict protection must remain owned by the established roster engine');
assert.match(extensions, /changed on another device\|newer plan\|revision conflict/,
  'the conflict sheet must surface the established concurrency language');
assert.match(extensions, /ignoredConflictUntil = Date\.now\(\) \+ 60000/,
  'reviewed conflicts must not immediately reopen from the same stale message');
assert.match(core, /aggregate live count only/i,
  'team presence must explicitly remain aggregate and privacy preserving');
assert.match(extensions, /pushTeamToggle[\s\S]*pushPrivateToggle[\s\S]*pushMentionToggle[\s\S]*pushRosterToggle/,
  'notification focus presets must map onto the existing push-preference controls');
assert.match(extensions, /\.niPreferenceGroup select/,
  'Undo must target safe local view preferences instead of inventing rollback writes for roster mutations');
assert.match(extensions, /Shift\+F10|event\.shiftKey && event\.key === 'F10'/,
  'long-press person actions must have a keyboard equivalent');
assert.match(extensions, /role="alertdialog"/,
  'concurrency conflicts must be exposed with accessible alert-dialog semantics');
assert.match(core, /Offline · read only/,
  'offline confidence must clearly identify read-only operation');
assert.match(core, /App health/,
  'the selected PWA health and troubleshooting surface must remain part of Night Intelligence');

console.log('Night Intelligence safety contracts passed.');
