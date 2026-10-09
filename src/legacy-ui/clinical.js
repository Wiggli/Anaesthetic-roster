function prepareChangesView(){
  if(changesViewPrepared)return;
  var required=['today','changes','breaks','roster','changesStaffingPane','changesAllocationPane','changesConfirmPane','personalNightCard','nightStatusRow'];
  if(required.some(function(id){return !byId(id)}))return;
  document.body.setAttribute('data-view','today');
  ['datePick','changesDatePick','breakDatePick','teamEffectiveDate'].forEach(enhanceDatePicker);
  byId('viewRosterBtn').onclick=function(){show('roster')};
  byId('closeRosterBtn').onclick=function(){show('today')};
  byId('smartNightBtn').onclick=goToAutomaticNight;
  byId('changesSmartNightBtn').onclick=goToAutomaticNight;
  byId('closeNamePickerBtn').onclick=function(){byId('personalNamePicker').classList.add('hidden')};
  byId('continueToAllocationBtn').onclick=function(){setChangesStep('allocation',true)};
  byId('continueToConfirmBtn').onclick=function(){setChangesStep('confirm',true)};
  byId('changesInfoBtn').onclick=function(){openScreenInfo('changes')};
  byId('breaksInfoBtn').onclick=function(){openScreenInfo('breaks')};
  Array.prototype.forEach.call(document.querySelectorAll('[data-changes-step]'),function(button){button.onclick=function(){setChangesStep(button.getAttribute('data-changes-step'),true)}});
  window.addEventListener('roster:changes-step-request',function(event){var step=event&&event.detail&&event.detail.step;if(['staffing','allocation','confirm'].indexOf(step)>=0)setChangesStep(step,true)});
  changesViewPrepared=true;renderDiagnostics();
}
function openScreenInfo(kind){
  var dialog=byId('screenInfoSheet'),title=byId('screenInfoTitle'),intro=byId('screenInfoIntro'),content=byId('screenInfoContent');if(!dialog||!title||!intro||!content)return;
  var items=kind==='breaks'?[['What you see','The break plan always follows the selected night and its latest shared staffing.'],['What happens automatically','Changes to absences, overtime or roles update Night and Breaks together.'],['When the plan is provisional','Breaks cannot be finalised until every required staffing decision is complete.']]:[['Start with Staffing','Record only confirmed absences and overtime nurses.'],['Allocation is usually automatic','A standard five-person night has one full-night Pager. At six, Pager works First Part and Reliever works Second Part in Labour Ward.'],['Confirm only changes','A final review is needed only after a staffing change or an agreed night-only role change.']];
  title.textContent=kind==='breaks'?'About Breaks':'About Staffing changes';intro.textContent=kind==='breaks'?'A live view of the selected night’s breaks.':'A three-step path for exceptional changes.';if(typeof window.renderReactScreenInfo==='function')window.renderReactScreenInfo(items);else content.innerHTML=items.map(function(item){return'<section class="infoSheetItem"><h3>'+esc(item[0])+'</h3><p>'+esc(item[1])+'</p></section>'}).join('');if(!dialog.open)dialog.showModal();if(typeof window.CustomEvent==='function')window.dispatchEvent(new CustomEvent('roster:screeninfo',{detail:{items:items}}));
}

function syncDateInputs(date){
  ['datePick','changesDatePick','breakDatePick'].forEach(function(id){var el=byId(id);if(!el)return;el.min=R[0].date;el.max=R[R.length-1].date;el.value=date;updatePrettyDate(el)});
  var compactDateLabel=new Date(date+'T12:00:00').toLocaleDateString('en-GB',{weekday:'long',day:'numeric',month:'long'});Array.prototype.forEach.call(document.querySelectorAll('#today .rosterDateControl,#changes .rosterDateControl,#breaks .rosterDateControl'),function(control){control.setAttribute('data-date-label',compactDateLabel)});
  ['prevNightBtn','changesPrevNightBtn','breakPrevNightBtn'].forEach(function(id){var el=byId(id);if(el)el.disabled=idx<=0});
  ['nextNightBtn','changesNextNightBtn','breakNextNightBtn'].forEach(function(id){var el=byId(id);if(el)el.disabled=idx>=R.length-1});
}

function maltaDateParts(value){
  if(window.AnaestheticDomain&&window.AnaestheticDomain.maltaParts)return window.AnaestheticDomain.maltaParts(value==null?appNow():value);
  var parts=new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/Malta',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(value||new Date()),out={};
  parts.forEach(function(part){if(part.type!=='literal')out[part.type]=Number(part.value)});return out;
}

function operationalRosterDate(value){
  if(window.AnaestheticDomain&&window.AnaestheticDomain.operationalRosterDate)return window.AnaestheticDomain.operationalRosterDate(value==null?appNow():value);
  var p=maltaDateParts(value),date=[p.year,String(p.month).padStart(2,'0'),String(p.day).padStart(2,'0')].join('-');
  return p.hour<7?addDays(date,-1):date;
}

function resolveNightContext(value,selectedDate){
  var now=value==null?appNow():value,automatic=window.AnaestheticDomain&&window.AnaestheticDomain.resolveAutomaticNight?window.AnaestheticDomain.resolveAutomaticNight(R,now):null;
  if(!automatic){var p=maltaDateParts(now),target=operationalRosterDate(now),autoIndex=R.findIndex(function(r){return r.date>=target});if(autoIndex<0)autoIndex=Math.max(0,R.length-1);automatic={index:autoIndex,date:R[autoIndex]&&R[autoIndex].date||null,isCurrent:!!(R[autoIndex]&&R[autoIndex].date===target&&(p.hour<7||p.hour>=19)),calendarDate:[p.year,String(p.month).padStart(2,'0'),String(p.day).padStart(2,'0')].join('-'),operationalDate:target,hour:p.hour,minute:p.minute,phase:'next'}}
  var selected=selectedDate||(R[idx]&&R[idx].date)||automatic.date,timing=selected?nightDutyTiming(selected):null,nowValue=now instanceof Date?now.getTime():Number(new Date(now).getTime()),selectedIsAutomatic=selected===automatic.date,phase='selected';
  if(selectedIsAutomatic&&automatic.isCurrent&&timing){phase=nowValue<timing.startUtc?'evening':nowValue<timing.handoverUtc?'first':nowValue<timing.endUtc?'second':'complete'}else if(selectedIsAutomatic)phase='next';
  return{index:automatic.index,automaticDate:automatic.date,selectedDate:selected,isCurrent:automatic.isCurrent,selectedIsAutomatic:selectedIsAutomatic,calendarDate:automatic.calendarDate,operationalDate:automatic.operationalDate,phase:phase,timing:timing,nowMs:nowValue,selectionMode:nightSelectionMode};
}

function startingIndex(value){return R.length?resolveNightContext(value).index:0}

function automaticNightState(value){
  var context=resolveNightContext(value),selected=idx===context.index&&nightSelectionMode==='automatic';
  return{index:context.index,isCurrent:context.isCurrent,selected:selected,label:selected?(context.isCurrent?'Current night selected':'Next night selected'):(context.isCurrent?'Return to current night':'Return to next roster night')};
}

function selectedNightCopy(date,value){
  var context=resolveNightContext(value,date),automatic=context.automaticDate;
  if(context.isCurrent&&date===automatic)return{label:'Current night',assignment:'Current night’s assignment',changed:'Changed this night'};
  if(date===automatic&&!context.isCurrent)return{label:'Next night',assignment:'Next night’s assignment',changed:'Changed for next night'};
  if(date===context.calendarDate)return{label:'Tonight',assignment:'Tonight’s assignment',changed:'Changed tonight'};
  return{label:'Selected night',assignment:'Selected night’s assignment',changed:'Changed for this night'};
}

function quickActionsModel(){
  var base=cur(),plan=staffingPlan(base),tasks=workflowTaskDetails(base,plan),copy=selectedNightCopy(base.date),count=Number(plan.count||0),blocked=sharedWritesBlocked(),offline=!navigator.onLine||forcedOfflineSession,canEdit=!blocked&&!offline,planLabel='';
  if(count<5)planLabel='Cover required before the plan can be finalised';
  else if(tasks.length)planLabel=tasks.length+' decision'+(tasks.length===1?'':'s')+' still to resolve';
  else if(count===baseEstablishmentSize(base))planLabel='Standard plan ready';
  else planLabel='Plan ready';
  return{contextLabel:copy.label,dateLabel:fmt(base.date),staffingLabel:count+' nurse'+(count===1?'':'s'),planLabel:planLabel,attentionCount:tasks.length,canEdit:canEdit,editReason:offline?'Reconnect to edit the shared roster.':blocked?sharedWriteNotice():''};
}
function renderQuickActionsFallback(model){
  var context=byId('quickActionsFallbackContext'),staffing=byId('quickActionsFallbackStaffing');if(context)context.textContent=model.contextLabel+' · '+model.dateLabel;if(staffing)staffing.textContent=model.staffingLabel+' · '+model.planLabel;
  ['quickAbsenceFallback','quickOvertimeFallback'].forEach(function(id){var button=byId(id);if(button){button.disabled=!model.canEdit;button.setAttribute('aria-disabled',model.canEdit?'false':'true')}});
  var attention=byId('quickActionAttention');if(attention)attention.classList.toggle('hidden',!model.attentionCount);
}
function showQuickActions(){
  var dialog=byId('quickActionsSheet');if(!dialog||document.body.classList.contains('authPending'))return;var model=quickActionsModel();renderQuickActionsFallback(model);
  if(window.dispatchEvent&&typeof CustomEvent==='function')window.dispatchEvent(new CustomEvent('roster:quick-actions',{detail:model}));
  if(dialog.showModal&&!dialog.open)dialog.showModal();
}
function quickActionScroll(selector){
  window.setTimeout(function(){var target=document.querySelector(selector);if(target&&target.scrollIntoView)target.scrollIntoView({behavior:window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'start'})},80);
}
function performQuickAction(action){
  var dialog=byId('quickActionsSheet');if(dialog&&dialog.open)dialog.close();
  if(action==='absence'||action==='overtime'||action==='review'){
    show('changes');
    var step=action==='review'?smartChangesStep(cur()):'staffing';setChangesStep(step,false);
    quickActionScroll(action==='absence'?'.absenceSection':action==='overtime'?'.overtimeSection':'#changes .changePanel');
    return;
  }
  if(action==='private-chat'){
    show('chat');if(typeof window.openChatView==='function')window.openChatView();
    window.setTimeout(function(){var button=byId('chatNewPrivateBtn');if(button)button.click()},120);return;
  }
  if(action==='share'){showShareApp();return}
}
window.showQuickActions=showQuickActions;
window.performQuickAction=performQuickAction;

function updateSmartNightButtons(){
  var state=automaticNightState();
  ['smartNightBtn','changesSmartNightBtn'].forEach(function(id){
    var button=byId(id);if(!button)return;var label=button.querySelector('span');if(label)label.textContent=state.label;else button.textContent=state.label;
    button.disabled=state.selected;button.classList.toggle('hidden',state.selected);button.setAttribute('aria-label',state.label);
  });
  var shortcut=byId('smartNightBtn'),row=shortcut&&shortcut.closest('.rosterShortcutRow');if(row)row.classList.toggle('singleShortcut',state.selected);
}

function goToAutomaticNight(){
  nightSelectionMode='automatic';var context=resolveNightContext();if(window.AnaestheticRuntime&&window.AnaestheticRuntime.state)window.AnaestheticRuntime.state.night.set(context.isCurrent?'automatic-current':'automatic-next');idx=context.index;automaticSelectedDate=R[idx].date;appStorage.setItem('anaes_selected_date',R[idx].date);render();toast(context.isCurrent?'Current working night opened':'Next available roster night opened');
}

function refreshAutomaticNightOnReturn(){
  if(document.visibilityState!=='visible'||!initialNightChosen||nightSelectionMode!=='automatic'||!R.length)return;
  var context=resolveNightContext(),nextDate=R[context.index].date;if(window.AnaestheticRuntime&&window.AnaestheticRuntime.state)window.AnaestheticRuntime.state.night.set(context.isCurrent?'automatic-current':'automatic-next');
  if(nextDate!==automaticSelectedDate){idx=context.index;automaticSelectedDate=nextDate;appStorage.setItem('anaes_selected_date',nextDate);render();toast(context.isCurrent?'Roster moved to the current night':'Roster moved to the next available night')}
}

var shadowPlanSignatures={};
function shadowNightPlanCheck(plan){
  if(!window.AnaestheticRuntime||!plan||!plan.base)return true;
  var signature=plan.date+':'+String(lastObservedSyncRevision==null?'none':lastObservedSyncRevision);
  if(shadowPlanSignatures[signature])return true;
  shadowPlanSignatures[signature]=true;
  var legacyEffective=applyChanges(plan.base),legacyStaffing=staffingPlan(plan.base);
  var canonicalAssignments=(plan.staffing&&plan.staffing.validAssignments||[]).map(function(item){return[String(item.id),item.allocation_key||'']}).sort();
  var legacyAssignments=(legacyStaffing&&legacyStaffing.validAssignments||[]).map(function(item){return[String(item.id),item.allocation_key||'']}).sort();
  var left={effective:plan.effective,count:plan.staffing&&plan.staffing.count,unresolved:plan.staffing&&plan.staffing.unresolved,assignments:canonicalAssignments};
  var right={effective:legacyEffective,count:legacyStaffing&&legacyStaffing.count,unresolved:legacyStaffing&&legacyStaffing.unresolved,assignments:legacyAssignments};
  return window.AnaestheticRuntime.shadowCompare('night-plan',left,right)
}

var lastChangesWorkflowModel=null;
function setChangesStep(step,scroll){
  activeChangesStep=step==='confirm'?'confirm':step==='allocation'?'allocation':'staffing';
  var staffing=byId('changesStaffingPane'),allocation=byId('changesAllocationPane'),confirmation=byId('changesConfirmPane');if(!staffing||!allocation||!confirmation)return;
  staffing.classList.toggle('hidden',activeChangesStep!=='staffing');allocation.classList.toggle('hidden',activeChangesStep!=='allocation');confirmation.classList.toggle('hidden',activeChangesStep!=='confirm');
  Array.prototype.forEach.call(document.querySelectorAll('[data-changes-step]'),function(button){var selected=button.getAttribute('data-changes-step')===activeChangesStep;button.classList.toggle('active',selected);button.setAttribute('aria-selected',selected?'true':'false')});
  if(lastChangesWorkflowModel&&typeof CustomEvent==='function'){
    lastChangesWorkflowModel.active=activeChangesStep;
    window.dispatchEvent(new CustomEvent('roster:changes-workflow',{detail:lastChangesWorkflowModel}));
  }
  if(scroll)byId('changesWorkflowExperience').scrollIntoView({behavior:'smooth',block:'start'});
}

function workflowTaskCount(base,plan,r){
  return workflowTaskDetails(base,plan).length;
}

function smartChangesStep(base){
  var plan=staffingPlan(base),tasks=workflowTaskDetails(base,plan).length;
  if(tasks)return'allocation';
  if(workflowNeedsConfirmation(base,tasks))return'confirm';
  return'staffing';
}

function localChangesDraftParts(base){
  base=base||cur();var date=base.date,parts=[],draft=allocationDrafts[date]||{};
  if(Object.keys(draft).some(function(key){return String(draft[key]||'').trim().length>0}))parts.push('allocation selections');
  if(seventhDecisionDrafts[date])parts.push('seventh-nurse choice');
  if(nightRoleOverrideDrafts[date])parts.push('night-only roles');
  if(cur().date===date){
    var absence=byId('absentName'),overtime=byId('overtimeName');
    if(editingAbsenceId||absence&&absence.value)parts.push('absence form');
    if(overtime&&normaliseNurseName(overtime.value))parts.push('overtime entry');
  }
  return parts;
}

function localChangesDraftSummary(base){
  var parts=localChangesDraftParts(base);
  if(!parts.length)return'';
  return parts.length===1?'Unsaved '+parts[0]:'Unsaved selections in '+parts.length+' places';
}

