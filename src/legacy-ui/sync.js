function setSharedSyncState(state,message){
  sharedSyncState=state||'live';sharedSyncMessage=message||'';
  if(window.AnaestheticRuntime&&window.AnaestheticRuntime.state){
    var runtimeState=sharedSyncState==='reconnecting'?'reconnecting':sharedSyncState==='offline'?'offline':sharedSyncState==='stale'?'stale':sharedSyncState==='error'?'error':sharedSyncState==='access-lost'?'access-lost':sharedSyncState==='starting'?'starting':'live';
    if(runtimeState==='starting'&&window.AnaestheticRuntime.state.sync.value!=='starting')runtimeState='reconnecting';
    window.AnaestheticRuntime.state.sync.set(runtimeState,{message:sharedSyncMessage});
  }
  setSync(state==='live'?'':state==='reconnecting'?'error':state,message||'');renderDiagnostics();
}
async function syncServerClock(force){
  if(serverClockSyncInFlight||!navigator.onLine||!supa||!rosterCapabilities().serverClock)return false;
  if(!force&&Date.now()-serverClockLastAttempt<900000)return true;
  serverClockLastAttempt=Date.now();serverClockSyncInFlight=true;var sent=Date.now();
  try{
    var result=await withTimeout(supa.rpc('app_server_clock_v47'),2500,'Clock check timed out'),received=Date.now();
    if(result&&result.error)throw result.error;
    var value=result&&result.data;if(Array.isArray(value))value=value[0];
    if(value&&typeof value==='object'&&value.server_now)value=value.server_now;
    var accepted=window.AnaestheticRuntime&&window.AnaestheticRuntime.clock?window.AnaestheticRuntime.clock.addSample(String(value||''),sent,received):(window.AnaestheticDomain&&window.AnaestheticDomain.setServerClock&&window.AnaestheticDomain.setServerClock(String(value||''),sent,received));
    if(!accepted)throw new Error('Invalid server clock');
    recordAppDiagnostic('clock','sync','ok');return true
  }catch(error){recordAppDiagnostic('clock','sync',error&&error.code||'fallback');return false}
  finally{serverClockSyncInFlight=false}
}
function noteCompatibilityStartup(path){
  compatibilityStartupUseCount++;compatibilityStartupLastUsed=path;
  var previous=Number(appStorage.getItem('anaes_compat_startup_count')||0);
  appStorage.setItem('anaes_compat_startup_count',String(previous+1));
  appStorage.setItem('anaes_compat_startup_last',String(path||'unknown'));
  appStorage.setItem('anaes_compat_startup_last_at',new Date().toISOString());
  recordAppDiagnostic('compatibility','startup',path)
}
function commandKey(value){return String(value||'command').replace(/[^A-Za-z0-9_.:-]/g,'').slice(0,120)}
function rosterErrorCode(error){return window.AnaestheticRuntime&&window.AnaestheticRuntime.errors?window.AnaestheticRuntime.errors.code(error):String(error&&error.message||error&&error.code||'UNKNOWN')}
function mutationDateFromKey(key){var match=String(key||'').match(/(20\\d{2}-\\d{2}-\\d{2})/);return match&&match[1]||null}
function conflictPlanSnapshot(date){try{var base=date&&baseForDate(date);if(!base)return null;var model=buildNightPlan(base);return{date:model.date,revision:model.revision,confirmed:model.confirmed,provisional:model.provisional,effective:model.effective,staffing:{count:model.staffing&&model.staffing.count,unresolved:model.staffing&&model.staffing.unresolved,assignments:model.staffing&&model.staffing.validAssignments},labourOrder:model.labourOrder}}catch(error){return null}}
function conflictSummary(before,after){
  if(!before||!after)return[];
  var changes=[],labels={first1:'First Part · position 1',first2:'First Part · position 2',second1:'Second Part · position 1',second2:'Second Part · position 2',pager:'Pager',reliever:'Reliever',seventh:'Seventh nurse',fullLW:'Labour Ward / Pager'};
  Object.keys(labels).forEach(function(key){
    var left=before.effective&&before.effective[key],right=after.effective&&after.effective[key];
    if(JSON.stringify(left)!==JSON.stringify(right))changes.push({label:labels[key],before:left||'Unassigned',after:right||'Unassigned'})
  });
  var beforeCount=before.staffing&&Number(before.staffing.count),afterCount=after.staffing&&Number(after.staffing.count);
  if(Number.isFinite(beforeCount)&&Number.isFinite(afterCount)&&beforeCount!==afterCount)changes.push({label:'Staffing',before:beforeCount+' nurses',after:afterCount+' nurses'});
  var beforeTasks=before.staffing&&before.staffing.unresolved||[],afterTasks=after.staffing&&after.staffing.unresolved||[];
  if(JSON.stringify(beforeTasks)!==JSON.stringify(afterTasks))changes.push({label:'Outstanding decisions',before:beforeTasks.length?beforeTasks.join(', '):'None',after:afterTasks.length?afterTasks.join(', '):'None'});
  if(!!before.confirmed!==!!after.confirmed)changes.push({label:'Confirmation',before:before.confirmed?'Confirmed':'Not confirmed',after:after.confirmed?'Confirmed':'Not confirmed'});
  if(JSON.stringify(before.labourOrder||null)!==JSON.stringify(after.labourOrder||null))changes.push({label:'Labour Ward order',before:before.labourOrder?'Changed':'Not set',after:after.labourOrder?'Changed':'Not set'});
  return changes.slice(0,8)
}
function conflictNotice(result){
  var changes=result&&Array.isArray(result.conflictChanges)?result.conflictChanges:[];
  if(!changes.length)return'This night changed on another device. The latest version has been loaded, so review it before saving again.';
  var detail=changes.slice(0,3).map(function(change){return change.label+': '+change.before+' → '+change.after}).join('; ');
  return'This night changed on another device. '+detail+'. Review the latest version before saving again.'
}
async function ensureFreshBeforeMutation(){
  if(!rosterCapabilities().freshnessBarrier)return{ok:true,revision:Number(lastObservedSyncRevision||0)};
  if(!navigator.onLine||forcedOfflineSession)return{ok:false,error:{message:'STALE_CLIENT',code:'STALE_CLIENT'}};
  var result=await supa.from('app_sync_state').select('revision').eq('id',1).maybeSingle();
  if(result.error||!result.data)return{ok:false,error:result.error||{message:'STALE_CLIENT',code:'STALE_CLIENT'}};
  var revision=Number(result.data.revision||0);
  if(lastObservedSyncRevision===null){lastObservedSyncRevision=revision;return{ok:true,revision:revision}}
  if(revision!==Number(lastObservedSyncRevision)){
    await loadSharedData({background:true});
    return{ok:false,error:{message:'ROSTER_REVISION_CONFLICT',code:'ROSTER_REVISION_CONFLICT'},revision:revision};
  }
  return{ok:true,revision:revision}
}
function runRosterMutation(key,execute,verify){
  key=commandKey(key);if(rosterCommandInFlight[key])return rosterCommandInFlight[key];
  var commandId=rosterCommandIds[key]||(window.AnaestheticDomain&&window.AnaestheticDomain.commandId?window.AnaestheticDomain.commandId():'command-'+Date.now()),date=mutationDateFromKey(key),beforePlan=conflictPlanSnapshot(date);
  rosterCommandIds[key]=commandId;
  recordAppDiagnostic('mutation',key,'start');
  var work=(async function(){
    var ambiguous=false;
    try{
      var freshness=await ensureFreshBeforeMutation();
      if(!freshness.ok){
        delete rosterCommandIds[key];
        var staleResult={data:null,error:freshness.error,conflictChanges:conflictSummary(beforePlan,conflictPlanSnapshot(date))};
        recordAppDiagnostic('mutation',key,'stale-client');return staleResult
      }
      var expectedSyncRevision=Number(freshness.revision);
      var result=window.AnaestheticRuntime&&window.AnaestheticRuntime.latency?await window.AnaestheticRuntime.latency.measure('roster-mutation',function(){return timedRequest(execute(commandId,expectedSyncRevision))}):await timedRequest(execute(commandId,expectedSyncRevision));
      if(result&&result.error){
        var code=rosterErrorCode(result.error);
        if(code==='ROSTER_REVISION_CONFLICT'||String(result.error.message||'').indexOf('ROSTER_REVISION_CONFLICT')>=0){
          await loadSharedData({background:true});result.conflictChanges=conflictSummary(beforePlan,conflictPlanSnapshot(date));recordAppDiagnostic('mutation',key,'revision-conflict');
        }
        delete rosterCommandIds[key];
        return result
      }
      delete rosterCommandIds[key];
      recordAppDiagnostic('mutation',key,'committed');return result
    }catch(error){
      ambiguous=error&&error.message==='timeout'||error&&error.name==='AbortError'||error&&error.code==='TIMEOUT';
      recordAppDiagnostic('mutation',key,error&&error.code||(ambiguous?'timeout':'error'));
      if(typeof verify==='function'){
        try{
          await loadSharedData({background:true});
          if(await Promise.resolve(verify())){
            delete rosterCommandIds[key];
            recordAppDiagnostic('mutation',key,'verified-after-timeout');
            return{data:{verified:true,command_id:commandId},error:null,recovered:true}
          }
        }catch(refreshError){recordAppDiagnostic('mutation',key,'verify-failed')}
      }
      if(!ambiguous)delete rosterCommandIds[key];
      throw error
    }finally{delete rosterCommandInFlight[key]}
  })();
  rosterCommandInFlight[key]=work;return work
}

