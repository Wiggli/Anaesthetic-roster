const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const source=fs.readFileSync('src/legacy-ui/clinical.js','utf8');
const date='2026-10-12';
function setup(rpc){
 const state={historyLoadedDates:{},historyLoadingDates:{},historyInvalidationVersions:{},historyErrorDates:{},historyPageState:{},changeHistory:{},overtimeHistory:{},roleOverrideHistory:{},schemaVersion:56,supa:{rpc},currentUserProfile:{email:'test@example.test'},cur:()=>({date}),plainSnapshotRecord:x=>x&&typeof x==='object',renderRecentActivity(){},renderChanges(){},recordAppDiagnostic(){},navigator:{onLine:true},forcedOfflineSession:false};
 vm.createContext(state);vm.runInContext(source.slice(source.indexOf('function invalidateNightHistory(')),state);return state;
}
(async()=>{
 let items=[];const s=setup(async()=>({data:{items},error:null}));
 await s.loadNightHistory(date);assert.equal(s.historyLoadedDates[date],true);assert.equal(s.overtimeHistory[date].length,0);
 items=[{source:'overtime',payload:{nurse_name:'Cover Nurse',action:'added'}},{source:'absence',payload:{absent_name:'Andre',action:'added'}}];
 s.invalidateNightHistory();await s.loadNightHistory(date);assert.equal(s.overtimeHistory[date].length,1);assert.equal(s.changeHistory[date].length,1);
 let resolve, calls=0;const race=setup(()=>++calls===1?new Promise(r=>resolve=r):Promise.resolve({data:{items},error:null}));
 const pending=race.loadNightHistory(date);race.invalidateNightHistory(date);resolve({data:{items:[]},error:null});await pending;await new Promise(r=>setImmediate(r));
 assert.equal(calls,2);assert.equal(race.overtimeHistory[date].length,1,'an obsolete empty response must not replace newer history');
 const failed=setup(async()=>({error:{code:'NETWORK'}}));await failed.loadNightHistory(date);assert.equal(failed.historyLoadedDates[date],undefined);assert.equal(failed.historyErrorDates[date],true);
 failed.supa.rpc=async()=>({data:{items},error:null});delete failed.historyErrorDates[date];await failed.loadNightHistory(date);assert.equal(failed.historyLoadedDates[date],true);assert.equal(failed.historyErrorDates[date],undefined);
 const sync=fs.readFileSync('src/legacy-ui/sync.js','utf8');assert.match(sync,/invalidateNightHistory\(\);lastSuccessfulSyncAt/,'shared reloads must invalidate history even without row realtime');
 console.log('Night history refresh, in-flight invalidation and retry passed.');
})().catch(e=>{console.error(e);process.exitCode=1});
