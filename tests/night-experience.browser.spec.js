const {test,expect}=require('@playwright/test');
const {openReview}=require('./helpers/product-review');
const periods=require('./fixtures/establishment-periods.json');
async function fourNight(page,absence='James',saved=true){
 await page.clock.setFixedTime(new Date('2026-10-24T19:40:00Z'));
 await openReview(page);
 await page.evaluate(({periods,absence,saved})=>{
  queueClockChangeAttention=()=>{};rotationVersions=periods;schemaVersion=57;rebuildCalculatedRoster();idx=R.findIndex(r=>r.date==='2026-10-24');
  appNow=()=>new Date('2026-10-24T19:40:00Z');nightChanges={'2026-10-24':[{id:1,absent_name:absence,replacement_name:'',reason:'Leave'}]};nightOvertime={};
  nightRoleOverrides=saved?{'2026-10-24':{assignments:{mode:'4',first1:'Shaun',first2:'Michael G',second1:'Andre',second2:'Michael D'},reason:'Leave'}}:{};
  window.testPagerRow=null;window.testPagerSaves=[];
  supa.from=()=>({select(){return this},eq(){return this},maybeSingle:async()=>({data:window.testPagerRow,error:null})});
  const originalRpc=supa.rpc;supa.rpc=async(name,p)=>{if(name==='set_night_shared_pager_order_v56'){window.testPagerSaves.push(p);window.testPagerRow={roster_date:p.p_roster_date,nurse_order:p.p_nurse_order,updated_by:'Review nurse',updated_at:new Date().toISOString()};return{data:window.testPagerRow,error:null}}return originalRpc(name,p)};
  render();show('changes');setChangesStep('allocation',false);
 },{periods,absence,saved});
}
for(const width of [320,440])for(const theme of ['light','dark'])test(`four-nurse Pager arrangement ${width} ${theme} @iphone`,async({page},info)=>{
 await page.setViewportSize({width,height:956});await fourNight(page);await page.evaluate(theme=>setThemePreference(theme),theme);
 await expect(page.locator('#changesModeStatus')).toContainText('4');
 await expect(page.locator('[data-night-role="first1"]')).toBeVisible();
 await expect(page.locator('#continueToConfirmBtn')).toBeHidden();
 const slots=page.locator('[data-shared-pager-index]');await expect(slots).toHaveCount(4);
 for(const [i,name] of ['Shaun','Michael G','Andre','Michael D'].entries())await page.locator(`[data-shared-pager-index="${i}"]`).selectOption(name);
 await expect(page.locator('[data-shared-pager-save]')).toBeEnabled();await page.locator('[data-shared-pager-save]').click();
 await expect(page.locator('#changesWorkflowExperience')).toContainText('Four nurses · provisional cover');
 await page.evaluate(()=>show('today'));
 const hero=page.locator('#sharedPagerHero');await expect(hero).toContainText('André Bartolo');await expect(hero).toContainText('02:00 OLD');await expect(hero).toContainText('Pager starts at 00:00');
 await expect(page.locator('#personalNightCard')).toContainText('Theatre parts start at 00:00');
 await expect(page.locator('#nightClockChange')).toBeEmpty();
 expect(await hero.locator('.sharedPagerSegments b').evaluateAll(nodes=>nodes.every(n=>getComputedStyle(n).whiteSpace!=='nowrap'&&parseFloat(getComputedStyle(n).fontSize)>=14))).toBe(true);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
 await hero.scrollIntoViewIfNeeded();await page.screenshot({path:`/tmp/night-plan-${width}-${theme}.png`,fullPage:true});
 await page.evaluate(()=>performQuickAction('night-plan'));await expect(page.locator('#nightPlanSummaryDialog')).toContainText('PROVISIONAL · 4 present');await expect(page.locator('#nightPlanSummaryDialog')).toContainText('03:00–05:00');
 await page.locator('#nightPlanSummaryDialog [data-close]').click();
 await hero.getByRole('button',{name:'Assignments',exact:true}).click();await expect(page.locator('[data-night-role="first1"]')).toBeVisible();
 await page.evaluate(()=>show('breaks'));await expect(page.locator('#sharedPagerBreaks')).toContainText('André Bartolo');
});
test('Pager remains discoverable before theatre placement and when Pager nurse absent @iphone',async({page})=>{
 await fourNight(page,'James',false);await expect(page.locator('#sharedPagerEditor')).toContainText('Save the four theatre positions above');
 await expect(page.locator('#nightRoleOverrideStep select[data-night-role="first1"]')).toHaveValue('');
 await page.evaluate(()=>{nightChanges['2026-10-24']=[{id:1,absent_name:'Shaun',replacement_name:'',reason:'Leave'}];render();show('changes');setChangesStep('allocation',false)});
 await expect(page.locator('[data-shared-pager-index]')).toHaveCount(4);
 await expect(page.locator('[data-shared-pager-index="0"]')).toHaveValue('');
});
test('failed theatre save retains choices and enables retry after entering reason @iphone',async({page})=>{
 await fourNight(page,'James',false);
 await page.evaluate(()=>{
  runRosterMutation=async()=>({error:{code:'NETWORK_ERROR',message:'Review connection failed'}});
 });
 await page.locator('[data-night-role="first1"]').selectOption('Shaun');
 await page.locator('#nightRoleReason').fill('Agreed cover');
 const save=page.locator('#saveNightRolesBtn');await expect(save).toBeEnabled();await save.click();
 await expect(save).toBeEnabled();await expect(page.locator('#nightRoleFeedback')).toContainText('could not be saved');await expect(page.locator('#nightRoleReason')).toHaveValue('Agreed cover');
 await expect(page.locator('[data-night-role="first1"]')).toHaveValue('Shaun');
});
test('failed Pager save retains manual order and personal Pager opens its editor @iphone',async({page})=>{
 await fourNight(page);await page.evaluate(()=>{const save=supa.rpc;supa.rpc=async(name,p)=>{if(name==='set_night_shared_pager_order_v56'&&!window.retryPager){window.retryPager=true;return{error:{message:'Connection failed'}}}return save(name,p)}});
 for(const [i,name] of ['Shaun','Michael G','Andre','Michael D'].entries())await page.locator(`[data-shared-pager-index="${i}"]`).selectOption(name);
 await page.locator('[data-shared-pager-save]').click();await expect(page.locator('#toast')).toContainText('Shared Pager order could not be saved');await expect(page.locator('#sharedPagerEditor .sharedPagerEditorStatus')).toContainText('could not be saved');await expect(page.locator('[data-shared-pager-index="2"]')).toHaveValue('Andre');
 await page.locator('[data-shared-pager-save]').click();await expect(page.locator('#toast')).toContainText('Shared Pager order saved for everyone');await page.evaluate(()=>show('today'));
 await expect(page.locator('.personalPagerBrief')).toContainText('Your Pager · turn 3');await expect(page.locator('.personalPagerBrief')).toContainText('03:00–05:00');
 await page.locator('.personalPagerBrief').click();await expect(page.locator('#sharedPagerEditor')).toBeVisible();
 await page.evaluate(()=>show('breaks'));await expect(page.locator('#breakPersonalSummary')).toContainText('First break · provisional');
});