async function loadSharedData(options){
  var background=!!(options&&options.background),loadStarted=window.performance&&performance.now?performance.now():Date.now();
  if(sharedLoadPromise){sharedReloadPending=true;sharedReloadPendingBackground=sharedReloadPendingBackground&&background;return sharedLoadPromise}
  if(!background)document.body.classList.add('dataRefreshing');
  sharedLoadPromise=(async function(){
    try{
      sharedLoadFailureCode='';setSharedSyncState('starting','Opening shared roster');
      sharedLoadFailureStage='snapshot';setLaunchState('Preparing your night','Opening the shared roster…');
      var snapshot;if(preferCompatibilityStartup()){
        try{sharedLoadFailureStage='snapshot';setLaunchState('Preparing your night','Opening the protected Android roster…');snapshot=await requestStartupWithSessionRecovery(requestStartupSnapshotXhr)}catch(androidTransportError){
          if(androidTransportError&&androidTransportError.startupSessionFailed)throw androidTransportError;
          if(androidTransportError&&androidTransportError.code==='42501')throw androidTransportError;
          console.warn('Protected Android startup was unavailable; using compatibility reads',androidTransportError);noteCompatibilityStartup('android-fallback');
          snapshot=await requestCompatibilityStartup()
        }
      }else try{snapshot=await requestStartupWithSessionRecovery(requestStartupSnapshot)}catch(snapshotError){
        if(snapshotError&&snapshotError.startupSessionFailed)throw snapshotError;
        if(snapshotError&&snapshotError.code==='42501')throw snapshotError;
        console.warn('Protected startup snapshot was unavailable; using compatibility reads',snapshotError);noteCompatibilityStartup('snapshot-fallback');
        snapshot=await requestCompatibilityStartup()
      }
      var profile=snapshot&&snapshot.profile;
      if(!plainSnapshotRecord(snapshot)||!plainSnapshotRecord(profile)||!profile.active||!Array.isArray(snapshot.rotation_versions)||!snapshot.rotation_versions.length||!plainSnapshotRecord(snapshot.roster_settings))throw new Error('The shared roster returned incomplete information.');
      if(currentUser&&String(profile.email||'').toLowerCase()!==String(currentUser.email||'').toLowerCase()){var accessError=new Error('The shared roster returned the wrong account.');accessError.code='42501';throw accessError}
      currentUserProfile=profile;try{appStorage.setItem('anaes_cached_profile',JSON.stringify(profile))}catch(error){}prepareAuthorisedShell(profile);
      nightChanges=rowsGroupedByDate(snapshot.night_changes);nightOvertime=rowsGroupedByDate(snapshot.night_overtime);fiveCoverChoices=rowsIndexedByDate(snapshot.night_five_cover);
      rosterSettings=snapshot.roster_settings;rotationVersions=snapshot.rotation_versions;
      labourOrderAvailable=true;labourOrders=rowsIndexedByDate(snapshot.night_labour_order);
      nightPlanStatuses=rowsIndexedByDate(snapshot.night_plan_status);
      nightRoleOverrideAvailable=true;nightRoleOverrides=rowsIndexedByDate(snapshot.night_role_overrides);
      if(plainSnapshotRecord(snapshot.app_settings)){appSettings=snapshot.app_settings}
      schemaVersion=Number(snapshot.schema_version||0);setAppCompatibility(snapshot.compatibility);var incomingRevision=Number(snapshot.sync_revision||0),incomingAccessEpoch=Number(snapshot.access_epoch||0);
      if(lastObservedSyncRevision!==null&&incomingRevision<lastObservedSyncRevision){var staleError=new Error('An older roster snapshot was rejected.');staleError.code='STALE_SNAPSHOT';throw staleError}
      lastObservedSyncRevision=incomingRevision;lastObservedAccessEpoch=incomingAccessEpoch;if(window.AnaestheticRuntime&&window.AnaestheticRuntime.coordinator)window.AnaestheticRuntime.coordinator.announce('sync-revision',{revision:incomingRevision,accessEpoch:incomingAccessEpoch});await syncServerClock(false);
      rebuildCalculatedRoster();
      if(!initialNightChosen){nightSelectionMode='automatic';idx=startingIndex(appNow());automaticSelectedDate=R[idx].date;initialNightChosen=true}
      else if(nightSelectionMode==='automatic'){idx=startingIndex(appNow());automaticSelectedDate=R[idx].date}
      else{var selected=appStorage.getItem('anaes_selected_date'),selectedIdx=selected?R.findIndex(function(r){return r.date===selected}):-1;idx=selectedIdx>=0?selectedIdx:Math.min(idx,R.length-1)}
      lastSuccessfulSyncAt=new Date(appNowMs()).toISOString();forcedOfflineSession=false;sharedLoadFailureStage='';sharedLoadFailureCode='';saveOfflineSnapshot();setSharedSyncState('live','');render();renderDiagnostics();return true;
    }catch(error){
      console.error('Shared roster startup failed during '+sharedLoadFailureStage,error);recordAppDiagnostic('startup',sharedLoadFailureStage,error&&error.code||'error');
      sharedLoadFailureCode=String(error&&((error.status&&String(error.status))||error.code)||'').replace(/[^A-Za-z0-9_.-]/g,'').slice(0,32);
      if(error&&(error.startupSessionFailed||startupAuthError(error)))sharedLoadFailureStage='session';
      if(error&&error.code==='42501'){sharedLoadFailureStage='access';forcedOfflineSession=false;return false}
      var cached=currentUser&&cachedAllowedProfile(currentUser.email);if(!currentUserProfile&&cached)prepareAuthorisedShell(cached);
      forcedOfflineSession=true;if(cached&&restoreOfflineSnapshot()){updateOfflineControls();return true}forcedOfflineSession=false;
      setSharedSyncState('error','Shared data unavailable');return false
    }
  })();
  try{return await sharedLoadPromise}finally{if(window.AnaestheticRuntime&&window.AnaestheticRuntime.latency)window.AnaestheticRuntime.latency.record('shared-load',(window.performance&&performance.now?performance.now():Date.now())-loadStarted,true);if(!background)document.body.classList.remove('dataRefreshing');sharedLoadPromise=null;if(sharedReloadPending){var nextBackground=sharedReloadPendingBackground;sharedReloadPending=false;sharedReloadPendingBackground=true;setTimeout(function(){loadSharedData({background:nextBackground})},120)}}
}

