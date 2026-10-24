const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const {stripTypeScriptTypes}=require('node:module');
const c=require('./helpers/roster-context');
const date='2026-10-24';
c.rotationVersions=[{effective_from:date,base_size:5,first1:'James',first2:'Michael G',second1:'Andre',second2:'Michael D',pager:'Shaun',reliever:null,seventh_cycle:c.ORIGINAL_SEVENTH,seventh_anchor:'James'}];c.rebuildCalculatedRoster();
c.nightChanges={[date]:[{absent_name:'James',replacement_name:'',reason:'Leave'}]};
c.nightRoleOverrides={[date]:{assignments:{mode:'4',first1:'Shaun',first2:'Michael G',second1:'Andre',second2:'Michael D'},reason:'Leave'}};
const base=c.rawBaseForDate(date);
for(const model of [base,c.baseForDate(date),c.applyChanges(base)])assert.equal(c.staffingPlan(model).count,4,'headcount must not change after applying theatre roles');
assert.equal(c.applyChanges(base).first1,'Shaun');assert.equal(c.planIsProvisional(base),true);assert.equal(c.workflowNeedsConfirmation(base,0),false,'four nurses cannot enter standard finalisation');
assert.doesNotMatch(JSON.stringify(c.confirmationChangedRows(base,c.applyChanges(base),null)),/\+ null/);
c.addEventListener=()=>{};c.dispatchEvent=()=>{};c.window=c;c.exports={};c.require=()=>({});c.MutationObserver=class{observe(){}};c.document.addEventListener=()=>{};c.document.body.classList.contains=()=>false;
const source=fs.readFileSync(require.resolve('../src/shared-pager.ts'),'utf8');
vm.runInContext('(function(){'+stripTypeScriptTypes(source.replace(/import '\.\/shared-pager.css';/, '').replace(/export \{[^}]*\};/, ''),{mode:'transform'})+';exports.pager={sharedPagerState,segments,summaryText,fetchOrder,status,resetPrivateState};})()',c);
const pager=c.exports.pager;
assert.equal(pager.sharedPagerState(date).ready,true,'saved theatre override must open Pager setup');
const turns=pager.segments(date,['Shaun','Michael G','Andre','Michael D']);
assert.deepEqual(Array.from(turns,x=>(x.end-x.start)/3600000),[2,2,2,2]);
assert.match(turns[0].label,/02:00 OLD/);assert.match(turns[1].label,/02:00 OLD–03:00/);
assert.match(pager.summaryText(date,['Shaun','Michael G','Andre','Michael D']),/First Part: Shaun Galea/);
delete c.nightRoleOverrides[date];assert.equal(pager.sharedPagerState(date).eligible,true,'Pager feature must stay visible while theatre selection is pending');assert.equal(pager.sharedPagerState(date).ready,false);
c.nightChanges[date]=[{absent_name:'Shaun',replacement_name:''}];assert.equal(pager.sharedPagerState(date).ready,true,'Pager absence must preserve four existing theatre positions');
c.nightChanges[date]=[];assert.equal(pager.sharedPagerState(date).eligible,false,'five nurses must not show the exception');
for(const [day,hours] of [['2026-10-20',1.75],['2027-03-27',1.5]]){const parts=pager.segments(day,['a','b','c','d']);assert.ok(parts.every(x=>(x.end-x.start)/3600000===hours));}
console.log('Effective four-nurse plan, persistent Pager setup, DST turns and provisional finalisation verified.');

(async()=>{
 c.nightChanges[date]=[{absent_name:'Shaun',replacement_name:''}];
 let calls=0; c.supa={from:()=>({select(){return this},eq(){return this},maybeSingle:async()=>++calls===1?{error:{message:'connection lost'}}:{data:{roster_date:date,nurse_order:['James','Michael G','Andre','Michael D'],updated_at:'2026-10-24T20:00:00Z'},error:null}})};
 await pager.fetchOrder(date);assert.equal(pager.status(date).error,true);assert.equal(pager.status(date).saved,false);
 await pager.fetchOrder(date);assert.equal(calls,2,'failed loads must not be cached as an empty saved plan');assert.equal(pager.status(date).saved,true);
 let finish; c.document.getElementById=()=>({remove(){}}); c.supa={from:()=>({select(){return this},eq(){return this},maybeSingle:()=>new Promise(resolve=>finish=resolve)})};
 const pending=pager.fetchOrder(date,true);pager.resetPrivateState();finish({data:{roster_date:date,nurse_order:['James','Michael G','Andre','Michael D']}});await pending;
 assert.equal(pager.status(date).saved,false,'late signed-out responses must not restore private Pager state');
 console.log('Pager refresh retry and late sign-out response isolation verified.');
})().catch(error=>{console.error(error);process.exitCode=1});
