import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const file = name => path.join(root, name);
const read = name => fs.readFileSync(file(name), 'utf8');
const write = (name, value) => fs.writeFileSync(file(name), value);

let index = read('index.html');
const nightTitlePattern = /<div class="nightSectionIdentity" aria-labelledby="nightSectionTitle">\s*<h1 id="nightSectionTitle">Night<\/h1>\s*<\/div>/;
const nightWelcomeMarkup = `<div class="nightSectionIdentity" aria-labelledby="nightSectionTitle">
            <div id="nightWelcomeHero" class="nightWelcomeHero">
              <span class="nightWelcomeEyebrow"><i aria-hidden="true"></i>Your night</span>
              <h1 id="nightSectionTitle" class="nightWelcomeTitle" aria-label="Night">
                <span id="nightWelcomeText" aria-hidden="true">Night</span><span id="nightWelcomeCursor" class="nightWelcomeCursor" aria-hidden="true" hidden></span>
              </h1>
              <p id="nightWelcomeSubtitle">Your allocation, break and team plan in one clear view.</p>
            </div>
          </div>`;
if (!nightTitlePattern.test(index)) throw new Error('Night title block was not found.');
index = index.replace(nightTitlePattern, nightWelcomeMarkup);

const chatStyle = '    <link rel="stylesheet" href="chat.css?v=46.0" vite-ignore />';
if (!index.includes('night-welcome.css?v=')) {
  if (!index.includes(chatStyle)) throw new Error('chat.css anchor was not found.');
  index = index.replace(chatStyle, `${chatStyle}\n    <link rel="stylesheet" href="night-welcome.css?v=46.0" vite-ignore />`);
}
const themeScript = '    <script src="theme-bootstrap.js?v=46.0" vite-ignore></script>';
if (!index.includes('night-welcome.js?v=')) {
  if (!index.includes(themeScript)) throw new Error('theme-bootstrap anchor was not found.');
  index = index.replace(themeScript, `${themeScript}\n    <script src="night-welcome.js?v=46.0" defer vite-ignore></script>`);
}
write('index.html', index);

write('night-welcome.js', `(function(){
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
  return value?value.split(/\\s+/)[0]:''
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
`);

write('night-welcome.css', `/* Personal Night welcome: a restrained identity layer above the existing shift/date context. */
#today .nightSectionIdentity{margin:0;padding:15px 20px 8px;position:relative;z-index:2}
#today .nightWelcomeHero{position:relative;min-width:0;padding:3px 2px 8px}
#today .nightWelcomeEyebrow{display:inline-flex;align-items:center;gap:8px;margin-bottom:7px;color:color-mix(in srgb,var(--personal-accent,#6bc7c7) 72%,#8da2b7);font-size:11px;line-height:1;font-weight:900;letter-spacing:.11em;text-transform:uppercase}
#today .nightWelcomeEyebrow i{width:6px;height:6px;border-radius:999px;background:var(--personal-accent,#6bc7c7);box-shadow:0 0 0 5px color-mix(in srgb,var(--personal-accent,#6bc7c7) 13%,transparent)}
#today .nightWelcomeTitle{display:flex;align-items:center;min-height:1.12em;margin:0;color:var(--text,#152536);font-size:clamp(31px,8.4vw,43px);line-height:1.04;font-weight:950;letter-spacing:-.045em;text-wrap:balance}
#today .nightWelcomeCursor{width:2px;height:.82em;margin-left:5px;border-radius:99px;background:var(--personal-accent,#6bc7c7);opacity:.9;animation:nightWelcomeBlink .72s steps(1,end) infinite}
#today .nightWelcomeHero.is-ready .nightWelcomeTitle{animation:nightWelcomeSettle .32s cubic-bezier(.2,.8,.2,1) both}
#today #nightWelcomeSubtitle{max-width:34rem;margin:8px 0 0;color:var(--muted,#75869a);font-size:13px;line-height:1.45;font-weight:680;letter-spacing:-.01em}
#today .nightUnifiedHero{position:relative;isolation:isolate}
#today .nightUnifiedHero::after{content:'';position:absolute;left:14px;right:14px;top:calc(var(--app-safe-top,0px) + 72px);height:150px;z-index:-1;pointer-events:none;background:radial-gradient(ellipse at 12% 15%,color-mix(in srgb,var(--personal-accent,#6bc7c7) 9%,transparent),transparent 66%);filter:blur(8px)}
#today .nightDateShell.nightUnifiedContext{margin-top:2px}
body.dark #today .nightWelcomeTitle{color:#f7f9fc}
body.dark #today #nightWelcomeSubtitle{color:#9ca9ba}
@keyframes nightWelcomeBlink{0%,46%{opacity:1}47%,100%{opacity:0}}
@keyframes nightWelcomeSettle{from{opacity:.84;transform:translateY(2px)}to{opacity:1;transform:none}}
@media(max-width:430px){#today .nightSectionIdentity{padding:14px 16px 7px}#today .nightWelcomeTitle{font-size:clamp(30px,9.1vw,38px)}#today #nightWelcomeSubtitle{font-size:12.5px}}
@media(prefers-reduced-motion:reduce){#today .nightWelcomeCursor{display:none!important}#today .nightWelcomeHero.is-ready .nightWelcomeTitle{animation:none!important}}
body.personalMotionReduced #today .nightWelcomeCursor{display:none!important}
body.personalMotionReduced #today .nightWelcomeHero.is-ready .nightWelcomeTitle{animation:none!important}
`);

