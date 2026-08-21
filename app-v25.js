/* Anaesthetic Night Roster V25 reliability and workflow refinements. */
var historyExpandedDates={};
var historyLoadedDates={};
var historyLoadingDates={};
var sharedLoadPromise=null;
var sharedReloadPending=false;
var reloadTimer=null;
var updateRegistration=null;
var reloadForUpdate=false;
var pendingRemovals={};
var labourOrders={};
var labourOrderAvailable=true;

function cur(){
  var base=localCur();
  var merged=Object.assign({},base,sharedRoster[base.date]||{});
  merged.mode='6';
  return merged;
}

function baseForDate(date){
  var original=R.find(function(r){return r.date===date})||cur();
  var merged=Object.assign({},original,sharedRoster[date]||{});
  merged.mode='6';
  return merged;
}

function staffingPlan(base){
  var changes=changesFor(base.date),overtime=overtimeFor(base.date),absentKeys=[],openKeys=[],legacyCover=0;
  changes.forEach(function(c){
    var key=allocationKeyForName(base,c.absent_name);
    if(!key)return;
    if(absentKeys.indexOf(key)<0)absentKeys.push(key);
    if(c.replacement_name)legacyCover++;
    else if(openKeys.indexOf(key)<0)openKeys.push(key);
  });
  var count=6-absentKeys.length+legacyCover+overtime.length;
  if(count>=7&&openKeys.indexOf('seventh')<0)openKeys.push('seventh');
  var coverageKey=null,coverageChoices=[],coverageSource='';
  if(count===5&&openKeys.length){
    if(openKeys.indexOf('reliever')>=0){coverageKey='reliever';coverageSource='automatic'}
    else if(openKeys.indexOf('pager')>=0){coverageKey='pager';coverageSource='automatic'}
    else{
      coverageChoices=openKeys.filter(function(key){return['first1','first2','second1','second2'].indexOf(key)>=0});
      var stored=fiveCoverFor(base.date);
      if(coverageChoices.length===1){coverageKey=coverageChoices[0];coverageSource='automatic'}
      else if(stored&&coverageChoices.indexOf(stored.coverage_key)>=0){coverageKey=stored.coverage_key;coverageSource='saved'}
    }
  }
  var requiresCoverageChoice=count===5&&coverageChoices.length>1&&!coverageKey;
  var availableKeys=requiresCoverageChoice?[]:openKeys.filter(function(key){return key!==coverageKey});
  var validAssignments=overtime.filter(function(o){return availableKeys.indexOf(o.allocation_key)>=0});
  var assignedIds=validAssignments.map(function(o){return o.id});
  var unassigned=overtime.filter(function(o){return assignedIds.indexOf(o.id)<0});
  var unresolved=availableKeys.filter(function(key){return !validAssignments.some(function(o){return o.allocation_key===key})});
  var coreComplete=!requiresCoverageChoice&&unresolved.length===0&&count>=5;
  return{changes:changes,overtime:overtime,absentKeys:absentKeys,openKeys:openKeys,availableKeys:availableKeys,count:count,coverageKey:coverageKey,coverageChoices:coverageChoices,coverageSource:coverageSource,requiresCoverageChoice:requiresCoverageChoice,validAssignments:validAssignments,unassigned:unassigned,unresolved:unresolved,coreComplete:coreComplete,extraCount:Math.max(0,count-7),complete:coreComplete};
}

function additionalNurses(plan){
  return plan.count>7&&plan.coreComplete?plan.unassigned.slice():[];
}

function planIsProvisional(base){
  var plan=staffingPlan(base);
  return plan.count<5||plan.requiresCoverageChoice||plan.unresolved.length>0;
}

function applyChanges(r){
  var copy=Object.assign({},r),fields=['first1','first2','second1','second2','pager','reliever','fullLW','seventh'];
  copy.mode='6';
  var changes=changesFor(r.date),plan=staffingPlan(copy);
  changes.filter(function(c){return c.replacement_name}).forEach(function(change){
    fields.forEach(function(k){if(copy[k]===change.absent_name)copy[k]=change.replacement_name});
  });
  plan.validAssignments.forEach(function(o){copy[o.allocation_key]=o.nurse_name});
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
    if(plan.count<5)copy.understaffedCount=plan.count;
    return copy;
  }
  if(plan.count===5&&plan.coverageKey){applyFiveVacancy(copy,plan.coverageKey);copy.staffingAdjusted=true;copy.pendingAllocations=[];return copy}
  if(plan.unresolved.length>1){
    plan.unresolved.forEach(function(key){copy[key]='Uncovered • additional cover required'});
    copy.mode='5';copy.staffingAdjusted=true;copy.understaffedCount=plan.count;copy.pendingAllocations=plan.unresolved.slice();
  }
  return copy;
}

function effective(r){
  var count=r.understaffedCount||staffingPlan(baseForDate(r.date)).count,alert;
  if(count<5)alert=count+' nurses currently recorded: additional overtime cover is required before the allocation and breaks can be finalised.';
  else if(r.mode==='5')alert='5-person model: '+r.fullLW+' covers Labour Ward / Pager 00:00–07:00.';
  else if(count>7)alert=count+' nurses recorded: the core seven-person arrangement is shown, with additional staff allocated as required.';
  else if(r.mode==='7')alert='7-person model: '+r.seventh+' is the floating extra nurse.';
  else alert='6-person model: Labour Ward / Pager is shared between '+r.pager+' and '+r.reliever+'.';
  return{display:r.mode,fullLW:r.fullLW,alert:alert};
}

function labourOrderFor(r){
  if(!r||r.mode==='5')return null;
  var order=labourOrders[r.date];if(!order)return null;
  var expected=[String(r.pager).toLowerCase(),String(r.reliever).toLowerCase()].sort().join('|');
  var stored=[String(order.first_part_name).toLowerCase(),String(order.second_part_name).toLowerCase()].sort().join('|');
  return expected===stored?order:null;
}

function labourRoleDetail(name,r){
  var order=labourOrderFor(r);
  if(!order)return'Labour Ward part and break to decide';
  if(String(order.first_part_name).toLowerCase()===String(name).toLowerCase())return'Labour Ward first part • Second break';
  return'Labour Ward second part • First break';
}

