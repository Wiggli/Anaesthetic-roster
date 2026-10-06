const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const css = read('src/product-coherence.css');
const bridge = read('src/product-coherence-bridge.css');
const correction = read('src/product-coherence-correction.css');
const tailwind = read('src/tailwind.css');
const designSystem = read('docs/DESIGN_SYSTEM.md');

function includesAll(source, values, label) {
  for (const value of values) assert.ok(source.includes(value), `${label} is missing ${value}`);
}

includesAll(tailwind, [
  '@import "./presentation.css";',
  '@import "./account-admin-polish.css";',
  '@import "./rudder-navigation.css";',
  '@import "./product-polish.css";',
  '@import "./product-coherence.css";',
  '@import "./product-coherence-bridge.css";',
  '@import "./product-coherence-correction.css";'
], 'Tailwind presentation cascade');

assert.ok(
  tailwind.indexOf('@import "./product-coherence.css";') > tailwind.indexOf('@import "./product-polish.css";'),
  'product-coherence.css must remain after the established product polish layer'
);
assert.ok(
  tailwind.indexOf('@import "./product-coherence-bridge.css";') > tailwind.indexOf('@import "./product-coherence.css";'),
  'the migration bridge must remain after the durable coherence layer'
);
assert.ok(
  tailwind.indexOf('@import "./product-coherence-correction.css";') > tailwind.indexOf('@import "./product-coherence-bridge.css";'),
  'the visible coherence correction must remain last in the presentation cascade'
);

includesAll(css, [
  '--coherence-card-radius:',
  '--coherence-hero-radius:',
  '--coherence-fast:',
  '#today #appHeader',
  '#changes .appScreenHeader',
  '#breaks .appScreenHeader',
  '#chat .appScreenHeader',
  '#today #personalNightCard > .personalHeroSurface',
  '#changes .workflowSteps',
  '#breaks .breakSummaryRow',
  '#chat .chatInboxTeamRow',
  '#accountSheet',
  '.bottom.reactTabs',
  '.quickActionsExperience',
  '@media (prefers-reduced-motion: reduce)',
  '@media (prefers-reduced-transparency: reduce)',
  '@media (prefers-contrast: more)'
], 'Product coherence contract');

includesAll(correction, [
  '--coherence-shell-radius:',
  '#today .nightUnifiedHero',
  '#changes .changesDatePanel',
  '#breaks .breaksContextPanel',
  '#chat .appScreenHeader',
  '#changes .workflowSteps',
  '#today #personalNightCard > .personalHeroSurface',
  '.bottom.reactTabs',
  '@media (max-width: 430px)',
  '@media (prefers-reduced-transparency: reduce)',
  '@media (prefers-reduced-motion: reduce)'
], 'Visible coherence correction contract');

assert.equal((css.match(/!important/g) || []).length, 0, 'durable coherence layer must not escalate cascade conflicts with !important');
assert.ok(!css.includes('.hidden {'), 'coherence layer must not redefine runtime visibility state');
assert.ok(!css.includes('--liquid-critical:'), 'coherence layer must not redefine the clinical critical colour');
assert.ok(!css.includes('--liquid-warning:'), 'coherence layer must not redefine the clinical warning colour');
assert.ok(!css.includes('--liquid-success:'), 'coherence layer must not redefine the clinical success colour');
assert.ok(!bridge.includes('.hidden {'), 'migration bridge must not redefine runtime visibility state');
assert.ok((bridge.match(/!important/g) || []).length <= 70, 'migration bridge must remain narrowly bounded');
assert.ok(!correction.includes('.hidden {'), 'visible correction must not redefine runtime visibility state');
assert.ok(!correction.includes('--liquid-critical:'), 'visible correction must not redefine the clinical critical colour');
assert.ok(!correction.includes('--liquid-warning:'), 'visible correction must not redefine the clinical warning colour');
assert.ok(!correction.includes('--liquid-success:'), 'visible correction must not redefine the clinical success colour');
assert.ok((correction.match(/!important/g) || []).length <= 320, 'visible correction override budget must remain bounded and presentation-only');

includesAll(designSystem, [
  'role tonight, their break, changes requiring attention, the team plan',
  '`product-coherence.css` is the final durable product-wide cohesion authority',
  '`product-coherence-bridge.css` is a narrow migration bridge',
  'Night → Changes → Actions → Breaks → Chat → Account'
], 'Design-system documentation');

console.log('product coherence contract tests passed');