for(const count of [5,6,7])test(`normal ${count}-nurse night has one visible plan and direct actions @iphone`,async({page})=>{
 await page.setViewportSize({width:390,height:844});await openReview(page);
 await page.evaluate(({periods,count})=>{
  rotationVersions=periods;schemaVersion=57;rebuildCalculatedRoster();idx=R.findIndex(r=>r.date==='2026-10-28');
  appNow=()=>new Date('2026-10-28T23:30:00Z');nightChanges={};nightOvertime={};nightRoleOverrides={};
  if(count>5)nightOvertime[cur().date]=Array.from({length:count-5},(_,i)=>({id:i+101,nurse_name:'Cover Nurse '+(i+1),allocation_key:i===0?'reliever':'seventh'}));
  if(count===7)seventhDecisionDrafts[cur().date]='overtime';
  render();show('today');
 },{periods,count});
 const team=page.locator('.nightTeamDetails');await expect(team).toHaveAttribute('open','');
 await expect(page.locator('#modeStatus')).toContainText(`${count} nurses`);
 await expect(page.locator('#roles')).toContainText('00:00–03:30');await expect(page.locator('#roles')).toContainText('03:30–07:00');
 await expect(page.locator('#roles')).toContainText('Second break');await expect(page.locator('#roles')).toContainText('First break');
 await expect(page.locator('#nightClockChange')).toBeEmpty();
 if(count===5){await expect(page.locator('#fiveArrangement')).toContainText('Full night');await expect(page.locator('#nightStatusRow')).toContainText('Plan ready')}
 await page.evaluate(()=>show('changes'));await page.locator('#continueToAllocationBtn').click();await page.locator('.nightRoleEditor summary').click();
 await expect(page.locator('.nightRoleEditor')).toHaveAttribute('open','');
 await expect(page.locator('[data-night-role="first1"]')).toBeVisible();await expect(page.locator('.roleDutyHint').first()).toContainText('00:00–03:30');
 await page.getByRole('button',{name:'Close assignments',exact:true}).click();
 await page.evaluate(()=>performQuickAction('absence'));await expect(page.getByRole('dialog',{name:'Add absence',exact:true})).toBeVisible();
 await page.getByRole('button',{name:'Close Add absence',exact:true}).click();
 await page.evaluate(()=>performQuickAction('overtime'));await expect(page.getByRole('dialog',{name:'Add overtime nurse',exact:true})).toBeVisible();
 await page.getByRole('button',{name:'Close Add overtime nurse',exact:true}).click();
 await page.evaluate(()=>performQuickAction('breaks'));await expect(page.locator('#breakList')).toContainText('First break');
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
 await page.evaluate(()=>show('today'));await page.screenshot({path:`/tmp/unified-normal-${count}.png`,fullPage:true});
});