function scheduleSharedReload(background){clearTimeout(reloadTimer);reloadTimer=setTimeout(function(){loadSharedData({background:background!==false})},350)}

async function checkSharedRevision(options){
  options=options||{};
  if(sharedSyncCheckInFlight||forcedOfflineSession||!currentUserProfile||!navigator.onLine||document.visibilityState==='hidden')return{skipped:true};
  sharedSyncCheckInFlight=true;
  try{
    var revisionRequest=function(){return Promise.all([
      supa.from('app_sync_state').select('revision').eq('id',1).maybeSingle(),
      supa.from('app_access_signal').select('access_epoch').eq('id',1).maybeSingle()
    ])},results=window.AnaestheticRuntime&&window.AnaestheticRuntime.latency?await window.AnaestheticRuntime.latency.measure('revision-check',revisionRequest):await revisionRequest();
    var result=results[0],accessResult=results[1],accessEpoch=accessResult&&!accessResult.error&&accessResult.data?Number(accessResult.data.access_epoch||0):null;
    if(accessEpoch!==null){
      if(lastObservedAccessEpoch===null)lastObservedAccessEpoch=accessEpoch;
      if(accessEpoch!==Number(lastObservedAccessEpoch||0)){
        var access=await checkCurrentAccessStatus(accessEpoch);
        if(access&&!access.active)return{changed:true,accessLost:true,revision:Number(lastObservedSyncRevision||0),accessEpoch:accessEpoch}
      }
    }
    if(result.error||!result.data){if(Date.now()-new Date(lastSuccessfulSyncAt||0).getTime()>30000)scheduleSharedReload(true);return{error:result.error||new Error('Revision unavailable'),accessEpoch:accessEpoch}}
    var revision=Number(result.data.revision||0);
    if(lastObservedSyncRevision===null){lastObservedSyncRevision=revision;return{changed:false,revision:revision,accessEpoch:accessEpoch}}
    if(revision!==Number(lastObservedSyncRevision)){
      if(options.reloadNow)await loadSharedData({background:true});else scheduleSharedReload(true);
      if(window.AnaestheticRuntime&&window.AnaestheticRuntime.coordinator)window.AnaestheticRuntime.coordinator.announce('sync-revision',{revision:revision,accessEpoch:accessEpoch===null?Number(lastObservedAccessEpoch||0):accessEpoch});
      return{changed:true,revision:revision,accessEpoch:accessEpoch};
    }
    return{changed:false,revision:revision,accessEpoch:accessEpoch};
  }finally{sharedSyncCheckInFlight=false}
}

