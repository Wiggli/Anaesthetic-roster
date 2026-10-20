const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const ui = fs.readFileSync(path.join(root, 'app-ui.js'), 'utf8');
const core = fs.readFileSync(path.join(root, 'app-core.js'), 'utf8');
const chat = fs.readFileSync(path.join(root, 'chat.js'), 'utf8');
const domain = fs.readFileSync(path.join(root, 'domain-logic.js'), 'utf8');
const migration = fs.readFileSync(path.join(root, 'supabase', 'migrations', '20261002120000_logic_foundation_v47.sql'), 'utf8');
const reliabilityMigration = fs.readFileSync(path.join(root, 'supabase', 'migrations', '20261002153000_reliability_architecture_v48.sql'), 'utf8');
const sw = fs.readFileSync(path.join(root, 'service-worker.js'), 'utf8');

assert.match(ui, /var nightSelectionMode='automatic'/, 'automatic and manual night selection must be explicit state');
assert.match(ui, /function resolveNightContext\(/, 'Night must have one shared context resolver');
assert.match(ui, /function buildNightPlan\(/, 'Night, Changes and Breaks must share a canonical NightPlan');
assert.match(ui, /renderChanges\(base,canonical\);renderRoster\(\);renderBreaks\(canonical\)/, 'render paths must receive the same selected-night model');
assert.match(ui, /function runRosterMutation\(/, 'shared clinical writes must use a single guarded mutation path');
assert.match(ui, /rosterCommandInFlight\[key\]/, 'duplicate in-flight commands must be collapsed');
assert.match(ui, /var rosterCommandInFlight=\{\};var rosterCommandIds=\{\};/, 'ambiguous retries must retain operation ids by command key');
assert.match(ui, /var commandId=rosterCommandIds\[key\]\|\|/, 'retrying the same ambiguous roster command must reuse its original operation id');
assert.match(ui, /verified-after-timeout/, 'ambiguous roster timeouts must be verified against refreshed shared state');
assert.match(ui, /incomingRevision<lastObservedSyncRevision/, 'an older shared snapshot must never replace newer state');
assert.match(ui, /sharedSyncState='starting'/, 'shared synchronization must have named state');
assert.match(ui, /noteCompatibilityStartup\(/, 'legacy startup fallbacks must be observable before retirement');
assert.match(ui, /anaes_compat_startup_count/, 'compatibility fallback usage must persist locally so retirement can be evidence-based');
assert.match(ui, /syncServerClock\(/, 'server time must be used as an online clock sanity check');
assert.match(core, /function rosterCapabilities\(/, 'database capabilities must be centralized');
assert.match(core, /EXPECTED_SCHEMA_VERSION = 57/, 'effective-dated establishment requires schema 55');
assert.match(core, /base\.trustBoundary=Number\(schemaVersion\|\|0\)>=49/, 'schema 49 must expose the Trust Boundary capability');
assert.match(domain, /snapshotIsExpired/, 'offline data must have an explicit retention bound');
assert.match(domain, /DIAG_LIMIT=30/, 'local diagnostics must be bounded');
assert.doesNotMatch(domain, /email|nurse|message body|roster_date/i, 'diagnostic foundation must not encode roster or identity fields');

assert.match(migration, /chat_messages_sender_client_message_uq[\s\S]*sender_id,client_message_id/, 'database must deduplicate retried sends');
assert.match(migration, /chat_send_message_v47[\s\S]*unique_violation[\s\S]*client_message_id/, 'send RPC must return the original message after a retry race');
assert.match(chat, /chatRetryFailed\(message,kind\)[\s\S]*message\.client_message_id/, 'client Retry must reuse the same idempotency key');
assert.match(migration, /chat_mark_read_v47[\s\S]*greatest\(/, 'read cursor must be monotonic on the server');
assert.match(chat, /Math\.max\(current,target\)/, 'read cursor must also be monotonic in client state');

assert.match(ui, /p_expected_revision:expectedRevision/, 'night finalisation must retain optimistic revision protection');
assert.match(ui, /changed on another device\|revision conflict/, 'stale multi-device finalisation must require review');
assert.match(sw, /ACTIVATE_UPDATE/, 'updates must still require explicit activation');
assert.match(ui, /verifyRuntimeHealth\(/, 'post-update runtime versions must be checked');
assert.match(ui, /shadowNightPlanCheck\(canonical\)/, 'canonical night plans must be shadow-checked against the legacy calculation path during migration');

assert.match(reliabilityMigration, /roster_operation_log[\s\S]*operation_id uuid primary key/, 'roster commands must be database-idempotent');
assert.match(reliabilityMigration, /assert_roster_fresh_v48/, 'shared writes must reject stale revisions');

console.log('Multi-device, mutation retry, idempotency and update-health contracts passed.');

async function checkSharedRecoveryBehaviour() {
  const app = require('./helpers/roster-context');
  const user = { id: 'recovery-user', email: 'recovery@example.test' };
  const profile = { email: user.email, active: true, user_role: 'member' };
  const date = '2026-10-20';
  const originalSettings = app.rosterSettings;
  const originalVersions = app.rotationVersions;
  const loadSharedData = app.loadSharedData;
  const ensureFreshBeforeMutation = app.ensureFreshBeforeMutation;
  app.rebuildCalculatedRoster();
  const snapshot = (revision = 10) => ({
    profile, sync_revision: revision, access_epoch: 1, schema_version: 56,
    night_changes: [], night_overtime: [], night_five_cover: [],
    night_labour_order: [], night_plan_status: [], night_role_overrides: [],
    roster_settings: originalSettings, rotation_versions: originalVersions,
    compatibility: { write_allowed: true, write_status: 'allowed' }
  });
  app.console = { ...console, error() {}, warn() {} };
  app.setLaunchState = app.prepareAuthorisedShell = app.renderDiagnostics = app.render = app.updateOfflineControls = () => {};
  app.setSharedSyncState = (state) => { app.sharedSyncState = state; };
  app.setAppCompatibility = value => { app.appCompatibility = value; };
  app.syncServerClock = app.refreshShiftAvatar = async () => {};
  app.preferCompatibilityStartup = () => false;
  app.cachedAllowedProfile = () => profile;
  app.saveOfflineSnapshot = () => {};
  app.restoreOfflineSnapshot = () => { throw new Error('A refresh must not roll back an already loaded roster to disk'); };

  assert.equal(app.mutationDateFromKey('absence:add:' + date + ':Andre'), date, 'conflict recovery must identify the night in a mutation key');
  assert.equal(app.mutationDateFromKey('plan:finalise:' + date + ':3'), date);
  assert.equal(app.mutationDateFromKey('account:access'), null);

  function reset() {
    app.currentUser = user; app.currentUserProfile = profile; app.startupAttempt = 1;
    app.sharedLoadPromise = null; app.sharedReloadPending = false;
    app.lastObservedSyncRevision = 10; app.lastObservedAccessEpoch = 1;
    app.lastSuccessfulSyncAt = new Date().toISOString();
    app.sharedSyncState = 'live'; app.forcedOfflineSession = false;
    app.nightChanges = { [date]: [{ id: 'current-absence', absent_name: 'Andre' }] };
    app.nightOvertime = { [date]: [{ id: 'current-overtime', nurse_name: 'Example Nurse' }] };
    app.rosterSettings = originalSettings; app.rotationVersions = originalVersions;
    app.appCompatibility = { write_allowed: false, write_status: 'maintenance' };
  }
  for (const invalid of [
    snapshot(9), snapshot('not-a-revision'), snapshot(-1), snapshot(10.5),
    { ...snapshot(), night_overtime: null }, { ...snapshot(), night_changes: undefined },
    { ...snapshot(), night_role_overrides: {} }
  ]) {
    reset();
    const before = JSON.stringify([app.nightChanges, app.nightOvertime, app.appCompatibility]);
    app.requestStartupWithSessionRecovery = async () => invalid;
    await loadSharedData({ background: true });
    assert.equal(JSON.stringify([app.nightChanges, app.nightOvertime, app.appCompatibility]), before, 'rejected snapshots must not replace any shared state');
    assert.equal(app.lastObservedSyncRevision, 10, 'rejected snapshots must not advance or roll back the revision');
    assert.equal(app.forcedOfflineSession, true, 'the last loaded roster must remain read-only after a failed refresh');
  }

  reset();
  const fresh = snapshot(11);
  fresh.night_overtime = [{ id: 'new-overtime', roster_date: date, nurse_name: 'Another Nurse' }];
  app.requestStartupWithSessionRecovery = async () => fresh;
  assert.equal(await loadSharedData({ background: true }), true);
  assert.equal(app.lastObservedSyncRevision, 11);
  assert.equal(app.nightOvertime[date][0].id, 'new-overtime', 'a valid newer snapshot must replace the roster');
  assert.equal(app.forcedOfflineSession, false);

  for (const revoked of [false, true]) {
    reset();
    let resolveSnapshot;
    app.requestStartupWithSessionRecovery = () => new Promise(resolve => { resolveSnapshot = resolve; });
    const pending = loadSharedData({ background: true });
    app.startupAttempt += 1;
    if (!revoked) app.currentUser = null;
    app.currentUserProfile = null; app.nightChanges = {}; app.nightOvertime = {};
    resolveSnapshot(snapshot(12));
    assert.equal(await pending, false, 'an invalidated session must discard its in-flight snapshot');
    assert.equal(app.currentUserProfile, null, 'sign-out or revocation must not restore an account from a late response');
    assert.equal(Object.keys(app.nightOvertime).length, 0, 'a late response must not restore cleared private roster data');
  }

  // A timeout is not success merely because stale or offline data already matches.
  for (const refresh of [false, true]) {
    reset();
    app.rosterCapabilities = () => ({ freshnessBarrier: false });
    app.timedRequest = request => Promise.resolve(request);
    app.loadSharedData = async () => { app.forcedOfflineSession = refresh; return refresh; };
    let verified = 0;
    const execute = async () => { throw new Error('timeout'); };
    await assert.rejects(app.runRosterMutation('absence:add:' + date + ':Andre', execute, () => { verified += 1; return true; }), /timeout/);
    assert.equal(verified, 0, 'failed or offline refreshes cannot verify a committed mutation');
    assert.ok(app.rosterCommandIds['absence:add:' + date + ':Andre'], 'an ambiguous retry must retain its operation ID');
  }
  reset();
  app.loadSharedData = async () => { app.sharedSyncState = 'live'; return true; };
  const recovered = await app.runRosterMutation('absence:add:' + date + ':Andre', async () => { throw new Error('timeout'); }, () => true);
  assert.equal(recovered.recovered, true, 'a successful online refresh may verify the requested result');
  assert.equal(app.rosterCommandIds['absence:add:' + date + ':Andre'], undefined);

  for (const onlineRefresh of [false, true]) {
    reset();
    app.conflictPlanSnapshot = affectedDate => affectedDate === date ? { effective: { pager: app.lastObservedSyncRevision === 10 ? 'Andre' : 'James' } } : null;
    app.loadSharedData = async () => {
      if (onlineRefresh) app.lastObservedSyncRevision = 11;
      else app.forcedOfflineSession = true;
      return true;
    };
    const conflict = await app.runRosterMutation('plan:finalise:' + date + ':0', async () => ({ error: { code: 'ROSTER_REVISION_CONFLICT' } }));
    assert.equal(conflict.conflictRefreshFailed, !onlineRefresh);
    if (onlineRefresh) {
      assert.equal(conflict.conflictChanges[0].label, 'Pager');
      assert.equal(conflict.conflictChanges[0].before, 'Andre');
      assert.equal(conflict.conflictChanges[0].after, 'James', 'the conflict message must describe the changed night');
    } else {
      assert.equal(conflict.conflictChanges.length, 0);
      assert.match(app.conflictNotice(conflict), /could not be loaded/, 'failed conflict recovery must not claim the latest roster was loaded');
    }
  }

  reset();
  app.rosterCapabilities = () => ({ freshnessBarrier: true });
  app.supa = { from() { const query = { select() { return query; }, eq() { return query; }, maybeSingle: async () => ({ data: { revision: 11 } }) }; return query; } };
  app.loadSharedData = async () => { app.forcedOfflineSession = true; return true; };
  const barrier = await ensureFreshBeforeMutation();
  assert.equal(barrier.ok, false);
  assert.equal(barrier.conflictRefreshFailed, true, 'pre-save freshness conflicts must also identify failed refreshes');
  console.log('Snapshot rejection, session invalidation and timeout recovery behavioural checks passed.');
}

checkSharedRecoveryBehaviour().catch(error => { console.error(error); process.exitCode = 1; });