for(const theme of ['light','dark'])test(`seven nurses share Pager cover in ${theme} mode`,async({page},info)=>{
 await openReview(page);
 await page.evaluate(({periods,theme})=>{
  rotationVersions=periods;schemaVersion=57;rebuildCalculatedRoster();
  idx=R.findIndex(r=>r.date==='2026-11-21');
  const base=cur();
  localStorage.setItem('anaes_my_name',base.pager);
  currentUserProfile.display_name=professionalName(base.pager);
  nightOvertime[base.date]=[
   {id:'pager-2',nurse_name:'Second Cover Nurse',allocation_key:'reliever'},
   {id:'pager-3',nurse_name:'Third Cover Nurse',allocation_key:null}
  ];
  setThemePreference(theme);render();show('changes');setChangesStep('allocation',false);
 },{periods,theme});
 await expect(page.getByRole('region',{name:'Seven-nurse assignments'})).toContainText('The draw only decides which of the three Pager nurses takes each turn.');
 await expect(page.locator('[data-final-allocation="seventh"]')).toHaveCount(0);
 await expect(page.locator('[data-seventh-decision]')).toHaveCount(0);
 await page.evaluate(()=>{
  nightOvertime[cur().date][1].allocation_key='seventh';
  render();show('today');
 });
 await expect(page.locator('#personalNightCard')).toContainText('Shared Labour Ward / Pager');
 await expect(page.locator('#personalNightCard')).toContainText('Third Cover Nurse');
 await expect(page.locator('#personalNightCard')).toContainText('23:30–02:00');
 const pagerTimeline=page.getByRole('region',{name:'Pager timeline'});
 await expect(pagerTimeline.locator('li b')).toHaveText(['23:30–02:00','02:00–04:30','04:30–07:00']);
 await expect(page.locator('#roles')).toContainText('00:00–03:30');
 await expect(page.locator('#today')).toContainText('Second Cover Nurse');
 await page.screenshot({path:`/tmp/three-way-pager-${info.project.name}-${theme}.png`,fullPage:true});
 await page.evaluate(()=>show('breaks'));
 await expect(page.locator('#breaks')).toContainText('Third Cover Nurse');
 await expect(page.locator('#breaks')).toContainText('04:30–07:00');
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
});


for(const count of [5,6])test(`Pager timeline starts at midnight with ${count} nurses`,async({page})=>{
 await openReview(page);
 await page.evaluate(({periods,count})=>{
  rotationVersions=periods;schemaVersion=57;rebuildCalculatedRoster();
  idx=R.findIndex(r=>r.date==='2026-11-21');
  const base=cur();
  localStorage.setItem('anaes_my_name',base.pager);
  currentUserProfile.display_name=professionalName(base.pager);
  nightOvertime[base.date]=count===6?[{id:'pager-2',nurse_name:'Second Cover Nurse',allocation_key:'reliever'}]:[];
  if(count===6)labourOrders[base.date]={first_part_name:base.pager,second_part_name:'Second Cover Nurse'};
  render();show('today');
 },{periods,count});
 const pagerTimeline=page.getByRole('region',{name:'Pager timeline'});
 await expect(pagerTimeline.locator('li b')).toHaveText(count===5?['00:00–07:00']:['00:00–03:30','03:30–07:00']);
 await expect(page.locator('#roles')).toContainText('00:00–03:30');
});

