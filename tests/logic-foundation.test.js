const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const storage = new Map();
const window = {
  sessionStorage: {
    getItem(key) { return storage.has(key) ? storage.get(key) : null; },
    setItem(key, value) { storage.set(key, String(value)); },
    removeItem(key) { storage.delete(key); }
  }
};
const context = { window, Intl, Date, Math, JSON, Number, String, Array, Object, console };
vm.runInNewContext(fs.readFileSync(path.join(__dirname, '..', 'domain-logic.js'), 'utf8'), context, { filename: 'domain-logic.js' });
const domain = window.AnaestheticDomain;
assert.ok(domain, 'shared domain foundation must load');

function pad(v){ return String(v).padStart(2,'0'); }
function localInstant(date,hour,minute){
  const parts=date.split('-').map(Number);
  const y=parts[0],m=parts[1],d=parts[2];
  const naive=Date.UTC(y,m-1,d,hour,minute,0);
  for(let delta=-180;delta<=180;delta++){
    const candidate=naive+delta*60000;
    const p=domain.maltaParts(candidate);
    if(p.year===y&&p.month===m&&p.day===d&&p.hour===hour&&p.minute===minute)return candidate;
  }
  throw new Error('Could not resolve Malta local instant '+date+' '+pad(hour)+':'+pad(minute));
}
function addDays(date,n){ return domain.addDays(date,n); }

const roster=[];
let date='2026-06-30';
for(let i=0;i<138;i++){ roster.push(date); date=addDays(date,4); }
assert.equal(roster.length,138);
assert.equal(roster[roster.length-1],'2027-12-30');

for(let i=0;i<roster.length-1;i++){
  const current=roster[i],next=roster[i+1],morning=addDays(current,1);
  const beforeStart=domain.resolveAutomaticNight(roster,localInstant(current,18,59));
  assert.equal(beforeStart.date,current, current+' must remain the next selected roster night before 19:00');
  assert.equal(beforeStart.isCurrent,false);
  const start=domain.resolveAutomaticNight(roster,localInstant(current,19,0));
  assert.equal(start.date,current);
  assert.equal(start.isCurrent,true, current+' must become current at 19:00');
  const beforeBoundary=domain.resolveAutomaticNight(roster,localInstant(morning,6,59));
  assert.equal(beforeBoundary.date,current);
  assert.equal(beforeBoundary.isCurrent,true, current+' must remain current through 06:59');
  const boundary=domain.resolveAutomaticNight(roster,localInstant(morning,7,0));
  assert.equal(boundary.date,next, current+' must advance to the following roster night at 07:00');
  assert.equal(boundary.isCurrent,false);
}

const reported=domain.resolveAutomaticNight(roster,localInstant('2026-10-01',23,38));
assert.equal(reported.date,'2026-10-04');
assert.equal(reported.isCurrent,false);

const springRoster='2027-03-27';
const springMorning=addDays(springRoster,1);
assert.equal(domain.resolveAutomaticNight(roster,localInstant(springMorning,6,59)).date,springRoster);
assert.equal(domain.resolveAutomaticNight(roster,localInstant(springMorning,7,0)).date,'2027-03-31');

const fresh=domain.freshness('2026-10-02T10:00:00.000Z',true,Date.parse('2026-10-02T10:00:30.000Z'));
assert.equal(fresh.state,'live');
const stale=domain.freshness('2026-10-02T08:00:00.000Z',true,Date.parse('2026-10-02T10:00:00.000Z'));
assert.equal(stale.state,'stale');
const offline=domain.freshness('2026-10-02T09:55:00.000Z',false,Date.parse('2026-10-02T10:00:00.000Z'));
assert.equal(offline.state,'offline');

assert.equal(domain.capabilities(46).chatIdempotency,false);
assert.equal(domain.capabilities(47).chatIdempotency,true);
assert.equal(domain.capabilities(47).monotonicChatRead,true);
assert.equal(domain.capabilities(47).serverClock,true);

const sent=Date.now()-40,received=Date.now();
const desiredOffset=120000;
assert.equal(domain.setServerClock(new Date((sent+received)/2+desiredOffset).toISOString(),sent,received),true);
assert.ok(Math.abs(domain.clockState().offsetMs-desiredOffset)<5,'server clock offset must use request midpoint');
domain.clearServerClock();

domain.recordDiagnostic('network','startup snapshot','TIME OUT !');
const diagnostics=domain.readDiagnostics();
const diagnostic=diagnostics[diagnostics.length-1];
assert.equal(diagnostic.category,'network');
assert.equal(diagnostic.operation,'startupsnapshot');
assert.equal(diagnostic.code,'TIMEOUT');

console.log('Authoritative Night clock, freshness, capabilities and diagnostics invariants passed.');
