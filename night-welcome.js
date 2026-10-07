(function(){
'use strict';
var TYPED_KEY='anaes_night_welcome_typed_v3',typingTimer=null,retryTimer=null,identityRetries=0;
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
function stopTyping(){if(typingTimer){clearTimeout(typingTimer);typingTimer=null}}
function typingDelay(index,parts){
  if(parts.name&&index===parts.nameStart)return NAME_PAUSE_MS;
  if(parts.name&&index>parts.nameStart)return NAME_CHAR_MS;
  return GREETING_CHAR_MS
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
  var animate=greetingEnabled()&&!reducedMotion()&&!alreadyTyped()&&document.visibilityState!=='hidden';
  stopTyping();
  if(!animate){text.textContent=message;cursor.hidden=true;hero.classList.remove('is-typing');hero.classList.add('is-ready');return}
  text.textContent='';cursor.hidden=false;hero.classList.add('is-typing');hero.classList.remove('is-ready');
  var index=0;
  function finishTyping(){markTyped();hero.classList.remove('is-typing');hero.classList.add('is-ready');typingTimer=setTimeout(function(){cursor.hidden=true},CURSOR_HOLD_MS)}
  function typeNext(){
    index++;text.textContent=message.slice(0,index);
    if(index>=message.length){finishTyping();return}
    typingTimer=setTimeout(typeNext,typingDelay(index,parts))
  }
  typingTimer=setTimeout(typeNext,START_DELAY_MS)
}
function scheduleWelcome(){clearTimeout(retryTimer);retryTimer=setTimeout(renderWelcome,60)}
function initWelcome(){
  if(!el('nightWelcomeHero'))return;
  ['roster:account','roster:personal-night','roster:night','roster:night-team-identity'].forEach(function(name){window.addEventListener(name,scheduleWelcome)});
  window.addEventListener('pageshow',scheduleWelcome);
  document.addEventListener('visibilitychange',function(){if(document.visibilityState==='visible')scheduleWelcome()});
  if(window.MutationObserver&&document.body){var observer=new MutationObserver(function(records){if(records.some(function(record){return record.attributeName==='class'}))scheduleWelcome()});observer.observe(document.body,{attributes:true,attributeFilter:['class']})}
  scheduleWelcome()
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',initWelcome,{once:true});else initWelcome();
window.NightWelcome={render:renderWelcome,preferredFirstName:preferredFirstName};
})();
