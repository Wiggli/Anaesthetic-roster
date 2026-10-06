(function(){
'use strict';
var TYPED_KEY='anaes_night_welcome_typed_v1',typingTimer=null,retryTimer=null,identityRetries=0;
function el(id){return document.getElementById(id)}
function safe(fn,fallback){try{return fn()}catch(error){return fallback}}
function reducedMotion(){return !!(document.body&&document.body.classList.contains('personalMotionReduced'))||!!(window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches)}
function greetingEnabled(){return !(typeof currentPrivateProfile!=='undefined'&&currentPrivateProfile&&currentPrivateProfile.greeting_enabled===false)}
function preferredFirstName(){
  var value='';
  if(typeof currentPrivateProfile!=='undefined'&&currentPrivateProfile&&currentPrivateProfile.profile_name)value=currentPrivateProfile.profile_name;
  if(!value&&typeof myName==='function'){
    var rosterName=safe(function(){return myName()},'');
    if(rosterName)value=typeof professionalName==='function'?safe(function(){return professionalName(rosterName)},rosterName):rosterName
  }
  if(!value&&typeof currentUserProfile!=='undefined'&&currentUserProfile&&currentUserProfile.display_name)value=currentUserProfile.display_name;
  value=String(value||'').trim();
  return value?value.split(/\s+/)[0]:''
}
function timeGreeting(){var hour=new Date().getHours();if(hour<12)return'Good morning';if(hour<18)return'Good afternoon';return'Good evening'}
function greetingText(){if(!greetingEnabled())return'Night';var first=preferredFirstName();return timeGreeting()+(first?', '+first:'')}
function alreadyTyped(){return safe(function(){return sessionStorage.getItem(TYPED_KEY)==='1'},false)}
function markTyped(){safe(function(){sessionStorage.setItem(TYPED_KEY,'1')},null)}
function stopTyping(){if(typingTimer){clearTimeout(typingTimer);typingTimer=null}}
function renderWelcome(){
  var hero=el('nightWelcomeHero'),title=el('nightSectionTitle'),text=el('nightWelcomeText'),cursor=el('nightWelcomeCursor');
  if(!hero||!title||!text||!cursor)return;
  if(document.body&&document.body.classList.contains('authPending'))return;
  var hasIdentity=typeof currentUserProfile!=='undefined'&&!!currentUserProfile;
  if(!hasIdentity&&identityRetries<12){identityRetries++;clearTimeout(retryTimer);retryTimer=setTimeout(renderWelcome,240);return}
  identityRetries=0;
  var message=greetingText();
  title.setAttribute('aria-label',message);
  var animate=greetingEnabled()&&!reducedMotion()&&!alreadyTyped()&&document.visibilityState!=='hidden';
  stopTyping();
  if(!animate){text.textContent=message;cursor.hidden=true;hero.classList.remove('is-typing');hero.classList.add('is-ready');return}
  text.textContent='';cursor.hidden=false;hero.classList.add('is-typing');hero.classList.remove('is-ready');
  var index=0;
  function typeNext(){index++;text.textContent=message.slice(0,index);if(index<message.length){typingTimer=setTimeout(typeNext,index<6?34:27);return}markTyped();hero.classList.remove('is-typing');hero.classList.add('is-ready');typingTimer=setTimeout(function(){cursor.hidden=true},520)}
  typingTimer=setTimeout(typeNext,120)
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
window.NightWelcome={render:renderWelcome};
})();
