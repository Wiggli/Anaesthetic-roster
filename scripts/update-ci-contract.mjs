import fs from 'node:fs';

const path = 'tests/roster.test.js';
let source = fs.readFileSync(path, 'utf8');
const oldAssertion = "assert.match(workflow, /github\\.event_name == 'pull_request'[\\s\\S]*--project=low-end-chromium[\\s\\S]*github\\.event_name != 'pull_request'[\\s\\S]*chromium webkit/, 'pull requests must use Chromium resilience while release and scheduled runs retain WebKit coverage');";
const newAssertions = `assert.match(workflow, /verification-context:[\\s\\S]*exact merged tree[\\s\\S]*check\\.name === 'test'[\\s\\S]*check\\.conclusion === 'success'/, 'main may reuse PR verification only when GitHub proves the exact merged tree passed the required test gate');\nassert.match(workflow, /browser-resilience:[\\s\\S]*Run full resilience including iPhone WebKit[\\s\\S]*verify:resilience/, 'pull requests and fallback release verification must retain full Chromium and WebKit resilience coverage');`;
if (!source.includes(oldAssertion)) throw new Error('Old browser resilience contract assertion was not found');
source = source.replace(oldAssertion, newAssertions);
fs.writeFileSync(path, source);
console.log('Updated roster deployment safety contract.');
