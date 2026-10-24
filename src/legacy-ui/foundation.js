/* Anaesthetic Night Roster V56.2 interface, staffing, allocation and PWA features. */
var historyExpandedDates={};
var historyLoadedDates={};
var historyLoadingDates={};
var historyInvalidationVersions={};
var historyErrorDates={};
var historyPageState={};
var sharedLoadPromise=null;
var sharedReloadPending=false;
var sharedReloadPendingBackground=true;
var reloadTimer=null;
var updateRegistration=null;
var reloadForUpdate=false;
var serviceWorkerCacheVersion='Checking…';
var waitingUpdateVersion='';
var waitingUpdateState='new';
var updateActivationTimer=null;
var pendingRemovals={};
var labourOrders={};
var nightTeamIdentities={};
var labourOrderAvailable=true;
var allocationDrafts={};
var labourOrderDrafts={};
var nightRoleOverrideDrafts={};
var nightRoleOverrideAvailable=true;
var seventhDecisionDrafts={};
var allocationSaveInFlight=false;
var changesViewPrepared=false;
var activeChangesStep='staffing';
var changesSmartDefaultDate='';
var initialNightChosen=false;
var automaticSelectedDate=null;
var nightSelectionMode='automatic';
var serverClockSyncInFlight=false;
var serverClockLastAttempt=0;
var sharedSyncState='starting';
var sharedSyncMessage='Opening shared roster';
var compatibilityStartupUseCount=0;
var compatibilityStartupLastUsed='';
var rosterCommandInFlight={};var rosterCommandIds={};
var freshnessTimer=null;
var lastResumeRefresh=0;
var sharedSyncTimer=null;
var sharedSyncCheckInFlight=false;
var lastObservedSyncRevision=null;
var lastObservedAccessEpoch=null;
var accessStatusCheckPromise=null;
var accessLossInFlight=false;
var appCompatibility={minimum_read_version:'37.0',minimum_write_version:'41.0',recommended_version:'41.1',maintenance_mode:false,maintenance_message:'Shared roster editing has been temporarily paused.',write_allowed:false,write_status:'update_required'};
var editingAbsenceId=null;
var realtimeGeneration=0;
var realtimeReconnectTimer=null;
var realtimeRetryCount=0;
var realtimeSubscribed=false;
var onboardingStep=0;
var onboardingCandidate=!educationSeen('main',3);
var onboardingReplay=false;
var onboardingDeferredSession=false;
var onboardingChatIntro=false;
var onboardingFeatureKey='';
var onboardingClockChangeDate='';
var onboardingGuideMenu=false;
var clockChangeSessionNotices={};
var clockChangeEducationTimer=null;
var onboardingDirection=1;
var onboardingProfileDraft=null;
var releaseNotesQueued=false;
var pendingProfilePhoto=null;
var pendingProfilePhotoUrl='';
var profileSavedSignature='';
var shiftAvatarUrl='';
var pendingShiftPhoto=null;
var pendingShiftPhotoUrl='';
var photoCropState={file:null,url:'',target:'profile',image:null};
var launchStartedAt=Date.now();
var launchFinished=false;
var launchSlowTimer=null;
var launchRecoveryVisible=false;
var forcedOfflineSession=false;
var startupAttempt=0;
var changedSinceSession={};
var activityOpenedThisSession={};
var lastFailedAction=null;
var scrollChromeFrame=null;
var pendingUpdateMeta=null;
var pwaStandalone=false;
var sharedWelcomeEntry=false;
var sharedLoadFailureStage='';
var sharedLoadFailureCode='';
var startupSnapshotTimeoutMs=7000;
var startupFallbackTimeoutMs=15000;
var recentActivityItems=[];
var recentActivityDate='';
var runtimeRecoveryStatus={safeMode:false,attempts:0,safeModeUntil:0};
var cacheRepairInFlight=null;
var lastCacheVerifyAt=0;

var RELEASE_ACTIONS={
  "37.98":[{label:"Share Night Roster",action:"share"},{label:"View version history",action:"history"}],
  "37.97":[
    {label:"Open Night",action:"view",value:"today"},
    {label:"View version history",action:"history"}
  ],
  "37.96":[
    {label:"Open Night",action:"view",value:"today"},
    {label:"Share Night Roster",action:"share"},
    {label:"View version history",action:"history"}
  ],
  "37.95":[
    {label:"Open Breaks",action:"view",value:"breaks"},
    {label:"Open app guide",action:"guide"},
    {label:"View version history",action:"history"}
  ],
  "37.93":[
    {label:"Open app guide",action:"guide"},
    {label:"Open Team Chat",action:"view",value:"chat"},
    {label:"View version history",action:"history"}
  ]
};


function cinematicMotionAllowed(){return !(window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches)}
function formatDutyHours(value){var total=Math.round(Number(value||0)*60),hours=Math.floor(total/60),minutes=total%60;return hours+'h'+(minutes?' '+minutes+'m':'')}
function clockChangeDetailFor(date){
  var timing=nightDutyTiming(date);if(!timing.isClockChange)return null;
  var back=timing.direction==='back',part=formatDutyHours(timing.partHours),total=formatDutyHours(timing.totalHours);
  return{direction:timing.direction,title:'Clock change night',transitionLabel:back?'Clocks move back one hour':'Clocks move forward one hour',handover:timing.handover,handoverDisplay:timing.handoverDisplay,firstPeriod:timing.firstPeriodDisplay,secondPeriod:timing.secondPeriod,partHours:timing.partHours,partHoursLabel:part,totalHours:timing.totalHours,totalHoursLabel:total,summary:(back?'The repeated hour makes the 00:00–07:00 duty window '+total+'. ':'The skipped hour makes the 00:00–07:00 duty window '+total+'. ')+'Handover moves to '+timing.handoverDisplay+' so First Part and Second Part each work '+part+' of actual duty.',date:date,transitionUtc:timing.transitionUtc,startOffset:timing.startOffset,endOffset:timing.endOffset}
}
function clockChangeEducationKey(date){return'anaes_clock_change_education_'+date}
function clockChangeEducationSeen(date){try{return!!appStorage.getItem(clockChangeEducationKey(date))}catch(error){return false}}
function markClockChangeEducationSeen(date){if(!date)return;try{appStorage.setItem(clockChangeEducationKey(date),'1')}catch(error){}}
function clockChangeReminderKey(kind,date){return'anaes_clock_change_'+kind+'_'+date}
function clockChangeReminderSeen(kind,date){try{return!!appStorage.getItem(clockChangeReminderKey(kind,date))}catch(error){return false}}
function markClockChangeReminderSeen(kind,date){try{appStorage.setItem(clockChangeReminderKey(kind,date),'1')}catch(error){}}
function maybeLiveClockChangeNotification(date,timing){
  if(!timing||!timing.isClockChange||typeof Notification==='undefined'||Notification.permission!=='granted'||clockChangeReminderSeen('live',date))return;
  var clock=maltaDateParts(),operational=operationalRosterDate(new Date());if(operational!==date||!(clock.hour>=19||clock.hour<7))return;
  if(!navigator.serviceWorker||typeof navigator.serviceWorker.getRegistration!=='function')return;
  navigator.serviceWorker.getRegistration().then(function(registration){if(!registration||typeof registration.showNotification!=='function')return;var detail=clockChangeDetailFor(date);return registration.showNotification('Clock change tonight',{body:detail.transitionLabel+'. Equal-duty handover is '+detail.handoverDisplay+' · '+detail.partHoursLabel+' each.',icon:APP_URL+'icon-192.png?v='+APP_VERSION,badge:APP_URL+'icon-192.png?v='+APP_VERSION,tag:'clock-change-'+date,renotify:false,data:{type:'roster',url:APP_URL+'?view=night&date='+encodeURIComponent(date),rosterDate:date}}).then(function(){markClockChangeReminderSeen('live',date)})}).catch(function(){})
}
function maybeUpcomingClockChangeReminder(){
  if(!currentUserProfile||!R.length)return;var today=operationalRosterDate(new Date()),next=R.find(function(row){var delta=daysBetween(today,row.date);return delta>0&&delta<=7&&nightDutyTiming(row.date).isClockChange});if(!next||clockChangeReminderSeen('advance',next.date))return;
  var detail=clockChangeDetailFor(next.date);markClockChangeReminderSeen('advance',next.date);toast('Clock-change roster night on '+fmt(next.date)+' · equal handover '+detail.handoverDisplay+' · '+detail.partHoursLabel+' each')
}
function queueClockChangeAttention(date){
  var timing=nightDutyTiming(date);if(!timing.isClockChange)return;var detail=clockChangeDetailFor(date);
  if(!clockChangeSessionNotices[date]){clockChangeSessionNotices[date]=true;toast(detail.transitionLabel+' · equal-duty handover '+detail.handoverDisplay+' · '+detail.partHoursLabel+' each')}
  maybeLiveClockChangeNotification(date,timing);
  if(!clockChangeEducationSeen(date)&&educationSeen('main',2)){if(clockChangeEducationTimer)clearTimeout(clockChangeEducationTimer);clockChangeEducationTimer=setTimeout(function(){showClockChangeEducation(date,false)},cinematicMotionAllowed()?380:30)}
}
function setLaunchState(title,status){
  var screen=byId('launchScreen');if(!screen||launchFinished)return;
  var heading=byId('launchTitle'),message=byId('launchStatus'),changed=false;
  if(heading&&title&&heading.textContent!==title){heading.textContent=title;changed=true}
  if(message&&status&&message.textContent!==status){message.textContent=status;changed=true}
  if(changed){screen.classList.remove('launchStateChanged');void screen.offsetWidth;screen.classList.add('launchStateChanged')}
}

