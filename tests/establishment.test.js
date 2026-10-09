const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const c=require('./helpers/roster-context');
const periods=require('./fixtures/establishment-periods.json');
const clone=value=>JSON.parse(JSON.stringify(value));
c.rebuildCalculatedRoster();
const published=clone(c.R);
assert.equal(c.calculateNight('2026-10-08').pager,'Michael D');
// A second implementation, using the verified source slots and integer day steps.
const original=periods[0],slots=['first1','first2','second1','second2','pager','reliever'].map(k=>original[k]);
const october8Steps=(Date.parse('2026-10-08T00:00:00Z')-Date.parse('2026-06-30T00:00:00Z'))/86400000/4;
assert.equal(slots[(4-october8Steps%6+6)%6],'Michael D');
c.rotationVersions=clone(periods);c.rebuildCalculatedRoster();
for(const before of published.filter(row=>row.date<='2026-10-08'))assert.deepEqual(clone(c.calculateNight(before.date)),before,`historical preservation ${before.date}`);
assert.equal(c.verifyReference().hash,'9f1d88bc');
assert.equal(c.verifyReference().mismatches,0);
assert.equal(c.R.length,138);
// Derive the queue from the original six-person history, independently of the new seed.
const originalPager=step=>slots[(4-step%6+6)%6];
const originalQueue=Array.from({length:7},(_,i)=>originalPager(october8Steps+i+1));
assert.deepEqual(originalQueue,['Andre','Michael G','James','Shaun','Yentl','Michael D','Andre']);
const expected=originalQueue.filter(name=>name!=='Yentl');
assert.equal(expected[expected.length-2],c.calculateNight('2026-10-08').pager,'last previous Pager returns last before Andre repeats');
assert.notEqual(expected[1],'Michael D','no premature Pager return at the boundary');
expected.forEach((name,i)=>assert.equal(c.calculateNight(c.addDays('2026-10-12',i*4)).pager,name));
for(const row of c.R.filter(row=>row.date>='2026-10-12')){
 assert.equal(row.mode,'5');assert.equal(row.reliever,null);
 assert.equal(new Set(c.activeNames(row)).size,5);
 assert.ok(!c.activeNames(row).includes('Yentl'));
 assert.notEqual(row.seventh,'Yentl');
 const p=c.staffingPlan(row),night=c.buildNightPlan(row);
 assert.equal(p.count,5);assert.equal(p.complete,true);assert.equal(p.coverageKey,null);
 assert.equal(night.provisional,false);assert.equal(night.effective.fullLW,row.pager);
 assert.equal(c.workflowNeedsConfirmation(row,0),false,'normal base five stays automatic');
 const breaks=c.breakData(night.effective,night);
 assert.deepEqual(clone(breaks.first),[row.second1,row.second2]);
 assert.deepEqual(clone(breaks.second),[row.first1,row.first2]);
}
const base=c.calculateNight('2026-10-12');
function reset(){c.nightChanges={};c.nightOvertime={};c.nightRoleOverrides={};c.labourOrders={};c.labourOrderDrafts={};c.seventhDecisionDrafts={};}
for(const key of ['first1','first2','second1','second2','pager']){
 reset();c.nightChanges[base.date]=[{absent_name:base[key],reason:'Leave'}];
 let plan=c.buildNightPlan(base);assert.equal(plan.staffing.count,4);assert.equal(plan.provisional,true);
 assert.equal(plan.effective.understaffedCount,4);assert.equal(c.breakData(plan.effective,plan).first.length,0);
 c.nightOvertime[base.date]=[{id:'cover',nurse_name:'Cover Nurse',allocation_key:null}];
 plan=c.buildNightPlan(base);assert.equal(plan.staffing.count,5);assert.equal(plan.provisional,true);
 assert.deepEqual(clone(plan.staffing.availableKeys),[key],'overtime fills the actual vacancy, with no nonexistent Reliever');
 c.nightOvertime[base.date][0].allocation_key=key;
 plan=c.buildNightPlan(base);assert.equal(plan.provisional,false);assert.equal(plan.effective.mode,'5');
 assert.equal(plan.effective[key],'Cover Nurse');assert.equal(new Set(c.activeNames(plan.effective)).size,5);
 if(key==='pager')assert.equal(plan.effective.fullLW,'Cover Nurse');
}
reset();c.nightOvertime[base.date]=[{id:'relief',nurse_name:'Relief Nurse',allocation_key:null}];
assert.deepEqual(clone(c.staffingPlan(base).availableKeys),['reliever']);
assert.equal(c.planIsProvisional(base),true);
c.nightOvertime[base.date][0].allocation_key='reliever';
let six=c.applyChanges(base);assert.equal(six.mode,'6');assert.equal(six.reliever,'Relief Nurse');
c.ensureAutomaticLabourOrder(base,six);
assert.equal(c.labourOrderFor(six).first_part_name,'Andre');
assert.equal(c.labourOrderFor(six).second_part_name,'Relief Nurse');
assert.ok(c.breakData(six).first.includes('Relief Nurse'));
// Two overtime nurses must resolve the existing seventh decision and the new Reliever vacancy.
reset();c.nightOvertime[base.date]=[{id:'relief',nurse_name:'Relief Nurse',allocation_key:'reliever'},{id:'extra',nurse_name:'Extra Nurse',allocation_key:null}];
assert.equal(c.staffingPlan(base).requiresSeventhDecision,true);
c.seventhDecisionDrafts[base.date]='overtime';c.nightOvertime[base.date][1].allocation_key='seventh';
let seven=c.buildNightPlan(base);assert.equal(seven.provisional,false);assert.equal(seven.effective.mode,'7');assert.equal(c.activeNames(seven.effective).length,7);
reset();c.nightChanges[base.date]=[{absent_name:base.first1,replacement_name:'Legacy Cover'}];
assert.equal(c.staffingPlan(base).count,5);assert.equal(c.applyChanges(base).first1,'Legacy Cover');
// A scheduled sixth member joins without changing a single prior night.
reset();const beforeFuture=c.R.map(clone),future={effective_from:'2026-11-01',base_size:6,first1:'Shaun',first2:'James',second1:'Michael G',second2:'Michael D',pager:'Andre',reliever:'New Nurse',seventh_anchor:'Andre',seventh_cycle:['Shaun','James','Michael G','Michael D','Andre','New Nurse','OT Nurse']};
assert.equal(c.validEstablishment(future),true);c.rotationVersions.push(future);c.rebuildCalculatedRoster();
for(const before of beforeFuture.filter(row=>row.date<future.effective_from))assert.deepEqual(clone(c.calculateNight(before.date)),before);
const futureNight=c.calculateNight(future.effective_from);assert.equal(futureNight.mode,'6');assert.equal(c.staffingPlan(futureNight).count,6);assert.equal(c.staffingPlan(futureNight).complete,true);
c.ensureAutomaticLabourOrder(futureNight,futureNight);assert.equal(c.labourOrderFor(futureNight).second_part_name,'New Nurse');
assert.equal(new Set(c.activeNames(c.calculateNight(c.addDays(future.effective_from,4)))).size,6);
assert.equal(c.validEstablishment({...future,base_size:5,reliever:null,pager:'James'}),false,'duplicate permanent identity rejected');
// Five-person periods remain available in the bounded offline snapshot.
c.localStorage.setItem('anaes_offline_snapshot',JSON.stringify({saved_at:new Date().toISOString(),rotationVersions:c.rotationVersions,rosterSettings:c.rosterSettings,nightChanges:{},nightOvertime:{}}));
assert.equal(c.readOfflineSnapshot().rotationVersions[1].base_size,5);
const migration=fs.readFileSync(path.join(__dirname,'../supabase/migrations',fs.readdirSync(path.join(__dirname,'../supabase/migrations')).find(name=>name.endsWith('effective_roster_establishment_v55.sql'))),'utf8');
assert.match(migration,/ROTATION_PERIOD_IMMUTABLE/);assert.match(migration,/minimum_write_version='54.0'/);
assert.match(migration,/before_rows is distinct from after_rows/);
assert.doesNotMatch(migration,/update public\.(allowed_users|night_changes|night_overtime|roster_settings)\b/i);
assert.match(migration,/revoke insert,update,delete on public.rotation_versions from public,anon,authenticated/);
console.log('Establishment history, 6-to-5, one-night Pager, staffing, breaks, overtime, offline and 5-to-6 regressions passed.');
// Night-only changes stay separate from the permanent establishment, and expire safely with staffing changes.
c.rotationVersions=clone(periods);c.rebuildCalculatedRoster();reset();
c.nightOvertime[base.date]=[{id:'relief',nurse_name:'Relief Nurse',allocation_key:'reliever'}];
const customSix={first1:base.first1,first2:base.first2,second1:base.second1,second2:base.second2,pager:'Relief Nurse',reliever:base.pager};
c.nightRoleOverrides[base.date]={assignments:customSix,reason:'Agreed swap'};
assert.equal(c.validRoleAssignmentsForNight(base,customSix),true);
let overridden=c.applyChanges(base);assert.equal(overridden.mode,'6');assert.equal(overridden.pager,'Relief Nurse');assert.equal(overridden.reliever,'Andre');
assert.equal(c.staffingPlan(base).validAssignments[0].allocation_key,'pager');
c.nightOvertime={};assert.equal(c.validRoleAssignmentsForNight(base,customSix),false);assert.equal(c.applyChanges(base).mode,'5');assert.equal(c.applyChanges(base).pager,'Andre');