for (const reducedMotion of ['no-preference','reduce']) test(`Pager tombola saves one draw with motion ${reducedMotion}`, async ({page},info) => {
 await page.emulateMedia({reducedMotion});
 await openReview(page);
 await page.evaluate(periods=>{
   rotationVersions=periods; schemaVersion=EXPECTED_SCHEMA_VERSION; rebuildCalculatedRoster();
   idx=R.findIndex(r=>r.date==='2026-11-21');
   const date=cur().date;
   nightOvertime[date]=[
     {id:'cover-a',nurse_name:'Cover Nurse One',allocation_key:'reliever'},
     {id:'cover-b',nurse_name:'Cover Nurse Two',allocation_key:'seventh'}
   ];
   window.beforeDraw=applyChanges(cur());
   window.pagerWriteCount=0;
   runRosterMutation=(_key,commit)=>commit('fixture-operation',0);
   supa.rpc=async (name, args)=>{
     if(name!=='apply_night_role_override_v57')return{data:[],error:null};
     window.pagerWriteCount++;
     const {p_assignments:assignments,p_override_reason:reason}=args;
     nightRoleOverrides[date]={assignments,reason};
     return{data:null,error:null};
   };
   loadSharedData=async()=>{render();return true};
   notifyRosterUpdate=()=>{};
   render();show('today');
 },periods);
 const opener=page.locator('#nightPagerAction').getByRole('button',{name:/Pager draw/});
 await opener.click();
 const sheet=page.getByRole('dialog',{name:'Pager draw'});
 const closeButton=sheet.getByRole('button',{name:'Close Pager draw'});
 const closeBounds=await closeButton.boundingBox();
 expect(closeBounds.width).toBeCloseTo(44,0);
 expect(closeBounds.height).toBeCloseTo(44,0);
 await expect(sheet.locator('.pagerDrawTurnTime strong')).toHaveText(['23:30–02:00','02:00–04:30','04:30–07:00']);
 await expect(sheet.locator('.pagerDrawTurnName')).toHaveText(['Awaiting draw','Awaiting draw','Awaiting draw']);
 await sheet.getByRole('button',{name:'Sound on'}).click();
 await sheet.getByRole('button',{name:'Draw Pager times',exact:true}).click();
 if(reducedMotion==='no-preference'){
   await expect(sheet.locator('.isSpinning')).toBeVisible();
   await sheet.screenshot({path:`/tmp/pager-draw-${info.project.name}.png`});
 }
 await expect(sheet.getByRole('status')).toHaveText('Saved',{timeout:12000});
 const expected=await page.evaluate(()=>['pager','reliever','seventh'].map(key=>professionalName(nightRoleOverrides[cur().date].assignments[key])));
 await expect(sheet.locator('.pagerDrawTurnName')).toHaveText(expected);
 expect(await page.evaluate(()=>['first1','first2','second1','second2'].every(key=>window.beforeDraw[key]===nightRoleOverrides[cur().date].assignments[key]))).toBeTruthy();
 expect(await page.evaluate(()=>window.pagerWriteCount)).toBe(1);
 await sheet.getByRole('button',{name:'Done',exact:true}).click();
 await page.getByRole('button',{name:/View draw result/}).click();
 await expect(sheet.locator('.pagerDrawTurnName')).toHaveText(expected);
 await expect(sheet.getByRole('button',{name:'Draw Pager times',exact:true})).toHaveCount(0);
});

test('one absence and two overtime save the agreed six-nurse Pager order with cover',async({page},info)=>{
 await openReview(page);
 await page.evaluate(periods=>{
   rotationVersions=periods; schemaVersion=EXPECTED_SCHEMA_VERSION; rebuildCalculatedRoster();
   idx=R.findIndex(r=>r.date==='2026-11-21');
   const base=cur();
   nightChanges[base.date]=[{id:'away',absent_name:base.first1,reason:'Leave'}];
   nightOvertime[base.date]=[
     {id:'cover-a',nurse_name:'Overtime A',allocation_key:null},
     {id:'cover-b',nurse_name:'Overtime B',allocation_key:null}
   ];
   nightRoleOverrides[base.date]={reason:'Pager tombola draw',assignments:{
     mode:'7',first1:'Overtime B',first2:base.first2,second1:base.second1,second2:base.second2,
     pager:'Departed Pager',reliever:'Overtime A',seventh:base.pager
   }};
   runRosterMutation=(_key,commit)=>commit('fixture-operation',0);
   supa.rpc=async (name,args)=>{
     if(name!=='finalise_night_plan_v49')return{data:[],error:null};
     nightOvertime[base.date].forEach(record=>{
       record.allocation_key=Object.keys(args.p_assignments).find(key=>args.p_assignments[key]===record.id)||null;
     });
     if(args.p_labour_first)labourOrders[base.date]={first_part_name:args.p_labour_first,second_part_name:args.p_labour_second};
     nightPlanStatuses[base.date]={published_at:new Date().toISOString(),revision:args.p_expected_revision+1};
     return{data:{},error:null};
   };
   loadSharedData=async()=>{render();return true};
   notifyRosterUpdate=()=>{};
   render();show('today');
 },periods);
 await expect(page.locator('#nightStatusRow')).toContainText('5 rostered − 1 absent + 2 overtime = 6 working');
 await expect(page.locator('#nightRoleOverrideStep')).not.toContainText('Night-only roles are active');
 await expect(page.locator('#roles')).toContainText('Pager draw opens when seven nurses are working');
 await page.evaluate(()=>show('changes'));await page.locator('#continueToAllocationBtn').click();
 const save=page.getByRole('button',{name:'Save assignments'});
 await expect(save).toBeDisabled();
 await page.locator('[data-final-allocation="first1"]').selectOption('cover-a');
 await page.locator('[data-final-allocation="reliever"]').selectOption('cover-a');
 await expect(save).toBeDisabled();
 await page.locator('[data-final-allocation="reliever"]').selectOption('cover-b');
 await expect(save).toBeDisabled();
 await expect(page.locator('#changesAvailableParts')).not.toContainText('Labour Ward / Reliever');
 const pagerFirst=page.getByLabel('Shared Pager · First Part');
 await expect(pagerFirst).toHaveValue('');
 expect(await pagerFirst.evaluate(node=>node.getBoundingClientRect().height)).toBeGreaterThanOrEqual(44);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
 await page.locator('#twoNursePagerOrder').screenshot({path:info.outputPath('shared-pager-parts.png')});
 await pagerFirst.selectOption('Overtime B');
 await expect(page.locator('#twoNursePagerSecond')).toContainText('Second Part');
 await expect(save).toBeEnabled();
 await expect(page.getByRole('button',{name:'Review and share',exact:true})).toBeHidden();
 await save.click();
 await expect(save).toBeHidden();
 await expect(page.locator('#coverAssignmentsHeading')).toHaveText('Agree Pager parts');
 await expect(pagerFirst).toHaveValue('Overtime B');
 expect(await page.evaluate(()=>labourOrders[cur().date].first_part_name)).toBe('Overtime B');
 await page.evaluate(()=>{render();show('today')});
 await expect(page.locator('#roles')).toContainText('Overtime B');
 await expect(page.locator('#roles')).toContainText('00:00–03:30');
 await page.evaluate(()=>show('breaks'));
 await expect(page.locator('#breakList')).toContainText('Overtime B');
 await page.evaluate(()=>{
   nightOvertime[cur().date].forEach(record=>record.allocation_key=null);
   nightOvertime[cur().date].push({id:'cover-c',nurse_name:'Overtime C',allocation_key:null});
   render();show('today');
 });
 await expect(page.locator('#nightStatusRow')).toContainText('5 rostered − 1 absent + 3 overtime = 7 working');
 await expect(page.locator('#nightStatusRow')).not.toContainText('Available parts');
 await page.getByRole('button',{name:/Assignments/}).click();
 await expect(page.locator('#changesAvailableParts')).toBeEmpty();
 await expect(page.locator('[data-final-allocation]')).toHaveCount(1);
 const proceed=page.getByRole('button',{name:'Save assignments'});
 await expect(proceed).toBeDisabled();
 await page.locator('[data-final-allocation="first1"]').selectOption('cover-c');
 await proceed.click();
 expect(await page.evaluate(()=>nightOvertime[cur().date].find(entry=>entry.id==='cover-c').allocation_key)).toBe('first1');
 await expect(page.getByRole('dialog',{name:'Pager draw'})).toBeHidden();await page.locator('#assignmentSheet').getByRole('button',{name:'Continue to Pager draw',exact:true}).click();await expect(page.getByRole('dialog',{name:'Pager draw'})).toBeVisible();
});