function render(){
  if(!R.length||!currentUserProfile)return;
  var base=cur(),plan=staffingPlan(base),r=applyChanges(base),e=effective(r),count=plan.count;
  var labourPending=r.mode!=='5'&&!planIsProvisional(base)&&!labourOrderFor(r);
  var roles=[['bFirst','First part',r.first1+' + '+r.first2,'Works 00:00–03:30 • Second break'],['bSecond','Second part',r.second1+' + '+r.second2,'Works 03:30–07:00 • First break']];
  if(r.mode!=='5'){
    roles.push(['bPager','Pager',r.pager,labourRoleDetail(r.pager,r)]);
    roles.push(['bReliever','Reliever',r.reliever,labourRoleDetail(r.reliever,r)]);
  }
  syncDateInputs(base.date);renderMyName();renderHeaderSummary(r);
  byId('modeStatus').textContent=count+' nurse'+(count===1?'':'s');
  byId('breakModeStatus').textContent=count+' nurse'+(count===1?'':'s');
  var alertClass=count<6?'warn':'';
  byId('alerts').innerHTML='<div class="alert '+alertClass+'">'+esc(e.alert)+'</div>'+(plan.unresolved.length?'<div class="alert gold">'+plan.unresolved.length+' allocation'+(plan.unresolved.length===1?' still requires':'s still require')+' overtime cover or a final role decision.</div>':'')+(labourPending?'<div class="alert gold">Labour Ward first and second parts still need to be saved.</div>':'');
  if(r.mode==='7')roles.push(['b7','7th nurse',r.seventh,'Additional nurse • Break as required']);
  byId('roles').innerHTML=roles.map(function(c){return '<div class="role '+c[0].replace(/^b/,'r')+' '+(isMine(c[2])?'mine':'')+'"><div class="badge '+c[0]+'">'+esc(c[1])+'</div><div><div class="name">'+esc(c[2])+'</div><div class="time">'+esc(c[3])+'</div></div></div>'}).join('');
  var extras=additionalNurses(plan);
  if(extras.length)byId('roles').insertAdjacentHTML('beforeend','<div class="additionalStaff"><b>Additional staff • allocation as required</b>'+extras.map(function(o){return '<span class="additionalName">'+esc(o.nurse_name)+'</span>'}).join('')+'</div>');
  byId('fiveArrangement').innerHTML=fiveArrangementHtml(r);
  localStorage.setItem('anaes_selected_date',base.date);
  renderChanges(base);renderRoster();renderBreaks();setOutputState(base,plan);
  if(currentUserProfile.user_role==='admin')renderAdmin();
  ensureNightHistory(base.date);updateNetworkStatus();save();
}

function earliestOvertimeAdd(date,name){
  var matches=(overtimeHistory[date]||[]).filter(function(h){return h.action==='added'&&String(h.nurse_name).toLowerCase()===String(name).toLowerCase()});
  matches.sort(function(a,b){return new Date(a.changed_at)-new Date(b.changed_at)});
  return matches[0]||null;
}

function updateLabourSecondSummary(){
  var pick=byId('labourFirstPick'),summary=byId('labourSecondSummary');if(!pick||!summary)return;
  var names=JSON.parse(pick.getAttribute('data-labour-names')||'[]'),second=names.find(function(name){return name!==pick.value})||'';
  summary.innerHTML='<b>Second part</b><span>'+esc(second)+' • First break</span>';
}

function renderLabourOrder(base,plan){
  var host=byId('labourOrderStep');if(!host)return;
  var r=applyChanges(base);
  if(r.mode==='5'){host.innerHTML='';return}
  if(!labourOrderAvailable){host.innerHTML='<div class="labourOrderBox"><h3>Labour Ward order</h3><div class="alert warn">Run the Labour Ward order SQL migration in Supabase to save first and second parts across devices.</div></div>';return}
  if(planIsProvisional(base)){host.innerHTML='<div class="labourOrderBox"><h3>Labour Ward order</h3><div class="time">Complete the required Pager and Reliever allocations first. Their Labour Ward parts can then be divided.</div></div>';return}
  var names=[r.pager,r.reliever],order=labourOrderFor(r),first=order?order.first_part_name:names[0],second=names.find(function(name){return name!==first})||names[1];
  host.innerHTML='<div class="labourOrderBox"><h3>Labour Ward order</h3><div class="time">Choose who works the first part. The other Labour Ward nurse will work the second part automatically.</div><label>First part<select id="labourFirstPick" data-labour-names="'+esc(JSON.stringify(names))+'">'+names.map(function(name){return'<option value="'+esc(name)+'" '+(name===first?'selected':'')+'>'+esc(name)+'</option>'}).join('')+'</select></label><div class="labourOrderGrid"><div class="labourOrderResult"><b>First part</b><span>'+esc(first)+' • Second break</span></div><div class="labourOrderResult" id="labourSecondSummary"><b>Second part</b><span>'+esc(second)+' • First break</span></div></div><button class="primary wide" id="saveLabourOrderBtn" type="button">'+(order?'Update':'Save')+' Labour Ward order</button></div>';
  byId('labourFirstPick').onchange=function(){var firstResult=host.querySelector('.labourOrderResult');if(firstResult)firstResult.innerHTML='<b>First part</b><span>'+esc(this.value)+' • Second break</span>';updateLabourSecondSummary()};
  byId('saveLabourOrderBtn').onclick=saveLabourOrder;
}

async function saveLabourOrder(){
  if(!requireOnline())return;
  var base=cur(),r=applyChanges(base),pick=byId('labourFirstPick');if(!pick)return;
  var names=[r.pager,r.reliever],first=pick.value,second=names.find(function(name){return name!==first});
  if(!first||!second){toast('Both Labour Ward nurses must be allocated first');return}
  var button=byId('saveLabourOrderBtn');button.disabled=true;button.textContent='Saving…';setSync('saving','Saving Labour Ward order');
  try{
    var result=await timedRequest(supa.from('night_labour_order').upsert({roster_date:base.date,first_part_name:first,second_part_name:second,updated_by:currentUserProfile.display_name,updated_at:new Date().toISOString()},{onConflict:'roster_date'}));
    if(result.error){rpcError(result);return}
    await loadSharedData();toast(first+' saved for first part • '+second+' saved for second part');
  }catch(error){setSync('error','Save failed');toast('The Labour Ward order could not be saved. Please try again.');}
  finally{if(button&&button.isConnected){button.disabled=false;button.textContent='Save Labour Ward order'}}
}

