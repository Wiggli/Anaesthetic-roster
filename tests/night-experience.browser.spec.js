const {test,expect}=require('@playwright/test');
const {openReview}=require('./helpers/product-review');
const periods=require('./fixtures/establishment-periods.json');
async function fourNight(page,absence='James',saved=true){
 await openReview(page);
 await page.evaluate(({periods,absence,saved})=>{
  rotationVersions=periods;schemaVersion=57;rebuildCalculatedRoster();idx=R.findIndex(r=>r.date==='2026-10-24');
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
 await expect(page.locator('#reactChangesTab-confirm')).toBeDisabled();
 const slots=page.locator('[data-shared-pager-index]');await expect(slots).toHaveCount(4);
 for(const [i,name] of ['Shaun','Michael G','Andre','Michael D'].entries())await page.locator(`[data-shared-pager-index="${i}"]`).selectOption(name);
 await expect(page.locator('[data-shared-pager-save]')).toBeEnabled();await page.locator('[data-shared-pager-save]').click();
 await expect(page.locator('#changesWorkflowExperience')).toContainText('Four-nurse arrangement recorded');
 await page.evaluate(()=>show('today'));
 const hero=page.locator('#sharedPagerHero');await expect(hero).toContainText('André Bartolo');await expect(hero).toContainText('02:00 OLD');await expect(hero).toContainText('Pager starts at 00:00');
 await expect(page.locator('#personalNightCard')).toContainText('Theatre parts start at 00:00');
 await expect(page.locator('#nightClockChange')).toBeEmpty();
 expect(await hero.locator('.sharedPagerSegments b').evaluateAll(nodes=>nodes.every(n=>getComputedStyle(n).whiteSpace!=='nowrap'&&parseFloat(getComputedStyle(n).fontSize)>=14))).toBe(true);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
 await hero.scrollIntoViewIfNeeded();await page.screenshot({path:`/tmp/night-plan-${width}-${theme}.png`,fullPage:true});
 await page.evaluate(()=>performQuickAction('night-plan'));await expect(page.locator('#nightPlanSummaryDialog')).toContainText('PROVISIONAL · 4 present');await expect(page.locator('#nightPlanSummaryDialog')).toContainText('03:00–05:00');
 await page.locator('#nightPlanSummaryDialog [data-close]').click();
 await hero.locator('[data-edit-theatre-positions]').click();await expect(page.locator('[data-night-role="first1"]')).toBeVisible();
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
 await expect(save).toBeEnabled();await expect(page.locator('#nightRoleReason')).toHaveValue('Agreed cover');
 await expect(page.locator('[data-night-role="first1"]')).toHaveValue('Shaun');
});
test('failed Pager save retains manual order and personal Pager opens its editor @iphone',async({page})=>{
 await fourNight(page);await page.evaluate(()=>{const save=supa.rpc;supa.rpc=async(name,p)=>{if(name==='set_night_shared_pager_order_v56'&&!window.retryPager){window.retryPager=true;return{error:{message:'Connection failed'}}}return save(name,p)}});
 for(const [i,name] of ['Shaun','Michael G','Andre','Michael D'].entries())await page.locator(`[data-shared-pager-index="${i}"]`).selectOption(name);
 await page.locator('[data-shared-pager-save]').click();await expect(page.locator('#toast')).toContainText('Shared Pager order could not be saved');await expect(page.locator('[data-shared-pager-index="2"]')).toHaveValue('Andre');
 await page.locator('[data-shared-pager-save]').click();await expect(page.locator('#toast')).toContainText('Shared Pager order saved for everyone');await page.evaluate(()=>show('today'));
 await expect(page.locator('.personalPagerBrief')).toContainText('Your Pager · turn 3');await expect(page.locator('.personalPagerBrief')).toContainText('03:00–05:00');
 await page.locator('.personalPagerBrief').click();await expect(page.locator('#sharedPagerEditor')).toBeVisible();
 await page.evaluate(()=>show('breaks'));await expect(page.locator('#breakPersonalSummary')).toContainText('First break · provisional');
});