async function sevenAssignmentFixture(page,{absence=false,fail=false}={}){
 await openReview(page);
 await page.evaluate(({periods,absence,fail})=>{
  rotationVersions=periods;schemaVersion=EXPECTED_SCHEMA_VERSION;rebuildCalculatedRoster();idx=R.findIndex(r=>r.date==='2026-11-25');
  const base=cur(),date=base.date;
  nightOvertime[date]=[{id:'one',nurse_name:'Daniel Santucci'},{id:'two',nurse_name:'Andre Seychell'}];
  if(absence){nightChanges[date]=[{id:'absent',absent_name:base.first1,reason:'Leave'}];nightOvertime[date].push({id:'three',nurse_name:'Third Cover Nurse'});}
  window.assignmentWrites=0;window.pagerWrites=0;window.assignmentBefore=Object.fromEntries(['first1','first2','second1','second2'].map(k=>[k,base[k]]));
  runRosterMutation=(_key,commit)=>commit('fixture-operation',0);
  supa.rpc=async(name,args)=>{
   if(fail)return{data:null,error:{message:'Fixture save unavailable',code:'XX000'}};
   if(name==='finalise_night_plan_v49'){
    window.assignmentWrites++;
    for(const [key,id]of Object.entries(args.p_assignments||{}))nightOvertime[date].find(r=>r.id===id).allocation_key=key;
    nightPlanStatuses[date]={published_at:new Date().toISOString(),revision:1};return{data:null,error:null};
   }
   if(name==='apply_night_role_override_v57'){
    window.pagerWrites++;nightRoleOverrides[date]={assignments:args.p_assignments,reason:args.p_override_reason};return{data:null,error:null};
   }
   return{data:[],error:null};
  };
  readStoredAllocations=async()=>({matches:true,error:null});loadSharedData=async()=>{render();return true};notifyRosterUpdate=()=>{};
  render();show('changes');
 },{periods,absence,fail});
}
for(const theme of ['light','dark'])for(const width of [320,440,1280])test(`seven-person overtime review explains and saves assignments ${theme} ${width}px @iphone`,async({page},info)=>{
 await page.setViewportSize({width,height:956});await page.emulateMedia({reducedMotion:'reduce'});await sevenAssignmentFixture(page);await page.evaluate(theme=>setThemePreference(theme),theme);
 await expect(page.locator('#changesWorkflowState')).toHaveText('Review the 7 assignments');
 await expect(page.locator('#overtimeList')).not.toContainText('Unassigned');
 await expect(page.locator('#overtimeList')).toContainText('Proposed Pager team · not saved');
 await page.getByRole('button',{name:'Assignments'}).click();
 expect((await page.locator('#assignmentSheet').boundingBox()).width).toBeCloseTo(width<=600?width:600,0);
 expect(await page.locator('.assignmentSheetHeader').evaluate(el=>({image:getComputedStyle(el).backgroundImage,shadow:getComputedStyle(el).boxShadow,radius:getComputedStyle(el).borderRadius}))).toEqual({image:'none',shadow:'none',radius:'0px'});
 const review=page.getByRole('region',{name:'Seven-nurse assignments'});
 await expect(review).toContainText('Proposed assignments · not saved yet');
 await expect(review.locator('dd span')).toHaveCount(7);
 await expect(review).toContainText('Daniel Santucci');await expect(review).toContainText('Andre Seychell');
 expect(await page.locator('#changesAllocationPane').evaluate(el=>el.scrollWidth<=el.clientWidth+1)).toBe(true);
 await review.screenshot({path:info.outputPath('seven-assignment-review.png')});
 await page.getByRole('button',{name:'Save assignments'}).click();
 const sheet=page.getByRole('dialog',{name:'Pager draw'});await expect(sheet).toBeHidden();await expect(page.locator('#assignmentSheet')).toBeVisible();await page.locator('#assignmentSheet').getByRole('button',{name:'Continue to Pager draw',exact:true}).click();await expect(sheet).toBeVisible();
 expect(await page.evaluate(()=>window.assignmentWrites)).toBe(1);expect(await page.evaluate(()=>window.pagerWrites)).toBe(0);
 await expect(sheet).toContainText('Theatre assignments stay unchanged');
 await expect(sheet.locator('.pagerDrawTurnName')).toHaveText(['Awaiting draw','Awaiting draw','Awaiting draw']);
 await sheet.getByRole('button',{name:'Draw Pager times',exact:true}).click();await expect(sheet.getByRole('status')).toHaveText('Saved',{timeout:10000});
 expect(await page.evaluate(()=>window.pagerWrites)).toBe(1);
 expect(await page.evaluate(()=>Object.entries(window.assignmentBefore).every(([key,name])=>nightRoleOverrides[cur().date].assignments[key]===name))).toBe(true);
 await sheet.getByRole('button',{name:'Done',exact:true}).click();await page.evaluate(()=>show('changes'));await page.locator('#continueToAllocationBtn').click();
 await expect(review).toContainText('Pager times are saved');
 await expect(page.locator('#overtimeList button.overtimeAllocateButton')).toHaveCount(0);
});
test('seven-person review updates theatre and Pager proposals from the selected nurse @iphone',async({page})=>{
 await sevenAssignmentFixture(page,{absence:true});await page.locator('#continueToAllocationBtn').click();
 const review=page.getByRole('region',{name:'Seven-nurse assignments'}),save=page.getByRole('button',{name:'Save assignments'});
 await expect(save).toBeDisabled();await expect(review).toContainText('Choose cover above');
 await page.locator('[data-final-allocation="first1"]').selectOption('one');
 await expect(save).toBeEnabled();await expect(review.locator('dl>div').first()).toContainText('Daniel Santucci');
 const pager=review.locator('dl>div').last();await expect(pager).not.toContainText('Daniel Santucci');await expect(pager).toContainText('Andre Seychell');await expect(pager).toContainText('Third Cover Nurse');
 await page.locator('[data-final-allocation="first1"]').selectOption('three');await expect(pager).toContainText('Daniel Santucci');await expect(pager).not.toContainText('Third Cover Nurse');
});
test('failed assignment save retains the review and does not open or run a draw @iphone',async({page})=>{
 await sevenAssignmentFixture(page,{fail:true});await page.locator('#continueToAllocationBtn').click();
 await page.getByRole('button',{name:'Save assignments'}).click();
 await expect(page.getByRole('region',{name:'Seven-nurse assignments'})).toContainText('not saved yet');
 await expect(page.getByRole('dialog',{name:'Pager draw'})).toBeHidden();expect(await page.evaluate(()=>window.pagerWrites)).toBe(0);
 await expect(page.getByRole('button',{name:'Save assignments'})).toBeEnabled();
});

