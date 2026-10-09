const {test,expect}=require('@playwright/test');
const {openReview}=require('./helpers/product-review');
const periods=require('./fixtures/establishment-periods.json');
test.beforeEach(async({page})=>{page.on('pageerror',error=>console.log('Roster review page error:',error.message))});
test.afterEach(async({page},info)=>{if(info.status!==info.expectedStatus)console.log('Roster review state:',await page.evaluate(()=>({error:byId('teamPeriodError').textContent,date:byId('teamEffectiveDate').value,size:byId('teamBaseSize').value,names:Object.keys(TEAM_SLOT_INPUTS).map(k=>byId(TEAM_SLOT_INPUTS[k]).value),notes:byId('teamPeriodNotes').value,previewEnabled:!byId('saveTeamVersionBtn').disabled,previewHandler:typeof byId('saveTeamVersionBtn').onclick,dirty:teamEditorDirty})))})
for(const theme of ['light','dark'])test(`effective establishment and future-period preview ${theme}`,async({page},testInfo)=>{
 await openReview(page);
 await page.evaluate(({periods,theme})=>{
  appNow=()=>new Date('2026-10-09T08:00:00Z');
  rotationVersions=periods;schemaVersion=56;rebuildCalculatedRoster();idx=R.findIndex(r=>r.date==='2026-10-12');
  currentUserProfile.user_role='admin';setThemePreference(theme);render();
 },{periods,theme});
 await expect(page.locator('#modeStatus')).toHaveText('5 nurses');
 expect(await page.evaluate(()=>Array.from({length:6},(_,i)=>calculateNight(addDays('2026-10-12',i*4)).pager))).toEqual(['Andre','Michael G','James','Shaun','Michael D','Andre']);
 await expect(page.locator('#personalNightCard')).toContainText('Full-night cover');
 await page.evaluate(()=>show('changes'));
 expect(await page.evaluate(()=>workflowNeedsConfirmation(cur(),0))).toBe(false);
 await page.evaluate(()=>show('breaks'));
 await expect(page.locator('#breaks')).toContainText('André Bartolo');
 await page.evaluate(()=>{show('admin');switchAdminTab('team',false)});
 await expect(page.locator('#teamBaseSize')).toHaveValue('5');
 await expect(page.locator('#teamEffectiveDate')).toHaveValue('2026-10-16');
 await expect(page.locator('#teamEffectiveDate').locator('..').locator('.rosterDateText')).toBeVisible();
 await expect(page.locator('#teamEffectiveDate').locator('..').locator('.rosterDateText')).toContainText('16');
 await page.locator('#teamBaseSize').selectOption('6');
 await page.locator('#teamSlotReliever').fill('New Nurse');
 await page.locator('#teamPeriodNotes').fill('New nurse joins the permanent team');
 await page.locator('#saveTeamVersionBtn').click();
 await expect(page.locator('#teamChangePreview')).toContainText('Joining: New Nurse');
 await expect(page.locator('#teamChangePreview .previewRow')).toHaveCount(7);
 await expect(page.locator('#teamChangePreview')).toContainText('Reliever: New Nurse');
 const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+2);
 expect(overflow).toBe(false);
 await page.screenshot({path:`/tmp/establishment-${testInfo.project.name}-${theme}.png`,fullPage:true});
 // Changing any field invalidates the concrete preview before confirmation.
 await page.locator('#teamSlotPager').fill('James');
 await expect(page.locator('#confirmTeamVersionBtn')).toHaveCount(0);
});