function startSharedSyncMonitor(){
  if(sharedSyncTimer)return;
  if(window.AnaestheticRuntime&&window.AnaestheticRuntime.scheduler){
    sharedSyncTimer='runtime';
    window.AnaestheticRuntime.scheduler.every('shared-revision',function(){
      return realtimeSubscribed&&sharedSyncState==='live'?60000:15000
    },function(){
      if(window.AnaestheticRuntime.coordinator&&!window.AnaestheticRuntime.coordinator.isLeader())return;
      if(!realtimeSubscribed&&currentUserProfile&&navigator.onLine&&!forcedOfflineSession)subscribeToChanges();
      return checkSharedRevision()
    });
  }else sharedSyncTimer=setInterval(checkSharedRevision,15000)
}

function scheduleRealtimeReconnect(){
  if(realtimeReconnectTimer||forcedOfflineSession||!currentUserProfile||!navigator.onLine)return;
  if(window.AnaestheticRuntime&&window.AnaestheticRuntime.coordinator&&!window.AnaestheticRuntime.coordinator.isLeader())return;
  var delay=Math.min(30000,1000*Math.pow(2,realtimeRetryCount++));
  realtimeReconnectTimer=setTimeout(function(){realtimeReconnectTimer=null;subscribeToChanges()},delay);
}

function subscribeToChanges(){
  if(window.AnaestheticRuntime&&window.AnaestheticRuntime.coordinator&&!window.AnaestheticRuntime.coordinator.isLeader()){
    realtimeSubscribed=false;if(changesChannel){supa.removeChannel(changesChannel);changesChannel=null}setSharedSyncState('live','');return;
  }
  var generation=++realtimeGeneration;realtimeSubscribed=false;if(realtimeReconnectTimer){clearTimeout(realtimeReconnectTimer);realtimeReconnectTimer=null}if(changesChannel)supa.removeChannel(changesChannel);
  var tables=['app_sync_state','app_access_signal','night_changes','night_overtime','night_change_history','night_overtime_history','night_five_cover','roster_settings','rotation_versions','night_plan_status','app_settings'];if(labourOrderAvailable)tables.push('night_labour_order');if(nightRoleOverrideAvailable)tables.push('night_role_overrides','night_role_override_history');
  changesChannel=supa.channel('roster-live-v41');
  tables.forEach(function(table){changesChannel.on('postgres_changes',{event:'*',schema:'public',table:table},function(payload){
    if(table==='night_change_history'||table==='night_overtime_history'||table==='night_role_override_history'){
      var date=(payload.new&&payload.new.roster_date)||(payload.old&&payload.old.roster_date);if(date){historyLoadedDates[date]=false;if(currentUserProfile&&cur().date===date)ensureNightHistory(date)}
    }
    if(table==='app_access_signal'&&payload.new){
      var accessEpoch=Number(payload.new.access_epoch||0);
      if(window.AnaestheticRuntime&&window.AnaestheticRuntime.coordinator)window.AnaestheticRuntime.coordinator.announce('sync-revision',{revision:Number(lastObservedSyncRevision||0),accessEpoch:accessEpoch});
      if(accessEpoch!==Number(lastObservedAccessEpoch||0)){
        checkCurrentAccessStatus(accessEpoch).then(function(access){if(access&&access.active)scheduleSharedReload(true)});
      }
      return
    }
    if(table==='app_sync_state'&&payload.new&&window.AnaestheticRuntime&&window.AnaestheticRuntime.coordinator){
      window.AnaestheticRuntime.coordinator.announce('sync-revision',{revision:Number(payload.new.revision||0),accessEpoch:Number(lastObservedAccessEpoch||0)});
    }
    scheduleSharedReload(true);
  })});
  changesChannel.subscribe(function(status){if(generation!==realtimeGeneration)return;if(status==='SUBSCRIBED'){realtimeSubscribed=true;realtimeRetryCount=0;setSharedSyncState('live','');checkSharedRevision()}else if(status==='CHANNEL_ERROR'||status==='TIMED_OUT'||status==='CLOSED'){realtimeSubscribed=false;setSharedSyncState('reconnecting','Reconnecting live updates…');recordAppDiagnostic('realtime','roster',status);scheduleRealtimeReconnect()}});
}

function resumeSharedSync(){if(forcedOfflineSession||!currentUserProfile||!navigator.onLine)return;if(!realtimeSubscribed)subscribeToChanges();checkSharedRevision();if(Date.now()-new Date(lastSuccessfulSyncAt||0).getTime()>30000)scheduleSharedReload(true)}
async function reconcileApplication(reason){
  applyThemePreference();
  if(!currentUserProfile)return false;
  if(!navigator.onLine){realtimeSubscribed=false;updateNetworkStatus();return false}
  lastResumeRefresh=Date.now();
  try{
    var sessionResult=supa&&supa.auth&&supa.auth.getSession?await supa.auth.getSession():null;
    if(sessionResult&&sessionResult.error)throw sessionResult.error;
    if(sessionResult&&sessionResult.data&&!sessionResult.data.session){setSharedSyncState('error','Sign-in needs attention');recordAppDiagnostic('lifecycle','session','missing');return false}
    await syncServerClock(false);
    var check=await checkSharedRevision({reloadNow:true});
    if(nightSelectionMode==='automatic')refreshAutomaticNightOnReturn();
    if(!realtimeSubscribed)subscribeToChanges();
    if(typeof verifyRuntimeHealth==='function')verifyRuntimeHealth();
    updateNetworkStatus();
    recordAppDiagnostic('lifecycle','resume',reason||'unknown');
    return !(check&&check.error)
  }catch(error){recordAppDiagnostic('lifecycle','resume',error&&error.code||'failed');setSharedSyncState('reconnecting','Reconnecting live updates…');scheduleRealtimeReconnect();return false}
}

