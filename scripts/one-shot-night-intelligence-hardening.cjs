const fs = require('fs');

const jsPath = 'night-intelligence.js';
const cssPath = 'night-intelligence.css';
let js = fs.readFileSync(jsPath, 'utf8');
let css = fs.readFileSync(cssPath, 'utf8');

function replaceOnce(source, pattern, replacement, label) {
  const matches = source.match(pattern);
  if (!matches) throw new Error(`Hardening patch could not find: ${label}`);
  const next = source.replace(pattern, replacement);
  if (next === source) throw new Error(`Hardening patch made no change: ${label}`);
  return next;
}

js = replaceOnce(
  js,
  /function niPersonalSummary\(\)\{[\s\S]*?\n\}/,
  "function niPersonalSummary(){\n return'Your allocation, timing and break are ready below.'\n}",
  'concise personal-night summary'
);

js = replaceOnce(
  js,
  /review\.onclick=function\(\)\{niEl\('nightConflictDialog'\)\.close\(\);if\(typeof show==='function'\)show\('changes'\);if\(typeof setChangesStep==='function'\)setChangesStep\('allocation',true\)\}/,
  "review.onclick=function(){state.conflict=null;niScheduleRender(10);niEl('nightConflictDialog').close();if(typeof show==='function')show('changes');if(typeof setChangesStep==='function')setChangesStep('allocation',true)}",
  'clear conflict after review'
);

js = replaceOnce(
  js,
  /function niWrapMutation\(\)\{[\s\S]*?\n\}\nfunction niWrapToast/,
  `function niWrapMutation(){
  if(typeof window.runRosterMutation!=='function'||window.runRosterMutation.__nightIntelligence)return;var original=window.runRosterMutation;
  function wrapped(){var args=arguments;return Promise.resolve(original.apply(this,args)).then(function(result){if(result&&result.error){var code=String(result.error.code||result.error.message||'');if(code.indexOf('ROSTER_REVISION_CONFLICT')>=0||Array.isArray(result.conflictChanges)&&result.conflictChanges.length){state.conflict={at:Date.now(),date:niDate(),changes:result.conflictChanges||[]};niOpenConflict(state.conflict);niScheduleRender(10)}}else if(state.conflict){state.conflict=null;niScheduleRender(10)}return result})}
  wrapped.__nightIntelligence=true;wrapped.__original=original;window.runRosterMutation=wrapped
}
function niWrapToast`,
  'date-scoped conflict lifecycle'
);

js = replaceOnce(
  js,
  /function niWrapToast\(\)\{[\s\S]*?\n\}\nfunction niQueueSafeIntent/,
  `function niWrapToast(){
  if(typeof window.toast!=='function'||window.toast.__nightIntelligence)return;var original=window.toast;
  function wrapped(message,options){
   if(options&&options.label==='Undo'&&typeof options.run==='function'){
    var originalRun=options.run,consumed=false;
    function runOnce(){if(consumed)return Promise.resolve(false);consumed=true;if(state.undo&&state.undo.run===runOnce)state.undo=null;niScheduleRender(10);return originalRun.apply(this,arguments)}
    var next=Object.assign({},options,{run:runOnce});state.undo={createdAt:Date.now(),label:String(message||'Recent change'),run:runOnce};niScheduleRender(10);return original.call(this,message,next)
   }
   return original.apply(this,arguments)
  }
  wrapped.__nightIntelligence=true;wrapped.__original=original;window.toast=wrapped
}
function niWrapPrivateDeviceCleanup(){
  if(typeof window.clearPrivateDeviceData!=='function'||window.clearPrivateDeviceData.__nightIntelligence)return;var original=window.clearPrivateDeviceData;
  function wrapped(){try{niStorage().removeItem(INTENT_KEY)}catch(error){}state.undo=null;state.conflict=null;niScheduleRender(10);return original.apply(this,arguments)}
  wrapped.__nightIntelligence=true;wrapped.__original=original;window.clearPrivateDeviceData=wrapped
}
function niQueueSafeIntent`,
  'single-use undo and sign-out cleanup'
);

js = replaceOnce(
  js,
  /if\(state\.conflict\)items\.unshift\(/,
  "if(state.conflict&&state.conflict.date&&state.conflict.date!==niDate())state.conflict=null;if(state.conflict)items.unshift(",
  'discard conflict from another roster date'
);

js = replaceOnce(
  js,
  /function niObserve\(\)\{[\s\S]*?\n\}\nfunction niStart/,
  `function niMutationIsInternal(target){
 if(!target||target.nodeType!==1)return false;
 return!!(target.closest&&target.closest('#nightIntelligenceCentre,#nightAttentionDialog,#nightConflictDialog,#nightCommandPalette,#nightHealthDialog,#nightPersonActions,#nightIntelligenceLive'))
}
function niObserve(){
 if(!('MutationObserver'in window))return;
 state.observer=new MutationObserver(function(mutations){
  var relevant=mutations.some(function(mutation){
   var target=mutation.target;
   if(!target||target.nodeType!==1||niMutationIsInternal(target))return false;
   return target.id==='today'||target.closest&&target.closest('#today,#quickActionsSheet,#chat')
  });
  if(relevant)niScheduleRender(90)
 });
 state.observer.observe(document.body,{childList:true,subtree:true,characterData:true,attributes:true,attributeFilter:['class','data-view','aria-hidden']})
}
function niStart`,
  'exclude Night Intelligence from its own observer'
);

js = replaceOnce(
  js,
  /niWrapToast\(\);\s*niWrapMutation\(\);/,
  'niWrapToast(); niWrapPrivateDeviceCleanup(); niWrapMutation();',
  'install private-device cleanup wrapper'
);

css = replaceOnce(
  css,
  /\.nightIntelligenceSignalRow\{margin-right:-8px\}/,
  '.nightIntelligenceSignalRow{flex-wrap:wrap;overflow:visible;margin-right:0}.nightIntelligenceSignal{white-space:normal;min-width:0}',
  'wrap narrow phone signals instead of clipping'
);

const required = [
  ['observer exclusion', /function niMutationIsInternal\(/],
  ['single-use undo', /consumed=false/],
  ['dated conflicts', /date:niDate\(\)/],
  ['sign-out cleanup', /function niWrapPrivateDeviceCleanup\(/],
  ['cleanup installation', /niWrapToast\(\); niWrapPrivateDeviceCleanup\(\); niWrapMutation\(\);/],
  ['concise summary', /Your allocation, timing and break are ready below\./]
];
for (const [label, pattern] of required) {
  if (!pattern.test(js)) throw new Error(`Post-patch verification failed: ${label}`);
}
if (!/nightIntelligenceSignalRow\{flex-wrap:wrap;overflow:visible;margin-right:0\}/.test(css)) {
  throw new Error('Post-patch verification failed: phone signal wrapping');
}

fs.writeFileSync(jsPath, js);
fs.writeFileSync(cssPath, css);
console.log('Night Intelligence hardening patch applied and verified.');
