const assert = require('node:assert/strict');
const fs = require('node:fs');
const read = f => fs.readFileSync(f,'utf8');
const html=read('index.html'),workflow=read('src/changes-workflow.tsx'),account=read('src/legacy-ui/account.js'),context=read('src/selected-night.ts');
assert.match(html,/id="changesWorkflowExperience">\s*<div class="changesWorkflowTabs"[\s\S]*id="changesWorkflowState"[^>]*><\/div>\s*<\/div>/,'working fallback must occupy the same host React replaces');
assert.doesNotMatch(workflow,/fallback\?\.classList|legacyState\?\.classList/,'no separate duplicate fallback to hide');
assert.equal((html.match(/class="changesWorkflowTabs"/g)||[]).length,1);
assert.match(context,/composeSelectedNight/,'one selected-night layout composer');
assert.match(context,/panel.replaceChildren\(context\)/,'remove obsolete context wrappers');
assert.match(account,/outlet.replaceChildren\(target\)/,'one actual Account destination at a time');
assert.match(account,/accountPresentationPages/,'retain page DOM and unsaved state on Back');
assert.match(account,/key!=='home'/,'Done belongs only on Account home');
assert.match(account,/refreshPushSettings/,'Notifications refreshes the existing controls when opened');
assert.doesNotMatch(read('src/clinical-experience.tsx'),/Your break · \{model.formattedDate\}/,'date belongs in selected-night context');
assert.match(read('src/clinical-experience.tsx'),/className="timelineEnd"/,'timeline endpoint has its own layout anchor');
const sync=read('src/legacy-ui/sync.js');
assert.match(sync,/waitingWorkerIsRedundant\(\)/,'same-version waiting workers remain safely dismissed');
// Exercise the production sign-in/offline-resume shell, rather than bypassing it.
const vm=require('node:vm');
const shell=read('src/legacy-ui/foundation.js').match(/function prepareAuthorisedShell\(profile\)\{[\s\S]*?\n\}/)[0];
for(const user_role of ['member','admin']){
  const classes=()=>({add(){},remove(){},toggle(){}});
  const nodes=Object.fromEntries(['authGate','adminSettingsBtn','accountBtn','accountInitial'].map(id=>[id,{classList:classes()}]));
  const dock={style:{}};
  const sandbox={byId:id=>nodes[id],document:{body:{classList:classes()},querySelector:()=>dock},syncPrimaryHeaderActions(){}};
  vm.runInNewContext(shell,sandbox);
  sandbox.prepareAuthorisedShell({display_name:'Review Nurse',email:'review@example.test',user_role});
  assert.equal(dock.style.gridTemplateColumns,undefined,'sign-in must leave all five dock columns to the canonical stylesheet');
  assert.equal(sandbox.currentUserProfile.user_role,user_role);
}
console.log('Single workflow host, Account outlet, selected-night context, timeline endpoint and authorised dock contracts passed');

const dockCss=read('src/rudder-navigation.css');
assert.match(dockCss,/@keyframes operationalDockReveal[\s\S]*from \{ opacity: 0; transform: translate\(-50%,16px\); \} to \{ opacity: 1; transform: translate\(-50%,0\); \}/,'launch animation must preserve horizontal dock centring throughout');

// Safari pans its visual viewport independently when focusing a chat composer.
const viewportSource=read('src/legacy-ui/sync.js').match(/function setupViewportState\(\)\{[\s\S]*?\n\}/)[0];
const viewportProperties={},keyboardStates=[];
const viewportSandbox={
 window:{innerHeight:844,visualViewport:{height:460,offsetTop:80,addEventListener(){}},addEventListener(){}},
 document:{activeElement:{tagName:'TEXTAREA'},documentElement:{style:{setProperty:(key,value)=>viewportProperties[key]=value}},body:{classList:{toggle:(key,value)=>keyboardStates.push([key,value])}},addEventListener(){}},
 setTimeout:fn=>fn(),Math
};
vm.runInNewContext(viewportSource,viewportSandbox);viewportSandbox.setupViewportState();
assert.equal(viewportProperties['--app-viewport-height'],'460px');
assert.equal(viewportProperties['--app-viewport-offset-top'],'80px');
assert.equal(keyboardStates.at(-1)[1],true);
viewportSandbox.window.visualViewport.height=844;viewportSandbox.window.visualViewport.offsetTop=0;viewportSandbox.document.activeElement={tagName:'BODY'};viewportSandbox.setupViewportState();
assert.equal(viewportProperties['--app-viewport-offset-top'],'0px');assert.equal(keyboardStates.at(-1)[1],false);