function renderChanges(base){
  var changes=changesFor(base.date),absentLower=changes.map(function(c){return c.absent_name.toLowerCase()}),names=activeNames(base).filter(function(n){return absentLower.indexOf(n.toLowerCase())<0});
  var overtime=overtimeFor(base.date),plan=staffingPlan(base),history=staffingHistoryFor(base.date),expanded=!!historyExpandedDates[base.date];
  byId('absentName').innerHTML=names.length?'<option value="">Choose a nurse</option>'+names.map(function(n){return '<option value="'+esc(n)+'">'+esc(n)+'</option>'}).join(''):'<option value="">Every rostered nurse is already absent</option>';
  byId('saveChangeBtn').disabled=!names.length||!navigator.onLine;
  byId('changeList').innerHTML=changes.length?changes.map(function(c){return '<div class="changeItem"><div><div><b>'+esc(c.absent_name)+'</b> <span class="changeArrow">•</span> <b>Absent</b></div><div class="changeMeta">'+esc(c.reason||'Absence')+' • Updated by '+esc(c.updated_by||'Shift member')+' at '+esc(shortTime(c.updated_at))+'</div></div><div><button class="mini editReason" data-edit-change="'+esc(c.id)+'">Edit</button><button class="mini" data-remove-change="'+esc(c.id)+'" aria-label="Remove absence">Remove</button></div></div>'}).join(''):'<div class="time">No absences recorded for this night.</div>';
  var extraIds=additionalNurses(plan).map(function(o){return o.id});
  byId('overtimeList').innerHTML=overtime.length?overtime.map(function(o){
    var valid=plan.availableKeys.indexOf(o.allocation_key)>=0,extra=extraIds.indexOf(o.id)>=0,status=extra?'Additional staff • as required':valid?allocationLabel(o.allocation_key):'Awaiting allocation';
    var added=earliestOvertimeAdd(base.date,o.nurse_name),when=added?added.changed_at:o.updated_at,who=added?added.changed_by:o.updated_by;
    return '<div class="overtimeItem"><div class="overtimeTop"><div><div class="overtimeName">'+esc(o.nurse_name)+'</div><span class="overtimeStatus '+(valid||extra?'assigned':'')+'">'+esc(status)+'</span><div class="changeMeta">Added by '+esc(who||'Shift member')+' at '+esc(shortTime(when))+'</div></div><button class="mini" data-remove-overtime="'+esc(o.id)+'">Remove</button></div></div>';
  }).join(''):'<div class="time">No overtime nurses recorded for this night.</div>';
  byId('fiveCoverStep').innerHTML=fiveCoverHtml(base,plan);
  var extras=additionalNurses(plan),summary;
  if(plan.requiresCoverageChoice)summary='<b>'+plan.count+' nurses expected tonight</b><div class="time">Choose and save the reliever allocation first. The remaining positions will then appear for the overtime nurses.</div>';
  else if(!overtime.length)summary='<b>No overtime allocation required yet</b><div class="time">Add overtime nurses only when they are confirmed as available.</div>';
  else if(plan.unresolved.length)summary='<b>'+plan.count+' nurses expected tonight</b><div class="time">'+plan.unresolved.length+' required allocation'+(plan.unresolved.length===1?' remains':'s remain')+' to be decided.</div>';
  else if(extras.length)summary='<b>Core allocations finalised</b><div class="time">'+extras.length+' additional nurse'+(extras.length===1?' remains':'s remain')+' available as required.</div>';
  else summary='<b>Required allocations finalised</b><div class="time">The reliever and overtime allocations are complete.</div>';
  byId('allocationSummary').innerHTML=summary;
  byId('allocationList').innerHTML=overtime.length&&plan.availableKeys.length?plan.availableKeys.map(function(key){
    var assigned=plan.validAssignments.find(function(o){return o.allocation_key===key});
    var options='<option value="">To decide during the shift</option>'+overtime.map(function(o){return '<option value="'+esc(o.id)+'" '+(assigned&&assigned.id===o.id?'selected':'')+'>'+esc(o.nurse_name)+'</option>'}).join('');
    return '<div class="allocationRow"><div><div class="allocationRole">'+esc(allocationLabel(key))+'</div><div class="allocationBreak">'+esc(allocationBreak(key))+'</div></div><select data-final-allocation="'+esc(key)+'" aria-label="Choose nurse for '+esc(allocationLabel(key))+'">'+options+'</select></div>';
  }).join(''):plan.requiresCoverageChoice?'<div class="time">The overtime choices will appear after the reliever allocation is saved.</div>':'<div class="time">There are no required allocations to finalise.</div>';
  byId('saveAllocationsBtn').classList.toggle('hidden',!overtime.length||!plan.availableKeys.length);
  renderLabourOrder(base,plan);
  var visible=expanded?history:history.slice(0,15);
  byId('changeHistory').innerHTML=history.length?visible.map(function(h){return '<div class="historyItem"><div><span class="historyType '+esc(h.type)+'">'+esc(h.label)+'</span><b>'+esc(h.title)+'</b></div><div class="changeMeta">'+esc(h.detail||'')+' • '+esc(h.changed_by||'Shift member')+' • '+esc(shortTime(h.changed_at))+'</div></div>'}).join('')+(history.length>15?'<button class="historyMore" id="historyMoreBtn" type="button">'+(expanded?'Show recent changes':'Show full history ('+history.length+')')+'</button>':''):'<div class="time">No staffing change history for this night.</div>';
  Array.prototype.forEach.call(document.querySelectorAll('[data-remove-change]'),function(b){b.onclick=function(){removeNightChange(b.getAttribute('data-remove-change'),b)}});
  Array.prototype.forEach.call(document.querySelectorAll('[data-edit-change]'),function(b){b.onclick=function(){editNightChange(b.getAttribute('data-edit-change'))}});
  Array.prototype.forEach.call(document.querySelectorAll('[data-remove-overtime]'),function(b){b.onclick=function(){removeOvertime(b.getAttribute('data-remove-overtime'),b)}});
  var coverButton=byId('saveFiveCoverBtn');if(coverButton)coverButton.onclick=saveFiveCover;
  var more=byId('historyMoreBtn');if(more)more.onclick=function(){historyExpandedDates[base.date]=!expanded;renderChanges(base)};
  updateOfflineControls();
}

function editNightChange(id){
  var item=changesFor(cur().date).find(function(c){return c.id===id});
  if(!item)return;
  var option=document.createElement('option');option.value=item.absent_name;option.textContent=item.absent_name+' • edit existing';
  byId('absentName').prepend(option);byId('absentName').value=item.absent_name;byId('changeReason').value=item.reason||'Leave';
  byId('saveChangeBtn').disabled=!navigator.onLine;byId('saveChangeBtn').textContent='Update absence';
  byId('absentName').scrollIntoView({behavior:'smooth',block:'center'});
}

function breakData(r){
  var base=baseForDate(r.date),plan=staffingPlan(base);
  if(plan.count<5)return{first:[],second:[],notes:['Breaks cannot be finalised while only '+plan.count+' nurses are recorded. Add sufficient overtime cover and complete the allocations first.']};
  var first=[r.second1,r.second2],second=[r.first1,r.first2],notes=[];
  if(r.mode==='5')notes.push(r.fullLW+' covers Labour Ward / Pager for the full night and decides their own break when safe.');
  else{
    var order=labourOrderFor(r);
    if(order){
      first.push(order.second_part_name);second.push(order.first_part_name);
      notes.push('First part Labour Ward / Pager: '+order.first_part_name+' • Second break.');
      notes.push('Second part Labour Ward / Pager: '+order.second_part_name+' • First break.');
    }else{
      notes.push(r.pager+' and '+r.reliever+' still need to decide who works each part of Labour Ward / Pager.');
      notes.push('Whoever works the first part takes second break. Whoever works the second part takes first break.');
    }
    if(r.mode==='7')notes.push(r.seventh+' is the 7th nurse and takes a break as required.');
    var extras=additionalNurses(plan);if(extras.length)notes.push(extras.map(function(o){return o.nurse_name}).join(' + ')+' remain additional staff and take breaks as required.');
  }
  return{first:first,second:second,notes:notes};
}

function renderBreaks(){
  var base=cur(),r=applyChanges(base),plan=staffingPlan(base),staffingPending=planIsProvisional(base),labourPending=r.mode!=='5'&&!labourOrderFor(r),pending=staffingPending||labourPending,count=plan.count,b=staffingPending?{first:[],second:[],notes:['Breaks are pending until the required staffing and allocations are finalised.']}:breakData(r);
  byId('breakDatePick').value=r.date;byId('breakModeStatus').textContent=count+' nurse'+(count===1?'':'s');
  byId('breakDate').innerHTML='<b>'+fmt(r.date)+'</b> • '+esc(count)+' nurses'+(pending?' • <span class="provisionalFlag">'+(labourPending&&!staffingPending?'Labour Ward order pending':'Pending')+'</span>':'');
  byId('breakList').innerHTML='<div class="breakGrid"><div class="breakGroup firstBreak"><h3>First break</h3>'+b.first.map(function(n){return '<div class="breakPerson">'+esc(n)+'</div>'}).join('')+(b.first.length?'':'<div class="breakNote">Pending final allocation</div>')+'</div><div class="breakGroup secondBreak"><h3>Second break</h3>'+b.second.map(function(n){return '<div class="breakPerson">'+esc(n)+'</div>'}).join('')+(b.second.length?'':'<div class="breakNote">Pending final allocation</div>')+'</div></div><div class="breakGroup lwBreak"><h3>Labour Ward / Pager'+(r.mode==='7'?' and additional staffing':'')+'</h3>'+b.notes.map(function(n){return '<div class="breakNote">'+esc(n)+'</div>'}).join('')+'</div>';
  highlightNamed('breakList','.breakPerson');
}

