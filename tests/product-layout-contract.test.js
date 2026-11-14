const assert = require('node:assert/strict');
const fs = require('node:fs');
const read = f => fs.readFileSync(f,'utf8');
const html=read('index.html'),account=read('src/legacy-ui/account.js'),context=read('src/selected-night.ts');
assert.doesNotMatch(html,/data-changes-step=/,'Changes uses one continuous page');
assert.match(html,/id="changesStaffingPane"[\s\S]*id="changesAllocationPane"[\s\S]*id="changesConfirmPane"/,'staffing comes before cover and review');
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

// Exercise direction thresholds and bounce clamping independently of animation.
const dockModule={};
const dockScript=require('node:module').stripTypeScriptTypes(read('src/dock-scroll.ts')).replace(/^export /gm,'');
vm.runInNewContext(dockScript,dockModule);
const advance=dockModule.nextDockScroll;
let dockState={y:0,travel:0,hidden:false};
dockState=advance(dockState,200,1000,false);assert.equal(dockState.hidden,true);
for(let y=199;y>=192;y--)dockState=advance(dockState,y,1000,false);
assert.equal(dockState.hidden,false,'a small deliberate upward scroll returns navigation');
for(const y of [193,192,193,192])dockState=advance(dockState,y,1000,false);
assert.equal(dockState.hidden,false,'direction jitter must not hide the bar');
dockState=advance(dockState,260,1000,false);assert.equal(dockState.hidden,true);
assert.equal(advance(dockState,280,1000,true).hidden,false,'chat, focus, editing and dialogs pin navigation');
assert.equal(advance(dockState,1100,1000,false).hidden,false,'page end and bottom bounce restore navigation');
assert.equal(advance(dockState,-30,1000,false).hidden,false,'top bounce restores navigation');
assert.equal(advance(dockState,80,80,false).hidden,false,'short screens need no hidden navigation');

// The staffing list stays available through every plan state and four-person cover cannot be shared.
const clinical=read('src/legacy-ui/clinical.js');
const workflow=clinical.match(/function updateChangesWorkflow\(base,plan\)\{[\s\S]*?\n\}/)[0];
const node=()=>{const classes=new Set();return{hidden:false,disabled:false,textContent:'',classes,classList:{toggle(name,force){if(force)classes.add(name);else classes.delete(name)},add(name){classes.add(name)}}}};
const controls=new Map();
const control=id=>{if(!controls.has(id))controls.set(id,node());return controls.get(id)};
const base={date:'2026-11-14'};
const plan={count:6,availableKeys:[]};
let tasks=[],needsShare=false,manual=false,pagerSaved=false;
const workflowContext={
 changesViewPrepared:true,byId:control,document:{querySelector:control},
 workflowTaskDetails:()=>tasks,workflowNeedsConfirmation:()=>needsShare,workflowHasManualPlan:()=>manual,
 fourNurseTheatreRoles:()=>true,window:{sharedPagerStatus:()=>({saved:pagerSaved})},
 nightPlanStatuses:{},allocationSaveInFlight:false,formMessage(){},renderConfirmationPreview(){},updateConfirmationControls(){}
};
vm.runInNewContext(workflow,workflowContext);
const update=()=>workflowContext.updateChangesWorkflow(base,plan);
update();
assert.equal(control('changesWorkflowExperience').hidden,true);
tasks=['Assign First Part'];needsShare=true;plan.availableKeys=['first1'];update();
assert.equal(control('continueToAllocationBtn').hidden,false);
assert.equal(control('continueToConfirmBtn').hidden,true);
assert.equal(control('#changesConfirmPane .confirmationCard').hidden,true);
tasks=[];update();
assert.equal(control('continueToAllocationBtn').hidden,true);
assert.equal(control('continueToConfirmBtn').hidden,false);
assert.equal(control('#changesConfirmPane .confirmationCard').hidden,false);
manual=true;needsShare=false;workflowContext.nightPlanStatuses[base.date]={published_at:'2026-11-14T21:00Z'};update();
assert.equal(control('confirmationStatus').textContent,'Plan shared');
plan.count=4;update();
assert.equal(control('continueToAllocationBtn').hidden,false);
assert.equal(control('continueToConfirmBtn').hidden,true);
assert.equal(control('#changesConfirmPane .confirmationCard').hidden,true);
assert.equal(control('confirmationStatus').classes.has('hidden'),true);
pagerSaved=true;update();
assert.equal(control('continueToAllocationBtn').hidden,true);
assert.match(control('changesWorkflowState').textContent,/provisional/);
assert.equal(controls.has('changesStaffingPane'),false,'next-action updates must leave the staffing section visible');

// Keep launch audio on by default, and only play once after a gesture.
(async () => {
  const script = require('node:module').stripTypeScriptTypes(read('src/opening-tune.ts')).replace(/^import .*\n/m, '').replace('export function', 'function');
  class Control {
    listeners = {};
    addEventListener(name, callback) { this.listeners[name] = callback; }
  }
  const toggle = new Control(), picker = new Control(), preview = new Control(), status = new Control();
  picker.querySelector = () => null;
  const elements = {openingTuneEnabled:toggle,openingTuneTrack:picker,openingTunePreview:preview,openingTuneStatus:status};
  const events = {}, stored = new Map(), sound = [];
  let ready = false, checkLaunch;
  const launch = {classList:{contains:()=>ready}};
  class Audio {
    state = 'suspended';
    async resume() { this.state = 'running'; }
    createGain() { return {gain:{setValueAtTime(){},linearRampToValueAtTime(){},exponentialRampToValueAtTime(){}}, connect(target){return target}, disconnect(){}}; }
    createOscillator() { return {frequency:{setValueAtTime:(value)=>sound.push(value),exponentialRampToValueAtTime(){}},connect(target){return target},start(){},stop(){}}; }
  }
  const activation = {hasBeenActive:false};
  const env = {
    window:{AudioContext:Audio,accountPresentationElement:id=>elements[id],setTimeout(){}},
    document:{visibilityState:'visible',getElementById:()=>launch,addEventListener:(name,cb)=>events[name]=cb,removeEventListener:name=>delete events[name]},
    HTMLButtonElement:Control, navigator:{userActivation:activation},
    localStorage:{getItem:key=>stored.get(key),setItem:(key,value)=>stored.set(key,value)},
    MutationObserver:class {constructor(callback){checkLaunch=callback} observe(){} disconnect(){}}
  };
  vm.runInNewContext(script + '\nmountOpeningTune();', env);
  assert.equal(toggle.checked,true);
  toggle.checked=false;
  toggle.listeners.change();
  picker.value='night';
  picker.listeners.change();
  await preview.listeners.click();
  assert.equal(sound.length,5,'the chime can be previewed while launch audio is off');
  toggle.checked=true;
  toggle.listeners.change();
  ready=true;
  checkLaunch();
  assert.equal(sound.length,5,'an opening tune waits for a user gesture in a restricted browser');
  activation.hasBeenActive=true;
  events.click();
  await Promise.resolve();
  assert.equal(sound.length,10,'the saved track plays once after the gesture');
  assert.equal(events.click,undefined,'ordinary subsequent taps cannot replay the opening tune');
  assert.deepEqual(JSON.parse(stored.get('anaes_opening_tune')),{enabled:true,track:'night'});
  toggle.checked=false;
  toggle.listeners.change();
  assert.equal(JSON.parse(stored.get('anaes_opening_tune')).enabled,false);
})().catch(error => { console.error(error); process.exitCode = 1; });
