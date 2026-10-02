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

  function StateMachine(name,initial,transitions){
    this.name=name;this.value=initial;this.transitions=transitions||{};this.listeners=new Set();
  }
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
        schedule();
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
      announce('hello');claimLeadership();
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
    PUBLISH_REGRESSION:'Publishing cannot shorten the existing roster.'
  };
  function errorCode(error){
    var explicit=error&&((error.details&&error.details.code)||error.code);
    if(explicit&&ERROR_CODES[explicit])return explicit;
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
    errors:{code:errorCode,message:function(code){return ERROR_CODES[code]||'The shared roster could not complete that action.'},known:ERROR_CODES},
    conflicts:{diff:diffObjects},
    lifecycle:{setResumeHandler:setResumeHandler,reconcile:reconcile},
    shadowCompare:shadowCompare,
    diagnostic:diagnostic
  };
})(window);