function setOutputState(base,plan){
  var r=applyChanges(base),pending=planIsProvisional(base)||(r.mode!=='5'&&!labourOrderFor(r));
  Array.prototype.forEach.call(document.querySelectorAll('.emailRosterBtn'),function(button){var span=button.querySelector('span');if(span)span.textContent=pending?'Email provisional roster':'Email roster and breaks';button.classList.toggle('buttonPending',pending)});
  var copy=byId('copyBreaksBtn');if(copy){var span=copy.querySelector('span');if(span)span.textContent=pending?'Copy breaks pending':'Copy breaks';copy.classList.toggle('buttonPending',pending)}
}

async function copyBreaks(){
  var base=cur(),r=applyChanges(base),plan=staffingPlan(base),staffingPending=planIsProvisional(base),pending=staffingPending||(r.mode!=='5'&&!labourOrderFor(r)),b=staffingPending?{first:[],second:[],notes:['Breaks pending until staffing and allocations are finalised.']}:breakData(r);
  var txt=(pending?'PROVISIONAL • ':'')+fmt(r.date)+' Breaks • '+plan.count+' nurses\nFirst break: '+(b.first.join(' + ')||'Pending')+'\nSecond break: '+(b.second.join(' + ')||'Pending')+'\n'+b.notes.join('\n');
  try{await navigator.clipboard.writeText(txt);toast(pending?'Pending break plan copied':'Breaks copied')}catch(e){alert(txt)}
}

function emailRoster(){
  var base=cur(),r=applyChanges(base),b=breakData(r),changes=changesFor(r.date),overtime=overtimeFor(r.date),plan=staffingPlan(base),staffingPending=planIsProvisional(base),pending=staffingPending||(r.mode!=='5'&&!labourOrderFor(r)),extras=additionalNurses(plan);
  if(pending&&!confirm('Some staffing or allocations are still undecided. Open a clearly marked provisional email anyway?'))return;
  if(staffingPending)b={first:[],second:[],notes:['Breaks pending until staffing and allocations are finalised.']};
  var subject=(pending?'PROVISIONAL - ':'')+'Anaesthetic Night Roster - '+fmt(r.date),lines=[pending?'PROVISIONAL ANAESTHETIC NIGHT ROSTER':'ANAESTHETIC NIGHT ROSTER',fmt(r.date)+' • '+plan.count+' nurses','','ROSTER','First part theatres: '+r.first1+' + '+r.first2,'Second part theatres: '+r.second1+' + '+r.second2];
  if(plan.count<5)lines.push('Allocation incomplete: additional overtime cover required');else if(r.mode==='5')lines.push('Full Labour Ward / Pager 00:00–07:00: '+r.fullLW);else{lines.push('Pager: '+r.pager,'Reliever: '+r.reliever);var lwOrder=labourOrderFor(r);if(lwOrder)lines.push('Labour Ward first part: '+lwOrder.first_part_name,'Labour Ward second part: '+lwOrder.second_part_name)}
  if(r.mode==='7')lines.push('7th nurse: '+r.seventh);
  if(extras.length)lines.push('Additional staff as required: '+extras.map(function(o){return o.nurse_name}).join(' + '));
  if(changes.length){lines.push('','ABSENCES');changes.forEach(function(c){lines.push(c.absent_name+' • '+(c.reason||'Unavailable'))})}
  if(overtime.length){lines.push('','OVERTIME NURSES');overtime.forEach(function(o){var allocated=plan.availableKeys.indexOf(o.allocation_key)>=0,extra=extras.some(function(x){return x.id===o.id});lines.push(o.nurse_name+' • '+(extra?'additional staff as required':allocated?allocationLabel(o.allocation_key):'allocation to decide'))})}
  lines.push('','BREAKS','First break: '+(b.first.join(' + ')||'Pending'),'Second break: '+(b.second.join(' + ')||'Pending'));Array.prototype.push.apply(lines,b.notes);
  if(r.notes)lines.push('','Notes: '+r.notes);
  window.location.href='mailto:?bcc='+encodeURIComponent(EMAIL_RECIPIENTS.join(','))+'&subject='+encodeURIComponent(subject)+'&body='+encodeURIComponent(lines.join('\n'));
}

function renderRoster(){
  var q=(byId('search').value||'').toLowerCase(),f=byId('filter').value||'all';
  byId('range').innerHTML='<b>'+R.length+'</b> published nights • '+fmt(R[0].date)+' to '+fmt(R[R.length-1].date);
  var html='';
  R.forEach(function(original,i){
    var base=Object.assign({},original,sharedRoster[original.date]||{});base.mode='6';
    var r=applyChanges(base),changes=changesFor(base.date),overtime=overtimeFor(base.date),plan=staffingPlan(base),count=plan.count,extras=additionalNurses(plan),liveCount=changes.length+overtime.length,labourPending=r.mode!=='5'&&!labourOrderFor(r);
    var status=planIsProvisional(base)?'Provisional • staffing decision required':labourPending?'Labour Ward order still required':liveCount?liveCount+' live staffing update'+(liveCount>1?'s':''):'Standard calculated rotation';
    var displayMode=String(Math.max(5,Math.min(7,count)));
    if(!((f==='all'||displayMode===f)&&(JSON.stringify(base)+' '+JSON.stringify(r)+' '+JSON.stringify(changes)+' '+JSON.stringify(overtime)).toLowerCase().indexOf(q)>-1))return;
    html+='<article class="card" role="button" tabindex="0" aria-label="Open roster for '+esc(fmt(r.date))+'" data-i="'+i+'"><div class="ctop"><div><div class="date">'+fmt(r.date)+'</div><div class="time">'+esc(status)+'</div></div><span class="pill mode'+esc(displayMode)+'">'+esc(count)+' nurses</span></div>';
    html+='<div class="row"><div class="lab">First part</div><div><span class="tag tFirst">'+esc(r.first1)+'</span><span class="tag tFirst">'+esc(r.first2)+'</span></div></div><div class="row"><div class="lab">Second part</div><div><span class="tag tSecond">'+esc(r.second1)+'</span><span class="tag tSecond">'+esc(r.second2)+'</span></div></div>';
    if(count<5)html+='<div class="row"><div class="lab">Status</div><div><b>Additional overtime cover required</b></div></div>';
    else if(r.mode==='5')html+='<div class="row"><div class="lab">Full LW / Pager</div><div><span class="tag tFull">'+esc(r.fullLW)+'</span></div></div>';
    else{html+='<div class="row"><div class="lab">Pager</div><div><span class="tag tPager">'+esc(r.pager)+'</span></div></div><div class="row"><div class="lab">Reliever</div><div><span class="tag tRel">'+esc(r.reliever)+'</span></div></div>';var order=labourOrderFor(r);if(order)html+='<div class="row"><div class="lab">LW first part</div><div><b>'+esc(order.first_part_name)+'</b> • Second break</div></div><div class="row"><div class="lab">LW second part</div><div><b>'+esc(order.second_part_name)+'</b> • First break</div></div>'}
    if(r.mode==='7')html+='<div class="row"><div class="lab">7th nurse</div><div><span class="tag t7">'+esc(r.seventh)+'</span></div></div>';
    if(extras.length)html+='<div class="row"><div class="lab">Additional</div><div>'+extras.map(function(o){return '<b>'+esc(o.nurse_name)+'</b> • as required'}).join('<br>')+'</div></div>';
    if(changes.length)html+='<div class="row"><div class="lab">Absences</div><div>'+changes.map(function(c){return esc(c.absent_name)+' • <b>'+esc(c.reason||'Unavailable')+'</b>'}).join('<br>')+'</div></div>';
    if(overtime.length)html+='<div class="row"><div class="lab">Overtime</div><div>'+overtime.map(function(o){var allocated=plan.availableKeys.indexOf(o.allocation_key)>=0,extra=extras.some(function(x){return x.id===o.id});return '<b>'+esc(o.nurse_name)+'</b> • '+(extra?'as required':allocated?esc(allocationLabel(o.allocation_key)):'allocation to decide')}).join('<br>')+'</div></div>';
    if(r.notes)html+='<div class="row"><div class="lab">Notes</div><div>'+esc(r.notes)+'</div></div>';html+='</article>';
  });
  byId('cards').innerHTML=html||'<div class="notice">No results.</div>';
  Array.prototype.forEach.call(document.querySelectorAll('.card[data-i]'),function(el){var open=function(){idx=Number(el.getAttribute('data-i'));show('today')};el.onclick=open;el.onkeydown=function(e){if(e.key==='Enter'||e.key===' '){e.preventDefault();open()}}});highlightNamed('cards','.tag');
}

