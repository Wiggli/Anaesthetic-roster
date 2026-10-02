const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const exists = file => fs.existsSync(path.join(root, file));
const header = '/* GENERATED FILE. Edit the source modules under src/, then run npm run generate:runtime. */\n';
const uiSources = [
  'src/legacy-ui/foundation.js',
  'src/legacy-ui/clinical.js',
  'src/legacy-ui/sync.js',
  'src/legacy-ui/bootstrap.js'
];

assert.equal(read('app-ui.js'), header + uiSources.map(read).join('\n'),
  'app-ui.js must be generated from the four responsibility-specific source modules');
for (const source of uiSources) {
  const bytes = fs.statSync(path.join(root, source)).size;
  assert.ok(bytes < 220 * 1024, source + ' must stay below 220 KiB so the UI cannot collapse back into one monolith');
}
assert.match(read('src/legacy-ui/foundation.js'), /function prepareChangesView\(/,
  'foundation must stop at shell preparation rather than owning clinical calculation');
assert.match(read('src/legacy-ui/clinical.js'), /function buildNightPlan\(/,
  'clinical source must own the canonical NightPlan adapter');
assert.match(read('src/legacy-ui/sync.js'), /function reconcileApplication\(/,
  'sync source must own lifecycle reconciliation');
assert.match(read('src/legacy-ui/bootstrap.js'), /function bind\(/,
  'bootstrap source must own final browser event wiring');

for (const source of ['src/domain-logic.ts', 'src/runtime-foundation.ts']) {
  assert.ok(exists(source), source + ' must be the checked-in TypeScript source of truth');
  assert.doesNotMatch(read(source), /@ts-nocheck/, source + ' must remain visible to strict TypeScript checking');
  assert.match(read(source), /global: any/, source + ' must be authored as TypeScript rather than copied JavaScript');
}
for (const generated of ['domain-logic.js', 'runtime-foundation.js']) {
  assert.ok(read(generated).startsWith(header), generated + ' must remain generated for stable installed-PWA URLs');
}
for (const obsolete of [
  'ACCOUNT_SETTINGS_BOUNDARY.md',
  'CHANGES_CONFIRMATION_BOUNDARY.md',
  'CHANGES_FEEDBACK_BOUNDARY.md',
  'CHANGES_WORKFLOW_BOUNDARY.md',
  'CHAT_PRESENTATION_BOUNDARY.md',
  'CHAT_STATUS_BOUNDARY.md',
  'PRESENTATION_REDESIGN_BOUNDARY.md'
]) {
  assert.equal(exists(obsolete), false, obsolete + ' was a superseded one-off development note and must stay removed');
}

console.log('Modular UI ownership and TypeScript runtime source architecture passed.');
