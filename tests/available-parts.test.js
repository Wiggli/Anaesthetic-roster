const assert=require('node:assert/strict');
const c=require('./helpers/roster-context');
const clone=x=>JSON.parse(JSON.stringify(x));
c.rotationVersions=require('./fixtures/establishment-periods.json');c.rebuildCalculatedRoster();
const base=c.calculateNight('2026-11-01');
function reset(){c.nightChanges={};c.nightOvertime={};c.nightRoleOverrides={};c.seventhDecisionDrafts={};c.fiveCovers={};}
reset();assert.equal(c.availablePartsModel(base).complete,true);assert.deepEqual(clone(c.availablePartsModel(base).parts),[]);
c.nightChanges[base.date]=[{absent_name:base.first1}];
assert.equal(c.availablePartsModel(base).shortage,1);assert.deepEqual(clone(c.availablePartsModel(base).parts.map(x=>x.key)),['first1']);
c.nightOvertime[base.date]=[{id:'cover',nurse_name:'Cover Nurse',allocation_key:'first1'}];
assert.deepEqual(clone(c.availablePartsModel(base).parts),[]);assert.equal(c.availablePartsModel(base).complete,true);
reset();c.nightOvertime[base.date]=[{id:'a',nurse_name:'Extra A'},{id:'b',nurse_name:'Extra B'}];
let m=c.availablePartsModel(base);assert.deepEqual(clone(m.parts.map(x=>x.key)),['reliever']);assert.equal(m.conditional.name,c.professionalName(c.staffingPlan(base).seventhChoice.nurse));assert.ok(m.conditional.rotation.key);assert.equal(m.conditional.overtime.key,'seventh');assert.equal(m.complete,false);
assert.equal(c.workflowTaskDetails(base,c.staffingPlan(base))[0],'Choose whether '+m.conditional.name+' moves from '+m.conditional.rotation.label+' to Seventh nurse');
c.seventhDecisionDrafts[base.date]='rotation';m=c.availablePartsModel(base);assert.equal(m.conditional,null);assert.ok(m.parts.some(x=>x.key===c.staffingPlan(base).seventhChoice.vacatedKey));
c.seventhDecisionDrafts[base.date]='overtime';m=c.availablePartsModel(base);assert.ok(m.parts.some(x=>x.key==='seventh'));
c.nightOvertime[base.date][0].allocation_key='reliever';c.nightOvertime[base.date][1].allocation_key='seventh';assert.equal(c.availablePartsModel(base).complete,true);assert.equal(c.availablePartsModel(base).parts.length,0);
c.nightOvertime[base.date].push({id:'c',nurse_name:'Extra C'});assert.equal(c.availablePartsModel(base).extras,1);
reset();const six=c.calculateNight('2026-10-08');c.nightChanges[six.date]=[{absent_name:six.first1},{absent_name:six.second1}];c.nightOvertime[six.date]=[{id:'cover',nurse_name:'Cover Nurse'}];m=c.availablePartsModel(six);assert.equal(m.coverageChoices.length,2);assert.equal(m.parts.length,0);assert.equal(m.complete,false);
reset();const dst=c.calculateNight('2026-10-24');c.nightChanges[dst.date]=[{absent_name:dst.first1}];assert.match(c.availablePartsModel(dst).parts[0].detail,/03:00 after/);
reset();
const shared=c.calculateNight('2026-11-21');
assert.deepEqual(clone(c.threeWayPagerPeriods(shared.date)),['23:30–02:00','02:00–04:30','04:30–07:00']);
assert.deepEqual(clone(c.threeWayPagerPeriods('2027-03-27')),['23:30–01:40','01:40–04:50','04:50–07:00']);
assert.deepEqual(clone(c.threeWayPagerPeriods('2027-10-30')),['23:30–02:20 (before clock change)','02:20 (before clock change)–04:10','04:10–07:00']);
const rosterBeforeNoticeChecks=c.R;
for (const [previous, changeDate, direction] of [
  ['2027-03-23','2027-03-27','forward'],
  ['2027-10-26','2027-10-30','back']
]) {
  const earlier=c.addDays(previous,-4);
  c.R=[earlier,previous,changeDate,c.addDays(changeDate,4)].map(date=>({date}));
  const notice=c.nextShiftClockChangeNotice(previous);
  assert.equal(notice.info.date,changeDate);
  assert.equal(notice.info.direction,direction);
  assert.equal(c.nextShiftClockChangeNotice(earlier),null,'no notice two roster shifts ahead');
  assert.equal(c.nextShiftClockChangeNotice(c.addDays(changeDate,-1)),null,'unrostered days cannot trigger the notice');
  assert.equal(c.nextShiftClockChangeNotice(changeDate),null,'the affected shift uses its live clock-change guidance');
  assert.equal(c.nextShiftClockChangeNotice(c.addDays(changeDate,4)),null,'the last published row has no following shift');
}
c.R=rosterBeforeNoticeChecks;
const theatre=['first1','first2','second1','second2'];
const pagerExtra={id:'pager-extra',nurse_name:'Pager Extra',allocation_key:'reliever'};
const pagerThird={id:'pager-third',nurse_name:'Pager Third'};
c.nightOvertime[shared.date]=[pagerExtra,pagerThird];
m=c.availablePartsModel(shared);
assert.equal(m.conditional,null,'the historical rotation decision must not appear after cutover');
assert.deepEqual(clone(m.parts.map(x=>x.label)),['Shared Pager · slot 3']);
assert.equal(m.parts[0].detail,'04:30–07:00');
assert.equal(c.buildNightPlan(shared).provisional,true);
assert.equal(c.pagerTombolaModel(shared,c.staffingPlan(shared),c.applyChanges(shared)),null,'incomplete cover cannot be drawn');
assert.deepEqual(clone(c.selectedCoverAssignments(shared,c.staffingPlan(shared)).assignments),{reliever:'pager-extra',seventh:'pager-third'});
c.allocationDrafts[shared.date]={seventh:'pager-third'};
assert.equal(c.threeWayPagerNames(c.allocationPreview(shared))[2],'Pager Third');
delete c.allocationDrafts[shared.date];
pagerThird.allocation_key='seventh';
let night=c.buildNightPlan(shared);
assert.equal(night.staffing.complete,true);
assert.equal(c.pagerTombolaModel(shared,night.staffing,night.effective).saved,false);
let randomWords=[4294967295,0,0];
c.window.crypto={getRandomValues(words){words[0]=randomWords.shift()}};
assert.deepEqual(clone(c.shufflePagerTeam(['A','B','C'])),['B','C','A'],'random indices reject biased values and keep each person exactly once');
assert.equal(night.labourPending,false,'a two-person Labour Ward order cannot be required');
assert.deepEqual(clone(c.threeWayPagerNames(night.effective)),[shared.pager,'Pager Extra','Pager Third']);
for(const key of theatre)assert.equal(night.effective[key],shared[key],'overtime must not displace a rostered theatre nurse');
const breaks=c.breakData(night.effective,night);
assert.deepEqual(clone(breaks.first),[shared.second1,shared.second2]);
assert.deepEqual(clone(breaks.second),[shared.first1,shared.first2]);
assert.match(breaks.notes[1],/Pager turn 2: Pager Extra • 02:00–04:30/);
assert.match(breaks.notes[2],/Pager turn 3: Pager Third • 04:30–07:00/);
assert.match(c.selectedNightSummary(shared.date),/Pager Extra · 02:00–04:30\nPager Third · 04:30–07:00/);
assert.equal(c.personalAllocation(shared,night.effective,pagerThird.nurse_name).period,'04:30–07:00');