let vite = read('vite.config.mts');
if (!vite.includes('night-welcome.css')) vite = vite.replace("'night-intelligence.css', 'night-ai.css', 'theme-bootstrap.js'", "'night-intelligence.css', 'night-ai.css', 'night-welcome.css', 'theme-bootstrap.js'");
if (!vite.includes('night-welcome.js')) vite = vite.replace("'night-intelligence.js', 'night-ai.js', 'push.js'", "'night-intelligence.js', 'night-ai.js', 'night-welcome.js', 'push.js'");
if (!vite.includes('night-welcome.css') || !vite.includes('night-welcome.js')) throw new Error('Vite public asset insertion failed.');
write('vite.config.mts', vite);

let worker = read('service-worker.js');
if (!worker.includes('night-welcome.css?v=')) worker = worker.replace("  './night-ai.css?v=46.0',\n", "  './night-ai.css?v=46.0',\n  './night-welcome.css?v=46.0',\n");
if (!worker.includes('night-welcome.js?v=')) worker = worker.replace("  './night-ai.js?v=46.0',\n", "  './night-ai.js?v=46.0',\n  './night-welcome.js?v=46.0',\n");
if (!worker.includes('night-welcome.css?v=') || !worker.includes('night-welcome.js?v=')) throw new Error('Service worker asset insertion failed.');
write('service-worker.js', worker);

write('tests/night-welcome.test.js', `const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.join(__dirname,'..');
const read=f=>fs.readFileSync(path.join(root,f),'utf8');
const index=read('index.html'),client=read('night-welcome.js'),css=read('night-welcome.css'),vite=read('vite.config.mts'),worker=read('service-worker.js');
assert.match(index,/id="nightWelcomeHero"/,'Night must expose the personalised welcome hero');
assert.match(index,/night-welcome\\.js\\?v=/,'Night welcome runtime must be versioned');
assert.match(index,/night-welcome\\.css\\?v=/,'Night welcome styles must be versioned');
assert.match(client,/currentPrivateProfile/,'Welcome must prefer the private personal profile');
assert.match(client,/currentUserProfile/,'Welcome must fall back to the approved profile');
assert.match(client,/professionalName/,'Welcome must support the professional roster identity');
assert.match(client,/greeting_enabled/,'Welcome must respect the saved greeting preference');
assert.match(client,/prefers-reduced-motion/,'Welcome must respect reduced motion');
assert.match(client,/sessionStorage\\.getItem\\(TYPED_KEY\\)/,'Typing should happen once per session');
assert.doesNotMatch(client,/Andre|André/,'Welcome must never hard-code an individual nurse name');
assert.match(css,/nightWelcomeTitle/,'Welcome must have a dedicated visual hierarchy');
assert.match(vite,/night-welcome\\.js/,'Build must ship the welcome runtime');
assert.match(vite,/night-welcome\\.css/,'Build must ship the welcome styles');
assert.match(worker,/night-welcome\\.js\\?v=/,'Installed PWA must cache the welcome runtime');
assert.match(worker,/night-welcome\\.css\\?v=/,'Installed PWA must cache the welcome styles');
console.log('Personal Night welcome contracts passed.');
`);

const packagePath = file('package.json');
const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
for (const key of ['verify:fast', 'test']) {
  const anchor = 'node tests/night-ai.test.js';
  if (!packageJson.scripts[key].includes('node tests/night-welcome.test.js')) {
    if (!packageJson.scripts[key].includes(anchor)) throw new Error(`${key} is missing the Night AI test anchor.`);
    packageJson.scripts[key] = packageJson.scripts[key].replace(anchor, `${anchor} && node tests/night-welcome.test.js`);
  }
}
fs.writeFileSync(packagePath, JSON.stringify(packageJson, null, 2) + '\n');

write('release.json', JSON.stringify({
  version: '46.1',
  date: '6 October 2026',
  title: 'Personalise the Night welcome experience',
  summary: 'Night opens as one coherent personal dashboard with a time-aware nurse greeting, restrained one-time typing motion and a clearer visual handoff into shift identity, date and allocation.',
  changes: [
    'Replaces the generic Night heading with a personalised time-aware greeting using the saved preferred name, verified roster identity or professional roster name fallback.',
    'Adds a restrained one-time typing reveal for the greeting while respecting the existing greeting preference and reduced-motion accessibility settings.',
    'Keeps the welcome, shared shift identity and selected-night controls inside the existing unified Night hero so the page reads as one coherent personal dashboard rather than stacked unrelated cards.',
    'Adds a concise orientation line that frames allocation, break and team plan as the page hierarchy before the existing Your night, Night brief and Tonight sections.',
    'Ships and caches the dedicated welcome runtime and styles with regression coverage so installed Android and iPhone PWAs receive the same personalised experience.'
  ],
  update_policy: 'normal'
}, null, 2) + '\n');

console.log('Night welcome release inputs prepared.');
