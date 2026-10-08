const {test,expect}=require('@playwright/test');
const {openReview}=require('./helpers/product-review');
test.use({serviceWorkers:'block'});

for(const theme of ['light','dark'])for(const width of [320,390,430])test(`shared presentation and personalisation ${theme} ${width}px @iphone`,async({page},testInfo)=>{
 test.setTimeout(60000);await page.setViewportSize({width,height:844});await openReview(page);
 const errors=[];page.on('pageerror',error=>errors.push(error.message));
 await page.evaluate(theme=>{applyTheme(theme==='dark');show('today')},theme);
 expect(await page.locator('main').evaluate(el=>getComputedStyle(el).backgroundColor)).toBe('rgba(0, 0, 0, 0)');
 expect(await page.locator('body').evaluate(el=>getComputedStyle(el).backgroundColor)).toBe(theme==='dark'?'rgb(14, 20, 30)':'rgb(243, 245, 248)');
 await page.evaluate(()=>setSharedSyncState('reconnecting','Reconnecting live updates…'));
 await expect(page.locator('#syncStatus')).toHaveAttribute('data-status-tone','info');
 expect(await page.locator('#syncStatus').evaluate(el=>getComputedStyle(el).color)).toBe(theme==='dark'?'rgb(144, 201, 255)':'rgb(23, 102, 165)');
 for(const view of ['today','changes','breaks','chat']){
  await page.evaluate(view=>show(view),view);await expect(page.locator('#'+view)).toBeVisible();
  expect(await page.locator('#'+view).evaluate(el=>getComputedStyle(el).backgroundColor)).toBe('rgba(0, 0, 0, 0)');
  const header=page.locator(view==='today'?'#appHeader':'#'+view+' .appShellHeader');
  expect(await header.evaluate(el=>getComputedStyle(el).backgroundColor)).toBe('rgba(0, 0, 0, 0)');
  expect(await header.evaluate(el=>getComputedStyle(el).position)).toBe('relative');
  expect(await page.locator('#'+view).evaluate(el=>el.scrollWidth<=el.clientWidth+1)).toBe(true);
  const geo=await page.locator('.bottom').boundingBox();expect(Math.abs(geo.x+geo.width/2-width/2)).toBeLessThan(1);
  if(width===390)await page.screenshot({path:testInfo.outputPath(view+'.png')});
 }
 await page.evaluate(()=>show('changes'));await page.locator('#absenceFormExperience .staffingAddButton').click();
 await expect(page.locator('#absenceFormExperience .staffingSheet')).toHaveAttribute('open','');
 expect(await page.locator('#absenceFormExperience .staffingSheet').evaluate(el=>el.contains(document.activeElement))).toBe(true);
 await page.keyboard.press('Escape');await expect(page.locator('#absenceFormExperience .staffingSheet')).toHaveCount(0);
 await page.evaluate(()=>{showAccountSheet();showAccountSection('profile')});await expect(page.locator('#profileName')).toBeVisible();
 expect(await page.locator('#profilePhotoInitial').evaluate(el=>getComputedStyle(el).color)).toBe(theme==='dark'?'rgb(145, 191, 255)':'rgb(0, 102, 204)');
 await page.locator('#profileName').fill('Preview Nurse');await expect(page.locator('.personalisationPreviewCopy strong')).toHaveText('Preview Nurse');
 await page.getByRole('button',{name:'Our Shift',exact:true}).click();await page.locator('#shiftStudioName').fill('The Night Team');
 await expect(page.locator('.shiftPreviewCard .shiftIdentityCopy strong')).toHaveText('The Night Team');
 await page.getByRole('button',{name:'Rose',exact:true}).click();await expect(page.locator('.shiftPreviewCard')).toHaveAttribute('data-shift-accent','rose');
 const preview=await page.locator('.shiftPreviewCard').boundingBox();expect(preview.y).toBeGreaterThanOrEqual(60);expect(preview.y+preview.height).toBeLessThan(844);
 expect(await page.locator('#accountPageOutlet').evaluate(el=>el.scrollWidth<=el.clientWidth+1)).toBe(true);
 if(width===390)await page.screenshot({path:testInfo.outputPath('personalise.png')});
 await page.evaluate(()=>document.getElementById('accountSheet').close());
 await page.evaluate(()=>{show('today');document.querySelector('#today .nightTeamDetails').open=true});
 await page.locator('.roleShortcutButton').first().click();await expect(page.locator('.productColleagueMenu')).toBeVisible();
 await page.getByRole('button',{name:'Done',exact:true}).click();await expect(page.locator('.productColleagueMenu')).toHaveCount(0);
 expect(errors).toEqual([]);
});

