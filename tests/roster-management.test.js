const assert=require('node:assert/strict');
const c=require('./helpers/roster-context');
const clone=x=>JSON.parse(JSON.stringify(x));
const periods=require('./fixtures/establishment-periods.json');
const elements=new Map();
c.document.getElementById=id=>{if(!elements.has(id))elements.set(id,{value:'',innerHTML:'',textContent:'',disabled:false,dataset:{},classList:{add(){},remove(){},toggle(){}},focus(){}});return elements.get(id)};
c.appNow=()=>new Date('2026-10-09T08:00:00Z');c.rotationVersions=clone(periods);c.rebuildCalculatedRoster();
c.renderEstablishmentEditor(true);
assert.equal(c.byId('teamEffectiveDate').value,'2026-10-16');
assert.ok(!c.byId('teamRosterNames').innerHTML.includes('Yentl'));
c.byId('teamSlotFirst1').value='Joining Nurse';c.byId('teamPeriodNotes').value='Nurse replacement';c.markTeamPeriodChanged();
c.byId('teamEffectiveDate').value='2026-10-20';c.selectTeamEffectiveDate();
assert.equal(c.byId('teamSlotFirst1').value,'Joining Nurse');assert.equal(c.byId('teamPeriodNotes').value,'Nurse replacement');
const previous=periods[1];
const same={...c.calculateNight('2026-10-20'),base_size:5,effective_from:'2026-10-20'};
const unchanged=c.establishmentSeventhCycle(same,previous,same.effective_from);
assert.deepEqual(clone(unchanged.cycle),previous.seventh_cycle);
assert.equal(unchanged.anchor,c.calculateNight(same.effective_from).seventh);
const replacement={...same,second1:'New Nurse'};
const replaced=c.establishmentSeventhCycle(replacement,previous,replacement.effective_from);
assert.deepEqual(clone(replaced.cycle),previous.seventh_cycle.map(n=>n===same.second1?'New Nurse':n));
const pair={...same,first1:'Joining One',pager:'Joining Two'};const paired=c.establishmentSeventhCycle(pair,previous,pair.effective_from);assert.deepEqual(clone(paired.cycle),previous.seventh_cycle.map(n=>n===same.first1?'Joining One':n===same.pager?'Joining Two':n));
const six={...same,base_size:6,reliever:'Sixth Nurse'};
const added=c.establishmentSeventhCycle(six,previous,six.effective_from);
assert.deepEqual(clone(added.cycle),previous.seventh_cycle.slice(0,-1).concat(['Sixth Nurse','OT Nurse']));
const sixPeriod={...six,seventh_cycle:clone(added.cycle),seventh_anchor:added.anchor};
c.rotationVersions.push(sixPeriod);c.rebuildCalculatedRoster();
const five={...c.calculateNight('2026-10-24'),effective_from:'2026-10-24',base_size:5,reliever:null};
const removed=c.establishmentSeventhCycle(five,sixPeriod,five.effective_from);
assert.deepEqual(clone(removed.cycle),sixPeriod.seventh_cycle.filter(n=>n!==c.calculateNight(five.effective_from).reliever));
assert.equal(new Set(removed.cycle).size,6);
// Any departing current seventh advances to the next surviving member in the established direction.
const departing=c.calculateNight('2026-10-24').seventh;
if(departing!=='OT Nurse'){
 const leave={...five};for(const k of c.establishmentKeys(5))if(leave[k]===departing)leave[k]='Replacement Nurse';
 const cycle=c.establishmentSeventhCycle(leave,sixPeriod,'2026-10-24');assert.ok(cycle.cycle.includes(cycle.anchor));assert.ok(!cycle.cycle.includes(departing));
}
// Establishment changes invalidate only manual approvals saved before the new period.
c.rotationVersions=clone(periods);c.rotationVersions[1].updated_at='2026-10-09T10:00:00Z';c.rebuildCalculatedRoster();
const reviewNight=c.calculateNight('2026-10-16');c.nightChanges[reviewNight.date]=[{absent_name:reviewNight.first1,replacement_name:'Cover Nurse',updated_at:'2026-10-09T08:00:00Z'}];
c.nightPlanStatuses[reviewNight.date]={published_at:'2026-10-09T09:00:00Z'};
assert.equal(c.workflowNeedsConfirmation(reviewNight,0),true);
c.nightPlanStatuses[reviewNight.date].published_at='2026-10-09T11:00:00Z';assert.equal(c.workflowNeedsConfirmation(reviewNight,0),false);
c.nightChanges={};assert.equal(c.workflowNeedsConfirmation(reviewNight,0),false,'normal five stays automatic');c.nightPlanStatuses={};
const historical=c.calculateNight('2026-10-08');c.rotationVersions[0].updated_at='2026-10-09T10:00:00Z';c.nightChanges[historical.date]=[{absent_name:historical.first1,replacement_name:'Historical Cover',updated_at:'2026-10-08T08:00:00Z'}];c.nightPlanStatuses[historical.date]={published_at:'2026-10-08T09:00:00Z'};assert.equal(c.workflowNeedsConfirmation(historical,0),false,'historical approvals stay preserved');c.nightChanges={};c.nightPlanStatuses={};
// Preview/save works through the guarded endpoint and never rewrites an earlier calculated night.
(async()=>{
 c.rotationVersions=clone(periods);c.rebuildCalculatedRoster();c.teamEditorDirty=false;c.renderEstablishmentEditor(true);
 c.byId('teamSlotFirst1').value='New Nurse';c.byId('teamPeriodNotes').value='Member replacement';c.previewTeamChange();
 assert.ok(c.byId('teamChangePreview').innerHTML.includes('Pager order'));assert.ok(c.byId('teamChangePreview').innerHTML.includes('Joining: New Nurse'));
 const requested=clone(c.pendingTeamVersion),before=c.R.filter(r=>r.date<requested.effective_from).map(clone);
 c.confirm=()=>true;c.sharedWritesBlocked=()=>false;c.updateOfflineControls=()=>{};
 let calls=0,release;c.runRosterMutation=async(key,execute)=>{calls++;await new Promise(r=>release=r);return execute('test-id',0)};
 c.supa={rpc:async(name,args)=>{assert.equal(name,'upsert_rotation_version_v49');assert.equal(args.p_client_version,c.APP_VERSION);c.rotationVersions.push(requested);return{error:null}}};
 c.loadSharedData=async()=>{c.rebuildCalculatedRoster();return true};
 const first=c.confirmTeamChange();assert.equal(c.teamPeriodSaving,true);assert.equal(c.byId('teamSlotFirst1').disabled,true);
 await c.confirmTeamChange();assert.equal(calls,1);release();await first;
 assert.equal(c.teamPeriodSaving,false);for(const night of before)assert.deepEqual(clone(c.calculateNight(night.date)),night);
 // A changed basis invalidates confirmation before any request.
 c.renderEstablishmentEditor(true);c.byId('teamPeriodNotes').value='Next period';c.previewTeamChange();assert.ok(c.pendingTeamVersion);
 c.rosterSettings.published_until='2028-01-03';await c.confirmTeamChange();assert.equal(calls,1);assert.equal(c.pendingTeamVersion,null);
 assert.match(c.byId('teamPeriodError').textContent,/changed/);
 // Offline saves and failed saves preserve the existing periods.
 c.previewTeamChange();c.navigator.onLine=false;await c.confirmTeamChange();assert.equal(calls,1);assert.match(c.byId('teamPeriodError').textContent,/Reconnect/);c.navigator.onLine=true;
 c.runRosterMutation=async()=>({error:{code:'ROSTER_REVISION_CONFLICT',message:'ROSTER_REVISION_CONFLICT'}});await c.confirmTeamChange();assert.match(c.byId('teamPeriodError').textContent,/elsewhere/);assert.equal(c.teamPeriodSaving,false);
 c.previewTeamChange();c.runRosterMutation=async()=>{throw new Error('timeout')};await c.confirmTeamChange();assert.match(c.byId('teamPeriodError').textContent,/could not be verified/);assert.equal(c.teamPeriodSaving,false);
 console.log('Roster Management joins, leaves, five/six periods, seventh continuity, preserved history, edited dates, stale/offline saves and duplicate submissions passed.');
})().catch(e=>{console.error(e);process.exitCode=1});