c.nightChanges[shared.date]=[{absent_name:shared.first1}];
c.nightOvertime[shared.date].push({id:'theatre',nurse_name:'Theatre Cover',allocation_key:'first1'});
night=c.buildNightPlan(shared);
assert.equal(night.effective.first1,'Theatre Cover');
c.allocationDrafts[shared.date]={first1:'pager-extra'};
assert.deepEqual(clone(c.selectedCoverAssignments(shared,c.staffingPlan(shared)).assignments),{first1:'pager-extra',seventh:'pager-third',reliever:'theatre'});
delete c.allocationDrafts[shared.date];
assert.equal(night.staffing.complete,true);
c.nightOvertime[shared.date].push({id:'extra',nurse_name:'Additional Cover'});
assert.deepEqual(clone(c.additionalNurses(c.staffingPlan(shared)).map(x=>x.nurse_name)),['Additional Cover']);

delete c.nightChanges[shared.date];
c.nightOvertime[shared.date]=[pagerExtra,pagerThird];
c.nightRoleOverrides[shared.date]={assignments:{
  mode:'7',first1:'Pager Extra',first2:shared.first2,second1:shared.second1,second2:shared.second2,
  pager:shared.pager,reliever:shared.first1,seventh:'Pager Third'
}};
night=c.buildNightPlan(shared);
assert.equal(night.provisional,false,'a complete agreed arrangement supersedes the automatic plan');
assert.equal(night.effective.first1,'Pager Extra');
assert.deepEqual(clone(c.threeWayPagerNames(night.effective)),[shared.pager,shared.first1,'Pager Third']);
reset();
c.nightOvertime[shared.date]=[pagerExtra];
night=c.buildNightPlan(shared);
assert.equal(night.effective.sharedPagerThree,false,'a six-nurse plan still uses the two-person rule');
assert.equal(night.staffing.count,6);
assert.equal(c.pagerTombolaModel(shared,night.staffing,night.effective),null);
assert.equal(night.labourPending,true,'six nurses agree their own Pager order');
assert.match(c.selectedNightSummary(shared.date),/Parts to agree/);
assert.equal(c.personalAllocation(shared,night.effective,'Pager Extra').pending,true);
assert.equal(c.pagerOrderForm(shared,night.staffing).first,'', 'neither nurse starts selected');
c.labourOrderDrafts[shared.date]={first:'Pager Extra',second:shared.pager};
assert.equal(c.pagerOrderForm(shared,night.staffing).first,'Pager Extra');
assert.equal(c.buildNightPlan(shared).labourPending,true,'a local selection is not the agreed shared order until saved');
c.labourOrders[shared.date]={first_part_name:'Pager Extra',second_part_name:shared.pager};
c.labourOrderDrafts[shared.date]={first:shared.pager,second:'Old Cover',automatic:true};
c.ensureAutomaticLabourOrder(shared,night.effective);
assert.match(c.selectedNightSummary(shared.date),/Pager turn 1: Pager Extra · 00:00–03:30/);
night=c.buildNightPlan(shared);
assert.equal(c.personalAllocation(shared,night.effective,'Pager Extra').breakLabel,'Second break');
assert.equal(c.personalAllocation(shared,night.effective,shared.pager).breakLabel,'First break');
c.nightOvertime[shared.date]=[{id:'replacement',nurse_name:'New Cover',allocation_key:'reliever'}];
assert.equal(c.buildNightPlan(shared).labourPending,true,'a changed Pager pair needs a new agreement');
delete c.labourOrders[shared.date];
delete c.labourOrderDrafts[shared.date];
reset();
assert.match(c.selectedNightSummary(shared.date),/Full-night Pager: .* · 00:00–07:00/);
console.log('Available parts: vacancies, saved cover, seventh alternatives, extra staff, Reliever priority and DST passed.');

