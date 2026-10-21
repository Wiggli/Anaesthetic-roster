const {test,expect}=require('@playwright/test');
const {openReview}=require('./helpers/product-review');
test.use({serviceWorkers:'block'});
async function fits(page,selector){
 await expect.poll(()=>page.locator(selector).evaluate(el=>el.scrollWidth-el.clientWidth),{message:selector+' must fit after transitions settle'}).toBeLessThanOrEqual(1);
 const r=await page.locator(selector).evaluate(el=>({scroll:el.scrollWidth,width:el.clientWidth,left:el.getBoundingClientRect().left,right:el.getBoundingClientRect().right}));
 expect(r.scroll).toBeLessThanOrEqual(r.width+1);expect(r.left).toBeGreaterThanOrEqual(-1);expect(r.right).toBeLessThanOrEqual((await page.viewportSize()).width+1);
}
for(const width of [320,440])for(const dark of [false,true])for(const enlarged of [false,true])test(`typography reading and phone reflow ${width} ${dark?'dark':'light'} ${enlarged?'large':'normal'} @iphone`,async({page},testInfo)=>{
 test.setTimeout(60000);await page.setViewportSize({width,height:956});await openReview(page);
 await page.waitForFunction(()=>typeof launchFinished!=='undefined'&&launchFinished);
 await page.evaluate(({dark,enlarged})=>{
  prepareAuthorisedShell({...currentUserProfile,active:true});document.getElementById('launchScreen').style.display='none';document.querySelector('main').style.display='block';document.querySelector('.bottom').style.display='grid';
  schemaVersion=EXPECTED_SCHEMA_VERSION;forcedOfflineSession=false;appCompatibility={write_allowed:true,write_status:'allowed'};lastObservedSyncRevision=1;lastSuccessfulSyncAt=new Date().toISOString();clearUpdateNotice();
  currentPrivateProfile.text_scale=enlarged?'xlarge':'standard';
  applyTheme(dark);document.body.dataset.textScale=enlarged?'xlarge':'normal';document.documentElement.style.fontSize=enlarged?'20px':'16px';
  show('today');render();
  window.addEventListener('roster:personal-night',e=>{window.typeReviewModel=e.detail},{once:true});render();
  const model={...window.typeReviewModel,context:'Alexandra Maria Example With A Long Surname',contextLabel:'Colleague'};
  window.dispatchEvent(new CustomEvent('roster:personal-night',{detail:model}));
 },{dark,enlarged});
 const hero=page.locator('#personalNightCard');await expect(hero).toContainText('Alexandra Maria Example');await fits(page,'#personalNightCard');
 expect(await hero.locator('.personalRoleCopy > span').evaluate(el=>parseFloat(getComputedStyle(el).fontSize))).toBeGreaterThanOrEqual(16);
 expect(await hero.locator('.personalHeroFact b').first().evaluate(el=>parseFloat(getComputedStyle(el).fontSize))).toBeGreaterThanOrEqual(16);
 expect(await hero.locator('.personalHeroFact > span').first().evaluate(el=>parseFloat(getComputedStyle(el).fontSize))).toBeGreaterThanOrEqual(14);
 if(width===320){const label=hero.locator('.personalHeroFact').nth(2).locator('small');expect(await label.evaluate(el=>el.clientHeight-parseFloat(getComputedStyle(el).lineHeight))).toBeLessThanOrEqual(1)}
 const facts=await hero.locator('.personalHeroFact').evaluateAll(nodes=>nodes.map(n=>{const r=n.getBoundingClientRect();return{top:r.top,bottom:r.bottom}}));
 expect(facts[2].top).toBeGreaterThanOrEqual(Math.max(facts[0].bottom,facts[1].bottom)-1);
 await hero.screenshot({path:testInfo.outputPath('hero-reading.png'),style:'.bottom,#updateBanner{visibility:hidden!important}'});
 for(const view of ['changes','breaks','chat']){await page.evaluate(view=>show(view),view);await expect(page.locator('#'+view)).toBeVisible();await fits(page,'#'+view)}
 await page.evaluate(()=>show('changes'));await page.locator('#absenceFormExperience .staffingAddButton').click();
 const sheet=page.locator('#absenceFormExperience .staffingSheet');await expect(sheet).toBeVisible();await fits(page,'#absenceFormExperience .staffingSheet');
 for(const input of await sheet.locator('input:not([type=checkbox]),select,textarea').all())expect(await input.evaluate(el=>parseFloat(getComputedStyle(el).fontSize))).toBeGreaterThanOrEqual(16);
 await sheet.screenshot({path:testInfo.outputPath('staffing-reading.png')});await page.keyboard.press('Escape');
 await page.evaluate(()=>{show('roster');renderRoster()});await expect(page.locator('.rosterExperienceCard').first()).toBeVisible();await fits(page,'#roster');
 expect(await page.locator('.rosterRolePill').first().evaluate(el=>parseFloat(getComputedStyle(el).fontSize))).toBeGreaterThanOrEqual(14);
 await page.locator('.rosterExperienceCard').first().screenshot({path:testInfo.outputPath('roster-reading.png'),style:'.bottom,#updateBanner{visibility:hidden!important}'});
 await page.evaluate(()=>{show('today');showQuickActions()});await expect(page.locator('#quickActionsSheet')).toBeVisible();await fits(page,'#quickActionsSheet');
 await page.locator('#quickActionsSheet').screenshot({path:testInfo.outputPath('actions-reading.png')});await page.locator('#closeQuickActionsSheet').click();await expect(page.locator('#quickActionsSheet')).toBeHidden();
 await page.evaluate(()=>{showAccountSheet();showAccountSection('profile')});await expect(page.locator('#profileName')).toBeVisible();await fits(page,'#accountPageOutlet');
 expect(await page.locator('#profileName').evaluate(el=>parseFloat(getComputedStyle(el).fontSize))).toBeGreaterThanOrEqual(16);
 await page.locator('#accountSheet').evaluate(async el=>{await Promise.all(el.getAnimations().map(animation=>animation.finished));await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))});
 await page.screenshot({path:testInfo.outputPath('account-reading.png')});
 await page.locator('#profileName').scrollIntoViewIfNeeded();await expect(page.locator('#profileName')).toBeInViewport();
 await page.locator('#accountPageOutlet').screenshot({path:testInfo.outputPath('account-content-reading.png')});
});