function requireOnline(){
  if(navigator.onLine)return true;
  setSync('offline','Offline');toast('You are offline. Your entries remain on screen and can be saved after reconnecting.');return false;
}

function formMessage(id,message,state){
  var el=byId(id);if(!el)return;
  el.textContent=message||'';el.className='formMessage'+(state?' '+state:'');
}

function markInvalid(id,invalid){var el=byId(id);if(el)el.classList.toggle('fieldInvalid',!!invalid)}

function timedRequest(request){
  return Promise.race([Promise.resolve(request),new Promise(function(_,reject){setTimeout(function(){reject(new Error('timeout'))},15000)})]);
}

function missingRpc(result){
  if(!result||!result.error)return false;
  var message=(result.error.message||'').toLowerCase();
  return result.error.code==='PGRST202'||message.indexOf('could not find the function')>=0||message.indexOf('function public.')>=0&&message.indexOf('does not exist')>=0;
}

async function saveAbsenceCompatibility(base,absent,reason){
  var now=new Date().toISOString(),who=currentUserProfile.display_name;
  var saved=await supa.from('night_changes').upsert({roster_date:base.date,absent_name:absent,replacement_name:null,reason:reason,updated_by:who,updated_at:now},{onConflict:'roster_date,absent_name'});
  if(saved.error)return saved;
  var history=await supa.from('night_change_history').insert({roster_date:base.date,action:'saved',absent_name:absent,replacement_name:null,reason:reason,changed_by:who,changed_at:now});
  if(history.error)return{error:history.error,partial:true};
  return{error:null,compatibility:true};
}

async function saveOvertimeCompatibility(base,name){
  var now=new Date().toISOString(),who=currentUserProfile.display_name;
  var saved=await supa.from('night_overtime').insert({roster_date:base.date,nurse_name:name,allocation_key:null,updated_by:who,updated_at:now});
  if(saved.error)return saved;
  var history=await supa.from('night_overtime_history').insert({roster_date:base.date,action:'added',nurse_name:name,previous_allocation_key:null,allocation_key:null,changed_by:who,changed_at:now});
  if(history.error)return{error:history.error,partial:true};
  return{error:null,compatibility:true};
}

function rpcError(result,messageId){
  if(!result||!result.error)return false;
  var message=(result.error.message||'').toLowerCase();
  setSync('error','Save failed');
  var notice=result.partial?'The staffing entry was saved, but its history entry failed. Please tell the administrator.':result.error.code==='42501'||message.indexOf('permission denied')>=0||message.indexOf('row-level security')>=0?'Your signed-in account does not currently have permission to save staffing changes.':message.indexOf('duplicate')>=0||result.error.code==='23505'?'That nurse is already recorded for this night.':'The database rejected the change: '+(result.error.message||'unknown database error');
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
    var result=await timedRequest(supa.rpc('record_night_absence_v25',{p_roster_date:base.date,p_absent_name:absent,p_reason:reason,p_changed_by:currentUserProfile.display_name}));
    if(missingRpc(result))result=await timedRequest(saveAbsenceCompatibility(base,absent,reason));
    if(rpcError(result,'absenceFormMessage'))return;
    byId('absentName').value='';formMessage('absenceFormMessage',absent+' saved as absent.','success');toast('Absence saved for '+absent);
    try{await loadSharedData()}catch(refreshError){scheduleSharedReload()}
    formMessage('absenceFormMessage',absent+' saved as absent.','success');
  }catch(error){setSync('error','Save failed');formMessage('absenceFormMessage','No response was received. Your selection is still here, so tap Save again.','error');toast('Absence was not saved. Please try again.');}
  finally{byId('saveChangeBtn').textContent='Save absence';updateOfflineControls()}
}

function recordAlreadyRemoved(result){
  if(!result||!result.error)return false;
  var message=(result.error.message||'').toLowerCase();
  return message.indexOf('no longer exists')>=0||message.indexOf('not found')>=0;
}

async function removeNightChange(id,button){
  if(!requireOnline())return;
  if(pendingRemovals[id])return;
  var base=cur(),item=changesFor(base.date).find(function(c){return c.id===id});
  if(!item||!confirm('Remove '+item.absent_name+' from the absence list for '+fmt(base.date)+'?'))return;
  pendingRemovals[id]=true;if(button){button.disabled=true;button.textContent='Removing…'}setSync('saving','Removing absence');
  try{
    var allocationKey=allocationKeyForName(base,item.absent_name);
    var result=await timedRequest(supa.rpc('remove_night_absence_v25',{p_change_id:id,p_allocation_key:allocationKey,p_changed_by:currentUserProfile.display_name}));
    if(result&&result.error&&!recordAlreadyRemoved(result)){rpcError(result);return}
    await loadSharedData();toast(recordAlreadyRemoved(result)?'Absence was already removed and the list has been refreshed':'Absence removed');
  }catch(error){setSync('error','Remove failed');toast('The absence could not be removed. Please try again.');}
  finally{delete pendingRemovals[id];if(button&&button.isConnected){button.disabled=false;button.textContent='Remove'}}
}

