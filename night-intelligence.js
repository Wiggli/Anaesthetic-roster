(function(){
'use strict';

/*
 * Night Intelligence enhancement layer.
 * Builds on the existing roster safety contracts and never creates an offline mutation queue.
 * Feature map: 1 Command Centre, 2 Attention Inbox, 4 My Night, 5 phase-aware UI,
 * 6 Undo, 7 readable activity, 8 conflict engine, 11 contextual Actions, 13 long-press,
 * 14 smart notifications, 15 deep links, 16 app badge, 17 offline confidence,
 * 18 sync freshness, 19 conflict-resolution UI, 20 Shift Identity 2.0, 21 Shift Profile,
 * 22 privacy-preserving presence, 25 command palette, 26 adaptive density,
 * 27 accessibility pass, 28 PWA Health Check, 29 guided troubleshooting, 30 Calm Mode.
 */

var NI_VERSION=1;
var STORE_KEY='anaes_night_intelligence_v1';
var INTENT_KEY='anaes_safe_intent_v1';
var SESSION_KEY='anaes_night_intelligence_session';
var state={
  started:false,
  calm:false,
  density:'auto',
  undo:null,
  conflict:null,
  lastAttentionSignature:'',
  lastNotifiedSignature:'',
  refreshTimer:null,
  observer:null,
  presence:null,
  presencePeers:{},
  presenceTimer:null,
  personName:'',
  recommendedAction:null
};

function niEl(id){return document.getElementById(id)}
function niSafe(fn,fallback){try{return fn()}catch(error){return fallback}}
function niStorage(){return window.AnaestheticRuntime&&window.AnaestheticRuntime.storage?window.AnaestheticRuntime.storage:localStorage}
function niNow(){return typeof appNowMs==='function'?appNowMs():Date.now()}
function niReadPrefs(){
  var raw=null;try{raw=niStorage().getItem(STORE_KEY)}catch(error){}
  if(raw)try{var parsed=JSON.parse(raw);if(parsed&&typeof parsed==='object'){state.calm=!!parsed.calm;if(['auto','compact','comfortable'].indexOf(parsed.density)>=0)state.density=parsed.density}}catch(error){}
}
function niWritePrefs(){try{niStorage().setItem(STORE_KEY,JSON.stringify({calm:state.calm,density:state.density,version:NI_VERSION}))}catch(error){}}
function niCurrentBase(){return niSafe(function(){return typeof cur==='function'?cur():null},null)}
function niPlan(){var base=niCurrentBase();return base&&niSafe(function(){return typeof staffingPlan==='function'?staffingPlan(base):null},null)}
function niContext(){var base=niCurrentBase();return niSafe(function(){return typeof resolveNightContext==='function'?resolveNightContext(undefined,base&&base.date):null},null)}
function niDate(){var base=niCurrentBase();return base&&base.date||''}
function niFmt(date){return niSafe(function(){return typeof fmt==='function'?fmt(date):date},date||'Selected night')}
function niPhase(){
  var context=niContext(),phase=context&&context.phase||'selected';
  var map={evening:['Before duty','Your night is prepared for the 19:00 start.'],first:['First part','The first duty segment is active.'],second:['Second part','The second duty segment is active.'],complete:['Night complete','The 07:00 duty window has finished.'],next:['Next night','This is the next rostered night.'],selected:['Selected night','You are viewing a manually selected roster night.']};
  return{key:phase,label:(map[phase]||map.selected)[0],detail:(map[phase]||map.selected)[1]}
}
function niSyncAge(){var stamp=niSafe(function(){return lastSuccessfulSyncAt},'');var value=stamp?new Date(stamp).getTime():0;return value?Math.max(0,niNow()-value):null}
function niFreshnessLabel(){
  if(navigator.onLine===false||niSafe(function(){return !!forcedOfflineSession},false))return'Offline · saved roster';
  var status=niSafe(function(){return sharedSyncState},'live');if(status&&status!=='live')return status==='reconnecting'?'Reconnecting':status==='stale'?'Needs refresh':'Sync issue';
  var age=niSyncAge();if(age===null)return'Checking freshness';
  if(age<60000)return'Live · just refreshed';if(age<120000)return'Live · '+Math.max(1,Math.floor(age/60000))+' min ago';
  return'Last refreshed '+Math.max(2,Math.floor(age/60000))+' min ago'
}
function niChatUnread(){var badge=niEl('chatUnreadBadge');if(!badge||badge.classList.contains('hidden'))return 0;var value=parseInt(String(badge.textContent||'0').replace(/\D/g,''),10);return Number.isFinite(value)?value:0}
function niWorkflowTasks(base,plan){return niSafe(function(){return typeof workflowTaskDetails==='function'?workflowTaskDetails(base,plan)||[]:[]},[])}
function niPlanAssignments(plan){return plan&&Array.isArray(plan.validAssignments)?plan.validAssignments:plan&&plan.staffing&&Array.isArray(plan.staffing.validAssignments)?plan.staffing.validAssignments:[]}
function niConflictItems(){
  var base=niCurrentBase(),plan=niPlan();if(!base||!plan)return[];
  var items=[],count=Number(plan.count||plan.staffing&&plan.staffing.count||0),tasks=niWorkflowTasks(base,plan);
  if(count<5)items.push({id:'cover-critical',severity:'critical',title:'Cover required',detail:'Only '+count+' nurse'+(count===1?' is':'s are')+' currently available. The plan must remain provisional.',action:'review',step:'staffing'});
  else if(count===5&&plan.requiresCoverageChoice)items.push({id:'five-cover',severity:'warning',title:'Choose five-nurse cover',detail:'The reliever or agreed five-person arrangement still needs to be resolved.',action:'review',step:'allocation'});
  if(plan.requiresSeventhDecision)items.push({id:'seventh-decision',severity:'warning',title:'Resolve seventh-nurse allocation',detail:'Choose how the seventh position and overtime cover should be used.',action:'review',step:'allocation'});
  tasks.forEach(function(task,index){
    var text=typeof task==='string'?task:(task&&task.label)||'Allocation decision';
    var key='task-'+index+'-'+String(text).toLowerCase().replace(/[^a-z0-9]+/g,'-').slice(0,30);
    if(!items.some(function(item){return item.id===key||item.title===text}))items.push({id:key,severity:'warning',title:text,detail:'This night still has an allocation decision to complete.',action:'review',step:'allocation'});
  });
  var assignments=niPlanAssignments(plan),seen={};assignments.forEach(function(item){var id=String(item&&item.id||'');if(!id)return;if(seen[id])items.push({id:'duplicate-'+id,severity:'critical',title:'Allocation conflict detected',detail:'The same nurse appears in more than one effective allocation. Review the latest shared plan before confirming.',action:'review',step:'allocation'});seen[id]=true});
  var syncState=niSafe(function(){return sharedSyncState},'live');if(syncState==='stale'||syncState==='error')items.push({id:'sync-'+syncState,severity:'warning',title:'Shared roster needs attention',detail:'Refresh the shared roster before making a consequential change.',action:'refresh'});
  if(state.conflict&&state.conflict.date&&state.conflict.date!==niDate())state.conflict=null;if(state.conflict)items.unshift({id:'revision-conflict',severity:'critical',title:'Another device changed this night',detail:'The latest shared plan was loaded. Compare the changed items before saving your draft again.',action:'conflict'});
  return items
}
function niReadSafeIntent(){var raw=null;try{raw=niStorage().getItem(INTENT_KEY)}catch(error){}if(!raw)return null;try{var value=JSON.parse(raw);if(!value||Date.now()-Number(value.createdAt||0)>12*60*60*1000){niStorage().removeItem(INTENT_KEY);return null}return value}catch(error){return null}}
function niWriteSafeIntent(intent){try{niStorage().setItem(INTENT_KEY,JSON.stringify(intent))}catch(error){}}
function niClearSafeIntent(){try{niStorage().removeItem(INTENT_KEY)}catch(error){}}
function niAttentionItems(){
  var items=niConflictItems();
  if(navigator.onLine===false||niSafe(function(){return !!forcedOfflineSession},false))items.push({id:'offline',severity:'info',title:'Read-only offline mode',detail:'Saved roster information is available. Shared changes will not be queued or sent until you reconnect.',action:'health'});
  var intent=niReadSafeIntent();if(intent)items.push({id:'safe-intent',severity:'info',title:'Action ready to continue',detail:intent.label+' is saved as a private reminder only. It will never auto-submit.',action:'resume-intent',intent:intent});
  var unread=niChatUnread();if(unread)items.push({id:'chat-unread',severity:'info',title:unread+' unread chat message'+(unread===1?'':'s'),detail:'Open Team Chat to review new messages.',action:'chat'});
  if(state.undo&&Date.now()-state.undo.createdAt<20000)items.unshift({id:'undo',severity:'info',title:'Undo last change',detail:state.undo.label||'A recent shared change can still be reversed.',action:'undo'});
  return items
}
function niActionableAttention(item){return !!item&&(item.severity==='critical'||item.severity==='warning')&&item.action!=='refresh'}
function niAttentionCount(){return niAttentionItems().filter(niActionableAttention).length}
function niRecommendedAction(){
  var items=niAttentionItems(),priority=items.find(function(item){return item.severity==='critical'})||items.find(function(item){return item.severity==='warning'});
  if(priority)return{label:priority.title,detail:priority.detail,run:function(){niRoute(priority)}};
  if(navigator.onLine===false)return{label:'View saved roster',detail:'The app is read-only until the connection returns.',run:function(){niOpenHealth()}};
  return{label:'Review this night',detail:'Open the current shared plan and activity.',run:function(){if(typeof show==='function')show('changes')}}
}
function niPersonalSummary(){
 return'Your allocation, timing and break are ready below.'
}
function niShiftIdentity(){
  var visible=document.querySelector('[data-night-team-identity]:not(.hidden)');if(visible&&visible.textContent.trim())return visible.textContent.trim();
  var date=niDate(),name=niSafe(function(){return window.nightTeamNickname&&window.nightTeamNickname(date)},'');return name||'Anaesthetic Team'
}
function niPresenceCount(){var cutoff=Date.now()-45000,ids=Object.keys(state.presencePeers);return ids.filter(function(id){return Number(state.presencePeers[id]||0)>=cutoff}).length}
function niPresenceLabel(){var count=niPresenceCount();return count>1?count+' active app sessions':count===1?'This app session is active':'Presence private'}

function niMake(tag,className,text){var node=document.createElement(tag);if(className)node.className=className;if(text!==undefined)node.textContent=text;return node}
function niEnsureLiveRegion(){if(niEl('nightIntelligenceLive'))return;var live=niMake('div','srOnly');live.id='nightIntelligenceLive';live.setAttribute('role','status');live.setAttribute('aria-live','polite');document.body.appendChild(live)}
function niAnnounce(text){var live=niEl('nightIntelligenceLive');if(!live)return;live.textContent='';setTimeout(function(){live.textContent=text||''},20)}
function niEnsureCentre(){
  if(niEl('nightIntelligenceCentre'))return;
  var panel=document.querySelector('#today .nightOverviewPanel'),personal=niEl('personalNight');if(!panel||!personal)return;
  var section=niMake('section','nightIntelligenceCentre');section.id='nightIntelligenceCentre';section.setAttribute('aria-labelledby','nightIntelligenceHeading');
  section.innerHTML='<div class="nightIntelligenceHead"><div><span class="nightIntelligenceEyebrow">Night intelligence</span><h2 id="nightIntelligenceHeading">Command centre</h2></div><button type="button" id="nightCalmToggle" class="nightIntelligenceIconBtn" aria-pressed="false" aria-label="Toggle Calm Mode">◐</button></div><div class="nightIntelligenceSignalRow"><span id="nightFreshnessSignal" class="nightIntelligenceSignal"></span><span id="nightPresenceSignal" class="nightIntelligenceSignal"></span></div><button type="button" id="nightMyNightAction" class="nightIntelligencePrimary"><span><b>My Night</b><small id="nightMyNightSummary"></small></span><span aria-hidden="true">›</span></button><button type="button" id="nightAttentionAction" class="nightIntelligenceAttention"><span><b>Attention</b><small id="nightAttentionSummary"></small></span><span id="nightAttentionBadge" class="nightIntelligenceBadge hidden"></span></button><button type="button" id="nightRecommendedAction" class="nightIntelligenceRecommended" aria-label="Open Night Intelligence recommendation" aria-describedby="nightRecommendedTitle nightRecommendedDetail"><span><b id="nightRecommendedTitle">Review this night</b><small id="nightRecommendedDetail"></small></span><span aria-hidden="true">›</span></button>';
  panel.insertBefore(section,personal);
  niEl('nightMyNightAction').onclick=function(){var target=niEl('personalNight');if(target&&target.scrollIntoView)target.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'start'})};
  niEl('nightAttentionAction').onclick=niOpenAttention;
  niEl('nightCalmToggle').onclick=function(){niSetCalm(!state.calm)};
}
function niDialog(id,title){
  var dialog=niEl(id);if(dialog)return dialog;dialog=document.createElement('dialog');dialog.id=id;dialog.className='nightIntelligenceDialog';dialog.setAttribute('aria-labelledby',id+'Title');
  var head=niMake('div','nightIntelligenceDialogHead'),copy=niMake('div',''),eyebrow=niMake('span','nightIntelligenceEyebrow','Night intelligence'),heading=niMake('h2','',title),close=niMake('button','nightIntelligenceIconBtn','×');heading.id=id+'Title';close.type='button';close.setAttribute('aria-label','Close');close.onclick=function(){dialog.close()};copy.appendChild(eyebrow);copy.appendChild(heading);head.appendChild(copy);head.appendChild(close);dialog.appendChild(head);document.body.appendChild(dialog);return dialog
}
function niEnsureDialogs(){
  var attention=niDialog('nightAttentionDialog','Attention inbox');var body=niMake('div','nightIntelligenceDialogBody');body.id='nightAttentionList';attention.appendChild(body);
  var conflict=niDialog('nightConflictDialog','Review concurrent changes');var conflictBody=niMake('div','nightIntelligenceDialogBody');conflictBody.id='nightConflictBody';conflict.appendChild(conflictBody);
  var palette=niDialog('nightCommandPalette','Search & commands');var search=niMake('input','nightCommandInput');search.id='nightCommandInput';search.type='search';search.placeholder='Search actions';search.setAttribute('aria-label','Search actions');var commands=niMake('div','nightCommandList');commands.id='nightCommandList';palette.appendChild(search);palette.appendChild(commands);search.addEventListener('input',niRenderCommands);
  var health=niDialog('nightHealthDialog','App health');var healthBody=niMake('div','nightIntelligenceDialogBody');healthBody.id='nightHealthBody';health.appendChild(healthBody);
  var person=niDialog('nightPersonActions','Quick person actions');var personBody=niMake('div','nightIntelligenceDialogBody');personBody.id='nightPersonActionsBody';person.appendChild(personBody);
}
function niOpenDialog(dialog){if(!dialog)return;if(dialog.showModal&&!dialog.open)dialog.showModal()}
function niRenderAttention(){
  var host=niEl('nightAttentionList');if(!host)return;host.textContent='';var items=niAttentionItems();
  if(!items.length){var empty=niMake('div','nightIntelligenceEmpty');empty.appendChild(niMake('b','','Nothing needs action'));empty.appendChild(niMake('p','','The selected night is current and there are no unresolved roster decisions.'));host.appendChild(empty);return}
  items.forEach(function(item){var button=niMake('button','nightAttentionItem severity-'+item.severity);button.type='button';button.dataset.attentionId=item.id;var copy=niMake('span','');copy.appendChild(niMake('b','',item.title));copy.appendChild(niMake('small','',item.detail));button.appendChild(copy);button.appendChild(niMake('span','nightAttentionChevron','›'));button.onclick=function(){var dialog=niEl('nightAttentionDialog');if(dialog&&dialog.open)dialog.close();niRoute(item)};host.appendChild(button)})
}
function niOpenAttention(){niRenderAttention();niOpenDialog(niEl('nightAttentionDialog'))}
function niRoute(item){
  if(!item)return;
  if(item.action==='undo'&&state.undo){var undo=state.undo;state.undo=null;Promise.resolve().then(undo.run).catch(function(){niAnnounce('Undo could not be completed')});return}
  if(item.action==='refresh'){if(typeof loadSharedData==='function')loadSharedData({background:false}).catch(function(){});return}
  if(item.action==='chat'){if(typeof show==='function')show('chat');if(window.openChatView)window.openChatView({force:true});return}
  if(item.action==='health'){niOpenHealth();return}
  if(item.action==='conflict'){niOpenConflict(state.conflict);return}
  if(item.action==='resume-intent'){niResumeSafeIntent(item.intent);return}
  if(item.action==='review'){if(typeof show==='function')show('changes');if(typeof setChangesStep==='function')setChangesStep(item.step||'allocation',true);return}
}
function niOpenConflict(conflict){
  var host=niEl('nightConflictBody');if(!host)return;host.textContent='';var intro=niMake('p','nightIntelligenceIntro','Another authorised device changed this night while you were working. The latest shared roster has already been loaded. Compare the changed fields below before saving again.');host.appendChild(intro);
  var changes=conflict&&Array.isArray(conflict.changes)?conflict.changes:[];
  if(!changes.length)host.appendChild(niMake('p','nightIntelligenceMuted','The shared revision changed, but there is no safe field-level comparison available. Review Staffing and Allocation before continuing.'));
  changes.forEach(function(change){var row=niMake('div','nightConflictRow'),title=niMake('b','',change.label||'Changed item'),before=niMake('small','','Was: '+String(change.before==null?'Not set':change.before)),after=niMake('small','','Now: '+String(change.after==null?'Not set':change.after));row.appendChild(title);row.appendChild(before);row.appendChild(after);host.appendChild(row)});
  var actions=niMake('div','nightIntelligenceDialogActions'),review=niMake('button','primary','Review latest plan'),close=niMake('button','soft','Keep viewing');review.type='button';close.type='button';review.onclick=function(){state.conflict=null;niScheduleRender(10);niEl('nightConflictDialog').close();if(typeof show==='function')show('changes');if(typeof setChangesStep==='function')setChangesStep('allocation',true)};close.onclick=function(){niEl('nightConflictDialog').close()};actions.appendChild(review);actions.appendChild(close);host.appendChild(actions);niOpenDialog(niEl('nightConflictDialog'))
}
function niWrapMutation(){
  if(typeof window.runRosterMutation!=='function'||window.runRosterMutation.__nightIntelligence)return;var original=window.runRosterMutation;
  function wrapped(){var args=arguments;return Promise.resolve(original.apply(this,args)).then(function(result){if(result&&result.error){var code=String(result.error.code||result.error.message||'');if(code.indexOf('ROSTER_REVISION_CONFLICT')>=0||Array.isArray(result.conflictChanges)&&result.conflictChanges.length){state.conflict={at:Date.now(),date:niDate(),changes:result.conflictChanges||[]};niOpenConflict(state.conflict);niScheduleRender(10)}}else if(state.conflict){state.conflict=null;niScheduleRender(10)}return result})}
  wrapped.__nightIntelligence=true;wrapped.__original=original;window.runRosterMutation=wrapped
}
function niWrapToast(){
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
function niQueueSafeIntent(action,label){var intent={action:action,label:label,date:niDate(),createdAt:Date.now()};niWriteSafeIntent(intent);niAnnounce(label+' saved to continue when online');if(typeof toast==='function')toast(label+' saved as a reminder. It will not auto-submit.');niScheduleRender(10)}
function niResumeSafeIntent(intent){if(!intent)return;niClearSafeIntent();if(navigator.onLine===false){niWriteSafeIntent(intent);niOpenHealth();return}if(intent.date&&typeof chooseDate==='function'){var input=niEl('datePick');if(input){input.value=intent.date;chooseDate('datePick')}}if(intent.action==='absence'||intent.action==='overtime'||intent.action==='review'){if(typeof show==='function')show('changes');if(typeof setChangesStep==='function')setChangesStep(intent.action==='review'?'allocation':'staffing',true)}niScheduleRender(10)}
function niEnhanceQuickActions(model){
  var dialog=niEl('quickActionsSheet');if(!dialog)return;var existing=niEl('nightRecommendedQuickAction');if(existing)existing.remove();var recommendation=niRecommendedAction();state.recommendedAction=recommendation;
  var host=dialog.querySelector('.quickActionsHead');if(host&&recommendation.label!=='Review this night'){var button=niMake('button','nightRecommendedQuickAction');button.id='nightRecommendedQuickAction';button.type='button';var copy=niMake('span','');copy.appendChild(niMake('b','','Recommended · '+recommendation.label));copy.appendChild(niMake('small','',recommendation.detail));button.appendChild(copy);button.appendChild(niMake('span','','›'));button.onclick=function(){if(dialog.open)dialog.close();recommendation.run()};host.insertAdjacentElement('afterend',button)}
  if(model&&model.canEdit===false){['quickAbsenceFallback','quickOvertimeFallback'].forEach(function(id){var row=niEl(id);if(!row)return;row.disabled=false;row.setAttribute('aria-disabled','false');row.dataset.offlineIntent='true';row.onclick=function(event){event.preventDefault();var action=id==='quickAbsenceFallback'?'absence':'overtime';niQueueSafeIntent(action,action==='absence'?'Report an absence':'Add overtime cover');if(dialog.open)dialog.close()}})}
}
function niCommands(){
  var attention=niAttentionCount();return[
    {name:'Open My Night',detail:'Jump to your allocation, timing and break',keywords:'my night allocation break',run:function(){if(typeof show==='function')show('today');var target=niEl('personalNight');if(target)target.scrollIntoView({block:'start'})}},
    {name:'Attention inbox'+(attention?' · '+attention:''),detail:'Review unresolved staffing, allocation, sync and conflict items',keywords:'attention alerts tasks conflict',run:niOpenAttention},
    {name:'Report an absence',detail:navigator.onLine===false?'Save a reminder and continue after reconnecting':'Open Staffing at the absence form',keywords:'absence sick leave staffing',run:function(){if(navigator.onLine===false)niQueueSafeIntent('absence','Report an absence');else{if(typeof show==='function')show('changes');if(typeof setChangesStep==='function')setChangesStep('staffing',true)}}},
    {name:'Add overtime cover',detail:navigator.onLine===false?'Save a reminder and continue after reconnecting':'Open Staffing at overtime',keywords:'overtime extra nurse cover',run:function(){if(navigator.onLine===false)niQueueSafeIntent('overtime','Add overtime cover');else{if(typeof show==='function')show('changes');if(typeof setChangesStep==='function')setChangesStep('staffing',true)}}},
    {name:'Review changes',detail:'Open Staffing → Allocation → Confirm',keywords:'changes allocation confirm review',run:function(){if(typeof show==='function')show('changes');if(typeof setChangesStep==='function')setChangesStep('allocation',true)}},
    {name:'Team Chat',detail:'Open Anaesthetic Team chat',keywords:'chat message team',run:function(){if(typeof show==='function')show('chat');if(window.openChatView)window.openChatView({force:true})}},
    {name:'Full roster',detail:'Open the full published roster',keywords:'full roster dates',run:function(){if(typeof show==='function')show('roster')}},
    {name:'App health',detail:'Check connection, freshness, service worker, storage and notifications',keywords:'health troubleshoot offline sync notification',run:niOpenHealth},
    {name:state.calm?'Turn Calm Mode off':'Turn Calm Mode on',detail:'Prioritise time, your allocation, next break and important changes',keywords:'calm focus mode',run:function(){niSetCalm(!state.calm)}},
    {name:'Density · '+state.density,detail:'Cycle Auto, Compact and Comfortable spacing',keywords:'density compact comfortable spacing',run:niCycleDensity}
  ].concat(state.undo&&Date.now()-state.undo.createdAt<20000?[{name:'Undo last shared change',detail:state.undo.label||'Reverse the most recent supported change',keywords:'undo rollback',run:function(){niRoute({action:'undo'})}}]:[])
}
function niRenderCommands(){
  var host=niEl('nightCommandList'),input=niEl('nightCommandInput');if(!host)return;host.textContent='';var query=String(input&&input.value||'').trim().toLowerCase();var commands=niCommands().filter(function(command){return !query||(command.name+' '+command.detail+' '+command.keywords).toLowerCase().indexOf(query)>=0});
  commands.forEach(function(command){var button=niMake('button','nightCommandRow');button.type='button';var copy=niMake('span','');copy.appendChild(niMake('b','',command.name));copy.appendChild(niMake('small','',command.detail));button.appendChild(copy);button.appendChild(niMake('span','','›'));button.onclick=function(){var dialog=niEl('nightCommandPalette');if(dialog&&dialog.open)dialog.close();command.run()};host.appendChild(button)});
  if(!commands.length)host.appendChild(niMake('p','nightIntelligenceMuted','No matching command.'))
}
function niOpenPalette(){niRenderCommands();var dialog=niEl('nightCommandPalette');niOpenDialog(dialog);setTimeout(function(){var input=niEl('nightCommandInput');if(input){input.value='';input.focus();niRenderCommands()}},20)}
function niCycleDensity(){state.density=state.density==='auto'?'compact':state.density==='compact'?'comfortable':'auto';niWritePrefs();niApplyDensity();niAnnounce('Density set to '+state.density);niScheduleRender(10)}
function niApplyDensity(){var root=document.documentElement,mode=state.density;if(mode==='auto')mode=window.innerWidth<=390?'compact':'comfortable';root.setAttribute('data-night-density',mode);root.setAttribute('data-night-density-preference',state.density)}
function niSetCalm(value){state.calm=!!value;niWritePrefs();document.documentElement.classList.toggle('nightCalmMode',state.calm);var button=niEl('nightCalmToggle');if(button)button.setAttribute('aria-pressed',state.calm?'true':'false');niAnnounce(state.calm?'Calm Mode on':'Calm Mode off');niScheduleRender(10)}
function niLongPressName(target){
  if(!target)return'';var attrs=['nurseName','absenceName','overtimeName','personName','rosterName'];for(var i=0;i<attrs.length;i++){var value=target.dataset&&target.dataset[attrs[i]];if(value)return String(value)}
  var strong=target.querySelector&&target.querySelector('strong,b,.name,.personName');return strong?String(strong.textContent||'').trim():''
}
function niOpenPersonActions(name){
  state.personName=name;var host=niEl('nightPersonActionsBody');if(!host)return;host.textContent='';host.appendChild(niMake('p','nightIntelligenceIntro',name));
  var review=niMake('button','nightPersonAction','Review this night'),chat=niMake('button','nightPersonAction','Open Team Chat'),copy=niMake('button','nightPersonAction','Copy name');review.type=chat.type=copy.type='button';review.onclick=function(){niEl('nightPersonActions').close();if(typeof show==='function')show('changes')};chat.onclick=function(){niEl('nightPersonActions').close();if(typeof show==='function')show('chat');if(window.openChatView)window.openChatView({force:true})};copy.onclick=function(){if(navigator.clipboard&&navigator.clipboard.writeText)navigator.clipboard.writeText(name).then(function(){niAnnounce('Name copied')});niEl('nightPersonActions').close()};host.appendChild(review);host.appendChild(chat);host.appendChild(copy);niOpenDialog(niEl('nightPersonActions'))
}
function niBindLongPress(){
  var timer=null,startX=0,startY=0;function cancel(){if(timer){clearTimeout(timer);timer=null}}
  document.addEventListener('pointerdown',function(event){var candidate=event.target&&event.target.closest&&event.target.closest('[data-absence-name],[data-overtime-name],[data-person-name],[data-roster-name],.allocationRow,.rosterLedgerRow,.teamAllocationRow');if(!candidate)return;var name=niLongPressName(candidate);if(!name)return;startX=event.clientX;startY=event.clientY;timer=setTimeout(function(){timer=null;if(navigator.vibrate)navigator.vibrate(18);niOpenPersonActions(name)},520)});
  document.addEventListener('pointermove',function(event){if(timer&&(Math.abs(event.clientX-startX)>8||Math.abs(event.clientY-startY)>8))cancel()});document.addEventListener('pointerup',cancel);document.addEventListener('pointercancel',cancel);
  document.addEventListener('contextmenu',function(event){var candidate=event.target&&event.target.closest&&event.target.closest('[data-absence-name],[data-overtime-name],[data-person-name],[data-roster-name],.allocationRow,.rosterLedgerRow,.teamAllocationRow');if(!candidate)return;var name=niLongPressName(candidate);if(!name)return;event.preventDefault();niOpenPersonActions(name)})
}
function niSessionId(){var id='';try{id=sessionStorage.getItem(SESSION_KEY)||'';if(!id){id='ni-'+Math.random().toString(36).slice(2)+Date.now().toString(36);sessionStorage.setItem(SESSION_KEY,id)}}catch(error){id='ni-'+Math.random().toString(36).slice(2)}return id}
function niStartPrivatePresence(){
  if(!('BroadcastChannel'in window))return;var id=niSessionId();state.presencePeers[id]=Date.now();var channel=new BroadcastChannel('anaes-night-presence-v1');state.presence=channel;
  channel.onmessage=function(event){var data=event.data||{};if(data.type==='heartbeat'&&data.id){state.presencePeers[data.id]=Number(data.at||Date.now());niScheduleRender(40)}if(data.type==='bye'&&data.id){delete state.presencePeers[data.id];niScheduleRender(40)}};
  function beat(){state.presencePeers[id]=Date.now();try{channel.postMessage({type:'heartbeat',id:id,at:Date.now(),view:document.body.getAttribute('data-view')||''})}catch(error){};niScheduleRender(40)}
  beat();state.presenceTimer=setInterval(beat,15000);window.addEventListener('pagehide',function(){try{channel.postMessage({type:'bye',id:id,at:Date.now()})}catch(error){}})
}
function niHealthChecks(){
  var checks=[];function add(label,ok,detail,action){checks.push({label:label,ok:ok,detail:detail,action:action})}
  var online=navigator.onLine!==false&&!niSafe(function(){return !!forcedOfflineSession},false);add('Connection',online,online?'Online':'Using saved read-only roster','connection');
  var age=niSyncAge(),fresh=age!==null&&age<180000;add('Roster freshness',online?fresh:true,age===null?'No successful refresh recorded':niFreshnessLabel(),'freshness');
  add('Shared sync',niSafe(function(){return sharedSyncState==='live'},false),String(niSafe(function(){return sharedSyncState},'starting')),'sync');
  add('Service worker','serviceWorker'in navigator,'serviceWorker'in navigator?'Supported':'Not supported on this browser','worker');
  var standalone=matchMedia&&matchMedia('(display-mode: standalone)').matches||navigator.standalone===true;add('Installed app',standalone,standalone?'Running as installed PWA':'Running in the browser','install');
  var notification='Notification'in window?Notification.permission:'unsupported';add('Notifications',notification!=='denied',notification==='granted'?'Allowed':notification==='denied'?'Blocked in device settings':'Not enabled','notifications');
  var storageOk=niSafe(function(){var key='__ni_health';niStorage().setItem(key,'1');niStorage().removeItem(key);return true},false);add('Local recovery storage',storageOk,storageOk?'Available':'Unavailable','storage');
  return checks
}
function niGuidance(check){
  if(check.action==='connection')return'Check Wi-Fi or mobile data. The saved roster remains read-only until the connection returns.';
  if(check.action==='freshness'||check.action==='sync')return'Use Refresh latest roster. If the problem continues, reopen the app before making a shared change.';
  if(check.action==='worker')return'Open Night Roster in a current Safari, Chrome or Edge browser and install it again if needed.';
  if(check.action==='install')return'Use the app installation guide from Account to add Night Roster to the Home Screen.';
  if(check.action==='notifications')return'Open the phone or browser notification settings for Night Roster and allow notifications, then reopen the app.';
  if(check.action==='storage')return'Private browsing or restricted storage can prevent offline recovery. Open the installed app in normal browsing mode.';
  return'Close and reopen Night Roster, then run the health check again.'
}
function niOpenHealth(){
  var dialog=niDialog('nightHealthDialog','App health'),host=niEl('nightHealthBody');if(!host||!dialog.contains(host)){host=niMake('div','nightIntelligenceDialogBody');host.id='nightHealthBody';dialog.appendChild(host)}host.textContent='';var checks=niHealthChecks(),failed=checks.filter(function(check){return !check.ok});
  checks.forEach(function(check){var row=niMake('div','nightHealthRow '+(check.ok?'ok':'problem')),icon=niMake('span','nightHealthIcon',check.ok?'✓':'!'),copy=niMake('span','');copy.appendChild(niMake('b','',check.label));copy.appendChild(niMake('small','',check.detail));row.appendChild(icon);row.appendChild(copy);host.appendChild(row)});
  if(failed.length){var guide=niMake('div','nightTroubleshoot');guide.appendChild(niMake('h3','','Guided troubleshooting'));failed.forEach(function(check){var item=niMake('div','nightTroubleshootItem');item.appendChild(niMake('b','',check.label));item.appendChild(niMake('p','',niGuidance(check)));guide.appendChild(item)});host.appendChild(guide)}else host.appendChild(niMake('p','nightHealthGood','Everything needed for a safe shared roster session looks healthy.'));
  var actions=niMake('div','nightIntelligenceDialogActions'),refresh=niMake('button','primary','Refresh latest roster'),close=niMake('button','soft','Close');refresh.type=close.type='button';refresh.disabled=navigator.onLine===false;refresh.onclick=function(){if(typeof loadSharedData==='function')Promise.resolve(loadSharedData({background:false})).finally(function(){niOpenHealth()})};close.onclick=function(){niEl('nightHealthDialog').close()};actions.appendChild(refresh);actions.appendChild(close);host.appendChild(actions);niOpenDialog(dialog)
}
function niSmartNotify(items){
  var critical=items.filter(niActionableAttention),signature=critical.map(function(item){return item.id}).sort().join('|');state.lastAttentionSignature=signature;if(!signature||signature===state.lastNotifiedSignature)return;
  var toggle=niEl('pushRosterToggle');if(toggle&&toggle.checked===false)return;if(document.visibilityState!=='hidden'||!('Notification'in window)||Notification.permission!=='granted'||!navigator.serviceWorker)return;
  state.lastNotifiedSignature=signature;var first=critical[0],date=niDate(),url='./?view=night'+(date?'&date='+encodeURIComponent(date):'');navigator.serviceWorker.ready.then(function(registration){if(registration&&registration.showNotification)return registration.showNotification('Night Roster needs attention',{body:first.title+(critical.length>1?' · '+critical.length+' items need review':''),icon:'icon-192.png?v=51.2',badge:'icon-192.png?v=51.2',tag:'night-intelligence-'+(date||'selected'),renotify:false,data:{type:'roster',url:url,rosterDate:date}})}).catch(function(){})
}
function niSyncBadge(){
  var count=niAttentionCount()+niChatUnread();if(!navigator.setAppBadge&&!navigator.clearAppBadge)return;try{if(count&&navigator.setAppBadge)navigator.setAppBadge(count);else if(navigator.clearAppBadge)navigator.clearAppBadge()}catch(error){}
}
function niWrapBadge(){if(typeof window.syncAppBadge!=='function'||window.syncAppBadge.__nightIntelligence)return;var original=window.syncAppBadge;function wrapped(){var result=original.apply(this,arguments);setTimeout(niSyncBadge,0);return result}wrapped.__nightIntelligence=true;window.syncAppBadge=wrapped}
function niRenderCentre(){
  niEnsureCentre();var phase=niPhase(),phaseEl=niEl('nightPhaseSignal'),fresh=niEl('nightFreshnessSignal'),presence=niEl('nightPresenceSignal');document.documentElement.setAttribute('data-night-phase',phase.key);if(phaseEl)phaseEl.textContent=phase.label;if(fresh)fresh.textContent=niFreshnessLabel();if(presence)presence.textContent=niPresenceLabel();
  var summary=niEl('nightMyNightSummary');if(summary)summary.textContent=niPersonalSummary();var items=niAttentionItems(),important=items.filter(function(item){return item.severity==='critical'||item.severity==='warning'}),attentionSummary=niEl('nightAttentionSummary'),badge=niEl('nightAttentionBadge');if(attentionSummary)attentionSummary.textContent=important.length?important[0].title+(important.length>1?' · '+important.length+' items':''):'No unresolved roster decisions';if(badge){badge.textContent=String(important.length);badge.classList.toggle('hidden',!important.length)}
  var recommendation=niRecommendedAction(),title=niEl('nightRecommendedTitle'),detail=niEl('nightRecommendedDetail'),button=niEl('nightRecommendedAction');state.recommendedAction=recommendation;if(title)title.textContent=recommendation.label;if(detail)detail.textContent=recommendation.detail;if(button)button.onclick=recommendation.run;var calm=niEl('nightCalmToggle');if(calm)calm.setAttribute('aria-pressed',state.calm?'true':'false');niSmartNotify(items);niSyncBadge()
}
function niAccessibilityPass(){
  Array.prototype.forEach.call(document.querySelectorAll('dialog'),function(dialog){if(!dialog.hasAttribute('aria-label')&&!dialog.hasAttribute('aria-labelledby')){var heading=dialog.querySelector('h1,h2,h3');if(heading){if(!heading.id)heading.id='dialog-heading-'+Math.random().toString(36).slice(2);dialog.setAttribute('aria-labelledby',heading.id)}}});
  Array.prototype.forEach.call(document.querySelectorAll('button:not([aria-label])'),function(button){if(!String(button.textContent||'').trim()&&button.querySelector('svg'))button.setAttribute('aria-label','Action')})
}
function niScheduleRender(delay){clearTimeout(state.refreshTimer);state.refreshTimer=setTimeout(function(){niRenderCentre();niRenderAttention();niApplyDensity();niAccessibilityPass()},delay==null?80:delay)}
function niBindKeyboard(){document.addEventListener('keydown',function(event){if((event.metaKey||event.ctrlKey)&&event.key.toLowerCase()==='k'){event.preventDefault();niOpenPalette();return}if(event.key==='/'&&!event.metaKey&&!event.ctrlKey&&!event.altKey&&!(event.target&&/INPUT|TEXTAREA|SELECT/.test(event.target.tagName))){event.preventDefault();niOpenPalette()}})}
function niMutationIsInternal(target){
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
function niBindLifecycle(){
  window.addEventListener('roster:quick-actions',function(event){niEnhanceQuickActions(event&&event.detail||null)});window.addEventListener('online',function(){var intent=niReadSafeIntent();if(intent&&typeof toast==='function')toast('Connection restored. '+intent.label+' is ready to continue.',{label:'Continue',run:function(){niResumeSafeIntent(intent)}});niScheduleRender(20)});window.addEventListener('offline',function(){niScheduleRender(20)});document.addEventListener('visibilitychange',function(){niScheduleRender(40)});window.addEventListener('resize',function(){niApplyDensity()})
}
function niInstallPaletteLauncher(){
  var sheet=niEl('quickActionsSheet');if(!sheet||niEl('nightCommandLauncher'))return;var launcher=niMake('button','quickActionRow nightCommandLauncher');launcher.id='nightCommandLauncher';launcher.type='button';launcher.innerHTML='<span class="quickActionCopy"><strong>Search & commands</strong><small>Find any Night Roster action</small></span><span class="quickActionChevron">›</span>';launcher.onclick=function(){if(sheet.open)sheet.close();niOpenPalette()};var list=sheet.querySelector('.quickActionList');if(list)list.appendChild(launcher)
}
function niStart(){
  if(state.started)return;state.started=true;niReadPrefs();niEnsureLiveRegion();niEnsureDialogs();niEnsureCentre();niRenderCentre();niWrapToast(); niWrapPrivateDeviceCleanup(); niWrapMutation();niWrapBadge();niBindLongPress();niBindKeyboard();niBindLifecycle();niStartPrivatePresence();niInstallPaletteLauncher();niSetCalm(state.calm);niApplyDensity();niObserve();niScheduleRender(20);setInterval(function(){niScheduleRender(0)},30000)
}
window.NightIntelligence={version:NI_VERSION,openAttention:niOpenAttention,openPalette:niOpenPalette,openHealth:niOpenHealth,setCalmMode:niSetCalm,queueSafeIntent:niQueueSafeIntent,refresh:niScheduleRender};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',function(){setTimeout(niStart,0)},{once:true});else setTimeout(niStart,0);
})();