function allLocalChangesDraftParts(){
  if(!R.length)return[];var currentDate=cur().date,dates=[currentDate];
  [allocationDrafts,seventhDecisionDrafts,nightRoleOverrideDrafts].forEach(function(map){Object.keys(map||{}).forEach(function(date){if(dates.indexOf(date)<0)dates.push(date)})});
  var parts=[];dates.forEach(function(date){var base=R.find(function(item){return item.date===date});if(!base)return;localChangesDraftParts(base).forEach(function(part){parts.push({date:date,part:part})})});return parts;
}

function protectLocalChangesDraft(event){
  if(!currentUserProfile||!allLocalChangesDraftParts().length)return;
  event.preventDefault();event.returnValue='';
}

function workflowTaskDetails(base,plan){
  var tasks=[];
  if(plan.requiresCoverageChoice)tasks.push('Choose the theatre role the rostered Reliever will cover');
  if(plan.requiresSeventhDecision)tasks.push('Choose whether '+professionalName(plan.seventhNurse)+' moves to the seventh position');
  plan.availableKeys.forEach(function(key){if(!selectedAllocationId(base,key))tasks.push('Choose a nurse for '+allocationLabel(key))});
  return tasks;
}

function planNeedsConfirmation(base,decisionTasks){
  if(decisionTasks)return true;var status=nightPlanStatuses[base.date];if(!status||!status.published_at)return true;
  var establishment=versionForDate(base.date),publishedAt=new Date(status.published_at).getTime(),latest=establishment.effective_from===rotationVersions[0].effective_from?0:(new Date(establishment.updated_at||0).getTime()||0);changesFor(base.date).concat(overtimeFor(base.date)).forEach(function(item){latest=Math.max(latest,new Date(item.updated_at||0).getTime()||0)});var storedOrder=labourOrders[base.date];if(storedOrder)latest=Math.max(latest,new Date(storedOrder.updated_at||0).getTime()||0);var roleOverride=nightRoleOverrides[base.date];if(roleOverride)latest=Math.max(latest,new Date(roleOverride.updated_at||0).getTime()||0);
  var draft=allocationDrafts[base.date]||{},plan=staffingPlan(base);if(Object.keys(draft).some(function(key){var saved=plan.validAssignments.find(function(item){return item.allocation_key===key});return(draft[key]||'')!==(saved?saved.id:'')}))return true;
  var labourDraft=labourOrderDrafts[base.date],preview=allocationPreview(base),savedLabour=labourOrderFor(preview);if(labourDraft&&(!savedLabour||labourDraft.first!==savedLabour.first_part_name||labourDraft.second!==savedLabour.second_part_name))return true;
  return latest>publishedAt;
}

function workflowHasManualPlan(base){
  var roleOverride=nightRoleOverrides[base.date];
  return changesFor(base.date).length>0||overtimeFor(base.date).length>0||!!(roleOverride&&validRoleAssignments(roleOverride.assignments));
}

function workflowNeedsConfirmation(base,decisionTasks){
  if(decisionTasks)return true;
  return workflowHasManualPlan(base)&&planNeedsConfirmation(base,0);
}

function fixedRolesHtml(base,plan){
  var r=applyChanges(base),keys=['first1','first2','second1','second2'],rows=[];
  if(r.mode==='5')rows.push(['Full Labour Ward / Pager',r.fullLW]);else keys=keys.concat(['pager','reliever']);
  keys.forEach(function(key){if(plan.availableKeys.indexOf(key)<0&&plan.absentKeys.indexOf(key)<0)rows.push([allocationLabel(key),r[key]])});
  if(r.mode==='7'&&!plan.requiresSeventhDecision&&plan.availableKeys.indexOf('seventh')<0)rows.push(['Seventh nurse',r.seventh]);
  return rows.filter(function(row){return row[1]&&String(row[1]).indexOf('allocation to decide')<0}).map(function(row){return'<div class="fixedRoleRow"><span>'+esc(row[0])+'</span><b>'+esc(professionalNames(row[1]))+'</b></div>'}).join('');
}

function updateChangesWorkflow(base,plan){
  if(!changesViewPrepared)return;
  var r=applyChanges(base),taskDetails=workflowTaskDetails(base,plan),tasks=taskDetails.length,taskInstruction=taskDetails[0]||'',confirmNeeded=workflowNeedsConfirmation(base,tasks),hasManualPlan=workflowHasManualPlan(base),changes=changesFor(base.date),overtime=overtimeFor(base.date),staffingState=byId('staffingStepState'),allocationState=byId('allocationStepState'),confirmState=byId('confirmStepState'),state=byId('changesWorkflowState'),badge=byId('changesTaskBadge'),draftLabel=localChangesDraftSummary(base);
  if(staffingState)staffingState.textContent=changes.length||overtime.length?changes.length+' absent · '+overtime.length+' overtime':'No changes';
  var published=nightPlanStatuses[base.date];if(allocationState)allocationState.textContent=tasks?tasks+' task'+(tasks===1?'':'s')+' remaining':'Current roles';if(confirmState)confirmState.textContent=tasks?'Resolve tasks':confirmNeeded?'Review changes':published&&published.published_at&&hasManualPlan?'Shared':'Not needed';
  var staffingTab=document.querySelector('[data-changes-step="staffing"]'),allocationTab=document.querySelector('[data-changes-step="allocation"]'),confirmTab=document.querySelector('[data-changes-step="confirm"]'),confirmationNotNeeded=!hasManualPlan&&!confirmNeeded,hasStaffingChanges=!!(changes.length||overtime.length),shared=!!(published&&published.published_at&&hasManualPlan&&!confirmNeeded);staffingTab.classList.toggle('complete',hasStaffingChanges);allocationTab.classList.toggle('complete',hasManualPlan&&!tasks);allocationTab.classList.toggle('hasTasks',!!tasks);confirmTab.classList.toggle('complete',shared);confirmTab.classList.toggle('notNeeded',confirmationNotNeeded);confirmTab.classList.toggle('hasTasks',!!confirmNeeded);
  if(state){state.innerHTML=tasks?'<b>'+esc(taskInstruction)+'</b><span>'+(tasks>1?esc((tasks-1)+' other allocation decision'+(tasks===2?' also remains.':'s also remain.')):'Select the nurse, then review the changes.')+'</span>':confirmNeeded?'<b>Ready to review</b><span>Check the selected night’s changes before sharing them with everyone.</span>':published&&published.published_at&&hasManualPlan?'<b>Changes shared</b><span>Updated by '+esc(published.published_by||'a shift member')+' at '+esc(shortTime(published.published_at))+'.</span>':'';
  state.classList.toggle('hidden',!tasks&&!confirmNeeded&&!hasManualPlan);
  state.classList.toggle('complete',!confirmNeeded);state.classList.toggle('ready',!tasks&&confirmNeeded);}
  var badgeCount=tasks||(confirmNeeded?1:0);badge.textContent=badgeCount;badge.classList.toggle('hidden',!badgeCount);var quickAttention=byId('quickActionAttention');if(quickAttention)quickAttention.classList.toggle('hidden',!badgeCount);
  var allocationAction=byId('continueToAllocationBtn');allocationAction.textContent=tasks?'Resolve allocations':'Adjust roles';allocationAction.classList.toggle('quietAction',!tasks&&!confirmNeeded);
  var changesPanel=document.querySelector('#changes .changePanel');if(changesPanel)changesPanel.classList.toggle('planShared',shared);
  var confirmButton=byId('continueToConfirmBtn');confirmButton.disabled=!!tasks;confirmButton.classList.toggle('hidden',!confirmNeeded);confirmButton.textContent='Review changes';var confirmReason=byId('continueToConfirmReason');if(confirmReason){confirmReason.textContent=tasks?'Complete the allocation above before reviewing changes.':'';confirmReason.classList.toggle('hidden',!tasks)}
  var allocationSection=document.querySelector('.allocationSection');if(allocationSection)allocationSection.classList.toggle('hidden',!tasks&&!hasManualPlan);
  var allocationHeading=document.querySelector('.allocationSection .stepHeader h3');if(allocationHeading)allocationHeading.textContent='Finalise selected-night allocations';
  var confirmationHeading=document.querySelector('#changesConfirmPane .stepHeader h3'),confirmationIntro=byId('confirmationIntro');if(confirmationHeading)confirmationHeading.textContent=confirmNeeded?'Confirm selected-night changes':shared?'Changes shared':'No changes to review';if(confirmationIntro)confirmationIntro.classList.toggle('hidden',!tasks&&!confirmNeeded);
  var progressValue=tasks?1:confirmNeeded?2:3,progressLabel=tasks?'1 of 3 resolved':confirmNeeded?'2 of 3 resolved':shared?'3 of 3 shared':'Automatic plan ready';
  lastChangesWorkflowModel={active:activeChangesStep,steps:[
    {id:'staffing',label:'Staffing',detail:changes.length||overtime.length?changes.length+' absent · '+overtime.length+' overtime':'Record people',complete:hasStaffingChanges,attention:false,quiet:false},
    {id:'allocation',label:'Allocation',detail:tasks?tasks+' decision'+(tasks===1?'':'s'):'Review roles',complete:hasManualPlan&&!tasks,attention:!!tasks,quiet:!tasks},
    {id:'confirm',label:shared?'Shared':'Confirm',detail:tasks?'After allocation':confirmNeeded?'Review changes':shared?'Published':'When needed',complete:shared,attention:!!confirmNeeded,quiet:confirmationNotNeeded}
  ],headline:tasks?taskInstruction:confirmNeeded?'Ready to review':shared?'Plan shared':'Standard staffing applies',
  guidance:tasks?(tasks>1?(tasks-1)+' other allocation decision'+(tasks===2?' also remains.':'s also remain.'):'Choose a nurse, then review the changes.'):confirmNeeded?'Check the selected night’s changes before sharing them with everyone.':shared?'Staffing and roles are up to date for everyone.':'Add only changes to tonight’s staffing.' ,
  tone:tasks?'attention':confirmNeeded?'ready':shared?'complete':'automatic',progressValue:progressValue,progressMax:3,progressLabel:progressLabel,draftLabel:draftLabel};
  var fixed=fixedRolesHtml(base,plan),fixedList=byId('fixedAllocationList');fixedList.innerHTML=fixed||'<div class="time">Roles will appear after the staffing decisions are complete.</div>';byId('fixedAllocationSummary').textContent='Selected-night roles · '+(fixed.match(/fixedRoleRow/g)||[]).length;
  renderConfirmationPreview(base,plan,tasks,confirmNeeded,taskInstruction);updateConfirmationControls(confirmNeeded,tasks);
  setChangesStep(activeChangesStep,false);
}

function confirmationRow(label,value,detail){return'<div class="confirmationRow"><div><span>'+esc(label)+'</span>'+(detail?'<small>'+esc(detail)+'</small>':'')+'</div><b>'+esc(value||'To decide')+'</b></div>'}

function confirmationChangeRow(label,before,after,detail){return'<div class="confirmationChangeRow"><div><span>'+esc(label)+'</span>'+(detail?'<small>'+esc(detail)+'</small>':'')+'</div><div class="confirmationChangeValues"><del>'+esc(before||'Not assigned')+'</del><i aria-hidden="true">→</i><ins>'+esc(after||'Not assigned')+'</ins></div></div>'}
function confirmationPlanItem(label,value,detail){return{label:label,value:value?professionalNames(value):'To decide',detail:detail||''}}
function confirmationChangeItem(label,before,after,detail){return{label:label,before:professionalNames(before)||'Not assigned',after:professionalNames(after)||'Not assigned',detail:detail||''}}

function labourAssignmentDetail(name,order){
  if(!order)return'Labour Ward part pending';
  var first=order.first||order.first_part_name;
  return canonicalNurseName(first)===canonicalNurseName(name)?'Labour Ward first part · Second break':'Labour Ward second part · First break';
}

function confirmationPlanRows(r,order){
  var rows=[confirmationPlanItem('First part theatre',r.first1+' + '+r.first2,'Second break'),confirmationPlanItem('Second part theatre',r.second1+' + '+r.second2,'First break')];
  if(r.mode==='5')rows.push(confirmationPlanItem('Full-night Labour Ward / Pager',r.fullLW,'Break coordinated when clinical cover allows'));
  else{rows.push(confirmationPlanItem('Pager',r.pager,labourAssignmentDetail(r.pager,order)));rows.push(confirmationPlanItem('Reliever',r.reliever,labourAssignmentDetail(r.reliever,order)))}
  if(r.mode==='7')rows.push(confirmationPlanItem('Seventh nurse',r.seventh,'Break coordinated as required'));
  return rows;
}

function confirmationChangedRows(base,r,order){
  var rostered=rawBaseForDate(base.date),labels={first1:'First Part theatre · position 1',first2:'First Part theatre · position 2',second1:'Second Part theatre · position 1',second2:'Second Part theatre · position 2',pager:'Pager',reliever:'Reliever',seventh:'Seventh nurse'},rows=[];
  ['first1','first2','second1','second2'].forEach(function(key){if(canonicalNurseName(rostered[key])!==canonicalNurseName(r[key]))rows.push(confirmationChangeItem(labels[key],rostered[key],r[key],allocationBreak(key)))});
  if(r.mode==='5'){var before=rostered.pager+' + '+rostered.reliever;if(canonicalNurseName(rostered.pager)!==canonicalNurseName(r.fullLW)||canonicalNurseName(rostered.reliever)!==canonicalNurseName(r.fullLW))rows.push(confirmationChangeItem('Full-night Labour Ward / Pager',before,r.fullLW,'00:00–07:00'))}
  else ['pager','reliever'].forEach(function(key){if(canonicalNurseName(rostered[key])!==canonicalNurseName(r[key]))rows.push(confirmationChangeItem(labels[key],rostered[key],r[key],labourAssignmentDetail(r[key],order)))});
  if(r.mode==='7'&&canonicalNurseName(rostered.seventh)!==canonicalNurseName(r.seventh))rows.push(confirmationChangeItem(labels.seventh,rostered.seventh,r.seventh,'Break coordinated as required'));
  if(!rows.length){changesFor(base.date).forEach(function(change){rows.push(confirmationChangeItem('Absence',change.absent_name,change.replacement_name||'Not working',change.reason||'Unavailable'))});overtimeFor(base.date).forEach(function(entry){rows.push(confirmationChangeItem('Overtime','Not working',entry.nurse_name,entry.allocation_key?allocationLabel(entry.allocation_key):'Allocation to decide'))})}
  return rows;
}

function confirmationReason(base){var reasons=[],override=nightRoleOverrides[base.date];if(override&&override.reason)reasons.push(override.reason);changesFor(base.date).forEach(function(change){if(change.reason)reasons.push(change.reason)});reasons=reasons.filter(function(reason,index,list){return list.indexOf(reason)===index});return reasons.join(' · ')}

function renderConfirmationPreview(base,plan,tasks,confirmNeeded,taskInstruction){
  var host=byId('confirmationPreview');if(!host)return;var r=allocationPreview(base);
  var visible=!!(tasks||confirmNeeded),order=labourOrderDrafts[base.date]||labourOrderFor(r)||(!tasks?{first:r.pager,second:r.reliever}:null),changed=visible?confirmationChangedRows(base,r,order):[],full=visible?confirmationPlanRows(r,order):[],reason=visible?confirmationReason(base):'';
  var model={visible:visible,blocked:!!tasks,instruction:taskInstruction||'Complete the remaining allocation',changed:changed,full:full,reason:reason};
  if(host.dataset.reactReady!=='true')host.innerHTML=visible?(tasks?'<div class="confirmationWarning">'+esc(model.instruction)+' before continuing.</div>':'<div class="confirmationReady">Review only what changed before sharing.</div>')+'<div class="confirmationChanges">'+changed.map(function(item){return confirmationChangeRow(item.label,item.before,item.after,item.detail)}).join('')+'</div>'+(reason?'<div class="confirmationReason"><span>Reason</span><b>'+esc(reason)+'</b></div>':'')+'<details class="confirmationFullPlan"><summary>View full plan</summary><div>'+full.map(function(item){return confirmationRow(item.label,item.value,item.detail)}).join('')+'</div></details>':'';
  if(window.dispatchEvent&&typeof CustomEvent==='function')window.dispatchEvent(new CustomEvent('roster:changes-confirmation',{detail:model}));
}

