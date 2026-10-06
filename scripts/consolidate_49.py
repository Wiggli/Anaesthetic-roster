from pathlib import Path
import json
import re

unified_path = Path('src/product-unified.css')
unified = unified_path.read_text().rstrip()
marker = '/* 49.0 coherence completion: one active product authority */'
if marker not in unified:
    unified += r'''

/* 49.0 coherence completion: one active product authority */
:root {
  --unified-fast: 180ms;
  --unified-base: 240ms;
  --unified-ease: cubic-bezier(.2,.8,.2,1);
}
.quickActionsExperience { gap: var(--unified-space-3) !important; }
.quickActionsContextBar,
.quickPrimaryAction,
.quickReviewAction,
.quickCompactAction {
  border: 1px solid var(--unified-border) !important;
  border-radius: var(--unified-radius-lg) !important;
  background: var(--unified-surface) !important;
  box-shadow: none !important;
}
.quickActionsContextBar { background: var(--unified-soft) !important; }
.quickPrimaryAction,
.quickCompactAction { min-height: 70px !important; }
.quickReviewAction { min-height: 74px !important; }
.quickReviewAction:not(:disabled) {
  border-color: color-mix(in srgb, var(--liquid-accent) 20%, var(--unified-border)) !important;
  background: var(--unified-accent-soft) !important;
}
.headerLiveChip,
.liveStatus,
#breakPlanLive,
.primaryConnectionLine {
  color: var(--liquid-secondary) !important;
  font-variant-numeric: tabular-nums;
}
.headerLiveDot,
.liveDot,
.chatLiveDot,
#breakPlanLive i {
  width: 7px !important;
  height: 7px !important;
  box-shadow: none !important;
}
:is(button, [role="button"], summary) { -webkit-tap-highlight-color: transparent; }
:is(button, [role="button"], summary):focus-visible,
input:focus-visible,
select:focus-visible,
textarea:focus-visible {
  outline: 3px solid color-mix(in srgb, var(--liquid-accent) 38%, transparent) !important;
  outline-offset: 2px !important;
}
@media (hover:hover) and (pointer:fine) {
  :is(button, [role="button"], summary) {
    transition: background-color var(--unified-fast) var(--unified-ease), border-color var(--unified-fast) var(--unified-ease), color var(--unified-fast) var(--unified-ease), opacity var(--unified-fast) var(--unified-ease), transform var(--unified-fast) var(--unified-ease) !important;
  }
}
@media (max-width: 430px) {
  #today, #changes, #breaks, #chat, #roster {
    padding-inline: max(10px, var(--app-safe-left, 0px), var(--app-safe-right, 0px)) !important;
  }
  #today .dateNav.rosterDateControl input[type="date"],
  #changes .nightContextPanel .dateNav.rosterDateControl input[type="date"],
  #breaks .nightContextPanel .dateNav.rosterDateControl input[type="date"] {
    overflow: hidden !important;
    text-overflow: ellipsis !important;
    white-space: nowrap !important;
  }
}
@media (prefers-contrast: more) {
  #today .nightDateShell,
  #changes .changesDatePanel,
  #breaks .breaksContextPanel,
  #today #personalNightCard > .personalHeroSurface,
  #today .nightSignalPrimary,
  #today .nightTeamDetails,
  #changes .workflowGuidance,
  #changes .staffingSection,
  #breaks .breakScheduleBoard,
  #chat .chatInboxTeamRow,
  #chat .chatConversationList,
  .quickActionsContextBar,
  .quickPrimaryAction,
  .quickReviewAction,
  .quickCompactAction,
  .personalisationGroup,
  .accountGroup { border-color: currentColor !important; }
}
'''
unified_path.write_text(unified + '\n')

tailwind_path = Path('src/tailwind.css')
tailwind = tailwind_path.read_text()
tailwind = tailwind.replace('\n@import "./product-coherence.css";\n', '\n')
tailwind = tailwind.replace('\n@import "./product-coherence-bridge.css";\n', '\n')
tailwind = re.sub(r'/\* 48\.0 simple coherent system[\s\S]*?\*/\n@import "\./product-unified\.css";', '/* 49.0 single product-wide presentation authority. */\n@import "./product-unified.css";', tailwind)
tailwind_path.write_text(tailwind)

