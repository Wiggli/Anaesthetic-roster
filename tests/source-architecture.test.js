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
assert.doesNotMatch(read('src/legacy-ui/foundation.js'), /function prepareChangesView\(/,
  'foundation must stop before selected-night clinical view preparation');
assert.doesNotMatch(read('src/legacy-ui/foundation.js'), /function buildNightPlan\(/,
  'foundation must not own canonical clinical plan calculation');
assert.match(read('src/legacy-ui/clinical.js'), /function prepareChangesView\(/,
  'clinical source must own selected-night view preparation');
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


const presentation = read('src/presentation.css');
const rudderNavigation = read('src/rudder-navigation.css');
const navigation = read('src/navigation.tsx');
assert.equal(exists('src/ui-foundation.css'), false,
  'shared presentation must stay consolidated in presentation.css rather than reintroducing a second ui-foundation layer');
assert.equal((presentation.match(/42\.2 unified presentation foundation/g) || []).length, 1,
  'presentation.css must have exactly one final 42.2 UI foundation');
assert.doesNotMatch(presentation, /personalHeroFactGrid\{margin-inline:-14px!important\}/,
  'Night facts must not return to the clipping-prone negative-margin layout');
assert.doesNotMatch(presentation, /personalHeroPrimaryAction\{margin-inline:-14px!important\}/,
  'Night actions must remain inside the hero safe area');
assert.equal((rudderNavigation.match(/42\.2 consolidated dock foundation/g) || []).length, 1,
  'rudder navigation must have one final 42.2 consolidated dock foundation');
assert.equal((navigation.match(/className="navIconWrap"/g) || []).length, 4,
  'Night, Changes, Breaks and Chat must share the same fixed icon stage');
assert.match(rudderNavigation, /\.navIconWrap \.navTaskBadge\{/,
  'navigation badges must be anchored to the icon stage rather than the whole tab');
assert.doesNotMatch(rudderNavigation, /42\.0 dock finishing pass/,
  'superseded dock finishing overrides must stay removed');

console.log('Modular UI ownership and TypeScript runtime source architecture passed.');
