const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync('src/legacy-ui/clinical.js','utf8');
const start=source.indexOf('function acknowledgeNightActivity('),end=source.indexOf('function openActivityDetail(',start);
const store=new Map(),events=[];let now=Date.parse('2026-10-07T22:14:00Z'),records=[];
class Clock extends Date {static now(){return now;}}
const context={Date:Clock,appStorage:{getItem:k=>store.get(k),setItem:(k,v)=>store.set(k,v)},byId:()=>({}),activitySignature:()=>records.map(x=>x.changed_at).join('|'),staffingHistoryFor:()=>records,activityOpenedThisSession:{},changedSinceSession:{},shortTime:x=>x,CustomEvent:function(type,detail){this.type=type;this.detail=detail.detail;},window:{dispatchEvent:event=>events.push(event)}};
vm.createContext(context);vm.runInContext(source.slice(start,end),context);
const date='2026-10-08';context.renderRecentActivity(date);
assert.equal(events.at(-1).detail.updated,false,'first use establishes a quiet baseline');
now+=60000;records=Array.from({length:8},(_,i)=>({title:`Overtime update ${i}`,label:'Overtime',type:'overtime',changed_at:new Clock(now+i*1000).toISOString(),changed_by:'Nurse'}));
context.renderRecentActivity(date);assert.equal(events.at(-1).detail.updatedCount,8,'count all loaded updates rather than only five visible rows');
assert.equal(events.at(-1).detail.summary.length,3,'return summary remains compact');assert.equal(events.at(-1).detail.sinceLabel,'00:14','return time is always Malta time');
now+=60000;context.acknowledgeNightActivity(date);context.renderRecentActivity(date);assert.equal(events.at(-1).detail.updated,false,'acknowledgement clears both count and attention');
context.activityOpenedThisSession={};context.renderRecentActivity(date);assert.equal(events.at(-1).detail.updated,false,'reopening must not resurrect acknowledged updates');
now+=60000;records.push({title:'Break allocation updated',changed_at:new Clock(now).toISOString()});context.renderRecentActivity(date);assert.equal(events.at(-1).detail.updatedCount,1,'later updates remain visible after acknowledgement');
for(let i=0;i<90;i++){now+=1000;context.acknowledgeNightActivity(`date-${i}`);}
assert.equal(Object.keys(JSON.parse(store.get('anaes_seen_night_activity_at'))).length,60,'private device history remains bounded');
const core=fs.readFileSync('app-core.js','utf8');assert.match(core,/clearPrivateDeviceData[\s\S]*anaes_seen_night_activity_at/,'sign-out clears presentation history');
const css=fs.readFileSync('src/product-unified.css','utf8');
const first=css.slice(css.indexOf(':root {'),css.indexOf('html[data-theme="dark"], body.dark {'));
const dark=css.slice(css.indexOf('html[data-theme="dark"], body.dark {'),css.indexOf('/* Existing components'));
const tokens=block=>Object.fromEntries([...block.matchAll(/--([\w-]+):\s*(#[\da-f]{6});/gi)].map(m=>[m[1],m[2]]));
function luminance(hex){const parts=hex.slice(1).match(/../g).map(x=>parseInt(x,16)/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4);return parts[0]*.2126+parts[1]*.7152+parts[2]*.0722;}
function contrast(a,b){const x=luminance(a),y=luminance(b);return(Math.max(x,y)+.05)/(Math.min(x,y)+.05);}
for(const [mode,theme] of [['light',tokens(first)],['dark',tokens(dark)]])for(const surface of ['surface-primary','surface-secondary','surface-elevated'])for(const text of ['text-primary','text-secondary','text-muted','accent-primary','status-success','status-warning','status-danger','status-info'])assert.ok(contrast(theme[text],theme[surface])>=4.5,`${mode} ${text} on ${surface} must pass normal-text contrast`);
const account=fs.readFileSync('src/account-experience.tsx','utf8');for(const hue of [...account.matchAll(/(teal|blue|violet|rose|amber|graphite): '(#[\da-f]{6})'/g)])assert.ok(contrast(hue[2],'#ffffff')>=4.5,`${hue[1]} identity glyph contrast`);
console.log('Return summary lifecycle, bounded storage, dual-theme text and identity contrast passed.');
