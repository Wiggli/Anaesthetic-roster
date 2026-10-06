(function(){
'use strict';

var state={personal:null,night:null,activity:null,date:'',briefTimer:null,changesTimer:null,briefRequest:0,changesRequest:0,conversation:[],observer:null,cache:{},authSubscription:null,sessionGeneration:0};

function aiEl(id){return document.getElementById(id)}
function aiSafe(fn,fallback){try{return fn()}catch(error){return fallback}}
function aiText(value,max){var text=String(value==null?'':value).trim();return text.slice(0,max||240)}
function aiMake(tag,className,text){var node=document.createElement(tag);if(className)node.className=className;if(text!==undefined)node.textContent=text;return node}
function aiSelectedDate(){return aiSafe(function(){return typeof cur==='function'&&cur()?cur().date:''},state.date||'')||state.date||''}
function aiShiftName(){var visible=document.querySelector('[data-night-team-identity]:not(.hidden)');return visible&&visible.textContent.trim()?visible.textContent.trim():''}
function aiPhase(){return aiSafe(function(){var base=typeof cur==='function'?cur():null,ctx=base&&typeof resolveNightContext==='function'?resolveNightContext(undefined,base.date):null;return ctx&&ctx.phase||''},'')}
function aiFreshness(){if(state.night&&state.night.dataFreshness)return aiText(state.night.dataFreshness,80);return aiSafe(function(){if(!lastSuccessfulSyncAt)return'';var age=Math.max(0,Date.now()-new Date(lastSuccessfulSyncAt).getTime());return age<60000?'Live · just refreshed':'Last refreshed '+Math.max(1,Math.floor(age/60000))+' min ago'},'')}
function aiContext(){
  var p=state.personal||{},n=state.night||{},a=state.activity||{},roles=Array.isArray(n.roles)?n.roles.slice(0,10).map(function(role){return{label:aiText(role.label,80),names:aiText(role.names,160),detail:aiText(role.detail,180),mine:!!role.mine}}):[],changes=Array.isArray(a.items)?a.items.slice(0,8).map(function(item){return{label:aiText(item.label,60),type:aiText(item.type,50),title:aiText(item.title,140),detail:aiText(item.detail,220),meta:aiText(item.meta,120)}}):[];
  return{
    date:aiSelectedDate(),
    phase:aiPhase(),
    shift_name:aiText(aiShiftName(),80),
    freshness:aiFreshness(),
    personal:{display_name:aiText(p.displayName,100),assignment:aiText(p.title,120),detail:aiText(p.detail,180),period:aiText(p.period,80),break_label:aiText(p.breakLabel,100),context_label:aiText(p.contextLabel,80),colleague:aiText(p.context,140),duty_part:aiText(p.dutyPart,60),live_status:aiText(p.liveStatus,80),changed:!!p.changed},
    staffing:{nurse_count:Number(n.nurseCount||0),absence_count:Number(n.absenceCount||0),overtime_count:Number(n.overtimeCount||0),overtime_names:Array.isArray(n.overtimeNames)?n.overtimeNames.slice(0,8).map(function(v){return aiText(v,100)}):[],unresolved_count:Number(n.taskCount||0),decision_count:Number(n.decisionTasks||0),confirm_needed:!!n.confirmNeeded,context_label:aiText(n.contextLabel,100),current_part:aiText(n.currentPart,40),roles:roles},
    recent_changes:{updated:!!a.updated,updated_count:Number(a.updatedCount||0),since_label:aiText(a.sinceLabel,100),items:changes}
  }
}
function aiHash(value){var text=JSON.stringify(value),hash=5381;for(var i=0;i<text.length;i++)hash=((hash<<5)+hash)^text.charCodeAt(i);return(hash>>>0).toString(36)}
function aiCacheRead(key){var item=state.cache[key];if(item&&Date.now()-Number(item.at||0)<6*60*60*1000)return item.value||null;return null}
function aiCacheWrite(key,value){state.cache[key]={at:Date.now(),value:value};var keys=Object.keys(state.cache).sort(function(a,b){return(state.cache[b].at||0)-(state.cache[a].at||0)});keys.slice(20).forEach(function(k){delete state.cache[k]})}
function aiFallback(mode,ctx,question){
  var p=ctx.personal||{},s=ctx.staffing||{},changes=ctx.recent_changes&&ctx.recent_changes.items||[],staffing=s.nurse_count?s.nurse_count+' nurses are in the effective plan.':'Staffing is not yet available.',decision=s.unresolved_count?s.unresolved_count+' roster decision'+(s.unresolved_count===1?' remains':'s remain')+'.':'No roster decisions currently need attention.';
  if(mode==='brief'){
    var parts=[];if(p.assignment)parts.push('You are allocated to '+p.assignment+(p.period?' ('+p.period+')':'')+'.');parts.push(staffing);if(s.overtime_names&&s.overtime_names.length)parts.push(s.overtime_names.join(', ')+' '+(s.overtime_names.length===1?'is':'are')+' recorded as overtime cover.');parts.push(decision);return parts.join(' ')
  }
  if(mode==='changes'){
    if(!changes.length)return'No staffing or allocation changes are recorded for this night.';
    return changes.slice(0,3).map(function(item){return item.title+(item.detail?' — '+item.detail:'')}).join(' ')+(changes.length>3?' '+(changes.length-3)+' more update'+(changes.length-3===1?' is':'s are')+' listed below.':'')
  }
  if(mode==='explain'){
    if(!p.assignment)return'I cannot confirm your allocation from the current shared roster.';
    var reason='Your current shared allocation is '+p.assignment+'. The roster engine, not AI, determines this from the published rotation, confirmed staffing changes and any approved night-only overrides.';if(s.context_label)reason+=' This night is currently marked as '+s.context_label.toLowerCase()+'.';if(p.colleague)reason+=' Your related team context is '+p.colleague+'.';return reason
  }
  var q=String(question||'').toLowerCase();
  if(/break/.test(q))return p.break_label?'Your break is '+p.break_label+'.':'I cannot confirm your break from the current shared roster.';
  if(/who.*(with|working)|colleague|partner/.test(q))return p.colleague?'Your roster shows '+p.colleague+'.':'I cannot confirm who you are working with from the current shared roster.';
  if(/staff|cover|how many|fully staffed/.test(q))return staffing+' '+decision;
  if(/change|changed|update/.test(q))return aiFallback('changes',ctx,'');
  if(/why|allocation|allocated|role|duty/.test(q))return aiFallback('explain',ctx,'');
  return'I can answer questions about your allocation, break, colleagues, staffing and recorded roster changes. I cannot confirm anything that is not present in the current shared roster.'
}
function aiPatientInfoLikely(text){return /\b(patient|mrn|hospital number|diagnos(?:is|es)|medication|drug|procedure|operation details|clinical note|ward note)\b/i.test(String(text||''))}
async function aiToken(){
  var direct=aiSafe(function(){return typeof currentAccessToken!=='undefined'?currentAccessToken:''},'');if(direct)return direct;
  if(window.supa&&supa.auth&&supa.auth.getSession){try{var result=await supa.auth.getSession();return result&&result.data&&result.data.session&&result.data.session.access_token||''}catch(error){}}
  return''
}
async function aiRequest(mode,question){
  var ctx=aiContext(),fallback=aiFallback(mode,ctx,question),cacheKey=mode+':'+aiHash({ctx:ctx,q:question||''}),cached=aiCacheRead(cacheKey);if(cached)return cached;
  if(aiPatientInfoLikely(question))return{text:'This assistant is limited to roster and staffing information. Please do not enter patient information.',ai:false,reason:'patient_scope'};
  if(navigator.onLine===false)return{text:fallback,ai:false,reason:'offline'};
  var token=await aiToken();if(!token)return{text:fallback,ai:false,reason:'no_session'};
  var controller=new AbortController(),timer=setTimeout(function(){controller.abort()},14000);
  try{
    var response=await fetch((typeof SUPABASE_URL!=='undefined'?SUPABASE_URL:'')+'/functions/v1/night-roster-ai',{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+token,'apikey':typeof SUPABASE_KEY!=='undefined'?SUPABASE_KEY:''},body:JSON.stringify({mode:mode,question:aiText(question,500),context:ctx}),signal:controller.signal});
    var data=await response.json().catch(function(){return{}});if(!response.ok)throw new Error(data&&data.error||'AI request failed');var result={text:aiText(data.answer||fallback,1400),ai:data.ai===true,model:aiText(data.model,80),reason:aiText(data.reason,80)};aiCacheWrite(cacheKey,result);return result
  }catch(error){return{text:fallback,ai:false,reason:error&&error.name==='AbortError'?'timeout':'unavailable'}}finally{clearTimeout(timer)}
}
function aiSourceText(result){if(result&&result.ai)return'AI';if(result&&result.reason==='offline')return'Offline roster summary';if(result&&result.reason==='not_configured')return'AI not connected · roster summary';return'Roster-grounded summary'}
function aiEnsureBrief(){
  if(aiEl('nightAiBrief'))return aiEl('nightAiBrief');var personal=aiEl('personalNightCard');if(!personal||!personal.parentNode)return null;
  var section=aiMake('section','nightAiBrief');section.id='nightAiBrief';section.setAttribute('aria-labelledby','nightAiBriefTitle');
  var head=aiMake('div','nightAiBriefHead'),titleWrap=aiMake('div',''),spark=aiMake('span','nightAiSpark','✦'),title=aiMake('strong','', 'Night brief'),source=aiMake('span','nightAiSource','Preparing');title.id='nightAiBriefTitle';titleWrap.appendChild(spark);titleWrap.appendChild(title);head.appendChild(titleWrap);head.appendChild(source);
  var text=aiMake('p','nightAiBriefText','Preparing a roster-grounded summary…');text.id='nightAiBriefText';
  var actions=aiMake('div','nightAiBriefActions'),ask=aiMake('button','nightAiAskButton','Ask Night Roster'),why=aiMake('button','nightAiWhyButton','Why this allocation?');ask.type='button';why.type='button';ask.onclick=function(){aiOpenAssistant()};why.onclick=function(){aiExplainAllocation()};actions.appendChild(ask);actions.appendChild(why);
  section.appendChild(head);section.appendChild(text);section.appendChild(actions);personal.parentNode.insertBefore(section,personal.nextSibling);return section
}
function aiRenderBrief(result){var host=aiEnsureBrief();if(!host)return;var text=aiEl('nightAiBriefText'),source=host.querySelector('.nightAiSource');if(text)text.textContent=result.text;if(source)source.textContent=aiSourceText(result);host.classList.toggle('isAi',!!result.ai)}
function aiRefreshBrief(force){
  clearTimeout(state.briefTimer);state.briefTimer=setTimeout(async function(){if(!state.personal||!state.night||!aiSelectedDate())return;aiEnsureBrief();var request=++state.briefRequest;if(force){var ctx=aiContext(),key='brief:'+aiHash({ctx:ctx,q:''});delete state.cache[key]}var result=await aiRequest('brief','');if(request===state.briefRequest)aiRenderBrief(result)},180)
}
function aiEnsureChanges(){
  var panel=document.querySelector('#today .recentActivityPanel');if(!panel)return null;var existing=aiEl('nightAiChangesSummary');if(existing)return existing;var heading=panel.querySelector('.nightOverviewRowHeading'),box=aiMake('div','nightAiChangesSummary');box.id='nightAiChangesSummary';var icon=aiMake('span','nightAiSpark','✦'),copy=aiMake('span','nightAiChangesCopy'),label=aiMake('b','','AI change summary'),text=aiMake('small','','Preparing…');text.id='nightAiChangesText';copy.appendChild(label);copy.appendChild(text);box.appendChild(icon);box.appendChild(copy);if(heading&&heading.nextSibling)panel.insertBefore(box,heading.nextSibling);else panel.appendChild(box);return box
}
function aiRenderChanges(result){var host=aiEnsureChanges();if(!host)return;var text=aiEl('nightAiChangesText'),copy=host.querySelector('b');if(text)text.textContent=result.text;if(copy)copy.textContent=result.ai?'AI change summary':'Change summary';host.classList.toggle('isAi',!!result.ai)}
function aiRefreshChanges(){clearTimeout(state.changesTimer);state.changesTimer=setTimeout(async function(){var activity=state.activity||{},items=Array.isArray(activity.items)?activity.items:[];if(!items.length){var existing=aiEl('nightAiChangesSummary');if(existing)existing.remove();return}var request=++state.changesRequest,host=aiEnsureChanges();if(host){var text=aiEl('nightAiChangesText');if(text)text.textContent='Summarising the latest roster activity…'}var result=await aiRequest('changes','');if(request===state.changesRequest)aiRenderChanges(result)},260)}
function aiEnsureDialog(){
  var dialog=aiEl('nightAiDialog');if(dialog)return dialog;dialog=document.createElement('dialog');dialog.id='nightAiDialog';dialog.className='nightAiDialog';dialog.setAttribute('aria-labelledby','nightAiDialogTitle');
  var shell=aiMake('div','nightAiSheet'),head=aiMake('div','nightAiDialogHead'),headCopy=aiMake('div',''),eyebrow=aiMake('span','nightAiEyebrow','Roster-grounded AI'),title=aiMake('h2','', 'Ask Night Roster'),close=aiMake('button','nightAiClose','×');title.id='nightAiDialogTitle';close.type='button';close.setAttribute('aria-label','Close AI assistant');close.onclick=function(){dialog.close()};headCopy.appendChild(eyebrow);headCopy.appendChild(title);head.appendChild(headCopy);head.appendChild(close);
  var safety=aiMake('p','nightAiSafety','Roster and staffing only. Do not enter patient information. AI never changes the roster.');
  var messages=aiMake('div','nightAiMessages');messages.id='nightAiMessages';messages.setAttribute('aria-live','polite');
  var prompts=aiMake('div','nightAiPrompts');[['What changed tonight?','What changed tonight?'],['Who am I working with?','Who am I working with tonight?'],['Why this allocation?','Why am I allocated this way tonight?'],['Is the plan fully staffed?','Is this night fully staffed and are any decisions unresolved?']].forEach(function(pair){var b=aiMake('button','nightAiPrompt',pair[0]);b.type='button';b.onclick=function(){aiAsk(pair[1])};prompts.appendChild(b)});
  var form=aiMake('form','nightAiComposer'),input=document.createElement('textarea'),send=aiMake('button','nightAiSend','Send');input.id='nightAiInput';input.rows=1;input.maxLength=500;input.placeholder='Ask about tonight…';input.setAttribute('aria-label','Ask Night Roster');send.type='submit';form.appendChild(input);form.appendChild(send);form.onsubmit=function(event){event.preventDefault();var question=input.value.trim();if(!question)return;input.value='';aiAsk(question)};
  shell.appendChild(head);shell.appendChild(safety);shell.appendChild(messages);shell.appendChild(prompts);shell.appendChild(form);dialog.appendChild(shell);document.body.appendChild(dialog);return dialog
}
function aiAddMessage(role,text,meta){var host=aiEl('nightAiMessages');if(!host)return;var row=aiMake('div','nightAiMessage '+(role==='user'?'user':'assistant')),body=aiMake('div','nightAiMessageBody',text);row.appendChild(body);if(meta){var small=aiMake('small','',meta);row.appendChild(small)}host.appendChild(row);host.scrollTop=host.scrollHeight}
function aiOpenAssistant(){var dialog=aiEnsureDialog();if(!dialog.open&&dialog.showModal)dialog.showModal();var input=aiEl('nightAiInput');if(input)setTimeout(function(){input.focus()},80)}
async function aiAsk(question,mode){
  aiOpenAssistant();if(aiPatientInfoLikely(question)){aiAddMessage('assistant','This assistant only handles roster and staffing information. Please do not enter patient information.','Safety boundary');return}
  var generation=state.sessionGeneration;aiAddMessage('user',question);var pending=aiMake('div','nightAiMessage assistant pending','Thinking from the current shared roster…'),host=aiEl('nightAiMessages');if(host){host.appendChild(pending);host.scrollTop=host.scrollHeight}var result=await aiRequest(mode||'ask',question);if(pending.parentNode)pending.remove();if(generation!==state.sessionGeneration)return;aiAddMessage('assistant',result.text,aiSourceText(result));state.conversation.push({q:question,a:result.text});if(state.conversation.length>8)state.conversation.shift()
}
function aiExplainAllocation(){aiAsk('Why am I allocated this way tonight?','explain')}
function aiEnsureQuickAction(){
  var host=aiEl('quickActionsExperience'),experience=host&&host.querySelector('.quickActionsExperience');if(!experience||aiEl('nightAiQuickAction'))return;var anchor=experience.querySelector('.quickReviewAction'),button=aiMake('button','quickReviewAction nightAiQuickAction');button.id='nightAiQuickAction';button.type='button';button.setAttribute('aria-label','Ask Night Roster');var icon=aiMake('span','quickReviewIcon','✦'),copy=aiMake('span','quickReviewCopy'),eyebrow=aiMake('small','','AI assistant'),strong=aiMake('strong','','Ask Night Roster'),detail=aiMake('span','','Briefs, changes and allocation explanations'),chev=aiMake('span','quickActionChevron','›');chev.setAttribute('aria-hidden','true');copy.appendChild(eyebrow);copy.appendChild(strong);copy.appendChild(detail);button.appendChild(icon);button.appendChild(copy);button.appendChild(chev);button.onclick=function(){var dialog=aiEl('quickActionsSheet');if(dialog&&dialog.open)dialog.close();aiOpenAssistant()};if(anchor&&anchor.nextSibling)experience.insertBefore(button,anchor.nextSibling);else experience.appendChild(button)
}
function aiObserveQuickActions(){var host=aiEl('quickActionsExperience');if(!host||state.observer)return;state.observer=new MutationObserver(function(){aiEnsureQuickAction()});state.observer.observe(host,{childList:true,subtree:true});aiEnsureQuickAction()}
function aiClearPrivateData(){clearTimeout(state.briefTimer);clearTimeout(state.changesTimer);state.briefRequest++;state.changesRequest++;state.sessionGeneration++;state.cache={};state.conversation=[];var messages=aiEl('nightAiMessages');if(messages)messages.textContent='';var brief=aiEl('nightAiBrief');if(brief)brief.remove();var changes=aiEl('nightAiChangesSummary');if(changes)changes.remove()}
function aiWatchAuth(){if(state.authSubscription||!window.supa||!supa.auth||!supa.auth.onAuthStateChange)return;try{var result=supa.auth.onAuthStateChange(function(event){if(event==='SIGNED_OUT'||event==='USER_DELETED')aiClearPrivateData()});state.authSubscription=result&&result.data&&result.data.subscription||null}catch(error){}}
function aiResetForDate(date){if(date&&state.date&&date!==state.date){clearTimeout(state.briefTimer);clearTimeout(state.changesTimer);state.briefRequest++;state.changesRequest++;state.sessionGeneration++;state.cache={};state.conversation=[];var messages=aiEl('nightAiMessages');if(messages)messages.textContent=''}state.date=date||state.date}
function aiStart(){aiEnsureDialog();aiObserveQuickActions();aiWatchAuth();if(state.personal&&state.night)aiRefreshBrief();if(state.activity)aiRefreshChanges()}

window.addEventListener('roster:personal-night',function(event){var detail=event&&event.detail||{};aiResetForDate(detail.date||aiSelectedDate());state.personal=detail;aiRefreshBrief()});
window.addEventListener('roster:night',function(event){state.night=event&&event.detail||{};aiResetForDate(aiSelectedDate());aiRefreshBrief()});
window.addEventListener('roster:recent-activity',function(event){state.activity=event&&event.detail||{};aiResetForDate(aiSelectedDate());aiRefreshChanges()});
window.addEventListener('roster:quick-actions',function(){setTimeout(aiEnsureQuickAction,0)});
window.addEventListener('online',function(){aiRefreshBrief();aiRefreshChanges()});
window.NightRosterAI={openAssistant:aiOpenAssistant,ask:function(question){return aiAsk(question||'What should I know about this night?')},explainAllocation:aiExplainAllocation,refreshBrief:function(){aiRefreshBrief(true)},context:aiContext,clearPrivateData:aiClearPrivateData};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',aiStart,{once:true});else aiStart();
})();