test('theatre and Pager nurses can be swapped after saving and before the draw @iphone',async({page})=>{
 await sevenAssignmentFixture(page);await page.locator('#continueToAllocationBtn').click();const first=await page.evaluate(()=>professionalName(cur().first1));
 await page.getByRole('button',{name:'Save assignments'}).click();
 const sheet=page.getByRole('dialog',{name:'Pager draw'});await expect(sheet).toBeHidden();
 await page.locator('.nightRoleEditor summary').click();
 const editor=page.locator('.nightRoleEditor');await expect(editor).toHaveAttribute('open','');
 await page.locator('[data-night-role="first1"]').selectOption('Daniel Santucci');
 await page.locator('#nightRoleReason').fill('Agreed theatre cover');await page.locator('#saveNightRolesBtn').click();
 const review=page.getByRole('region',{name:'Seven-nurse assignments'});
 await expect(review.locator('dl>div').first()).toContainText('Daniel Santucci');
 await expect(review.locator('dl>div').last()).toContainText(first);await expect(review.locator('dl>div').last()).not.toContainText('Daniel Santucci');
 expect((await page.locator('#continueToAllocationBtn').boundingBox()).width).toBeGreaterThanOrEqual(44);
 await page.locator('#assignmentSheet').getByRole('button',{name:'Continue to Pager draw',exact:true}).click();await expect(sheet).toBeVisible();
 await expect(sheet.locator('.pagerDrawToken')).toContainText([first,'Andre Seychell']);
 expect(await page.evaluate(()=>nightRoleOverrides[cur().date].reason)).toBe('Agreed theatre cover');
 await expect(sheet.getByRole('status')).toHaveText('Ready to draw');
});
test('duplicate theatre choices cannot be saved in the seven-nurse review @iphone',async({page})=>{
 await sevenAssignmentFixture(page,{absence:true});await page.locator('#continueToAllocationBtn').click();
 await page.evaluate(()=>{nightChanges[cur().date].push({id:'second',absent_name:cur().first2,reason:'Leave'});nightOvertime[cur().date].push({id:'four',nurse_name:'Fourth Nurse'});render()});
 await page.locator('[data-final-allocation="first1"]').selectOption('one');await page.locator('[data-final-allocation="first2"]').selectOption('one');
 await expect(page.getByRole('button',{name:'Save assignments'})).toBeDisabled();
 expect(await page.evaluate(()=>window.assignmentWrites)).toBe(0);
});

