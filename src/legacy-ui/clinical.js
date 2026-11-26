function prepareChangesView(){
  if(changesViewPrepared)return;
  var required=['today','changes','breaks','roster','changesStaffingPane','changesAllocationPane','changesConfirmPane','assignmentSheet','closeAssignmentSheet','personalNightCard','nightStatusRow'];
  if(required.some(function(id){return !byId(id)}))return;
  document.body.setAttribute('data-view','today');
  ['datePick','changesDatePick','breakDatePick'].forEach(enhanceDatePicker);
  byId('viewRosterBtn').onclick=function(){show('roster')};
  byId('closeRosterBtn').onclick=function(){show('today')};
  byId('smartNightBtn').onclick=goToAutomaticNight;
  byId('changesSmartNightBtn').onclick=goToAutomaticNight;
  byId('closeNamePickerBtn').onclick=function(){byId('personalNamePicker').classList.add('hidden')};
  byId('continueToAllocationBtn').onclick=function(){setChangesStep('allocation',true)};
  byId('saveCoverAllocationsBtn').onclick=saveFinalAllocationsV2510;
  byId('closeAssignmentSheet').onclick=function(){byId('assignmentSheet').close()};
  byId('assignmentSheet').onclose=function(){if(document.body.getAttribute('data-view')==='changes')byId('continueToAllocationBtn').focus({preventScroll:true})};
  window.addEventListener('roster:viewchange',function(event){var sheet=byId('assignmentSheet');if(sheet&&sheet.open&&event.detail.view!=='changes')sheet.close()});
  byId('changesInfoBtn').onclick=function(){openScreenInfo('changes')};
  byId('breaksInfoBtn').onclick=function(){openScreenInfo('breaks')};
  window.addEventListener('roster:changes-step-request',function(event){var step=event&&event.detail&&event.detail.step;if(['staffing','allocation','confirm'].indexOf(step)>=0)setChangesStep(step,true)});
  changesViewPrepared=true;renderDiagnostics();
}
function openScreenInfo(kind){
  var dialog=byId('screenInfoSheet'),title=byId('screenInfoTitle'),intro=byId('screenInfoIntro'),content=byId('screenInfoContent');if(!dialog||!title||!intro||!content)return;
  var items=kind==='breaks'?[['What you see','The break plan always follows the selected night and its latest shared staffing.'],['What happens automatically','Changes to absences, overtime or roles update Night and Breaks together.'],['When the plan is provisional','Breaks cannot be finalised until every required staffing decision is complete.']]:[['Record staffing','Use Add absence or Add overtime for the selected night.'],['Allocation is usually automatic','A standard five-person night has one full-night Pager. At six, Pager works First Part and Reliever works Second Part in Labour Ward.'],['Confirm only changes','A final review is needed only after a staffing change or an agreed night-only role change.']];
  title.textContent=kind==='breaks'?'About Breaks':'About Staffing changes';intro.textContent=kind==='breaks'?'A live view of the selected night’s breaks.':'Record people, resolve any missing role and review the updated plan.';if(typeof window.renderReactScreenInfo==='function')window.renderReactScreenInfo(items);else content.innerHTML=items.map(function(item){return'<section class="infoSheetItem"><h3>'+esc(item[0])+'</h3><p>'+esc(item[1])+'</p></section>'}).join('');if(!dialog.open)dialog.showModal();if(typeof window.CustomEvent==='function')window.dispatchEvent(new CustomEvent('roster:screeninfo',{detail:{items:items}}));
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
function performQuickAction(action){
  var dialog=byId('quickActionsSheet');if(dialog&&dialog.open)dialog.close();
  if(action==='breaks'){show('breaks');return}
  if(action==='absence'||action==='overtime'||action==='review'){
    show('changes');
    if(action==='absence'||action==='overtime')window.setTimeout(function(){window.dispatchEvent(new CustomEvent('roster:open-staffing',{detail:{mode:action}}))},120);
    return;
  }
  if(action==='private-chat'){
    show('chat');if(typeof window.openChatView==='function')window.openChatView();
    window.setTimeout(function(){var button=byId('chatNewPrivateBtn');if(button)button.click()},120);return;
  }
  if(action==='night-plan'){showNightPlanSummary();return}
  if(action==='share'){showShareApp();return}
}
window.showQuickActions=showQuickActions;
window.performQuickAction=performQuickAction;

var THREE_WAY_PAGER_KEYS=['pager','reliever','seventh'];

function threeWayPagerNames(r){
  return THREE_WAY_PAGER_KEYS.map(function(key){
    return (r.pendingAllocations||[]).indexOf(key)>=0?'Unassigned':r[key];
  });
}

var THREE_WAY_PAGER_GUIDANCE='Coordinate breaks with Pager cover';

function threeWayPagerPeriods(date){
  var timing=nightDutyTiming(date),start=maltaLocalTimestamp(date,23,30),turnLength=(timing.endUtc-start)/3;
  function label(timestamp){
    var clock=maltaTimePartsAt(timestamp),time=String(clock.hour).padStart(2,'0')+':'+String(clock.minute).padStart(2,'0');
    if(timing.direction==='back'){
      var repeated=(timing.startOffset-timing.endOffset)*60000,elapsed=timestamp-timing.transitionUtc;
      if(elapsed>=-repeated&&elapsed<repeated)time+=elapsed<0?' (before clock change)':' (after clock change)';
    }
    return time;
  }
  var bounds=[start,start+turnLength,start+2*turnLength,timing.endUtc].map(label);
  return THREE_WAY_PAGER_KEYS.map(function(_,index){return bounds[index]+'–'+bounds[index+1]});
}

function threeWayPagerLines(r){
  var periods=threeWayPagerPeriods(r.date);
  return threeWayPagerNames(r).map(function(name,index){return professionalName(name)+' · '+periods[index]});
}

var PAGER_TOMBOLA_REASON='Pager tombola draw';

function pagerTombolaModel(base,plan,r){
  if(!nightRoleOverrideAvailable||plan.count!==7||!r.sharedPagerThree||!plan.complete)return null;
  var assignments={mode:'7'};
  SEVEN_NIGHT_ROLE_KEYS.forEach(function(key){assignments[key]=r[key]});
  if(!validRoleAssignmentsForNight(base,assignments))return null;
  var stored=nightRoleOverrides[base.date];
  return {
    date:base.date,
    names:threeWayPagerNames(r),
    labels:threeWayPagerNames(r).map(professionalName),
    periods:threeWayPagerPeriods(base.date),
    saved:!!(stored&&stored.reason===PAGER_TOMBOLA_REASON&&stored.assignments&&stored.assignments.mode==='7'&&SEVEN_NIGHT_ROLE_KEYS.every(function(key){return sameNurse(stored.assignments[key],assignments[key])})),
    canDraw:!!(navigator.onLine&&!forcedOfflineSession&&!sharedWritesBlocked())
  };
}

function shufflePagerTeam(names){
  var order=names.slice(),sample=new Uint32Array(1);
  for(var i=order.length-1;i>0;i--){
    var bound=i+1,limit=4294967296-4294967296%bound;
    do{window.crypto.getRandomValues(sample)}while(sample[0]>=limit);
    var j=sample[0]%bound,previous=order[i];order[i]=order[j];order[j]=previous;
  }
  return order;
}

var pagerDrawInFlight={};
async function drawPagerTurns(date){
  var base=cur();
  if(!base||base.date!==date||!requireOnline())return{error:'Open the current roster and try again.'};
  if(pagerDrawInFlight[date])return{error:'A Pager draw is already in progress.'};
  var plan=staffingPlan(base),effectivePlan=applyChanges(base),model=pagerTombolaModel(base,plan,effectivePlan);
  if(!model)return{error:'Save the seven-nurse allocations before drawing the Pager turns.'};
  if(model.saved)return{order:model.names};
  var assignments={mode:'7'};
  var shuffled=shufflePagerTeam(model.names);
  SEVEN_NIGHT_ROLE_KEYS.forEach(function(key){assignments[key]=effectivePlan[key]});
  THREE_WAY_PAGER_KEYS.forEach(function(key,index){assignments[key]=shuffled[index]});
  pagerDrawInFlight[date]=true;
  function storedDraw(){
    var entry=nightRoleOverrides[date];
    return !!(entry&&entry.reason===PAGER_TOMBOLA_REASON&&entry.assignments&&SEVEN_NIGHT_ROLE_KEYS.every(function(key){return sameNurse(entry.assignments[key],assignments[key])}));
  }
  try{
    var result=await runRosterMutation('roles:pager-draw:'+date,function(operationId,revision){
      return supa.rpc('apply_night_role_override_v57',{
        p_operation_id:operationId,p_expected_sync_revision:revision,p_client_version:APP_VERSION,p_roster_date:date,
        p_action:'save',p_assignments:assignments,p_override_reason:PAGER_TOMBOLA_REASON,p_history_reason:PAGER_TOMBOLA_REASON
      });
    },storedDraw,true);
    var conflict=result&&result.error&&(result.error.code==='ROSTER_REVISION_CONFLICT'||String(result.error.message||'').indexOf('ROSTER_REVISION_CONFLICT')>=0);
    if(result&&result.error&&!conflict)return{error:'The roster could not confirm the Pager draw. Try again.'};
    if(!await loadSharedData({background:true})||forcedOfflineSession)return{error:'Refresh the roster to check whether the draw was saved.'};
    var refreshedBase=baseForDate(date),refreshed=pagerTombolaModel(refreshedBase,staffingPlan(refreshedBase),applyChanges(refreshedBase));
    if(!refreshed||!refreshed.saved||!sameNightNameSet(refreshed.names,model.names))
      return{error:'The staffing plan changed. Review the latest roster before drawing again.'};
    if(!conflict){delete nightRoleOverrideDrafts[date];render();notifyRosterUpdate('roles',date);}
    return{order:refreshed.names};
  }catch(error){
    return{error:'Refresh the roster to check whether the draw was saved.'};
  }finally{
    delete pagerDrawInFlight[date];
  }
}
window.drawPagerTurns=drawPagerTurns;

function selectedNightSummary(date){
  var model=buildNightPlan(baseForDate(date)),r=model.effective,t=model.timing,lines=['Anaesthetic Night Roster · '+fmt(date),(model.provisional||model.labourPending?'PROVISIONAL':workflowNeedsConfirmation(model.base,model.tasks.length)?'Changes awaiting review':'Saved roster')+' · '+model.staffing.count+' present'];
  ['first','second'].forEach(function(part){lines.push((part==='first'?'First Part':'Second Part')+': '+professionalName(r[part+'1'])+' + '+professionalName(r[part+'2'])+' · '+(part==='first'?t.firstPeriodDisplay:t.secondPeriod))});
  if(model.staffing.count===4)lines.push(window.sharedPagerSummary?window.sharedPagerSummary(date):'Shared Pager order not loaded.');
  else if(r.mode==='5')lines.push('Full-night Pager: '+professionalName(r.fullLW)+' · 00:00–07:00');
  else if(r.sharedPagerThree){lines.push('Shared Labour Ward / Pager:');lines=lines.concat(threeWayPagerLines(r));}
  else if(model.labourOrder){
    lines.push('Pager turn 1: '+professionalName(model.labourOrder.first_part_name)+' · '+t.firstPeriodDisplay);
    lines.push('Pager turn 2: '+professionalName(model.labourOrder.second_part_name)+' · '+t.secondPeriod);
  }
  else if(usesAgreedPagerOrder(date,model.staffing.count))lines.push('Shared Pager: '+professionalNames(r.pager+' + '+r.reliever)+' · Parts to agree');
  else{lines.push('Pager: '+professionalName(r.pager));lines.push('Reliever: '+professionalName(r.reliever))}
  var b=breakData(r,model);if(!model.provisional){lines.push('First break: '+b.first.map(professionalName).join(', '));lines.push('Second break: '+b.second.map(professionalName).join(', '))}
  changesFor(date).forEach(function(c){lines.push('Absent: '+professionalName(c.absent_name))});
  if(model.provisional)lines.push('Below normal staffing or unresolved allocations. Breaks and handovers require clinical coordination.');
  return lines.join('\n');
}
function showNightPlanSummary(){
  var date=cur().date,dialog=byId('nightPlanSummaryDialog');
  if(!dialog){dialog=document.createElement('dialog');dialog.id='nightPlanSummaryDialog';dialog.className='appDialog nightPlanSummaryDialog';dialog.setAttribute('aria-labelledby','nightPlanSummaryTitle');document.body.appendChild(dialog)}
  dialog.innerHTML='<div class="dialogHeader"><h2 id="nightPlanSummaryTitle">This night’s plan</h2><button type="button" data-close aria-label="Close night plan">Close</button></div><p>Review the selected night before copying or opening your email app.</p><pre></pre><div class="nightPlanSummaryActions"><button type="button" class="primary" data-copy>Copy plan</button><button type="button" class="soft" data-email>Email plan</button></div><p role="status" data-status></p>';
  dialog.querySelector('pre').textContent=selectedNightSummary(date);
  dialog.querySelector('[data-close]').onclick=function(){dialog.close()};
  dialog.querySelector('[data-copy]').onclick=async function(){try{await navigator.clipboard.writeText(selectedNightSummary(date));dialog.querySelector('[data-status]').textContent='Plan copied.'}catch(error){dialog.querySelector('[data-status]').textContent='Copy is unavailable. Select the plan text above.'}};
  dialog.querySelector('[data-email]').onclick=function(){location.href='mailto:?subject='+encodeURIComponent('Night Roster · '+fmt(date))+'&body='+encodeURIComponent(selectedNightSummary(date));dialog.querySelector('[data-status]').textContent='Opening your email app. Review recipients before sending.'};
  dialog.showModal();
}

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

function setChangesStep(step,scroll){
  var sheet=byId('assignmentSheet');
  if(step!=='staffing'&&sheet&&!sheet.open){
    sheet.showModal();
  }
  if(step==='staffing'&&sheet&&sheet.open)sheet.close();
  if(!scroll)return;
  var target=byId(step==='allocation'?'changesAllocationPane':step==='confirm'?'changesConfirmPane':'changesStaffingPane');
  if(!target)return;
  if(target.scrollIntoView)target.scrollIntoView({block:'start'});
  if(target.focus)target.focus({preventScroll:true});
}

function workflowTaskCount(base,plan,r){
  return workflowTaskDetails(base,plan).length;
}


function localChangesDraftParts(base){
  base=base||cur();var date=base.date,parts=[],draft=allocationDrafts[date]||{};
  if(Object.keys(draft).some(function(key){return String(draft[key]||'').trim().length>0}))parts.push('allocation selections');
  if(labourOrderDrafts[date]&&!labourOrderDrafts[date].automatic)parts.push('Pager parts');
  if(seventhDecisionDrafts[date])parts.push('seventh-nurse choice');
  if(nightRoleOverrideDrafts[date])parts.push('night-only roles');
  if(window.sharedPagerDraftDates&&window.sharedPagerDraftDates().indexOf(date)>=0)parts.push('shared Pager order');
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
  if(!R.length)return[];var currentDate=cur().date,dates=[currentDate].concat(window.sharedPagerDraftDates?window.sharedPagerDraftDates():[]);
  [allocationDrafts,labourOrderDrafts,seventhDecisionDrafts,nightRoleOverrideDrafts].forEach(function(map){Object.keys(map||{}).forEach(function(date){if(dates.indexOf(date)<0)dates.push(date)})});
  var parts=[];dates.forEach(function(date){var base=R.find(function(item){return item.date===date});if(!base)return;localChangesDraftParts(base).forEach(function(part){parts.push({date:date,part:part})})});return parts;
}

function protectLocalChangesDraft(event){
  if(!currentUserProfile||!allLocalChangesDraftParts().length)return;
  event.preventDefault();event.returnValue='';
}

function fourNurseTheatreRoles(base){
  if(nightWorkingNames(base).length!==4)return null;
  var stored=nightRoleOverrides[base.date],a=stored&&stored.assignments;
  if(a&&a.mode==='4'&&validRoleAssignmentsForNight(base,a))return a;
  var raw=rawBaseForDate(base.date),working=nightWorkingNames(base);
  return FOUR_NIGHT_ROLE_KEYS.every(function(key){return working.some(function(name){return sameNurse(name,raw[key])})})?Object.assign({mode:'4'},raw):null;
}

function staffingCalculation(base,plan){
  var rostered=baseEstablishmentSize(base),absent=plan.absentKeys.length,overtime=plan.overtime.length;
  var replacements=plan.count-rostered+absent-overtime;
  if(!absent&&!overtime&&!replacements)return '';
  return rostered+' rostered'+(absent?' − '+absent+' absent':'')+(replacements?' + '+replacements+' replacement cover':'')+(overtime?' + '+overtime+' overtime':'')+' = '+plan.count+' working';
}

function canGroupPagerCover(plan){
  return plan.sharedPagerThree&&plan.count===7&&plan.availableKeys.some(isSharedPagerSlot)&&plan.overtime.length===plan.availableKeys.length;
}

function selectedCoverAssignments(base,plan){
  var assignments={},used=new Set(),missing=[],groupPager=canGroupPagerCover(plan);
  var valid=new Set(plan.overtime.map(function(entry){return String(entry.id)}));
  var keys=groupPager?plan.availableKeys.filter(function(key){return !isSharedPagerSlot(key)}).concat(plan.availableKeys.filter(isSharedPagerSlot)):plan.availableKeys;
  keys.forEach(function(key){
    var id=String(selectedAllocationId(base,key,plan)||'');
    if(!id||!valid.has(id)||used.has(id)){missing.push(key);return}
    used.add(id);assignments[key]=id;
  });
  if(groupPager&&missing.every(isSharedPagerSlot)){
    var remaining=Array.from(valid).filter(function(id){return !used.has(id)});
    if(remaining.length===missing.length){
      missing.forEach(function(key,index){assignments[key]=remaining[index]});
      missing=[];
    }
  }
  return{assignments:assignments,missing:missing};
}

/* Presentation of the exact selections used by the guarded allocation save. */
function sevenNurseAssignmentReview(base,plan){
  if(!plan.sharedPagerThree||plan.count!==7)return null;
  var selection=selectedCoverAssignments(base,plan),preview=applyChanges(base),timing=nightDutyTiming(base.date),working=nightWorkingNames(base);
  function displayName(name){return name&&working.some(function(active){return sameNurse(active,name)})?professionalName(name):''}
  if(!plan.complete)Object.keys(selection.assignments).forEach(function(key){var nurse=plan.overtime.find(function(item){return String(item.id)===String(selection.assignments[key])});if(nurse)preview[key]=nurse.nurse_name});
  var theatre=['first1','first2','second1','second2'].map(function(key){return{key:key,label:allocationLabel(key),name:displayName(preview[key]),period:key.indexOf('first')===0?timing.firstPeriodDisplay:timing.secondPeriod}});
  var pager=THREE_WAY_PAGER_KEYS.map(function(key){return displayName(preview[key])}).filter(Boolean);
  var tombola=pagerTombolaModel(base,plan,applyChanges(base));
  return{date:base.date,ready:!selection.missing.length&&!plan.requiresCoverageChoice&&!plan.requiresSeventhDecision,saved:plan.complete,drawSaved:!!(tombola&&tombola.saved),theatre:theatre,pager:pager,periods:threeWayPagerPeriods(base.date)};
}
function refreshSevenNurseAssignmentReview(base,plan){
  if(typeof CustomEvent==='function')window.dispatchEvent(new CustomEvent('roster:allocation-review',{detail:{date:base.date,review:sevenNurseAssignmentReview(base,plan)}}));
}
function openPagerDrawForNight(date){
  if(cur().date!==date)return;
  var sheet=byId('assignmentSheet');if(sheet&&sheet.open)sheet.close();
  show('today');var attempts=0,owner=currentUser;
  function openWhenMounted(){
    if(cur().date!==date||currentUser!==owner||document.body.classList.contains('authPending')||document.body.getAttribute('data-view')!=='today')return;
    var launcher=document.querySelector('.pagerDrawLauncher[data-pager-draw-date="'+date+'"]');
    if(launcher){launcher.click();return}
    if(++attempts<20)window.setTimeout(openWhenMounted,100);else toast('Assignments saved. Open Draw Pager times on Night to continue.');
  }
  openWhenMounted();
}

function workflowTaskDetails(base,plan){
  var tasks=[];
  if(plan.count===4)return fourNurseTheatreRoles(base)?[]:['Choose and save the four theatre positions'];
  if(plan.requiresCoverageChoice)tasks.push('Choose the theatre role the rostered Reliever will cover');
  if(plan.requiresSeventhDecision)tasks.push('Choose whether '+professionalName(plan.seventhNurse)+' moves from '+allocationLabel(plan.seventhVacatedKey)+' to Seventh nurse');
  selectedCoverAssignments(base,plan).missing.filter(function(key){return !canGroupPagerCover(plan)||!isSharedPagerSlot(key)}).forEach(function(key){tasks.push('Choose a nurse for '+(sixNurseAllocationCopy(key,plan,base.date)||{label:allocationLabel(key,plan.sharedPagerThree)}).label)});
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
  if(staffingPlan(base).count<5)return false;
  if(decisionTasks)return true;
  return workflowHasManualPlan(base)&&planNeedsConfirmation(base,0);
}

function updateChangesWorkflow(base,plan){
  if(!changesViewPrepared)return;
  var four=plan.count===4,taskDetails=workflowTaskDetails(base,plan),tasks=taskDetails.length;
  var pager=four&&window.sharedPagerStatus&&window.sharedPagerStatus(base.date),fourPending=four&&(!fourNurseTheatreRoles(base)||!pager||!pager.saved);
  var pagerForm=pagerOrderForm(base,plan),pagerRequired=usesAgreedPagerOrder(base.date,plan.count)&&(!pagerForm||pagerForm.needsSave);
  var needsShare=pagerRequired||workflowNeedsConfirmation(base,tasks),coverPending=plan.unresolved.length>0,canShare=needsShare&&!tasks&&!coverPending&&!pagerRequired;
  var sevenReview=sevenNurseAssignmentReview(base,plan),sevenNext=!!(sevenReview&&!sevenReview.drawSaved);
  var published=nightPlanStatuses[base.date];
  var shared=!four&&!needsShare&&!!(published&&published.published_at&&workflowHasManualPlan(base));
  byId('changes').classList.toggle('fourNurseWorkflow',four);
  var calculation=byId('changesStaffingCalculation'),calculationText=staffingCalculation(base,plan);
  calculation.textContent=calculationText;calculation.hidden=!calculationText;
  byId('changesWorkflowExperience').hidden=false;
  byId('changesWorkflowState').textContent=nightRoleOverrideDrafts[base.date]?'Unsaved assignment changes':sevenNext?(sevenReview.saved?'Assignments saved · Pager times to draw':sevenReview.ready?'Review the 7 assignments':'Choose theatre cover') :four?'Four nurses · provisional cover':plan.count<5?'Extra cover needed':tasks?tasks+' '+(tasks===1?'role':'roles')+' to assign':pagerRequired?'Agree Pager parts':coverPending?'Cover ready to save':canShare?'Ready to save':'Current team · edit for this night';
  byId('continueToAllocationBtn').hidden=false;
  byId('nightRoleOverrideStep').hidden=!four&&!plan.complete;
  var badge=byId('changesTaskBadge'),badgeCount=tasks||(fourPending||canShare||coverPending||sevenNext?1:0);
  badge.textContent=badgeCount;badge.classList.toggle('hidden',!badgeCount);
  var quickAttention=byId('quickActionAttention');if(quickAttention)quickAttention.classList.add('hidden');
  var allocationSection=document.querySelector('#changes .allocationSection');
  if(allocationSection)allocationSection.hidden=four||!(plan.requiresCoverageChoice||plan.requiresSeventhDecision||plan.availableKeys.length||pagerForm||sevenReview);
  byId('coverAssignmentsHeading').textContent=sevenReview?'Tonight’s team':coverPending||tasks?'Choose cover':pagerForm?'Agree Pager parts':'Assignments';
  if(!allocationSaveInFlight)byId('saveCoverAllocationsBtn').textContent='Save assignments';
  byId('allocationSummary').hidden=four;
  var reason=byId('continueToConfirmReason');
  reason.classList.toggle('hidden',plan.count>=5);
  reason.textContent=four?'This four-person arrangement stays provisional.':plan.count<4?'Add overtime in Changes before assigning the theatre positions. This night remains provisional.':'';
  var card=document.querySelector('#changesConfirmPane .confirmationCard'),status=byId('confirmationStatus');
  if(card)card.hidden=!canShare||sevenNext;
  if(status){
    status.classList.toggle('hidden',!shared);
    status.classList.toggle('isShared',shared);
    status.textContent=shared?'Plan shared':'';
  }
  if(!canShare&&!allocationSaveInFlight&&!usesAgreedPagerOrder(base.date,plan.count))formMessage('allocationFormMessage','');
  renderConfirmationPreview(base,plan,0,canShare,'');
  renderPagerOrderForm(base,plan);refreshSevenNurseAssignmentReview(base,plan);
  updateConfirmationControls(canShare,tasks,coverPending&&plan.count>=5||pagerRequired&&!!pagerForm,pagerRequired&&(!pagerForm||!pagerForm.first));
}

function confirmationRow(label,value,detail){return'<div class="confirmationRow"><div><span>'+esc(label)+'</span>'+(detail?'<small>'+esc(detail)+'</small>':'')+'</div><b>'+esc(value||'To decide')+'</b></div>'}

function confirmationChangeRow(label,before,after,detail){return'<div class="confirmationChangeRow"><div><span>'+esc(label)+'</span>'+(detail?'<small>'+esc(detail)+'</small>':'')+'</div><div class="confirmationChangeValues"><del>'+esc(before||'Not assigned')+'</del><i aria-hidden="true">→</i><ins>'+esc(after||'Not assigned')+'</ins></div></div>'}
function confirmationPlanItem(label,value,detail){return{label:label,value:value?professionalNames(value):'To decide',detail:detail||''}}
function confirmationChangeItem(label,before,after,detail){return{label:label,before:professionalNames(before)||'Not assigned',after:professionalNames(after)||'Not assigned',detail:detail||''}}

function labourAssignmentDetail(name,order,timing){
  if(!order)return'Labour Ward part pending';
  var first=order.first||order.first_part_name;
  var firstPart=sameNurse(first,name);
  var period=timing?(firstPart?timing.firstPeriodDisplay:timing.secondPeriod)+' · ':'';
  return period+(firstPart?'Labour Ward first part · Second break':'Labour Ward second part · First break');
}

function confirmationPlanRows(r,order){
  var timing=nightDutyTiming(r.date),rows=[confirmationPlanItem('First part theatre',r.first1+' + '+r.first2,'Second break'),confirmationPlanItem('Second part theatre',r.second1+' + '+r.second2,'First break')];
  if(r.mode==='5')rows.push(confirmationPlanItem('Full-night Labour Ward / Pager',r.fullLW,'00:00–07:00 · Break coordinated when clinical cover allows'));
  else if(r.sharedPagerThree)rows.push(confirmationPlanItem('Shared Labour Ward / Pager',threeWayPagerNames(r).join(' + '),'In order · '+threeWayPagerPeriods(r.date).join(' / ')));
  else if(r.mode==='6'&&usesAgreedPagerOrder(r.date,6)){
    var pagerNames=order?[order.first_part_name,order.second_part_name]:[r.pager,r.reliever];
    pagerNames.forEach(function(name){rows.push(confirmationPlanItem('Shared Pager',name,labourAssignmentDetail(name,order,timing)))});
  }
  else{rows.push(confirmationPlanItem('Pager',r.pager,labourAssignmentDetail(r.pager,order,timing)));rows.push(confirmationPlanItem('Reliever',r.reliever,labourAssignmentDetail(r.reliever,order,timing)))}
  if(r.mode==='7'&&!r.sharedPagerThree)rows.push(confirmationPlanItem('Seventh nurse',r.seventh,'Break coordinated as required'));
  return rows;
}

function confirmationChangedRows(base,r,order){
  var rostered=rawBaseForDate(base.date),labels={first1:'First Part theatre · position 1',first2:'First Part theatre · position 2',second1:'Second Part theatre · position 1',second2:'Second Part theatre · position 2',pager:'Pager',reliever:'Reliever',seventh:'Seventh nurse'},rows=[];
  ['first1','first2','second1','second2'].forEach(function(key){if(canonicalNurseName(rostered[key])!==canonicalNurseName(r[key]))rows.push(confirmationChangeItem(labels[key],rostered[key],r[key],allocationBreak(key)))});
  if(r.mode==='5'){var before=[rostered.pager,rostered.reliever].filter(Boolean).join(' + ');if(canonicalNurseName(rostered.pager)!==canonicalNurseName(r.fullLW)||canonicalNurseName(rostered.reliever)!==canonicalNurseName(r.fullLW))rows.push(confirmationChangeItem('Full-night Labour Ward / Pager',before,r.fullLW,'00:00–07:00'))}
  else if(r.sharedPagerThree)rows.push(confirmationChangeItem('Shared Labour Ward / Pager',[rostered.pager,rostered.reliever].filter(Boolean).join(' + '),threeWayPagerNames(r).join(' + '),'In order · '+threeWayPagerPeriods(r.date).join(' / ')));
  else ['pager','reliever'].forEach(function(key){if(canonicalNurseName(rostered[key])!==canonicalNurseName(r[key]))rows.push(confirmationChangeItem(r.mode==='6'&&usesAgreedPagerOrder(r.date,6)?'Shared Pager':labels[key],rostered[key],r[key],labourAssignmentDetail(r[key],order,nightDutyTiming(r.date))))});
  if(r.mode==='7'&&!r.sharedPagerThree&&canonicalNurseName(rostered.seventh)!==canonicalNurseName(r.seventh))rows.push(confirmationChangeItem(labels.seventh,rostered.seventh,r.seventh,'Break coordinated as required'));
  if(!rows.length){changesFor(base.date).forEach(function(change){rows.push(confirmationChangeItem('Absence',change.absent_name,change.replacement_name||'Not working',change.reason||'Unavailable'))});overtimeFor(base.date).forEach(function(entry){rows.push(confirmationChangeItem('Overtime','Not working',entry.nurse_name,entry.allocation_key?allocationLabel(entry.allocation_key):'Allocation to decide'))})}
  return rows;
}

function confirmationReason(base){var reasons=[],override=nightRoleOverrides[base.date];if(override&&override.reason)reasons.push(override.reason);changesFor(base.date).forEach(function(change){if(change.reason)reasons.push(change.reason)});reasons=reasons.filter(function(reason,index,list){return list.indexOf(reason)===index});return reasons.join(' · ')}

function renderConfirmationPreview(base,plan,tasks,confirmNeeded,taskInstruction){
  var host=byId('confirmationPreview');if(!host)return;var r=allocationPreview(base);
  var visible=!!(tasks||confirmNeeded),order=labourOrderFor(r)||(!tasks&&!usesAgreedPagerOrder(base.date,plan.count)?{first:r.pager,second:r.reliever}:null),changed=visible?confirmationChangedRows(base,r,order):[],full=visible?confirmationPlanRows(r,order):[],reason=visible?confirmationReason(base):'';
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

function roleAssignmentKeys(assignments){return assignments&&assignments.mode==='4'?FOUR_NIGHT_ROLE_KEYS:assignments&&assignments.mode==='5'?FIVE_NIGHT_ROLE_KEYS:assignments&&assignments.mode==='7'?SEVEN_NIGHT_ROLE_KEYS:CORE_ALLOCATION_KEYS}
var FOUR_NIGHT_ROLE_KEYS=['first1','first2','second1','second2'];
var FIVE_NIGHT_ROLE_KEYS=['first1','first2','second1','second2','fullLW'];
var SEVEN_NIGHT_ROLE_KEYS=['first1','first2','second1','second2','pager','reliever','seventh'];
function validRoleAssignments(assignments){if(!assignments||typeof assignments!=='object'||Array.isArray(assignments))return false;var keys=roleAssignmentKeys(assignments),custom=assignments.mode==='4'||assignments.mode==='5'||assignments.mode==='7',expected=(custom?keys.concat(['mode']):keys).slice().sort(),supplied=Object.keys(assignments).sort();if(expected.length!==supplied.length||expected.some(function(key,index){return supplied[index]!==key}))return false;var values=keys.map(function(key){return String(assignments[key]||'').trim()});return values.every(Boolean)&&new Set(values.map(function(name){return canonicalNurseName(name)})).size===keys.length}
function sameNightNameSet(left,right){if(left.length!==right.length)return false;var wanted=left.map(function(name){return canonicalNurseName(name)}).sort(),actual=right.map(function(name){return canonicalNurseName(name)}).sort();return wanted.every(function(name,index){return name===actual[index]})}
function nightWorkingNames(base){var raw=rawBaseForDate(base.date),changes=changesFor(base.date),overtime=overtimeFor(base.date),absent=changes.map(function(change){return canonicalNurseName(change.absent_name)}),names=[];function add(name){name=String(name||'').trim();if(name&&!names.some(function(saved){return canonicalNurseName(saved)===canonicalNurseName(name)}))names.push(name)}CORE_ALLOCATION_KEYS.forEach(function(key){if(absent.indexOf(canonicalNurseName(raw[key]))<0)add(raw[key])});changes.forEach(function(change){add(change.replacement_name)});overtime.forEach(function(entry){add(entry.nurse_name)});return names}
function validRoleAssignmentsForNight(base,assignments){if(!validRoleAssignments(assignments))return false;var working=nightWorkingNames(base),assigned;if(assignments.mode==='4'){assigned=FOUR_NIGHT_ROLE_KEYS.map(function(key){return assignments[key]});return working.length===4&&sameNightNameSet(working,assigned)}if(assignments.mode==='5'){assigned=FIVE_NIGHT_ROLE_KEYS.map(function(key){return assignments[key]});return working.length===5&&sameNightNameSet(working,assigned)}if(assignments.mode==='7'){assigned=SEVEN_NIGHT_ROLE_KEYS.map(function(key){return assignments[key]});return working.length===7&&sameNightNameSet(working,assigned)}if(baseEstablishmentSize(base)===5){assigned=CORE_ALLOCATION_KEYS.map(function(key){return assignments[key]});return working.length===6&&sameNightNameSet(working,assigned)}return true}
function customFiveAssignmentsFor(base){var stored=nightRoleOverrides[base.date],assignments=stored&&stored.assignments;return validRoleAssignmentsForNight(base,assignments)&&assignments.mode==='5'?Object.assign({},assignments):null}
function applyNightRoleOverride(base){var copy=Object.assign({},base),stored=nightRoleOverrides[base.date],assignments=stored&&stored.assignments;if(validRoleAssignments(assignments)&&assignments.mode!=='5'&&assignments.mode!=='4'&&((baseEstablishmentSize(base)===6&&(assignments.mode!=='7'||base.date<SHARED_PAGER_START_DATE))||validRoleAssignmentsForNight(base,assignments))){CORE_ALLOCATION_KEYS.forEach(function(key){copy[key]=assignments[key]});if(assignments.mode==='7'){copy.seventh=assignments.seventh;copy.mode='7'}else copy.mode='6'}return copy}
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
  var rostered=nightRoleOverrides[base.date]?rawBaseForDate(base.date):base;base=applyNightRoleOverride(base);var changes=changesFor(base.date),overtime=overtimeFor(base.date),absentKeys=[],openKeys=[],legacyCover=0;
  changes.forEach(function(c){var key=allocationKeyForName(rostered,c.absent_name);if(!key)return;if(absentKeys.indexOf(key)<0)absentKeys.push(key);if(c.replacement_name)legacyCover++;else if(openKeys.indexOf(key)<0)openKeys.push(key)});
  var size=baseEstablishmentSize(base),count=size-absentKeys.length+legacyCover+overtime.length,customFive=customFiveAssignmentsFor(base);
  if(count===5&&customFive){var assignedNames=FIVE_NIGHT_ROLE_KEYS.map(function(key){return customFive[key]}),usedOvertime=overtime.filter(function(entry){return assignedNames.some(function(name){return canonicalNurseName(name)===canonicalNurseName(entry.nurse_name)})});return{changes:changes,overtime:overtime,absentKeys:absentKeys,openKeys:openKeys,availableKeys:[],count:count,coverageKey:'custom',coverageChoices:[],coverageSource:'night-only',requiresCoverageChoice:false,requiresSeventhDecision:false,seventhDecision:null,validAssignments:usedOvertime,unassigned:[],unresolved:[],coreComplete:true,extraCount:0,complete:true,seventhChoice:null,seventhNurse:null,seventhVacatedKey:null,customFiveAssignments:customFive}}
  if(size===5&&count>=6&&!base.reliever&&openKeys.indexOf('reliever')<0)openKeys.push('reliever');
  var customRoles=nightRoleOverrides[base.date]&&nightRoleOverrides[base.date].assignments;if(size===5&&count===6&&customRoles&&!customRoles.mode&&validRoleAssignmentsForNight(base,customRoles)){var customUsed=overtime.filter(function(entry){return CORE_ALLOCATION_KEYS.some(function(key){return sameNurse(customRoles[key],entry.nurse_name)})});return{changes:changes,overtime:overtime,absentKeys:absentKeys,openKeys:[],availableKeys:[],count:count,coverageKey:null,coverageChoices:[],coverageSource:'night-only',requiresCoverageChoice:false,requiresSeventhDecision:false,seventhDecision:null,validAssignments:customUsed.map(function(entry){var copy=Object.assign({},entry);copy.allocation_key=CORE_ALLOCATION_KEYS.find(function(key){return sameNurse(customRoles[key],entry.nurse_name)});return copy}),unassigned:[],unresolved:[],coreComplete:true,extraCount:0,complete:true,seventhChoice:null,seventhNurse:null,seventhVacatedKey:null}}
  var sharedPagerThree=usesThreeWayPager(base.date,count),seventhChoice=null,seventhDecision=null,requiresSeventhDecision=false;
  if(sharedPagerThree&&customRoles&&customRoles.mode==='7'&&validRoleAssignmentsForNight(base,customRoles)){
    var assignedOvertime=overtime.map(function(entry){
      var key=SEVEN_NIGHT_ROLE_KEYS.find(function(position){return sameNurse(customRoles[position],entry.nurse_name)});
      return Object.assign({},entry,{allocation_key:key});
    });
    return{changes:changes,overtime:overtime,absentKeys:absentKeys,openKeys:[],availableKeys:[],count:count,coverageKey:null,coverageChoices:[],coverageSource:'night-only',requiresCoverageChoice:false,requiresSeventhDecision:false,seventhDecision:null,validAssignments:assignedOvertime,unassigned:[],unresolved:[],coreComplete:true,extraCount:0,complete:true,seventhChoice:null,seventhNurse:null,seventhVacatedKey:null,sharedPagerThree:true};
  }
  if(sharedPagerThree)openKeys.push('seventh');
  else if(count>=7){seventhChoice=seventhRotationChoice(base,changes);if(seventhChoice.source==='overtime')seventhDecision='overtime';else{var savedRotation=overtime.some(function(o){return o.allocation_key===seventhChoice.vacatedKey}),savedOvertime=overtime.some(function(o){return o.allocation_key==='seventh'});seventhDecision=seventhDecisionDrafts[base.date]||(savedOvertime?'overtime':savedRotation?'rotation':null);requiresSeventhDecision=!seventhDecision}seventhChoice.decision=seventhDecision;if(seventhDecision){var seventhOpenKey=seventhDecision==='rotation'?seventhChoice.vacatedKey:'seventh';if(openKeys.indexOf(seventhOpenKey)<0)openKeys.push(seventhOpenKey)}}
  var coverageKey=null,coverageChoices=[],coverageSource='';if(size===6&&count===5&&openKeys.length){if(openKeys.indexOf('reliever')>=0){coverageKey='reliever';coverageSource='automatic'}else if(openKeys.indexOf('pager')>=0){coverageKey='pager';coverageSource='automatic'}else{coverageChoices=openKeys.filter(function(key){return['first1','first2','second1','second2'].indexOf(key)>=0});var stored=fiveCoverFor(base.date);if(coverageChoices.length===1){coverageKey=coverageChoices[0];coverageSource='automatic'}else if(stored&&coverageChoices.indexOf(stored.coverage_key)>=0){coverageKey=stored.coverage_key;coverageSource='saved'}}}
  var requiresCoverageChoice=count===5&&coverageChoices.length>1&&!coverageKey,availableKeys=requiresCoverageChoice?[]:openKeys.filter(function(key){return key!==coverageKey}),usedAllocationKeys={},usedOvertimeIds={};var validAssignments=overtime.filter(function(o){var valid=availableKeys.indexOf(o.allocation_key)>=0&&!usedAllocationKeys[o.allocation_key]&&!usedOvertimeIds[o.id];if(valid){usedAllocationKeys[o.allocation_key]=true;usedOvertimeIds[o.id]=true}return valid}),assignedIds=validAssignments.map(function(o){return o.id}),unassigned=overtime.filter(function(o){return assignedIds.indexOf(o.id)<0}),unresolved=availableKeys.filter(function(key){return !validAssignments.some(function(o){return o.allocation_key===key})}),coreComplete=!requiresCoverageChoice&&!requiresSeventhDecision&&unresolved.length===0&&count>=5;
  return{changes:changes,overtime:overtime,absentKeys:absentKeys,openKeys:openKeys,availableKeys:availableKeys,count:count,coverageKey:coverageKey,coverageChoices:coverageChoices,coverageSource:coverageSource,requiresCoverageChoice:requiresCoverageChoice,requiresSeventhDecision:requiresSeventhDecision,seventhDecision:seventhDecision,validAssignments:validAssignments,unassigned:unassigned,unresolved:unresolved,coreComplete:coreComplete,extraCount:Math.max(0,count-7),complete:coreComplete,sharedPagerThree:sharedPagerThree,seventhChoice:seventhChoice,seventhNurse:seventhChoice?seventhChoice.nurse:null,seventhVacatedKey:seventhChoice?seventhChoice.vacatedKey:null};
}


function availablePartsModel(base,plan){
  plan=plan||staffingPlan(base);var timing=nightDutyTiming(base.date),pagerPeriods=plan.sharedPagerThree?threeWayPagerPeriods(base.date):null;
  function part(key){var pagerCopy=sixNurseAllocationCopy(key,plan,base.date);if(pagerCopy)return{key:key,label:pagerCopy.label,detail:pagerCopy.detail};return{key:key,label:allocationLabel(key,plan.sharedPagerThree),detail:pagerPeriods&&isSharedPagerSlot(key)?pagerPeriods[THREE_WAY_PAGER_KEYS.indexOf(key)]:/^first/.test(key)?timing.firstPeriodDisplay+' · Second break':/^second/.test(key)?timing.secondPeriod+' · First break':key==='pager'&&plan.count===5?'Full-night Labour Ward / Pager':key==='seventh'?'Additional nurse · Break as required':allocationBreak(key)}}
  var conditional=plan.requiresSeventhDecision&&plan.seventhChoice?{name:professionalName(plan.seventhChoice.nurse),rotation:part(plan.seventhChoice.vacatedKey),overtime:part('seventh')}:null;
  return{parts:plan.unresolved.map(part),conditional:conditional,coverageChoices:plan.requiresCoverageChoice?plan.coverageChoices.map(part):[],unassigned:plan.unassigned.map(function(entry){return professionalName(entry.nurse_name)}),shortage:Math.max(0,5-plan.count),extras:additionalNurses(plan).length,complete:plan.complete};
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
  copy.sharedPagerThree=!!plan.sharedPagerThree;
  if(plan.customFiveAssignments){FIVE_NIGHT_ROLE_KEYS.forEach(function(key){copy[key]=plan.customFiveAssignments[key]});copy.mode='5';copy.staffingAdjusted=true;copy.pendingAllocations=[];copy.additionalStaff=[];return copy}
  var customSeven=nightRoleOverrides[r.date]&&nightRoleOverrides[r.date].assignments;
  if(customSeven&&customSeven.mode==='7'&&validRoleAssignmentsForNight(r,customSeven)){SEVEN_NIGHT_ROLE_KEYS.forEach(function(key){copy[key]=customSeven[key]});copy.mode='7';copy.staffingAdjusted=true;copy.pendingAllocations=[];copy.additionalStaff=[];return copy}
  var customFour=nightRoleOverrides[r.date]&&nightRoleOverrides[r.date].assignments;
  if(customFour&&customFour.mode==='4'&&validRoleAssignmentsForNight(r,customFour)){FOUR_NIGHT_ROLE_KEYS.forEach(function(key){copy[key]=customFour[key]});copy.mode='5';copy.fullLW='Shared Pager · four nurses';copy.pager=copy.fullLW;copy.reliever='';copy.staffingAdjusted=true;copy.pendingAllocations=[];copy.additionalStaff=[];copy.sharedPagerFour=true;return copy}
  if(plan.sharedPagerThree)copy.seventh='';
  else if(plan.count>=7){
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
    var pending=plan.count<5?'Uncovered • additional cover required':plan.sharedPagerThree?'Cover pending':pendingNames.length===1?pendingNames[0]+' • allocation to decide':pendingNames.length?'Allocation to decide • '+pendingNames.length+' overtime nurses available':'Allocation pending';
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
  else if(r.sharedPagerThree)alert='Four nurses cover theatre and three share Labour Ward / Pager.';
  else if(r.mode==='7'&&plan.requiresSeventhDecision)alert='Seven-nurse arrangement: decide whether '+plan.seventhNurse+' moves from '+allocationLabel(plan.seventhVacatedKey)+' into the seventh position.';
  else if(r.mode==='7'&&plan.seventhChoice&&plan.seventhChoice.source==='permanent'&&plan.seventhDecision==='rotation')alert='Seven-nurse arrangement: '+r.seventh+' moves from '+allocationLabel(plan.seventhVacatedKey)+' into the seventh position. Overtime fills the vacated role.';
  else if(r.mode==='7'&&plan.seventhChoice&&plan.seventhChoice.source==='permanent')alert='Seven-nurse arrangement: '+plan.seventhNurse+' remains in '+allocationLabel(plan.seventhVacatedKey)+', while an overtime nurse takes the seventh position.';
  else if(r.mode==='7')alert='Seven-nurse arrangement: the seventh rotation selected an overtime nurse for the additional role.';
  else if(usesAgreedPagerOrder(r.date,count))alert='The two Pager nurses agree who covers each part.';
  else alert='Standard six-nurse plan: Pager works the Labour Ward first part and Reliever works the second part.';
  return{display:r.mode,fullLW:r.fullLW,alert:alert};
}

function usesAgreedPagerOrder(date,count){
  return date>=SHARED_PAGER_START_DATE&&count===6;
}

function sixNurseAllocationCopy(key,plan,date){
  if(!usesAgreedPagerOrder(date,plan.count)||!isSharedPagerSlot(key))return null;
  var both=plan.availableKeys.indexOf('pager')>=0&&plan.availableKeys.indexOf('reliever')>=0;
  return {label:'Shared Labour Ward / Pager'+(both?(key==='pager'?' · place 1':' · place 2'):''),detail:'The two Pager nurses agree who takes each part'};
}

function pagerOrderDraftFor(r){
  var draft=labourOrderDrafts[r.date];
  return draft&&!draft.automatic&&sameNightNameSet([r.pager,r.reliever],[draft.first,draft.second])?draft:null;
}

function pagerOrderConfirmed(r){
  var order=labourOrders[r.date];
  return order&&sameNightNameSet([r.pager,r.reliever],[order.first_part_name,order.second_part_name])?order:null;
}

function pagerOrderForm(base,plan){
  if(!usesAgreedPagerOrder(base.date,plan.count))return null;
  var preview=allocationPreview(base),selection=selectedCoverAssignments(base,plan);
  if(selection.missing.length||!preview.pager||!preview.reliever||sameNurse(preview.pager,preview.reliever))return null;
  var saved=pagerOrderConfirmed(preview),draft=pagerOrderDraftFor(preview);
  return {preview:preview,saved:saved,first:draft?draft.first:saved?saved.first_part_name:'',
    second:draft?draft.second:saved?saved.second_part_name:'',needsSave:!saved||!!(draft&&!sameNurse(draft.first,saved.first_part_name))};
}

function renderPagerOrderForm(base,plan){
  var host=byId('twoNursePagerOrder');
  if(!host)return;
  var model=pagerOrderForm(base,plan);
  host.hidden=!model;
  if(!model){host.replaceChildren();return}
  if(!host.firstElementChild){
    host.innerHTML='<label for="twoNursePagerFirst"><strong>Shared Pager · First Part</strong></label><select id="twoNursePagerFirst"><option value="">Choose who takes First Part</option></select><p id="twoNursePagerSecond" class="time" aria-live="polite"></p>';
  }
  var select=byId('twoNursePagerFirst'),second=byId('twoNursePagerSecond');
  var names=[model.preview.pager,model.preview.reliever];
  if(select.options.length!==3||names.some(function(name,index){return select.options[index+1].value!==name})){
    select.length=1;
    names.forEach(function(name){select.add(new Option(professionalName(name),name))});
  }
  select.value=model.first;
  select.disabled=allocationSaveInFlight||!navigator.onLine||forcedOfflineSession||sharedWritesBlocked();
  second.textContent=model.second?'Second Part · '+professionalName(model.second):'Agree the order together, then choose who takes First Part.';
  select.onchange=function(){
    var first=names.find(function(name){return name===select.value});
    if(first&&(!model.saved||!sameNurse(first,model.saved.first_part_name)))labourOrderDrafts[base.date]={first:first,second:names.find(function(name){return name!==first})};
    else delete labourOrderDrafts[base.date];
    formMessage('allocationFormMessage','');
    updateChangesWorkflow(base,staffingPlan(base));
  };
}

function labourOrderFor(r){
  if(!r||r.mode==='5'||r.sharedPagerThree)return null;
  if(r.mode==='6'&&usesAgreedPagerOrder(r.date,6))return pagerOrderConfirmed(r);
  var draft=labourOrderDrafts[r.date],order=labourOrders[r.date];
  var expected=[r.pager,r.reliever];
  if(draft&&!draft.automatic&&sameNightNameSet(expected,[draft.first,draft.second]))
    return{roster_date:r.date,first_part_name:draft.first,second_part_name:draft.second,automatic:false};
  if(order&&sameNightNameSet(expected,[order.first_part_name,order.second_part_name]))return order;
  if(draft&&draft.automatic&&sameNurse(r.pager,draft.first)&&sameNurse(r.reliever,draft.second))
    return{roster_date:r.date,first_part_name:draft.first,second_part_name:draft.second,automatic:true};
  return null;
}

function ensureAutomaticLabourOrder(base,r){
  if(!r||r.mode==='5'||r.sharedPagerThree||usesAgreedPagerOrder(r.date,staffingPlan(base).count)||planIsProvisional(base)||labourOrderFor(r))return;
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
  if(r.sharedPagerThree){
    var pagerTeam=threeWayPagerNames(r);
    var turnIndex=pagerTeam.findIndex(function(nurse){return nurse!=='Unassigned'&&sameNurse(nurse,name)});
    if(turnIndex>=0){
      var colleagues=pagerTeam.filter(function(nurse){return nurse!=='Unassigned'&&!sameNurse(nurse,name)}).map(professionalName);
      var pagerPending=(r.pendingAllocations||[]).some(isSharedPagerSlot);
      var turnPeriod=threeWayPagerPeriods(r.date)[turnIndex];
      return{key:'sharedPagerThree',icon:'pager',title:'Shared Labour Ward / Pager',detail:pagerPending?'Pager team being assigned':'Pager turn '+(turnIndex+1)+' of 3 · '+turnPeriod,period:turnPeriod,breakLabel:THREE_WAY_PAGER_GUIDANCE,context:colleagues.length?'With '+colleagues.join(' and '):'Cover pending',pending:false};
    }
  }
  if(!r.sharedPagerThree&&r.mode!=='5'&&(sameNurse(r.pager,name)||sameNurse(r.reliever,name))){
    var pagerRole=sameNurse(r.pager,name),role=r.mode==='6'&&usesAgreedPagerOrder(r.date,6)?'Shared Labour Ward / Pager':pagerRole?'Pager':'Reliever',other=pagerRole?r.reliever:r.pager,order=labourOrderFor(r);
    if(!order)return{key:pagerRole?'pager':'reliever',icon:pagerRole?'pager':'reliever',title:role,detail:'Labour Ward part pending',period:'To be decided',breakLabel:'Pending',context:'With '+professionalName(other),pending:true,other:other};
    if(sameNurse(order.first_part_name,name))return{key:pagerRole?'pager':'reliever',icon:pagerRole?'pager':'reliever',title:role,detail:'Labour Ward first part',period:timing.firstPeriodDisplay,breakLabel:'Second break',context:'With '+professionalName(other),pending:false,dutyPart:'first'};
    return{key:pagerRole?'pager':'reliever',icon:pagerRole?'pager':'reliever',title:role,detail:'Labour Ward second part',period:timing.secondPeriod,breakLabel:'First break',context:'With '+professionalName(other),pending:false,dutyPart:'second'};
  }
  if(r.mode==='7'&&!r.sharedPagerThree&&sameNurse(r.seventh,name))return{key:'seventh',icon:'seventh',title:'Seventh nurse',detail:'Additional allocation',period:'As allocated',breakLabel:'As required',context:'Supports this night’s team',pending:false};
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
  if(assignment.key==='sharedPagerThree'){
    var names=threeWayPagerNames(r);
    detail.pagerTimeline={periods:threeWayPagerPeriods(r.date),mine:(r.pendingAllocations||[]).some(isSharedPagerSlot)?-1:names.findIndex(function(nurse){return sameNurse(nurse,name)})};
  }else if(assignment.key==='fullLW'){
    detail.pagerTimeline={periods:[assignment.period],mine:0};
  }else if((assignment.key==='pager'||assignment.key==='reliever')&&!assignment.pending){
    detail.pagerTimeline={periods:[nightTiming.firstPeriodDisplay,nightTiming.secondPeriod],mine:assignment.dutyPart==='first'?0:1};
  }
  var pendingPlan=staffingPlan(base);detail.allocationExplained=!!(pendingPlan.requiresSeventhDecision||pendingPlan.requiresCoverageChoice||pendingPlan.unresolved.length);
  if(assignment.pending&&/allocation|decid|uncovered|pending/i.test(assignment.other||'')){detail.context='Not yet assigned';detail.contextLabel='Colleague';detail.pendingOther=''}
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
  var labourPending=!r.sharedPagerThree&&r.mode!=='5'&&!canonical.provisional&&!labourOrderFor(r);
  var agreedPager=usesAgreedPagerOrder(r.date,count),pagerPeople=null;
  var roles=[['bFirst','First Part',r.first1+' + '+r.first2,'Works '+dutyTiming.firstPeriodDisplay+(dutyTiming.isClockChange?' · '+formatDutyHours(dutyTiming.partHours)+' actual':'')+' • Second break'],['bSecond','Second Part',r.second1+' + '+r.second2,'Works '+dutyTiming.secondPeriod+(dutyTiming.isClockChange?' · '+formatDutyHours(dutyTiming.partHours)+' actual':'')+' • First break']];
  if(r.sharedPagerThree){
    var pagerNames=threeWayPagerNames(r),openPager=pagerNames.filter(function(nurse){return nurse==='Unassigned'}).length;
    roles.push(['bPager','Shared Pager',pagerNames.filter(function(nurse){return nurse!=='Unassigned'}).join(' + ')||'Cover pending',openPager?openPager+' '+(openPager===1?'place':'places')+' to fill':threeWayPagerPeriods(r.date).join(' / ')]);
  }
  else if(r.mode!=='5'){
    if(agreedPager){
      var order=pagerOrderConfirmed(r);
      var pair=order?[order.first_part_name,order.second_part_name]:[r.pager,r.reliever];
      pagerPeople=pair.map(function(name,index){
        var pending=!order&&plan.unresolved.indexOf(index===0?'pager':'reliever')>=0;
        return {name:pending?'Unassigned':professionalName(name),period:order?(index===0?dutyTiming.firstPeriodDisplay:dutyTiming.secondPeriod):undefined};
      });
      roles.push(['bPager','Shared Pager',pair.filter(function(_,index){return pagerPeople[index].name!=='Unassigned'}).join(' + '),'Pager parts to agree']);
    }else if(count!==4){
      roles.push(['bPager','Pager',r.pager,labourRoleDetail(r.pager,r)]);
      roles.push(['bReliever','Reliever',r.reliever,labourRoleDetail(r.reliever,r)]);
    }
  }
  syncDateInputs(base.date);renderNightTeamIdentityContext(base.date);renderMyName();var personal=renderPersonalNight(base,r);renderRecentActivity(base.date);updateSmartNightButtons();
  byId('modeStatus').textContent=count+' nurse'+(count===1?'':'s');
  if(byId('changesModeStatus'))byId('changesModeStatus').textContent=count+' nurse'+(count===1?'':'s');
  byId('breakModeStatus').textContent=count+' nurse'+(count===1?'':'s');
  var decisionTasks=workflowTaskCount(base,plan,r),confirmNeeded=workflowNeedsConfirmation(base,decisionTasks),taskCount=decisionTasks||(confirmNeeded||plan.unresolved.length?1:0),absenceCount=changesFor(base.date).length,overtimeEntries=overtimeFor(base.date),overtimeCount=overtimeEntries.length;
  var firstTask=workflowTaskDetails(base,plan)[0]||'';
  if(r.mode==='7'&&!r.sharedPagerThree)roles.push(['b7','Seventh nurse',r.seventh,'Additional nurse · Break coordinated as required']);
  var extras=additionalNurses(plan);
  var roleModel=roles.map(function(c){var tone=roleIconType(c[0]);return{people:c[0]==='bPager'&&r.sharedPagerThree?threeWayPagerNames(r).map(function(name,index){return{name:professionalName(name),period:threeWayPagerPeriods(r.date)[index]}}):c[0]==='bPager'?pagerPeople:undefined,key:c[0],label:c[1],names:c[0]==='bReliever'&&plan.unresolved.indexOf('reliever')>=0?'Unassigned':c[0]==='b7'&&plan.requiresSeventhDecision?'Awaiting choice':professionalNames(c[2]),detail:c[0]==='bReliever'&&plan.unresolved.indexOf('reliever')>=0?'Choose a nurse in Changes':c[3],pagerOrder:c[0]==='bPager'&&agreedPager,tone:tone==='first'||tone==='second'||tone==='pager'||tone==='reliever'||tone==='seventh'?tone:'full',mine:isMine(c[2])}}),fivePerson=r.mode==='5'&&count>=5&&r.fullLW?{name:professionalName(r.fullLW),reason:'One nurse covers Labour Ward and Pager for the full night. Their break is coordinated when clinical cover allows.',mine:isMine(r.fullLW)}:null,nightDetail={nextShiftClockChange:nextShiftClockChangeNotice(base.date),staffingCalculation:staffingCalculation(base,plan),pagerCoverPending:plan.unresolved.length>0,pagerDrawFlow:!!(plan.sharedPagerThree&&count===7),pagerTombolaNotice:base.date>=SHARED_PAGER_START_DATE&&count===6&&(plan.changes.length||plan.overtime.length)?'Pager draw opens when seven nurses are working.':'',pagerTombola:pagerTombolaModel(base,plan,r),availableParts:availablePartsModel(base,plan),date:base.date,nurseCount:count,absenceCount:absenceCount,overtimeCount:overtimeCount,overtimeNames:overtimeEntries.map(function(o){return professionalName(o.nurse_name)}),taskCount:taskCount,decisionTasks:decisionTasks,confirmNeeded:confirmNeeded,alert:count!==6&&r.mode!=='5'?e.alert:'',firstTask:decisionTasks?firstTask:'',labourPending:labourPending&&!(personal&&personal.pending),breakLabel:personal&&personal.breakLabel||'',chatUnread:Number(byId('chatUnreadBadge')&&byId('chatUnreadBadge').textContent||0)||0,liveState:personalLiveStatus(base,personal),roles:roleModel,extras:extras.map(function(o){return o.nurse_name}),fivePerson:fivePerson,clockChange:clockChangeDetailFor(base.date),contextLabel:planIsProvisional(base)?'Provisional':nightDutyTiming(base.date).isClockChange?'Clock change':r.mode==='5'?'5-nurse arrangement':r.mode==='7'?'7-nurse arrangement':absenceCount||overtimeCount||workflowHasManualPlan(base)?'Updated night':'Standard night',currentPart:(function(){var context=resolveNightContext(null,base.date);if(!context.isCurrent||!context.selectedIsAutomatic||context.nowMs<context.timing.startUtc||context.nowMs>=context.timing.endUtc)return'';return context.nowMs<context.timing.handoverUtc?'first':'second'})(),dataFreshness:window.AnaestheticDomain&&window.AnaestheticDomain.freshness?window.AnaestheticDomain.freshness(lastSuccessfulSyncAt,navigator.onLine&&!forcedOfflineSession,appNowMs()).label:''};
  if(window.dispatchEvent&&typeof CustomEvent==='function')window.dispatchEvent(new CustomEvent('roster:night',{detail:nightDetail}));
  appStorage.setItem('anaes_selected_date',base.date);
  renderChanges(base,canonical);renderRoster();renderBreaks(canonical);bindTaskLinks();queueClockChangeAttention(base.date);
  if(currentUserProfile.user_role==='admin')renderAdmin();
  ensureNightHistory(base.date);updateNetworkStatus();save();
}

function goToChanges(target){
  show('changes');setChangesStep('allocation',false);
  setTimeout(function(){var el=document.querySelector(target||'#changesAllocationPane');if(el){el.scrollIntoView({behavior:'smooth',block:'start'});var focus=el.querySelector('.needsDecision button, #fiveCoverStep button, [data-final-allocation], button:not(.hidden), select, summary, input');if(focus)focus.focus({preventScroll:true})}},260);
}

function bindTaskLinks(){
  Array.prototype.forEach.call(document.querySelectorAll('[data-go-allocation]'),function(el){
    el.onclick=function(){goToChanges('#changesAllocationPane')};
    if(el.tagName!=='BUTTON'){el.setAttribute('role','button');el.setAttribute('tabindex','0');el.onkeydown=function(event){if(event.key==='Enter'||event.key===' '){event.preventDefault();goToChanges('#changesAllocationPane')}}}
  });
  function bindStaffingTarget(attribute,selector){Array.prototype.forEach.call(document.querySelectorAll('['+attribute+']'),function(el){el.onclick=function(){show('changes');setTimeout(function(){var target=document.querySelector(selector);if(target){target.scrollIntoView({behavior:'smooth',block:'start'});var field=target.querySelector('select,input');if(field)field.focus({preventScroll:true})}},180)}})}
  bindStaffingTarget('data-go-staffing','#changesStaffingPane');bindStaffingTarget('data-go-absence','.absenceSection');bindStaffingTarget('data-go-overtime','.overtimeSection');
  Array.prototype.forEach.call(document.querySelectorAll('[data-go-confirm]'),function(el){el.onclick=function(){show('changes');setChangesStep('confirm',true)}});
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

function selectedAllocationId(base,key,plan){
  var draft=allocationDrafts[base.date]||{};
  if(Object.prototype.hasOwnProperty.call(draft,key))return draft[key];
  var assigned=(plan||staffingPlan(base)).validAssignments.find(function(o){return o.allocation_key===key});
  return assigned?assigned.id:'';
}

function allocationPreview(base){
  var r=applyChanges(base),overtime=overtimeFor(base.date),plan=staffingPlan(base);
  plan.availableKeys.forEach(function(key){var id=selectedAllocationId(base,key,plan),entry=overtime.find(function(o){return o.id===id});if(entry){r[key]=entry.nurse_name;r.pendingAllocations=(r.pendingAllocations||[]).filter(function(pending){return pending!==key})}});
  return r;
}

function suggestedFourRoleAssignments(base){var raw=rawBaseForDate(base.date),names=nightWorkingNames(base);if(names.length!==4)return null;var assignments={mode:'4'};/* Four-nurse theatre choices stay explicit; never auto-fill the vacant role. */FOUR_NIGHT_ROLE_KEYS.forEach(function(key){var rostered=raw[key];assignments[key]=names.some(function(active){return canonicalNurseName(active)===canonicalNurseName(rostered)})?rostered:''});return assignments}
function suggestedFiveRoleAssignments(base){var raw=rawBaseForDate(base.date),names=nightWorkingNames(base);if(names.length!==5)return null;var assignments={mode:'5'},used=[],full=[raw.pager,raw.reliever].find(function(name){return names.some(function(active){return canonicalNurseName(active)===canonicalNurseName(name)})});assignments.fullLW=full||names[0];used.push(assignments.fullLW);['first1','first2','second1','second2'].forEach(function(key){var rostered=raw[key];if(names.some(function(active){return canonicalNurseName(active)===canonicalNurseName(rostered)})&&!used.some(function(name){return canonicalNurseName(name)===canonicalNurseName(rostered)})){assignments[key]=rostered;used.push(rostered)}});['first1','first2','second1','second2'].forEach(function(key){if(assignments[key])return;var next=names.find(function(name){return !used.some(function(saved){return canonicalNurseName(saved)===canonicalNurseName(name)})});assignments[key]=next;used.push(next)});return validRoleAssignmentsForNight(base,assignments)?assignments:null}
function currentRoleAssignments(base){var stored=nightRoleOverrides[base.date],assignments=stored&&stored.assignments;if(validRoleAssignmentsForNight(base,assignments))return Object.assign({},assignments);var working=nightWorkingNames(base);if(working.length===4)return suggestedFourRoleAssignments(base);if(working.length===5)return suggestedFiveRoleAssignments(base);var current=applyChanges(baseForDate(base.date)),normal={};CORE_ALLOCATION_KEYS.forEach(function(key){normal[key]=current[key]});if(working.length===7){var extra=working.find(function(name){return !CORE_ALLOCATION_KEYS.some(function(key){return sameNurse(current[key],name)})});normal.mode='7';normal.seventh=extra||working[6]}return normal}
function roleEditorAssignments(base){var draft=nightRoleOverrideDrafts[base.date];if(draft&&draft.assignments&&String(draft.assignments.mode)==='4')return Object.assign({},draft.assignments);if(draft&&validRoleAssignmentsForNight(base,draft.assignments))return Object.assign({},draft.assignments);return currentRoleAssignments(base)}
function roleAssignmentsDiffer(left,right){if(!left||!right||String(left.mode||'6')!==String(right.mode||'6'))return true;return roleAssignmentKeys(left).some(function(key){return String(left[key]||'')!==String(right[key]||'')})}

function nightRoleOverrideModel(base){
  if(!nightRoleOverrideAvailable)return{notice:'Night-only role changes need the current database update. The normal calculated roster remains available.'};
  var working=nightWorkingNames(base);if(working.length<4)return{notice:'Custom roles are unavailable while fewer than four nurses are working. Restore enough cover for both theatre parts first.'};
  var stored=nightRoleOverrides[base.date],draft=nightRoleOverrideDrafts[base.date],current=roleEditorAssignments(base),baseline=currentRoleAssignments(base);if(!current||!baseline)return{notice:'Night roles are not available for this night yet.'};
  if(stored&&!validRoleAssignmentsForNight(base,stored.assignments))stored=null;
  var keys=roleAssignmentKeys(current),fourMode=current.mode==='4',fiveMode=current.mode==='5',sevenMode=current.mode==='7',dirty=!!(draft&&roleAssignmentsDiffer(draft.assignments,baseline)),valid=validRoleAssignmentsForNight(base,current),labels={first1:'First Part · nurse 1',first2:'First Part · nurse 2',second1:'Second Part · nurse 1',second2:'Second Part · nurse 2',pager:'Pager',reliever:'Reliever',fullLW:'Full-night Labour Ward / Pager',seventh:'Seventh nurse'},names=(fourMode||fiveMode||sevenMode)?working:keys.map(function(key){return current[key]});
  var sharedPager=sevenMode&&usesThreeWayPager(base.date,working.length);
  if(usesAgreedPagerOrder(base.date,working.length)){labels.pager='Pager nurse 1';labels.reliever='Pager nurse 2';}
  if(sharedPager){var pagerPeriods=threeWayPagerPeriods(base.date);THREE_WAY_PAGER_KEYS.forEach(function(key,index){labels[key]=allocationLabel(key,true)+' · '+pagerPeriods[index]})}
  return{periods:{first:nightDutyTiming(base.date).firstPeriodDisplay,second:nightDutyTiming(base.date).secondPeriod},mode:String(current.mode||'6'),present:names.map(function(name){return{value:name,label:professionalName(name)}}),guidance:fourMode?'Keep the existing theatre parts and choose who fills the vacancy, then save before agreeing the four Pager turns below.':fiveMode?'Arrange the five nurses working this night across four theatre roles and one full-night Labour Ward / Pager role. Each nurse is used once.':sharedPager?'The three Pager slots are listed in handover order from 23:30. Swap nurses between roles to change the order.':sevenMode?'Arrange all seven nurses working this night across the theatre, Pager, Reliever and Seventh nurse roles. Each nurse is used once.':'Choose a different nurse in any role. The two people swap automatically, so no one is duplicated.',summary:stored?(fourMode?'Four-nurse theatre arrangement saved':fiveMode?'Custom five-nurse roles are active':sevenMode?'Custom seven-nurse roles are active':'Night-only roles are active'):(fourMode?'Choose who fills the vacant theatre position':fiveMode?'Optional custom five-nurse arrangement':sevenMode?'Optional custom seven-nurse arrangement':'Optional · roster rotation stays unchanged'),saving:nightRoleSaveInFlight,open:(fourMode&&!stored)||!!draft,stored:!!stored,dirty:dirty,reason:draft&&draft.reason||'',canSave:!nightRoleSaveInFlight&&valid&&dirty&&!!normaliseNurseName(draft&&draft.reason||'')&&navigator.onLine,keys:keys.map(function(key){return{key:key,label:labels[key],fullWidth:key==='fullLW'||key==='seventh'}}),names:names.map(function(name){return{value:name,label:professionalName(name)}}),assignments:current};
}

async function saveNightRoleOverride(base){
  if(nightRoleSaveInFlight)return;
  if(!requireOnline()){formMessage('nightRoleFeedback','Reconnect before saving these assignments.','error');return}var draft=nightRoleOverrideDrafts[base.date],reason=normaliseNurseName(draft&&draft.reason||'');
  if(!draft||!validRoleAssignmentsForNight(base,draft.assignments)||!roleAssignmentsDiffer(draft.assignments,currentRoleAssignments(base))){formMessage('nightRoleFeedback','Review the current team and change an assignment before saving.','error');toast('Change a role before saving');return}if(!reason){formMessage('nightRoleFeedback','Add a short reason for this night-only change.','error');toast('Add a short reason for the night-only change');var field=byId('nightRoleReason');if(field)field.focus();return}
  nightRoleSaveInFlight=true;renderChanges(base);
  var previous=nightRoleOverrides[base.date]?JSON.parse(JSON.stringify(nightRoleOverrides[base.date])):null,button=byId('saveNightRolesBtn');if(button){button.disabled=true;button.textContent='Saving…'}setSync('saving','Saving night-only roles');formMessage('nightRoleFeedback','Saving assignments…','');
  try{var expectedAssignments=JSON.parse(JSON.stringify(draft.assignments)),result=await runRosterMutation('roles:save:'+base.date,function(commandId,expectedSyncRevision){return supa.rpc('apply_night_role_override_v57',{p_operation_id:commandId,p_expected_sync_revision:expectedSyncRevision,p_client_version:APP_VERSION,p_roster_date:base.date,p_action:'save',p_assignments:expectedAssignments,p_override_reason:reason,p_history_reason:reason})},function(){var stored=nightRoleOverrides[base.date]&&nightRoleOverrides[base.date].assignments;return !!(stored&&JSON.stringify(stored)===JSON.stringify(expectedAssignments))});
  if(missingRpc(result)){setSync('error','Database update required');formMessage('nightRoleFeedback','Update the database before saving these assignments. Nothing was changed.','error');toast('Seven-nurse night-only changes require the current database update. Nothing was changed.');if(button){button.disabled=false;button.textContent='Save assignments'}return}if(rpcError(result,'nightRoleFeedback'))return;delete nightRoleOverrideDrafts[base.date];await loadSharedData();notifyRosterUpdate('roles',base.date);toast('Saved for this night only. The permanent rotation is unchanged.',{label:'Undo',run:function(){return undoNightRoleChange(base.date,previous)}});}catch(error){formMessage('nightRoleFeedback','The assignments could not be saved. Your selections are still here.','error');toast('The role change could not be saved. Your selections are still here.')}finally{nightRoleSaveInFlight=false;if(currentUserProfile&&R.length)renderChanges(cur())}
}

async function resetNightRoleOverride(base){
  if(!requireOnline()||!confirm('Restore the rostered roles for this night?'))return;setSync('saving','Restoring rostered roles');var stored=nightRoleOverrides[base.date]?JSON.parse(JSON.stringify(nightRoleOverrides[base.date])):null,result=await runRosterMutation('roles:reset:'+base.date,function(commandId,expectedSyncRevision){return supa.rpc('apply_night_role_override_v57',{p_operation_id:commandId,p_expected_sync_revision:expectedSyncRevision,p_client_version:APP_VERSION,p_roster_date:base.date,p_action:'reset',p_assignments:null,p_override_reason:null,p_history_reason:'Restored rostered roles'})},function(){return !nightRoleOverrides[base.date]});if(missingRpc(result)){setSync('error','Database update required');toast('This action requires database schema 36. Nothing was changed.');return}if(rpcError(result,'nightRoleFeedback'))return;delete nightRoleOverrideDrafts[base.date];await loadSharedData();notifyRosterUpdate('roles',base.date);toast('Rostered roles restored',{label:'Undo',run:function(){return undoNightRoleChange(base.date,stored)}});
}

async function undoNightRoleChange(date,previous){
  if(!requireOnline())return;setSync('saving','Undoing role change');var expected=previous&&previous.assignments?JSON.parse(JSON.stringify(previous.assignments)):null,result=await runRosterMutation('roles:undo:'+date,function(commandId,expectedSyncRevision){return supa.rpc('apply_night_role_override_v57',{p_operation_id:commandId,p_expected_sync_revision:expectedSyncRevision,p_client_version:APP_VERSION,p_roster_date:date,p_action:previous?'save':'reset',p_assignments:expected,p_override_reason:previous&&previous.reason||'Previous night-only arrangement',p_history_reason:'Undid the latest role change'})},function(){var current=nightRoleOverrides[date]&&nightRoleOverrides[date].assignments;return expected?!!(current&&JSON.stringify(current)===JSON.stringify(expected)):!current});if(missingRpc(result)){setSync('error','Database update required');toast('Undo requires database schema 36. Nothing was changed.');return}if(rpcError(result))return;await loadSharedData();notifyRosterUpdate('roles',date);toast('Role change undone')
}

function updateConfirmationControls(confirmNeeded,tasks,coverPending,pagerBlocked){
  var button=byId('saveAllocationsBtn');
  if(button){
    button.classList.toggle('hidden',!confirmNeeded);
    button.dataset.workflowBlocked=tasks?'true':'false';
    button.disabled=!!tasks||!navigator.onLine;
    if(!allocationSaveInFlight)button.textContent='Save assignments';
  }
  var coverButton=byId('saveCoverAllocationsBtn');
  if(coverButton){
    coverButton.classList.toggle('hidden',!coverPending);
    coverButton.dataset.workflowBlocked=tasks||pagerBlocked||allocationSaveInFlight?'true':'false';
    coverButton.disabled=!!tasks||pagerBlocked||allocationSaveInFlight||!navigator.onLine||forcedOfflineSession||sharedWritesBlocked();
    if(allocationSaveInFlight)coverButton.textContent='Saving…';
  }
}

function updateAllocationSaveControl(base,plan){
  plan=plan||staffingPlan(base);var tasks=workflowTaskCount(base,plan),confirmNeeded=workflowNeedsConfirmation(base,tasks);
  var pagerForm=pagerOrderForm(base,plan),pagerRequired=usesAgreedPagerOrder(base.date,plan.count)&&(!pagerForm||pagerForm.needsSave);
  updateConfirmationControls(confirmNeeded&&!plan.unresolved.length&&!pagerRequired,tasks,plan.unresolved.length>0&&plan.count>=5||pagerRequired&&!!pagerForm,pagerRequired&&(!pagerForm||!pagerForm.first));
}

function seventhDecisionCard(plan){
  if(plan.count<7||!plan.seventhChoice)return'';
  var choice=plan.seventhChoice;
  if(choice.source==='overtime')return'<div class="seventhDecisionCard confirmed"><div class="decisionEyebrow">Seventh-nurse rotation</div><h3>Overtime nurse takes the seventh position</h3><div class="time">This is the scheduled overtime turn. Choose the overtime nurse in the seventh-nurse allocation below.</div></div>';
  var original=allocationLabel(choice.vacatedKey),fallback=choice.fallback?'<div class="decisionFallback">'+esc(choice.scheduled)+' is absent, so '+esc(professionalName(choice.nurse))+' is the next available permanent nurse in the seventh rotation.</div>':'';
  return'<div class="seventhDecisionCard '+(plan.requiresSeventhDecision?'needsDecision':'confirmed')+'"><div class="decisionEyebrow">Seventh-nurse decision</div><h3>'+esc(professionalName(choice.nurse))+': '+esc(original)+' → seventh nurse</h3>'+fallback+'<div class="decisionButtons"><button type="button" class="'+(plan.seventhDecision==='rotation'?'selected':'')+'" data-seventh-decision="rotation" aria-pressed="'+String(plan.seventhDecision==='rotation')+'"><b>Use seventh rotation</b><small>Overtime fills '+esc(original)+'</small></button><button type="button" class="'+(plan.seventhDecision==='overtime'?'selected':'')+'" data-seventh-decision="overtime" aria-pressed="'+String(plan.seventhDecision==='overtime')+'"><b>Keep original role</b><small>Overtime fills Seventh nurse</small></button></div>'+(plan.requiresSeventhDecision?'':'<div class="decisionSaved">Choice selected · save the allocations below.</div>')+'</div>';
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
  var sheetDate=byId('assignmentSheetDate');if(sheetDate)sheetDate.textContent=new Date(base.date+'T12:00:00').toLocaleDateString('en-GB',{weekday:'short',day:'numeric',month:'long'});
  var canonical=nightPlan&&nightPlan.date===base.date?nightPlan:buildNightPlan(base);
  var changes=changesFor(base.date),absentLower=changes.map(function(c){return c.absent_name.toLowerCase()}),names=activeNames(base).filter(function(n){return absentLower.indexOf(n.toLowerCase())<0});
  var overtime=overtimeFor(base.date),plan=canonical.staffing,history=staffingHistoryFor(base.date),expanded=!!historyExpandedDates[base.date];
  updateStaffingActionAvailability();
  var extraIds=additionalNurses(plan).map(function(o){return o.id});
  byId('fiveCoverStep').innerHTML=fiveCoverHtml(base,plan);
  var seventhInfo=seventhDecisionCard(plan);
  byId('allocationSummary').innerHTML=seventhInfo;
  var groupPager=canGroupPagerCover(plan)&&plan.unresolved.length>0;
  var allocationDraft=allocationDrafts[base.date]||{},pagerPeriods=plan.sharedPagerThree?threeWayPagerPeriods(base.date):null;
  var allocationRows=overtime.length&&plan.availableKeys.length&&!plan.complete?plan.availableKeys.filter(function(key){return !groupPager||!isSharedPagerSlot(key)}).map(function(key){
    var pagerCopy=sixNurseAllocationCopy(key,plan,base.date);
    var assigned=plan.validAssignments.find(function(o){return o.allocation_key===key});
    var selectedId=Object.prototype.hasOwnProperty.call(allocationDraft,key)?allocationDraft[key]:(assigned?assigned.id:'');
    return{key:key,label:pagerCopy?pagerCopy.label:allocationLabel(key,plan.sharedPagerThree),breakLabel:pagerCopy?pagerCopy.detail:pagerPeriods&&isSharedPagerSlot(key)?pagerPeriods[THREE_WAY_PAGER_KEYS.indexOf(key)]:allocationBreak(key),selectedId:selectedId,options:overtime.map(function(o){return{id:o.id,name:o.nurse_name}})};
  }):[];
  var allocationMessage=plan.requiresCoverageChoice?'The overtime choices will appear after the reliever allocation is saved.':plan.requiresSeventhDecision?'Choose the seventh-nurse option above. The correct overtime allocation will then appear here.':'There are no required allocations to finalise.';
  updateAllocationSaveControl(base);renderOvertimeSuggestions();
  var visible=expanded?history:history.slice(0,15);
  var changeDetail={
    date:base.date,dateLabel:fmt(base.date),currentAssignments:plan.complete&&!plan.sharedPagerThree?confirmationPlanRows(applyChanges(base),labourOrderFor(applyChanges(base))):[],sevenNurseReview:sevenNurseAssignmentReview(base,plan),groupPager:groupPager,simplifiedCover:!!(plan.sharedPagerThree&&plan.count===7),availableParts:availablePartsModel(base,plan),
    absences:changes.map(function(c){return{id:c.id,kind:'absence',name:professionalName(c.absent_name),status:'Absent',meta:(c.reason||'Absence')+' · Updated by '+(c.updated_by||'Shift member')+' at '+shortTime(c.updated_at)}}),
    overtime:overtime.map(function(o){var valid=plan.validAssignments.some(function(item){return item.id===o.id}),extra=extraIds.indexOf(o.id)>=0,added=earliestOvertimeAdd(base.date,o.nurse_name),when=added?added.changed_at:o.updated_at,who=added?added.changed_by:o.updated_by;return{id:o.id,kind:'overtime',name:o.nurse_name,status:extra?'Additional staff · as required':valid?(function(key){var copy=sixNurseAllocationCopy(key,plan,base.date);return copy?copy.label:allocationLabel(key,plan.sharedPagerThree)})(plan.validAssignments.find(function(item){return item.id===o.id}).allocation_key):'Awaiting allocation',needsAllocation:!valid&&!extra,meta:'Added by '+(who||'Shift member')+' at '+shortTime(when)}}),
    history:visible.map(function(h){return{label:h.label,type:h.type,title:h.title,detail:h.detail||'',meta:(h.changed_by||'Shift member')+' · '+shortTime(h.changed_at)}}),historyTotal:history.length,historyStatus:historyErrorDates[base.date]?'error':historyLoadedDates[base.date]?'loaded':(!navigator.onLine||forcedOfflineSession)?'offline':'loading',historyExpanded:expanded,historyHasMore:!!(historyPageState[base.date]&&historyPageState[base.date].has_more),allocations:allocationRows,allocationMessage:allocationMessage,forms:{names:names.map(function(n){return{value:n,label:professionalName(n)}}),editing:(changes.find(function(item){return item.id===editingAbsenceId})||null),overtimeSuggestions:recentOvertimeNames()},roleOverride:nightRoleOverrideModel(base)
  };
  if(window.dispatchEvent&&typeof CustomEvent==='function')window.dispatchEvent(new CustomEvent('roster:changes',{detail:changeDetail}));
  Array.prototype.forEach.call(document.querySelectorAll('[data-final-allocation]'),function(select){select.onchange=function(){var date=base.date,key=select.getAttribute('data-final-allocation');if(!allocationDrafts[date])allocationDrafts[date]={};allocationDrafts[date][key]=select.value;updateAllocationSaveControl(base);updateChangesWorkflow(base,plan);formMessage('allocationFormMessage','Selections ready to review.','')}});
  Array.prototype.forEach.call(document.querySelectorAll('[data-seventh-decision]'),function(button){button.onclick=function(){chooseSeventhDecision(base,button.getAttribute('data-seventh-decision'))}});
  var coverButton=byId('saveFiveCoverBtn');if(coverButton)coverButton.onclick=saveFiveCover;
  updateChangesWorkflow(base,plan);
  updateOfflineControls();
}

var staffingSaveInFlight=false;
function updateStaffingActionAvailability(){
  var absence=byId('saveChangeBtn'),absenceName=byId('absentName'),overtime=byId('addOvertimeBtn'),overtimeName=byId('overtimeName'),offline=!navigator.onLine||forcedOfflineSession,writeBlocked=sharedWritesBlocked();
  if(absence)absence.disabled=staffingSaveInFlight||offline||!absenceName||!absenceName.value||writeBlocked;
  if(overtime)overtime.disabled=staffingSaveInFlight||offline||!overtimeName||!normaliseNurseName(overtimeName.value)||writeBlocked;
}
function editNightChange(id){
  if(staffingSaveInFlight||!changesFor(cur().date).some(function(item){return item.id===id}))return;
  editingAbsenceId=id;
  renderChanges(cur());
}
function cancelAbsenceEdit(){editingAbsenceId=null;renderChanges(cur())}

function staffingSaveState(mode,saving,saved){
  staffingSaveInFlight=saving;
  updateStaffingActionAvailability();
  window.dispatchEvent(new CustomEvent('roster:staffing-save',{detail:{mode:mode,saving:saving,saved:saved}}));
}

async function saveStaffingRecord(mode,base,key,execute,verify,success,undo,onSaved){
  var messageId=mode==='absence'?'absenceFormMessage':'overtimeFormMessage',owner=currentUser,session=startupAttempt,result;
  staffingSaveState(mode,true,false);
  formMessage(messageId,'Saving…','');
  setSync('saving','Saving staffing change');
  try{
    try{result=await runRosterMutation(key,execute,verify,true)}
    catch(error){
      if(currentUser!==owner||startupAttempt!==session)return;
      setSync('error','Save unconfirmed');
      formMessage(messageId,'We couldn’t confirm the save. Your entry is still here. Check the connection, then try again.','error');
      return;
    }
    if(currentUser!==owner||startupAttempt!==session)return;
    if(missingRpc(result))result={error:result.error,atomicRequired:true};
    if(rpcError(result,messageId))return;
    if(mode==='absence')editingAbsenceId=null;
    if(onSaved)onSaved();
    staffingSaveState(mode,true,true);
    setSync('','Saved · refreshing');
    toast(success);
    if(!result.recovered)try{notifyRosterUpdate('staffing',base.date)}catch(error){recordAppDiagnostic('mutation',mode,'notification-failed')}
    var refreshed=false;
    try{refreshed=!!(await loadSharedData({background:true}))&&!forcedOfflineSession&&sharedSyncState==='live'}
    catch(error){recordAppDiagnostic('mutation',mode,'post-save-refresh-failed')}
    if(currentUser!==owner||startupAttempt!==session)return;
    if(!refreshed||!verify()){scheduleSharedReload();setSync('stale','Saved · refresh pending')}
    else if(undo&&!result.recovered)toast(success,{label:'Undo',run:undo});
  }finally{staffingSaveState(mode,false,false)}
}


function buildNightPlan(base){
  base=base||cur();var plan=staffingPlan(base),r=applyChanges(base),timing=nightDutyTiming(base.date),provisional=plan.count<5||plan.requiresCoverageChoice||plan.requiresSeventhDecision||plan.unresolved.length>0,labour=labourOrderFor(r),tasks=workflowTaskDetails(base,plan),status=nightPlanStatuses[base.date]||null;
  if(!labour&&!provisional&&r.mode!=='5'&&!r.sharedPagerThree&&!usesAgreedPagerOrder(r.date,plan.count))labour={roster_date:r.date,first_part_name:r.pager,second_part_name:r.reliever,automatic:true};
  return{date:base.date,base:base,effective:r,staffing:plan,timing:timing,provisional:provisional,labourOrder:labour,labourPending:!r.sharedPagerThree&&r.mode!=='5'&&!provisional&&!labour,tasks:tasks,revision:status?Number(status.revision||0):0,confirmed:!!(status&&status.published_at&&!planNeedsConfirmation(base,0))};
}

function breakData(r,nightPlan){
  var base=nightPlan&&nightPlan.base||baseForDate(r.date),plan=nightPlan&&nightPlan.staffing||staffingPlan(base),timing=nightPlan&&nightPlan.timing||nightDutyTiming(r.date);
  if(plan.count<5)return{first:[],second:[],notes:['Breaks cannot be finalised while only '+plan.count+' nurses are recorded. Add sufficient overtime cover and complete the allocations first.']};
  var first=[r.second1,r.second2],second=[r.first1,r.first2],notes=[];
  if(r.mode==='5')notes.push(professionalName(r.fullLW)+' covers Labour Ward / Pager for the full night. Their break is coordinated during the shift when clinical cover allows.');
  else if(r.sharedPagerThree){
    var periods=threeWayPagerPeriods(r.date);
    threeWayPagerNames(r).forEach(function(name,index){notes.push('Pager turn '+(index+1)+': '+professionalName(name)+' • '+periods[index]+'.')});
    notes.push(THREE_WAY_PAGER_GUIDANCE+'.');
  }
  else{
    var order=nightPlan?nightPlan.labourOrder:labourOrderFor(r);
    if(order){
      first.push(order.second_part_name);second.push(order.first_part_name);
      notes.push('First part Labour Ward / Pager: '+professionalName(order.first_part_name)+' • '+timing.firstPeriodDisplay+' • Second break.');
      notes.push('Second part Labour Ward / Pager: '+professionalName(order.second_part_name)+' • '+timing.secondPeriod+' • First break.');
    }else{
      notes.push(professionalName(r.pager)+' and '+professionalName(r.reliever)+' still need to decide who works each part of Labour Ward / Pager.');
      notes.push('Whoever works the first part takes second break. Whoever works the second part takes first break.');
    }
    if(r.mode==='7')notes.push(professionalName(r.seventh)+' is the seventh nurse and coordinates a break as required.');
  }
  var extras=additionalNurses(plan);if(extras.length)notes.push(extras.map(function(o){return o.nurse_name}).join(' + ')+' remain additional staff and take breaks as required.');
  return{first:first,second:second,notes:notes};
}

function renderBreaks(nightPlan){
  var model=nightPlan&&nightPlan.date===cur().date?nightPlan:buildNightPlan(cur()),base=model.base,r=model.effective,plan=model.staffing,staffingPending=model.provisional,labourPending=!r.sharedPagerThree&&r.mode!=='5'&&!model.labourOrder,pending=staffingPending||labourPending,count=plan.count,b=staffingPending?{first:[],second:[],notes:['Breaks are pending until the required staffing and allocations are finalised.']}:breakData(r,model);
  var fourRoles=plan.count===4&&fourNurseTheatreRoles(base);if(fourRoles)b={first:[fourRoles.second1,fourRoles.second2],second:[fourRoles.first1,fourRoles.first2],notes:['Provisional theatre-based groups. Coordinate breaks with the agreed Pager turns and available clinical cover.']};
  byId('breakDatePick').value=r.date;byId('breakModeStatus').textContent=count+' nurse'+(count===1?'':'s');
  var absenceCount=changesFor(base.date).length,timing=model.timing,detail={date:r.date,formattedDate:fmt(r.date),nurseCount:count,absenceCount:absenceCount,pending:pending,pendingReason:fourRoles?'Four-person cover remains provisional. Coordinate breaks with Pager cover.':staffingPending?'Complete the remaining staffing allocation.':'Review the Labour Ward allocation.',labourPending:labourPending,provisionalFour:!!fourRoles,first:b.first.map(professionalName),second:b.second.map(professionalName),notes:b.notes,highlightedName:professionalName(myName()),firstDutyPeriod:timing.firstPeriodDisplay,secondDutyPeriod:timing.secondPeriod,dutyStartUtc:timing.startUtc,handoverUtc:timing.handoverUtc,dutyEndUtc:timing.endUtc,clockChange:clockChangeDetailFor(r.date),revision:model.revision,confirmed:model.confirmed};
  if(window.dispatchEvent&&typeof CustomEvent==='function')window.dispatchEvent(new CustomEvent('roster:breaks',{detail:detail}));
}

function renderRoster(){
  var searchText=function(value){return String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase()},q=searchText(byId('search').value).trim(),f=byId('filter').value||'all';
  if(!R.length){byId('range').textContent='No published nights yet';if(window.dispatchEvent&&typeof CustomEvent==='function')window.dispatchEvent(new CustomEvent('roster:full-roster',{detail:{cards:[],selectedMonth:''}}));return}
  byId('range').innerHTML='<b>'+R.length+'</b> published nights • '+fmt(R[0].date)+' to '+fmt(R[R.length-1].date);
  var cards=[];
  R.forEach(function(original,i){
    var base=Object.assign({},original);base.mode=String(baseEstablishmentSize(base));
    var r=applyChanges(base),changes=changesFor(base.date),overtime=overtimeFor(base.date),plan=staffingPlan(base),count=plan.count,extras=additionalNurses(plan),liveCount=changes.length+overtime.length,labourPending=!r.sharedPagerThree&&r.mode!=='5'&&plan.complete&&usesAgreedPagerOrder(r.date,count)&&!labourOrderFor(r),dutyTiming=nightDutyTiming(base.date);
    var status=planIsProvisional(base)?'Provisional • staffing decision required':labourPending?'Pager parts to agree':nightRoleOverrides[base.date]?'Agreed night-only role change':liveCount?liveCount+' live staffing update'+(liveCount>1?'s':''):dutyTiming.isClockChange?'Clock change night • equal handover '+dutyTiming.handoverDisplay:'Standard calculated rotation';
    var displayMode=String(Math.max(5,Math.min(7,count)));
    var members=nightWorkingNames(base).map(professionalName),pending=planIsProvisional(base)||labourPending,matchesFilter=f==='all'||f==='short'&&count<5||f==='review'&&pending||f==='absence'&&changes.length>0||displayMode===f;
    if(!matchesFilter||searchText(JSON.stringify(base)+' '+JSON.stringify(r)+' '+JSON.stringify(changes)+' '+JSON.stringify(overtime)+' '+members.join(' ')+' '+changes.map(function(change){return professionalName(change.absent_name)}).join(' ')+' '+fmt(base.date)).indexOf(q)<0)return;
    var details=[{label:'First part',values:[professionalName(r.first1),professionalName(r.first2),dutyTiming.firstPeriodDisplay+(dutyTiming.isClockChange?' · '+formatDutyHours(dutyTiming.partHours)+' actual':'')],tone:'first'},{label:'Second part',values:[professionalName(r.second1),professionalName(r.second2),dutyTiming.secondPeriod+(dutyTiming.isClockChange?' · '+formatDutyHours(dutyTiming.partHours)+' actual':'')],tone:'second'}];
    if(count<5)details.push({label:'Status',values:['Additional overtime cover required'],tone:'warning'});
    else if(r.mode==='5')details.push({label:'Full-night Labour Ward / Pager',values:[professionalName(r.fullLW),'00:00–07:00'],tone:'reliever'});
    else if(r.sharedPagerThree)details.push({label:'Shared Labour Ward / Pager',values:threeWayPagerLines(r),tone:'pager'});
    else{var order=labourOrderFor(r)||(!pending?{first_part_name:r.pager,second_part_name:r.reliever}:null);if(order){details.push({label:'Pager turn 1',values:[professionalName(order.first_part_name),dutyTiming.firstPeriodDisplay],tone:'pager'});details.push({label:'Pager turn 2',values:[professionalName(order.second_part_name),dutyTiming.secondPeriod],tone:'reliever'})}}
    if(labourPending)details.push({label:'Shared Pager',values:[professionalName(r.pager),professionalName(r.reliever),'Parts to agree'],tone:'pager'});
    if(r.mode==='7'&&!r.sharedPagerThree)details.push({label:'Seventh nurse',values:[professionalName(r.seventh)]});
    if(extras.length)details.push({label:'Additional',values:extras.map(function(o){return o.nurse_name+' · as required'})});
    if(changes.length)details.push({label:'Absences',values:changes.map(function(c){return professionalName(c.absent_name)+' · '+(c.reason||'Unavailable')}),tone:'warning'});
    if(overtime.length)details.push({label:'Overtime',values:overtime.map(function(o){var allocated=plan.availableKeys.indexOf(o.allocation_key)>=0,extra=extras.some(function(x){return x.id===o.id});return o.nurse_name+' · '+(extra?'as required':allocated?(sixNurseAllocationCopy(o.allocation_key,plan,base.date)||{label:allocationLabel(o.allocation_key,plan.sharedPagerThree)}).label:'allocation to decide')})});
    var rosteredBase=rawBaseForDate(base.date),rosteredMembers=CORE_ALLOCATION_KEYS.map(function(key){return rosteredBase[key]}).filter(Boolean).map(professionalName);
    if(nightRoleOverrides[base.date])details.push({label:'Role change',values:[nightRoleOverrides[base.date].reason||'Agreed night-only roles'],tone:'warning'});if(r.notes)details.push({label:'Notes',values:[r.notes]});cards.push({index:i,date:fmt(r.date),isoDate:base.date,status:status,count:count,short:count<5,needsReview:pending,hasAbsence:changes.length>0,members:members,rosteredMembers:rosteredMembers,details:details});
  });
  if(window.dispatchEvent&&typeof CustomEvent==='function')window.dispatchEvent(new CustomEvent('roster:full-roster',{detail:{cards:cards,selectedMonth:cur().date.slice(0,7)}}));
}

function requireOnline(){
  if(!navigator.onLine||forcedOfflineSession){setSync('offline','Offline • saved information');toast('The shared roster is unavailable. Your entries remain on screen and can be saved after the connection returns.');return false}
  if(sharedWritesBlocked()){setSync('error',compatibilityNeedsUpdate()?'Update required':'Editing paused');toast(sharedWriteNotice());renderWriteGuardState();return false}
  return true;
}

function formMessage(id,message,state){
  var el=byId(id);if(!el)return;
  if(id==='allocationFormMessage'){
    var mirror=byId('coverAllocationFeedback');
    if(mirror){mirror.textContent=message||'';mirror.className='formMessage'+(state?' '+state:'');}
  }
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
  return withTimeout(request,15000);
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

function staffingFormMatchesNight(field,date){
  var sheet=field.closest&&field.closest('[data-roster-night]');
  if(!sheet||sheet.dataset.rosterNight===date)return true;
  toast('The selected night changed. Reopen the form before saving.');
  return false;
}

async function saveNightChange(){
  var nurse=byId('absentName'),reasonField=byId('changeReason');
  if(staffingSaveInFlight||!nurse||!reasonField||!requireOnline())return;
  var base=cur(),absent=nurse.value,reason=reasonField.value,editing=!!editingAbsenceId;
  if(!staffingFormMatchesNight(nurse,base.date))return;
  if(!absent){markInvalid('absentName',true);formMessage('absenceFormMessage','Select the absent nurse before saving.','error');nurse.focus();return}
  markInvalid('absentName',false);
  return saveStaffingRecord('absence',base,'absence:add:'+base.date+':'+canonicalNurseName(absent)+':'+reason,function(commandId,expectedSyncRevision){
    return supa.rpc('record_night_absence_v49',{p_operation_id:commandId,p_expected_sync_revision:expectedSyncRevision,p_client_version:APP_VERSION,p_roster_date:base.date,p_absent_name:absent,p_reason:reason});
  },function(){
    return changesFor(base.date).some(function(entry){return sameNurse(entry.absent_name,absent)&&entry.reason===reason});
  },'Absence saved for '+professionalName(absent),editing?null:function(){return undoAddedAbsence(base.date,absent)});
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
  var nurse=byId('overtimeName');
  if(staffingSaveInFlight||!nurse||!requireOnline())return;
  var base=cur(),name=normaliseNurseName(nurse.value);
  if(!staffingFormMatchesNight(nurse,base.date))return;
  if(!name){markInvalid('overtimeName',true);formMessage('overtimeFormMessage','Type the overtime nurse\'s name before adding.','error');toast('Type the overtime nurse\'s name first');byId('overtimeName').focus();return}
  if(activeNames(base).some(function(n){return n.toLowerCase()===name.toLowerCase()})){formMessage('overtimeFormMessage',name+' is already rostered for this night.','error');toast(name+' is already assigned on this night');return}
  if(overtimeFor(base.date).some(function(o){return o.nurse_name.toLowerCase()===name.toLowerCase()})){formMessage('overtimeFormMessage',name+' is already on the overtime list.','error');toast(name+' is already listed for overtime');return}
  var similar=overtimeFor(base.date).find(function(o){var a=o.nurse_name.trim().toLowerCase(),b=name.toLowerCase();return a.indexOf(b+' ')===0||b.indexOf(a+' ')===0});
  if(similar&&!confirm(name+' may be the same person as '+similar.nurse_name+'. Add both names as separate overtime nurses?')){formMessage('overtimeFormMessage','Check the existing entry for '+similar.nurse_name+' before adding another name.','error');return}
  markInvalid('overtimeName',false);
  await saveStaffingRecord('overtime',base,'overtime:add:'+base.date+':'+canonicalNurseName(name),function(commandId,expectedSyncRevision){
    return supa.rpc('add_night_overtime_v49',{p_operation_id:commandId,p_expected_sync_revision:expectedSyncRevision,p_client_version:APP_VERSION,p_roster_date:base.date,p_nurse_name:name});
  },function(){
    return overtimeFor(base.date).some(function(entry){return sameNurse(entry.nurse_name,name)});
  },name+' added for overtime',function(){return undoAddedOvertime(base.date,name)},function(){rememberOvertimeName(name)});
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
  if(!key||plan.coverageChoices.indexOf(key)<0){formMessage('coverAllocationFeedback','Choose the allocation the reliever will cover.','error');toast('Choose the allocation the reliever will cover');return}
  setSync('saving','Saving reliever allocation');
  var result=await runRosterMutation('five-cover:'+base.date+':'+key,function(commandId,expectedSyncRevision){return supa.rpc('apply_staffing_allocations_v49',{p_operation_id:commandId,p_expected_sync_revision:expectedSyncRevision,p_client_version:APP_VERSION,p_roster_date:base.date,p_action:'reliever',p_coverage_key:key,p_assignments:null,p_reliever_name:base.reliever})},function(){var stored=fiveCoverFor(base.date);return !!(stored&&stored.coverage_key===key)});
  if(rpcError(result,'coverAllocationFeedback'))return;await loadSharedData();notifyRosterUpdate('allocation',base.date);toast(base.reliever+' saved before the overtime allocations');
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
  var button=event&&event.currentTarget||byId('saveAllocationsBtn'),base,chosen={},chosenCount=0,confirmationOnly=false;
  var buttonLabel=button.textContent.trim()||(button.id==='saveCoverAllocationsBtn'?'Save and share cover':'Confirm and share changes');
  formMessage('allocationFormMessage','Preparing your allocations…','');
  try{
    if(!requireOnline()){formMessage('allocationFormMessage','Reconnect to the internet, then try saving again.','error');return false}
    base=cur();
    var currentPlan=staffingPlan(base);
    if(currentPlan.requiresSeventhDecision){formMessage('allocationFormMessage','Choose whether to use the seventh rotation or keep the permanent nurse in their original role.','error');toast('Complete the seventh-nurse decision first');var decisionCard=document.querySelector('.seventhDecisionCard');if(decisionCard)decisionCard.scrollIntoView({behavior:'smooth',block:'center'});return false}
    var selection=selectedCoverAssignments(base,currentPlan);
    if(currentPlan.requiresCoverageChoice||selection.missing.length){
      formMessage('allocationFormMessage','Choose a different nurse for each open role before saving.','error');
      return false;
    }
    var pagerForm=pagerOrderForm(base,currentPlan);
    if(usesAgreedPagerOrder(base.date,currentPlan.count)&&(!pagerForm||!pagerForm.first)){
      formMessage('allocationFormMessage','Choose who agreed to take Pager First Part before saving.','error');
      var pagerSelect=byId('twoNursePagerFirst');if(pagerSelect)pagerSelect.focus();
      return false;
    }
    var pagerOrder=pagerForm&&pagerForm.needsSave?pagerForm:null;
    chosen=selection.assignments;
    chosenCount=Object.keys(chosen).length;
    confirmationOnly=!chosenCount&&currentPlan.coreComplete&&!currentPlan.requiresCoverageChoice&&!currentPlan.requiresSeventhDecision&&!currentPlan.unresolved.length;
    if(!chosenCount&&!confirmationOnly){formMessage('allocationFormMessage','Complete the remaining allocation decisions before confirming the plan.','error');toast('The plan is not ready to confirm');return false}
    allocationSaveInFlight=true;setSync('saving','Saving this night\'s allocations');button.disabled=true;button.textContent='Saving…';formMessage('allocationFormMessage',pagerOrder?'Saving Pager parts…':'Saving '+chosenCount+' allocation'+(chosenCount===1?'':'s')+'…','');
    var activePagerSelect=byId('twoNursePagerFirst');if(activePagerSelect)activePagerSelect.disabled=true;
    var expectedRevision=nightPlanStatuses[base.date]?Number(nightPlanStatuses[base.date].revision||0):0;
    var atomicResult=await runRosterMutation('plan:finalise:'+base.date+':'+expectedRevision,function(commandId,expectedSyncRevision){return supa.rpc('finalise_night_plan_v49',{p_operation_id:commandId,p_expected_sync_revision:expectedSyncRevision,p_client_version:APP_VERSION,p_roster_date:base.date,p_assignments:chosenCount?chosen:{},p_labour_first:pagerOrder?pagerOrder.first:null,p_labour_second:pagerOrder?pagerOrder.second:null,p_expected_revision:expectedRevision})},function(){var status=nightPlanStatuses[base.date],savedPlan=staffingPlan(baseForDate(base.date)),matches=Object.keys(chosen).every(function(key){return savedPlan.validAssignments.some(function(item){return item.allocation_key===key&&String(item.id)===String(chosen[key])})});var savedOrder=pagerOrder&&labourOrders[base.date];return !!(status&&status.published_at&&Number(status.revision||0)>expectedRevision&&matches&&(!pagerOrder||savedOrder&&sameNurse(savedOrder.first_part_name,pagerOrder.first)&&sameNurse(savedOrder.second_part_name,pagerOrder.second)))});
    if(!missingRpc(atomicResult)){
      if(atomicResult&&atomicResult.error&&(rosterErrorCode(atomicResult.error)==='ROSTER_REVISION_CONFLICT'||/changed on another device|revision conflict|ROSTER_REVISION_CONFLICT/i.test(atomicResult.error.message||''))){var conflictMessage=conflictNotice(atomicResult);formMessage('allocationFormMessage',conflictMessage,'error');toast('A newer plan was loaded for review');await loadSharedData();return false}
      if(rpcError(atomicResult,'allocationFormMessage'))return false;
    }else if(confirmationOnly||pagerOrder){formMessage('allocationFormMessage','The plan could not be saved. Refresh the app and try again.','error');toast('Plan confirmation is unavailable');return false
    }else if(chosenCount){
      var result=await runRosterMutation('plan:legacy-allocations:'+base.date,function(commandId,expectedSyncRevision){return supa.rpc('apply_staffing_allocations_v49',{p_operation_id:commandId,p_expected_sync_revision:expectedSyncRevision,p_client_version:APP_VERSION,p_roster_date:base.date,p_action:'allocations',p_coverage_key:null,p_assignments:chosen,p_reliever_name:base.reliever})},function(){var savedPlan=staffingPlan(baseForDate(base.date));return Object.keys(chosen).every(function(key){return savedPlan.validAssignments.some(function(item){return item.allocation_key===key&&String(item.id)===String(chosen[key])})})});
      if(missingRpc(result)){formMessage('allocationFormMessage','The allocation service is unavailable. Ask the administrator to apply database schema 35. Nothing was changed.','error');toast('Allocation service requires a database update');return false}
      if(rpcError(result,'allocationFormMessage'))return false;
      var check=await timedRequest(readStoredAllocations(base.date,chosen));
      if(check.error){rpcError(check,'allocationFormMessage');return false}
      if(!check.matches){formMessage('allocationFormMessage','The database did not retain every selected allocation. Reload the latest plan and try again.','error');toast('Allocations need to be reviewed again');await loadSharedData();return false}
    }
    if(!pagerOrder){delete allocationDrafts[base.date];delete labourOrderDrafts[base.date];delete seventhDecisionDrafts[base.date];}
    await loadSharedData();
    if(pagerOrder){
      var storedOrder=labourOrders[base.date];
      if(!storedOrder||!sameNurse(storedOrder.first_part_name,pagerOrder.first)||!sameNurse(storedOrder.second_part_name,pagerOrder.second)){
        formMessage('allocationFormMessage','The Pager save could not be verified. Refresh the roster and check before trying again.','error');
        return false;
      }
    }
    if(pagerOrder){delete allocationDrafts[base.date];delete labourOrderDrafts[base.date];delete seventhDecisionDrafts[base.date];}
    notifyRosterUpdate('allocation',base.date);var plan=staffingPlan(baseForDate(base.date)),saved=chosenCount-plan.unresolved.filter(function(key){return Object.prototype.hasOwnProperty.call(chosen,key)}).length;
    var success=pagerOrder?'Pager parts saved for everyone':plan.unresolved.length?(saved?saved+' allocation'+(saved===1?'':'s')+' saved':'No allocation saved')+' • '+plan.unresolved.length+' still to decide':confirmationOnly?'This night\'s plan confirmed for everyone':additionalNurses(plan).length?'Core plan published; additional staff remain as required':'This night\'s plan published for everyone';
    formMessage('allocationFormMessage',success,'success');showButtonConfirmation(button,buttonLabel);toast(success);return false;
  }catch(error){setSync('error','Save failed');formMessage('allocationFormMessage','Save stopped: '+(error&&error.message==='timeout'?'the connection timed out. Your selections are still here.':'the allocations could not be confirmed. Your selections are still here.'),'error');failedAction('The allocations could not be saved.',function(){return saveFinalAllocationsV2510()});return false}
  finally{allocationSaveInFlight=false;if(button&&button.isConnected)button.textContent=buttonLabel;updateAllocationSaveControl(cur());if(base&&cur().date===base.date&&usesAgreedPagerOrder(base.date,staffingPlan(base).count))updateChangesWorkflow(cur(),staffingPlan(cur()));updateOfflineControls()}
}

function invalidateNightHistory(date){
  var dates=date?[date]:Object.keys(historyLoadedDates).concat(Object.keys(historyLoadingDates));
  dates.filter(function(value,index){return dates.indexOf(value)===index}).forEach(function(value){historyLoadedDates[value]=false;historyInvalidationVersions[value]=Number(historyInvalidationVersions[value]||0)+1;delete historyErrorDates[value]});
}

async function loadNightHistory(date,renderAfter,append){
  if(!date||historyLoadingDates[date])return;
  historyLoadingDates[date]=true;delete historyErrorDates[date];
  var generation=Number(historyInvalidationVersions[date]||0),client=supa;
  try{
    if(Number(schemaVersion||0)>=50){
      var cursor=append&&historyPageState[date]?historyPageState[date]:{},page=await supa.rpc('night_history_page_v50',{p_roster_date:date,p_before_at:cursor.next_before_at||null,p_before_id:cursor.next_before_id||null,p_limit:50});
      if(page.error)throw page.error;
      if(client!==supa||generation!==Number(historyInvalidationVersions[date]||0))return;
      var data=page.data||{},items=Array.isArray(data.items)?data.items:[],changes=[],overtime=[],roles=[];
      items.forEach(function(item){var payload=item&&item.payload;if(!plainSnapshotRecord(payload))return;if(item.source==='absence')changes.push(payload);else if(item.source==='overtime')overtime.push(payload);else if(item.source==='roles')roles.push(payload)});
      if(append){changeHistory[date]=(changeHistory[date]||[]).concat(changes);overtimeHistory[date]=(overtimeHistory[date]||[]).concat(overtime);roleOverrideHistory[date]=(roleOverrideHistory[date]||[]).concat(roles)}
      else{changeHistory[date]=changes;overtimeHistory[date]=overtime;roleOverrideHistory[date]=roles}
      historyPageState[date]={has_more:!!data.has_more,next_before_at:data.next_before_at||null,next_before_id:data.next_before_id||null};
    }else{
      var results=await Promise.all([supa.from('night_change_history').select('*').eq('roster_date',date).order('changed_at',{ascending:false}).limit(50),supa.from('night_overtime_history').select('*').eq('roster_date',date).order('changed_at',{ascending:false}).limit(50),nightRoleOverrideAvailable?supa.from('night_role_override_history').select('*').eq('roster_date',date).order('changed_at',{ascending:false}).limit(50):Promise.resolve({data:[],error:null})]);
      if(results.some(function(x){return x.error}))throw results.find(function(x){return x.error}).error;
      if(client!==supa||generation!==Number(historyInvalidationVersions[date]||0))return;
      changeHistory[date]=results[0].data||[];overtimeHistory[date]=results[1].data||[];roleOverrideHistory[date]=results[2].data||[];historyPageState[date]={has_more:false,next_before_at:null,next_before_id:null};
    }
    historyLoadedDates[date]=true;
  }catch(error){
    if(client===supa&&generation===Number(historyInvalidationVersions[date]||0)){historyErrorDates[date]=true;recordAppDiagnostic('history','load',error&&error.code||'error')}
  }finally{
    delete historyLoadingDates[date];
    if(client===supa&&currentUserProfile&&cur().date===date){
      if(generation!==Number(historyInvalidationVersions[date]||0))ensureNightHistory(date);
      if(renderAfter!==false){renderRecentActivity(date);renderChanges(cur())}
    }
  }
}

function ensureNightHistory(date){if(!historyLoadedDates[date]&&!historyErrorDates[date]&&navigator.onLine&&!forcedOfflineSession)loadNightHistory(date,true,false)}
function loadMoreNightHistory(date){if(historyPageState[date]&&historyPageState[date].has_more)return loadNightHistory(date,true,true)}