// A saved draw may outlive one of its nurses. Current six-person cover still wins.
reset();
c.nightChanges[shared.date]=[{absent_name:shared.first1}];
c.nightOvertime[shared.date]=[
  {id:'cover-a',nurse_name:'Daniel S'},
  {id:'cover-b',nurse_name:'Andre S'}
];
c.nightRoleOverrides[shared.date]={assignments:{
 mode:'7',first1:'Andre S',first2:shared.first2,second1:shared.second1,second2:shared.second2,
 pager:'Departed Pager',reliever:'Daniel S',seventh:shared.pager
}};
c.allocationDrafts[shared.date]={first1:'cover-a',reliever:'cover-b'};
c.labourOrderDrafts[shared.date]={first:shared.pager,second:'Andre S'};
const currentPager=c.pagerOrderForm(shared,c.staffingPlan(shared));
assert.equal(currentPager.first,shared.pager);
assert.equal(currentPager.second,'Andre S');
assert.equal(currentPager.preview.first1,'Daniel S');
assert.equal(c.nightRoleOverrideModel(shared).stored,false);
delete c.allocationDrafts[shared.date];delete c.labourOrderDrafts[shared.date];

// Assignment review must describe the existing save selections without mutating them.
reset();c.allocationDrafts={};c.nightOvertime[shared.date]=[{id:'one',nurse_name:'Daniel Santucci'},{id:'two',nurse_name:'Andre Seychell'}];
let reviewPlan=c.staffingPlan(shared),beforeReview=clone(c.nightOvertime[shared.date]);
let review=c.sevenNurseAssignmentReview(shared,reviewPlan);
assert.equal(review.ready,true);assert.equal(review.saved,false);assert.equal(review.drawSaved,false);
assert.deepEqual(clone(review.pager),[c.professionalName(shared.pager),'Daniel Santucci','Andre Seychell']);
for(const row of review.theatre)assert.equal(row.name,c.professionalName(shared[row.key]));
assert.deepEqual(clone(c.nightOvertime[shared.date]),beforeReview,'reviewing must not save or reorder overtime');
// A theatre vacancy remains an explicit decision, and changing it updates the proposed Pager team.
c.nightChanges[shared.date]=[{absent_name:shared.first1}];c.nightOvertime[shared.date].push({id:'three',nurse_name:'Third Nurse'});
review=c.sevenNurseAssignmentReview(shared,c.staffingPlan(shared));assert.equal(review.ready,false);assert.equal(review.theatre[0].name,'');
c.allocationDrafts[shared.date]={first1:'one'};
review=c.sevenNurseAssignmentReview(shared,c.staffingPlan(shared));assert.equal(review.ready,true);assert.equal(review.theatre[0].name,'Daniel Santucci');assert.ok(!review.pager.includes('Daniel Santucci'));
// A saved draw's effective roles take precedence over the older overtime slot keys.
reset();c.allocationDrafts={};c.nightOvertime[shared.date]=[{id:'one',nurse_name:'Daniel Santucci',allocation_key:'reliever'},{id:'two',nurse_name:'Andre Seychell',allocation_key:'seventh'}];
c.nightRoleOverrides[shared.date]={reason:c.PAGER_TOMBOLA_REASON,assignments:{mode:'7',first1:shared.first1,first2:shared.first2,second1:shared.second1,second2:shared.second2,pager:'Andre Seychell',reliever:shared.pager,seventh:'Daniel Santucci'}};
review=c.sevenNurseAssignmentReview(shared,c.staffingPlan(shared));assert.equal(review.drawSaved,true);assert.deepEqual(clone(review.pager),['Andre Seychell',c.professionalName(shared.pager),'Daniel Santucci']);
console.log('Seven-nurse assignment review, theatre choices and saved draw precedence passed.');
{
 const vm=require('node:vm'),timers=[];let date=shared.date,view='changes',clicks=0;
 const user={id:'review'},browser={currentUser:user,cur:()=>({date}),show:value=>{view=value},toast(){},document:{body:{classList:{contains:()=>false},getAttribute:()=>view},querySelector:()=>null},window:{setTimeout:fn=>timers.push(fn)}};
 vm.runInNewContext(c.openPagerDrawForNight.toString(),browser);
 browser.openPagerDrawForNight(date);assert.equal(timers.length,1);
 date='2026-11-25';timers.shift()();assert.equal(timers.length,0,'a delayed handoff must stop after changing night');
 browser.openPagerDrawForNight(date);browser.currentUser={id:'other'};timers.shift()();assert.equal(timers.length,0,'a delayed handoff must stop after changing account');
 browser.document.querySelector=()=>({click:()=>clicks++});browser.openPagerDrawForNight(date);assert.equal(clicks,1,'the saved handoff opens the review launcher, without invoking the draw');
}