function cur(){
  var base=Object.assign({},localCur());base.mode=String(baseEstablishmentSize(base));return applyNightRoleOverride(base);
}

function rawBaseForDate(date){
  var original=R.find(function(r){return r.date===date})||localCur();var base=Object.assign({},original);base.mode=String(baseEstablishmentSize(base));return base;
}

function roleAssignmentKeys(assignments){return assignments&&assignments.mode==='5'?FIVE_NIGHT_ROLE_KEYS:assignments&&assignments.mode==='7'?SEVEN_NIGHT_ROLE_KEYS:CORE_ALLOCATION_KEYS}
var FIVE_NIGHT_ROLE_KEYS=['first1','first2','second1','second2','fullLW'];
var SEVEN_NIGHT_ROLE_KEYS=['first1','first2','second1','second2','pager','reliever','seventh'];
function validRoleAssignments(assignments){if(!assignments||typeof assignments!=='object'||Array.isArray(assignments))return false;var keys=roleAssignmentKeys(assignments),custom=assignments.mode==='5'||assignments.mode==='7',expected=(custom?keys.concat(['mode']):keys).slice().sort(),supplied=Object.keys(assignments).sort();if(expected.length!==supplied.length||expected.some(function(key,index){return supplied[index]!==key}))return false;var values=keys.map(function(key){return String(assignments[key]||'').trim()});return values.every(Boolean)&&new Set(values.map(function(name){return canonicalNurseName(name)})).size===keys.length}
function sameNightNameSet(left,right){if(left.length!==right.length)return false;var wanted=left.map(function(name){return canonicalNurseName(name)}).sort(),actual=right.map(function(name){return canonicalNurseName(name)}).sort();return wanted.every(function(name,index){return name===actual[index]})}
function nightWorkingNames(base){var raw=rawBaseForDate(base.date),changes=changesFor(base.date),overtime=overtimeFor(base.date),absent=changes.map(function(change){return canonicalNurseName(change.absent_name)}),names=[];function add(name){name=String(name||'').trim();if(name&&!names.some(function(saved){return canonicalNurseName(saved)===canonicalNurseName(name)}))names.push(name)}CORE_ALLOCATION_KEYS.forEach(function(key){if(absent.indexOf(canonicalNurseName(raw[key]))<0)add(raw[key])});changes.forEach(function(change){add(change.replacement_name)});overtime.forEach(function(entry){add(entry.nurse_name)});return names}
function validRoleAssignmentsForNight(base,assignments){if(!validRoleAssignments(assignments))return false;var working=nightWorkingNames(base),assigned;if(assignments.mode==='5'){assigned=FIVE_NIGHT_ROLE_KEYS.map(function(key){return assignments[key]});return working.length===5&&sameNightNameSet(working,assigned)}if(assignments.mode==='7'){assigned=SEVEN_NIGHT_ROLE_KEYS.map(function(key){return assignments[key]});return working.length===7&&sameNightNameSet(working,assigned)}if(baseEstablishmentSize(base)===5){assigned=CORE_ALLOCATION_KEYS.map(function(key){return assignments[key]});return working.length===6&&sameNightNameSet(working,assigned)}return true}
function customFiveAssignmentsFor(base){var stored=nightRoleOverrides[base.date],assignments=stored&&stored.assignments;return validRoleAssignmentsForNight(base,assignments)&&assignments.mode==='5'?Object.assign({},assignments):null}
function applyNightRoleOverride(base){var copy=Object.assign({},base),stored=nightRoleOverrides[base.date],assignments=stored&&stored.assignments;if(validRoleAssignments(assignments)&&assignments.mode!=='5'&&(baseEstablishmentSize(base)===6||validRoleAssignmentsForNight(base,assignments))){CORE_ALLOCATION_KEYS.forEach(function(key){copy[key]=assignments[key]});if(assignments.mode==='7'){copy.seventh=assignments.seventh;copy.mode='7'}else copy.mode='6'}return copy}
function baseForDate(date){return applyNightRoleOverride(rawBaseForDate(date))}

function seventhRotationChoice(base,changes){
  var scheduled=base.seventh||'OT Nurse';
  if(scheduled==='OT Nurse')return{scheduled:scheduled,nurse:'OT Nurse',source:'overtime',fallback:false,vacatedKey:'seventh'};
  var absent=(changes||[]).map(function(c){return String(c.absent_name||'').toLowerCase()});
  var scheduledKey=allocationKeyForName(base,scheduled);
  if(scheduledKey&&absent.indexOf(String(scheduled).toLowerCase())<0)return{scheduled:scheduled,nurse:scheduled,source:'permanent',fallback:false,vacatedKey:scheduledKey};
  var version=versionForDate(base.date),cycle=version&&Array.isArray(version.seventh_cycle)&&version.seventh_cycle.length?version.seventh_cycle:ORIGINAL_SEVENTH;
  var start=cycle.indexOf(scheduled);if(start<0)start=0;
  /* calculateNight advances the seventh rotation backwards through the stored cycle. */
  for(var step=1;step<=cycle.length;step++){
    var candidate=cycle[((start-step)%cycle.length+cycle.length)%cycle.length];
    if(!candidate||candidate==='OT Nurse'||absent.indexOf(String(candidate).toLowerCase())>=0)continue;
    var key=allocationKeyForName(base,candidate);
    if(key)return{scheduled:scheduled,nurse:candidate,source:'permanent',fallback:true,vacatedKey:key};
  }
  return{scheduled:scheduled,nurse:'OT Nurse',source:'overtime',fallback:true,vacatedKey:'seventh'};
}

function staffingPlan(base){
  base=applyNightRoleOverride(base);var changes=changesFor(base.date),overtime=overtimeFor(base.date),absentKeys=[],openKeys=[],legacyCover=0;
  changes.forEach(function(c){var key=allocationKeyForName(base,c.absent_name);if(!key)return;if(absentKeys.indexOf(key)<0)absentKeys.push(key);if(c.replacement_name)legacyCover++;else if(openKeys.indexOf(key)<0)openKeys.push(key)});
  var size=baseEstablishmentSize(base),count=size-absentKeys.length+legacyCover+overtime.length,customFive=customFiveAssignmentsFor(base);
  if(count===5&&customFive){var assignedNames=FIVE_NIGHT_ROLE_KEYS.map(function(key){return customFive[key]}),usedOvertime=overtime.filter(function(entry){return assignedNames.some(function(name){return canonicalNurseName(name)===canonicalNurseName(entry.nurse_name)})});return{changes:changes,overtime:overtime,absentKeys:absentKeys,openKeys:openKeys,availableKeys:[],count:count,coverageKey:'custom',coverageChoices:[],coverageSource:'night-only',requiresCoverageChoice:false,requiresSeventhDecision:false,seventhDecision:null,validAssignments:usedOvertime,unassigned:[],unresolved:[],coreComplete:true,extraCount:0,complete:true,seventhChoice:null,seventhNurse:null,seventhVacatedKey:null,customFiveAssignments:customFive}}
  if(size===5&&count>=6&&!base.reliever&&openKeys.indexOf('reliever')<0)openKeys.push('reliever');
  var customSix=nightRoleOverrides[base.date]&&nightRoleOverrides[base.date].assignments;if(size===5&&count===6&&customSix&&!customSix.mode&&validRoleAssignmentsForNight(base,customSix)){var customUsed=overtime.filter(function(entry){return CORE_ALLOCATION_KEYS.some(function(key){return sameNurse(customSix[key],entry.nurse_name)})});return{changes:changes,overtime:overtime,absentKeys:absentKeys,openKeys:[],availableKeys:[],count:count,coverageKey:null,coverageChoices:[],coverageSource:'night-only',requiresCoverageChoice:false,requiresSeventhDecision:false,seventhDecision:null,validAssignments:customUsed.map(function(entry){var copy=Object.assign({},entry);copy.allocation_key=CORE_ALLOCATION_KEYS.find(function(key){return sameNurse(customSix[key],entry.nurse_name)});return copy}),unassigned:[],unresolved:[],coreComplete:true,extraCount:0,complete:true,seventhChoice:null,seventhNurse:null,seventhVacatedKey:null}}
  var seventhChoice=null,seventhDecision=null,requiresSeventhDecision=false;
  if(count>=7){seventhChoice=seventhRotationChoice(base,changes);if(seventhChoice.source==='overtime')seventhDecision='overtime';else{var savedRotation=overtime.some(function(o){return o.allocation_key===seventhChoice.vacatedKey}),savedOvertime=overtime.some(function(o){return o.allocation_key==='seventh'});seventhDecision=seventhDecisionDrafts[base.date]||(savedOvertime?'overtime':savedRotation?'rotation':null);requiresSeventhDecision=!seventhDecision}seventhChoice.decision=seventhDecision;if(seventhDecision){var seventhOpenKey=seventhDecision==='rotation'?seventhChoice.vacatedKey:'seventh';if(openKeys.indexOf(seventhOpenKey)<0)openKeys.push(seventhOpenKey)}}
  var coverageKey=null,coverageChoices=[],coverageSource='';if(size===6&&count===5&&openKeys.length){if(openKeys.indexOf('reliever')>=0){coverageKey='reliever';coverageSource='automatic'}else if(openKeys.indexOf('pager')>=0){coverageKey='pager';coverageSource='automatic'}else{coverageChoices=openKeys.filter(function(key){return['first1','first2','second1','second2'].indexOf(key)>=0});var stored=fiveCoverFor(base.date);if(coverageChoices.length===1){coverageKey=coverageChoices[0];coverageSource='automatic'}else if(stored&&coverageChoices.indexOf(stored.coverage_key)>=0){coverageKey=stored.coverage_key;coverageSource='saved'}}}
  var requiresCoverageChoice=count===5&&coverageChoices.length>1&&!coverageKey,availableKeys=requiresCoverageChoice?[]:openKeys.filter(function(key){return key!==coverageKey}),usedAllocationKeys={},usedOvertimeIds={};var validAssignments=overtime.filter(function(o){var valid=availableKeys.indexOf(o.allocation_key)>=0&&!usedAllocationKeys[o.allocation_key]&&!usedOvertimeIds[o.id];if(valid){usedAllocationKeys[o.allocation_key]=true;usedOvertimeIds[o.id]=true}return valid}),assignedIds=validAssignments.map(function(o){return o.id}),unassigned=overtime.filter(function(o){return assignedIds.indexOf(o.id)<0}),unresolved=availableKeys.filter(function(key){return !validAssignments.some(function(o){return o.allocation_key===key})}),coreComplete=!requiresCoverageChoice&&!requiresSeventhDecision&&unresolved.length===0&&count>=5;
  return{changes:changes,overtime:overtime,absentKeys:absentKeys,openKeys:openKeys,availableKeys:availableKeys,count:count,coverageKey:coverageKey,coverageChoices:coverageChoices,coverageSource:coverageSource,requiresCoverageChoice:requiresCoverageChoice,requiresSeventhDecision:requiresSeventhDecision,seventhDecision:seventhDecision,validAssignments:validAssignments,unassigned:unassigned,unresolved:unresolved,coreComplete:coreComplete,extraCount:Math.max(0,count-7),complete:coreComplete,seventhChoice:seventhChoice,seventhNurse:seventhChoice?seventhChoice.nurse:null,seventhVacatedKey:seventhChoice?seventhChoice.vacatedKey:null};
}

function additionalNurses(plan){
  return plan.count>7&&plan.coreComplete?plan.unassigned.slice():[];
}

function planIsProvisional(base){
  var plan=staffingPlan(base);
  return plan.count<5||plan.requiresCoverageChoice||plan.requiresSeventhDecision||plan.unresolved.length>0;
}

function applyChanges(r){
  r=applyNightRoleOverride(r);var copy=Object.assign({},r),fields=['first1','first2','second1','second2','pager','reliever','fullLW','seventh'];
  copy.mode=String(baseEstablishmentSize(r));
  var changes=changesFor(r.date),plan=staffingPlan(copy);
  if(plan.customFiveAssignments){FIVE_NIGHT_ROLE_KEYS.forEach(function(key){copy[key]=plan.customFiveAssignments[key]});copy.mode='5';copy.staffingAdjusted=true;copy.pendingAllocations=[];copy.additionalStaff=[];return copy}
  var customSeven=nightRoleOverrides[r.date]&&nightRoleOverrides[r.date].assignments;
  if(customSeven&&customSeven.mode==='7'&&validRoleAssignmentsForNight(r,customSeven)){SEVEN_NIGHT_ROLE_KEYS.forEach(function(key){copy[key]=customSeven[key]});copy.mode='7';copy.staffingAdjusted=true;copy.pendingAllocations=[];copy.additionalStaff=[];return copy}
  if(plan.count>=7){
    if(plan.seventhChoice.source==='permanent'&&plan.seventhDecision==='rotation')copy.seventh=plan.seventhNurse;
    else copy.seventh=plan.requiresSeventhDecision?'Decision required':'Overtime nurse • allocation to decide';
  }
  changes.filter(function(c){return c.replacement_name}).forEach(function(change){
    fields.forEach(function(k){if(copy[k]===change.absent_name)copy[k]=change.replacement_name});
  });
  plan.validAssignments.forEach(function(o){copy[o.allocation_key]=o.nurse_name});
  if(baseEstablishmentSize(r)===5){copy.fullLW=copy.pager;if(plan.count===6&&nightRoleOverrides[r.date]&&validRoleAssignmentsForNight(r,nightRoleOverrides[r.date].assignments)&&!nightRoleOverrides[r.date].assignments.mode)copy.mode='6'}
  if(plan.requiresCoverageChoice){
    plan.openKeys.forEach(function(key){copy[key]='Reliever allocation must be chosen first'});
    copy.mode='5';copy.staffingAdjusted=true;copy.relieverChoiceRequired=true;copy.pendingAllocations=plan.openKeys.slice();
    return copy;
  }
  if(plan.overtime.length){
    var pendingNames=plan.unassigned.map(function(o){return o.nurse_name});
    var pending=plan.count<5?'Uncovered • additional cover required':pendingNames.length===1?pendingNames[0]+' • allocation to decide':pendingNames.length?'Allocation to decide • '+pendingNames.length+' overtime nurses available':'Allocation pending';
    plan.unresolved.forEach(function(key){copy[key]=pending});
    if(plan.count===5&&plan.coverageKey)applyFiveVacancy(copy,plan.coverageKey);
    copy.mode=String(Math.max(5,Math.min(7,plan.count)));
    copy.staffingAdjusted=true;copy.pendingAllocations=plan.unresolved.slice();copy.additionalStaff=additionalNurses(plan).map(function(o){return o.nurse_name});
    if(plan.count<5){copy.understaffedCount=plan.count;copy.fullLW=''}
    return copy;
  }
  if(plan.count===5&&plan.coverageKey){applyFiveVacancy(copy,plan.coverageKey);copy.staffingAdjusted=true;copy.pendingAllocations=[];return copy}
  if(plan.count<5||plan.unresolved.length>1){
    plan.unresolved.forEach(function(key){copy[key]='Uncovered • additional cover required'});
    copy.mode='5';copy.staffingAdjusted=true;copy.understaffedCount=plan.count;copy.fullLW='';copy.pendingAllocations=plan.unresolved.slice();
  }
  return copy;
}

function effective(r){
  var plan=staffingPlan(baseForDate(r.date)),count=r.understaffedCount||plan.count,alert;
  if(count<5)alert=count+' nurses are currently recorded. Additional overtime cover is required before allocations and breaks can be finalised.';
  else if(r.mode==='5')alert='Five-nurse arrangement: '+r.fullLW+' covers Labour Ward / Pager from 00:00 to 07:00.';
  else if(count>7)alert=count+' nurses are recorded. The core seven-nurse arrangement is shown, with additional staff available as required.';
  else if(r.mode==='7'&&plan.requiresSeventhDecision)alert='Seven-nurse arrangement: decide whether '+plan.seventhNurse+' moves from '+allocationLabel(plan.seventhVacatedKey)+' into the seventh position.';
  else if(r.mode==='7'&&plan.seventhChoice&&plan.seventhChoice.source==='permanent'&&plan.seventhDecision==='rotation')alert='Seven-nurse arrangement: '+r.seventh+' moves from '+allocationLabel(plan.seventhVacatedKey)+' into the seventh position. Overtime fills the vacated role.';
  else if(r.mode==='7'&&plan.seventhChoice&&plan.seventhChoice.source==='permanent')alert='Seven-nurse arrangement: '+plan.seventhNurse+' remains in '+allocationLabel(plan.seventhVacatedKey)+', while an overtime nurse takes the seventh position.';
  else if(r.mode==='7')alert='Seven-nurse arrangement: the seventh rotation selected an overtime nurse for the additional role.';
  else alert='Standard six-nurse plan: Pager works the Labour Ward first part and Reliever works the second part.';
  return{display:r.mode,fullLW:r.fullLW,alert:alert};
}