function plainSnapshotRecord(value){return !!value&&typeof value==='object'&&!Array.isArray(value)}

function snapshotRowsByDate(value){
  var result={};if(!plainSnapshotRecord(value))return result;Object.keys(value).forEach(function(date){if(Array.isArray(value[date]))result[date]=value[date].filter(plainSnapshotRecord)});return result
}

function snapshotRecordsByDate(value){
  var result={};if(!plainSnapshotRecord(value))return result;Object.keys(value).forEach(function(date){if(plainSnapshotRecord(value[date]))result[date]=value[date]});return result
}

function rowsGroupedByDate(rows){
  var result={};(Array.isArray(rows)?rows:[]).forEach(function(row){if(plainSnapshotRecord(row)&&typeof row.roster_date==='string')(result[row.roster_date]||(result[row.roster_date]=[])).push(row)});return result
}

function rowsIndexedByDate(rows){
  var result={};(Array.isArray(rows)?rows:[]).forEach(function(row){if(plainSnapshotRecord(row)&&typeof row.roster_date==='string')result[row.roster_date]=row});return result
}

function nightTeamIdentityFor(date){
  var best=null,bestTime=-Infinity,bestDate='';
  Object.keys(nightTeamIdentities||{}).forEach(function(key){
    var row=nightTeamIdentities[key],value=plainSnapshotRecord(row)&&typeof row.nickname==='string'?row.nickname.trim():'';
    if(!value)return;
    var stamp=Date.parse(row.updated_at||''),rowDate=String(row.roster_date||key||'');
    if(!Number.isFinite(stamp))stamp=0;
    if(!best||stamp>bestTime||(stamp===bestTime&&rowDate>bestDate)){best=row;bestTime=stamp;bestDate=rowDate}
  });
  return best
}
async function requestStartupSnapshot(){
  var token=currentAccessToken;
  if(!token){
    var authState=await withTimeout(supa.auth.getSession(),10000,'The sign-in session did not respond.');
    if(authState.error)throw authState.error;
    rememberAuthSession(authState.data&&authState.data.session);token=currentAccessToken;
  }
  if(!token){var sessionError=new Error('Your sign-in session is no longer available.');sessionError.code='401';throw sessionError}
  var controller=window.AbortController?new window.AbortController():null,timer=controller?setTimeout(function(){controller.abort()},startupSnapshotTimeoutMs):null;
  try{
    return await withTimeout((async function(){
      var response=await fetch(SUPABASE_URL+'/rest/v1/rpc/get_roster_startup_v49',{method:'POST',headers:{apikey:SUPABASE_KEY,Authorization:'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify({p_client_version:APP_VERSION}),cache:'no-store',credentials:'omit',signal:controller?controller.signal:undefined});
      var body=await response.text(),data=null;try{data=body?JSON.parse(body):null}catch(parseError){var invalidError=new Error('The shared roster returned unreadable information.');invalidError.code='INVALID_RESPONSE';throw invalidError}
      if(!response.ok){var requestError=new Error(data&&data.message||'The shared roster could not be loaded.');requestError.code=data&&data.code||String(response.status);requestError.status=response.status;throw requestError}
      return data;
    })(),startupSnapshotTimeoutMs+500,'The shared roster snapshot did not settle.');
  }catch(error){if(error&&error.name==='AbortError'){var timeoutError=new Error('The shared roster did not respond.');timeoutError.code='TIMEOUT';throw timeoutError}throw error}
  finally{if(timer)clearTimeout(timer)}
}

async function requestStartupSnapshotXhr(){
  var token=currentAccessToken;
  if(!token){
    var authState=await withTimeout(supa.auth.getSession(),10000,'The sign-in session did not respond.');
    if(authState.error)throw authState.error;
    rememberAuthSession(authState.data&&authState.data.session);token=currentAccessToken;
  }
  if(!token){var sessionError=new Error('Your sign-in session is no longer available.');sessionError.code='401';throw sessionError}
  if(!window.XMLHttpRequest){var unsupportedError=new Error('This browser cannot use the Android roster connection.');unsupportedError.code='UNSUPPORTED_TRANSPORT';throw unsupportedError}
  return new Promise(function(resolve,reject){
    var settled=false,xhr=new window.XMLHttpRequest(),timer=null;
    function finish(error,value){if(settled)return;settled=true;if(timer)clearTimeout(timer);xhr.onload=xhr.onerror=xhr.onabort=xhr.ontimeout=null;if(error)reject(error);else resolve(value)}
    function transportError(message,code,status){var error=new Error(message);error.code=code||'NETWORK_ERROR';if(status)error.status=status;return error}
    try{
      xhr.open('POST',SUPABASE_URL+'/rest/v1/rpc/get_roster_startup_v49',true);
      xhr.setRequestHeader('apikey',SUPABASE_KEY);xhr.setRequestHeader('Authorization','Bearer '+token);xhr.setRequestHeader('Content-Type','application/json');
      xhr.timeout=startupSnapshotTimeoutMs;
      xhr.onload=function(){
        var data=null;try{data=xhr.responseText?JSON.parse(xhr.responseText):null}catch(parseError){finish(transportError('The shared roster returned unreadable information.','INVALID_RESPONSE'));return}
        if(xhr.status<200||xhr.status>=300){finish(transportError(data&&data.message||'The shared roster could not be loaded.',data&&data.code||String(xhr.status),xhr.status));return}
        finish(null,data)
      };
      xhr.onerror=function(){finish(transportError('The shared roster connection failed.'))};
      xhr.onabort=function(){finish(transportError('The shared roster request was stopped.','TIMEOUT'))};
      xhr.ontimeout=function(){finish(transportError('The shared roster did not respond.','TIMEOUT'))};
      timer=setTimeout(function(){try{xhr.abort()}catch(error){}finish(transportError('The shared roster did not respond.','TIMEOUT'))},startupSnapshotTimeoutMs+500);
      xhr.send(JSON.stringify({p_client_version:APP_VERSION}));
    }catch(error){finish(error)}
  })
}

function startupAuthError(error){var code=String(error&&error.code||''),message=String(error&&error.message||'');return error&&Number(error.status)===401||code==='401'||code==='PGRST301'||code==='AUTH_SESSION_MISSING'||/jwt|token.*(?:expired|invalid)|session.*expired/i.test(message)}

async function requestStartupWithSessionRecovery(request){
  try{return await request()}
  catch(error){
    if(!startupAuthError(error))throw error;
    sharedLoadFailureStage='session';setLaunchState('Preparing your night','Renewing your secure sign-in…');
    try{await refreshAuthSession()}catch(refreshError){refreshError.code=refreshError.code||'AUTH_REFRESH_FAILED';refreshError.startupSessionFailed=true;throw refreshError}
    return request()
  }
}

function startupQuery(promise,message){return withTimeout(promise,startupFallbackTimeoutMs,message)}

function startupQueryFailed(result){return !result||!!result.error}

function preferCompatibilityStartup(){return /android/i.test(navigator.userAgent||'')}

async function compatibilitySyncState(){
  var results=await startupQuery(Promise.all([
    supa.from('app_sync_state').select('revision,updated_at').eq('id',1).maybeSingle(),
    supa.from('app_access_signal').select('access_epoch,updated_at').eq('id',1).maybeSingle()
  ]),'Roster state did not respond.');
  var syncResult=results[0],accessResult=results[1];
  if(startupQueryFailed(syncResult)||!syncResult.data){var error=syncResult&&syncResult.error||new Error('Roster revision could not be checked.');error.code=error.code||'REVISION_UNAVAILABLE';throw error}
  if(startupQueryFailed(accessResult)||!accessResult.data){var accessError=accessResult&&accessResult.error||new Error('Access revision could not be checked.');accessError.code=accessError.code||'ACCESS_REVISION_UNAVAILABLE';throw accessError}
  return{revision:Number(syncResult.data.revision||0),accessEpoch:Number(accessResult.data.access_epoch||0)}
}

async function requestCompatibilityStartup(){
  var email=currentUser&&String(currentUser.email||'').trim().toLowerCase();
  if(!email){var missingUser=new Error('Your sign-in account is unavailable.');missingUser.code='401';throw missingUser}
  sharedLoadFailureStage='access';setLaunchState('Preparing your night','Checking roster access…');
  var profileResult=await startupQuery(supa.from('allowed_users').select('*').eq('email',email).eq('active',true).maybeSingle(),'Roster access did not respond.');
  if(startupQueryFailed(profileResult))throw profileResult&&profileResult.error||new Error('Roster access could not be checked.');
  if(!profileResult.data||!profileResult.data.active){var accessError=new Error('This account is not authorised.');accessError.code='42501';throw accessError}

  for(var attempt=0;attempt<2;attempt++){
    var startingState=await compatibilitySyncState();
    sharedLoadFailureStage='staffing';setLaunchState('Preparing your night',attempt?'The roster changed while opening. Refreshing it once…':'Opening shared staffing through the compatibility route…');
    var changes=await startupQuery(supa.from('night_changes').select('*').order('updated_at',{ascending:true}),'Absence information did not respond.');
    var overtime=await startupQuery(supa.from('night_overtime').select('*').order('updated_at',{ascending:true}),'Overtime information did not respond.');
    var fiveCover=await startupQuery(supa.from('night_five_cover').select('*'),'Five-nurse information did not respond.');
    var settings=await startupQuery(supa.from('roster_settings').select('*').eq('id',1).maybeSingle(),'Roster settings did not respond.');
    var versions=await startupQuery(supa.from('rotation_versions').select('*').order('effective_from',{ascending:true}),'Rotation information did not respond.');
    var staffing=[changes,overtime,fiveCover,settings,versions];
    if(staffing.some(startupQueryFailed)||!settings.data||!(versions.data||[]).length)throw new Error('Shared staffing could not be loaded.');

    sharedLoadFailureStage='allocations';setLaunchState('Preparing your night','Opening selected-night allocations…');
    var labourOrder=await startupQuery(supa.from('night_labour_order').select('*'),'Labour Ward order did not respond.');
    var planStatus=await startupQuery(supa.from('night_plan_status').select('*'),'Night plan status did not respond.');
    var roleOverrides=await startupQuery(supa.from('night_role_overrides').select('*'),'Night-only roles did not respond.');
    var teamIdentity=await startupQuery(supa.from('night_team_identity').select('*'),'Shift nickname did not respond.');
    var allocations=[labourOrder,planStatus,roleOverrides];
    if(allocations.some(startupQueryFailed))throw new Error('Shared allocations could not be loaded.');

    sharedLoadFailureStage='support';
    var support=await startupQuery(Promise.all([
      supa.from('app_settings').select('*').eq('id',1).maybeSingle(),
      supa.from('app_schema_version').select('*').eq('id',1).maybeSingle(),
      supa.rpc('get_app_compatibility_v49',{p_client_version:APP_VERSION})
    ]),'Roster support information did not respond.').catch(function(){return[{data:null},{data:null},{data:null,error:{code:'COMPATIBILITY_UNAVAILABLE'}}]});
    var endingState=await compatibilitySyncState();
    if(startingState.revision===endingState.revision)return{
      profile:profileResult.data,
      night_changes:staffing[0].data||[],night_overtime:staffing[1].data||[],night_five_cover:staffing[2].data||[],
      roster_settings:staffing[3].data,rotation_versions:staffing[4].data||[],
      night_labour_order:allocations[0].data||[],night_plan_status:allocations[1].data||[],night_role_overrides:allocations[2].data||[],
      night_team_identity:teamIdentity&&!startupQueryFailed(teamIdentity)?teamIdentity.data||[]:[],
      app_settings:support[0]&&!support[0].error?support[0].data:null,
      schema_version:support[1]&&!support[1].error&&support[1].data?Number(support[1].data.version||0):0,
      compatibility:support[2]&&!support[2].error?support[2].data:null,
      access_epoch:endingState.accessEpoch,
      sync_revision:endingState.revision
    }
  }
  var changedError=new Error('The shared roster changed while it was opening. Try again.');changedError.code='REVISION_CHANGED';throw changedError
}

function readOfflineSnapshot(){
  try{
    var stored=JSON.parse(appStorage.getItem('anaes_offline_snapshot')||'null'),raw=stored;
    if(stored&&Number(stored.format)===2){
      raw=window.AnaestheticRuntime&&window.AnaestheticRuntime.snapshots?window.AnaestheticRuntime.snapshots.unpackSync(stored):null;
      if(!raw){appStorage.removeItem('anaes_offline_snapshot');recordAppDiagnostic('offline','snapshot','integrity-failed');return null}
    }
    if(!plainSnapshotRecord(raw)||!Array.isArray(raw.rotationVersions)||!raw.rotationVersions.length||!plainSnapshotRecord(raw.rosterSettings))return null;
    if(window.AnaestheticDomain&&window.AnaestheticDomain.snapshotIsExpired&&window.AnaestheticDomain.snapshotIsExpired(raw.saved_at,604800000,appNowMs())){appStorage.removeItem('anaes_offline_snapshot');if(window.AnaestheticRuntime&&window.AnaestheticRuntime.snapshots)window.AnaestheticRuntime.snapshots.remove('offline-roster');recordAppDiagnostic('offline','snapshot','expired');return null}
    var versions=raw.rotationVersions.filter(function(version){return plainSnapshotRecord(version)&&/^\d{4}-\d{2}-\d{2}$/.test(version.effective_from||'')&&validEstablishment(version)}).map(function(version){var copy=Object.assign({},version);copy.seventh_cycle=Array.isArray(version.seventh_cycle)&&version.seventh_cycle.length?version.seventh_cycle.filter(function(name){return typeof name==='string'&&name.trim()}):ORIGINAL_SEVENTH.slice();return copy});
    if(!versions.length||!/^\d{4}-\d{2}-\d{2}$/.test(raw.rosterSettings.published_until||''))return null;
    return{saved_at:typeof raw.saved_at==='string'&&!isNaN(Date.parse(raw.saved_at))?raw.saved_at:null,nightChanges:snapshotRowsByDate(raw.nightChanges),nightOvertime:snapshotRowsByDate(raw.nightOvertime),fiveCoverChoices:snapshotRecordsByDate(raw.fiveCoverChoices),rosterSettings:Object.assign({},raw.rosterSettings),rotationVersions:versions,labourOrders:snapshotRecordsByDate(raw.labourOrders),nightRoleOverrides:snapshotRecordsByDate(raw.nightRoleOverrides),nightPlanStatuses:snapshotRecordsByDate(raw.nightPlanStatuses),nightTeamIdentities:snapshotRecordsByDate(raw.nightTeamIdentities),appSettings:plainSnapshotRecord(raw.appSettings)?Object.assign({},raw.appSettings):null,schemaVersion:Number(raw.schemaVersion||0)||0,syncRevision:Number(raw.syncRevision||0)||0,accessEpoch:Number(raw.accessEpoch||0)||0,compatibility:normaliseAppCompatibility(raw.compatibility)}
  }catch(error){recordAppDiagnostic('offline','snapshot-read','failed');return null}
}

function hasOfflineSnapshot(){return !!readOfflineSnapshot()}

function cachedAllowedProfile(email){
  try{var cached=JSON.parse(appStorage.getItem('anaes_cached_profile')||'null');return cached&&cached.email===String(email||'').toLowerCase()&&cached.active?cached:null}catch(error){return null}
}

function showLaunchRecovery(message){
  var screen=byId('launchScreen');if(!screen||launchFinished)return;clearTimeout(launchSlowTimer);launchRecoveryVisible=true;setLaunchState('Connection taking longer',message||'The shared roster has not replied yet.');var recovery=byId('launchRecovery'),offline=byId('launchOfflineBtn'),offlineAvailable=!!(currentUser&&cachedAllowedProfile(currentUser.email)&&hasOfflineSnapshot());if(recovery)recovery.classList.remove('hidden');if(offline)offline.classList.toggle('hidden',!offlineAvailable);screen.classList.add('launchNeedsAction');screen.setAttribute('aria-busy','false')
}

function hideLaunchRecovery(){
  launchRecoveryVisible=false;var recovery=byId('launchRecovery');if(recovery)recovery.classList.add('hidden');var screen=byId('launchScreen');if(screen){screen.classList.remove('launchNeedsAction');screen.setAttribute('aria-busy','true')}
}

function syncPrimaryHeaderActions(){
  var admin=byId('adminSettingsBtn'),account=byId('accountBtn'),sourceAvatar=byId('accountAvatar'),sourceInitial=byId('accountInitial'),adminHidden=!admin||admin.classList.contains('hidden'),hasAvatar=!!(sourceAvatar&&!sourceAvatar.classList.contains('hidden')&&sourceAvatar.src),initial=(sourceInitial&&sourceInitial.textContent||'A').trim().charAt(0)||'A';
  Array.prototype.forEach.call(document.querySelectorAll('[data-shell-settings]'),function(button){button.classList.toggle('hidden',adminHidden);button.onclick=function(){if(admin)admin.click()}});
  Array.prototype.forEach.call(document.querySelectorAll('[data-shell-account]'),function(button){var image=button.querySelector('.primaryHeaderAccountAvatar'),letter=button.querySelector('.primaryHeaderAccountInitial');button.onclick=function(){if(account)account.click()};button.title=account&&account.title||'Open account';if(image){image.classList.toggle('hidden',!hasAvatar);if(hasAvatar)image.src=sourceAvatar.src}if(letter){letter.classList.toggle('hidden',hasAvatar);letter.textContent=initial}});
}

function prepareAuthorisedShell(profile){
  currentUserProfile=profile;byId('authGate').classList.add('hidden');document.body.classList.remove('authPending');var isAdmin=profile.user_role==='admin';byId('adminSettingsBtn').classList.toggle('hidden',!isAdmin);byId('accountBtn').title=profile.display_name+' · Open account';byId('accountInitial').textContent=(profile.display_name||profile.email).charAt(0).toUpperCase();syncPrimaryHeaderActions()
}

function normaliseAppCompatibility(value){
  var source=plainSnapshotRecord(value)?value:{},status=String(source.write_status||'update_required');
  return{
    minimum_read_version:String(source.minimum_read_version||'37.0'),
    minimum_write_version:String(source.minimum_write_version||'41.0'),
    recommended_version:String(source.recommended_version||'41.0'),
    maintenance_mode:source.maintenance_mode===true,
    maintenance_message:String(source.maintenance_message||'Shared roster editing has been temporarily paused.'),
    write_allowed:source.write_allowed===true,
    write_status:['allowed','maintenance','version_blocked','update_required','permission_denied'].indexOf(status)>=0?status:'update_required'
  }
}
function compatibilityNeedsUpdate(){return appCompatibility&&(appCompatibility.write_status==='update_required'||appCompatibility.write_status==='version_blocked')}
function sharedWritesBlocked(){return !appCompatibility||appCompatibility.write_allowed!==true}
function sharedWriteNotice(){
  if(!appCompatibility)return'An important Night Roster update is required before shared changes can be made. You can still view the roster.';
  if(appCompatibility.write_status==='maintenance')return appCompatibility.maintenance_message||'Shared roster editing has been temporarily paused. You can still view the roster.';
  if(appCompatibility.write_status==='permission_denied')return'Your signed-in account does not currently have permission to save shared roster changes.';
  return'An important Night Roster update is required before shared changes can be made. You can still view the roster.'
}
function renderWriteGuardState(){
  var blocked=!!(currentUserProfile&&!forcedOfflineSession&&sharedWritesBlocked()),banner=byId('writeGuardBanner'),title=byId('writeGuardTitle'),detail=byId('writeGuardDetail'),updateTakingOver=!!(blocked&&compatibilityNeedsUpdate()&&updateRegistration&&updateRegistration.waiting);
  document.body.classList.toggle('sharedWriteBlocked',blocked);
  if(banner)banner.classList.toggle('hidden',!blocked||updateTakingOver);
  if(!blocked)return;
  var maintenance=appCompatibility&&appCompatibility.write_status==='maintenance';
  if(title)title.textContent=maintenance?'Shared editing paused':'Important update required';
  if(detail)detail.textContent=sharedWriteNotice();
  if(compatibilityNeedsUpdate()&&updateRegistration&&navigator.onLine&&!updateRegistration.waiting)updateRegistration.update().catch(function(){})
}
function setAppCompatibility(value){appCompatibility=normaliseAppCompatibility(value);renderWriteGuardState();updateOfflineControls()}
async function refreshCompatibilityState(){
  if(!supa||!currentUser||!navigator.onLine)return appCompatibility;
  try{var result=await supa.rpc('get_app_compatibility_v49',{p_client_version:APP_VERSION});if(!result.error&&result.data)setAppCompatibility(result.data)}catch(error){}
  return appCompatibility
}
async function enterAccessLost(){
  if(accessLossInFlight)return;accessLossInFlight=true;
  recordAppDiagnostic('access','session','lost');realtimeGeneration++;startupAttempt++;forcedOfflineSession=false;
  if(realtimeReconnectTimer){clearTimeout(realtimeReconnectTimer);realtimeReconnectTimer=null}
  if(window.AnaestheticRuntime&&window.AnaestheticRuntime.scheduler)window.AnaestheticRuntime.scheduler.cancel('shared-revision');
  sharedSyncTimer=null;realtimeSubscribed=false;
  if(changesChannel){try{await supa.removeChannel(changesChannel)}catch(error){}changesChannel=null}
  if(window.chatTeardownSession)window.chatTeardownSession();
  await clearPrivateDeviceData();
  currentUserProfile=null;currentPrivateProfile=null;profileAvatarUrl='';currentAccessToken='';
  nightChanges={};nightOvertime={};changeHistory={};overtimeHistory={};roleOverrideHistory={};fiveCoverChoices={};labourOrders={};nightPlanStatuses={};nightRoleOverrides={};nightTeamIdentities={};
  lastObservedSyncRevision=null;lastObservedAccessEpoch=null;
  try{await supa.auth.signOut({scope:'local'})}catch(error){}
  currentUser=null;setAuthMode('login');showAuth('Your Night Roster access has changed. Sign in again, or contact the roster administrator if you still need access.',true);
}
async function checkCurrentAccessStatus(expectedEpoch){
  if(accessLossInFlight)return{active:false};
  if(accessStatusCheckPromise)return accessStatusCheckPromise;
  accessStatusCheckPromise=(async function(){
    var result=await supa.rpc('my_access_status_v49');
    if(result.error){recordAppDiagnostic('access','refresh',result.error.code||'failed');return{error:result.error}}
    var status=result.data||{},epoch=Number(status.access_epoch||expectedEpoch||0);lastObservedAccessEpoch=epoch;
    if(!status.active){await enterAccessLost();return{active:false}}
    var previousRole=currentUserProfile&&currentUserProfile.user_role||'',nextRole=String(status.user_role||'member');
    var nextProfile=Object.assign({},currentUserProfile||{},{active:true,display_name:status.display_name||currentUserProfile&&currentUserProfile.display_name||'Shift member',user_role:nextRole});
    currentUserProfile=nextProfile;try{appStorage.setItem('anaes_cached_profile',JSON.stringify(nextProfile))}catch(error){}
    prepareAuthorisedShell(nextProfile);
    if(previousRole&&previousRole!==nextRole){
      recordAppDiagnostic('access','role-change',previousRole+'-to-'+nextRole);
      if(previousRole==='admin'&&nextRole!=='admin'&&document.body.getAttribute('data-view')==='admin')show('today');
      if(nextRole==='admin'&&!forcedOfflineSession)withTimeout(loadAccounts(),6000,'Account list did not respond.').catch(function(){})
    }
    return{active:true,role:nextRole,accessEpoch:epoch}
  })();
  try{return await accessStatusCheckPromise}finally{accessStatusCheckPromise=null}
}

async function retryLaunchConnection(){
  var button=byId('launchRetryBtn'),offline=byId('launchOfflineBtn'),screen=byId('launchScreen'),originalLabel=button&&button.textContent||'Try again';if(button){button.disabled=true;button.textContent='Trying again…'}if(offline)offline.disabled=true;setLaunchState('Trying again',sharedLoadPromise?'Finishing the current roster request before trying again…':'Waiting for the shared roster to respond…');if(screen){screen.classList.add('launchNeedsAction');screen.setAttribute('aria-busy','true')}try{if(!currentUser){window.location.reload();return}if(sharedLoadPromise)try{await sharedLoadPromise}catch(error){}if(!launchFinished)await authorizeUser(currentUser)}finally{if(button){button.disabled=false;button.textContent=originalLabel}if(offline)offline.disabled=false;if(!launchFinished&&!launchRecoveryVisible)showLaunchRecovery('The shared roster still has not responded. Check your connection, then try again.')}
}

function useSavedRosterAtLaunch(){
  var profile=cachedAllowedProfile(currentUser&&currentUser.email);if(!profile||!hasOfflineSnapshot()){showLaunchRecovery('There is no saved roster on this device yet. Try connecting again.');return}currentUserProfile=profile;forcedOfflineSession=true;prepareAuthorisedShell(profile);if(!restoreOfflineSnapshot()){showLaunchRecovery('The saved roster could not be opened. Try connecting again.');return}setSync('offline','Offline · saved information');finishLaunch(true);toast('Showing the last saved roster. Changes are disabled until the connection returns.');updateOfflineControls()
}

function finishLaunch(ready){
  var screen=byId('launchScreen');if(!screen||launchFinished)return;
  clearTimeout(launchSlowTimer);hideLaunchRecovery();
  var motion=cinematicMotionAllowed();
  if(!ready){
    launchFinished=true;screen.setAttribute('aria-busy','false');document.body.classList.add('authRevealing');
    setTimeout(function(){screen.classList.add('dismissed')},motion?90:0);
    setTimeout(function(){screen.classList.add('hidden');document.body.classList.remove('authRevealing')},motion?650:20);
    return
  }
  if(window.AnaestheticRuntime&&window.AnaestheticRuntime.recovery){window.AnaestheticRuntime.recovery.markReady();runtimeRecoveryStatus=window.AnaestheticRuntime.recovery.status()}
  var name=privateProfileName()||currentUserProfile&&currentUserProfile.display_name||'',greeting=!currentPrivateProfile||currentPrivateProfile.greeting_enabled!==false;
  setLaunchState(greeting&&name?'Welcome back, '+name:'Your night is ready',navigator.onLine&&!forcedOfflineSession?'Everything is ready.':'Showing the last saved roster');
  screen.classList.add('ready');screen.setAttribute('aria-busy','false');document.body.classList.add('appRevealing');launchFinished=true;
  var hold=motion?320:0,fade=motion?520:20;
  setTimeout(function(){screen.classList.add('dismissed')},hold);
  setTimeout(function(){screen.classList.add('hidden')},hold+fade);
  setTimeout(function(){document.body.classList.remove('appRevealing')},hold+fade+(motion?520:20));
}

function rememberOnboardingProfile(){var name=byId('onboardingProfileName'),title=byId('onboardingProfileTitle');if(name||title)onboardingProfileDraft={name:name?name.value:'',title:title?title.value:''}}

function openOnboardingReplay(){var dialog=byId('onboardingDialog');if(!dialog||!dialog.showModal)return;var account=byId('accountSheet');if(account&&account.open)account.close();onboardingChatIntro=false;onboardingFeatureKey='';onboardingGuideMenu=true;onboardingReplay=true;onboardingDirection=1;onboardingStep=0;renderOnboarding();if(!dialog.open)dialog.showModal()}

function offlineSnapshotPayload(){
  return{saved_at:lastSuccessfulSyncAt||new Date(appNowMs()).toISOString(),nightChanges:nightChanges,nightOvertime:nightOvertime,fiveCoverChoices:fiveCoverChoices,rosterSettings:rosterSettings,rotationVersions:rotationVersions,labourOrders:labourOrders,nightRoleOverrides:nightRoleOverrides,nightPlanStatuses:nightPlanStatuses,nightTeamIdentities:nightTeamIdentities,appSettings:appSettings,schemaVersion:schemaVersion,syncRevision:Number(lastObservedSyncRevision||0),accessEpoch:Number(lastObservedAccessEpoch||0),compatibility:appCompatibility}
}
function saveOfflineSnapshot(){
  try{
    var payload=offlineSnapshotPayload(),runtime=window.AnaestheticRuntime&&window.AnaestheticRuntime.snapshots,envelope=runtime?runtime.packSync(payload,{schemaVersion:schemaVersion,appVersion:APP_VERSION,savedAt:payload.saved_at}):null;
    if(!envelope){recordAppDiagnostic('offline','snapshot-save','rejected');return}
    appStorage.setItem('anaes_offline_snapshot',JSON.stringify(envelope));
    runtime.persist('offline-roster',envelope).then(function(saved){recordAppDiagnostic('offline','snapshot-indexeddb',saved?'saved':'fallback')});
  }catch(error){recordAppDiagnostic('offline','snapshot-save','failed')}
}
async function primeOfflineSnapshotFromIndexedDb(){
  var runtime=window.AnaestheticRuntime&&window.AnaestheticRuntime.snapshots;if(!runtime)return false;
  try{
    var indexed=await runtime.load('offline-roster');if(!indexed||!runtime.unpackSync(indexed))return false;
    var local=null;try{local=JSON.parse(appStorage.getItem('anaes_offline_snapshot')||'null')}catch(error){}
    var indexedAt=Date.parse(indexed.saved_at||''),localAt=Date.parse(local&&local.saved_at||'');
    if(!local||!Number.isFinite(localAt)||Number.isFinite(indexedAt)&&indexedAt>localAt){appStorage.setItem('anaes_offline_snapshot',JSON.stringify(indexed));recordAppDiagnostic('offline','snapshot-indexeddb','restored')}
    return true
  }catch(error){recordAppDiagnostic('offline','snapshot-indexeddb','read-failed');return false}
}


function restoreOfflineSnapshot(){
  try{
    var snapshot=readOfflineSnapshot();if(!snapshot)return false;
    nightChanges=snapshot.nightChanges;nightOvertime=snapshot.nightOvertime;fiveCoverChoices=snapshot.fiveCoverChoices;rosterSettings=snapshot.rosterSettings;rotationVersions=snapshot.rotationVersions;labourOrders=snapshot.labourOrders;nightRoleOverrides=snapshot.nightRoleOverrides;nightPlanStatuses=snapshot.nightPlanStatuses;nightTeamIdentities=snapshot.nightTeamIdentities||{};if(snapshot.appSettings)appSettings=snapshot.appSettings;schemaVersion=snapshot.schemaVersion;lastObservedSyncRevision=Number(snapshot.syncRevision||0);lastObservedAccessEpoch=Number(snapshot.accessEpoch||0);setAppCompatibility(snapshot.compatibility);lastSuccessfulSyncAt=snapshot.saved_at;changeHistory={};overtimeHistory={};roleOverrideHistory={};historyLoadedDates={};historyLoadingDates={};rebuildCalculatedRoster();if(!R.length)return false;nightSelectionMode='automatic';idx=startingIndex(appNow());automaticSelectedDate=R[idx]&&R[idx].date;initialNightChosen=true;setSharedSyncState('offline','');render();return true;
  }catch(error){console.error('Saved roster could not be restored',error);return false}
}

function isStandaloneApp(){return !!(window.navigator.standalone||(window.matchMedia&&window.matchMedia('(display-mode: standalone)').matches))}
function sharedAppUrl(){return APP_URL+'?welcome=1'}
function installGuideSteps(){
  var ios=/iphone|ipad|ipod/i.test(navigator.userAgent),android=/android/i.test(navigator.userAgent),standalone=isStandaloneApp(),steps=[],label='';
  if(standalone){label='Night Roster is already installed on this device.';steps=['Open it from your Home Screen or app launcher.','Updates are checked automatically and are applied safely through the installed app.'];}
  else if(ios){label='Four simple taps in Safari. No App Store account is needed.';steps=['Open Night Roster in Safari.','Tap the Share button.','Choose Add to Home Screen and keep Open as Web App enabled.','Tap Add, then open Night Roster from your Home Screen.'];}
  else if(android){label=deferredInstallPrompt?'This phone can install Night Roster now.':'Install Night Roster once and keep it on your Home Screen.';steps=deferredInstallPrompt?['Tap Install Night Roster below.','Confirm Install app.','Open Night Roster from your Home Screen or app launcher.']:['Open the browser menu.','Choose Install app or Add to Home screen.','Confirm Install, then open Night Roster from your Home Screen or app launcher.'];}
  else{label='Install Night Roster for a standalone app window.';steps=['Open your browser menu.','Choose Install app or Add to Home screen if available.','Launch Night Roster from the installed app icon.'];}
  return'<div class="installGuideHero"><img src="icon-192.png?v=56.2" alt=""><div><b>'+esc(standalone?'Installed':'Night Roster')+'</b><span>'+esc(label)+'</span></div></div><div class="installSteps">'+steps.map(function(step,index){return'<div class="installStep"><b>'+(index+1)+'</b><span>'+esc(step)+'</span></div>'}).join('')+'</div>'+(deferredInstallPrompt&&!standalone?'<button type="button" class="primary wide installGuidePrimary" id="installGuidePrimaryBtn">Install Night Roster</button>':'')+'<p class="installGuideFootnote">No App Store or Play Store account is required. Installing only adds the app to this device, and roster access still requires an approved Night Roster account.</p>';
}
async function runInstallPrompt(){
  if(!deferredInstallPrompt){showInstallGuide();return}
  deferredInstallPrompt.prompt();var choice=await deferredInstallPrompt.userChoice;deferredInstallPrompt=null;applyStandaloneUi();if(choice&&choice.outcome==='accepted')toast('Night Roster added to your device')
}
function bindInstallGuideActions(){var button=byId('installGuidePrimaryBtn');if(button)button.onclick=runInstallPrompt}
function showInstallGuide(shared){var dialog=byId('installGuide'),title=byId('installGuideTitle'),intro=byId('installGuideIntro');if(title)title.textContent=shared?'Get Night Roster':'Install Night Roster';if(intro)intro.textContent=shared?'Install it on this phone, then sign in with your approved roster account.':'Install once for a full-screen app experience with automatic updates.';byId('installGuideSteps').innerHTML=installGuideSteps();bindInstallGuideActions();if(dialog&&dialog.showModal&&!dialog.open)dialog.showModal()}
function cleanWelcomeUrl(){try{var url=new URL(location.href);if(url.searchParams.has('welcome')){url.searchParams.delete('welcome');history.replaceState(null,'',url.pathname+(url.search?url.search:'')+(url.hash||''))}}catch(error){}}
function showSharedWelcomeIfRequested(){try{var params=new URLSearchParams(location.search);if(params.get('welcome')!=='1')return;sharedWelcomeEntry=true;cleanWelcomeUrl();setTimeout(function(){if(isStandaloneApp())toast('Night Roster is already installed');else showInstallGuide(true)},180)}catch(error){}}
function showShareApp(){var account=byId('accountSheet');if(account&&account.open)account.close();var dialog=byId('shareAppDialog');if(window.dispatchEvent&&typeof CustomEvent==='function')window.dispatchEvent(new CustomEvent('roster:share-app',{detail:{shareUrl:sharedAppUrl(),installed:isStandaloneApp(),nativeShare:typeof navigator.share==='function'}}));if(dialog&&dialog.showModal&&!dialog.open)dialog.showModal()}
async function nativeShareNightRoster(){
  var data={title:'Night Roster',text:'Install Anaesthetic Night Roster on your phone.',url:sharedAppUrl()};
  try{if(navigator.share){await navigator.share(data);return}if(navigator.clipboard&&navigator.clipboard.writeText){await navigator.clipboard.writeText(sharedAppUrl());toast('Night Roster link copied');return}throw new Error('Sharing is not available')}
  catch(error){if(error&&error.name==='AbortError')return;toast('Could not open sharing on this device')}
}
async function copyNightRosterLink(){try{await navigator.clipboard.writeText(sharedAppUrl());toast('Night Roster link copied')}catch(error){toast('Link could not be copied')}}

function passkeySupported(){return !!(window.PublicKeyCredential&&supa&&supa.auth&&typeof supa.auth.signInWithPasskey==='function')}

async function signInWithPasskey(){
  if(!passkeySupported()){authMessage('Passkeys are not supported by this browser. You can still sign in with your password.',true);return}
  var button=byId('authPasskeyBtn');button.disabled=true;authMessage('Use your fingerprint, face recognition or device PIN…');
  try{var result=await supa.auth.signInWithPasskey();if(result.error)throw result.error;if(result.data&&result.data.session)rememberAuthSession(result.data.session);if(result.data&&result.data.user)await authorizeUser(result.data.user,result.data.session)}
  catch(error){var cancelled=error&&(error.name==='NotAllowedError'||/cancel|not allowed/i.test(error.message||''));authMessage(cancelled?'Passkey sign-in was cancelled.':/disabled|not enabled/i.test(error.message||'')?'Passkeys have not been enabled for this roster yet. Use your password for now.':'Passkey sign-in could not be completed. You can still use your password.',!cancelled)}
  finally{button.disabled=false}
}

async function loadPasskeys(){
  var button=byId('addPasskeyBtn'),message=byId('passkeyMessage'),detail={message:'',items:[]};if(!passkeySupported()){detail.message='Passkeys are not supported by this browser. Password sign-in remains available.';button.classList.add('hidden');if(window.dispatchEvent&&typeof CustomEvent==='function')window.dispatchEvent(new CustomEvent('roster:passkeys',{detail:detail}));return}button.classList.remove('hidden');message.textContent='';var result=await supa.auth.passkey.list();if(result.error){detail.message='No passkeys are available yet. Your administrator may still need to enable them in Supabase.';if(window.dispatchEvent&&typeof CustomEvent==='function')window.dispatchEvent(new CustomEvent('roster:passkeys',{detail:detail}));return}var list=result.data&&result.data.passkeys||result.data||[];detail.items=list.map(function(item){return{id:item.id||item.passkey_id,label:item.friendly_name||item.friendlyName||'Saved passkey'}});detail.message='No passkey has been added to this account.';if(window.dispatchEvent&&typeof CustomEvent==='function')window.dispatchEvent(new CustomEvent('roster:passkeys',{detail:detail}));
}

async function addPasskey(){var button=byId('addPasskeyBtn');button.disabled=true;byId('passkeyMessage').textContent='Follow your device instructions…';try{var result=await supa.auth.registerPasskey();if(result.error)throw result.error;if(result.data&&result.data.id)await supa.auth.passkey.update({passkeyId:result.data.id,friendlyName:'Night Roster on '+(navigator.platform||'this device')});byId('passkeyMessage').textContent='Passkey added. You can use it on the sign-in screen.';await loadPasskeys();toast('Passkey added')}catch(error){byId('passkeyMessage').textContent=/cancel|not allowed/i.test(error.message||'')?'Passkey setup was cancelled.':/disabled|not enabled/i.test(error.message||'')?'Passkeys must first be enabled in Supabase Authentication settings.':'The passkey could not be added. '+(error.message||'Please try again.')}finally{button.disabled=false}}

async function deletePasskey(id){if(!id||!confirm('Remove this passkey from your Night Roster account?'))return;var result=await supa.auth.passkey.delete({passkeyId:id});if(result.error){byId('passkeyMessage').textContent='The passkey could not be removed.';return}await loadPasskeys();toast('Passkey removed')}

function releasePolicy(){var latest=RELEASE_HISTORY[0]||{};return ['quiet','normal','important'].indexOf(latest.policy)>=0?latest.policy:'normal'}
function releaseNeedsAttention(){return appStorage.getItem('anaes_seen_version')!==APP_VERSION&&releasePolicy()!=='quiet'}
function markCurrentReleaseSeen(){appStorage.setItem('anaes_seen_version',APP_VERSION);var account=byId('accountSheet');if(account&&account.open)populateAccountSheet()}
function showReleaseNotesIfNeeded(){
  if(appStorage.getItem('anaes_seen_version')===APP_VERSION)return;
  var policy=releasePolicy(),returning=appStorage.getItem('anaes_selected_date')||appStorage.getItem('anaes_my_name');
  if(policy!=='important'||!returning)return;
  renderReleaseNotes();releaseNotesQueued=true;var dialog=byId('releaseNotes');setTimeout(function(){if(dialog&&dialog.showModal&&!dialog.open)dialog.showModal()},900)
}
function releaseMonthLabel(date){return String(date||'').replace(/^\\d+\\s+/,'')||String(date||'')}
function releaseActionButtons(actions){return(actions||[]).map(function(item){return'<button type="button" class="releaseShowMe" data-release-action="'+esc(item.action)+'" data-release-value="'+esc(item.value||'')+'">'+esc(item.label)+'<span aria-hidden="true">›</span></button>'}).join('')}
function releaseCurrentFallback(entry,actions){
  return'<div class="releaseHistory"><section class="releaseEntry latest releaseEditorial"><div class="releaseHero"><span class="releaseHeroMark" aria-hidden="true">✦</span><div><span class="releaseHeroEyebrow">Night Roster '+esc(entry.version)+'</span><h3>'+esc(entry.title)+'</h3><p>Here are the improvements worth knowing about.</p></div><time>'+esc(entry.date)+'</time></div><div class="releaseHighlights">'+entry.changes.map(function(change,index){var action=actions[index];return'<article class="releaseHighlight"><span class="releaseHighlightIndex" aria-hidden="true">'+(index+1)+'</span><p>'+esc(change)+'</p>'+(action?releaseActionButtons([action]):'')+'</article>'}).join('')+'</div><button type="button" class="releaseHistoryLink" data-release-action="history">View complete version history <span aria-hidden="true">›</span></button></section></div>'
}
function releaseHistoryFallback(entries){
  var month='';return'<div class="releaseNav" aria-label="Version history navigation"><button type="button" data-release-jump="latest">Latest update</button><button type="button" data-release-jump="previous">Earlier releases <span>'+Math.max(0,entries.length-1)+'</span></button></div><div class="releaseHistory releaseHistoryCompact" tabindex="0" aria-label="Complete Night Roster version history">'+entries.map(function(entry,index){var label=releaseMonthLabel(entry.date),heading=label!==month?'<div class="releaseMonthHeading">'+esc(label)+'</div>':'';month=label;return heading+'<details class="releaseEntry releaseHistoryItem '+(index===0?'latest':'')+'" data-history-index="'+index+'" '+(index===0?'open':'')+'><summary><span class="releaseHistoryVersion">v'+esc(entry.version)+'</span><span class="releaseHistoryCopy"><b>'+esc(entry.title)+'</b><small>'+esc(entry.date)+'</small></span><span class="releaseHistoryChevron" aria-hidden="true">⌄</span></summary><ul>'+entry.changes.map(function(change){return'<li>'+esc(change)+'</li>'}).join('')+'</ul></details>'}).join('')+'</div>'
}
function bindReleaseFallbackActions(host){
  Array.prototype.forEach.call(host.querySelectorAll('[data-release-action]'),function(button){button.onclick=function(){window.dispatchEvent(new CustomEvent('roster:release-action',{detail:{action:button.getAttribute('data-release-action'),value:button.getAttribute('data-release-value')||''}}))}});
  var history=host.querySelector('.releaseHistory');Array.prototype.forEach.call(host.querySelectorAll('[data-release-jump]'),function(button){button.onclick=function(){if(!history)return;var previous=button.getAttribute('data-release-jump')==='previous',target=history.querySelector('.releaseHistoryItem[data-history-index="'+(previous?'1':'0')+'"]');if(!target)return;history.scrollTo({top:Math.max(0,target.offsetTop-8),behavior:window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'})}})
}
function renderReleaseNotes(showHistory){
  var dialog=byId('releaseNotes');if(!dialog)return;var latest=RELEASE_HISTORY[0],entries=showHistory?RELEASE_HISTORY:[latest],actions=RELEASE_ACTIONS[latest.version]||[];dialog.classList.add('releaseDialog');dialog.dataset.releaseMode=showHistory?'history':'current';
  var title=byId('releaseNotesTitle'),intro=byId('releaseNotesIntro'),close=byId('closeReleaseNotes');if(title)title.textContent=showHistory?'Version history':'What’s new';if(intro)intro.textContent=showHistory?'Every Night Roster release, newest first':'Version '+latest.version+' · The changes worth knowing about';if(close)close.textContent=showHistory?'Done':'Got it';
  if(!window.__forceReleaseNotesFallback&&typeof window.renderReactReleaseNotes==='function'){window.renderReactReleaseNotes(entries,!!showHistory,actions);return}
  var host=byId('releaseNotesContent');if(!host)return;host.innerHTML=showHistory?releaseHistoryFallback(entries):releaseCurrentFallback(latest,actions);bindReleaseFallbackActions(host);
  if(typeof window.CustomEvent==='function')window.dispatchEvent(new CustomEvent('roster:releasenotes',{detail:{entries:entries,showHistory:!!showHistory,actions:actions}}))
}

function ensureRecordActionSheet(){
  var dialog=byId('recordActionSheet');if(dialog)return dialog;
  dialog=document.createElement('dialog');dialog.id='recordActionSheet';dialog.className='recordActionSheet';dialog.setAttribute('aria-labelledby','recordActionTitle');dialog.innerHTML='<div class="sheetGrabber" aria-hidden="true"></div><div class="recordActionHeading"><span>Staffing record</span><h2 id="recordActionTitle">Choose an action</h2><p id="recordActionDetail"></p></div><div class="recordActionGroup"><button type="button" id="recordEditAction">Edit absence</button><button type="button" class="destructive" id="recordRemoveAction">Remove</button></div><button type="button" class="recordActionCancel" id="recordCancelAction">Cancel</button>';
  document.body.appendChild(dialog);byId('recordCancelAction').onclick=function(){dialog.close()};dialog.addEventListener('click',function(event){if(event.target===dialog)dialog.close()});return dialog;
}

function showRecordActions(kind,id,name){
  var dialog=ensureRecordActionSheet(),edit=byId('recordEditAction'),remove=byId('recordRemoveAction'),absence=kind==='absence';
  byId('recordActionTitle').textContent=name;byId('recordActionDetail').textContent=absence?'Recorded absence':'Confirmed overtime nurse';edit.classList.toggle('hidden',!absence);edit.onclick=function(){dialog.close();editNightChange(id)};remove.textContent=absence?'Remove absence':'Remove overtime nurse';remove.onclick=function(){dialog.close();if(absence)removeNightChange(id);else removeOvertime(id)};if(!dialog.open)dialog.showModal();
}

function installedReleaseState(){var latest=RELEASE_HISTORY[0]&&RELEASE_HISTORY[0].version||'Unknown',cache=String(serviceWorkerCacheVersion||'').replace(/^anaesthetic-night-roster-v/,'').replace(/-/g,'.'),stale=cache!=='Checking…'&&cache!=='Not active'&&cache!==APP_VERSION;return{latest:latest,cache:serviceWorkerCacheVersion,stale:stale,waiting:!!(updateRegistration&&updateRegistration.waiting)}}

function diagnosticsText(){
  var backupAt=appStorage.getItem('anaes_last_backup_at'),release=installedReleaseState(),clock=window.AnaestheticDomain&&window.AnaestheticDomain.clockState?window.AnaestheticDomain.clockState():{source:'device',offsetMs:0},caps=rosterCapabilities(),events=window.AnaestheticDomain&&window.AnaestheticDomain.readDiagnostics?window.AnaestheticDomain.readDiagnostics().slice(-10):[],lines=['Running app version: '+APP_VERSION,'Latest release-history version: '+release.latest,'Service-worker cache: '+release.cache,'Installed release: '+(release.stale?'stale cache detected':release.waiting?'update waiting for approval':'current'),'Expected database schema: '+EXPECTED_SCHEMA_VERSION,'Actual database schema: '+(schemaVersion||'legacy'),'Capabilities: server clock '+(caps.serverClock?'yes':'no')+' · chat idempotency '+(caps.chatIdempotency?'yes':'no')+' · monotonic reads '+(caps.monotonicChatRead?'yes':'no'),'Clock source: '+clock.source+' · offset '+Math.round(Number(clock.offsetMs||0))+' ms','Connection state: '+sharedSyncState,'Last successful refresh: '+(lastSuccessfulSyncAt?new Date(lastSuccessfulSyncAt).toLocaleString('en-GB'):'not yet'),'Startup compatibility fallback uses this session: '+compatibilityStartupUseCount+(compatibilityStartupLastUsed?' · last '+compatibilityStartupLastUsed:''),'Last roster-data export: '+(backupAt?new Date(backupAt).toLocaleString('en-GB'):'not recorded on this device'),'Published roster until: '+(rosterSettings.published_until||'unknown'),'Calculated nights: '+R.length,'Current account: '+(currentUserProfile?'signed in as '+currentUserProfile.user_role:'not signed in')];if(events.length){lines.push('Recent local diagnostics:');events.forEach(function(item){lines.push(item.at+' · '+item.category+' · '+item.operation+' · '+item.code)})}return lines.join('\n');
}

function renderDiagnostics(){var el=byId('appDiagnostics');if(!el)return;var backupAt=appStorage.getItem('anaes_last_backup_at'),schemaState=schemaVersion>=EXPECTED_SCHEMA_VERSION?'Current':'Upgrade required',release=installedReleaseState(),compatCount=Number(appStorage.getItem('anaes_compat_startup_count')||0),compatLast=appStorage.getItem('anaes_compat_startup_last_at'),clockConfidence=window.AnaestheticRuntime&&window.AnaestheticRuntime.clock?window.AnaestheticRuntime.clock.confidence():null;el.innerHTML='<div class="diagnosticGrid"><div class="historyItem"><b>Application versions</b><div class="changeMeta">Running '+esc(APP_VERSION)+' · Release history '+esc(release.latest)+'</div></div><div class="historyItem"><b>Service-worker cache</b><div class="changeMeta">'+esc(release.cache)+' · '+esc(release.stale?'Stale cached release detected':release.waiting?'Update awaiting approval':'Current')+'</div></div><div class="historyItem"><b>Database schema</b><div class="changeMeta">Expected '+esc(EXPECTED_SCHEMA_VERSION)+' · Actual '+esc(schemaVersion||'legacy')+' · '+esc(schemaState)+'</div></div><div class="historyItem"><b>Shared-data connection</b><div class="changeMeta">'+(navigator.onLine?'Online':'Offline')+' · Last refreshed '+esc(lastSuccessfulSyncAt?new Date(lastSuccessfulSyncAt).toLocaleString('en-GB'):'not yet')+'</div></div><div class="historyItem"><b>Clock confidence</b><div class="changeMeta">'+esc(clockConfidence?clockConfidence.level+' · '+clockConfidence.sampleCount+' accepted sample'+(clockConfidence.sampleCount===1?'':'s'):'Device clock')+'</div></div><div class="historyItem"><b>Compatibility startup</b><div class="changeMeta">'+esc(compatCount?compatCount+' fallback use'+(compatCount===1?'':'s')+' · Last '+(compatLast?new Date(compatLast).toLocaleString('en-GB'):'this session'):'No fallback use recorded on this device')+'</div></div><div class="historyItem"><b>Last roster-data export</b><div class="changeMeta">'+esc(backupAt?new Date(backupAt).toLocaleString('en-GB'):'Not recorded')+'</div></div></div>'+(release.waiting?'<button type="button" class="primary wide" id="diagnosticUpdateBtn">Update now</button>':'')+'<button type="button" class="soft wide" id="copyDiagnosticsBtn">Copy diagnostic report</button>';var button=byId('copyDiagnosticsBtn');if(button)button.onclick=async function(){try{await navigator.clipboard.writeText(diagnosticsText());toast('Diagnostic report copied')}catch(error){toast('Diagnostic report could not be copied')}};var update=byId('diagnosticUpdateBtn');if(update)update.onclick=applyWaitingUpdate}

function prettyDateMarkup(date){
  if(!date)return'<strong>Select a night</strong><small>Open calendar</small>';
  var value=new Date(date+'T12:00:00'),main=value.toLocaleDateString('en-GB',{weekday:'long',day:'numeric',month:'long'}),year=value.getFullYear(),state=R.length?automaticNightState():null,automatic=state&&R[state.index]&&R[state.index].date;
  var context=automatic&&date===automatic?(state.isCurrent?'Current roster night':'Next roster night'):automatic&&date<automatic?'Past roster night':'Roster night';
  return'<strong>'+esc(main)+'</strong><small>'+esc(context+' · '+year)+'</small>';
}

function updatePrettyDate(input){
  if(!input)return;var button=input.parentNode&&input.parentNode.querySelector('.prettyDateButton');if(button)button.innerHTML=prettyDateMarkup(input.value);
}

function enhanceDatePicker(id){
  var input=byId(id);if(!input||input.parentNode.classList.contains('prettyDateControl'))return;
  var host=document.createElement('div'),button=document.createElement('button');host.className='prettyDateControl';button.type='button';button.className='prettyDateButton';button.setAttribute('aria-label','Open calendar');
  input.parentNode.insertBefore(host,input);host.appendChild(button);host.appendChild(input);input.classList.add('nativeDatePicker');updatePrettyDate(input);
  button.onclick=function(){try{if(input.showPicker)input.showPicker();else input.click()}catch(error){input.focus();input.click()}};
}