test('Assignments is the only Changes entry and closing preserves cover choices @iphone',async({page})=>{
 await sevenAssignmentFixture(page,{absence:true});
 const entry=page.locator('#continueToAllocationBtn'),sheet=page.getByRole('dialog',{name:'Assignments',exact:true});
 await expect(sheet).toBeHidden();await expect(entry).toHaveCount(1);
 await expect(page.locator('#overtimeList .overtimeAllocateButton')).toHaveCount(0);
 await expect(page.locator('#changes .staffingNextLink')).toHaveCount(0);
 await entry.click();await expect(sheet).toBeVisible();await expect(page.locator('#nightRoleOverrideStep')).toBeHidden();
 await page.locator('[data-final-allocation="first1"]').selectOption('one');
 await expect(sheet.getByRole('button',{name:'Save assignments',exact:true})).toHaveCount(1);
 await page.keyboard.press('Escape');await expect(sheet).toBeHidden();await expect(entry).toBeFocused();
 await entry.click();await expect(page.locator('[data-final-allocation="first1"]')).toHaveValue('one');
 await page.getByRole('button',{name:'Close assignments',exact:true}).click();await expect(entry).toBeFocused();
 await page.evaluate(()=>showQuickActions());await expect(page.getByRole('button',{name:'Swap assignments'})).toHaveCount(0);
 await page.getByRole('button',{name:'Open Changes',exact:true}).click();await expect(sheet).toBeHidden();await expect(entry).toBeVisible();
});

test('one optional editor replaces the saved review and Cancel discards only its draft @iphone',async({page})=>{
 await sevenAssignmentFixture(page);await page.locator('#continueToAllocationBtn').click();
 await page.getByRole('button',{name:'Save assignments',exact:true}).click();
 await page.locator('.nightRoleEditor summary').click();
 const sheet=page.locator('#assignmentSheet');await expect(sheet.getByRole('button',{name:'Continue to Pager draw',exact:true})).toBeHidden();
 await page.locator('[data-night-role="first1"]').selectOption('Daniel Santucci');
 await page.locator('#nightRoleReason').fill('Draft only');
 await expect(sheet.getByRole('button',{name:'Save assignments',exact:true})).toHaveCount(1);
 await page.keyboard.press('Escape');await expect(page.locator('#changesWorkflowState')).toHaveText('Unsaved assignment changes');await page.locator('#continueToAllocationBtn').click();
 await expect(page.locator('#nightRoleReason')).toHaveValue('Draft only');
 await sheet.getByRole('button',{name:'Cancel editing',exact:true}).click();
 await expect(sheet.getByRole('button',{name:'Continue to Pager draw',exact:true})).toBeVisible();
 expect(await page.evaluate(()=>window.assignmentWrites)).toBe(1);expect(await page.evaluate(()=>window.pagerWrites)).toBe(0);
 expect(await page.evaluate(()=>!!nightRoleOverrideDrafts[cur().date])).toBe(false);
});

