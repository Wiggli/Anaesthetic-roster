const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root=path.join(__dirname,'..');
const ui=fs.readFileSync(path.join(root,'app-ui.js'),'utf8');
const core=fs.readFileSync(path.join(root,'app-core.js'),'utf8');
const runtime=fs.readFileSync(path.join(root,'runtime-foundation.js'),'utf8');
const migration=fs.readFileSync(path.join(root,'supabase','migrations','20261002153000_reliability_architecture_v48.sql'),'utf8');
const sw=fs.readFileSync(path.join(root,'service-worker.js'),'utf8');

assert.match(runtime,/StateMachine\('sync','starting'/,'sync state must be explicit');
assert.match(runtime,/StateMachine\('night','automatic-next'/,'night selection state must be explicit');
assert.match(runtime,/BroadcastChannel\('anaesthetic-roster-runtime-v1'\)/,'tabs must coordinate locally');
assert.match(runtime,/LEADER_TTL=12000/,'tab leadership must expire');
assert.match(runtime,/roster:tab-leader/,'leadership changes must be broadcast locally so duplicate realtime owners can stand down');
assert.match(runtime,/schedulerEvery/,'recurring work must use a central scheduler');
assert.match(runtime,/typeof job\.interval==='function'/,'scheduler cadence must support adaptive intervals');
assert.match(runtime,/setResumeHandler/,'resume work must have one lifecycle entry point');
assert.match(runtime,/rtt>4000/,'unreliable clock samples must be rejected');
assert.match(runtime,/shadowCompare/,'shadow comparison infrastructure must exist');
assert.match(runtime,/STORAGE_PREFIX='anaes_'/,'device storage must use one facade');

assert.match(ui,/async function reconcileApplication\(reason\)[\s\S]*getSession[\s\S]*syncServerClock[\s\S]*checkSharedRevision[\s\S]*refreshAutomaticNightOnReturn[\s\S]*subscribeToChanges[\s\S]*verifyRuntimeHealth/,
  'resume reconciliation must validate session, clock, revision, night, realtime and worker health in one sequence');
assert.match(ui,/ensureFreshBeforeMutation\(\)/,'mutations must perform a freshness barrier');
assert.match(ui,/execute\(commandId,expectedSyncRevision\)/,'every guarded mutation must receive a stable operation id and expected revision');
assert.match(ui,/verified-after-timeout/,'ambiguous responses must still be verified after refresh');
assert.match(ui,/rosterCommandIds\[key\]/,'ambiguous roster retries must reuse their original command id');
assert.match(ui,/realtimeSubscribed&&sharedSyncState==='live'\?60000:15000/,'revision polling must back off while realtime is healthy');
assert.match(ui,/shadowNightPlanCheck/,'night plan shadow comparison must run before retiring legacy calculation paths');
assert.match(ui,/anaes_compat_startup_count/,'compatibility fallback use must be measured before removal');
assert.match(ui,/coordinator\.isLeader\(\)/,'roster realtime must be single-leader across local tabs');
assert.match(ui,/roster:peer-revision/,'follower tabs must react to leader revision broadcasts');
assert.match(ui,/roster:tab-leader[\s\S]*removeChannel\(changesChannel\)[\s\S]*subscribeToChanges\(\)/,'tabs that lose leadership must close roster realtime and new leaders must take ownership');
assert.match(ui,/function sharedTransportLive\(\)[\s\S]*!window\.AnaestheticRuntime\.coordinator\.isLeader\(\)/,'a coordinated follower tab must be reported as live without owning a duplicate realtime socket');
assert.doesNotMatch(ui,/offline mutation queue|pending offline mutation|flushOffline/i,'clinical writes must not be queued for later offline replay');

for(const rpc of [
  'record_night_absence_v48','remove_night_absence_v48','add_night_overtime_v48','remove_night_overtime_v48',
  'apply_staffing_allocations_v48','finalise_night_plan_v48','apply_night_role_override_v48'
]) assert.match(ui,new RegExp(rpc),'browser must use '+rpc);

assert.match(core,/publish_roster_v48/,'publication must use the idempotent server command');
assert.match(core,/upsert_rotation_version_v48/,'permanent team changes must use the idempotent server command');
assert.match(core,/EXPECTED_SCHEMA_VERSION = 48/,'schema 48 must be required');

assert.match(migration,/create table if not exists public\.roster_operation_log/,'database must retain operation ids');
assert.match(migration,/operation_id uuid primary key/,'operation ids must be unique');
assert.match(migration,/assert_roster_fresh_v48/,'database must reject stale clients');
assert.match(migration,/validate_night_plan_v48/,'final confirmation must have a server validation gate');
assert.match(migration,/count\(distinct value\)/,'server validation must reject duplicate overtime assignments');
assert.match(migration,/count\(distinct lower\(trim\(o\.nurse_name\)\)\)/,'server validation must reject duplicate overtime identities');
assert.match(migration,/ROTATION_VERSION_EXISTS/,'permanent versions must not silently overwrite an existing effective date');
assert.match(migration,/claim_roster_operation_v48\(p_operation_id,'rotation-version'[\s\S]*ROTATION_VERSION_EXISTS/,'a retried permanent rotation command must be recognized before duplicate-date rejection');
assert.match(migration,/roster_operation_log[\s\S]*operation_type='absence-remove'[\s\S]*claim_roster_operation_v48\(p_operation_id,'absence-remove'/,'absence removal retries must recover their original night from the operation ledger');
assert.match(migration,/roster_operation_log[\s\S]*operation_type='overtime-remove'[\s\S]*claim_roster_operation_v48\(p_operation_id,'overtime-remove'/,'overtime removal retries must recover their original night from the operation ledger');
assert.match(migration,/PUBLISH_REGRESSION/,'publishing must not shorten the published roster');
assert.match(migration,/mod\(\(p_published_until-date '2026-06-30'\),4\)/,'publication must stay on the verified four-day cadence');
assert.match(migration,/p_change_id uuid/,'absence identifiers must match the live UUID schema');
assert.match(migration,/p_overtime_id uuid/,'overtime identifiers must match the live UUID schema');

assert.match(sw,/ACTIVATE_UPDATE/,'service worker activation must remain explicitly user-approved');

console.log('Chaos, stale-client, multi-tab and idempotent-command contracts passed.');
