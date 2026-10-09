const {test,expect}=require('@playwright/test');
const {openReview}=require('./helpers/product-review');
const periods=require('./fixtures/establishment-periods.json');
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