async function saveOvertime(){
  if(!requireOnline())return;
  var base=cur(),name=byId('overtimeName').value.trim();
  if(!name){markInvalid('overtimeName',true);formMessage('overtimeFormMessage','Type the overtime nurse\'s name before adding.','error');toast('Type the overtime nurse\'s name first');byId('overtimeName').focus();return}
  if(activeNames(base).some(function(n){return n.toLowerCase()===name.toLowerCase()})){formMessage('overtimeFormMessage',name+' is already rostered for this night.','error');toast(name+' is already assigned on this night');return}
  if(overtimeFor(base.date).some(function(o){return o.nurse_name.toLowerCase()===name.toLowerCase()})){formMessage('overtimeFormMessage',name+' is already on the overtime list.','error');toast(name+' is already listed for overtime');return}
  var similar=overtimeFor(base.date).find(function(o){var a=o.nurse_name.trim().toLowerCase(),b=name.toLowerCase();return a.indexOf(b+' ')===0||b.indexOf(a+' ')===0});
  if(similar&&!confirm(name+' may be the same person as '+similar.nurse_name+'. Add both names as separate overtime nurses?')){formMessage('overtimeFormMessage','Check the existing entry for '+similar.nurse_name+' before adding another name.','error');return}
  markInvalid('overtimeName',false);formMessage('overtimeFormMessage','Adding '+name+'…','');
  setSync('saving','Adding overtime nurse');byId('addOvertimeBtn').disabled=true;byId('addOvertimeBtn').textContent='Adding…';
  try{
    var result=await timedRequest(supa.rpc('add_night_overtime_v25',{p_roster_date:base.date,p_nurse_name:name,p_changed_by:currentUserProfile.display_name}));
    if(missingRpc(result))result=await timedRequest(saveOvertimeCompatibility(base,name));
    if(rpcError(result,'overtimeFormMessage'))return;
    byId('overtimeName').value='';formMessage('overtimeFormMessage',name+' added for overtime.','success');toast(name+' added for overtime');
    try{await loadSharedData()}catch(refreshError){scheduleSharedReload()}
    formMessage('overtimeFormMessage',name+' added for overtime.','success');
  }catch(error){setSync('error','Save failed');formMessage('overtimeFormMessage','No response was received. The name remains here, so tap Add overtime again.','error');toast('Overtime nurse was not saved. Please try again.');}
  finally{byId('addOvertimeBtn').textContent='Add overtime';updateOfflineControls()}
}

async function removeOvertime(id,button){
  if(!requireOnline())return;
  if(pendingRemovals[id])return;
  var base=cur(),entry=overtimeFor(base.date).find(function(o){return o.id===id});
  if(!entry||!confirm('Remove '+entry.nurse_name+' from tonight\'s overtime list?'))return;
  pendingRemovals[id]=true;if(button){button.disabled=true;button.textContent='Removing…'}setSync('saving','Removing overtime nurse');
  try{
    var result=await timedRequest(supa.rpc('remove_night_overtime_v25',{p_overtime_id:id,p_changed_by:currentUserProfile.display_name}));
    if(result&&result.error&&!recordAlreadyRemoved(result)){rpcError(result);return}
    await loadSharedData();toast(recordAlreadyRemoved(result)?entry.nurse_name+' was already removed and the list has been refreshed':entry.nurse_name+' removed from overtime');
  }catch(error){setSync('error','Remove failed');toast('The overtime nurse could not be removed. Please try again.');}
  finally{delete pendingRemovals[id];if(button&&button.isConnected){button.disabled=false;button.textContent='Remove'}}
}

