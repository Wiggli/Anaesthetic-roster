const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const css = read('src/product-coherence.css');
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
  '@import "./product-coherence.css";'
], 'Tailwind presentation cascade');

assert.ok(
  tailwind.indexOf('@import "./product-coherence.css";') > tailwind.indexOf('@import "./product-polish.css";'),
  'product-coherence.css must remain the final product-wide presentation layer'
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

assert.equal((css.match(/!important/g) || []).length, 0, 'coherence layer must not escalate cascade conflicts with !important');
assert.ok(!css.includes('.hidden {'), 'coherence layer must not redefine runtime visibility state');
assert.ok(!css.includes('--liquid-danger:'), 'coherence layer must not redefine the clinical danger colour');
assert.ok(!css.includes('--liquid-warning:'), 'coherence layer must not redefine the clinical warning colour');
assert.ok(!css.includes('--liquid-success:'), 'coherence layer must not redefine the clinical success colour');

includesAll(designSystem, [
  'role tonight, their break, changes requiring attention, the team plan',
  '`product-coherence.css` is the final product-wide cohesion authority',
  'Night → Changes → Actions → Breaks → Chat → Account'
], 'Design-system documentation');

console.log('product coherence contract tests passed');
