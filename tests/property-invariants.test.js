const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const storage = new Map();
const noopElement = () => ({
  classList: { add(){}, remove(){}, toggle(){} },
  style: {}, dataset: {}, value: '', textContent: '', innerHTML: '', disabled: false,
  querySelectorAll(){ return []; }, querySelector(){ return null; },
  setAttribute(){}, removeAttribute(){}, addEventListener(){}, focus(){}
});
const context = {
  console, Date, Intl, Math, JSON, Set, Map, Array, Object, String, Number, Promise, Blob, URL,
  setTimeout, clearTimeout, setInterval(){ return 0; }, clearInterval(){},
  navigator: { onLine: true, userAgent: 'property-test', serviceWorker: {} },
  localStorage: {
    getItem(key){ return storage.has(key) ? storage.get(key) : null; },
    setItem(key,value){ storage.set(key,String(value)); },
    removeItem(key){ storage.delete(key); }
  },
  document: {
    visibilityState: 'visible', body: noopElement(),
    getElementById(){ return noopElement(); },
    querySelector(){ return null; }, querySelectorAll(){ return []; },
    createElement(){ return noopElement(); }
  },
  window: {
    supabase: null, addEventListener(){}, dispatchEvent(){},
    matchMedia(){ return { matches:false }; }, scrollTo(){}, navigator: {}
  },
  confirm(){ return true; }, alert(){}
};
context.window.window=context.window;
vm.createContext(context);
for(const file of ['app-core.js','app-ui.js']){
  const source=fs.readFileSync(path.join(__dirname,'..',file),'utf8').replace(/\nbind\(\);\s*\ninitApplication\(\);\s*$/,'');
  vm.runInContext(source,context,{filename:file});
}

context.rebuildCalculatedRoster();
const sampleDates=['2026-07-04','2026-10-24','2027-03-27','2027-07-15','2027-12-30'];
let combinations=0;

for(const date of sampleDates){
  const base=context.calculateNight(date);
  const permanent=[base.first1,base.first2,base.second1,base.second2,base.pager,base.reliever];
  assert.equal(new Set(permanent).size,6,'base rotation must remain unique on '+date);

  for(let mask=0;mask<64;mask++){
    const absent=permanent.filter((_,i)=>(mask&(1<<i))!==0);
    for(let overtimeCount=0;overtimeCount<=4;overtimeCount++){
      combinations++;
      context.nightChanges={ [date]: absent.map((name,i)=>({id:'00000000-0000-4000-8000-'+String(mask*10+i).padStart(12,'0').slice(-12),absent_name:name,reason:'Leave'})) };
      context.nightOvertime={ [date]: Array.from({length:overtimeCount},(_,i)=>({id:'10000000-0000-4000-8000-'+String(mask*10+i).padStart(12,'0').slice(-12),nurse_name:'OT '+mask+' '+i,allocation_key:null})) };
      context.fiveCoverChoices={};
      context.nightRoleOverrides={};
      context.nightPlanStatuses={};
      context.allocationDrafts={};
      context.seventhDecisionDrafts={};
      context.labourOrderDrafts={};

      const plan=context.staffingPlan(base);
      const expected=6-absent.length+overtimeCount;
      assert.equal(plan.count,expected,'staffing count mismatch on '+date+', mask '+mask+', OT '+overtimeCount);
      assert.equal(new Set(plan.unresolved).size,plan.unresolved.length,'unresolved role keys must be unique');
      assert.equal(new Set(plan.validAssignments.map(x=>String(x.id))).size,plan.validAssignments.length,'valid overtime assignments must never duplicate an overtime record');

      if(plan.count<5){
        assert.equal(context.planIsProvisional(base),true,'below-five plans must always remain provisional');
      }

      const effective=context.applyChanges(base);
      const active=context.activeNames(effective).map(name=>String(name).toLowerCase());
      assert.equal(new Set(active).size,active.length,'effective staff names must never duplicate');

      for(const absentName of absent){
        assert.equal(active.includes(String(absentName).toLowerCase()),false,'absent nurse remained active on '+date+', mask '+mask+', OT '+overtimeCount+', absent '+absentName+', active '+JSON.stringify(active)+', unresolved '+JSON.stringify(plan.unresolved));
      }
    }
  }
}

console.log('Generated staffing invariant sweep passed across '+sampleDates.length+' reference nights and '+combinations+' staffing combinations.');
