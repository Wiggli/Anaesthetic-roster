(function(){
'use strict';
var TYPED_KEY='anaes_night_welcome_typed_v4',typingTimer=null,retryTimer=null,identityRetries=0,activeMessage='';
var START_DELAY_MS=190,GREETING_CHAR_MS=50,NAME_PAUSE_MS=420,NAME_CHAR_MS=92,CURSOR_HOLD_MS=650;
var GENERIC_NAME_LEADS={have:true,good:true,hello:true,hi:true,dear:true,welcome:true,night:true,thanks:true,thank:true,please:true};
function el(id){return document.getElementById(id)}
function safe(fn,fallback){try{return fn()}catch(error){return fallback}}
function reducedMotion(){return !!(document.body&&document.body.classList.contains('personalMotionReduced'))||!!(window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches)}
function greetingEnabled(){return !(typeof currentPrivateProfile!=='undefined'&&currentPrivateProfile&&currentPrivateProfile.greeting_enabled===false)}
function normaliseName(value){return String(value||'').replace(/\s+/g,' ').trim()}
function plausiblePersonalName(value){
  var name=normaliseName(value);
  if(!name||name.length>60)return'';
  var words=name.split(' '),lead=String(words[0]||'').toLowerCase().replace(/[.'’]/g,'');
  if(words.length>3||GENERIC_NAME_LEADS[lead])return'';
  for(var i=0;i<words.length;i++)if(!/^[A-Za-zÀ-ÖØ-öø-ÿĀ-ž'’.-]+$/.test(words[i]))return'';
  return name
}
function firstNameFrom(value){
  var name=plausiblePersonalName(value);
  if(!name)return'';
  return name.split(' ')[0].replace(/[.,]+$/,'')
}
function preferredFirstName(){
  var personalName='';
  if(typeof currentPrivateProfile!=='undefined'&&currentPrivateProfile&&currentPrivateProfile.profile_name)personalName=firstNameFrom(currentPrivateProfile.profile_name);
  if(personalName)return personalName;
  if(typeof myName==='function'){
    var rosterName=safe(function(){return myName()},'');
    if(rosterName){
      var professionalRosterName=typeof professionalName==='function'?safe(function(){return professionalName(rosterName)},rosterName):rosterName;
      var rosterFirstName=firstNameFrom(professionalRosterName);
      if(rosterFirstName)return rosterFirstName
    }
  }
  if(typeof currentUserProfile!=='undefined'&&currentUserProfile&&currentUserProfile.display_name){
    var accountFirstName=firstNameFrom(currentUserProfile.display_name);
    if(accountFirstName)return accountFirstName
  }
  return''
}
function timeGreeting(){var hour=new Date().getHours();if(hour<12)return'Good morning';if(hour<18)return'Good afternoon';return'Good evening'}
function greetingParts(){
  if(!greetingEnabled())return{greeting:'Night',name:'',message:'Night',nameStart:-1};
  var greeting=timeGreeting(),name=preferredFirstName(),message=greeting+(name?', '+name:'');
  return{greeting:greeting,name:name,message:message,nameStart:name?greeting.length+2:-1}
}
function alreadyTyped(){return safe(function(){return sessionStorage.getItem(TYPED_KEY)==='1'},false)}
function markTyped(){safe(function(){sessionStorage.setItem(TYPED_KEY,'1')},null)}
function stopTyping(){if(typingTimer){clearTimeout(typingTimer);typingTimer=null}activeMessage=''}
function typingDelay(index,parts){
  if(parts.name&&index===parts.nameStart)return NAME_PAUSE_MS;
  if(parts.name&&index>parts.nameStart)return NAME_CHAR_MS;
  return GREETING_CHAR_MS
}
function welcomeIsVisible(){
  if(document.visibilityState==='hidden'||document.body.classList.contains('authPending'))return false;
  var today=el('today'),hero=el('nightWelcomeHero'),launch=el('launchScreen');
  if(!today||today.classList.contains('hidden')||!hero||!hero.getClientRects().length)return false;
  if(document.body.getAttribute('data-view')&&document.body.getAttribute('data-view')!=='today')return false;
  if(document.querySelector('dialog[open]'))return false;
  if(launch&&!launch.classList.contains('hidden')&&window.getComputedStyle(launch).display!=='none')return false;
  return true
}
function renderWelcome(){
  var hero=el('nightWelcomeHero'),title=el('nightSectionTitle'),text=el('nightWelcomeText'),cursor=el('nightWelcomeCursor');
  if(!hero||!title||!text||!cursor)return;
  if(document.body&&document.body.classList.contains('authPending'))return;
  var hasIdentity=typeof currentUserProfile!=='undefined'&&!!currentUserProfile;
  if(!hasIdentity&&identityRetries<12){identityRetries++;clearTimeout(retryTimer);retryTimer=setTimeout(renderWelcome,240);return}
  identityRetries=0;
  var parts=greetingParts(),message=parts.message;
  title.setAttribute('aria-label',message);
  var visible=welcomeIsVisible(),animate=greetingEnabled()&&!reducedMotion()&&!alreadyTyped()&&visible;
  if(animate&&activeMessage===message)return;
  stopTyping();
  if(!animate){text.textContent=message;cursor.hidden=true;hero.classList.remove('is-typing');hero.classList.add('is-ready');return}
  activeMessage=message;text.textContent='';cursor.hidden=false;hero.classList.add('is-typing');hero.classList.remove('is-ready');
  var index=0;
  function finishTyping(){activeMessage='';markTyped();hero.classList.remove('is-typing');hero.classList.add('is-ready');typingTimer=setTimeout(function(){cursor.hidden=true},CURSOR_HOLD_MS)}
  function typeNext(){
    if(!welcomeIsVisible()){stopTyping();text.textContent=message;cursor.hidden=true;hero.classList.remove('is-typing');return}
    index++;text.textContent=message.slice(0,index);
    if(index>=message.length){finishTyping();return}
    typingTimer=setTimeout(typeNext,typingDelay(index,parts))
  }
  typingTimer=setTimeout(typeNext,START_DELAY_MS)
}
function scheduleWelcome(){clearTimeout(retryTimer);retryTimer=setTimeout(renderWelcome,60)}
function patchFiveNursePagerSemantics(){
  if(typeof window.allocationBreak!=='function'||window.allocationBreak.__fiveNursePagerAware)return;
  var original=window.allocationBreak;
  function patchedAllocationBreak(key){
    if(key==='pager'){
      try{
        var base=typeof window.cur==='function'?window.cur():null;
        var plan=base&&typeof window.staffingPlan==='function'?window.staffingPlan(base):null;
        if(base&&plan&&typeof window.baseEstablishmentSize==='function'&&window.baseEstablishmentSize(base)===5&&Number(plan.count||0)===5)return'Full night · 00:00–07:00 · Break when clinical cover allows'
      }catch(error){}
    }
    return original(key)
  }
  patchedAllocationBreak.__fiveNursePagerAware=true;
  patchedAllocationBreak.__original=original;
  window.allocationBreak=patchedAllocationBreak
}
function ensureNightPlanPolishStyles(){
  if(el('nightPlanPolishStyles'))return;
  var style=document.createElement('style');
  style.id='nightPlanPolishStyles';
  style.textContent='\n#today .nightTeamDetails>summary strong{letter-spacing:-.015em}\n#today #viewRosterBtn{display:none!important}\n#today .recentActivityPanel #recentActivityList{display:none!important}\n#today .recentActivityPanel>summary{cursor:pointer}\n#today .nightTeamDetails .rosterRowMeta{white-space:normal;text-overflow:clip}\n#today .fiveNurseSurface small{line-height:1.4}\n#today .nightRoleTools{gap:8px}\n';
  document.head.appendChild(style)
}
function simplifyRoleMeta(text){
  var value=normaliseName(text);
  var part=value.match(/^(?:First Part|Second Part)\s*·\s*Works\s+(.+)$/i);
  return part?part[1]:value
}
function openChangesFromNight(event){
  if(event&&event.preventDefault)event.preventDefault();
  if(event&&event.stopPropagation)event.stopPropagation();
  if(typeof productHaptic==='function')safe(function(){productHaptic()},null);
  if(typeof window.show==='function')window.show('changes')
}
function polishNightPlan(){
  ensureNightPlanPolishStyles();
  var team=document.querySelector('#today .nightTeamDetails');
  if(team){
    var heading=team.querySelector('summary strong');
    if(heading&&heading.textContent!=='Tonight’s coverage')heading.textContent='Tonight’s coverage';
  }
  var staffing=document.querySelector('#today #nightStatusRow .nightTeamStaffing');
  if(staffing&&/\bpresent\b/i.test(staffing.textContent||'')){
    var concise=String(staffing.textContent||'').split(' · ')[0];
    if(staffing.textContent!==concise)staffing.textContent=concise
  }
  Array.prototype.forEach.call(document.querySelectorAll('#today #roles .rosterRowMeta'),function(meta){
    var concise=simplifyRoleMeta(meta.textContent||'');
    if(concise&&meta.textContent!==concise)meta.textContent=concise
  });
  var tools=document.querySelectorAll('#today .nightRoleTools .jumpToMeButton');
  if(tools[0]&&/Edit theatre \/ Pager/i.test(tools[0].textContent||''))tools[0].textContent='Edit coverage';
  if(tools[1]&&/View breaks/i.test(tools[1].textContent||''))tools[1].textContent='Breaks';
  var five=document.querySelector('#today .fiveNurseSurface');
  if(five){
    var label=five.querySelector('.fiveNurseLabel');
    if(label&&label.textContent!=='Labour Ward / Pager · Full night')label.textContent='Labour Ward / Pager · Full night';
    var detail=five.querySelector('small');
    if(detail){
      var clean=String(detail.textContent||'').replace(/^Labour Ward \/ Pager\s*·\s*/i,'').replace(/Break coordinated when clinical cover allows/i,'Break when clinical cover allows');
      if(detail.textContent!==clean)detail.textContent=clean
    }
  }
  var panel=document.querySelector('#today .recentActivityPanel');
  if(panel){
    panel.removeAttribute('open');
    var summary=panel.querySelector('summary');
    if(summary&&!summary.dataset.nightChangesRoute){
      summary.dataset.nightChangesRoute='1';
      summary.setAttribute('aria-label','Open Changes for tonight');
      summary.addEventListener('click',openChangesFromNight)
    }
  }
}
var nightPolishQueued=false;
function scheduleNightPlanPolish(){
  if(nightPolishQueued)return;
  nightPolishQueued=true;
  requestAnimationFrame(function(){nightPolishQueued=false;polishNightPlan()})
}
function bindNightPlanPolish(){
  polishNightPlan();
  ['roster:night','roster:personal-night','roster:activity','roster:viewchange','roster:peer-revision'].forEach(function(name){window.addEventListener(name,scheduleNightPlanPolish)});
  var host=document.querySelector('#today .nightOverviewPanel');
  if(window.MutationObserver&&host){
    var observer=new MutationObserver(scheduleNightPlanPolish);
    observer.observe(host,{childList:true,subtree:true,characterData:true})
  }
}
function initWelcome(){
  patchFiveNursePagerSemantics();
  bindNightPlanPolish();
  if(!el('nightWelcomeHero'))return;
  ['roster:account','roster:personal-night','roster:night','roster:night-team-identity','roster:viewchange'].forEach(function(name){window.addEventListener(name,scheduleWelcome)});
  window.addEventListener('pageshow',scheduleWelcome);
  document.addEventListener('visibilitychange',function(){if(document.visibilityState==='visible')scheduleWelcome()});
  if(window.MutationObserver&&document.body){
    var observer=new MutationObserver(scheduleWelcome);
    observer.observe(document.body,{attributes:true,attributeFilter:['class','data-view']});
    ['launchScreen','today'].forEach(function(id){var target=el(id);if(target)observer.observe(target,{attributes:true,attributeFilter:['class','style']})});
    Array.prototype.forEach.call(document.querySelectorAll('dialog'),function(dialog){observer.observe(dialog,{attributes:true,attributeFilter:['open']});dialog.addEventListener('close',scheduleWelcome)})
  }
  scheduleWelcome()
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',initWelcome,{once:true});else initWelcome();
window.NightWelcome={render:renderWelcome,preferredFirstName:preferredFirstName,polishPlan:polishNightPlan};
})();