for(const theme of ['light','dark'])test(`membership changes preserve history and form details ${theme} @iphone`,async({page},testInfo)=>{
 await openReview(page);
 await page.evaluate(({periods,theme})=>{
  appNow=()=>new Date('2026-10-09T08:00:00Z');rotationVersions=periods;schemaVersion=56;rebuildCalculatedRoster();idx=R.findIndex(r=>r.date==='2026-10-12');currentUserProfile.user_role='admin';setThemePreference(theme);render();show('admin');switchAdminTab('team',false);
  window.reviewCalls=[];window.reviewBefore=JSON.parse(JSON.stringify(R));
  runRosterMutation=async(key,execute)=>execute('review-operation',0);
  supa.rpc=async(name,p)=>{if(name!=='upsert_rotation_version_v49')return{data:[],error:null};window.reviewCalls.push({name,p});rotationVersions.push({effective_from:p.p_effective_from,base_size:p.p_reliever===null?5:6,first1:p.p_first1,first2:p.p_first2,second1:p.p_second1,second2:p.p_second2,pager:p.p_pager,reliever:p.p_reliever,seventh_anchor:p.p_seventh_anchor,seventh_cycle:p.p_seventh_cycle,notes:p.p_notes});return{error:null}};
  loadSharedData=async()=>{rebuildCalculatedRoster();render();return true};
 },{periods,theme});
 expect(await page.locator('#teamRosterNames').innerHTML()).not.toContain('Yentl');
 await page.locator('#teamSlotFirst1').fill('New Nurse');await page.locator('#teamPeriodNotes').fill('Member replacement');
 await page.locator('#teamNextNightBtn').click();
 await expect(page.locator('#teamSlotFirst1')).toHaveValue('New Nurse');await expect(page.locator('#teamPeriodNotes')).toHaveValue('Member replacement');
 await page.locator('#saveTeamVersionBtn').click();
 await expect(page.locator('#teamChangePreview')).toContainText('Joining: New Nurse');await expect(page.locator('#teamChangePreview')).toContainText('Leaving: André Bartolo');await expect(page.locator('#teamChangePreview')).toContainText('Pager order');
 await page.screenshot({path:`/tmp/roster-management-${testInfo.project.name}-${theme}.png`,fullPage:true});
 const date=await page.locator('#teamEffectiveDate').inputValue();page.once('dialog',d=>d.accept());await page.locator('#confirmTeamVersionBtn').click();
 await expect(page.locator('#currentTeamSummary')).toContainText('New Nurse');
 expect(await page.evaluate(date=>window.reviewBefore.filter(r=>r.date<date).every(r=>JSON.stringify(r)===JSON.stringify(calculateNight(r.date))),date)).toBe(true);
 expect(await page.evaluate(()=>window.reviewCalls[0].p.p_client_version)).toBe('54.2');
 await page.locator('#teamBaseSize').selectOption('6');await page.locator('#teamSlotReliever').fill('Sixth Nurse');await page.locator('#teamPeriodNotes').fill('Sixth nurse joins');await page.locator('#saveTeamVersionBtn').click();
 await expect(page.locator('#teamChangePreview')).toContainText('Joining: Sixth Nurse');await expect(page.locator('#teamChangePreview')).toContainText('Leaving: None');
 page.once('dialog',d=>d.accept());await page.locator('#confirmTeamVersionBtn').click();await expect(page.locator('#currentTeamSummary')).toContainText('6 permanent nurses');
 const removed=await page.locator('#teamSlotReliever').inputValue();await page.locator('#teamBaseSize').selectOption('5');await expect(page.locator('#teamRelieverField')).toBeHidden();await page.locator('#teamPeriodNotes').fill('Return to five');await page.locator('#saveTeamVersionBtn').click();
 await expect(page.locator('#teamChangePreview')).toContainText('Leaving: '+await page.evaluate(n=>professionalName(n),removed));
 // Realtime changes invalidate the concrete preview without sending a mutation.
 await page.evaluate(()=>rosterSettings.published_until='2028-01-03');await page.locator('#confirmTeamVersionBtn').click();await expect(page.locator('#teamPeriodError')).toContainText('changed');expect(await page.evaluate(()=>reviewCalls.length)).toBe(2);
 // Duplicate and missing names produce an accessible inline error rather than a save action.
 const duplicate=await page.locator('#teamSlotFirst1').inputValue();await page.locator('#teamSlotPager').fill(duplicate);await page.locator('#saveTeamVersionBtn').click();await expect(page.locator('#teamPeriodError')).toContainText('different nurse names');await expect(page.locator('#confirmTeamVersionBtn')).toHaveCount(0);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+2)).toBe(false);
});