async function saveFiveCover(){
  if(!requireOnline())return;
  var base=cur(),plan=staffingPlan(base),pick=byId('fiveCoverPick'),key=pick&&pick.value;
  if(!key||plan.coverageChoices.indexOf(key)<0){toast('Choose the allocation the reliever will cover');return}
  setSync('saving','Saving reliever allocation');
  var result=await supa.rpc('apply_staffing_allocations_v25',{p_roster_date:base.date,p_action:'reliever',p_coverage_key:key,p_assignments:null,p_changed_by:currentUserProfile.display_name,p_reliever_name:base.reliever});
  if(rpcError(result))return;await loadSharedData();toast(base.reliever+' saved before the overtime allocations');
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

async function saveAllocationsCompatibility(base,chosen,writeHistory){
  var who=currentUserProfile.display_name,now=new Date().toISOString(),before=overtimeFor(base.date).slice(),desired=desiredAllocationsById(chosen);
  var cleared=await supa.from('night_overtime').update({allocation_key:null,updated_by:who,updated_at:now}).eq('roster_date',base.date);
  if(cleared.error)return cleared;
  for(var key in chosen){
    var saved=await supa.from('night_overtime').update({allocation_key:key,updated_by:who,updated_at:now}).eq('id',chosen[key]).eq('roster_date',base.date);
    if(saved.error)return saved;
  }
  var check=await readStoredAllocations(base.date,chosen);
  if(check.error)return check;
  if(!check.matches)return{error:{message:'The database did not retain the selected allocation values.'}};
  if(writeHistory){
    var audit=before.filter(function(o){return(o.allocation_key||null)!==(desired[o.id]||null)}).map(function(o){var next=desired[o.id]||null,action=o.allocation_key&&next?'reallocated':next?'allocated':'unallocated';return{roster_date:base.date,action:action,nurse_name:o.nurse_name,previous_allocation_key:o.allocation_key||null,allocation_key:next,changed_by:who,changed_at:now}});
    if(audit.length){var history=await supa.from('night_overtime_history').insert(audit);if(history.error)return{error:history.error,partial:true}}
  }
  return{error:null,compatibility:true};
}

async function saveFinalAllocations(){
  if(!requireOnline())return;
  var base=cur(),selects=Array.prototype.slice.call(document.querySelectorAll('[data-final-allocation]')),chosen={},used={};
  for(var i=0;i<selects.length;i++){
    var key=selects[i].getAttribute('data-final-allocation'),id=selects[i].value;if(!id)continue;
    if(used[id]){toast('The same overtime nurse cannot be placed in two allocations');return}used[id]=true;chosen[key]=id;
  }
  var chosenCount=Object.keys(chosen).length;
  if(!chosenCount){toast('Choose at least one nurse allocation before saving');return}
  setSync('saving','Saving '+chosenCount+' allocation'+(chosenCount===1?'':'s'));byId('saveAllocationsBtn').disabled=true;byId('saveAllocationsBtn').textContent='Saving…';
  try{
    var result=await timedRequest(supa.rpc('apply_staffing_allocations_v25',{p_roster_date:base.date,p_action:'allocations',p_coverage_key:null,p_assignments:chosen,p_changed_by:currentUserProfile.display_name,p_reliever_name:base.reliever}));
    var usedCompatibility=false;
    if(missingRpc(result)){result=await timedRequest(saveAllocationsCompatibility(base,chosen,true));usedCompatibility=true}
    if(rpcError(result))return;
    if(!usedCompatibility){
      var check=await timedRequest(readStoredAllocations(base.date,chosen));
      if(check.error){rpcError(check);return}
      if(!check.matches){
        result=await timedRequest(saveAllocationsCompatibility(base,chosen,false));
        if(rpcError(result))return;
      }
    }
    await loadSharedData();var plan=staffingPlan(cur()),saved=chosenCount-plan.unresolved.filter(function(key){return Object.prototype.hasOwnProperty.call(chosen,key)}).length;
    toast(plan.unresolved.length?saved+' allocation'+(saved===1?'':'s')+' saved • '+plan.unresolved.length+' still to decide':additionalNurses(plan).length?'Core allocations saved; additional staff remain as required':'Required allocations finalised');
  }catch(error){setSync('error','Save failed');toast('The allocations could not be confirmed. Your selections remain available to retry.');}
  finally{byId('saveAllocationsBtn').disabled=false;byId('saveAllocationsBtn').textContent='Save final allocations';updateOfflineControls()}
}

async function loadNightHistory(date,renderAfter){
  if(!date||historyLoadingDates[date])return;
  historyLoadingDates[date]=true;
  var results=await Promise.all([supa.from('night_change_history').select('*').eq('roster_date',date).order('changed_at',{ascending:false}),supa.from('night_overtime_history').select('*').eq('roster_date',date).order('changed_at',{ascending:false})]);
  delete historyLoadingDates[date];
  if(results.some(function(x){return x.error}))return;
  changeHistory[date]=results[0].data||[];overtimeHistory[date]=results[1].data||[];historyLoadedDates[date]=true;
  if(renderAfter!==false&&currentUserProfile&&cur().date===date)renderChanges(cur());
}

function ensureNightHistory(date){if(!historyLoadedDates[date])loadNightHistory(date,true)}

async function loadSharedData(){
  if(sharedLoadPromise){sharedReloadPending=true;return sharedLoadPromise}
  sharedLoadPromise=(async function(){
    var results=await Promise.all([supa.from('night_changes').select('*').order('updated_at',{ascending:true}),supa.from('night_overtime').select('*').order('updated_at',{ascending:true}),supa.from('night_five_cover').select('*'),supa.from('roster_nights').select('*'),supa.from('roster_settings').select('*').eq('id',1).maybeSingle(),supa.from('rotation_versions').select('*').order('effective_from',{ascending:true}),supa.from('night_labour_order').select('*')]);
    if(results.slice(0,6).some(function(x){return x.error})){setSync('error','Database update required');toast('Run the V25 SQL migration in Supabase');return}
    nightChanges={};(results[0].data||[]).forEach(function(c){(nightChanges[c.roster_date]||(nightChanges[c.roster_date]=[])).push(c)});
    nightOvertime={};(results[1].data||[]).forEach(function(o){(nightOvertime[o.roster_date]||(nightOvertime[o.roster_date]=[])).push(o)});
    fiveCoverChoices={};(results[2].data||[]).forEach(function(c){fiveCoverChoices[c.roster_date]=c});
    sharedRoster={};(results[3].data||[]).forEach(function(r){sharedRoster[r.date]=r});
    if(results[4].data)rosterSettings=results[4].data;if((results[5].data||[]).length)rotationVersions=results[5].data;
    labourOrderAvailable=!results[6].error;labourOrders={};if(labourOrderAvailable)(results[6].data||[]).forEach(function(order){labourOrders[order.roster_date]=order});
    rebuildCalculatedRoster();var selected=localStorage.getItem('anaes_selected_date'),selectedIdx=selected?R.findIndex(function(r){return r.date===selected}):-1;idx=selectedIdx>=0?selectedIdx:startingIndex();
    await loadNightHistory(R[idx].date,false);setSync('','Live and up to date');render();
  })();
  try{await sharedLoadPromise}finally{sharedLoadPromise=null;if(sharedReloadPending){sharedReloadPending=false;setTimeout(loadSharedData,120)}}
}

function scheduleSharedReload(){clearTimeout(reloadTimer);reloadTimer=setTimeout(loadSharedData,350)}

function subscribeToChanges(){
  if(changesChannel)supa.removeChannel(changesChannel);
  var tables=['night_changes','night_overtime','night_change_history','night_overtime_history','night_five_cover','roster_nights','roster_settings','rotation_versions'];if(labourOrderAvailable)tables.push('night_labour_order');
  changesChannel=supa.channel('roster-live-v25');
  tables.forEach(function(table){changesChannel.on('postgres_changes',{event:'*',schema:'public',table:table},function(payload){
    if(table==='night_change_history'||table==='night_overtime_history'){
      var date=(payload.new&&payload.new.roster_date)||(payload.old&&payload.old.roster_date);if(date){historyLoadedDates[date]=false;if(currentUserProfile&&cur().date===date)ensureNightHistory(date)}
    }else scheduleSharedReload();
  })});
  changesChannel.subscribe(function(status){if(status==='SUBSCRIBED')setSync('','Live and up to date');else if(status==='CHANNEL_ERROR'||status==='TIMED_OUT')setSync('error','Connection problem')});
}

function updateOfflineControls(){
  var offline=!navigator.onLine,ids=['saveChangeBtn','addOvertimeBtn','saveAllocationsBtn','saveTeamVersionBtn','previewExtendBtn','extendBtn','addAccountBtn'];
  ids.forEach(function(id){var el=byId(id);if(el)el.disabled=offline});
  var cover=byId('saveFiveCoverBtn');if(cover)cover.disabled=offline;
  var labour=byId('saveLabourOrderBtn');if(labour)labour.disabled=offline;
}

function updateNetworkStatus(){
  if(!navigator.onLine)setSync('offline','Offline • entries stay on screen');else if(currentUserProfile)setSync('','Live and up to date');
  updateOfflineControls();
}

function chooseDate(inputId){
  var value=byId(inputId).value;if(!value){render();return}
  if(value<R[0].date){idx=0;toast('The published roster begins on '+fmt(R[0].date));render();return}
  if(value>R[R.length-1].date){idx=R.length-1;toast('The roster is currently published only until '+fmt(R[R.length-1].date));render();return}
  var i=R.findIndex(function(r){return r.date>=value});idx=i<0?R.length-1:i;if(R[idx].date!==value)toast('Next rostered night: '+fmt(R[idx].date));render();
}

function csvCell(value){return '"'+String(value==null?'':value).replaceAll('"','""')+'"'}

function exportCSV(){
  var headers=['Date','Actual nurse count','Status','First part','Second part','Pager','Reliever','Full LW / Pager','7th nurse','Additional staff','Absences','Overtime','Reliever cover choice','Notes'];
  var rows=R.map(function(original){
    var base=Object.assign({},original,sharedRoster[original.date]||{});base.mode='6';var r=applyChanges(base),plan=staffingPlan(base),extras=additionalNurses(plan),changes=changesFor(base.date),overtime=overtimeFor(base.date);
    return[base.date,plan.count,planIsProvisional(base)?'Provisional':extras.length?'Core finalised; additional staff as required':'Final',r.first1+' + '+r.first2,r.second1+' + '+r.second2,r.mode==='5'?'':r.pager,r.mode==='5'?'':r.reliever,r.mode==='5'?r.fullLW:'',r.mode==='7'?r.seventh:'',extras.map(function(o){return o.nurse_name}).join(' + '),changes.map(function(c){return c.absent_name+' ('+(c.reason||'Unavailable')+')'}).join('; '),overtime.map(function(o){return o.nurse_name+' ('+(o.allocation_key?allocationLabel(o.allocation_key):'Awaiting allocation')+')'}).join('; '),plan.coverageKey?allocationLabel(plan.coverageKey):'',r.notes||''].map(csvCell).join(',');
  });
  download('anaesthetic-roster-v25.csv',headers.map(csvCell).join(',')+'\n'+rows.join('\n'),'text/csv');
}

async function backup(){
  if(!requireOnline())return;
  toast('Preparing complete backup');
  var allHistory=await Promise.all([supa.from('night_change_history').select('*').order('changed_at',{ascending:false}),supa.from('night_overtime_history').select('*').order('changed_at',{ascending:false})]);
  if(allHistory.some(function(x){return x.error})){toast('The complete backup could not be prepared');return}
  download('roster-backup-v25.json',JSON.stringify({created_at:new Date().toISOString(),app_version:APP_VERSION,roster_settings:rosterSettings,rotation_versions:rotationVersions,manual_night_overrides:Object.values(sharedRoster),night_changes:nightChanges,night_overtime:nightOvertime,absence_history:allHistory[0].data||[],overtime_history:allHistory[1].data||[],five_nurse_cover:fiveCoverChoices,labour_ward_orders:Object.values(labourOrders),authorised_accounts:authorisedAccounts},null,2),'application/json');
}

function showUpdate(registration){updateRegistration=registration;byId('updateBanner').classList.remove('hidden')}

function setupPWA(){
  var install=byId('installBtn');
  window.addEventListener('beforeinstallprompt',function(e){e.preventDefault();deferredInstallPrompt=e;install.classList.remove('hidden')});
  install.onclick=async function(){if(deferredInstallPrompt){deferredInstallPrompt.prompt();await deferredInstallPrompt.userChoice;deferredInstallPrompt=null;install.classList.add('hidden');return}var ios=/iphone|ipad|ipod/i.test(navigator.userAgent),standalone=window.matchMedia&&window.matchMedia('(display-mode: standalone)').matches;if(ios&&!standalone)toast('On iPhone, tap Share then Add to Home Screen')};
  window.addEventListener('appinstalled',function(){deferredInstallPrompt=null;install.classList.add('hidden');toast('App installed')});
  byId('applyUpdateBtn').onclick=function(){if(updateRegistration&&updateRegistration.waiting){reloadForUpdate=true;updateRegistration.waiting.postMessage({type:'ACTIVATE_UPDATE'})}};
  if('serviceWorker' in navigator){
    navigator.serviceWorker.addEventListener('controllerchange',function(){if(reloadForUpdate)window.location.reload()});
    var check=function(){if(updateRegistration&&navigator.onLine)updateRegistration.update().catch(function(){})};
    window.addEventListener('load',async function(){try{updateRegistration=await navigator.serviceWorker.register('./service-worker.js',{updateViaCache:'none'});if(updateRegistration.waiting)showUpdate(updateRegistration);updateRegistration.addEventListener('updatefound',function(){var worker=updateRegistration.installing;if(!worker)return;worker.addEventListener('statechange',function(){if(worker.state==='installed'&&navigator.serviceWorker.controller)showUpdate(updateRegistration)})});await updateRegistration.update();setInterval(check,900000)}catch(e){}});
    window.addEventListener('focus',check);document.addEventListener('visibilitychange',function(){if(document.visibilityState==='visible')check()});
  }
  var ios=/iphone|ipad|ipod/i.test(navigator.userAgent),standalone=window.navigator.standalone||(window.matchMedia&&window.matchMedia('(display-mode: standalone)').matches);if(ios&&!standalone)install.classList.remove('hidden');
}

async function authorizeUser(user){
  if(!user)return showAuth();currentUser=user;
  var result=await supa.from('allowed_users').select('email,display_name,user_role,active').eq('email',user.email.toLowerCase()).maybeSingle();
  if(result.error||!result.data||!result.data.active){await supa.auth.signOut();currentUser=null;currentUserProfile=null;showAuth('This email is not authorised for this shift.',true);return}
  currentUserProfile=result.data;byId('authGate').classList.add('hidden');document.body.classList.remove('authPending');
  var isAdmin=result.data.user_role==='admin';byId('adminSettingsBtn').classList.toggle('hidden',!isAdmin);document.querySelector('.bottom').style.gridTemplateColumns='repeat(3,1fr)';
  byId('accountBtn').title=result.data.display_name+' • '+result.data.email+' • Sign out';byId('accountInitial').textContent=(result.data.display_name||result.data.email).charAt(0).toUpperCase();
  await loadSharedData();subscribeToChanges();if(isAdmin)await loadAccounts();
}

function bind(){
  initTheme();setupPWA();window.addEventListener('online',function(){updateNetworkStatus();scheduleSharedReload()});window.addEventListener('offline',updateNetworkStatus);
  byId('loginTab').onclick=function(){setAuthMode('login')};byId('signupTab').onclick=function(){setAuthMode('signup')};byId('authSubmitBtn').onclick=submitAuth;byId('authPassword').onkeydown=function(e){if(e.key==='Enter')submitAuth()};
  byId('accountBtn').onclick=signOutUser;byId('adminSettingsBtn').onclick=function(){activeAdminTab='overview';show('admin')};byId('closeAdminBtn').onclick=function(){show('today')};
  byId('saveChangeBtn').onclick=saveNightChange;byId('absentName').onchange=function(){markInvalid('absentName',false);formMessage('absenceFormMessage','');updateOfflineControls()};byId('addOvertimeBtn').onclick=saveOvertime;byId('saveAllocationsBtn').onclick=saveFinalAllocations;byId('overtimeName').oninput=function(){markInvalid('overtimeName',false);formMessage('overtimeFormMessage','')};byId('overtimeName').onkeydown=function(e){if(e.key==='Enter')saveOvertime()};byId('addAccountBtn').onclick=addAuthorisedAccount;
  byId('themeBtn').onclick=toggleTheme;byId('datePick').onchange=selectByDate;byId('breakDatePick').onchange=selectBreakDate;byId('teamEffectiveDate').onchange=selectTeamEffectiveDate;byId('extendDate').onchange=selectExtendDate;
  byId('prevNightBtn').onclick=function(){changeNight(-1)};byId('nextNightBtn').onclick=function(){changeNight(1)};byId('breakPrevNightBtn').onclick=function(){changeNight(-1)};byId('breakNextNightBtn').onclick=function(){changeNight(1)};byId('teamPrevNightBtn').onclick=function(){changeNight(-1)};byId('teamNextNightBtn').onclick=function(){changeNight(1)};byId('extendPrevNightBtn').onclick=function(){changeExtendNight(-1)};byId('extendNextNightBtn').onclick=function(){changeExtendNight(1)};
  byId('myNamePick').onchange=changeMyName;byId('search').oninput=renderRoster;byId('filter').onchange=renderRoster;byId('copyBreaksBtn').onclick=copyBreaks;
  Array.prototype.forEach.call(document.querySelectorAll('.emailRosterBtn'),function(b){b.onclick=emailRoster});Array.prototype.forEach.call(document.querySelectorAll('[data-admin-tab]'),function(b){b.onclick=function(){switchAdminTab(b.getAttribute('data-admin-tab'))}});Array.prototype.forEach.call(document.querySelectorAll('[data-admin-open]'),function(b){b.onclick=function(){switchAdminTab(b.getAttribute('data-admin-open'))}});Array.prototype.forEach.call(document.querySelectorAll('[data-extend-months]'),function(b){b.onclick=function(){setExtendRange(Number(b.getAttribute('data-extend-months')))}});
  byId('previewExtendBtn').onclick=previewExtension;byId('extendBtn').onclick=extendRoster;byId('saveTeamVersionBtn').onclick=previewTeamChange;byId('exportBtn').onclick=exportCSV;byId('backupBtn').onclick=backup;
  Array.prototype.forEach.call(document.querySelectorAll('.bottom button'),function(b){b.onclick=function(){show(b.getAttribute('data-v'))}});updateOfflineControls();
}