function updateOfflineControls(){
  var offline=!navigator.onLine||forcedOfflineSession,writeBlocked=sharedWritesBlocked(),ids=['saveAllocationsBtn','saveNightRolesBtn','resetNightRolesBtn','saveTeamVersionBtn','previewExtendBtn','extendBtn'];
  ids.forEach(function(id){var el=byId(id);if(el)el.disabled=offline||writeBlocked||el.dataset.workflowBlocked==='true'});
  var addAccount=byId('addAccountBtn');if(addAccount)addAccount.disabled=offline;
  var cover=byId('saveFiveCoverBtn');if(cover)cover.disabled=offline||writeBlocked;
  var labour=byId('saveLabourOrderBtn');if(labour)labour.disabled=offline||writeBlocked;
  renderWriteGuardState();updateStaffingActionAvailability();
}

function sharedTransportLive(){
  if(realtimeSubscribed)return true;
  return !!(window.AnaestheticRuntime&&window.AnaestheticRuntime.coordinator&&!window.AnaestheticRuntime.coordinator.isLeader())
}
function updateNetworkStatus(){
  var live=sharedTransportLive();
  if(!navigator.onLine||forcedOfflineSession)setSharedSyncState('offline','');else if(currentUserProfile)setSharedSyncState(live?'live':'reconnecting',live?'':'Reconnecting live updates…');
  updateOfflineControls();
}

function chooseDate(inputId){
  var value=byId(inputId).value,previous=idx;if(!value){render();return}nightSelectionMode='manual';if(window.AnaestheticRuntime&&window.AnaestheticRuntime.state)window.AnaestheticRuntime.state.night.set('manual');
  if(value<R[0].date){idx=0;toast('The published roster begins on '+fmt(R[0].date));render();return}
  if(value>R[R.length-1].date){idx=R.length-1;toast('The roster is currently published only until '+fmt(R[R.length-1].date));render();return}
  var i=R.findIndex(function(r){return r.date>=value});idx=i<0?R.length-1:i;if(idx!==previous)document.body.setAttribute('data-date-direction',idx>previous?'next':'previous');if(R[idx].date!==value)toast('Next rostered night: '+fmt(R[idx].date));render();setTimeout(function(){document.body.removeAttribute('data-date-direction')},360);
}

function csvCell(value){return '"'+String(value==null?'':value).replaceAll('"','""')+'"'}

function exportCSV(){
  var headers=['Date','Actual nurse count','Status','First Part','Second Part','Pager','Reliever','Full-night Labour Ward / Pager','Seventh nurse','Additional staff','Absences','Overtime','Reliever cover choice','Notes'];
  var rows=R.map(function(original){
    var base=Object.assign({},original);base.mode='6';var r=applyChanges(base),plan=staffingPlan(base),extras=additionalNurses(plan),changes=changesFor(base.date),overtime=overtimeFor(base.date);
    return[base.date,plan.count,planIsProvisional(base)?'Provisional':extras.length?'Core finalised; additional staff as required':'Final',r.first1+' + '+r.first2,r.second1+' + '+r.second2,r.mode==='5'?'':r.pager,r.mode==='5'?'':r.reliever,r.mode==='5'?r.fullLW:'',r.mode==='7'?r.seventh:'',extras.map(function(o){return o.nurse_name}).join(' + '),changes.map(function(c){return c.absent_name+' ('+(c.reason||'Unavailable')+')'}).join('; '),overtime.map(function(o){return o.nurse_name+' ('+(o.allocation_key?allocationLabel(o.allocation_key):'Awaiting allocation')+')'}).join('; '),plan.coverageKey?allocationLabel(plan.coverageKey):'',r.notes||''].map(csvCell).join(',');
  });
  download('anaesthetic-roster-v'+APP_VERSION.replace('.','-')+'.csv',headers.map(csvCell).join(',')+'\n'+rows.join('\n'),'text/csv');
}

async function backup(){
  if(!requireOnline())return;
  toast('Preparing roster-data export');
  var allHistory=await Promise.all([supa.from('night_change_history').select('*').order('changed_at',{ascending:false}),supa.from('night_overtime_history').select('*').order('changed_at',{ascending:false}),supa.from('night_role_override_history').select('*').order('changed_at',{ascending:false})]);
  if(allHistory.some(function(x){return x.error})){toast('The roster-data export could not be prepared');return}
  var createdAt=new Date().toISOString();download('roster-data-export-v'+APP_VERSION.replace('.','-')+'.json',JSON.stringify({created_at:createdAt,app_version:APP_VERSION,scope_note:'Roster and administrator data only. Private profile details and profile photos are excluded.',roster_settings:rosterSettings,rotation_versions:rotationVersions,night_changes:nightChanges,night_overtime:nightOvertime,absence_history:allHistory[0].data||[],overtime_history:allHistory[1].data||[],night_role_overrides:Object.values(nightRoleOverrides),night_role_override_history:allHistory[2].data||[],five_nurse_cover:fiveCoverChoices,labour_ward_orders:Object.values(labourOrders),night_plan_statuses:Object.values(nightPlanStatuses),app_settings:appSettings,authorised_accounts:authorisedAccounts},null,2),'application/json');appStorage.setItem('anaes_last_backup_at',createdAt);renderDiagnostics();
}

function fallbackUpdateMeta(){return{version:'',date:'',title:'Night Roster update',summary:'The latest Night Roster improvements are ready to install.',changes:['Reliability, clarity and interface improvements are ready.'],update_policy:'important'}}