function labourOrderFor(r){
  if(!r||r.mode==='5')return null;
  var draft=labourOrderDrafts[r.date];if(draft&&draft.first&&draft.second)return{roster_date:r.date,first_part_name:draft.first,second_part_name:draft.second,automatic:!!draft.automatic};
  var order=labourOrders[r.date];if(!order)return null;
  var expected=[String(r.pager).toLowerCase(),String(r.reliever).toLowerCase()].sort().join('|');
  var stored=[String(order.first_part_name).toLowerCase(),String(order.second_part_name).toLowerCase()].sort().join('|');
  return expected===stored?order:null;
}

function ensureAutomaticLabourOrder(base,r){
  if(!r||r.mode==='5'||planIsProvisional(base))return;
  labourOrderDrafts[base.date]={first:r.pager,second:r.reliever,automatic:true};
}

function labourRoleDetail(name,r){
  var order=labourOrderFor(r),timing=nightDutyTiming(r.date);
  if(!order)return'Labour Ward part and break to decide';
  if(String(order.first_part_name).toLowerCase()===String(name).toLowerCase())return'Labour Ward first part · '+timing.firstPeriodDisplay+(timing.isClockChange?' · '+formatDutyHours(timing.partHours)+' actual':'')+' · Second break';
  return'Labour Ward second part · '+timing.secondPeriod+(timing.isClockChange?' · '+formatDutyHours(timing.partHours)+' actual':'')+' · First break';
}

function sameNurse(a,b){return canonicalNurseName(a)===canonicalNurseName(b)}

function interfaceIcon(type){
  var paths={
    staffing:'<path d="M8.5 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z"/><path d="M3 19a5.5 5.5 0 0 1 11 0"/><path d="M16 8a2.5 2.5 0 0 1 0 5"/><path d="M16.5 15.5A4.5 4.5 0 0 1 21 20"/>',
    absence:'<circle cx="12" cy="12" r="8.5"/><path d="m8.5 12 2.2 2.2 4.8-5"/>',
    task:'<rect x="5" y="4" width="14" height="16" rx="2"/><path d="M9 4.5h6V7H9z"/><path d="M9 11h6M9 15h4"/>',
    first:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l-3.5 2"/><path d="M6.5 5.5 8 7"/>',
    night:'<path d="M18.5 15.5A7.5 7.5 0 0 1 8.5 5a7.5 7.5 0 1 0 10 10.5Z"/><path d="M17.5 4v4M15.5 6h4"/>',
    second:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.5 2"/><path d="m16 17 1.5 1.5"/>',
    pager:'<rect x="6" y="4" width="12" height="16" rx="2.5"/><path d="M9 8h6v4H9zM9 16h3M15.5 4V2"/>',
    reliever:'<circle cx="10" cy="8" r="3"/><path d="M4 19a6 6 0 0 1 12 0"/><path d="M17 10a4 4 0 0 1 3 6.5M20 13v3.5h-3.5"/>',
    overtime:'<circle cx="9" cy="8" r="3"/><path d="M3.5 19a5.5 5.5 0 0 1 11 0M18 8v6M15 11h6"/>',
    seventh:'<circle cx="12" cy="12" r="8.5"/><path d="M12 8v8M8 12h8"/>',
    chat:'<path d="M4 5.5h16v11H9l-5 3v-14Z"/><path d="M8 10h8M8 13h5"/>'
  };
  return'<svg viewBox="0 0 24 24" aria-hidden="true">'+(paths[type]||paths.task)+'</svg>';
}

function roleIconType(badgeClass){return badgeClass==='bFirst'?'first':badgeClass==='bSecond'?'second':badgeClass==='bPager'?'pager':badgeClass==='bReliever'||badgeClass==='bFull'?'reliever':'seventh'}

function personalAllocation(base,r,name){
  var nightCopy=selectedNightCopy(base.date),timing=nightDutyTiming(base.date);
  if(!name)return{key:'unselected',icon:'night',title:'Choose your name',detail:'See your own role and break at a glance.',period:'Select your name',breakLabel:'Shown after selection',context:'Stored privately on this device',pending:false};
  var absence=changesFor(base.date).find(function(item){return sameNurse(item.absent_name,name)});
  if(absence)return{key:'absence',icon:'absence',title:'Not working for this night',detail:(absence.reason||'Absence')+' recorded',period:nightCopy.label,breakLabel:'Not applicable',context:absence.reason||'Absence recorded',pending:false};
  if(sameNurse(r.first1,name)||sameNurse(r.first2,name)){var firstKey=sameNurse(r.first1,name)?'first1':'first2';return{key:firstKey,icon:'first',title:'First Part theatre',detail:'Position '+(firstKey==='first1'?'1':'2'),period:timing.firstPeriodDisplay,breakLabel:'Second break',context:'With '+professionalName(firstKey==='first1'?r.first2:r.first1),pending:false,dutyPart:'first'}}
  if(sameNurse(r.second1,name)||sameNurse(r.second2,name)){var secondKey=sameNurse(r.second1,name)?'second1':'second2';return{key:secondKey,icon:'second',title:'Second Part theatre',detail:'Position '+(secondKey==='second1'?'1':'2'),period:timing.secondPeriod,breakLabel:'First break',context:'With '+professionalName(secondKey==='second1'?r.second2:r.second1),pending:false,dutyPart:'second'}}
  if(r.mode==='5'&&sameNurse(r.fullLW,name))return{key:'fullLW',icon:'reliever',title:'Labour Ward / Pager',detail:'Full-night cover',period:'00:00–07:00',breakLabel:'When clinical cover allows',context:'Sole Labour Ward / Pager cover',pending:false,dutyPart:'full'};
  if(r.mode!=='5'&&(sameNurse(r.pager,name)||sameNurse(r.reliever,name))){
    var pagerRole=sameNurse(r.pager,name),role=pagerRole?'Pager':'Reliever',other=pagerRole?r.reliever:r.pager,order=labourOrderFor(r);
    if(!order)return{key:pagerRole?'pager':'reliever',icon:pagerRole?'pager':'reliever',title:role,detail:'Labour Ward part pending',period:'To be decided',breakLabel:'Pending',context:'With '+professionalName(other),pending:true,other:other};
    if(sameNurse(order.first_part_name,name))return{key:pagerRole?'pager':'reliever',icon:pagerRole?'pager':'reliever',title:role,detail:'Labour Ward first part',period:timing.firstPeriodDisplay,breakLabel:'Second break',context:'With '+professionalName(other),pending:false,dutyPart:'first'};
    return{key:pagerRole?'pager':'reliever',icon:pagerRole?'pager':'reliever',title:role,detail:'Labour Ward second part',period:timing.secondPeriod,breakLabel:'First break',context:'With '+professionalName(other),pending:false,dutyPart:'second'};
  }
  if(r.mode==='7'&&sameNurse(r.seventh,name))return{key:'seventh',icon:'seventh',title:'Seventh nurse',detail:'Additional allocation',period:'As allocated',breakLabel:'As required',context:'Supports this night’s team',pending:false};
  return{key:'unallocated',icon:'task',title:'Not allocated for this night',detail:'An assignment may still be under review.',period:'Pending',breakLabel:'Pending',context:'Open Changes to review',pending:false};
}

function personalLiveStatus(base,assignment){
  var context=resolveNightContext(null,base.date);if(!assignment||!context.isCurrent||!context.selectedIsAutomatic)return'';
  var timing=context.timing||nightDutyTiming(base.date),now=context.nowMs;
  if(assignment.key==='absence')return'Not on duty tonight';
  if(assignment.pending||assignment.key==='unallocated')return'Allocation pending';
  if(assignment.dutyPart==='first'){
    if(now<timing.startUtc)return'On duty next · starts 00:00';
    if(now<timing.handoverUtc)return'On duty now';
    return'Duty block complete';
  }
  if(assignment.dutyPart==='second'){
    if(now<timing.handoverUtc)return'On duty later · starts '+timing.handoverDisplay;
    if(now<timing.endUtc)return'On duty now';
    return'Duty block complete';
  }
  if(assignment.period==='00:00–07:00')return'On duty now';
  if(assignment.key==='seventh')return'Supporting tonight’s team';
  return'Current night';
}

function personalAssignmentChanged(base,r,name,assignment){
  if(!name||!assignment||assignment.key==='unallocated')return false;
  if(assignment.key==='absence'||assignment.key==='fullLW')return true;
  var rostered=rawBaseForDate(base.date);if(!sameNurse(rostered[assignment.key],name))return true;
  if(assignment.key==='pager'||assignment.key==='reliever'){var order=labourOrderFor(r),normallyFirst=sameNurse(r.pager,name);if(order)return normallyFirst!==sameNurse(order.first_part_name,name)}
  return false;
}


function renderPersonalNight(base,r){
  var host=byId('personalNightCard'),notice=byId('personalAllocationNotice');if(!host||!notice)return null;
  var name=myName(),preferred=currentPrivateProfile&&currentPrivateProfile.profile_name||'',jobTitle=currentPrivateProfile&&currentPrivateProfile.job_title||'',displayName=preferred||professionalName(name)||'Choose your name',assignment=personalAllocation(base,r,name),changed=personalAssignmentChanged(base,r,name,assignment),initial=displayName.trim().charAt(0).toUpperCase()||'?',contextLabel=assignment.key==='absence'||assignment.key==='unallocated'?'Status':assignment.key==='unselected'?'Personal view':assignment.key==='fullLW'?'Coverage':assignment.key==='seventh'?'Team':'Working with',nightCopy=selectedNightCopy(base.date),nightTiming=nightDutyTiming(base.date),detail={date:base.date,displayName:displayName,jobTitle:jobTitle,avatarUrl:profileAvatarUrl||'',initial:initial,assignmentLabel:nightCopy.assignment,title:assignment.title,detail:assignment.detail||'',period:assignment.period,breakLabel:assignment.breakLabel,contextLabel:contextLabel,context:assignment.context,changedLabel:changed?nightCopy.changed:'',action:assignment.key==='absence'?'absence':name&&assignment.key!=='unallocated'?'role':'choose',pending:!!assignment.pending,pendingOther:professionalName(assignment.other),liveStatus:personalLiveStatus(base,assignment),dutyPart:assignment.dutyPart||'',dutyStartUtc:nightTiming.startUtc,handoverUtc:nightTiming.handoverUtc,dutyEndUtc:nightTiming.endUtc,handoverLabel:nightTiming.handoverDisplay,transitionUtc:nightTiming.transitionUtc||0,changed:changed,clockChange:clockChangeDetailFor(base.date)};
  if(window.dispatchEvent&&typeof CustomEvent==='function')window.dispatchEvent(new CustomEvent('roster:personal-night',{detail:detail}));
  return assignment;
}

function activitySignature(date){
  var records=[];[changesFor(date),overtimeFor(date),changeHistory[date]||[],overtimeHistory[date]||[],roleOverrideHistory[date]||[]].forEach(function(list){list.forEach(function(item){records.push(item.updated_at||item.changed_at||'')})});var status=nightPlanStatuses[date],override=nightRoleOverrides[date],cover=fiveCoverChoices[date],order=labourOrders[date];[status,override,cover,order].forEach(function(item){if(item)records.push(item.updated_at||item.changed_at||JSON.stringify(item))});return records.filter(Boolean).sort().join('|')
}

function acknowledgeNightActivity(date){
  if(!date)return;
  var seen={},seenAt={};try{seen=JSON.parse(appStorage.getItem('anaes_seen_night_activity')||'{}');seenAt=JSON.parse(appStorage.getItem('anaes_seen_night_activity_at')||'{}')}catch(error){}
  var now=typeof appNowMs==='function'?appNowMs():Date.now();seen[date]=activitySignature(date);seenAt[date]=now;
  var keys=Object.keys(seenAt).sort(function(a,b){return Number(seenAt[b])-Number(seenAt[a])}).slice(0,60),bounded={},boundedAt={};keys.forEach(function(key){bounded[key]=seen[key]||'';boundedAt[key]=seenAt[key]});
  try{appStorage.setItem('anaes_seen_night_activity',JSON.stringify(bounded));appStorage.setItem('anaes_seen_night_activity_at',JSON.stringify(boundedAt))}catch(error){}
  changedSinceSession[date]=false;activityOpenedThisSession[date]={previous:now,opened:now};
}
function renderRecentActivity(date){
  var host=byId('recentActivityList'),chip=byId('changedSinceChip');if(!host||!chip)return;
  var seenAt={};try{seenAt=JSON.parse(appStorage.getItem('anaes_seen_night_activity_at')||'{}')}catch(error){}
  if(!activityOpenedThisSession[date]){var previous=Number(seenAt[date]||0),opened=typeof appNowMs==='function'?appNowMs():Date.now();activityOpenedThisSession[date]={previous:previous||opened,opened:opened};if(!previous)acknowledgeNightActivity(date)}
  var session=activityOpenedThisSession[date],all=staffingHistoryFor(date),items=all.slice(0,5),updatedItems=all.filter(function(item){return(new Date(item.changed_at).getTime()||0)>session.previous}),updatedCount=updatedItems.length,sinceLabel=new Date(session.previous).toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit',timeZone:'Europe/Malta'});
  recentActivityItems=items;recentActivityDate=date;
  var detail={totalCount:all.length,updated:updatedCount>0,updatedCount:updatedCount,sinceLabel:sinceLabel,summary:updatedItems.slice(0,3).map(function(item){return item.title}),items:items.map(function(item){return{label:item.label,type:item.type,title:item.title,detail:item.detail||'',meta:(item.changed_by||'Roster member')+' · '+shortTime(item.changed_at)}})};
  if(window.dispatchEvent&&typeof CustomEvent==='function')window.dispatchEvent(new CustomEvent('roster:recent-activity',{detail:detail}));
}

function openActivityDetail(item,date){var dialog=byId('activityDetailSheet'),type=byId('activityDetailType'),title=byId('activityDetailTitle'),content=byId('activityDetailContent');if(!dialog||!item)return;type.className='activityType '+item.type;type.textContent=item.label;title.textContent=item.title;var rows=[['Night',fmt(date)],['Details',item.detail||'No additional reason was recorded.'],['Recorded by',item.changed_by||'Roster member'],['Recorded',new Date(item.changed_at).toLocaleString('en-GB',{dateStyle:'medium',timeStyle:'short'})]];content.innerHTML=rows.map(function(row){return'<div class="activityDetailRow"><span>'+esc(row[0])+'</span><b>'+esc(row[1])+'</b></div>'}).join('');if(!dialog.open)dialog.showModal()}

function updateScrollChrome(){scrollChromeFrame=null;var scrolled=window.scrollY>18;document.body.classList.toggle('uiScrolled',scrolled);document.body.classList.remove('headerCompact')}
function scheduleScrollChrome(){if(scrollChromeFrame)return;scrollChromeFrame=requestAnimationFrame(updateScrollChrome)}

function failedAction(message,retry){lastFailedAction=retry||null;toast(message,retry?{label:'Retry',run:function(){var action=lastFailedAction;lastFailedAction=null;return action&&action()}}:null)}
function notifyRosterUpdate(type,date){if(window.dispatchRosterPush)window.dispatchRosterPush(type,date)}

