const {test,expect}=require('@playwright/test');
async function ready(page,fallback=false){
 if(fallback)await page.route('**/navigation-*.js',route=>route.abort());
 await page.route('https://cdn.jsdelivr.net/**',route=>route.fulfill({contentType:'application/javascript',body:'window.supabase={createClient(){return null}}'}));
 await page.goto('/index.html');
 await page.evaluate(()=>{
 document.body.classList.remove('authPending');document.getElementById('launchScreen').style.display='none';
 document.getElementById('authGate').classList.add('hidden');document.querySelector('main').style.display='block';
 document.querySelector('.bottom').style.display='grid';currentUserProfile={display_name:'Review Nurse',email:'review@example.test',user_role:'member'};
 currentPrivateProfile={profile_name:'Review Nurse'};localStorage.setItem('anaes_my_name','Andre');schemaVersion=53;
 supa={rpc:async()=>({data:[],error:null})};appCompatibility={write_allowed:true,write_status:'allowed'};rebuildCalculatedRoster();idx=R.findIndex(r=>r.date==='2026-10-08');render();show('today');
 });
 if(!fallback)await expect(page.locator('[data-react-navigation]')).toBeVisible();
}
for(const width of [320,360,390,412,430])for(const dark of [false,true]){
 test('dock, Actions and onboarding '+width+' '+(dark?'dark':'light')+' @iphone',async({page},testInfo)=>{
 await page.setViewportSize({width,height:844});await ready(page);
 await page.evaluate(d=>{document.body.classList.toggle('dark',d);document.documentElement.dataset.theme=d?'dark':'light'},dark);
 const boxes=await page.locator('.bottom button').evaluateAll(nodes=>nodes.map(n=>{const r=n.getBoundingClientRect();return{x:r.x,y:r.y,w:r.width,h:r.height,right:r.right}}));
 expect(boxes).toHaveLength(5);expect(Math.max(...boxes.map(b=>b.w))-Math.min(...boxes.map(b=>b.w))).toBeLessThan(1);
 expect(boxes[4].right).toBeLessThanOrEqual(width);expect(boxes.every(b=>b.y===boxes[0].y)).toBe(true);
 await page.locator('.bottom [data-v="chat"]').click();await expect(page.locator('#chat')).toBeVisible();
 await page.evaluate(()=>{document.querySelectorAll('dialog[open]').forEach(d=>d.close());show('today')});
 await page.locator('[data-quick-rudder]').click();await expect(page.locator('#quickActionsSheet')).toBeVisible();
 await expect(page.locator('.quickActionsFocused')).toBeVisible();
 const sizes=await page.locator('#quickActionsExperience svg').evaluateAll(nodes=>nodes.map(n=>({w:n.getBoundingClientRect().width,h:n.getBoundingClientRect().height})));
 expect(sizes.length).toBeGreaterThan(3);expect(sizes.every(r=>r.w<=24&&r.h<=24)).toBe(true);
 expect(await page.locator('#quickActionsSheet').evaluate(el=>el.scrollWidth<=el.clientWidth+1)).toBe(true);
 await page.screenshot({path:testInfo.outputPath('actions.png')});
 await page.locator('#closeQuickActionsSheet').click();
 await page.evaluate(()=>{document.documentElement.style.setProperty('--app-safe-top','44px');document.documentElement.style.setProperty('--app-safe-bottom','34px');onboardingGuideMenu=false;onboardingFeatureKey='';onboardingChatIntro=false;onboardingStep=0;renderOnboarding();document.getElementById('onboardingDialog').showModal()});
 const rects=await page.evaluate(()=>['onboardingStepLabel','onboardingSkipBtn','onboardingProgress'].map(id=>{const r=document.getElementById(id).getBoundingClientRect();return{x:r.x,y:r.y,right:r.right,bottom:r.bottom}}));
 expect(rects[0].right).toBeLessThanOrEqual(rects[1].x);expect(rects[2].y).toBeGreaterThanOrEqual(rects[1].bottom);
 expect(await page.locator('#onboardingNextBtn').evaluate(el=>{const r=el.getBoundingClientRect();return r.bottom<=innerHeight-34&&r.y>=44&&r.x>=0&&r.right<=innerWidth})).toBe(true);
 await page.screenshot({path:testInfo.outputPath('onboarding.png')});
 await page.locator('#onboardingNextBtn').click();await expect(page.locator('#onboardingStepLabel')).toContainText('2 of');
 });
}
test('fallback dock keeps every destination visible @iphone',async({page})=>{
 await page.setViewportSize({width:320,height:844});await ready(page,true);
 await expect(page.locator('[data-react-navigation]')).toHaveCount(0);
 const rects=await page.locator('.bottom button').evaluateAll(ns=>ns.map(n=>{const r=n.getBoundingClientRect();return{y:r.y,right:r.right,w:r.width}}));
 expect(rects).toHaveLength(5);expect(rects[4].right).toBeLessThanOrEqual(320);expect(rects.every(r=>r.y===rects[0].y&&r.w>44)).toBe(true);
 await page.locator('.bottom [data-v="chat"]').click();await expect(page.locator('#chat')).toBeVisible();
});