function validUpdateMeta(value){return !!(value&&typeof value==='object'&&/^\d+(?:\.\d+)+$/.test(String(value.version||''))&&typeof value.title==='string'&&Array.isArray(value.changes)&&value.changes.length&&value.changes.every(function(item){return typeof item==='string'&&item.trim().length>0})&&(!value.update_policy||['automatic','quiet','normal','important'].indexOf(value.update_policy)>=0))}
function updateIsAutomatic(){return !!(pendingUpdateMeta&&(pendingUpdateMeta.update_policy==='automatic'||pendingUpdateMeta.update_policy==='quiet'))}
function cacheVersionNumber(value){var match=String(value||'').match(/anaesthetic-night-roster-v(\d+(?:-\d+)+)/);return match?match[1].replace(/-/g,'.'):''}
function waitingUpdateDeferralKey(){return'anaes_update_later_'+(waitingUpdateVersion||(pendingUpdateMeta&&pendingUpdateMeta.version)||'unknown')}
function clearUpdateNotice(){var banner=byId('updateBanner'),dialog=byId('updateDetails');if(banner)banner.classList.add('hidden');if(dialog&&dialog.open)dialog.close()}
function classifyWaitingUpdate(){
  var incoming=waitingUpdateVersion||(pendingUpdateMeta&&pendingUpdateMeta.version)||'',active=cacheVersionNumber(serviceWorkerCacheVersion);
  if(incoming&&incoming!==APP_VERSION)return'new';
  if(incoming&&active===incoming)return'refresh';
  return'finish';
}
function workerCacheName(worker){
  if(!worker||typeof MessageChannel!=='function')return Promise.resolve('');
  return new Promise(function(resolve){
    var settled=false,channel=new MessageChannel(),timer=setTimeout(function(){if(!settled){settled=true;resolve('')}},900);
    channel.port1.onmessage=function(event){if(settled)return;settled=true;clearTimeout(timer);resolve(event.data&&event.data.type==='CACHE_VERSION'?String(event.data.value||''):'')};
    try{worker.postMessage({type:'GET_CACHE_VERSION'},[channel.port2])}catch(error){clearTimeout(timer);settled=true;resolve('')}
  });
}

function workerCacheHealth(worker,type){
  if(!worker||typeof MessageChannel!=='function')return Promise.resolve(null);
  return new Promise(function(resolve){
    var settled=false,channel=new MessageChannel(),timer=setTimeout(function(){if(!settled){settled=true;resolve(null)}},2500);
    channel.port1.onmessage=function(event){
      if(settled)return;var data=event&&event.data||{};
      if(data.type!=='CACHE_HEALTH')return;
      settled=true;clearTimeout(timer);resolve(data)
    };
    try{worker.postMessage({type:type||'VERIFY_CACHE'},[channel.port2])}catch(error){clearTimeout(timer);settled=true;resolve(null)}
  })
}
async function verifyAndRepairAppShell(force){
  var worker=navigator.serviceWorker&&navigator.serviceWorker.controller;if(!worker)return null;
  if(!force&&Date.now()-lastCacheVerifyAt<15*60*1000)return null;
  if(cacheRepairInFlight)return cacheRepairInFlight;
  lastCacheVerifyAt=Date.now();
  cacheRepairInFlight=(async function(){
    var first=await workerCacheHealth(worker,'VERIFY_CACHE');
    if(!first){recordAppDiagnostic('update','cache-health','unavailable');return null}
    var missing=Array.isArray(first.missing)?first.missing:[];
    if(!missing.length){recordAppDiagnostic('update','cache-health','healthy');return first}
    recordAppDiagnostic('update','cache-health','repair-'+missing.length);
    var repaired=await workerCacheHealth(worker,'REPAIR_CACHE');
    if(!repaired||Array.isArray(repaired.missing)&&repaired.missing.length){recordAppDiagnostic('update','cache-health','repair-failed');return repaired}
    recordAppDiagnostic('update','cache-health','repaired');return repaired
  })();
  try{return await cacheRepairInFlight}finally{cacheRepairInFlight=null}
}
async function refreshControllerCacheVersion(){
  var worker=navigator.serviceWorker&&navigator.serviceWorker.controller;if(!worker)return'';
  var value=await workerCacheName(worker);if(value){serviceWorkerCacheVersion=value;renderDiagnostics()}return value;
}
function verifyRuntimeHealth(){
  var release=installedReleaseState(),expected='anaesthetic-night-roster-v'+APP_VERSION.replaceAll('.','-'),healthy=RELEASE_HISTORY[0]&&RELEASE_HISTORY[0].version===APP_VERSION&&(!navigator.serviceWorker||!navigator.serviceWorker.controller||serviceWorkerCacheVersion==='Checking…'||serviceWorkerCacheVersion==='Not active'||serviceWorkerCacheVersion===expected);
  if(!healthy){recordAppDiagnostic('update','runtime-health','mismatch');verifyAndRepairAppShell(true);setSharedSyncState('error','App update needs attention');return false}
  if(release.stale){recordAppDiagnostic('update','runtime-health','stale-cache');verifyAndRepairAppShell(true);return false}
  verifyAndRepairAppShell(false);return true
}