test('the standard five-nurse sheet shows the current team without an unnecessary save @iphone',async({page})=>{
 await sevenAssignmentFixture(page);await page.evaluate(()=>{nightOvertime={};render()});
 await page.locator('#continueToAllocationBtn').click();
 const sheet=page.locator('#assignmentSheet');await expect(sheet.getByRole('region',{name:'Current assignments'})).toContainText('Full-night Labour Ward / Pager');
 await expect(sheet.getByRole('button',{name:'Save assignments',exact:true})).toHaveCount(0);
 await expect(sheet.locator('.nightRoleEditor summary')).toContainText('Edit assignments');
 await expect(page.locator('#roles button.rosterRow')).toHaveCount(0);
 await page.getByRole('button',{name:'Close assignments',exact:true}).click();await page.evaluate(()=>show('today'));
 await page.locator('.roleShortcutButton').first().click();await expect(page.locator('.productColleagueMenu')).toBeVisible();
});

test('Assignments keeps Close and Save reachable at doubled text size @iphone',async({page},info)=>{
 await page.setViewportSize({width:320,height:640});await sevenAssignmentFixture(page);
 await page.addStyleTag({content:'#assignmentSheet{--unified-type-title:48px;--unified-type-body:34px;--unified-type-caption:28px}'});
 await page.locator('#continueToAllocationBtn').click();
 const close=page.getByRole('button',{name:'Close assignments',exact:true}),save=page.locator('#assignmentSheet').getByRole('button',{name:'Save assignments',exact:true});
 const first=await close.boundingBox();expect(first.y).toBeGreaterThanOrEqual(0);expect(first.x+first.width).toBeLessThanOrEqual(320);expect(first.height).toBeGreaterThanOrEqual(44);
 await save.scrollIntoViewIfNeeded();const box=await save.boundingBox();expect(box.y+box.height).toBeLessThanOrEqual(641);
 expect(await page.locator('#assignmentSheet').evaluate(el=>el.scrollWidth<=el.clientWidth+1)).toBe(true);
 await page.locator('#assignmentSheet').screenshot({path:info.outputPath('assignments-large-text.png')});
 await close.click();await expect(page.locator('#assignmentSheet')).toBeHidden();
});

test('offline assignments explain why saving is disabled and retain selections @iphone',async({page})=>{
 await sevenAssignmentFixture(page,{absence:true});await page.locator('#continueToAllocationBtn').click();
 await page.locator('[data-final-allocation="first1"]').selectOption('one');
 await page.context().setOffline(true);await expect(page.locator('#assignmentConnection')).toContainText('Offline');
 await expect(page.locator('#saveCoverAllocationsBtn')).toBeDisabled();await expect(page.locator('[data-final-allocation="first1"]')).toHaveValue('one');
 await page.context().setOffline(false);await expect(page.locator('#assignmentConnection')).toBeHidden();
 await expect(page.locator('#saveCoverAllocationsBtn')).toBeEnabled();expect(await page.evaluate(()=>window.assignmentWrites)).toBe(0);
});

test('a retained role draft cannot hide newly required cover @iphone',async({page})=>{
 await sevenAssignmentFixture(page);
 await page.evaluate(()=>{const r=cur();nightRoleOverrideDrafts[r.date]={assignments:{mode:'7',first1:r.first1,first2:r.first2,second1:r.second1,second2:r.second2,pager:r.pager,reliever:'Daniel Santucci',seventh:'Andre Seychell'},reason:'Earlier draft'};render()});
 await page.locator('#continueToAllocationBtn').click();await expect(page.locator('#nightRoleOverrideStep')).toBeHidden();
 await expect(page.getByRole('region',{name:'Seven-nurse assignments'})).toBeVisible();await expect(page.locator('#saveCoverAllocationsBtn')).toBeVisible();
});

test('an assignment save locks edits and Cancel until its verified result @iphone',async({page})=>{
 await sevenAssignmentFixture(page);await page.locator('#continueToAllocationBtn').click();await page.getByRole('button',{name:'Save assignments',exact:true}).click();
 await page.locator('.nightRoleEditor summary').click();await page.locator('[data-night-role="first1"]').selectOption('Daniel Santucci');await page.locator('#nightRoleReason').fill('Agreed theatre cover');
 await page.evaluate(()=>{const original=supa.rpc;supa.rpc=(name,args)=>name==='apply_night_role_override_v57'?new Promise(resolve=>{window.releaseAssignmentSave=async()=>resolve(await original(name,args))}):original(name,args)});
 await page.locator('#saveNightRolesBtn').click();
 await expect(page.getByRole('button',{name:'Cancel editing',exact:true})).toBeDisabled();await expect(page.locator('[data-night-role="first1"]')).toBeDisabled();await expect(page.locator('#nightRoleReason')).toBeDisabled();
 await page.evaluate(()=>updateOfflineControls());await expect(page.locator('#saveNightRolesBtn')).toBeDisabled();
 await page.getByRole('button',{name:'Close assignments',exact:true}).click();await page.locator('#continueToAllocationBtn').click();await expect(page.getByRole('button',{name:'Cancel editing',exact:true})).toBeDisabled();
 await page.evaluate(()=>window.releaseAssignmentSave());await expect(page.locator('.nightRoleEditor')).not.toHaveAttribute('open','');expect(await page.evaluate(()=>window.pagerWrites)).toBe(1);
});
