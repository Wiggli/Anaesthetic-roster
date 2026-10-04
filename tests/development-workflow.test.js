const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const packageJson = JSON.parse(read('package.json'));
const release = JSON.parse(read('release.json'));
const state = JSON.parse(read('.project-state.json'));
const workflow = read('.github/workflows/deploy-pages.yml');
const development = read('docs/DEVELOPMENT_WORKFLOW.md');
const current = read('docs/CURRENT_STATE.md');
const smokeConfig = read('playwright.config.js');
const resilienceConfig = read('playwright.resilience.config.js');

assert.equal(state.currentRelease, release.version, 'machine-readable project state must follow release.json');
assert.equal(state.databaseSchema, 53, 'project continuity state must expose the current expected database schema');
assert.equal(state.ci.requiredCheck, 'test', 'the protected CI check name must remain stable');
assert.equal(state.ci.cancelSupersededPullRequests, true, 'project state must record superseded PR cancellation');
assert.equal(state.ci.reuseTestedPagesArtifact, true, 'project state must record exact artifact reuse');

assert.ok(packageJson.scripts.context, 'developers need one concise project-context command');
assert.ok(packageJson.scripts['verify:fast'], 'developers need a fast inner-loop verification command');
assert.match(packageJson.scripts['verify:fast'], /generate:runtime[\s\S]*verify:release[\s\S]*tsc --noEmit[\s\S]*roster\.test\.js[\s\S]*vite build[\s\S]*build-artifact\.test\.js/,
  'fast verification must regenerate compatibility assets, protect core logic, typecheck and build once');
assert.doesNotMatch(packageJson.scripts.test, /generate:runtime/,
  'the full regression command must verify checked-in generated artifacts rather than silently regenerating stale files');
assert.doesNotMatch(packageJson.scripts['verify:release'], /node scripts\/generate-runtime\.mjs(?:\s|$)/,
  'release verification must check generated output without rewriting it');

assert.match(workflow, /build:[\s\S]*actions\/upload-artifact@v4[\s\S]*name: pages-dist/,
  'CI must build and preserve one deployable pages artifact');
assert.match(workflow, /regression:[\s\S]*run: npm test/,
  'deterministic regression must run independently of the build lane');
assert.match(workflow, /browser-smoke:[\s\S]*needs: build[\s\S]*actions\/download-artifact@v4[\s\S]*name: pages-dist/,
  'Chromium smoke must consume the exact built artifact');
assert.match(workflow, /browser-resilience:[\s\S]*needs: build[\s\S]*actions\/download-artifact@v4[\s\S]*name: pages-dist/,
  'resilience verification must consume the exact built artifact');
assert.doesNotMatch(workflow.slice(workflow.indexOf('  browser-smoke:'), workflow.indexOf('  browser-resilience:')), /npm run build/,
  'the Chromium browser lane must not rebuild the tested artifact');
assert.doesNotMatch(workflow.slice(workflow.indexOf('  browser-resilience:'), workflow.indexOf('  test:')), /npm run build/,
  'the resilience browser lane must not rebuild the tested artifact');
assert.match(workflow, /test:[\s\S]*needs: \[build, regression, browser-smoke, browser-resilience\]/,
  'the stable required test check must aggregate every verification lane');
assert.match(workflow, /group: \$\{\{ github\.workflow \}\}-\$\{\{ github\.event\.pull_request\.number \|\| github\.ref \}\}[\s\S]*cancel-in-progress: \$\{\{ github\.event_name == 'pull_request' \}\}/,
  'superseded PRs must cancel while main deployment work remains non-cancellable');
assert.match(workflow, /if: github\.event_name == 'pull_request'[\s\S]*--project=low-end-chromium/,
  'pull requests must use the focused low-end Chromium resilience project');
assert.match(workflow, /if: github\.event_name != 'pull_request'[\s\S]*install chromium webkit[\s\S]*verify:resilience/,
  'main, manual and scheduled runs must retain full Chromium and WebKit resilience');
assert.match(workflow, /schedule:[\s\S]*cron: '17 3 \* \* \*'/,
  'full compatibility verification must also run on a predictable schedule');
assert.match(workflow, /actions\/cache@v4[\s\S]*~\/\.cache\/ms-playwright/,
  'browser binaries should be cached between CI runs');

assert.match(development, /Fast inner loop[\s\S]*npm run verify:fast/,
  'the durable workflow guide must explain the fast path');
assert.match(development, /20, 40, 60, 90 and 120 second[\s\S]*no more than five routine status reads/,
  'the durable workflow guide must bound CI polling');
assert.match(development, /WebKit is intentionally not part of every pull-request iteration/,
  'the workflow guide must explain the browser split');
assert.match(current, /fast inner loop and a separate release gate/,
  'current-state continuity must record the optimised development model');
assert.match(smokeConfig, /workers:\s*process\.env\.CI \? 2 : 1/,
  'mobile and desktop Chromium smoke projects should run in parallel on CI');
assert.match(resilienceConfig, /workers:\s*process\.env\.CI \? 2 : 1/,
  'full release resilience browsers should run in parallel on CI while local runs remain conservative');

console.log('Optimised development workflow, continuity state and CI guardrails passed.');
