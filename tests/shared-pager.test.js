const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'src', 'shared-pager.ts'), 'utf8');
const css = fs.readFileSync(path.join(root, 'src', 'shared-pager.css'), 'utf8');
const selectedNight = fs.readFileSync(path.join(root, 'src', 'selected-night.ts'), 'utf8');
const migration = fs.readFileSync(path.join(root, 'supabase', 'migrations', '20261024153714_shared_pager_four_nurse.sql'), 'utf8');

assert.match(selectedNight, /import '\.\/shared-pager';/, 'selected-night shell must load the shared Pager feature');
assert.match(source, /count.*4|!== 4/, 'shared Pager must remain limited to exactly four nurses');
assert.match(source, /mode === '5'/, 'frontend must support the current five-person establishment');
assert.match(source, /roles\[key\] = full/, 'the full-night Pager nurse must fill a vacant theatre role on a five-person base');
assert.match(source, /sameSet\(working, nurses\)/, 'the exception must match the actual four working nurses');
assert.match(source, /set_night_shared_pager_order_v56/, 'frontend must save through the guarded RPC');
assert.match(source, /Number\(timing\.endUtc\) - Number\(timing\.startUtc\)\) \/ 4/, 'Pager segments must use elapsed time rather than clock labels');
assert.match(source, /OLD.*NEW|OLD' : 'NEW'/, 'rollback labels must distinguish the repeated hour');
assert.match(source, /Copy plan/, 'shared effective plan must support copy');
assert.match(source, /Email plan/, 'shared effective plan must support email');
assert.match(source, /Select nurse/, 'unsaved shared Pager parts must show an explicit Select nurse placeholder');
assert.doesNotMatch(source, /stored\?\.nurse_order \|\| state\.nurses/, 'theatre order must never prefill a new shared Pager order');
assert.match(source, /savedOrder \|\| \['', '', '', ''\]/, 'a new shared Pager order must start with four unselected slots');
assert.match(source, /roster:night/, 'Night must consume the shared Pager plan');
assert.match(source, /roster:breaks/, 'Breaks must consume the shared Pager plan');
assert.match(source, /roster:full-roster/, 'Full roster must consume the shared Pager plan');
assert.match(css, /sharedPagerTrack/, 'hero must include the four-segment Pager progress track');

assert.match(migration, /cardinality\(nurse_order\)=4/, 'database must require four Pager names');
assert.match(migration, /v_mode not in \('5','6'\)/, 'server must support only verified five- and six-person bases');
assert.match(migration, /SHARED_PAGER_REQUIRES_ONE_FIVE_PERSON_ABSENCE/, 'five-person base must have exactly one absence for the four-nurse exception');
assert.match(migration, /v_expected\[1\]:=v_full_lw/, 'server must move full-night Pager into a vacant theatre slot');
assert.match(migration, /SHARED_PAGER_REQUIRES_PAGER_RELIEVER_ABSENCE/, 'six-person fallback must remain narrowly limited to Pager and Reliever vacancies');
assert.match(migration, /current_roster_actor_name_v49/, 'shared Pager saves must use server-derived actor identity');
assert.match(migration, /enable row level security/, 'shared Pager tables must use RLS');
assert.match(migration, /supabase_realtime/, 'shared Pager order must synchronise through Realtime');

console.log('Shared Pager four-nurse contract verified.');