test('Actions reconnects, selection travels and launch never moves the dock sideways @iphone',async({page})=>{
 await openReview(page);await page.evaluate(()=>document.body.classList.add('appRevealing'));
 for(let i=0;i<4;i++)await expect.poll(async()=>{const r=await page.locator('.bottom').boundingBox();return Math.abs(r.x+r.width/2-(await page.evaluate(()=>innerWidth))/2)}).toBeLessThan(1);
 await page.evaluate(()=>document.body.classList.remove('appRevealing'));
 await page.locator('.bottom [data-v="breaks"]').click();await expect.poll(()=>page.locator('.bottom').evaluate(el=>getComputedStyle(el,'::before').transform)).not.toBe('none');
 await page.locator('[data-quick-rudder]').click();await expect(page.locator('[data-quick-rudder]')).toHaveAttribute('aria-expanded','true');
 await page.locator('#closeQuickActionsSheet').click();await expect(page.locator('#quickActionsSheet')).not.toBeVisible();await expect(page.locator('[data-quick-rudder]')).toHaveAttribute('aria-expanded','false');
});

test('Return updates acknowledge once and later updates still appear @iphone',async({page})=>{
 await openReview(page);await page.evaluate(()=>{const date=cur().date;activityOpenedThisSession[date]={previous:Date.now()-3600000,opened:Date.now()};overtimeHistory[date]=[{action:'added',nurse_name:'Example Nurse',changed_by:'Roster nurse',changed_at:new Date().toISOString()}];renderRecentActivity(date)});
 await expect(page.locator('.recentActivityDigest')).toContainText('1 change');await page.getByRole('button',{name:'Got it',exact:true}).click();await expect(page.locator('.recentActivityDigest')).toHaveCount(0);
 await page.evaluate(()=>{render();show('changes');show('today')});await expect(page.locator('.recentActivityDigest')).toHaveCount(0);
});

test('Installed pull to refresh keeps content, resolves and cancels horizontal gestures @iphone',async({page})=>{
 await openReview(page);await page.evaluate(()=>{const media=window.matchMedia.bind(window);window.matchMedia=q=>q==='(display-mode: standalone)'?{matches:true}:media(q);window.__refreshCount=0;window.addEventListener('roster:product-refresh',()=>{window.__refreshCount++;window.dispatchEvent(new CustomEvent('roster:product-refreshed',{detail:{ok:true}}))});scrollTo(0,0)});
 async function drag(x,y){await page.locator('#nightSectionTitle').dispatchEvent('touchstart',{touches:[{identifier:1,clientX:180,clientY:160}]});await page.locator('#nightSectionTitle').dispatchEvent('touchmove',{touches:[{identifier:1,clientX:x,clientY:y}]});await page.locator('#nightSectionTitle').dispatchEvent('touchend',{touches:[],changedTouches:[{identifier:1,clientX:x,clientY:y}]});}
 await drag(182,260);await expect(page.locator('.productRefreshIndicator')).toContainText('Up to date');await expect(page.locator('#personalNightCard')).toBeVisible();expect(await page.evaluate(()=>window.__refreshCount)).toBe(1);
 await drag(285,165);expect(await page.evaluate(()=>window.__refreshCount)).toBe(1);
});

test('Saved reduced motion removes JavaScript press feedback and CSS transitions @iphone',async({page})=>{
 await openReview(page);await page.evaluate(()=>document.body.classList.add('personalMotionReduced'));
 await page.locator('.bottom [data-v="changes"]').click();expect(await page.locator('.bottom').evaluate(el=>getComputedStyle(el,'::before').transitionDuration)).toBe('0s');
 await page.locator('[data-quick-rudder]').click();expect(await page.locator('#quickActionsSheet').evaluate(el=>getComputedStyle(el).animationName)).toBe('none');
});

