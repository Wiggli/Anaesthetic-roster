const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const clinical = fs.readFileSync(path.join(root, 'src', 'legacy-ui', 'clinical.js'), 'utf8');
const sharedPager = fs.readFileSync(path.join(root, 'src', 'shared-pager.ts'), 'utf8');
const migration = fs.readFileSync(path.join(root, 'supabase', 'migrations', '20261024161000_four_nurse_role_override.sql'), 'utf8');

assert.match(clinical, /FOUR_NIGHT_ROLE_KEYS=\['first1','first2','second1','second2'\]/, 'four-nurse mode must contain only the four theatre positions');
assert.match(clinical, /assignments\.mode==='4'/, 'role validation must recognise four-nurse mode');
assert.match(clinical, /Four-nurse theatre choices stay explicit; never auto-fill the vacant role/, 'four-nurse theatre vacancy must stay explicit');
const fourSuggestion = clinical.slice(clinical.indexOf('function suggestedFourRoleAssignments'), clinical.indexOf('function suggestedFiveRoleAssignments'));
assert.doesNotMatch(fourSuggestion, /var next=names\.find/, 'four-nurse theatre roles must never auto-fill the missing position');
assert.match(clinical, /working\.length===4/, 'four working nurses must open the night-only role editor');
assert.match(clinical, /customFour/, 'effective plan must apply the saved four-nurse theatre arrangement');
assert.match(clinical, /apply_night_role_override_v57/, 'four-nurse roles must save through the guarded v57 RPC');
assert.match(sharedPager, /override\?\.mode === '4'/, 'shared Pager must consume the saved four-nurse theatre arrangement');
assert.match(migration, /exactly one absence from the five-person team/i, 'server must keep the exception limited to one five-person absence');
assert.match(migration, /Each theatre position must have a different nurse/, 'server must prevent duplicate theatre assignments');
assert.match(migration, /Assignments must use only the four nurses working this night/, 'server must reject non-working names');

console.log('Four-nurse theatre reassignment contract verified.');

assert.match(sharedPager, /wait for the team to explicitly save the theatre reassignment/, 'shared Pager must wait for a saved theatre arrangement when a theatre nurse is absent');
const changesUi = fs.readFileSync(path.join(root, 'src', 'changes-experience.tsx'), 'utf8');
assert.match(changesUi, /Present tonight · \{model\.present\.length\} nurses/, 'four-nurse editor must show the nurses present tonight');
assert.match(changesUi, /<option value=\"\" disabled>Select nurse<\/option>/, 'vacant theatre select must show an explicit Select nurse placeholder');
