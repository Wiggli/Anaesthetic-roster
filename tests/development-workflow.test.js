const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const packageJson = JSON.parse(read('package.json'));
const release = JSON.parse(read('release.json'));
const state = JSON.parse(read('.project-state.json'));
const workflow = read('.github/workflows/deploy-pages.yml');
const compatibility = read('.github/workflows/compatibility.yml');
const development = read('docs/DEVELOPMENT_WORKFLOW.md');
const current = read('docs/CURRENT_STATE.md');
const smokeConfig = read('playwright.config.js');
const resilienceConfig = read('playwright.resilience.config.js');
const nvmrc = read('.nvmrc').trim();

assert.equal(state.currentRelease, release.version, 'machine-readable project state must follow release.json');
assert.equal(state.databaseSchema, 53, 'project continuity state must expose the current expected database schema');
assert.equal(state.ci.requiredCheck, 'test', 'the protected CI check name must remain stable');
assert.equal(state.ci.cancelSupersededPullRequests, true, 'project state must record superseded PR cancellation');
assert.equal(state.ci.reuseTestedPagesArtifact, true, 'project state must record exact artifact reuse');
assert.equal(state.ci.routineBrowserGate, false, 'routine merges must not depend on the expensive compatibility suite');
assert.equal(state.ci.nightlyCompatibilityRun, true, 'browser compatibility must still run on a schedule');

assert.equal(packageJson.engines.node, '22.x', 'local package metadata must pin the same Node major as CI');
assert.equal(nvmrc, '22', '.nvmrc must pin Node 22 for local development');
assert.ok(packageJson.scripts.context, 'developers need one concise project-context command');
assert.ok(packageJson.scripts['verify:fast'], 'developers need a fast inner-loop verification command');
assert.ok(packageJson.scripts['verify:ci'], 'developers and CI need one deterministic release-gate command');
assert.match(packageJson.scripts['verify:fast'], /generate:runtime[\s\S]*verify:release[\s\S]*tsc --noEmit[\s\S]*roster\.test\.js[\s\S]*vite build[\s\S]*build-artifact\.test\.js/,
  'fast verification must regenerate compatibility assets, protect core logic, typecheck and build once');
assert.match(packageJson.scripts['verify:ci'], /npm test[\s\S]*tsc --noEmit[\s\S]*vite build[\s\S]*verify:build/,
  'the CI gate must run the full deterministic suite, typecheck and build once');
assert.doesNotMatch(packageJson.scripts.test, /generate:runtime/,
  'the full regression command must verify checked-in generated artifacts rather than silently regenerating stale files');
assert.doesNotMatch(packageJson.scripts['verify:release'], /node scripts\/generate-runtime\.mjs(?:\s|$)/,
  'release verification must check generated output without rewriting it');

assert.match(workflow, /test:[\s\S]*run: npm run verify:ci[\s\S]*actions\/upload-artifact@v4[\s\S]*name: pages-dist/,
  'routine CI must use one deterministic test job that preserves one deployable Pages artifact');
assert.match(workflow, /migrate:[\s\S]*needs: test/,
  'database deployment must remain behind the deterministic test gate');
assert.match(workflow, /deploy:[\s\S]*needs: migrate[\s\S]*actions\/download-artifact@v4[\s\S]*name: pages-dist/,
  'production must deploy the exact artifact created by the test job');
assert.match(workflow, /group: \$\{\{ github\.workflow \}\}-\$\{\{ github\.event\.pull_request\.number \|\| github\.ref \}\}[\s\S]*cancel-in-progress: \$\{\{ github\.event_name == 'pull_request' \}\}/,
  'superseded PRs must cancel while main deployment work remains non-cancellable');
assert.doesNotMatch(workflow, /browser-smoke:|browser-resilience:|actions\/github-script|schedule:/,
  'routine test and deploy workflow must not carry browser orchestration, PR result reuse or scheduled compatibility work');

assert.match(compatibility, /schedule:[\s\S]*cron: '17 3 \* \* \*'/,
  'browser compatibility must run on the established predictable schedule');
assert.match(compatibility, /npm run verify:ci[\s\S]*playwright install --with-deps chromium webkit[\s\S]*npm run verify:browser[\s\S]*npm run verify:resilience/,
  'scheduled compatibility must validate the release tree and retain Chromium and WebKit coverage');
assert.match(compatibility, /actions\/cache@v4[\s\S]*~\/\.cache\/ms-playwright/,
  'browser binaries should be cached between compatibility runs');

assert.match(development, /Fast inner loop[\s\S]*npm run verify:fast/,
  'the durable workflow guide must explain the fast path');
assert.match(development, /Single release gate[\s\S]*npm run verify:ci/,
  'the durable workflow guide must explain the single release gate');
assert.match(development, /Browser compatibility[\s\S]*nightly/,
  'the workflow guide must explain that expensive browser coverage is separated from routine merges');
assert.match(development, /20, 40, 60, 90 and 120 second[\s\S]*no more than five routine status reads/,
  'the durable workflow guide must bound CI polling');
assert.match(current, /single deterministic release gate/,
  'current-state continuity must record the simplified development model');
assert.match(smokeConfig, /workers:\s*process\.env\.CI \? 2 : 1/,
  'browser smoke projects should still run in parallel on CI');
assert.match(resilienceConfig, /workers:\s*process\.env\.CI \? 2 : 1/,
  'full resilience browsers should still run in parallel on CI while local runs remain conservative');

console.log('Simplified development workflow, continuity state and CI guardrails passed.');
