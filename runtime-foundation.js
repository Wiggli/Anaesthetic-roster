/* GENERATED FILE. Edit the source modules under src/, then run npm run generate:runtime. */
/* Anaesthetic Night Roster 40.0 reliability runtime.
   Central lifecycle, state-machine, scheduling, storage and cross-tab coordination.
   This layer does not calculate clinical allocations. */
(function(global){
  'use strict';

  var domain=global.AnaestheticDomain||null;
  var STORAGE_PREFIX='anaes_';
  var LEADER_TTL=12000;
  var TAB_ID=(global.crypto&&global.crypto.randomUUID?global.crypto.randomUUID():'tab-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2));
  var bc=null,leaderId='',leaderSeenAt=0,leaderHeartbeat=null;
  var resumeHandler=null;
  var resumeInFlight=null;
  var schedulerJobs=new Map();
  var clockSamples=[];
  var MAX_CLOCK_SAMPLES=5;
  var RECOVERY_KEY='launch_health_v1';
  var RECOVERY_WINDOW_MS=5*60*1000;
  var RECOVERY_THRESHOLD=3;
  var SAFE_MODE_MS=15*60*1000;
  var SNAPSHOT_FORMAT=2;
  var SNAPSHOT_MAX_BYTES=768*1024;
  var SNAPSHOT_DB='anaesthetic-roster-runtime';
  var SNAPSHOT_STORE='snapshots';
  var latencySamples=[];
  var LATENCY_LIMIT=80;

  function diagnostic(category,operation,code){
    if(domain&&domain.recordDiagnostic)return domain.recordDiagnostic(category,operation,code);
    return null;
  }

  function safeJSON(value,fallback){
    try{return JSON.parse(value)}catch(error){return fallback}
  }

  function storageKey(key){key=String(key||'');return key.indexOf(STORAGE_PREFIX)===0?key:STORAGE_PREFIX+key}
  var storage={
    get:function(key,fallback){
      try{var value=global.localStorage.getItem(storageKey(key));return value==null?fallback:value}catch(error){diagnostic('storage','read',key);return fallback}
    },
    set:function(key,value){
      try{global.localStorage.setItem(storageKey(key),String(value));return true}catch(error){diagnostic('storage','write',key);return false}
    },
    remove:function(key){
      try{global.localStorage.removeItem(storageKey(key));return true}catch(error){diagnostic('storage','remove',key);return false}
    },
    getItem:function(key){return this.get(key,null)},
    setItem:function(key,value){return this.set(key,value)},
    removeItem:function(key){return this.remove(key)},
    getJSON:function(key,fallback){return safeJSON(this.get(key,null),fallback)},
    setJSON:function(key,value){return this.set(key,JSON.stringify(value))}
  };


  function fnv1a(value){
    var text=String(value||''),hash=2166136261;
    for(var i=0;i<text.length;i++){hash^=text.charCodeAt(i);hash=Math.imul(hash,16777619)}
    return (hash>>>0).toString(16).padStart(8,'0')
  }
  function byteLength(value){
    var text=String(value||'');
    if(global.TextEncoder)try{return new TextEncoder().encode(text).length}catch(error){}
    return unescape(encodeURIComponent(text)).length
  }
  function packSnapshot(payload,meta){
    meta=meta||{};
    var body=JSON.stringify(payload==null?null:payload),bytes=byteLength(body);
    if(bytes>SNAPSHOT_MAX_BYTES){diagnostic('snapshot','pack','too-large');return null}
    return{
      format:SNAPSHOT_FORMAT,
      schema:Number(meta.schemaVersion||0),
      app_version:String(meta.appVersion||''),
      saved_at:String(meta.savedAt||new Date().toISOString()),
      bytes:bytes,
      hash:'fnv1a-'+fnv1a(body),
      payload:payload
    }
  }
  function unpackSnapshot(envelope){
    if(!envelope||typeof envelope!=='object'||Array.isArray(envelope))return null;
    if(Number(envelope.format)!==SNAPSHOT_FORMAT||!Object.prototype.hasOwnProperty.call(envelope,'payload'))return null;
    var body;
    try{body=JSON.stringify(envelope.payload)}catch(error){return null}
    var bytes=byteLength(body);
    if(bytes>SNAPSHOT_MAX_BYTES||Number(envelope.bytes)!==bytes)return null;
    if(String(envelope.hash||'')!=='fnv1a-'+fnv1a(body))return null;
    return envelope.payload
  }
  function openSnapshotDb(){
    return new Promise(function(resolve,reject){
      if(!global.indexedDB){resolve(null);return}
      var request;
      try{request=global.indexedDB.open(SNAPSHOT_DB,1)}catch(error){reject(error);return}
      request.onupgradeneeded=function(){var db=request.result;if(!db.objectStoreNames.contains(SNAPSHOT_STORE))db.createObjectStore(SNAPSHOT_STORE,{keyPath:'key'})};
      request.onsuccess=function(){resolve(request.result)};
      request.onerror=function(){reject(request.error||new Error('IndexedDB unavailable'))};
    })
  }
  async function persistSnapshot(key,envelope){
    if(!envelope)return false;
    try{
      var db=await openSnapshotDb();if(!db)return false;
      return await new Promise(function(resolve,reject){
        var tx=db.transaction(SNAPSHOT_STORE,'readwrite');
        tx.objectStore(SNAPSHOT_STORE).put({key:String(key),envelope:envelope,updatedAt:Date.now()});
        tx.oncomplete=function(){db.close();resolve(true)};
        tx.onerror=function(){var error=tx.error;db.close();reject(error||new Error('Snapshot write failed'))};
        tx.onabort=function(){var error=tx.error;db.close();reject(error||new Error('Snapshot write aborted'))};
      })
    }catch(error){diagnostic('snapshot','indexeddb-write','failed');return false}
  }
  async function loadSnapshot(key){
    try{
      var db=await openSnapshotDb();if(!db)return null;
      return await new Promise(function(resolve,reject){
        var tx=db.transaction(SNAPSHOT_STORE,'readonly'),request=tx.objectStore(SNAPSHOT_STORE).get(String(key));
        request.onsuccess=function(){var value=request.result;db.close();resolve(value&&value.envelope||null)};
        request.onerror=function(){var error=request.error;db.close();reject(error||new Error('Snapshot read failed'))};
      })
    }catch(error){diagnostic('snapshot','indexeddb-read','failed');return null}
  }
  async function removeSnapshot(key){
    try{
      var db=await openSnapshotDb();if(!db)return false;
      return await new Promise(function(resolve,reject){
        var tx=db.transaction(SNAPSHOT_STORE,'readwrite');
        tx.objectStore(SNAPSHOT_STORE).delete(String(key));
        tx.oncomplete=function(){db.close();resolve(true)};
        tx.onerror=function(){var error=tx.error;db.close();reject(error||new Error('Snapshot delete failed'))};
      })
    }catch(error){diagnostic('snapshot','indexeddb-remove','failed');return false}
  }
  function recoveryState(){return storage.getJSON(RECOVERY_KEY,{version:'',starts:[],readyAt:0,safeModeUntil:0})||{}}
  function recoveryStart(version){
    var now=Date.now(),state=recoveryState(),same=state.version===String(version||'');
    if(!same)state={version:String(version||''),starts:[],readyAt:0,safeModeUntil:0};
    var starts=Array.isArray(state.starts)?state.starts.filter(function(at){return Number(at)>now-RECOVERY_WINDOW_MS}):[];
    starts.push(now);state.starts=starts;state.lastStartAt=now;
    if(starts.length>=RECOVERY_THRESHOLD){
      state.safeModeUntil=Math.max(Number(state.safeModeUntil||0),now+SAFE_MODE_MS);
      diagnostic('recovery','launch','safe-mode')
    }
    storage.setJSON(RECOVERY_KEY,state);
    return{safeMode:Number(state.safeModeUntil||0)>now,attempts:starts.length,safeModeUntil:Number(state.safeModeUntil||0)}
  }
  function recoveryReady(){
    var state=recoveryState();state.readyAt=Date.now();state.starts=[];state.safeModeUntil=0;storage.setJSON(RECOVERY_KEY,state);
    return state
  }
  function recoveryStatus(){
    var state=recoveryState(),now=Date.now();
    return{safeMode:Number(state.safeModeUntil||0)>now,attempts:Array.isArray(state.starts)?state.starts.length:0,safeModeUntil:Number(state.safeModeUntil||0),lastStartAt:Number(state.lastStartAt||0),readyAt:Number(state.readyAt||0)}
  }
  function recordLatency(name,duration,ok){
    var row={name:String(name||'request').slice(0,48),duration:Math.max(0,Math.round(Number(duration)||0)),ok:ok!==false,at:Date.now()};
    latencySamples.push(row);latencySamples=latencySamples.slice(-LATENCY_LIMIT);return row
  }
  async function measureLatency(name,fn){
    var started=global.performance&&performance.now?performance.now():Date.now();
    try{
      var result=await Promise.resolve().then(fn);
      recordLatency(name,(global.performance&&performance.now?performance.now():Date.now())-started,true);
      return result
    }catch(error){
      recordLatency(name,(global.performance&&performance.now?performance.now():Date.now())-started,false);
      throw error
    }
  }
  function latencySummary(){
    var groups={};
    latencySamples.forEach(function(item){var g=groups[item.name]||(groups[item.name]={count:0,total:0,max:0,failed:0});g.count++;g.total+=item.duration;g.max=Math.max(g.max,item.duration);if(!item.ok)g.failed++});
    Object.keys(groups).forEach(function(key){var g=groups[key];g.average=Math.round(g.total/Math.max(1,g.count));delete g.total});
    return groups
  }

  var StateMachine=function(name,initial,transitions){
    this.name=name;this.value=initial;this.transitions=transitions||{};this.listeners=new Set();
  };
  StateMachine.prototype.can=function(next){
    if(next===this.value)return true;
    var allowed=this.transitions[this.value]||[];
    return allowed.indexOf(next)>=0;
  };
  StateMachine.prototype.set=function(next,meta){
    if(!this.can(next)){
      diagnostic('state',this.name,'invalid-'+this.value+'-'+next);
      return false;
    }
    var previous=this.value;this.value=next;
    if(previous!==next){
      diagnostic('state',this.name,previous+'-'+next);
      this.listeners.forEach(function(listener){try{listener(next,previous,meta||null)}catch(error){}});
    }
    return true;
  };
  StateMachine.prototype.on=function(listener){this.listeners.add(listener);return()=>this.listeners.delete(listener)};

  var syncState=new StateMachine('sync','starting',{
    starting:['live','stale','reconnecting','offline','error','access-lost'],
    live:['stale','reconnecting','offline','error','access-lost'],
    stale:['live','reconnecting','offline','error','access-lost'],
    reconnecting:['live','stale','offline','error','access-lost'],
    offline:['reconnecting','live','stale','error','access-lost'],
    error:['reconnecting','offline','live','stale','access-lost'],
    'access-lost':['starting']
  });
  var nightState=new StateMachine('night','automatic-next',{
    'automatic-next':['automatic-current','manual'],
    'automatic-current':['automatic-next','manual'],
    manual:['automatic-next','automatic-current']
  });

  function schedulerCancel(name){
    var job=schedulerJobs.get(name);
    if(!job)return;
    if(job.timer)clearTimeout(job.timer);
    schedulerJobs.delete(name);
  }
  function schedulerEvery(name,interval,fn,options){
    schedulerCancel(name);
    options=options||{};
    var job={name:name,interval:interval,fn:fn,whenHidden:!!options.whenHidden,timer:null,active:true};
    function nextInterval(){
      var value=typeof job.interval==='function'?job.interval():job.interval;
      return Math.max(1000,Number(value)||1000)
    }
    function schedule(delay){
      if(!job.active)return;
      var wait=delay==null?nextInterval():Math.max(0,Number(delay)||0);
      job.timer=setTimeout(async function(){
        if(!job.active)return;
        if(job.whenHidden||!global.document||document.visibilityState!=='hidden'){
          try{await Promise.resolve(job.fn())}catch(error){diagnostic('scheduler',name,'failed')}
        }
        schedule(undefined);
      },wait);
    }
    schedulerJobs.set(name,job);schedule(options.immediate?0:nextInterval());return()=>{job.active=false;schedulerCancel(name)};
  }
  function schedulerRun(name){
    var job=schedulerJobs.get(name);
    if(!job)return Promise.resolve(false);
    try{return Promise.resolve(job.fn()).then(function(){return true})}catch(error){diagnostic('scheduler',name,'failed');return Promise.resolve(false)}
  }
  function schedulerStopAll(){Array.from(schedulerJobs.keys()).forEach(schedulerCancel)}

  function updateLeader(id,at){
    var previous=leaderId;leaderId=id||'';leaderSeenAt=Number(at||Date.now());
    if(previous!==leaderId&&global.dispatchEvent&&typeof global.CustomEvent==='function'){
      try{global.dispatchEvent(new CustomEvent('roster:tab-leader',{detail:{leaderId:leaderId,isLeader:leaderId===TAB_ID,previousLeaderId:previous||''}}))}catch(error){}
    }
  }
  function announce(type,detail){
    if(!bc)return;
    try{bc.postMessage({type:type,tabId:TAB_ID,at:Date.now(),detail:detail||null})}catch(error){}
  }
  function claimLeadership(){
    var now=Date.now();
    if(!leaderId||now-leaderSeenAt>LEADER_TTL||TAB_ID<leaderId){
      updateLeader(TAB_ID,now);announce('leader',{id:TAB_ID});
    }
    return leaderId===TAB_ID;
  }
  function startCoordinator(){
    if(!('BroadcastChannel' in global))return;
    try{
      bc=new BroadcastChannel('anaesthetic-roster-runtime-v1');
      bc.onmessage=function(event){
        var message=event&&event.data||{};
        if(!message.tabId||message.tabId===TAB_ID)return;
        if(message.type==='hello'||message.type==='leader'){
          if(!leaderId||Date.now()-leaderSeenAt>LEADER_TTL||message.tabId<leaderId)updateLeader(message.tabId,message.at);
          if(claimLeadership())announce('leader',{id:TAB_ID});
        }
        if(message.type==='sync-revision'&&global.dispatchEvent){
          global.dispatchEvent(new CustomEvent('roster:peer-revision',{detail:message.detail||{}}));
        }
        if(message.type==='update-ready'&&global.dispatchEvent){
          global.dispatchEvent(new CustomEvent('roster:peer-update',{detail:message.detail||{}}));
        }
      };
      announce('hello',null);claimLeadership();
      leaderHeartbeat=setInterval(function(){if(claimLeadership())announce('leader',{id:TAB_ID})},5000);
    }catch(error){diagnostic('tabs','broadcast','unavailable')}
  }
  function isLeader(){return !bc||claimLeadership()}

  function addClockSample(serverIso,sentAt,receivedAt){
    var server=Date.parse(serverIso||''),sent=Number(sentAt),received=Number(receivedAt);
    if(!Number.isFinite(server)||!Number.isFinite(sent)||!Number.isFinite(received)||received<sent)return false;
    var rtt=received-sent;
    if(rtt>4000){diagnostic('clock','sample','high-rtt');return false}
    var midpoint=sent+rtt/2,offset=server-midpoint;
    if(Math.abs(offset)>24*60*60*1000){diagnostic('clock','sample','implausible');return false}
    clockSamples.push({rtt:rtt,offset:offset,serverIso:serverIso,sent:sent,received:received});
    clockSamples=clockSamples.sort(function(a,b){return a.rtt-b.rtt}).slice(0,MAX_CLOCK_SAMPLES);
    var best=clockSamples[0];
    if(domain&&domain.setServerClock)domain.setServerClock(best.serverIso,best.sent,best.received);
    return true;
  }
  function clockConfidence(){
    if(!clockSamples.length)return{level:'device',sampleCount:0,rtt:null,offsetMs:0};
    var best=clockSamples[0];
    return{level:best.rtt<=500?'high':best.rtt<=1500?'medium':'low',sampleCount:clockSamples.length,rtt:best.rtt,offsetMs:best.offset};
  }

  function diffObjects(before,after){
    before=before||{};after=after||{};
    var keys=Array.from(new Set(Object.keys(before).concat(Object.keys(after)))).sort(),changes=[];
    keys.forEach(function(key){
      var left=before[key],right=after[key];
      if(JSON.stringify(left)!==JSON.stringify(right))changes.push({key:key,before:left,after:right});
    });
    return changes;
  }

  var ERROR_CODES={
    ROSTER_REVISION_CONFLICT:'This night changed on another device.',
    PLAN_INCOMPLETE:'This night is not ready to confirm.',
    STAFF_NOT_EFFECTIVE:'One of the selected staff members is no longer available for this night.',
    SCHEMA_TOO_OLD:'The shared roster needs a database update.',
    PERMISSION_DENIED:'Your account cannot perform this action.',
    OPERATION_REPLAYED:'This change was already saved.',
    STALE_CLIENT:'The latest night must be loaded before saving.',
    INVALID_ROSTER_DATE:'That date is not a valid roster night.',
    INVALID_ROTATION:'The permanent rotation is invalid.',
    INVALID_SEVENTH_CYCLE:'The seventh-nurse cycle is invalid.',
    ROTATION_VERSION_EXISTS:'A permanent rotation version already exists for that night.',
    PUBLISH_REGRESSION:'Publishing cannot shorten the existing roster.',
    CLIENT_UPDATE_REQUIRED:'An important Night Roster update is required before shared changes can be made.',
    CLIENT_VERSION_BLOCKED:'This Night Roster version cannot make shared changes.',
    APP_MAINTENANCE:'Shared roster editing has been temporarily paused.'
  };
  function errorCode(error){
    var explicit=error&&((error.details&&error.details.code)||error.code);
    if(explicit&&(ERROR_CODES)[explicit])return explicit;
    var raw=String(error&&error.message||'');
    var keys=Object.keys(ERROR_CODES);
    for(var i=0;i<keys.length;i++)if(raw.indexOf(keys[i])>=0)return keys[i];
    var message=raw.toLowerCase();
    if(message.indexOf('revision')>=0||message.indexOf('another device')>=0)return'ROSTER_REVISION_CONFLICT';
    if(message.indexOf('permission')>=0||message.indexOf('42501')>=0)return'PERMISSION_DENIED';
    return explicit||'UNKNOWN';
  }

  function setResumeHandler(fn){resumeHandler=typeof fn==='function'?fn:null}
  function reconcile(reason){
    if(!resumeHandler)return Promise.resolve(false);
    if(resumeInFlight)return resumeInFlight;
    diagnostic('lifecycle','resume',reason||'unknown');
    resumeInFlight=Promise.resolve().then(function(){return resumeHandler(reason||'unknown')}).finally(function(){resumeInFlight=null});
    return resumeInFlight;
  }
  function bindLifecycle(){
    if(!global.addEventListener)return;
    global.addEventListener('online',function(){reconcile('online')});
    global.addEventListener('focus',function(){reconcile('focus')});
    global.addEventListener('pageshow',function(){reconcile('pageshow')});
    if(global.document)document.addEventListener('visibilitychange',function(){if(document.visibilityState==='visible')reconcile('visible')});
  }

  function shadowCompare(label,legacyValue,nextValue){
    var same=JSON.stringify(legacyValue)===JSON.stringify(nextValue);
    if(!same)diagnostic('shadow',label,'mismatch');
    return same;
  }

  startCoordinator();
  bindLifecycle();

  global.AnaestheticRuntime={
    tabId:TAB_ID,
    storage:storage,
    state:{sync:syncState,night:nightState},
    scheduler:{every:schedulerEvery,cancel:schedulerCancel,run:schedulerRun,stopAll:schedulerStopAll},
    coordinator:{isLeader:isLeader,announce:announce},
    clock:{addSample:addClockSample,confidence:clockConfidence},
    recovery:{start:recoveryStart,markReady:recoveryReady,status:recoveryStatus},
    snapshots:{format:SNAPSHOT_FORMAT,maxBytes:SNAPSHOT_MAX_BYTES,packSync:packSnapshot,unpackSync:unpackSnapshot,persist:persistSnapshot,load:loadSnapshot,remove:removeSnapshot},
    latency:{record:recordLatency,measure:measureLatency,summary:latencySummary},
    errors:{code:errorCode,message:function(code){return (ERROR_CODES)[code]||'The shared roster could not complete that action.'},known:ERROR_CODES},
    conflicts:{diff:diffObjects},
    lifecycle:{setResumeHandler:setResumeHandler,reconcile:reconcile},
    shadowCompare:shadowCompare,
    diagnostic:diagnostic
  };
})(window);