function renderPendingUpdate(){
  var meta=pendingUpdateMeta||fallbackUpdateMeta(),serverRequired=compatibilityNeedsUpdate(),automatic=!serverRequired&&updateIsAutomatic(),incoming=waitingUpdateVersion||meta.version||'',state=waitingUpdateState||classifyWaitingUpdate(),version=incoming?'Version '+incoming+(meta.date?' · '+meta.date:''):'Update ready';
  var banner=byId('updateBanner'),bannerVersion=byId('updateBannerVersion'),bannerTitle=banner&&banner.querySelector('.updateBannerSummary b'),bannerSmall=banner&&banner.querySelector('.updateBannerSummary small'),sheetVersion=byId('updateDetailsVersion'),sheetTitle=byId('updateDetailsTitle'),sheetSummary=byId('updateDetailsSummary'),safety=byId('updateSafetyNote'),list=byId('updateChangesList'),laterBanner=byId('laterUpdateBtn'),laterSheet=byId('laterUpdateSheetBtn');
  if(banner)banner.classList.toggle('automatic',automatic);
  if(state==='finish'){
    if(bannerVersion)bannerVersion.textContent=(incoming?'Version '+incoming:'This version')+' is already open';
    if(bannerTitle)bannerTitle.textContent='Finish installing the update';
    if(bannerSmall)bannerSmall.textContent='One quick restart will sync the app cache.';
    if(sheetVersion)sheetVersion.textContent='Finish install · '+(incoming||APP_VERSION);
  }else if(state==='refresh'){
    if(bannerVersion)bannerVersion.textContent=(incoming?'Version '+incoming:'Current version')+' · app components';
    if(bannerTitle)bannerTitle.textContent='Finish refreshing Night Roster';
    if(bannerSmall)bannerSmall.textContent='The app is open, but updated components are still waiting.';
    if(sheetVersion)sheetVersion.textContent='Component refresh · '+(incoming||APP_VERSION);
  }else{
    if(bannerVersion)bannerVersion.textContent=serverRequired?'Safety update · '+version:(automatic?'Ready for next reopen · '+version:version);
    if(bannerTitle)bannerTitle.textContent=serverRequired?'Important Night Roster update required':'Night Roster update ready';
    if(bannerSmall)bannerSmall.textContent=serverRequired?'Shared changes stay paused until this update is installed.':(automatic?'No action required. It will install safely when Night Roster is next reopened.':(meta.title||'Review what changed or update now.'));
    if(sheetVersion)sheetVersion.textContent=serverRequired?'Required safety update · '+version:(automatic?'Automatic update · '+version:version);
  }
  if(sheetTitle)sheetTitle.textContent=serverRequired&&state==='new'?'Update required before shared changes':state==='new'?(meta.title||'Night Roster update'):'Finish installing '+(incoming||APP_VERSION);
  if(sheetSummary)sheetSummary.textContent=serverRequired&&state==='new'?'You can continue viewing the roster, but shared changes are disabled until this version is installed. Review what changed, then choose Update.':state==='new'?(meta.summary||'Review what is changing, then update when convenient.'):'The visible app and its cached PWA shell are temporarily on different states. Updating once will activate the waiting service worker and reopen Night Roster in sync.';
  if(safety){var copy=safety.querySelector('span');if(copy)copy.innerHTML=serverRequired?'<b>Your shared roster data stays intact.</b> Viewing remains available while shared editing waits for the required update.':automatic?'<b>Your shared roster data stays intact.</b> Close and reopen Night Roster to take this update automatically, or update now.':'<b>Your shared roster data stays intact.</b> The app will reopen once after the waiting update is activated.'}
  if(laterBanner)laterBanner.classList.toggle('hidden',serverRequired);
  if(laterSheet)laterSheet.classList.toggle('hidden',serverRequired);
  if(list)list.innerHTML=meta.changes.map(function(change){return'<li>'+esc(change)+'</li>'}).join('');
}

async function loadPendingUpdateMeta(){
  pendingUpdateMeta=fallbackUpdateMeta();renderPendingUpdate();
  try{var response=await fetch('./release.json?check='+Date.now(),{cache:'no-store',credentials:'same-origin'});if(!response.ok)throw new Error('Release information unavailable');var value=await response.json();if(validUpdateMeta(value))pendingUpdateMeta=value}catch(error){}
  if(!waitingUpdateVersion&&pendingUpdateMeta&&pendingUpdateMeta.version)waitingUpdateVersion=pendingUpdateMeta.version;
  waitingUpdateState=classifyWaitingUpdate();renderPendingUpdate();return pendingUpdateMeta;
}

async function showUpdate(registration){
  updateRegistration=registration;var waiting=registration&&registration.waiting;if(!waiting){clearUpdateNotice();renderWriteGuardState();renderDiagnostics();return}
  pendingUpdateMeta=null;waitingUpdateVersion=cacheVersionNumber(await workerCacheName(waiting));await loadPendingUpdateMeta();waitingUpdateState=classifyWaitingUpdate();renderPendingUpdate();renderDiagnostics();
  sessionStorage.removeItem('anaes_update_later');
  if(sessionStorage.getItem(waitingUpdateDeferralKey())==='1'&&!updateIsAutomatic()&&!compatibilityNeedsUpdate()){renderWriteGuardState();return}
  var banner=byId('updateBanner');if(banner)banner.classList.remove('hidden');renderWriteGuardState();
}

function openUpdateDetails(){var dialog=byId('updateDetails');if(!dialog||!dialog.showModal)return;renderPendingUpdate();byId('updateDetailsStatus').textContent=compatibilityNeedsUpdate()?'Shared roster viewing remains available, but shared changes require this update.':updateIsAutomatic()?'This update will install on a future reopen even if you do nothing.':waitingUpdateState==='new'?'':'Night Roster will reopen once to finish synchronising this version.';if(!dialog.open)dialog.showModal()}

function dismissWaitingUpdate(){if(compatibilityNeedsUpdate()){toast('This safety update is required before shared changes can be made');renderPendingUpdate();return}sessionStorage.setItem(waitingUpdateDeferralKey(),'1');clearUpdateNotice();toast(updateIsAutomatic()?'Update will install when Night Roster is reopened':'Update saved for later')}

function finishUpdateActivation(){
  if(updateActivationTimer){clearTimeout(updateActivationTimer);updateActivationTimer=null}
  clearUpdateNotice();waitingUpdateVersion='';waitingUpdateState='new';
}
function resetUpdateButtons(){
  [byId('applyUpdateBtn'),byId('applyUpdateSheetBtn'),byId('diagnosticUpdateBtn')].forEach(function(button){if(button){button.disabled=false;button.textContent='Update'}});
}
function applyWaitingUpdate(){
  if(!updateRegistration||!updateRegistration.waiting){clearUpdateNotice();toast('Night Roster is already up to date');return}
  var pendingDrafts=allLocalChangesDraftParts(),status=byId('updateDetailsStatus');if(pendingDrafts.length){if(status)status.textContent='You have unfinished Changes selections. Save or clear them before updating so your work is not lost.';toast('Finish your unsaved Changes before updating');return}
  var buttons=[byId('applyUpdateBtn'),byId('applyUpdateSheetBtn'),byId('diagnosticUpdateBtn')];reloadForUpdate=true;sessionStorage.removeItem(waitingUpdateDeferralKey());buttons.forEach(function(button){if(button){button.disabled=true;button.textContent='Updating…'}});if(status)status.textContent='Activating the update. Night Roster will reopen automatically.';
  updateRegistration.waiting.postMessage({type:'ACTIVATE_UPDATE'});
  if(updateActivationTimer)clearTimeout(updateActivationTimer);
  updateActivationTimer=setTimeout(async function(){
    if(!reloadForUpdate)return;
    try{if(updateRegistration)await updateRegistration.update()}catch(error){}
    if(updateRegistration&&!updateRegistration.waiting){finishUpdateActivation();reloadForUpdate=false;window.location.reload();return}
    reloadForUpdate=false;resetUpdateButtons();if(status)status.textContent='The update is still waiting. Try Update once more.';toast('Update is still waiting to activate');
  },5000);
}

