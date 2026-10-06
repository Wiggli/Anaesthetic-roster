const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const css = read('src/product-coherence.css');
const bridge = read('src/product-coherence-bridge.css');
const unified = read('src/product-unified.css');
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
  '@import "./product-unified.css";'
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
  tailwind.indexOf('@import "./product-unified.css";') > tailwind.indexOf('@import "./product-coherence-bridge.css";'),
  'the simple unified product layer must remain last in the presentation cascade'
);
assert.ok(
  !tailwind.includes('@import "./product-coherence-correction.css";'),
  'the over-compressed 47.0 corrective composition layer must stay retired'
);

includesAll(css, [
  '--coherence-card-radius:',
  '--coherence-hero-radius:',
  '--coherence-fast:',
  '#today #appHeader',
  '#changes .appScreenHeader',
  '#breaks .appScreenHeader',
  '#chat .appScreenHeader',
  '#accountSheet',
  '.bottom.reactTabs'
], 'Durable product coherence contract');

includesAll(unified, [
  '--unified-content-width:',
  '--unified-radius-lg:',
  '#today .nightUnifiedHero',
  '#changes .changesDatePanel',
  '#breaks .breaksContextPanel',
  '#chat .chatRosterContext',
  '.nightTeamIdentityContext',
  'input[type="date"]::-webkit-datetime-edit',
  '#changes .workflowSteps',
  '#today #personalNightCard > .personalHeroSurface',
  '#breaks .personalBreakSummary',
  '.bottom.reactTabs',
  '@media (max-width: 390px)',
  '@media (prefers-reduced-transparency: reduce)',
  '@media (prefers-reduced-motion: reduce)'
], 'Simple unified product contract');

assert.equal((css.match(/!important/g) || []).length, 0, 'durable coherence layer must not escalate cascade conflicts with !important');
assert.ok(!css.includes('.hidden {'), 'coherence layer must not redefine runtime visibility state');
assert.ok(!css.includes('--liquid-critical:'), 'coherence layer must not redefine the clinical critical colour');
assert.ok(!css.includes('--liquid-warning:'), 'coherence layer must not redefine the clinical warning colour');
assert.ok(!css.includes('--liquid-success:'), 'coherence layer must not redefine the clinical success colour');
assert.ok(!bridge.includes('.hidden {'), 'migration bridge must not redefine runtime visibility state');
assert.ok((bridge.match(/!important/g) || []).length <= 70, 'migration bridge must remain narrowly bounded');
assert.ok(!unified.includes('.hidden {'), 'unified layer must not redefine runtime visibility state');
assert.ok(!unified.includes('--liquid-critical:'), 'unified layer must not redefine the clinical critical colour');
assert.ok(!unified.includes('--liquid-warning:'), 'unified layer must not redefine the clinical warning colour');
assert.ok(!unified.includes('--liquid-success:'), 'unified layer must not redefine the clinical success colour');
assert.ok((unified.match(/!important/g) || []).length <= 330, 'unified override budget must remain bounded and presentation-only');

includesAll(designSystem, [
  'role tonight, their break, changes requiring attention, the team plan',
  '`product-coherence.css` is the final durable product-wide cohesion authority',
  '`product-coherence-bridge.css` is a narrow migration bridge',
  'Night → Changes → Actions → Breaks → Chat → Account'
], 'Design-system documentation');

console.log('product coherence contract tests passed');
