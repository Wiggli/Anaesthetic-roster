import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const storage = new Map();
const session = new Map();
const listeners = new Map();
const documentListeners = new Map();
const window = {
  localStorage: {
    getItem(key){ return storage.has(key) ? storage.get(key) : null; },
    setItem(key,value){ storage.set(key,String(value)); },
    removeItem(key){ storage.delete(key); }
  },
  sessionStorage: {
    getItem(key){ return session.has(key) ? session.get(key) : null; },
    setItem(key,value){ session.set(key,String(value)); },
    removeItem(key){ session.delete(key); }
  },
  addEventListener(name,handler){ listeners.set(name,handler); },
  dispatchEvent(){},
  crypto: { randomUUID(){ return '00000000-0000-4000-8000-000000000001'; } }
};
const document = {
  visibilityState: 'visible',
  addEventListener(name,handler){ documentListeners.set(name,handler); }
};
const context = {
  window, document, Date, Intl, Math, JSON, Number, String, Array, Object, Map, Set, Promise,
  setTimeout, clearTimeout, setInterval(){ return 1; }, clearInterval(){}, CustomEvent: function(name,init){ this.type=name;this.detail=init&&init.detail; }
};
window.document=document;
vm.createContext(context);
for(const file of ['domain-logic.js','runtime-foundation.js']){
  vm.runInContext(fs.readFileSync(path.join(__dirname,'..',file),'utf8'),context,{filename:file});
}

const runtime=window.AnaestheticRuntime;
assert.ok(runtime,'reliability runtime must load');
assert.equal(runtime.state.sync.value,'starting');
assert.equal(runtime.state.sync.set('live'),true);
assert.equal(runtime.state.sync.value,'live');
assert.equal(runtime.state.sync.set('offline'),true);
assert.equal(runtime.state.sync.set('reconnecting'),true);
assert.equal(runtime.state.sync.set('live'),true);

assert.equal(runtime.state.night.set('manual'),true);
assert.equal(runtime.state.night.value,'manual');
assert.equal(runtime.state.night.set('automatic-current'),true);
assert.equal(runtime.state.night.value,'automatic-current');

runtime.storage.set('selected_date','2026-10-04');
assert.equal(storage.get('anaes_selected_date'),'2026-10-04');
runtime.storage.setItem('anaes_my_name','Andre');
assert.equal(storage.get('anaes_my_name'),'Andre');
runtime.storage.removeItem('anaes_my_name');
assert.equal(storage.has('anaes_my_name'),false);

assert.equal(runtime.clock.addSample('2026-10-02T00:00:00.000Z',0,5001),false,'very slow clock samples must be rejected');
const now=Date.now();
assert.equal(runtime.clock.addSample(new Date(now+60000).toISOString(),now-100,now),true);
assert.ok(['high','medium','low'].includes(runtime.clock.confidence().level));

assert.deepEqual(
  Array.from(runtime.conflicts.diff({a:1,b:2},{a:1,b:3,c:4}),x=>x.key),
  ['b','c'],
  'conflict diff must expose only changed fields'
);
assert.equal(runtime.errors.code({message:'ROSTER_REVISION_CONFLICT'}),'ROSTER_REVISION_CONFLICT');
assert.equal(runtime.errors.code({message:'ROTATION_VERSION_EXISTS'}),'ROTATION_VERSION_EXISTS');

let resumes=0;
runtime.lifecycle.setResumeHandler(async()=>{resumes++;return true});
await Promise.all([runtime.lifecycle.reconcile('focus'),runtime.lifecycle.reconcile('pageshow')]);
assert.equal(resumes,1,'simultaneous resume signals must collapse into one reconciliation');

assert.equal(runtime.shadowCompare('same',{a:1},{a:1}),true);
assert.equal(runtime.shadowCompare('different',{a:1},{a:2}),false);

console.log('Reliability runtime state, storage, clock, reconciliation and conflict contracts passed.');
