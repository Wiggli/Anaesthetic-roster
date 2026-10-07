const {test,expect}=require('@playwright/test');
test.use({serviceWorkers:'block'});
async function ready(page,fallback=false,userRole='member'){
 if(fallback)await page.route('**/navigation-*.js',route=>route.abort());
 await page.route('https://cdn.jsdelivr.net/**',route=>route.fulfill({contentType:'application/javascript',body:'window.supabase={createClient(){return null}}'}));
 await page.goto('/index.html');
 await page.evaluate(user_role=>{
 prepareAuthorisedShell({display_name:'Review Nurse',email:'review@example.test',user_role});document.getElementById('launchScreen').style.display='none';
 document.getElementById('authGate').classList.add('hidden');document.querySelector('main').style.display='block';
 document.querySelector('.bottom').style.display='grid';
 currentPrivateProfile={profile_name:'Review Nurse'};localStorage.setItem('anaes_my_name','Andre');schemaVersion=53;
 supa={rpc:async()=>({data:[],error:null})};appCompatibility={write_allowed:true,write_status:'allowed'};rebuildCalculatedRoster();idx=R.findIndex(r=>r.date==='2026-10-08');render();show('today');
 },userRole);
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
test('administrator sign-in keeps Chat visible from every screen @iphone',async({page},testInfo)=>{
 const width=testInfo.project.name==='desktop-chromium'?1280:390;
 await page.setViewportSize({width,height:844});await ready(page,false,'admin');
 await page.evaluate(()=>{document.body.classList.add('dark');document.documentElement.dataset.theme='dark'});
 for(const view of ['today','changes','breaks','chat']){
  await page.locator('.bottom [data-v="'+view+'"]').click();
  await expect(page.locator('#'+view)).toBeVisible();
  const boxes=await page.locator('.bottom button').evaluateAll(nodes=>nodes.map(node=>{const r=node.getBoundingClientRect();return{y:r.y,right:r.right,width:r.width}}));
  expect(boxes).toHaveLength(5);expect(boxes.every(r=>r.y===boxes[0].y&&r.width>44&&r.right<=width)).toBe(true);
  if(view==='breaks')await page.screenshot({path:testInfo.outputPath('breaks-chat-visible.png')});
 }
});

for (const fallback of [false, true]) test(`short unread threads clear after opening ${fallback?'fallback':'React'} @iphone`, async ({page}, testInfo) => {
 const fs=require('node:fs'),path=require('node:path');
 const source=fs.readFileSync(path.join(__dirname,'..','chat.js'),'utf8').replace('try{chatInit()}',"window.receiptReview={state:chatState,team:chatOpenTeamConversation,direct:chatOpenPrivateConversation,close:chatCloseThread,render:chatRenderHome};try{chatInit()}");
 await page.route('**/chat.js*',route=>route.fulfill({contentType:'application/javascript',body:source}));
 if(fallback)await page.route('**/chat-experience-*.js',route=>route.abort());
 await ready(page);
 await page.evaluate(()=>{
   const r=window.receiptReview,s=r.state;
   window.readCalls=[];window.badgeCalls=[];
   Object.defineProperty(navigator,'setAppBadge',{configurable:true,value:async n=>window.badgeCalls.push(n)});
   Object.defineProperty(navigator,'clearAppBadge',{configurable:true,value:async()=>window.badgeCalls.push(0)});
   window.rosterCapabilities=()=>({monotonicChatRead:true});
   supa={rpc:async(name,args)=>{if(name==='chat_mark_read_v47'){window.readCalls.push(args);return{data:args.p_message_id,error:null}}return{data:[],error:null}},from:()=>{
     let conversation='team';const query={select(){return this},eq(key,value){if(key==='conversation_id')conversation=value;return this},order(){return this},limit(){return this},then(resolve){return Promise.resolve({data:[4,3,2,1].map(i=>({id:conversation==='team'?i:i+4,conversation_id:conversation,sender_id:'other',sender_display_name:'Review Colleague',body:'Message '+i,created_at:'2026-10-07T20:00:00Z'})),error:null}).then(resolve)}};return query;
   }};
   s.conversations=[{id:'team',kind:'group',title:'Anaesthetic Team'},{id:'direct',kind:'direct',other_user_id:'other'}];
   s.members=[{user_id:'other',display_name:'Review Colleague'}];s.membersById={other:s.members[0]};
   s.unreadByConversation={team:4,direct:4};s.readStateByConversation={};
   document.body.setAttribute('data-view','chat');document.getElementById('today').classList.add('hidden');document.getElementById('chat').classList.remove('hidden');
   document.querySelectorAll('dialog[open]').forEach(d=>d.close());r.render();
 });
 await page.evaluate(()=>window.receiptReview.team({force:true}));
 await expect.poll(()=>page.evaluate(()=>window.receiptReview.state.unreadByConversation.team)).toBe(0);
 await expect.poll(()=>page.evaluate(()=>window.readCalls.some(c=>c.p_conversation_id==='team'&&c.p_message_id===4))).toBe(true);
 expect(await page.evaluate(()=>window.receiptReview.state.unreadByConversation.direct)).toBe(4);
 await page.evaluate(()=>{window.receiptReview.close();return window.receiptReview.direct('direct')});
 await expect.poll(()=>page.evaluate(()=>window.receiptReview.state.unreadByConversation.direct)).toBe(0);
 await expect(page.locator('#chatUnreadBadge')).toHaveClass(/hidden/);
 await expect.poll(()=>page.evaluate(()=>window.badgeCalls.at(-1))).toBe(0);
 if(!fallback)await expect(page.locator('#chatMessages .chatMessageSequence')).toBeVisible();
 await page.screenshot({path:testInfo.outputPath('read-chat.png')});
});

for(const fallback of [false,true])for(const dark of [false,true])test(`startup dock stays centred ${fallback?'fallback':'React'} ${dark?'dark':'light'} @iphone`,async({page},testInfo)=>{
 await page.setViewportSize({width:testInfo.project.name==='desktop-chromium'?1280:390,height:844});await ready(page,fallback);
 const frames=await page.evaluate(dark=>{
  document.body.classList.toggle('dark',dark);document.body.classList.remove('appRevealing');
  const bar=document.querySelector('.bottom');void bar.offsetWidth;document.body.classList.add('appRevealing');
  const animation=bar.getAnimations().find(a=>a.animationName==='operationalDockReveal');
  if(!animation)throw new Error('Startup dock animation missing');animation.pause();
  return [0,120,300,600,880].map(time=>{animation.currentTime=time;const r=bar.getBoundingClientRect();return{time,centre:r.x+r.width/2,viewport:innerWidth,left:r.x,right:r.right}});
 },dark);
 for(const frame of frames){expect(Math.abs(frame.centre-frame.viewport/2),`dock centre at ${frame.time}ms`).toBeLessThan(1);expect(frame.left).toBeGreaterThanOrEqual(0);expect(frame.right).toBeLessThanOrEqual(frame.viewport);}
 await page.screenshot({path:testInfo.outputPath('centred-startup-dock.png')});
 await page.emulateMedia({reducedMotion:'reduce'});
 const reduced=await page.locator('.bottom').evaluate(el=>{const r=el.getBoundingClientRect();return{centre:r.x+r.width/2,viewport:innerWidth,animation:getComputedStyle(el).animationName}});
 expect(Math.abs(reduced.centre-reduced.viewport/2)).toBeLessThan(1);expect(reduced.animation).toBe('none');
});
