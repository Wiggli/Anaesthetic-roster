/* GENERATED FILE. Edit the source modules under src/, then run npm run generate:runtime. */
/* Anaesthetic Night Roster domain foundation.
   Pure clock/freshness/capability helpers plus privacy-safe diagnostics.
   Loaded before the legacy shell so both legacy and React regions can share one source. */
(function(global){
  'use strict';

  var MALTA_FORMATTER=new Intl.DateTimeFormat('en-GB',{
    timeZone:'Europe/Malta',
    year:'numeric',month:'2-digit',day:'2-digit',
    hour:'2-digit',minute:'2-digit',second:'2-digit',
    hourCycle:'h23'
  });
  var serverClockOffsetMs=0;
  var serverClockSyncedAt=0;
  var DIAG_KEY='anaes_diag_ring_v1';
  var DIAG_LIMIT=30;

  function pad(value){return String(value).padStart(2,'0')}
  function isoFromParts(parts){return parts.year+'-'+pad(parts.month)+'-'+pad(parts.day)}
  function addDays(date,amount){
    var p=String(date).split('-').map(Number),d=new Date(Date.UTC(p[0],p[1]-1,p[2]));
    d.setUTCDate(d.getUTCDate()+Number(amount||0));
    return d.getUTCFullYear()+'-'+pad(d.getUTCMonth()+1)+'-'+pad(d.getUTCDate())
  }
  function maltaParts(value){
    var date=value instanceof Date?value:new Date(value==null?Date.now():value),out={};
    MALTA_FORMATTER.formatToParts(date).forEach(function(part){
      if(part.type!=='literal')out[part.type]=Number(part.value)
    });
    return out
  }
  function deviceNowMs(){return Date.now()}
  function nowMs(){return deviceNowMs()+serverClockOffsetMs}
  function now(){return new Date(nowMs())}
  function operationalRosterDate(value){
    var p=maltaParts(value==null?nowMs():value),date=isoFromParts(p);
    return p.hour<7?addDays(date,-1):date
  }
  function resolveAutomaticNight(rosterDates,value){
    var list=(rosterDates||[]).map(function(item){return typeof item==='string'?item:item&&item.date}).filter(Boolean);
    var p=maltaParts(value==null?nowMs():value),calendarDate=isoFromParts(p),operationalDate=p.hour<7?addDays(calendarDate,-1):calendarDate;
    if(!list.length)return{index:0,date:null,isCurrent:false,calendarDate:calendarDate,operationalDate:operationalDate,phase:'unavailable'};
    var index=list.findIndex(function(date){return date>=operationalDate});
    if(index<0)index=list.length-1;
    var date=list[index],isCurrent=date===operationalDate&&(p.hour<7||p.hour>=19);
    return{
      index:index,
      date:date,
      isCurrent:isCurrent,
      calendarDate:calendarDate,
      operationalDate:operationalDate,
      hour:p.hour,
      minute:p.minute,
      phase:isCurrent?(p.hour>=19?'current-evening':'current-duty'):'next'
    }
  }
  function setServerClock(serverIso,sentAt,receivedAt){
    var server=Date.parse(serverIso||'');
    if(!Number.isFinite(server))return false;
    var sent=Number(sentAt||deviceNowMs()),received=Number(receivedAt||deviceNowMs());
    if(received<sent)received=sent;
    var midpoint=sent+(received-sent)/2;
    serverClockOffsetMs=server-midpoint;
    serverClockSyncedAt=deviceNowMs();
    return true
  }
  function clearServerClock(){serverClockOffsetMs=0;serverClockSyncedAt=0}
  function clockState(){
    return{offsetMs:serverClockOffsetMs,syncedAt:serverClockSyncedAt,source:serverClockSyncedAt?'server-adjusted':'device'}
  }
  function relativeAge(savedAt,value){
    var when=Date.parse(savedAt||'');
    if(!Number.isFinite(when))return{ageMs:Infinity,label:'not yet',level:'unknown'};
    var age=Math.max(0,(value==null?nowMs():Number(value))-when);
    var seconds=Math.floor(age/1000),minutes=Math.floor(seconds/60),hours=Math.floor(minutes/60),days=Math.floor(hours/24);
    var label=seconds<45?'just now':minutes<60?minutes+' min ago':hours<24?hours+' h ago':days+' d ago';
    var level=age<120000?'fresh':age<600000?'recent':age<3600000?'aging':'stale';
    return{ageMs:age,label:label,level:level}
  }
  function freshness(savedAt,online,value){
    var age=relativeAge(savedAt,value);
    if(!online)return{state:'offline',label:age.ageMs===Infinity?'Offline · no saved roster':'Offline · saved '+age.label,age:age};
    if(age.ageMs===Infinity)return{state:'starting',label:'Connecting',age:age};
    if(age.level==='stale')return{state:'stale',label:'Live connection · last refreshed '+age.label,age:age};
    return{state:'live',label:'Live · '+age.label,age:age}
  }
  function capabilities(schemaVersion){
    var v=Number(schemaVersion||0);
    return{
      schemaVersion:v,
      serverClock:v>=47,
      chatIdempotency:v>=47,
      monotonicChatRead:v>=47,
      commandIdempotency:v>=48,
      freshnessBarrier:v>=48,
      serverPlanValidation:v>=48,
      atomicFinalise:v>=37,
      nightRoleOverrides:v>=36
    }
  }
  function commandId(){
    if(global.crypto&&typeof global.crypto.randomUUID==='function')return global.crypto.randomUUID();
    return 'cmd-'+deviceNowMs().toString(36)+'-'+Math.random().toString(36).slice(2,14)
  }
  function safeCode(value){
    return String(value==null?'':value).replace(/[^A-Za-z0-9_.:-]/g,'').slice(0,72)||'none'
  }
  function readDiagnostics(){
    try{
      var value=JSON.parse(global.sessionStorage&&global.sessionStorage.getItem(DIAG_KEY)||'[]');
      return Array.isArray(value)?value.slice(-DIAG_LIMIT):[]
    }catch(error){return[]}
  }
  function recordDiagnostic(category,operation,code){
    var row={at:new Date(deviceNowMs()).toISOString(),category:safeCode(category),operation:safeCode(operation),code:safeCode(code)};
    var rows=readDiagnostics();rows.push(row);rows=rows.slice(-DIAG_LIMIT);
    try{if(global.sessionStorage)global.sessionStorage.setItem(DIAG_KEY,JSON.stringify(rows))}catch(error){}
    return row
  }
  function clearDiagnostics(){try{if(global.sessionStorage)global.sessionStorage.removeItem(DIAG_KEY)}catch(error){}}
  function snapshotIsExpired(savedAt,maxAgeMs,value){
    var when=Date.parse(savedAt||'');
    if(!Number.isFinite(when))return true;
    return (value==null?nowMs():Number(value))-when>Number(maxAgeMs||0)
  }

  global.AnaestheticDomain={
    maltaParts:maltaParts,
    operationalRosterDate:operationalRosterDate,
    resolveAutomaticNight:resolveAutomaticNight,
    now:now,
    nowMs:nowMs,
    setServerClock:setServerClock,
    clearServerClock:clearServerClock,
    clockState:clockState,
    relativeAge:relativeAge,
    freshness:freshness,
    capabilities:capabilities,
    commandId:commandId,
    recordDiagnostic:recordDiagnostic,
    readDiagnostics:readDiagnostics,
    clearDiagnostics:clearDiagnostics,
    snapshotIsExpired:snapshotIsExpired,
    addDays:addDays
  };
})(window);
