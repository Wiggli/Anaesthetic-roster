const fs = require('fs');

const file = 'night-intelligence.js';
let source = fs.readFileSync(file, 'utf8');

function replaceExact(before, after, label) {
  if (!source.includes(before)) {
    throw new Error(`Unable to apply ${label}: expected source was not found`);
  }
  source = source.replace(before, after);
}

replaceExact(
  '<button type="button" id="nightRecommendedAction" class="nightIntelligenceRecommended"><span><b id="nightRecommendedTitle">Review this night</b><small id="nightRecommendedDetail"></small></span><span aria-hidden="true">›</span></button>',
  '<button type="button" id="nightRecommendedAction" class="nightIntelligenceRecommended" aria-label="Open Night Intelligence recommendation" aria-describedby="nightRecommendedTitle nightRecommendedDetail"><span><b id="nightRecommendedTitle">Review this night</b><small id="nightRecommendedDetail"></small></span><span aria-hidden="true">›</span></button>',
  'unique recommendation accessibility identity'
);

if (source.includes('function niBindLifecycle(){') || source.includes('function niInstallPaletteLauncher(){')) {
  throw new Error('Lifecycle functions already exist; refusing to duplicate them');
}

replaceExact(
  " state.observer.observe(document.body,{childList:true,subtree:true,characterData:true,attributes:true,attributeFilter:['class','data-view','aria-hidden']})\n}\nfunction niStart(){",
  " state.observer.observe(document.body,{childList:true,subtree:true,characterData:true,attributes:true,attributeFilter:['class','data-view','aria-hidden']})\n}\nfunction niBindLifecycle(){\n  window.addEventListener('roster:quick-actions',function(event){niEnhanceQuickActions(event&&event.detail||null)});window.addEventListener('online',function(){var intent=niReadSafeIntent();if(intent&&typeof toast==='function')toast('Connection restored. '+intent.label+' is ready to continue.',{label:'Continue',run:function(){niResumeSafeIntent(intent)}});niScheduleRender(20)});window.addEventListener('offline',function(){niScheduleRender(20)});document.addEventListener('visibilitychange',function(){niScheduleRender(40)});window.addEventListener('resize',function(){niApplyDensity()})\n}\nfunction niInstallPaletteLauncher(){\n  var sheet=niEl('quickActionsSheet');if(!sheet||niEl('nightCommandLauncher'))return;var launcher=niMake('button','quickActionRow nightCommandLauncher');launcher.id='nightCommandLauncher';launcher.type='button';launcher.innerHTML='<span class=\"quickActionCopy\"><strong>Search & commands</strong><small>Find any Night Roster action</small></span><span class=\"quickActionChevron\">›</span>';launcher.onclick=function(){if(sheet.open)sheet.close();niOpenPalette()};var list=sheet.querySelector('.quickActionList');if(list)list.appendChild(launcher)\n}\nfunction niStart(){",
  'restored lifecycle and command launcher functions'
);

fs.writeFileSync(file, source);