design_path = Path('docs/DESIGN_SYSTEM.md')
design = design_path.read_text()
design = design.replace('The current product-coherence tokens use the 4, 8, 12, 16, 24 and 32 pixel spacing rhythm, 14 pixel control radius, 20 pixel content-card radius and 28 pixel hero radius. Ordinary transitions should use the shared 180 to 240 millisecond motion range.', 'The active product system uses a 6, 10, 14, 18 and 24 pixel spacing rhythm, 12 to 15 pixel control radii and a 20 pixel content-card radius. Ordinary transitions use the shared 180 to 240 millisecond motion range. These values are owned by `product-unified.css`, so new screens should consume the same tokens rather than introduce another local scale.')
start = design.find('## Cascade ownership')
end = design.find('## Visibility state')
replacement = '''## Cascade ownership

The production cascade has one final product-wide presentation owner. Older compatibility layers may provide component internals, but they are not allowed to define a second competing coherence system.

- `styles.css` remains the compatibility base inside `@layer legacy-base`.
- `chat.css` remains the Chat fallback inside `@layer legacy-chat`.
- Historical presentation generations remain compatibility history and should continue shrinking.
- `account-admin-polish.css` owns account and administrator component internals.
- `rudder-navigation.css` owns low-level primary dock geometry.
- `product-polish.css` owns established safety-sensitive compatibility polish that has not yet been retired.
- `product-unified.css` is the single final product-wide presentation authority. It owns shared spacing, typography hierarchy, surfaces, radii, shift identity, live-state language, Actions presentation, navigation appearance, motion, focus treatment and small-phone adaptation across Night, Changes, Actions, Breaks, Chat, Account and Personalisation.
- `product-coherence.css`, `product-coherence-bridge.css` and `product-coherence-correction.css` are retained only as historical migration references and are not imported into the production cascade.

A new whole-app visual rule belongs in `product-unified.css`. A component-specific rule belongs in its owning component stylesheet. Do not create another final override stylesheet. If an older compatibility rule prevents the product system from taking effect, retire or demote that older rule rather than adding another coherence layer.

'''
if start != -1 and end != -1:
    design = design[:start] + replacement + design[end:]
design_path.write_text(design)

Path('tests/product-coherence.test.js').write_text(r'''const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const unified = read('src/product-unified.css');
const tailwind = read('src/tailwind.css');
const designSystem = read('docs/DESIGN_SYSTEM.md');
function includesAll(source, values, label) { for (const value of values) assert.ok(source.includes(value), `${label} is missing ${value}`); }
includesAll(tailwind, ['@import "./presentation.css";','@import "./account-admin-polish.css";','@import "./rudder-navigation.css";','@import "./product-polish.css";','@import "./product-unified.css";'], 'Production presentation cascade');
assert.ok(!tailwind.includes('@import "./product-coherence.css";'), 'historical coherence layer must not remain active');
assert.ok(!tailwind.includes('@import "./product-coherence-bridge.css";'), 'historical migration bridge must not remain active');
assert.ok(!tailwind.includes('@import "./product-coherence-correction.css";'), '47.0 corrective layer must stay retired');
assert.ok(tailwind.indexOf('@import "./product-unified.css";') > tailwind.indexOf('@import "./product-polish.css";'), 'product-unified.css must remain the final product authority');
includesAll(unified, ['--unified-content-width:','--unified-space-1:','--unified-radius-lg:','--unified-fast:','--unified-ease:','#today .nightUnifiedHero','#changes .changesDatePanel','#breaks .breaksContextPanel','#chat .chatRosterContext','.nightTeamIdentityContext','input[type="date"]::-webkit-datetime-edit','#changes .workflowSteps','#today #personalNightCard > .personalHeroSurface','#breaks .personalBreakSummary','#chat .chatInboxTeamRow','.quickActionsExperience','.bottom.reactTabs','#accountSheet','.personalisationGroup','.headerLiveChip',':focus-visible','@media (max-width: 430px)','@media (prefers-reduced-transparency: reduce)','@media (prefers-reduced-motion: reduce)','@media (prefers-contrast: more)'], 'Unified product contract');
assert.ok(!unified.includes('.hidden {'), 'product system must not redefine runtime visibility state');
assert.ok(!unified.includes('--liquid-critical:'), 'product system must not redefine clinical critical colour');
assert.ok(!unified.includes('--liquid-warning:'), 'product system must not redefine clinical warning colour');
assert.ok(!unified.includes('--liquid-success:'), 'product system must not redefine clinical success colour');
assert.ok((unified.match(/!important/g) || []).length <= 760, 'single final product authority override budget must remain bounded');
includesAll(designSystem, ['role tonight, their break, changes requiring attention, the team plan','`product-unified.css` is the single final product-wide presentation authority','Night → Changes → Actions → Breaks → Chat → Account','Do not create another final override stylesheet'], 'Design-system ownership');
console.log('unified product coherence contract tests passed');
''')