function openNightTeamNameDialog(){
  var base=cur(),dialog=byId('nightTeamNameDialog'),input=byId('nightTeamNameInput'),date=byId('nightTeamNameDate'),meta=byId('nightTeamNameMeta'),clear=byId('clearNightTeamNameBtn'),status=byId('nightTeamNameStatus'),row=base&&nightTeamIdentityFor(base.date),nickname=base?nightTeamNickname(base.date):'';
  if(!base||!dialog||!input)return;
  input.value=nickname;
  input.dataset.rosterDate=base.date;
  if(date)date.textContent='Shared across every roster night';
  if(meta){meta.textContent=row&&row.updated_by?'Last changed by '+row.updated_by+' · '+shortTime(row.updated_at):'Everyone in this shift will see the same name.';meta.classList.toggle('hidden',false)}
  if(clear)clear.classList.toggle('hidden',!nickname);
  if(status){status.textContent='';status.classList.remove('error')}
  if(dialog.showModal&&!dialog.open)dialog.showModal();
  setTimeout(function(){input.focus();input.select()},80)
}
window.openNightTeamNameDialog=openNightTeamNameDialog;

async function saveNightTeamName(clearName){
  var input=byId('nightTeamNameInput'),dialog=byId('nightTeamNameDialog'),save=byId('saveNightTeamNameBtn'),clear=byId('clearNightTeamNameBtn'),status=byId('nightTeamNameStatus');
  if(!input||!supa)return;
  var rosterDate=String(input.dataset.rosterDate||''),nickname=clearName?'':String(input.value||'').trim().replace(/\s+/g,' ');
  if(!/^20\d{2}-\d{2}-\d{2}$/.test(rosterDate))return;
  if(nickname.length>28){if(status){status.textContent='Keep the shift name to 28 characters or fewer.';status.classList.add('error')}return}
  if(sharedWritesBlocked()){if(status){status.textContent='Update Night Roster before changing the shared shift name.';status.classList.add('error')}return}
  if(!navigator.onLine||forcedOfflineSession){if(status){status.textContent='Reconnect before changing the shared shift name.';status.classList.add('error')}return}
  if(save)save.disabled=true;if(clear)clear.disabled=true;if(status){status.textContent=clearName?'Removing shared shift name…':'Saving shift identity…';status.classList.remove('error')}
  try{
    var result=await supa.rpc('set_night_team_identity_v51',{p_roster_date:rosterDate,p_nickname:nickname,p_client_version:APP_VERSION});
    if(result.error)throw result.error;
    await loadSharedData({background:true});
    if(dialog&&dialog.open)dialog.close();
    toast(clearName?'Shift name removed':('Shift named “'+nickname+'” across all roster nights'));
  }catch(error){
    recordAppDiagnostic('team-identity','save',error&&error.code||'failed');
    if(status){status.textContent='The shared shift name could not be saved. Try again.';status.classList.add('error')}
  }finally{if(save)save.disabled=false;if(clear)clear.disabled=false}
}
window.saveNightTeamName=saveNightTeamName;

function render(){
  if(!R.length||!currentUserProfile)return;
  var canonical=buildNightPlan(cur()),base=canonical.base,plan=canonical.staffing,r=canonical.effective,e=effective(r),count=plan.count,dutyTiming=canonical.timing;
  shadowNightPlanCheck(canonical);
  if(window.AnaestheticRuntime&&window.AnaestheticRuntime.state){var runtimeNightContext=resolveNightContext(null,base.date);window.AnaestheticRuntime.state.night.set(nightSelectionMode==='manual'?'manual':runtimeNightContext.isCurrent?'automatic-current':'automatic-next')}
  ensureAutomaticLabourOrder(base,r);
  var labourPending=r.mode!=='5'&&!planIsProvisional(base)&&!labourOrderFor(r);
  var roles=[['bFirst','First Part',r.first1+' + '+r.first2,'Works '+dutyTiming.firstPeriodDisplay+(dutyTiming.isClockChange?' · '+formatDutyHours(dutyTiming.partHours)+' actual':'')+' • Second break'],['bSecond','Second Part',r.second1+' + '+r.second2,'Works '+dutyTiming.secondPeriod+(dutyTiming.isClockChange?' · '+formatDutyHours(dutyTiming.partHours)+' actual':'')+' • First break']];
  if(r.mode!=='5'){
    roles.push(['bPager','Pager',r.pager,labourRoleDetail(r.pager,r)]);
    roles.push(['bReliever','Reliever',r.reliever,labourRoleDetail(r.reliever,r)]);
  }
  syncDateInputs(base.date);renderNightTeamIdentityContext(base.date);renderMyName();var personal=renderPersonalNight(base,r);renderRecentActivity(base.date);updateSmartNightButtons();
  byId('modeStatus').textContent=count+' nurse'+(count===1?'':'s');
  if(byId('changesModeStatus'))byId('changesModeStatus').textContent=count+' nurse'+(count===1?'':'s');
  byId('breakModeStatus').textContent=count+' nurse'+(count===1?'':'s');
  var decisionTasks=workflowTaskCount(base,plan,r),confirmNeeded=workflowNeedsConfirmation(base,decisionTasks),taskCount=decisionTasks||(confirmNeeded?1:0),absenceCount=changesFor(base.date).length,overtimeEntries=overtimeFor(base.date),overtimeCount=overtimeEntries.length;
  var firstTask=workflowTaskDetails(base,plan)[0]||'';
  if(r.mode==='7')roles.push(['b7','Seventh nurse',r.seventh,'Additional nurse · Break coordinated as required']);
  var extras=additionalNurses(plan);
  var roleModel=roles.map(function(c){var tone=roleIconType(c[0]);return{key:c[0],label:c[1],names:professionalNames(c[2]),detail:c[3],tone:tone==='first'||tone==='second'||tone==='pager'||tone==='reliever'||tone==='seventh'?tone:'full',mine:isMine(c[2])}}),fivePerson=r.mode==='5'&&count>=5&&r.fullLW?{name:professionalName(r.fullLW),reason:'One nurse covers Labour Ward and Pager for the full night. Their break is coordinated when clinical cover allows.',mine:isMine(r.fullLW)}:null,nightDetail={date:base.date,nurseCount:count,absenceCount:absenceCount,overtimeCount:overtimeCount,overtimeNames:overtimeEntries.map(function(o){return professionalName(o.nurse_name)}),taskCount:taskCount,decisionTasks:decisionTasks,confirmNeeded:confirmNeeded,alert:count!==6&&r.mode!=='5'?e.alert:'',firstTask:decisionTasks?firstTask:'',labourPending:labourPending&&!(personal&&personal.pending),breakLabel:personal&&personal.breakLabel||'',chatUnread:Number(byId('chatUnreadBadge')&&byId('chatUnreadBadge').textContent||0)||0,liveState:personalLiveStatus(base,personal),roles:roleModel,extras:extras.map(function(o){return o.nurse_name}),fivePerson:fivePerson,clockChange:clockChangeDetailFor(base.date),contextLabel:planIsProvisional(base)?'Provisional':nightDutyTiming(base.date).isClockChange?'Clock change':r.mode==='5'?'5-nurse arrangement':r.mode==='7'?'7-nurse arrangement':absenceCount||overtimeCount||workflowHasManualPlan(base)?'Updated night':'Standard night',currentPart:(function(){var context=resolveNightContext(null,base.date);if(!context.isCurrent||!context.selectedIsAutomatic||context.nowMs<context.timing.startUtc||context.nowMs>=context.timing.endUtc)return'';return context.nowMs<context.timing.handoverUtc?'first':'second'})(),dataFreshness:window.AnaestheticDomain&&window.AnaestheticDomain.freshness?window.AnaestheticDomain.freshness(lastSuccessfulSyncAt,navigator.onLine&&!forcedOfflineSession,appNowMs()).label:''};
  if(window.dispatchEvent&&typeof CustomEvent==='function')window.dispatchEvent(new CustomEvent('roster:night',{detail:nightDetail}));
  appStorage.setItem('anaes_selected_date',base.date);
  renderChanges(base,canonical);renderRoster();renderBreaks(canonical);bindTaskLinks();queueClockChangeAttention(base.date);maybeUpcomingClockChangeReminder();
  if(currentUserProfile.user_role==='admin')renderAdmin();
  ensureNightHistory(base.date);updateNetworkStatus();save();
}

function goToChanges(target){
  activeChangesStep='allocation';show('changes');
  setTimeout(function(){var el=document.querySelector(target||'#changesAllocationPane');if(el){el.scrollIntoView({behavior:'smooth',block:'start'});var focus=el.querySelector('.needsDecision button, #fiveCoverStep button, [data-final-allocation], button:not(.hidden), select, summary, input');if(focus)focus.focus({preventScroll:true})}},260);
}

function bindTaskLinks(){
  Array.prototype.forEach.call(document.querySelectorAll('[data-go-allocation]'),function(el){
    el.onclick=function(){goToChanges('#changesAllocationPane')};
    if(el.tagName!=='BUTTON'){el.setAttribute('role','button');el.setAttribute('tabindex','0');el.onkeydown=function(event){if(event.key==='Enter'||event.key===' '){event.preventDefault();goToChanges('#changesAllocationPane')}}}
  });
  function bindStaffingTarget(attribute,selector){Array.prototype.forEach.call(document.querySelectorAll('['+attribute+']'),function(el){el.onclick=function(){activeChangesStep='staffing';show('changes');setTimeout(function(){var target=document.querySelector(selector);if(target){target.scrollIntoView({behavior:'smooth',block:'start'});var field=target.querySelector('select,input');if(field)field.focus({preventScroll:true})}},180)}})}
  bindStaffingTarget('data-go-staffing','#changesStaffingPane');bindStaffingTarget('data-go-absence','.absenceSection');bindStaffingTarget('data-go-overtime','.overtimeSection');
  Array.prototype.forEach.call(document.querySelectorAll('[data-go-confirm]'),function(el){el.onclick=function(){activeChangesStep='confirm';show('changes');setTimeout(function(){var target=byId('changesConfirmPane');if(target)target.scrollIntoView({behavior:'smooth',block:'start'})},180)}});
  Array.prototype.forEach.call(document.querySelectorAll('[data-go-role-editor]'),function(el){el.onclick=function(){goToChanges('.nightRoleEditor');setTimeout(function(){var editor=document.querySelector('.nightRoleEditor');if(editor){editor.open=true;editor.scrollIntoView({behavior:'smooth',block:'start'})}},220)}});
}

function recentOvertimeNames(){
  var values=[];try{values=JSON.parse(appStorage.getItem('anaes_recent_overtime_names')||'[]')}catch(error){}
  Object.keys(nightOvertime).forEach(function(date){(nightOvertime[date]||[]).forEach(function(item){values.push(item.nurse_name)})});
  var seen={};return values.map(normaliseNurseName).filter(function(name){var key=name.toLowerCase();if(!name||seen[key])return false;seen[key]=true;return true}).slice(-30).reverse();
}

function rememberOvertimeName(name){var names=recentOvertimeNames().filter(function(item){return item.toLowerCase()!==name.toLowerCase()});names.unshift(name);try{appStorage.setItem('anaes_recent_overtime_names',JSON.stringify(names.slice(0,30)))}catch(error){}}

function renderOvertimeSuggestions(){var list=byId('overtimeSuggestions');if(list)list.innerHTML=recentOvertimeNames().map(function(name){return'<option value="'+esc(name)+'"></option>'}).join('')}

function highlightSavedItem(containerId,name,attribute){var container=byId(containerId);if(!container)return;Array.prototype.forEach.call(container.children,function(item){if(String(item.getAttribute(attribute)||'').toLowerCase()===String(name).toLowerCase()){item.classList.add('savedPulse');setTimeout(function(){item.classList.remove('savedPulse')},1800)}})}

function earliestOvertimeAdd(date,name){
  var matches=(overtimeHistory[date]||[]).filter(function(h){return h.action==='added'&&String(h.nurse_name).toLowerCase()===String(name).toLowerCase()});
  matches.sort(function(a,b){return new Date(a.changed_at)-new Date(b.changed_at)});
  return matches[0]||null;
}

function selectedAllocationId(base,key){
  var draft=allocationDrafts[base.date]||{};
  if(Object.prototype.hasOwnProperty.call(draft,key))return draft[key];
  var assigned=staffingPlan(base).validAssignments.find(function(o){return o.allocation_key===key});
  return assigned?assigned.id:'';
}

function allocationPreview(base){
  var r=applyChanges(base),overtime=overtimeFor(base.date),plan=staffingPlan(base);
  plan.availableKeys.forEach(function(key){var id=selectedAllocationId(base,key),entry=overtime.find(function(o){return o.id===id});if(entry)r[key]=entry.nurse_name});
  return r;
}

function suggestedFiveRoleAssignments(base){var raw=rawBaseForDate(base.date),names=nightWorkingNames(base);if(names.length!==5)return null;var assignments={mode:'5'},used=[],full=[raw.pager,raw.reliever].find(function(name){return names.some(function(active){return canonicalNurseName(active)===canonicalNurseName(name)})});assignments.fullLW=full||names[0];used.push(assignments.fullLW);['first1','first2','second1','second2'].forEach(function(key){var rostered=raw[key];if(names.some(function(active){return canonicalNurseName(active)===canonicalNurseName(rostered)})&&!used.some(function(name){return canonicalNurseName(name)===canonicalNurseName(rostered)})){assignments[key]=rostered;used.push(rostered)}});['first1','first2','second1','second2'].forEach(function(key){if(assignments[key])return;var next=names.find(function(name){return !used.some(function(saved){return canonicalNurseName(saved)===canonicalNurseName(name)})});assignments[key]=next;used.push(next)});return validRoleAssignmentsForNight(base,assignments)?assignments:null}
function currentRoleAssignments(base){var stored=nightRoleOverrides[base.date],assignments=stored&&stored.assignments;if(validRoleAssignmentsForNight(base,assignments))return Object.assign({},assignments);var working=nightWorkingNames(base);if(working.length===5)return suggestedFiveRoleAssignments(base);var current=applyChanges(baseForDate(base.date)),normal={};CORE_ALLOCATION_KEYS.forEach(function(key){normal[key]=current[key]});if(working.length===7){var extra=working.find(function(name){return !CORE_ALLOCATION_KEYS.some(function(key){return sameNurse(current[key],name)})});normal.mode='7';normal.seventh=extra||working[6]}return normal}
function roleEditorAssignments(base){var draft=nightRoleOverrideDrafts[base.date];if(draft&&validRoleAssignmentsForNight(base,draft.assignments))return Object.assign({},draft.assignments);return currentRoleAssignments(base)}
function roleAssignmentsDiffer(left,right){if(!left||!right||String(left.mode||'6')!==String(right.mode||'6'))return true;return roleAssignmentKeys(left).some(function(key){return String(left[key]||'')!==String(right[key]||'')})}

function nightRoleOverrideModel(base){
  if(!nightRoleOverrideAvailable)return{notice:'Night-only role changes need the current database update. The normal calculated roster remains available.'};
  var working=nightWorkingNames(base);if(working.length<5)return{notice:'Custom roles are unavailable while cover is incomplete. Add enough cover to reach five nurses before arranging this night’s roles.'};
  var stored=nightRoleOverrides[base.date],draft=nightRoleOverrideDrafts[base.date],current=roleEditorAssignments(base),baseline=currentRoleAssignments(base);if(!current||!baseline)return{notice:'Night roles are not available for this night yet.'};
  var keys=roleAssignmentKeys(current),fiveMode=current.mode==='5',sevenMode=current.mode==='7',dirty=!!(draft&&roleAssignmentsDiffer(draft.assignments,baseline)),labels={first1:'First part · position 1',first2:'First part · position 2',second1:'Second part · position 1',second2:'Second part · position 2',pager:'Pager',reliever:'Reliever',fullLW:'Full-night Labour Ward / Pager',seventh:'Seventh nurse'},names=(fiveMode||sevenMode)?working:keys.map(function(key){return current[key]});
  return{guidance:fiveMode?'Arrange the five nurses working this night across four theatre roles and one full-night Labour Ward / Pager role. Each nurse is used once.':sevenMode?'Arrange all seven nurses working this night across the theatre, Pager, Reliever and Seventh nurse roles. Each nurse is used once.':'Choose a different nurse in any role. The two people swap automatically, so no one is duplicated.',summary:stored?(fiveMode?'Custom five-nurse roles are active':sevenMode?'Custom seven-nurse roles are active':'Night-only roles are active'):(fiveMode?'Optional custom five-nurse arrangement':sevenMode?'Optional custom seven-nurse arrangement':'Optional · roster rotation stays unchanged'),open:!!draft,stored:!!stored,dirty:dirty,reason:draft&&draft.reason||'',canSave:dirty&&!!normaliseNurseName(draft&&draft.reason||'')&&navigator.onLine,keys:keys.map(function(key){return{key:key,label:labels[key],fullWidth:key==='fullLW'||key==='seventh'}}),names:names.map(function(name){return{value:name,label:professionalName(name)}}),assignments:current};
}

