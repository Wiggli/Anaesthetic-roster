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
const chatCss = read('chat.css');
assert.equal(exists('src/ui-foundation.css'), false,
  'shared presentation must stay consolidated in presentation.css rather than reintroducing a second ui-foundation layer');
assert.equal((presentation.match(/42\.4 unified presentation foundation/g) || []).length, 1,
  'presentation.css must have exactly one final 42.4 UI foundation');
assert.doesNotMatch(presentation, /personalHeroFactGrid\{margin-inline:-14px!important\}/,
  'Night facts must not return to the clipping-prone negative-margin layout');
assert.doesNotMatch(presentation, /personalHeroPrimaryAction\{margin-inline:-14px!important\}/,
  'Night actions must remain inside the hero safe area');
assert.equal((rudderNavigation.match(/42\.4 primary navigation/g) || []).length, 1,
  'rudder navigation must have one final 42.4 dock foundation');
assert.equal((navigation.match(/className="navIconWrap"/g) || []).length, 4,
  'Night, Changes, Breaks and Chat must share the same fixed icon stage');
assert.doesNotMatch(navigation, /viewSwipeStage|swipePreview|swipeCurrent|setPageTrackOffset|pinPageTrack/,
  'primary navigation must not physically drag or stage full application screens');
assert.doesNotMatch(presentation, /viewSwipeStage|swipePreview|swipeCurrent/,
  'presentation.css must not retain the superseded full-page swipe track');
assert.doesNotMatch(read('src/clinical-experience.tsx'), /Personalise this view/,
  'Night must not duplicate Account and Settings inside the personal hero');
assert.match(rudderNavigation, /\.navIconWrap \.navTaskBadge\{/,
  'navigation badges must be anchored to the icon stage rather than the whole tab');
assert.match(rudderNavigation, /\.bottom\.reactTabs \.navIconWrap\{[\s\S]*?overflow:visible!important;/,
  'the icon stage must allow unread badges to extend without clipping');
assert.match(rudderNavigation, /\.navIconWrap \.navTaskBadge\{[\s\S]*?margin:0!important;/,
  'React navigation badges must neutralise legacy badge margins');
assert.match(chatCss, /\.bottom:not\(\.reactTabs\) button\[data-v="chat"\] \.navTaskBadge/,
  'legacy Chat badge positioning must be scoped to the non-React fallback dock');
assert.doesNotMatch(chatCss, /\.bottom button\[data-v="chat"\] \.navTaskBadge/,
  'legacy Chat badge positioning must not leak into the React dock');
assert.doesNotMatch(rudderNavigation, /42\.0 dock finishing pass/,
  'superseded dock finishing overrides must stay removed');


const legacyBaseCss = read('styles.css');
const legacyChatCss = read('chat.css');
assert.match(legacyBaseCss, /^\/\* Compatibility base\.[\s\S]*?\*\/\n@layer legacy-base \{/,
  'legacy base CSS must remain in a lower-priority cascade layer');
assert.equal((legacyBaseCss.match(/!important/g) || []).length, 0,
  'legacy base CSS must not use !important to beat the current product presentation');
assert.match(legacyChatCss, /^\/\* Complete Chat fallback styling\.[\s\S]*?\*\/\n@layer legacy-chat \{/,
  'Chat fallback CSS must remain in a lower-priority cascade layer');
assert.equal((legacyChatCss.match(/!important/g) || []).length, 0,
  'legacy Chat fallback CSS must not use !important to beat the current shared presentation');
assert.match(presentation, /^@layer presentation-history \{/,
  'pre-42.4 presentation generations must remain demoted to presentation-history');
const currentPresentationMarker = presentation.indexOf('/* 42.4 unified presentation foundation.');
assert.ok(currentPresentationMarker > 0, 'current 42.4 presentation foundation must remain present');
const historicalPresentation = presentation.slice(0, currentPresentationMarker);
assert.equal((historicalPresentation.match(/!important/g) || []).length, 0,
  'historical presentation CSS must not retain priority flags that can defeat current styling');
console.log('Modular UI ownership and TypeScript runtime source architecture passed.');
