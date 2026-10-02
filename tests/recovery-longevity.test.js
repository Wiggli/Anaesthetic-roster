const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const migration = fs.readFileSync(path.join(root, 'supabase', 'migrations', '20261002193000_recovery_longevity_v50.sql'), 'utf8');
const runtime = fs.readFileSync(path.join(root, 'runtime-foundation.js'), 'utf8');
const ui = fs.readFileSync(path.join(root, 'app-ui.js'), 'utf8');
const core = fs.readFileSync(path.join(root, 'app-core.js'), 'utf8');
const worker = fs.readFileSync(path.join(root, 'service-worker.js'), 'utf8');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');

assert.match(migration, /create table if not exists public\.roster_audit_events[\s\S]*enable row level security/i,
  'durable audit storage must be RLS protected');
assert.match(migration, /revoke all privileges on table public\.roster_audit_events from public,anon,authenticated/i,
  'audit storage must begin from a deny-by-default privilege boundary');
assert.match(migration, /grant select on table public\.roster_audit_events to authenticated[\s\S]*create policy "Admins can view roster audit events"[\s\S]*is_roster_admin/i,
  'audit reads must be restricted to administrators by RLS');
assert.match(migration, /before_value jsonb[\s\S]*after_value jsonb/,
  'audit events must preserve server-observed before and after values');
assert.match(migration, /operation_id uuid[\s\S]*actor_user_id uuid[\s\S]*actor_display_name text/,
  'audit events must correlate immutable operations with server-derived actors');
assert.match(migration, /create or replace function public\.night_history_page_v50[\s\S]*\(changed_at,event_id\)</,
  'night history must use stable keyset pagination');
assert.match(migration, /created_at < now\(\)-interval '90 days'/,
  'idempotency operation retention must be bounded');
assert.match(migration, /create or replace function public\.check_roster_invariants_v50/,
  'database invariants must be queryable without mutating roster data');
assert.match(migration, /create or replace function public\.app_health_canary_v50/,
  'a non-mutating health canary must be available');
assert.match(migration, /perform set_config\('app\.operation_id'/,
  'the operation id must flow into server-side audit triggers');
assert.match(migration, /revoke all on function public\.claim_roster_operation_v48\(uuid,text,date,bigint\)[\s\S]*from public,anon,authenticated/i,
  'the low-level idempotency claim helper must remain private to trusted server roles');
assert.doesNotMatch(migration, /grant execute on function public\.claim_roster_operation_v48\(uuid,text,date,bigint\)\s+to authenticated/i,
  'browser roles must not regain direct access to the idempotency claim helper');

assert.match(runtime, /RECOVERY_THRESHOLD=3/, 'three failed launches must trigger crash-loop protection');
assert.match(runtime, /SAFE_MODE_MS=15\*60\*1000/, 'safe mode must be time bounded');
assert.match(runtime, /SNAPSHOT_MAX_BYTES=768\*1024/, 'offline snapshots must have a hard size ceiling');
assert.match(runtime, /indexedDB\.open\(SNAPSHOT_DB,1\)/, 'durable snapshots must use IndexedDB');
assert.match(runtime, /hash:'fnv1a-'/, 'snapshot envelopes must carry an integrity hash');
assert.match(runtime, /latency:\{record:recordLatency,measure:measureLatency,summary:latencySummary\}/,
  'critical-path latency must have one bounded runtime tracker');

assert.match(ui, /night_history_page_v50/, 'the Changes screen must use the paginated history feed on schema 50');
assert.match(ui, /primeOfflineSnapshotFromIndexedDb/, 'startup must recover the newest valid atomic snapshot');
assert.match(ui, /verifyAndRepairAppShell/, 'the client must verify and repair its active cached shell');
assert.match(ui, /runtimeSafeMode/, 'crash-loop recovery must enter an explicit reduced-risk mode');
assert.match(core, /app_health_canary_v50/, 'administrator health checks must exercise the server canary');
assert.match(core, /admin_audit_timeline_v50/, 'administrator UI must read the immutable audit timeline');
assert.match(html, /id="adminAuditTimeline"/, 'administrator overview must expose the audit timeline');

assert.match(worker, /VERIFY_CACHE/, 'the active service worker must support non-destructive cache verification');
assert.match(worker, /REPAIR_CACHE/, 'the active service worker must repair missing shell entries');
assert.match(worker, /event\.data\.type === 'ACTIVATE_UPDATE'\) self\.skipWaiting\(\)/,
  'waiting updates must still require explicit activation');
assert.doesNotMatch(worker, /addEventListener\('install'[\s\S]{0,300}skipWaiting\(/,
  'install must not silently activate a waiting update');

console.log('Recovery, longevity, audit, pagination and cache-repair contracts passed.');