async function saveNightRoleOverride(base){
  if(!requireOnline())return;var draft=nightRoleOverrideDrafts[base.date],reason=normaliseNurseName(draft&&draft.reason||'');
  if(!draft||!validRoleAssignmentsForNight(base,draft.assignments)||!roleAssignmentsDiffer(draft.assignments,currentRoleAssignments(base))){toast('Change a role before saving');return}if(!reason){toast('Add a short reason for the night-only change');var field=byId('nightRoleReason');if(field)field.focus();return}
  var previous=nightRoleOverrides[base.date]?JSON.parse(JSON.stringify(nightRoleOverrides[base.date])):null,button=byId('saveNightRolesBtn');if(button){button.disabled=true;button.textContent='Saving…'}setSync('saving','Saving night-only roles');
  var expectedAssignments=JSON.parse(JSON.stringify(draft.assignments)),result=await runRosterMutation('roles:save:'+base.date,function(commandId,expectedSyncRevision){return supa.rpc('apply_night_role_override_v49',{p_operation_id:commandId,p_expected_sync_revision:expectedSyncRevision,p_client_version:APP_VERSION,p_roster_date:base.date,p_action:'save',p_assignments:expectedAssignments,p_override_reason:reason,p_history_reason:reason})},function(){var stored=nightRoleOverrides[base.date]&&nightRoleOverrides[base.date].assignments;return !!(stored&&JSON.stringify(stored)===JSON.stringify(expectedAssignments))});
  if(missingRpc(result)){setSync('error','Database update required');toast('Seven-nurse night-only changes require the current database update. Nothing was changed.');if(button){button.disabled=false;button.textContent='Save night-only change'}return}if(rpcError(result))return;delete nightRoleOverrideDrafts[base.date];await loadSharedData();notifyRosterUpdate('roles',base.date);toast('Saved for this night only. The permanent rotation is unchanged.',{label:'Undo',run:function(){return undoNightRoleChange(base.date,previous)}});
}

async function resetNightRoleOverride(base){
  if(!requireOnline()||!confirm('Restore the rostered roles for this night?'))return;setSync('saving','Restoring rostered roles');var stored=nightRoleOverrides[base.date]?JSON.parse(JSON.stringify(nightRoleOverrides[base.date])):null,result=await runRosterMutation('roles:reset:'+base.date,function(commandId,expectedSyncRevision){return supa.rpc('apply_night_role_override_v49',{p_operation_id:commandId,p_expected_sync_revision:expectedSyncRevision,p_client_version:APP_VERSION,p_roster_date:base.date,p_action:'reset',p_assignments:null,p_override_reason:null,p_history_reason:'Restored rostered roles'})},function(){return !nightRoleOverrides[base.date]});if(missingRpc(result)){setSync('error','Database update required');toast('This action requires database schema 36. Nothing was changed.');return}if(rpcError(result))return;delete nightRoleOverrideDrafts[base.date];await loadSharedData();notifyRosterUpdate('roles',base.date);toast('Rostered roles restored',{label:'Undo',run:function(){return undoNightRoleChange(base.date,stored)}});
}

async function undoNightRoleChange(date,previous){
  if(!requireOnline())return;setSync('saving','Undoing role change');var expected=previous&&previous.assignments?JSON.parse(JSON.stringify(previous.assignments)):null,result=await runRosterMutation('roles:undo:'+date,function(commandId,expectedSyncRevision){return supa.rpc('apply_night_role_override_v49',{p_operation_id:commandId,p_expected_sync_revision:expectedSyncRevision,p_client_version:APP_VERSION,p_roster_date:date,p_action:previous?'save':'reset',p_assignments:expected,p_override_reason:previous&&previous.reason||'Previous night-only arrangement',p_history_reason:'Undid the latest role change'})},function(){var current=nightRoleOverrides[date]&&nightRoleOverrides[date].assignments;return expected?!!(current&&JSON.stringify(current)===JSON.stringify(expected)):!current});if(missingRpc(result)){setSync('error','Database update required');toast('Undo requires database schema 36. Nothing was changed.');return}if(rpcError(result))return;await loadSharedData();notifyRosterUpdate('roles',date);toast('Role change undone')
}

function updateConfirmationControls(confirmNeeded,tasks){
  var button=byId('saveAllocationsBtn'),hint=byId('confirmHint');
  if(button){
    button.classList.toggle('hidden',!confirmNeeded);
    button.dataset.workflowBlocked=tasks?'true':'false';
    button.disabled=!!tasks||!navigator.onLine;
    if(!allocationSaveInFlight)button.textContent='Confirm and share changes';
  }
  if(hint)hint.classList.toggle('hidden',!confirmNeeded);
}

function updateAllocationSaveControl(base,plan){
  plan=plan||staffingPlan(base);var tasks=workflowTaskCount(base,plan),confirmNeeded=workflowNeedsConfirmation(base,tasks);
  updateConfirmationControls(confirmNeeded,tasks);
}

function seventhDecisionCard(plan){
  if(plan.count<7||!plan.seventhChoice)return'';
  var choice=plan.seventhChoice;
  if(choice.source==='overtime')return'<div class="seventhDecisionCard confirmed"><div class="decisionEyebrow">Seventh-nurse rotation</div><h3>Overtime nurse takes the seventh position</h3><div class="time">This is the scheduled overtime turn. Choose the overtime nurse in the seventh-nurse allocation below.</div></div>';
  var original=allocationLabel(choice.vacatedKey),fallback=choice.fallback?'<div class="decisionFallback">'+esc(choice.scheduled)+' is absent, so '+esc(choice.nurse)+' is the next available permanent nurse in the seventh rotation.</div>':'';
  return'<div class="seventhDecisionCard '+(plan.requiresSeventhDecision?'needsDecision':'confirmed')+'"><div class="decisionEyebrow">Seventh-nurse decision</div><h3>'+esc(choice.nurse)+': '+esc(original)+' → seventh nurse</h3>'+fallback+'<div class="decisionRoute"><div><span>If rotation is used</span><b>'+esc(choice.nurse)+' becomes seventh nurse</b><small>Overtime fills '+esc(original)+'</small></div><div><span>If original role is kept</span><b>'+esc(choice.nurse)+' stays in '+esc(original)+'</b><small>Overtime fills the seventh position</small></div></div><div class="decisionButtons"><button type="button" class="'+(plan.seventhDecision==='rotation'?'selected':'')+'" data-seventh-decision="rotation">Use seventh rotation</button><button type="button" class="'+(plan.seventhDecision==='overtime'?'selected':'')+'" data-seventh-decision="overtime">Keep original role</button></div>'+(plan.requiresSeventhDecision?'<div class="decisionPrompt">Choose one option before the seven-nurse allocation can be finalised.</div>':'<div class="decisionSaved">Decision selected. Save the allocation below to share it with everyone.</div>')+'</div>';
}

function chooseSeventhDecision(base,decision){
  if(decision!=='rotation'&&decision!=='overtime')return;
  var plan=staffingPlan(base),choice=plan.seventhChoice;if(!choice||choice.source!=='permanent')return;
  seventhDecisionDrafts[base.date]=decision;
  if(allocationDrafts[base.date]){delete allocationDrafts[base.date].seventh;delete allocationDrafts[base.date][choice.vacatedKey]}
  render();
  setTimeout(function(){var card=document.querySelector('.seventhDecisionCard');if(card)card.scrollIntoView({behavior:'smooth',block:'center'})},120);
}

function renderChanges(base,nightPlan){
  var canonical=nightPlan&&nightPlan.date===base.date?nightPlan:buildNightPlan(base);
  if(document.body&&typeof document.body.getAttribute==='function'&&document.body.getAttribute('data-view')==='changes'&&changesSmartDefaultDate!==base.date){activeChangesStep=smartChangesStep(base);changesSmartDefaultDate=base.date}
  var changes=changesFor(base.date),absentLower=changes.map(function(c){return c.absent_name.toLowerCase()}),names=activeNames(base).filter(function(n){return absentLower.indexOf(n.toLowerCase())<0});
  var overtime=overtimeFor(base.date),plan=canonical.staffing,history=staffingHistoryFor(base.date),expanded=!!historyExpandedDates[base.date];
  updateStaffingActionAvailability();
  var extraIds=additionalNurses(plan).map(function(o){return o.id});
  byId('fiveCoverStep').innerHTML=fiveCoverHtml(base,plan);
  var extras=additionalNurses(plan),summary,seventhInfo=seventhDecisionCard(plan);
  if(plan.requiresCoverageChoice)summary='<b>'+plan.count+' nurses working this night</b><div class="time">Choose and save the Reliever’s theatre role first. The remaining positions will then appear for overtime nurses.</div>';
  else if(plan.requiresSeventhDecision)summary='<b>Seventh-nurse decision required</b><div class="time">Review the proposed move below. Your choice determines which allocation the overtime nurse will fill.</div>';
  else if(!overtime.length)summary=workflowHasManualPlan(base)?'<b>No allocation decision needed</b><div class="time">This night’s roles are calculated. Review them before sharing the staffing change.</div>':'<b>No allocation changes</b><div class="time">This night’s roles are calculated automatically.</div>';
  else if(plan.unresolved.length)summary='<b>'+plan.count+' nurses working this night</b><div class="time">'+plan.unresolved.length+' required allocation'+(plan.unresolved.length===1?' remains':'s remain')+' to be decided.</div>';
  else if(extras.length)summary='<b>Core allocations finalised</b><div class="time">'+extras.length+' additional nurse'+(extras.length===1?' remains':'s remain')+' available as required.</div>';
  else summary='<b>Required allocations finalised</b><div class="time">The required overtime allocations are complete.</div>';
  byId('allocationSummary').innerHTML=summary+seventhInfo;
  var allocationDraft=allocationDrafts[base.date]||{};
  var allocationRows=overtime.length&&plan.availableKeys.length?plan.availableKeys.map(function(key){
    var assigned=plan.validAssignments.find(function(o){return o.allocation_key===key});
    var selectedId=Object.prototype.hasOwnProperty.call(allocationDraft,key)?allocationDraft[key]:(assigned?assigned.id:'');
    return{key:key,label:allocationLabel(key),breakLabel:allocationBreak(key),selectedId:selectedId,options:overtime.map(function(o){return{id:o.id,name:o.nurse_name}})};
  }):[];
  var allocationMessage=plan.requiresCoverageChoice?'The overtime choices will appear after the reliever allocation is saved.':plan.requiresSeventhDecision?'Choose the seventh-nurse option above. The correct overtime allocation will then appear here.':'There are no required allocations to finalise.';
  updateAllocationSaveControl(base);renderOvertimeSuggestions();
  var visible=expanded?history:history.slice(0,15);
  var changeDetail={
    absences:changes.map(function(c){return{id:c.id,kind:'absence',name:professionalName(c.absent_name),status:'Absent',meta:(c.reason||'Absence')+' · Updated by '+(c.updated_by||'Shift member')+' at '+shortTime(c.updated_at)}}),
    overtime:overtime.map(function(o){var valid=plan.validAssignments.some(function(item){return item.id===o.id}),extra=extraIds.indexOf(o.id)>=0,added=earliestOvertimeAdd(base.date,o.nurse_name),when=added?added.changed_at:o.updated_at,who=added?added.changed_by:o.updated_by;return{id:o.id,kind:'overtime',name:o.nurse_name,status:extra?'Additional staff · as required':valid?allocationLabel(o.allocation_key):'Awaiting allocation',needsAllocation:!valid&&!extra,meta:'Added by '+(who||'Shift member')+' at '+shortTime(when)}}),
    history:visible.map(function(h){return{label:h.label,type:h.type,title:h.title,detail:h.detail||'',meta:(h.changed_by||'Shift member')+' · '+shortTime(h.changed_at)}}),historyTotal:history.length,historyExpanded:expanded,historyHasMore:!!(historyPageState[base.date]&&historyPageState[base.date].has_more),allocations:allocationRows,allocationMessage:allocationMessage,forms:{names:names.map(function(n){return{value:n,label:professionalName(n)}}),editing:!!editingAbsenceId,overtimeSuggestions:recentOvertimeNames()},roleOverride:nightRoleOverrideModel(base)
  };
  if(window.dispatchEvent&&typeof CustomEvent==='function')window.dispatchEvent(new CustomEvent('roster:changes',{detail:changeDetail}));
  Array.prototype.forEach.call(document.querySelectorAll('[data-final-allocation]'),function(select){select.onchange=function(){var date=base.date,key=select.getAttribute('data-final-allocation');if(!allocationDrafts[date])allocationDrafts[date]={};allocationDrafts[date][key]=select.value;updateAllocationSaveControl(base);updateChangesWorkflow(base,plan);formMessage('allocationFormMessage','Selections ready to review.','')}});
  Array.prototype.forEach.call(document.querySelectorAll('[data-seventh-decision]'),function(button){button.onclick=function(){chooseSeventhDecision(base,button.getAttribute('data-seventh-decision'))}});
  var coverButton=byId('saveFiveCoverBtn');if(coverButton)coverButton.onclick=saveFiveCover;
  updateChangesWorkflow(base,plan);
  updateOfflineControls();
}

function updateStaffingActionAvailability(){
  var absence=byId('saveChangeBtn'),absenceName=byId('absentName'),overtime=byId('addOvertimeBtn'),overtimeName=byId('overtimeName'),offline=!navigator.onLine||forcedOfflineSession,writeBlocked=sharedWritesBlocked();
  if(absence)absence.disabled=offline||!absenceName||!absenceName.value||writeBlocked;
  if(overtime)overtime.disabled=offline||!overtimeName||!normaliseNurseName(overtimeName.value)||writeBlocked;
}

function editNightChange(id){
  var item=changesFor(cur().date).find(function(c){return c.id===id});
  if(!item)return;
  editingAbsenceId=id;var option=document.createElement('option');option.value=item.absent_name;option.textContent=professionalName(item.absent_name)+' • editing';
  byId('absentName').prepend(option);byId('absentName').value=item.absent_name;byId('changeReason').value=item.reason||'Leave';
  byId('saveChangeBtn').textContent='Update absence';byId('cancelAbsenceEditBtn').classList.remove('hidden');updateStaffingActionAvailability();
  byId('absentName').scrollIntoView({behavior:'smooth',block:'center'});
}

function cancelAbsenceEdit(){editingAbsenceId=null;byId('absentName').value='';byId('changeReason').value='Leave';byId('saveChangeBtn').textContent='Save absence';byId('cancelAbsenceEditBtn').classList.add('hidden');formMessage('absenceFormMessage','');renderChanges(cur())}

function buildNightPlan(base){
  base=base||cur();var plan=staffingPlan(base),r=applyChanges(base),timing=nightDutyTiming(base.date),provisional=plan.count<5||plan.requiresCoverageChoice||plan.requiresSeventhDecision||plan.unresolved.length>0,labour=labourOrderFor(r),tasks=workflowTaskDetails(base,plan),status=nightPlanStatuses[base.date]||null;
  return{date:base.date,base:base,effective:r,staffing:plan,timing:timing,provisional:provisional,labourOrder:labour,labourPending:r.mode!=='5'&&!provisional&&!labour,tasks:tasks,revision:status?Number(status.revision||0):0,confirmed:!!(status&&status.published_at&&!planNeedsConfirmation(base,0))};
}