for(const width of [320,440])for(const large of [false,true])test(`compact dock space and safe area ${width} ${large?'large dark':'normal light'} @iphone`,async({page},testInfo)=>{
 await page.emulateMedia({reducedMotion:'reduce'});await page.setViewportSize({width,height:956});await openReview(page);
 await page.evaluate(large=>{
  finishLaunch(false);prepareAuthorisedShell({...currentUserProfile,active:true});
  document.getElementById('launchScreen').style.display='none';document.querySelector('main').style.display='block';document.querySelector('.bottom').style.display='grid';
  currentPrivateProfile.text_scale=large?'xlarge':'standard';applyTheme(large);document.body.dataset.textScale=large?'xlarge':'normal';document.documentElement.style.fontSize=large?'20px':'16px';show('today');render();
 },large);
 for(const safe of [34,0]){
  await page.evaluate(safe=>document.documentElement.style.setProperty('--app-safe-bottom',safe+'px'),safe);
  for(const view of ['today','changes','breaks','chat']){
   await page.locator(`.bottom [data-v="${view}"]`).click();await expect(page.locator('#'+view)).toBeVisible();
   const geometry=await page.locator('.bottom').evaluate(el=>{const box=n=>{const r=n.getBoundingClientRect();return{x:r.x,y:r.y,right:r.right,bottom:r.bottom,width:r.width,height:r.height}};return{dock:box(el),buttons:[...el.querySelectorAll('button')].map(box),labels:[...el.querySelectorAll('button>span:last-child')].map(box),padding:parseFloat(getComputedStyle(document.querySelector('main')).paddingBottom)}});
   expect(geometry.dock.height).toBe(56);expect(geometry.dock.bottom).toBeCloseTo(956-Math.max(safe,4),0);
   expect(geometry.buttons).toHaveLength(5);expect(Math.max(...geometry.buttons.map(b=>b.width))-Math.min(...geometry.buttons.map(b=>b.width))).toBeLessThan(1);
   for(const b of geometry.buttons){expect(b.height).toBeGreaterThanOrEqual(44);expect(b.y).toBeGreaterThanOrEqual(geometry.dock.y);expect(b.bottom).toBeLessThanOrEqual(geometry.dock.bottom)}
   for(const label of geometry.labels)expect(label.bottom).toBeLessThanOrEqual(geometry.dock.bottom);
   expect(geometry.padding).toBeGreaterThanOrEqual(geometry.dock.height+safe+16);
  }
  await page.locator('.bottom [data-v="today"]').click();await page.screenshot({path:testInfo.outputPath(`compact-dock-safe-${safe}.png`)});
 }
 await page.locator('.bottom [data-quick-rudder]').click();await expect(page.locator('#quickActionsSheet')).toBeVisible();await page.locator('#closeQuickActionsSheet').click();await expect(page.locator('#quickActionsSheet')).toBeHidden();
 await page.evaluate(()=>window.scrollTo(0,document.documentElement.scrollHeight));await page.screenshot({path:testInfo.outputPath('compact-dock-page-end.png')});
});
