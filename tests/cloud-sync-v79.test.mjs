import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source=readFileSync(new URL('../src/main.js',import.meta.url),'utf8');
const start=source.indexOf('function stableProfile(');
const end=source.indexOf('function saveCloudConflict(',start);
assert.ok(start>=0&&end>start,'Sync source markers not found');
const functions=source.slice(start,end);
const {cloudMerge}=new Function('validateCloudRecoveryProfile',functions+'\nreturn {cloudMerge};')((v)=>{
 if(v?.schemaVersion!==4||!v.days||!Array.isArray(v.purchased))throw Error('Invalid profile');
 return v;
});
const copy=x=>JSON.parse(JSON.stringify(x));
const base={
 schemaVersion:4,
 days:{'2026-11-01':[1]},
 rewardLedger:{'2026-11-01':{xp:15,coins:5,bonus:false,awards:{1:{xp:15,coins:5}}}},
 purchased:[],purchaseRecords:[],mildDays:{},settings:{scanlines:true,sounds:false},
 protocolEdits:{},scheduleHistory:{},customProtocols:[]
};
const changed=fn=>{const p=copy(base);fn(p);return p;};
const add=(p,date,id,xp,coins)=>{
 p.days[date]=[...(p.days[date]||[]),id];
 const row=p.rewardLedger[date]||{xp:0,coins:0,bonus:false,awards:{}};
 row.awards[id]={xp,coins};row.xp+=xp;row.coins+=coins;p.rewardLedger[date]=row;
};
test('merges different edits to settings',()=>{
 const l=changed(p=>p.settings.scanlines=false),r=changed(p=>p.settings.sounds=true);
 const result=cloudMerge(base,l,r);
 assert.equal(result.ok,true);assert.deepEqual(result.profile.settings,{scanlines:false,sounds:true});
});
test('merges reward ledger changes on different dates of same month',()=>{
 const l=changed(p=>add(p,'2026-11-02',2,20,8)),r=changed(p=>add(p,'2026-11-03',3,30,10));
 const result=cloudMerge(base,l,r);assert.equal(result.ok,true);
 assert.equal(result.profile.rewardLedger['2026-11-02'].xp,20);
 assert.equal(result.profile.rewardLedger['2026-11-03'].xp,30);
});
test('merges disjoint additions on the same date with exact reward deltas',()=>{
 const l=changed(p=>add(p,'2026-11-01',2,20,8)),r=changed(p=>add(p,'2026-11-01',3,30,10));
 const result=cloudMerge(base,l,r);assert.equal(result.ok,true);
 assert.deepEqual(result.profile.days['2026-11-01'],[1,2,3]);
 assert.equal(result.profile.rewardLedger['2026-11-01'].xp,65);
 assert.equal(result.profile.rewardLedger['2026-11-01'].coins,23);
});
test('does not double-count identical concurrent completions',()=>{
 const l=changed(p=>add(p,'2026-11-01',2,20,8));
 const result=cloudMerge(base,l,copy(l));
 assert.equal(result.ok,true);assert.equal(result.profile.rewardLedger['2026-11-01'].xp,35);
});
test('rejects inconsistent award totals',()=>{
 const l=changed(p=>{add(p,'2026-11-01',2,20,8);p.rewardLedger['2026-11-01'].xp+=99});
 const r=changed(p=>add(p,'2026-11-01',3,30,10));
 assert.equal(cloudMerge(base,l,r).ok,false);
});
test('requires review for overlapping Perfect Day bonuses',()=>{
 const l=changed(p=>{add(p,'2026-11-01',2,20,8);p.rewardLedger['2026-11-01'].bonus=true;p.rewardLedger['2026-11-01'].xp+=50;p.rewardLedger['2026-11-01'].coins+=20});
 const r=changed(p=>{add(p,'2026-11-01',3,30,10);p.rewardLedger['2026-11-01'].bonus=true;p.rewardLedger['2026-11-01'].xp+=50;p.rewardLedger['2026-11-01'].coins+=20});
 assert.equal(cloudMerge(base,l,r).ok,false);
});
test('requires review for concurrent undo and completion',()=>{
 const l=changed(p=>{p.days['2026-11-01']=[];p.rewardLedger['2026-11-01']={xp:0,coins:0,bonus:false,awards:{}}});
 const r=changed(p=>add(p,'2026-11-01',3,30,10));
 assert.equal(cloudMerge(base,l,r).ok,false);
});
test('requires review for cross-device earning versus spending',()=>{
 const l=changed(p=>add(p,'2026-11-01',2,20,8));
 const r=changed(p=>p.purchaseRecords.push({id:1,price:100}));
 assert.equal(cloudMerge(base,l,r).ok,false);
});
test('requires review for two different purchases',()=>{
 const l=changed(p=>p.purchaseRecords.push({id:1,price:100}));
 const r=changed(p=>p.purchaseRecords.push({id:2,price:150}));
 assert.equal(cloudMerge(base,l,r).ok,false);
});
test('requires review for concurrent edits of same setting',()=>{
 const l=changed(p=>p.settings.sounds='a'),r=changed(p=>p.settings.sounds='b');
 assert.equal(cloudMerge(base,l,r).ok,false);
});