function breakData(r,nightPlan){
  var base=nightPlan&&nightPlan.base||baseForDate(r.date),plan=nightPlan&&nightPlan.staffing||staffingPlan(base),timing=nightPlan&&nightPlan.timing||nightDutyTiming(r.date);
  if(plan.count<5)return{first:[],second:[],notes:['Breaks cannot be finalised while only '+plan.count+' nurses are recorded. Add sufficient overtime cover and complete the allocations first.']};
  var first=[r.second1,r.second2],second=[r.first1,r.first2],notes=[];
  if(r.mode==='5')notes.push(professionalName(r.fullLW)+' covers Labour Ward / Pager for the full night. Their break is coordinated during the shift when clinical cover allows.');
  else{
    var order=labourOrderFor(r);
    if(order){
      first.push(order.second_part_name);second.push(order.first_part_name);
      notes.push('First part Labour Ward / Pager: '+professionalName(order.first_part_name)+' • '+timing.firstPeriodDisplay+' • Second break.');
      notes.push('Second part Labour Ward / Pager: '+professionalName(order.second_part_name)+' • '+timing.secondPeriod+' • First break.');
    }else{
      notes.push(professionalName(r.pager)+' and '+professionalName(r.reliever)+' still need to decide who works each part of Labour Ward / Pager.');
      notes.push('Whoever works the first part takes second break. Whoever works the second part takes first break.');
    }
    if(r.mode==='7')notes.push(professionalName(r.seventh)+' is the seventh nurse and coordinates a break as required.');
    var extras=additionalNurses(plan);if(extras.length)notes.push(extras.map(function(o){return o.nurse_name}).join(' + ')+' remain additional staff and take breaks as required.');
  }
  return{first:first,second:second,notes:notes};
}

function renderBreaks(nightPlan){
  var model=nightPlan&&nightPlan.date===cur().date?nightPlan:buildNightPlan(cur()),base=model.base,r=model.effective,plan=model.staffing,staffingPending=model.provisional,labourPending=r.mode!=='5'&&!model.labourOrder,pending=staffingPending||labourPending,count=plan.count,b=staffingPending?{first:[],second:[],notes:['Breaks are pending until the required staffing and allocations are finalised.']}:breakData(r,model);
  byId('breakDatePick').value=r.date;byId('breakModeStatus').textContent=count+' nurse'+(count===1?'':'s');
  var absenceCount=changesFor(base.date).length,timing=model.timing,detail={date:r.date,formattedDate:fmt(r.date),nurseCount:count,absenceCount:absenceCount,pending:pending,pendingReason:staffingPending?'Complete the remaining staffing allocation.':'Review the Labour Ward allocation.',labourPending:labourPending,first:b.first.map(professionalName),second:b.second.map(professionalName),notes:b.notes,highlightedName:professionalName(myName()),firstDutyPeriod:timing.firstPeriodDisplay,secondDutyPeriod:timing.secondPeriod,dutyStartUtc:timing.startUtc,handoverUtc:timing.handoverUtc,dutyEndUtc:timing.endUtc,clockChange:clockChangeDetailFor(r.date),revision:model.revision,confirmed:model.confirmed};
  if(window.dispatchEvent&&typeof CustomEvent==='function')window.dispatchEvent(new CustomEvent('roster:breaks',{detail:detail}));
}

function renderRoster(){
  var q=(byId('search').value||'').toLowerCase(),f=byId('filter').value||'all';
  byId('range').innerHTML='<b>'+R.length+'</b> published nights • '+fmt(R[0].date)+' to '+fmt(R[R.length-1].date);
  var cards=[];
  R.forEach(function(original,i){
    var base=Object.assign({},original);base.mode=String(baseEstablishmentSize(base));
    var r=applyChanges(base),changes=changesFor(base.date),overtime=overtimeFor(base.date),plan=staffingPlan(base),count=plan.count,extras=additionalNurses(plan),liveCount=changes.length+overtime.length,labourPending=r.mode!=='5'&&!labourOrderFor(r),dutyTiming=nightDutyTiming(base.date);
    var status=planIsProvisional(base)?'Provisional • staffing decision required':labourPending?'Labour Ward order still required':liveCount?liveCount+' live staffing update'+(liveCount>1?'s':''):dutyTiming.isClockChange?'Clock change night • equal handover '+dutyTiming.handoverDisplay:'Standard calculated rotation';
    var displayMode=String(Math.max(5,Math.min(7,count)));
    if(!((f==='all'||displayMode===f)&&(JSON.stringify(base)+' '+JSON.stringify(r)+' '+JSON.stringify(changes)+' '+JSON.stringify(overtime)).toLowerCase().indexOf(q)>-1))return;
    var details=[{label:'First part',values:[professionalName(r.first1),professionalName(r.first2),dutyTiming.firstPeriodDisplay+(dutyTiming.isClockChange?' · '+formatDutyHours(dutyTiming.partHours)+' actual':'')],tone:'first'},{label:'Second part',values:[professionalName(r.second1),professionalName(r.second2),dutyTiming.secondPeriod+(dutyTiming.isClockChange?' · '+formatDutyHours(dutyTiming.partHours)+' actual':'')],tone:'second'}];
    if(count<5)details.push({label:'Status',values:['Additional overtime cover required'],tone:'warning'});
    else if(r.mode==='5')details.push({label:'Full-night Labour Ward / Pager',values:[professionalName(r.fullLW)],tone:'reliever'});
    else{var order=labourOrderFor(r)||{first:r.pager,second:r.reliever};details.push({label:'Pager',values:[professionalName(r.pager),labourAssignmentDetail(r.pager,order)],tone:'pager'});details.push({label:'Reliever',values:[professionalName(r.reliever),labourAssignmentDetail(r.reliever,order)],tone:'reliever'})}
    if(r.mode==='7')details.push({label:'Seventh nurse',values:[professionalName(r.seventh)]});
    if(extras.length)details.push({label:'Additional',values:extras.map(function(o){return o.nurse_name+' · as required'})});
    if(changes.length)details.push({label:'Absences',values:changes.map(function(c){return professionalName(c.absent_name)+' · '+(c.reason||'Unavailable')}),tone:'warning'});
    if(overtime.length)details.push({label:'Overtime',values:overtime.map(function(o){var allocated=plan.availableKeys.indexOf(o.allocation_key)>=0,extra=extras.some(function(x){return x.id===o.id});return o.nurse_name+' · '+(extra?'as required':allocated?allocationLabel(o.allocation_key):'allocation to decide')})});
    if(r.notes)details.push({label:'Notes',values:[r.notes]});cards.push({index:i,date:fmt(r.date),status:status,count:count,details:details});
  });
  if(window.dispatchEvent&&typeof CustomEvent==='function')window.dispatchEvent(new CustomEvent('roster:full-roster',{detail:{cards:cards}}));
}

function requireOnline(){
  if(!navigator.onLine||forcedOfflineSession){setSync('offline','Offline • saved information');toast('The shared roster is unavailable. Your entries remain on screen and can be saved after the connection returns.');return false}
  if(sharedWritesBlocked()){setSync('error',compatibilityNeedsUpdate()?'Update required':'Editing paused');toast(sharedWriteNotice());renderWriteGuardState();return false}
  return true;
}

function formMessage(id,message,state){
  var el=byId(id);if(!el)return;
  if(id==='allocationFormMessage'&&window.dispatchEvent&&typeof CustomEvent==='function'){
    if(el.dataset.reactReady!=='true')el.textContent=message||'';
    el.className='formMessage'+(state?' '+state:'');
    window.dispatchEvent(new CustomEvent('roster:changes-feedback',{detail:{message:message||'',state:state||''}}));
    return;
  }
  el.textContent=message||'';el.className='formMessage'+(state?' '+state:'');
}

function showButtonConfirmation(button,restoredLabel){if(!button)return;setTimeout(function(){if(!button.isConnected)return;button.classList.add('saveConfirmed');button.textContent='✓ Saved';setTimeout(function(){if(!button.isConnected)return;button.classList.remove('saveConfirmed');button.textContent=restoredLabel},1100)},0)}

function markInvalid(id,invalid){var el=byId(id);if(el)el.classList.toggle('fieldInvalid',!!invalid)}