function applyStandaloneUi(){
  pwaStandalone=isStandaloneApp();document.body.classList.toggle('standaloneApp',pwaStandalone);
  var install=byId('installBtn'),accountInstall=byId('accountInstallBtn');
  if(install)install.classList.toggle('hidden',pwaStandalone||(!deferredInstallPrompt&&!/iphone|ipad|ipod/i.test(navigator.userAgent)));
  if(accountInstall)accountInstall.classList.toggle('hidden',pwaStandalone);
}
function setupViewportState(){
  function update(){
    var viewport=window.visualViewport,active=document.activeElement,editable=!!(active&&/^(INPUT|TEXTAREA|SELECT)$/.test(active.tagName)),height=viewport?viewport.height:window.innerHeight;
    document.documentElement.style.setProperty('--app-viewport-height',Math.round(height)+'px');
    var keyboard=!!(viewport&&editable&&window.innerHeight-viewport.height>120);
    document.body.classList.toggle('keyboardVisible',keyboard);
  }
  if(window.visualViewport){window.visualViewport.addEventListener('resize',update);window.visualViewport.addEventListener('scroll',update)}
  window.addEventListener('orientationchange',function(){setTimeout(update,120)});
  document.addEventListener('focusin',function(){setTimeout(update,60)});document.addEventListener('focusout',function(){setTimeout(update,120)});update();
}
function setupPWA(){
  var install=byId('installBtn');
  applyStandaloneUi();setupViewportState();
  window.addEventListener('beforeinstallprompt',function(e){e.preventDefault();deferredInstallPrompt=e;applyStandaloneUi();var guide=byId('installGuide');if(guide&&guide.open){byId('installGuideSteps').innerHTML=installGuideSteps();bindInstallGuideActions()}});
  install.onclick=async function(){if(deferredInstallPrompt){await runInstallPrompt();return}showInstallGuide()};
  window.addEventListener('appinstalled',function(){deferredInstallPrompt=null;applyStandaloneUi();toast('Night Roster installed')});
  byId('applyUpdateBtn').onclick=applyWaitingUpdate;byId('applyUpdateSheetBtn').onclick=applyWaitingUpdate;byId('openUpdateDetailsBtn').onclick=openUpdateDetails;byId('laterUpdateBtn').onclick=dismissWaitingUpdate;byId('laterUpdateSheetBtn').onclick=dismissWaitingUpdate;
  if(navigator.serviceWorker&&typeof navigator.serviceWorker.addEventListener==='function'&&typeof navigator.serviceWorker.register==='function'){
    navigator.serviceWorker.addEventListener('message',function(event){if(event.data&&event.data.type==='CACHE_VERSION'){serviceWorkerCacheVersion=event.data.value||'Unknown';renderDiagnostics();verifyRuntimeHealth()}});navigator.serviceWorker.addEventListener('controllerchange',function(){finishUpdateActivation();refreshControllerCacheVersion().then(verifyRuntimeHealth);if(reloadForUpdate){reloadForUpdate=false;window.location.reload()}else renderDiagnostics()});
    var check=function(){if(window.AnaestheticRuntime&&window.AnaestheticRuntime.coordinator&&!window.AnaestheticRuntime.coordinator.isLeader())return;if(updateRegistration&&navigator.onLine)updateRegistration.update().catch(function(){})};
    window.addEventListener('load',async function(){try{updateRegistration=await navigator.serviceWorker.register('./service-worker.js',{updateViaCache:'none'});updateRegistration.addEventListener('updatefound',function(){var worker=updateRegistration.installing;if(!worker)return;worker.addEventListener('statechange',function(){if(worker.state==='installed'&&navigator.serviceWorker.controller)showUpdate(updateRegistration)})});await navigator.serviceWorker.ready;if(navigator.serviceWorker.controller){var activeCache=await refreshControllerCacheVersion();if(!activeCache)navigator.serviceWorker.controller.postMessage({type:'GET_CACHE_VERSION'});else verifyRuntimeHealth();await verifyAndRepairAppShell(!!(runtimeRecoveryStatus&&runtimeRecoveryStatus.safeMode))}else{serviceWorkerCacheVersion='Not active';renderDiagnostics()}if(updateRegistration.waiting)await showUpdate(updateRegistration);if(!window.AnaestheticRuntime||!window.AnaestheticRuntime.coordinator||window.AnaestheticRuntime.coordinator.isLeader())await updateRegistration.update();if(window.AnaestheticRuntime&&window.AnaestheticRuntime.scheduler)window.AnaestheticRuntime.scheduler.every('pwa-update',900000,check);else setInterval(check,900000)}catch(e){serviceWorkerCacheVersion='Not active';renderDiagnostics()}});
    window.addEventListener('focus',check);document.addEventListener('visibilitychange',function(){if(document.visibilityState==='visible')check()});
  }
  var closeInstall=byId('closeInstallGuide'),closeRelease=byId('closeReleaseNotes'),releaseDialog=byId('releaseNotes');if(closeInstall)closeInstall.onclick=function(){byId('installGuide').close()};if(closeRelease)closeRelease.onclick=function(){releaseDialog.close()};if(releaseDialog&&typeof releaseDialog.addEventListener==='function')releaseDialog.addEventListener('close',function(){if(releaseDialog.dataset.releaseMode==='current'||releaseDialog.dataset.releaseMode==='history')markCurrentReleaseSeen();releaseNotesQueued=false;showOnboardingIfNeeded()});showReleaseNotesIfNeeded();
  if(window.matchMedia){var standaloneQuery=window.matchMedia('(display-mode: standalone)');var standaloneChanged=function(){applyStandaloneUi()};if(standaloneQuery.addEventListener)standaloneQuery.addEventListener('change',standaloneChanged)}
  applyStandaloneUi();showSharedWelcomeIfRequested();
}