Path('tests/product-layout-contract.test.js').write_text(r'''const assert = require('node:assert/strict');
const fs = require('node:fs');
const css = fs.readFileSync('src/product-unified.css', 'utf8');
const tailwind = fs.readFileSync('src/tailwind.css', 'utf8');
const checks = [
  ['date controls use a three-column mobile-safe grid', 'grid-template-columns: 38px minmax(0, 1fr) 38px'],
  ['date fields cannot wrap vertically', 'white-space: nowrap !important'],
  ['WebKit date editing is explicitly bounded', '::-webkit-datetime-edit'],
  ['Night allocation remains a dedicated hero', '#today #personalNightCard > .personalHeroSurface'],
  ['Changes retains the three-step workflow rail', '#changes .workflowSteps'],
  ['Breaks combines personal summary and statistics', '#breaks .breakSummaryRow'],
  ['Chat promotes the team conversation', '#chat .chatInboxTeamRow'],
  ['Actions has product-system ownership', '.quickActionsExperience'],
  ['Account uses the product surface language', '.accountSheetHeader'],
  ['small-phone handling exists', '@media (max-width: 390px)'],
  ['broader compact-phone guard exists', '@media (max-width: 430px)']
];
for (const [label, needle] of checks) assert.ok(css.includes(needle), label);
assert.equal((tailwind.match(/product-(?:coherence|unified)[^";]*\.css/g) || []).length, 1, 'only one active product-wide coherence stylesheet may be imported');
console.log('coherent layout regression contract tests passed');
''')

pkg_path = Path('package.json')
pkg = json.loads(pkg_path.read_text())
for key in ['verify:fast', 'test']:
    if 'product-layout-contract.test.js' not in pkg['scripts'][key]:
        pkg['scripts'][key] = pkg['scripts'][key].replace('node tests/product-coherence.test.js', 'node tests/product-coherence.test.js && node tests/product-layout-contract.test.js')
pkg_path.write_text(json.dumps(pkg, indent=2) + '\n')

release_path = Path('release.json')
release = json.loads(release_path.read_text())
release.update({
    'version': '49.0',
    'date': '6 October 2026',
    'title': 'Consolidate Night Roster into one coherent product system',
    'summary': 'Removes competing coherence layers from the active cascade and makes one shared product system responsible for hierarchy, spacing, radii, surfaces, shift identity, live state, Actions, navigation, accessibility and compact-phone behaviour.',
    'changes': [
        'Makes product-unified.css the single final product-wide presentation authority and removes the older coherence and bridge files from the active cascade.',
        'Keeps one restrained header, one compact selected-night component and one dominant task surface per screen while preserving the dark personal Night allocation as the visual anchor.',
        'Standardises Actions, Account, Personalisation, live-state indicators, focus treatment and motion so they use the same spacing, radius and surface language as Night, Changes, Breaks and Chat.',
        'Strengthens Android and iPhone compact-phone guards so roster dates remain on one line and the bottom dock, shift identity and break summary keep stable geometry.',
        'Adds regression contracts that reject multiple active coherence stylesheets and protect the shared date, Night, Changes, Breaks, Chat, Actions and Account layout primitives.',
        'Preserves roster calculations, staffing rules, First and Second Part semantics, Malta and DST timing, authentication, database writes, clinical colours and guarded mutation paths.'
    ],
    'update_policy': 'normal'
})
release_path.write_text(json.dumps(release, indent=2) + '\n')