test('System reduced motion keeps primary screens and onboarding still @iphone',async({page})=>{
 await page.emulateMedia({reducedMotion:'reduce'});await openReview(page);
 await page.evaluate(()=>{show('changes');document.getElementById('changes').classList.add('viewEntering');renderOnboarding();document.getElementById('onboardingDialog').showModal()});
 expect(await page.locator('#changes').evaluate(el=>getComputedStyle(el).animationName)).toBe('none');
 expect(await page.locator('#onboardingDialog').evaluate(el=>getComputedStyle(el).animationName)).toBe('none');
});

test('Colleague long press is optional and dismisses with Escape @iphone',async({page})=>{
 await openReview(page);await page.evaluate(()=>document.querySelector('#today .nightTeamDetails').open=true);
 await page.locator('.rosterRow[data-colleague-names]').first().dispatchEvent('pointerdown',{pointerId:1,button:0,clientX:100,clientY:100});
 await expect(page.locator('.productColleagueMenu')).toBeVisible();
 await page.keyboard.press('Escape');await expect(page.locator('.productColleagueMenu')).toHaveCount(0);
});

test('Chat arrival preserves an older reading position and follows the latest when near the end @iphone',async({page})=>{
 await openReview(page);await page.evaluate(()=>{show('chat');const chat=document.getElementById('chat');chat.classList.add('chat-thread-open','chat-team-open');document.body.classList.add('chatThreadMode');document.getElementById('chatTeamThread').classList.remove('hidden')});
 await page.evaluate(()=>window.dispatchEvent(new CustomEvent('roster:chat-overview',{detail:{conversations:[],members:[]}})));
 await expect(page.locator('#chatTeamInput')).toHaveAttribute('data-chat-composer','react');
 await page.evaluate(()=>{window.__testMessages=Array.from({length:40},(_,i)=>({id:'arrival-'+i,sender:'Example Nurse',time:'01:20',body:'Message '+i+' with enough detail to fill a quiet night conversation.',own:false,createdAt:new Date(Date.now()+i*1000).toISOString(),dateLabel:i===0?'Today':''}));window.dispatchEvent(new CustomEvent('roster:chat-messages',{detail:{kind:'team',items:window.__testMessages,bottomOffset:0}}))});
 await expect(page.locator('#chatTeamMessages .chatTeamBubble')).toHaveCount(40);
 const prior=await page.locator('#chatTeamMessages').evaluate(el=>{el.scrollTop=120;return el.scrollTop});expect(prior).toBeGreaterThan(0);
 await page.evaluate(()=>{const el=document.getElementById('chatTeamMessages');const offset=el.scrollHeight-el.clientHeight-el.scrollTop;window.__testMessages.push({...window.__testMessages.at(-1),id:'arrival-40',body:'New message while reading'});window.dispatchEvent(new CustomEvent('roster:chat-messages',{detail:{kind:'team',items:window.__testMessages,bottomOffset:offset}}))});
 await expect(page.locator('#chatTeamMessages')).toContainText('New message while reading');expect(Math.abs(await page.locator('#chatTeamMessages').evaluate(el=>el.scrollTop)-prior)).toBeLessThan(2);
 await page.evaluate(()=>{const el=document.getElementById('chatTeamMessages');el.scrollTop=el.scrollHeight;window.__testMessages.push({...window.__testMessages.at(-1),id:'arrival-41',body:'Newest message at the end'});window.dispatchEvent(new CustomEvent('roster:chat-messages',{detail:{kind:'team',items:window.__testMessages,bottomOffset:0}}))});
 await expect(page.locator('#chatTeamMessages')).toContainText('Newest message at the end');await expect.poll(()=>page.locator('#chatTeamMessages').evaluate(el=>el.scrollHeight-el.clientHeight-el.scrollTop)).toBeLessThan(2);
});