function normaliseNurseName(value){
  var name=String(value||'').trim().replace(/\s+/g,' ');
  if(name&&name===name.toUpperCase()||name&&name===name.toLowerCase())name=name.toLowerCase().replace(/(^|[\s'-])([a-z])/g,function(_,prefix,letter){return prefix+letter.toUpperCase()});
  return name;
}

function timedRequest(request){
  return Promise.race([Promise.resolve(request),new Promise(function(_,reject){setTimeout(function(){reject(new Error('timeout'))},15000)})]);
}

function missingRpc(result){
  if(!result||!result.error)return false;
  var message=(result.error.message||'').toLowerCase();
  return result.error.code==='PGRST202'||message.indexOf('could not find the function')>=0||message.indexOf('function public.')>=0&&message.indexOf('does not exist')>=0;
}

function rpcError(result,messageId){
  if(!result||!result.error)return false;
  var message=(result.error.message||'').toLowerCase(),code=rosterErrorCode(result.error);
  setSync('error','Save failed');
  var compatibilityError=code==='CLIENT_UPDATE_REQUIRED'||code==='CLIENT_VERSION_BLOCKED'||code==='APP_MAINTENANCE';
  var notice=result.atomicRequired?'The database must be upgraded before this staffing change can be saved safely. No partial record was written.':code==='ROSTER_REVISION_CONFLICT'||code==='STALE_CLIENT'?conflictNotice(result):code==='CLIENT_UPDATE_REQUIRED'||code==='CLIENT_VERSION_BLOCKED'?'An important Night Roster update is required before shared changes can be made. You can still view the roster.':code==='APP_MAINTENANCE'?'Shared roster editing has been temporarily paused. You can still view the roster.':code==='PERMISSION_DENIED'||result.error.code==='42501'||message.indexOf('permission denied')>=0||message.indexOf('row-level security')>=0?'Your signed-in account does not currently have permission to save staffing changes.':code==='PLAN_INCOMPLETE'?'The latest night is not complete enough to save safely. Review the outstanding decisions first.':code==='STAFF_NOT_EFFECTIVE'?'One of the selected nurses is no longer available for this night. The latest roster has been loaded for review.':message.indexOf('duplicate')>=0||result.error.code==='23505'?'That nurse is already recorded for this night.':'The staffing change could not be saved. Try again, or copy diagnostics for the administrator.';
  if(compatibilityError)refreshCompatibilityState();
  formMessage(messageId,notice,'error');toast(notice);
  return true;
}

async function saveNightChange(){
  if(!requireOnline())return;
  var base=cur(),absent=byId('absentName').value,reason=byId('changeReason').value;
  if(!absent){markInvalid('absentName',true);formMessage('absenceFormMessage','Select the absent nurse before saving.','error');toast('Select the absent nurse first');byId('absentName').focus();return}
  markInvalid('absentName',false);formMessage('absenceFormMessage','Saving '+absent+'…','');
  setSync('saving','Saving absence');byId('saveChangeBtn').disabled=true;byId('saveChangeBtn').textContent='Saving…';
  try{
    var result=await runRosterMutation('absence:add:'+base.date+':'+canonicalNurseName(absent),function(commandId,expectedSyncRevision){return supa.rpc('record_night_absence_v49',{p_operation_id:commandId,p_expected_sync_revision:expectedSyncRevision,p_client_version:APP_VERSION,p_roster_date:base.date,p_absent_name:absent,p_reason:reason})},function(){return changesFor(base.date).some(function(entry){return sameNurse(entry.absent_name,absent)})});
    if(missingRpc(result))result={error:result.error,atomicRequired:true};
    if(rpcError(result,'absenceFormMessage'))return;
    byId('absentName').value='';editingAbsenceId=null;byId('cancelAbsenceEditBtn').classList.add('hidden');formMessage('absenceFormMessage',absent+' saved as absent.','success');
    try{await loadSharedData()}catch(refreshError){scheduleSharedReload()}notifyRosterUpdate('staffing',base.date);
    formMessage('absenceFormMessage',absent+' saved as absent.','success');highlightSavedItem('changeList',absent,'data-absence-name');showButtonConfirmation(byId('saveChangeBtn'),'Save absence');toast('Absence saved for '+absent,{label:'Undo',run:function(){return undoAddedAbsence(base.date,absent)}});
  }catch(error){setSync('error','Save failed');formMessage('absenceFormMessage','No response was received. Your selection is still here.','error');failedAction('Absence was not saved.',saveNightChange);}
  finally{byId('saveChangeBtn').textContent=editingAbsenceId?'Update absence':'Save absence';updateOfflineControls()}
}

function recordAlreadyRemoved(result){
  if(!result||!result.error)return false;
  var message=(result.error.message||'').toLowerCase();
  return message.indexOf('no longer exists')>=0||message.indexOf('not found')>=0;
}

async function undoAddedAbsence(date,name){var item=(nightChanges[date]||[]).find(function(entry){return sameNurse(entry.absent_name,name)});if(!item){toast('That absence has already changed');return}setSync('saving','Undoing absence');var base=baseForDate(date),result=await runRosterMutation('absence:undo-add:'+date+':'+item.id,function(commandId,expectedSyncRevision){return supa.rpc('remove_night_absence_v49',{p_operation_id:commandId,p_expected_sync_revision:expectedSyncRevision,p_client_version:APP_VERSION,p_change_id:item.id,p_allocation_key:allocationKeyForName(base,item.absent_name)})},function(){return !changesFor(date).some(function(entry){return String(entry.id)===String(item.id)})});if(missingRpc(result)){setSync('error','Undo unavailable');toast('Undo requires the current database version. The absence was not changed.');return}if(rpcError(result))return;await loadSharedData();notifyRosterUpdate('staffing',date);toast('Absence undone')}

async function undoRemovedAbsence(date,item){setSync('saving','Restoring absence');var result=await runRosterMutation('absence:undo-remove:'+date+':'+canonicalNurseName(item.absent_name),function(commandId,expectedSyncRevision){return supa.rpc('record_night_absence_v49',{p_operation_id:commandId,p_expected_sync_revision:expectedSyncRevision,p_client_version:APP_VERSION,p_roster_date:date,p_absent_name:item.absent_name,p_reason:item.reason||'Leave'})},function(){return changesFor(date).some(function(entry){return sameNurse(entry.absent_name,item.absent_name)})});if(missingRpc(result)){setSync('error','Undo unavailable');toast('Undo requires the current database version. The absence remains removed.');return}if(rpcError(result))return;await loadSharedData();notifyRosterUpdate('staffing',date);toast('Absence restored')}

async function undoAddedOvertime(date,name){var item=(nightOvertime[date]||[]).find(function(entry){return sameNurse(entry.nurse_name,name)});if(!item){toast('That overtime entry has already changed');return}setSync('saving','Undoing overtime');var result=await runRosterMutation('overtime:undo-add:'+date+':'+item.id,function(commandId,expectedSyncRevision){return supa.rpc('remove_night_overtime_v49',{p_operation_id:commandId,p_expected_sync_revision:expectedSyncRevision,p_client_version:APP_VERSION,p_overtime_id:item.id})},function(){return !overtimeFor(date).some(function(entry){return String(entry.id)===String(item.id)})});if(missingRpc(result)){setSync('error','Undo unavailable');toast('Undo requires the current database version. The overtime record was not changed.');return}if(rpcError(result))return;await loadSharedData();notifyRosterUpdate('staffing',date);toast('Overtime addition undone')}

async function undoRemovedOvertime(date,item){setSync('saving','Restoring overtime nurse');var result=await runRosterMutation('overtime:undo-remove:'+date+':'+canonicalNurseName(item.nurse_name),function(commandId,expectedSyncRevision){return supa.rpc('add_night_overtime_v49',{p_operation_id:commandId,p_expected_sync_revision:expectedSyncRevision,p_client_version:APP_VERSION,p_roster_date:date,p_nurse_name:item.nurse_name})},function(){return overtimeFor(date).some(function(entry){return sameNurse(entry.nurse_name,item.nurse_name)})});if(missingRpc(result)){setSync('error','Undo unavailable');toast('Undo requires the current database version. The overtime record remains removed.');return}if(rpcError(result))return;await loadSharedData();notifyRosterUpdate('staffing',date);toast('Overtime nurse restored')}

async function removeNightChange(id,button){
  if(!requireOnline())return;
  if(pendingRemovals[id])return;
  var base=cur(),item=changesFor(base.date).find(function(c){return c.id===id});
  if(!item||!confirm('Remove '+item.absent_name+' from the absence list for '+fmt(base.date)+'?'))return;
  pendingRemovals[id]=true;if(button){button.disabled=true;button.textContent='Removing…'}setSync('saving','Removing absence');
  try{
    var allocationKey=allocationKeyForName(base,item.absent_name);
    var result=await runRosterMutation('absence:remove:'+base.date+':'+id,function(commandId,expectedSyncRevision){return supa.rpc('remove_night_absence_v49',{p_operation_id:commandId,p_expected_sync_revision:expectedSyncRevision,p_client_version:APP_VERSION,p_change_id:id,p_allocation_key:allocationKey})},function(){return !changesFor(base.date).some(function(entry){return String(entry.id)===String(id)})});
    if(result&&result.error&&!recordAlreadyRemoved(result)){rpcError(result);return}
    await loadSharedData();if(!recordAlreadyRemoved(result))notifyRosterUpdate('staffing',base.date);if(recordAlreadyRemoved(result))toast('Absence was already removed and the list has been refreshed');else toast('Absence removed',{label:'Undo',run:function(){return undoRemovedAbsence(base.date,item)}});
  }catch(error){setSync('error','Remove failed');failedAction('The absence could not be removed.',function(){return removeNightChange(id,button)});}
  finally{delete pendingRemovals[id];if(button&&button.isConnected){button.disabled=false;button.textContent='Remove'}}
}

async function saveOvertime(){
  if(!requireOnline())return;
  var base=cur(),name=normaliseNurseName(byId('overtimeName').value);
  if(!name){markInvalid('overtimeName',true);formMessage('overtimeFormMessage','Type the overtime nurse\'s name before adding.','error');toast('Type the overtime nurse\'s name first');byId('overtimeName').focus();return}
  if(activeNames(base).some(function(n){return n.toLowerCase()===name.toLowerCase()})){formMessage('overtimeFormMessage',name+' is already rostered for this night.','error');toast(name+' is already assigned on this night');return}
  if(overtimeFor(base.date).some(function(o){return o.nurse_name.toLowerCase()===name.toLowerCase()})){formMessage('overtimeFormMessage',name+' is already on the overtime list.','error');toast(name+' is already listed for overtime');return}
  var similar=overtimeFor(base.date).find(function(o){var a=o.nurse_name.trim().toLowerCase(),b=name.toLowerCase();return a.indexOf(b+' ')===0||b.indexOf(a+' ')===0});
  if(similar&&!confirm(name+' may be the same person as '+similar.nurse_name+'. Add both names as separate overtime nurses?')){formMessage('overtimeFormMessage','Check the existing entry for '+similar.nurse_name+' before adding another name.','error');return}
  markInvalid('overtimeName',false);formMessage('overtimeFormMessage','Adding '+name+'…','');
  setSync('saving','Adding overtime nurse');byId('addOvertimeBtn').disabled=true;byId('addOvertimeBtn').textContent='Adding…';
  try{
    var result=await runRosterMutation('overtime:add:'+base.date+':'+canonicalNurseName(name),function(commandId,expectedSyncRevision){return supa.rpc('add_night_overtime_v49',{p_operation_id:commandId,p_expected_sync_revision:expectedSyncRevision,p_client_version:APP_VERSION,p_roster_date:base.date,p_nurse_name:name})},function(){return overtimeFor(base.date).some(function(entry){return sameNurse(entry.nurse_name,name)})});
    if(missingRpc(result))result={error:result.error,atomicRequired:true};
    if(rpcError(result,'overtimeFormMessage'))return;
    byId('overtimeName').value='';rememberOvertimeName(name);formMessage('overtimeFormMessage',name+' added for overtime.','success');
    try{await loadSharedData()}catch(refreshError){scheduleSharedReload()}notifyRosterUpdate('staffing',base.date);
    formMessage('overtimeFormMessage',name+' added for overtime.','success');highlightSavedItem('overtimeList',name,'data-overtime-name');showButtonConfirmation(byId('addOvertimeBtn'),'Add overtime');toast(name+' added for overtime',{label:'Undo',run:function(){return undoAddedOvertime(base.date,name)}});
  }catch(error){setSync('error','Save failed');formMessage('overtimeFormMessage','No response was received. The name remains here.','error');failedAction('Overtime nurse was not saved.',saveOvertime);}
  finally{byId('addOvertimeBtn').textContent='Add overtime';updateOfflineControls()}
}

async function removeOvertime(id,button){
  if(!requireOnline())return;
  if(pendingRemovals[id])return;
  var base=cur(),entry=overtimeFor(base.date).find(function(o){return o.id===id});
  if(!entry||!confirm('Remove '+entry.nurse_name+' from this night\'s overtime list?'))return;
  pendingRemovals[id]=true;if(button){button.disabled=true;button.textContent='Removing…'}setSync('saving','Removing overtime nurse');
  try{
    var result=await runRosterMutation('overtime:remove:'+base.date+':'+id,function(commandId,expectedSyncRevision){return supa.rpc('remove_night_overtime_v49',{p_operation_id:commandId,p_expected_sync_revision:expectedSyncRevision,p_client_version:APP_VERSION,p_overtime_id:id})},function(){return !overtimeFor(base.date).some(function(entry){return String(entry.id)===String(id)})});
    if(result&&result.error&&!recordAlreadyRemoved(result)){rpcError(result);return}
    await loadSharedData();if(!recordAlreadyRemoved(result))notifyRosterUpdate('staffing',base.date);if(recordAlreadyRemoved(result))toast(entry.nurse_name+' was already removed and the list has been refreshed');else toast(entry.nurse_name+' removed from overtime',{label:'Undo',run:function(){return undoRemovedOvertime(base.date,entry)}});
  }catch(error){setSync('error','Remove failed');failedAction('The overtime nurse could not be removed.',function(){return removeOvertime(id,button)});}
  finally{delete pendingRemovals[id];if(button&&button.isConnected){button.disabled=false;button.textContent='Remove'}}
}

async function saveFiveCover(){
  if(!requireOnline())return;
  var base=cur(),plan=staffingPlan(base),pick=byId('fiveCoverPick'),key=pick&&pick.value;
  if(!key||plan.coverageChoices.indexOf(key)<0){toast('Choose the allocation the reliever will cover');return}
  setSync('saving','Saving reliever allocation');
  var result=await runRosterMutation('five-cover:'+base.date+':'+key,function(commandId,expectedSyncRevision){return supa.rpc('apply_staffing_allocations_v49',{p_operation_id:commandId,p_expected_sync_revision:expectedSyncRevision,p_client_version:APP_VERSION,p_roster_date:base.date,p_action:'reliever',p_coverage_key:key,p_assignments:null,p_reliever_name:base.reliever})},function(){var stored=fiveCoverFor(base.date);return !!(stored&&stored.coverage_key===key)});
  if(rpcError(result))return;await loadSharedData();notifyRosterUpdate('allocation',base.date);toast(base.reliever+' saved before the overtime allocations');
}

function desiredAllocationsById(chosen){
  var desired={};Object.keys(chosen).forEach(function(key){desired[chosen[key]]=key});return desired;
}

async function readStoredAllocations(date,chosen){
  var result=await supa.from('night_overtime').select('id,allocation_key').eq('roster_date',date);
  if(result.error)return result;
  var desired=desiredAllocationsById(chosen),rows=result.data||[],selectedIds=Object.keys(desired);
  return{error:null,matches:selectedIds.every(function(id){return rows.some(function(row){return row.id===id})})&&rows.every(function(row){return(row.allocation_key||null)===(desired[row.id]||null)})};
}

async function saveFinalAllocationsV2510(event){
  if(event&&event.preventDefault)event.preventDefault();
  if(allocationSaveInFlight)return false;
  var button=byId('saveAllocationsBtn'),base,chosen={},used={},chosenCount=0,confirmationOnly=false;
  formMessage('allocationFormMessage','Preparing your allocations…','');
  try{
    if(!requireOnline()){formMessage('allocationFormMessage','Reconnect to the internet, then press Confirm and share again.','error');return false}
    base=cur();
    var currentPlan=staffingPlan(base);
    if(currentPlan.requiresSeventhDecision){formMessage('allocationFormMessage','Choose whether to use the seventh rotation or keep the permanent nurse in their original role.','error');toast('Complete the seventh-nurse decision first');var decisionCard=document.querySelector('.seventhDecisionCard');if(decisionCard)decisionCard.scrollIntoView({behavior:'smooth',block:'center'});return false}
    var selects=Array.prototype.slice.call(document.querySelectorAll('[data-final-allocation]'));
    for(var i=0;i<selects.length;i++){
      var key=selects[i].getAttribute('data-final-allocation'),id=selects[i].value;if(!id)continue;
      if(used[id]){formMessage('allocationFormMessage','Choose a different nurse for each allocation.','error');toast('The same overtime nurse cannot be placed in two allocations');return false}used[id]=true;chosen[key]=id;
    }
    chosenCount=Object.keys(chosen).length;
    confirmationOnly=!chosenCount&&currentPlan.coreComplete&&!currentPlan.requiresCoverageChoice&&!currentPlan.requiresSeventhDecision&&!currentPlan.unresolved.length;
    if(!chosenCount&&!confirmationOnly){formMessage('allocationFormMessage','Complete the remaining allocation decisions before confirming the plan.','error');toast('The plan is not ready to confirm');return false}
    allocationSaveInFlight=true;setSync('saving','Saving this night\'s allocations');button.disabled=true;button.textContent='Saving…';formMessage('allocationFormMessage','Saving '+chosenCount+' allocation'+(chosenCount===1?'':'s')+'…','');
    var expectedRevision=nightPlanStatuses[base.date]?Number(nightPlanStatuses[base.date].revision||0):0;
    var atomicResult=await runRosterMutation('plan:finalise:'+base.date+':'+expectedRevision,function(commandId,expectedSyncRevision){return supa.rpc('finalise_night_plan_v49',{p_operation_id:commandId,p_expected_sync_revision:expectedSyncRevision,p_client_version:APP_VERSION,p_roster_date:base.date,p_assignments:chosenCount?chosen:{},p_labour_first:null,p_labour_second:null,p_expected_revision:expectedRevision})},function(){var status=nightPlanStatuses[base.date],savedPlan=staffingPlan(baseForDate(base.date)),matches=Object.keys(chosen).every(function(key){return savedPlan.validAssignments.some(function(item){return item.allocation_key===key&&String(item.id)===String(chosen[key])})});return !!(status&&status.published_at&&Number(status.revision||0)>expectedRevision&&matches)});
    if(!missingRpc(atomicResult)){
      if(atomicResult&&atomicResult.error&&(rosterErrorCode(atomicResult.error)==='ROSTER_REVISION_CONFLICT'||/changed on another device|revision conflict|ROSTER_REVISION_CONFLICT/i.test(atomicResult.error.message||''))){var conflictMessage=conflictNotice(atomicResult);formMessage('allocationFormMessage',conflictMessage,'error');toast('A newer plan was loaded for review');await loadSharedData();return false}
      if(rpcError(atomicResult,'allocationFormMessage'))return false;
    }else if(confirmationOnly){formMessage('allocationFormMessage','The final confirmation service is unavailable. Ask the administrator to run the V26 database upgrade.','error');toast('Plan confirmation is unavailable');return false
    }else if(chosenCount){
      var result=await runRosterMutation('plan:legacy-allocations:'+base.date,function(commandId,expectedSyncRevision){return supa.rpc('apply_staffing_allocations_v49',{p_operation_id:commandId,p_expected_sync_revision:expectedSyncRevision,p_client_version:APP_VERSION,p_roster_date:base.date,p_action:'allocations',p_coverage_key:null,p_assignments:chosen,p_reliever_name:base.reliever})},function(){var savedPlan=staffingPlan(baseForDate(base.date));return Object.keys(chosen).every(function(key){return savedPlan.validAssignments.some(function(item){return item.allocation_key===key&&String(item.id)===String(chosen[key])})})});
      if(missingRpc(result)){formMessage('allocationFormMessage','The allocation service is unavailable. Ask the administrator to apply database schema 35. Nothing was changed.','error');toast('Allocation service requires a database update');return false}
      if(rpcError(result,'allocationFormMessage'))return false;
      var check=await timedRequest(readStoredAllocations(base.date,chosen));
      if(check.error){rpcError(check,'allocationFormMessage');return false}
      if(!check.matches){formMessage('allocationFormMessage','The database did not retain every selected allocation. Reload the latest plan and try again.','error');toast('Allocations need to be reviewed again');await loadSharedData();return false}
    }
    delete allocationDrafts[base.date];delete labourOrderDrafts[base.date];delete seventhDecisionDrafts[base.date];await loadSharedData();notifyRosterUpdate('allocation',base.date);var plan=staffingPlan(baseForDate(base.date)),saved=chosenCount-plan.unresolved.filter(function(key){return Object.prototype.hasOwnProperty.call(chosen,key)}).length;
    var success=plan.unresolved.length?(saved?saved+' allocation'+(saved===1?'':'s')+' saved':'No allocation saved')+' • '+plan.unresolved.length+' still to decide':confirmationOnly?'This night\'s plan confirmed for everyone':additionalNurses(plan).length?'Core plan published; additional staff remain as required':'This night\'s plan published for everyone';
    formMessage('allocationFormMessage',success,'success');showButtonConfirmation(button,'Confirm and share changes');toast(success);return false;
  }catch(error){setSync('error','Save failed');formMessage('allocationFormMessage','Save stopped: '+(error&&error.message==='timeout'?'the connection timed out. Your selections are still here.':'the allocations could not be confirmed. Your selections are still here.'),'error');failedAction('The allocations could not be saved.',function(){return saveFinalAllocationsV2510()});return false}
  finally{allocationSaveInFlight=false;if(button&&button.isConnected){button.disabled=false;button.textContent='Confirm and share changes'}updateOfflineControls()}
}

async function loadNightHistory(date,renderAfter,append){
  if(!date||historyLoadingDates[date])return;
  historyLoadingDates[date]=true;
  try{
    if(Number(schemaVersion||0)>=50){
      var cursor=append&&historyPageState[date]?historyPageState[date]:{},page=await supa.rpc('night_history_page_v50',{p_roster_date:date,p_before_at:cursor.next_before_at||null,p_before_id:cursor.next_before_id||null,p_limit:50});
      if(page.error)return;
      var data=page.data||{},items=Array.isArray(data.items)?data.items:[],changes=[],overtime=[],roles=[];
      items.forEach(function(item){var payload=item&&item.payload;if(!plainSnapshotRecord(payload))return;if(item.source==='absence')changes.push(payload);else if(item.source==='overtime')overtime.push(payload);else if(item.source==='roles')roles.push(payload)});
      if(append){changeHistory[date]=(changeHistory[date]||[]).concat(changes);overtimeHistory[date]=(overtimeHistory[date]||[]).concat(overtime);roleOverrideHistory[date]=(roleOverrideHistory[date]||[]).concat(roles)}
      else{changeHistory[date]=changes;overtimeHistory[date]=overtime;roleOverrideHistory[date]=roles}
      historyPageState[date]={has_more:!!data.has_more,next_before_at:data.next_before_at||null,next_before_id:data.next_before_id||null};
    }else{
      var results=await Promise.all([supa.from('night_change_history').select('*').eq('roster_date',date).order('changed_at',{ascending:false}).limit(50),supa.from('night_overtime_history').select('*').eq('roster_date',date).order('changed_at',{ascending:false}).limit(50),nightRoleOverrideAvailable?supa.from('night_role_override_history').select('*').eq('roster_date',date).order('changed_at',{ascending:false}).limit(50):Promise.resolve({data:[],error:null})]);
      if(results.some(function(x){return x.error}))return;
      changeHistory[date]=results[0].data||[];overtimeHistory[date]=results[1].data||[];roleOverrideHistory[date]=results[2].data||[];historyPageState[date]={has_more:false,next_before_at:null,next_before_id:null};
    }
    historyLoadedDates[date]=true;
    if(renderAfter!==false&&currentUserProfile&&cur().date===date){renderRecentActivity(date);renderChanges(cur())}
  }finally{delete historyLoadingDates[date]}
}

function ensureNightHistory(date){if(!historyLoadedDates[date])loadNightHistory(date,true,false)}
function loadMoreNightHistory(date){if(historyPageState[date]&&historyPageState[date].has_more)return loadNightHistory(date,true,true)}

