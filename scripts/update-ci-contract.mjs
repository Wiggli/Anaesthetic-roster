import fs from 'node:fs';

const rosterPath = 'tests/roster.test.js';
let roster = fs.readFileSync(rosterPath, 'utf8');
const oldRosterAssertion = "assert.match(workflow, /github\\.event_name == 'pull_request'[\\s\\S]*--project=low-end-chromium[\\s\\S]*github\\.event_name != 'pull_request'[\\s\\S]*chromium webkit/, 'pull requests must use Chromium resilience while release and scheduled runs retain WebKit coverage');";
const newRosterAssertions = `assert.match(workflow, /verification-context:[\\s\\S]*exact merged tree[\\s\\S]*check\\.name === 'test'[\\s\\S]*check\\.conclusion === 'success'/, 'main may reuse PR verification only when GitHub proves the exact merged tree passed the required test gate');\nassert.match(workflow, /browser-resilience:[\\s\\S]*Run full resilience including iPhone WebKit[\\s\\S]*verify:resilience/, 'pull requests and fallback release verification must retain full Chromium and WebKit resilience coverage');`;
if (!roster.includes(oldRosterAssertion)) throw new Error('Old roster browser resilience contract assertion was not found');
roster = roster.replace(oldRosterAssertion, newRosterAssertions);
fs.writeFileSync(rosterPath, roster);

const developmentPath = 'tests/development-workflow.test.js';
let development = fs.readFileSync(developmentPath, 'utf8');
const replacements = [
  [
    "assert.match(workflow, /browser-smoke:[\\s\\S]*needs: build[\\s\\S]*actions\\/download-artifact@v4[\\s\\S]*name: pages-dist/,\n  'Chromium smoke must consume the exact built artifact');",
    "assert.match(workflow, /browser-smoke:[\\s\\S]*needs: \\[build, verification-context\\][\\s\\S]*actions\\/download-artifact@v4[\\s\\S]*name: pages-dist/,\n  'Chromium smoke must consume the exact built artifact whenever verification is not safely reused');"
  ],
  [
    "assert.match(workflow, /browser-resilience:[\\s\\S]*needs: build[\\s\\S]*actions\\/download-artifact@v4[\\s\\S]*name: pages-dist/,\n  'resilience verification must consume the exact built artifact');",
    "assert.match(workflow, /browser-resilience:[\\s\\S]*needs: \\[build, verification-context\\][\\s\\S]*actions\\/download-artifact@v4[\\s\\S]*name: pages-dist/,\n  'resilience verification must consume the exact built artifact whenever verification is not safely reused');"
  ],
  [
    "assert.match(workflow, /if: github\\.event_name == 'pull_request'[\\s\\S]*--project=low-end-chromium/,\n  'pull requests must use the focused low-end Chromium resilience project');",
    "assert.match(workflow, /browser-resilience:[\\s\\S]*Run full resilience including iPhone WebKit[\\s\\S]*verify:resilience/,\n  'pull requests must run the complete Chromium and iPhone WebKit resilience suite before merge');"
  ],
  [
    "assert.match(workflow, /if: github\\.event_name != 'pull_request'[\\s\\S]*install chromium webkit[\\s\\S]*verify:resilience/,\n  'main, manual and scheduled runs must retain full Chromium and WebKit resilience');",
    "assert.match(workflow, /verification-context:[\\s\\S]*reuse_pr_verification[\\s\\S]*check\\.name === 'test'[\\s\\S]*exactTree/,\n  'main may skip duplicate verification only after proving the merged tree exactly matches a PR that passed the required test');"
  ]
];
for (const [oldText, newText] of replacements) {
  if (!development.includes(oldText)) throw new Error(`Development workflow contract not found: ${oldText.slice(0, 80)}`);
  development = development.replace(oldText, newText);
}
fs.writeFileSync(developmentPath, development);
console.log('Updated deployment safety and development workflow contracts.');
